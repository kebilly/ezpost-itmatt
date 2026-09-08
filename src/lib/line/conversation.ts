/**
 * LINE 引導式填單對話狀態機（純函式，無 LINE / DB 相依，方便單元測試）。
 *
 * 用法：webhook 收到訊息 → 讀出該用戶的 { step, draft } → 呼叫 nextTurn()
 * → 取得 { step, draft, messages, complete }，把 messages 回覆給用戶、把 step/draft 存回。
 * 當 complete 為 true 時，webhook 端負責用 draft 建立寄件單並清空 session。
 */

export const STEPS = {
  START: "START",
  ASK_MAILTYPE: "ASK_MAILTYPE",
  ASK_RECIPIENT_NAME: "ASK_RECIPIENT_NAME",
  ASK_RECIPIENT_COUNTRY: "ASK_RECIPIENT_COUNTRY",
  ASK_RECIPIENT_POSTAL: "ASK_RECIPIENT_POSTAL",
  ASK_RECIPIENT_ADDRESS1: "ASK_RECIPIENT_ADDRESS1",
  ASK_RECIPIENT_CITY: "ASK_RECIPIENT_CITY",
  ASK_RECIPIENT_STATE: "ASK_RECIPIENT_STATE",
  ASK_RECIPIENT_PHONE: "ASK_RECIPIENT_PHONE",
  ASK_CONTENT_TYPE: "ASK_CONTENT_TYPE",
  ASK_WEIGHT: "ASK_WEIGHT",
  ASK_DIMENSIONS: "ASK_DIMENSIONS",
  ASK_ITEM_DESC: "ASK_ITEM_DESC",
  ASK_ITEM_QTY: "ASK_ITEM_QTY",
  ASK_ITEM_VALUE: "ASK_ITEM_VALUE",
  ASK_ITEM_WEIGHT: "ASK_ITEM_WEIGHT",
  ASK_ITEM_ORIGIN: "ASK_ITEM_ORIGIN",
  ASK_MORE_ITEMS: "ASK_MORE_ITEMS",
  CONFIRM: "CONFIRM",
  /** LLM 對話模式（aiConversation.ts 使用）：狀態存在 draft，不走固定腳本 */
  AI: "AI",
} as const;

export const MAIL_TYPES: Record<string, string> = {
  "國際快捷 (EMS)": "EMS",
  "國際包裹 (Parcel)": "PARCEL",
  "國際e小包 (ePacket)": "E_PACKET",
  "國際掛號函件": "REGISTERED_SMALL_PACKET",
  "國際平常小包": "SMALL_PACKET",
};

export const CONTENT_TYPES: Record<string, string> = {
  禮品: "GIFT",
  文件: "DOCUMENTS",
  銷售物品: "SALE_GOODS",
  商業貨樣: "COMMERCIAL_SAMPLE",
  退貨: "RETURNED_GOODS",
  其他: "OTHER",
};

export type ItemDraft = {
  description?: string;
  quantity?: number;
  unitValue?: number;
  weight?: number;
  originCountry?: string;
};

export type RecipientDraft = {
  name?: string;
  country?: string;
  postal?: string;
  address1?: string;
  city?: string;
  state?: string;
  phone?: string;
};

/** 寄件人（選填）：客人若提供自己的寄件人資料就用它，否則用商家預設 */
export type SenderDraft = {
  name?: string;
  postal?: string;
  address1?: string;
  city?: string;
  phone?: string;
};

export type Draft = {
  mailType?: string;
  contentType?: string;
  sender?: SenderDraft;
  recipient?: RecipientDraft;
  totalWeight?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  items?: ItemDraft[];
  currentItem?: ItemDraft;
};

export type QuickReply = { label: string; text: string };
export type BotMessage = { text: string; quickReplies?: QuickReply[] };

/** 郵件種類代碼 → 中文名稱（注意事項標題用） */
const MAIL_LABEL: Record<string, string> = {
  EMS: "國際快捷郵件",
  PARCEL: "國際包裹",
  E_PACKET: "國際e小包",
  REGISTERED_SMALL_PACKET: "國際掛號函件",
  SMALL_PACKET: "國際平常小包",
};

