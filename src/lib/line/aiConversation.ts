import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  MAIL_TYPES,
  CONTENT_TYPES,
  STEPS,
  type Draft,
  type TurnResult,
} from "./conversation";

/**
 * LINE 對話的 LLM 層：用 Claude 聽懂使用者的自然語言回覆、抽取寄件欄位、
 * 決定下一個要問的問題，並在資料齊全時請使用者確認。
 *
 * 設計重點（AI 工程判斷）：LLM 負責「聽懂與對話」的體驗，但送 ITMATT 前
 * 由**確定性驗證**（missingRequired）把關高風險報關資料——LLM 說 complete
 * 不算數，欄位真的齊全且合法才放行。
 */

const MODEL = process.env.LINE_AI_MODEL ?? "claude-opus-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic(); // 讀 ANTHROPIC_API_KEY
  return _client;
}

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const mailTypeValues = Object.values(MAIL_TYPES) as [string, ...string[]];
const contentTypeValues = Object.values(CONTENT_TYPES) as [string, ...string[]];

// 結構化輸出限制：帶 union(nullable) 的參數最多 16 個。因此改用「必填 + 空值代表未知」：
// 字串未知填 ""、數字未知填 0、enum 加一個 "" 選項。enum 不算 union。
const mailTypeEnum = [...mailTypeValues, ""] as [string, ...string[]];
const contentTypeEnum = [...contentTypeValues, ""] as [string, ...string[]];

const SenderSchema = z.object({
  name: z.string(),
  postal: z.string(),
  address1: z.string(),
  city: z.string(),
  phone: z.string(),
});

const RecipientSchema = z.object({
  name: z.string(),
  country: z.string(),
  postal: z.string(),
  address1: z.string(),
  city: z.string(),
  state: z.string(),
  phone: z.string(),
});

const ItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitValue: z.number(),
  weight: z.number(),
  originCountry: z.string(),
});

const DraftSchema = z.object({
  mailType: z.enum(mailTypeEnum),
  contentType: z.enum(contentTypeEnum),
  sender: SenderSchema,
  recipient: RecipientSchema,
  totalWeight: z.number(),
  lengthCm: z.number(),
  widthCm: z.number(),
  heightCm: z.number(),
  items: z.array(ItemSchema),
});

const OutputSchema = z.object({
  draft: DraftSchema,
  reply: z.string(),
  complete: z.boolean(),
});

/** 確定性驗證：回傳仍缺少或不合法的欄位（中文標籤）。空陣列代表可送出。 */
export function missingRequired(d: Draft): string[] {
  const miss: string[] = [];
  if (!d.mailType) miss.push("郵件種類");
  const s = d.sender ?? {};
  if (!s.name) miss.push("寄件人姓名");
  if (!s.postal) miss.push("寄件人郵遞區號");
  if (!s.address1) miss.push("寄件人地址");
  if (!s.city) miss.push("寄件人城市");
  if (!s.phone) miss.push("寄件人電話");
  const r = d.recipient ?? {};
  if (!r.name) miss.push("收件人姓名");
  if (!r.country) miss.push("寄達國");
  if (!r.postal) miss.push("收件人郵遞區號");
  if (!r.address1) miss.push("收件人地址");
  if (!r.city) miss.push("收件人城市");
  if (!r.phone) miss.push("收件人電話");
  if (!d.contentType) miss.push("內容物種類");
  if (!(typeof d.totalWeight === "number" && d.totalWeight > 0)) miss.push("總重量");
  if (!(typeof d.lengthCm === "number" && d.lengthCm > 0)) miss.push("長度");
  if (!(typeof d.widthCm === "number" && d.widthCm > 0)) miss.push("寬度");
  if (!(typeof d.heightCm === "number" && d.heightCm > 0)) miss.push("高度");
  const items = d.items ?? [];
  if (items.length === 0) miss.push("至少一項物品明細");
  items.forEach((it, i) => {
    if (!it.description) miss.push(`品項${i + 1}名稱`);
    if (!(typeof it.quantity === "number" && it.quantity > 0)) miss.push(`品項${i + 1}數量`);
    if (!(typeof it.unitValue === "number" && it.unitValue >= 0)) miss.push(`品項${i + 1}單價`);
    if (!(typeof it.weight === "number" && it.weight > 0)) miss.push(`品項${i + 1}重量`);
    if (!it.originCountry) miss.push(`品項${i + 1}原產國`);
  });
  return miss;
}