const NOTICE_BODY =
  "1. 交寄資料請以英文或寄達國通用語言填寫（中文僅限日本、香港、澳門）。\n" +
  "2. 內容物須據實、清楚、分類申報；不實或含糊申報可能導致郵件遭寄達國海關沒收或退回。\n" +
  "3. 不得交寄危險物品或各國禁寄物品，違者將依相關法令處罰。\n" +
  "4. 進口關稅由收件人負擔；如未符寄達國規定遭退運，郵資不退還。\n" +
  "5. 重量與尺寸限制依本類郵件規定辦理。";

/**
 * 依郵件種類產生對應的注意事項（對應 ITMATT 官網「交寄○○注意事項」的告知同意流程）。
 * 選定郵件種類後才顯示，使用者同意後才開始填其餘資料。
 */
export function noticeFor(mailType: string): string {
  const label = MAIL_LABEL[mailType] ?? "國際郵件";
  const extra =
    mailType === "E_PACKET"
      ? "\n6. 本類每件重量不得逾 2 公斤；單邊最長 60 公分、長寬高合計 90 公分為限。"
      : "";
  return (
    `交寄${label}注意事項（請詳閱）\n\n` +
    NOTICE_BODY +
    extra +
    "\n\n若您已閱讀並同意上述內容，請回覆「我同意」繼續填單。"
  );
}

/** 郵件種類快速選單 */
export const MAIL_TYPE_QR: QuickReply[] = Object.keys(MAIL_TYPES).map((l) => ({
  label: l,
  text: l,
}));

/** 判斷使用者訊息是否為同意 */
export function isAgreement(text: string): boolean {
  return ["我同意", "同意", "接受", "yes", "y", "ok", "好", "是"].includes(text.trim().toLowerCase());
}

export type TurnResult = {
  step: string;
  draft: Draft;
  messages: BotMessage[];
  /** draft 已收集完成，webhook 端應建立寄件單並重置 session */
  complete?: boolean;
  /** 使用者取消，webhook 端應重置 session */
  cancelled?: boolean;
};

const qr = (labels: string[]): QuickReply[] =>
  labels.map((l) => ({ label: l, text: l }));

function num(text: string): number | null {
  const n = Number(text.trim());
  return Number.isFinite(n) ? n : null;
}

/** 進入下一輪對話。step/draft 為目前狀態，text 為使用者這次輸入。 */
export function nextTurn(step: string, draft: Draft, rawText: string): TurnResult {
  const text = rawText.trim();
  const d: Draft = structuredClone(draft ?? {});

  // 全域指令
  if (["取消", "重新開始", "重來"].includes(text)) {
    return {
      step: STEPS.START,
      draft: {},
      messages: [{ text: "已取消，隨時輸入任何訊息即可重新開始填單。" }],
      cancelled: true,
    };
  }

  switch (step) {
    case STEPS.START:
      return {
        step: STEPS.ASK_MAILTYPE,
        draft: {},
        messages: [
          {
            text: "您好！我來協助您填寫國際郵件交寄單。\n請問要寄哪一種郵件？",
            quickReplies: qr(Object.keys(MAIL_TYPES)),
          },
        ],
      };

    case STEPS.ASK_MAILTYPE: {
      const mailType = MAIL_TYPES[text];
      if (!mailType) {
        return reask(step, d, "請從下方選單選擇郵件種類：", qr(Object.keys(MAIL_TYPES)));
      }
      d.mailType = mailType;
      return {
        step: STEPS.ASK_RECIPIENT_NAME,
        draft: d,
        messages: [{ text: "收件人姓名？（請用英文，或寄達國通用語言）" }],
      };
    }

    case STEPS.ASK_RECIPIENT_NAME:
      d.recipient = { ...(d.recipient ?? {}), name: text };
      return {
        step: STEPS.ASK_RECIPIENT_COUNTRY,
        draft: d,
        messages: [{ text: "寄達國家？（例：Australia、Japan）" }],
      };

    case STEPS.ASK_RECIPIENT_COUNTRY:
      d.recipient = { ...(d.recipient ?? {}), country: text };
      return {
        step: STEPS.ASK_RECIPIENT_POSTAL,
        draft: d,
        messages: [{ text: "收件人郵遞區號？（寄香港請填 000）" }],
      };

    case STEPS.ASK_RECIPIENT_POSTAL:
      d.recipient = { ...(d.recipient ?? {}), postal: text };
      return {
        step: STEPS.ASK_RECIPIENT_ADDRESS1,
        draft: d,
        messages: [
          { text: "收件人地址？（除城市與州/省外的完整地址，例：29 Green Swamp Road）" },
        ],
      };

    case STEPS.ASK_RECIPIENT_ADDRESS1:
      d.recipient = { ...(d.recipient ?? {}), address1: text };
      return {
        step: STEPS.ASK_RECIPIENT_CITY,
        draft: d,
        messages: [{ text: "城市 City？（例：Nyora）" }],
      };

    case STEPS.ASK_RECIPIENT_CITY:
      d.recipient = { ...(d.recipient ?? {}), city: text };
      return {
        step: STEPS.ASK_RECIPIENT_STATE,
        draft: d,
        messages: [
          {
            text: "州 / 省 / 地區？（例：New South Wales；若無可輸入「無」）",
          },
        ],
      };

    case STEPS.ASK_RECIPIENT_STATE:
      d.recipient = {
        ...(d.recipient ?? {}),
        state: text === "無" ? "" : text,
      };
      return {
        step: STEPS.ASK_RECIPIENT_PHONE,
        draft: d,
        messages: [{ text: "收件人聯絡電話？" }],
      };

    case STEPS.ASK_RECIPIENT_PHONE:
      d.recipient = { ...(d.recipient ?? {}), phone: text };
      return {
        step: STEPS.ASK_CONTENT_TYPE,
        draft: d,
        messages: [
          {
            text: "郵件內容物種類？",
            quickReplies: qr(Object.keys(CONTENT_TYPES)),
          },
        ],
      };

    case STEPS.ASK_CONTENT_TYPE: {
      const contentType = CONTENT_TYPES[text];
      if (!contentType) {
        return reask(step, d, "請從下方選單選擇內容物種類：", qr(Object.keys(CONTENT_TYPES)));
      }
      d.contentType = contentType;
      return {
        step: STEPS.ASK_WEIGHT,
        draft: d,
        messages: [{ text: "郵件總重量？（公斤，例：0.5）" }],
      };
    }

    case STEPS.ASK_WEIGHT: {
      const w = num(text);
      if (w === null || w <= 0) return reask(step, d, "請輸入有效的重量數字（公斤），例：0.5");
      d.totalWeight = w;
      return {
        step: STEPS.ASK_DIMENSIONS,
        draft: d,
        messages: [{ text: "郵件尺寸長x寬x高？（公分，例：25x20x10）" }],
      };
    }

    case STEPS.ASK_DIMENSIONS: {
      const parts = text.toLowerCase().split(/[x×*, ]+/).filter(Boolean);
      const nums = parts.map((p) => Number(p));
      if (nums.length !== 3 || nums.some((n) => !Number.isFinite(n) || n <= 0)) {
        return reask(step, d, "請以「長x寬x高」格式輸入尺寸（公分），例：25x20x10");
      }
      [d.lengthCm, d.widthCm, d.heightCm] = nums;
      return startNewItem(d);
    }

    case STEPS.ASK_ITEM_DESC:
      d.currentItem = { ...(d.currentItem ?? {}), description: text };
      return {
        step: STEPS.ASK_ITEM_QTY,
        draft: d,
        messages: [{ text: "數量？" }],
      };

    case STEPS.ASK_ITEM_QTY: {
      const q = num(text);
      if (q === null || q <= 0 || !Number.isInteger(q))
        return reask(step, d, "請輸入有效的數量（整數）");
      d.currentItem = { ...(d.currentItem ?? {}), quantity: q };
      return {
        step: STEPS.ASK_ITEM_VALUE,
        draft: d,
        messages: [{ text: "單價？（新台幣）" }],
      };
    }

    case STEPS.ASK_ITEM_VALUE: {
      const v = num(text);
      if (v === null || v < 0) return reask(step, d, "請輸入有效的單價數字");
      d.currentItem = { ...(d.currentItem ?? {}), unitValue: v };
      return {
        step: STEPS.ASK_ITEM_WEIGHT,
        draft: d,
        messages: [{ text: "這項物品的重量？（公斤，例：0.3）" }],
      };
    }

    case STEPS.ASK_ITEM_WEIGHT: {
      const w = num(text);
      if (w === null || w <= 0) return reask(step, d, "請輸入有效的重量數字（公斤）");
      d.currentItem = { ...(d.currentItem ?? {}), weight: w };
      return {
        step: STEPS.ASK_ITEM_ORIGIN,
        draft: d,
        messages: [{ text: "原產國？（例：TW）" }],
      };
    }

    case STEPS.ASK_ITEM_ORIGIN: {
      const item: ItemDraft = {
        ...(d.currentItem ?? {}),
        originCountry: text.toUpperCase(),
      };
      d.items = [...(d.items ?? []), item];
      d.currentItem = undefined;
      return {
        step: STEPS.ASK_MORE_ITEMS,
        draft: d,
        messages: [
          { text: "還有其他物品要加入嗎？", quickReplies: qr(["新增物品", "完成"]) },
        ],
      };
    }

    case STEPS.ASK_MORE_ITEMS:
      if (text === "新增物品") return startNewItem(d);
      if (text === "完成") {
        return { step: STEPS.CONFIRM, draft: d, messages: [summary(d)] };
      }
      return reask(step, d, "請選擇「新增物品」或「完成」", qr(["新增物品", "完成"]));

    case STEPS.CONFIRM:
      if (text === "確認送出") {
        return {
          step: STEPS.START,
          draft: d,
          messages: [{ text: "收到！正在為您產生交寄條碼，稍候會把 QR code 傳給您。" }],
          complete: true,
        };
      }
      return reask(step, d, "請確認資料無誤後點「確認送出」，或輸入「取消」放棄。", qr(["確認送出", "取消"]));

    default:
      return {
        step: STEPS.START,
        draft: {},
        messages: [{ text: "輸入任何訊息即可開始填單。" }],
      };
  }
}