function systemPrompt(): string {
  const mailLines = Object.entries(MAIL_TYPES)
    .map(([label, val]) => `  - ${label} → ${val}`)
    .join("\n");
  const contentLines = Object.entries(CONTENT_TYPES)
    .map(([label, val]) => `  - ${label} → ${val}`)
    .join("\n");
  return `你是國際郵件交寄的 LINE 客服助理，任務是「聽懂客人用自然語言講的寄件需求」，把資料抽取成結構化欄位，並引導客人補齊缺的資訊。客人常常不知道怎麼填正式表單，所以你要親切、用繁體中文、一次只問一兩個還缺的重點。回覆中請勿提及任何郵政業者名稱（例如中華郵政）。

你要蒐集的欄位：
- 郵件種類 mailType（列舉，把客人的說法對應到代碼）：
${mailLines}
- 寄件人 sender（必填，客人本人）：name 姓名、postal 郵遞區號、address1 地址、city 城市(縣市)、phone 電話。
- 收件人 recipient：name 姓名、country 寄達國（英文國名，如 Australia）、postal 郵遞區號、address1 地址（不含城市與州省的完整地址）、city 城市、state 州/省/地區（可為 null）、phone 電話
- 內容物種類 contentType（列舉）：
${contentLines}
- 郵件 totalWeight 總重量(公斤)、lengthCm 長、widthCm 寬、heightCm 高（公分）
- items 物品明細（可多筆）：description 品名、quantity 數量、unitValue 單價(新台幣)、weight 重量(公斤)、originCountry 原產國(如 TW)

規則：
1. 從對話與客人這次的訊息抽取所有能確定的欄位，更新到 draft；未知的字串欄位填空字串 ""、未知的數字欄位填 0、未知的 mailType/contentType 填 ""，不要亂猜。
2. draft 要回傳「目前累積的完整狀態」（含先前已知的欄位），不是只有這次的更新。
3. reply 用繁體中文，親切自然，針對「還缺的欄位」問下一步；若客人一句話講了很多，就一次吸收、只問還缺的。
4. 只有在所有必填欄位都齊全時，才在 reply 裡列出摘要請客人確認；當且僅當客人明確表示確認送出時，complete 設為 true。其餘情況 complete 一律 false。
5. 地址、姓名、品名等請盡量用英文或寄達國語言（中文僅限日本、港澳）。
6. 寄件人 sender 為**必填**：選完郵件種類後，你要問的第一個資料就是寄件人——親切地問「請提供寄件人（您本人）的姓名、郵遞區號、地址、城市與聯絡電話」。務必收齊這五項才算完成，若客人只給部分就繼續補問。`;
}

/**
 * 用 LLM 進行一輪對話。回傳與 nextTurn 相容的 TurnResult。
 * draft 內會用保留鍵 __lastReply 記住上一則機器人訊息，提供對話脈絡。
 */
export async function aiNextTurn(
  draft: Draft,
  rawText: string
): Promise<TurnResult> {
  const text = rawText.trim();

  if (["取消", "重新開始", "重來"].includes(text)) {
    return {
      step: STEPS.START,
      draft: {},
      messages: [{ text: "已取消，隨時傳訊息即可重新開始。" }],
      cancelled: true,
    };
  }

  const meta = draft as Draft & { __lastReply?: string };
  const cleanDraft: Draft = { ...draft };
  delete (cleanDraft as Draft & { __lastReply?: string }).__lastReply;

  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: "adaptive" },
    system: systemPrompt(),
    messages: [
      {
        role: "user",
        content:
          `目前已蒐集的資料（JSON）：\n${JSON.stringify(cleanDraft)}\n\n` +
          (meta.__lastReply ? `你上一則訊息：「${meta.__lastReply}」\n\n` : "") +
          `客人這次的訊息：「${text}」`,
      },
    ],
    output_config: { format: zodOutputFormat(OutputSchema), effort: "low" },
  });

  const out = res.parsed_output;
  if (!out) {
    return {
      step: STEPS.START,
      draft,
      messages: [{ text: "抱歉我剛才沒聽清楚，可以再說一次嗎？" }],
    };
  }

  const nextDraft: Draft = out.draft as Draft;
  const missing = missingRequired(nextDraft);

  // 確定性把關：LLM 說完成，但驗證未過 → 擋下並改問缺的欄位
  let complete = out.complete;
  let reply = out.reply;
  if (complete && missing.length > 0) {
    complete = false;
    reply = `還差這些資料才能送出：${missing.slice(0, 3).join("、")}。可以提供嗎？`;
  }

  const persistDraft: Draft = complete
    ? nextDraft
    : ({ ...nextDraft, __lastReply: reply } as Draft);

  return {
    step: complete ? STEPS.START : STEPS.AI,
    draft: persistDraft,
    messages: [{ text: reply }],
    complete,
  };
}