function reask(step: string, draft: Draft, text: string, quickReplies?: QuickReply[]): TurnResult {
  return { step, draft, messages: [{ text, quickReplies }] };
}

function startNewItem(draft: Draft): TurnResult {
  return {
    step: STEPS.ASK_ITEM_DESC,
    draft,
    messages: [{ text: "物品名稱？（請分類填寫，勿只填「食品」「樣品」等籠統名稱）" }],
  };
}

function summary(d: Draft): BotMessage {
  const r = d.recipient ?? {};
  const itemLines = (d.items ?? [])
    .map(
      (it, i) =>
        `  ${i + 1}. ${it.description} x${it.quantity}，單價 ${it.unitValue}，${it.weight}kg，原產國 ${it.originCountry}`
    )
    .join("\n");
  const mailLabel =
    Object.entries(MAIL_TYPES).find(([, v]) => v === d.mailType)?.[0] ?? d.mailType;
  const contentLabel =
    Object.entries(CONTENT_TYPES).find(([, v]) => v === d.contentType)?.[0] ??
    d.contentType;
  return {
    text:
      "請確認以下資料：\n" +
      `郵件種類：${mailLabel}\n` +
      `收件人：${r.name}（${r.country}）\n` +
      `地址：${r.address1}, ${r.city}, ${r.state || "-"} ${r.postal}\n` +
      `電話：${r.phone}\n` +
      `內容類別：${contentLabel}，總重 ${d.totalWeight}kg，尺寸 ${d.lengthCm}x${d.widthCm}x${d.heightCm}cm\n` +
      `物品：\n${itemLines}`,
    quickReplies: qr(["確認送出", "取消"]),
  };
}
