/**
 * 終端機版 AI 對話測試工具（不需 LINE）。
 *
 * 用途：在終端機直接跟 LINE bot 的「AI 對話大腦」聊天，看它怎麼從你的
 * 自然語言抽出寄件欄位、問下一步、資料齊全後請你確認。
 *
 * 執行前：在 .env 設好 ANTHROPIC_API_KEY，然後：
 *     npm run chat
 * 輸入「取消」可重來，Ctrl+C 離開。
 */
import * as readline from "node:readline";
import { aiEnabled, aiNextTurn } from "@/lib/line/aiConversation";
import type { Draft } from "@/lib/line/conversation";

if (!aiEnabled()) {
  console.error("⚠️  尚未設定 ANTHROPIC_API_KEY —— 請先在 .env 填入你的 Claude API key。");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> =>
  new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log("🤖 EZPOST AI 寄件助理（終端機測試）。輸入訊息開始，或「取消」重來，Ctrl+C 離開。\n");
  let draft: Draft = {};

  // 開場：先送一句招呼觸發流程
  let botTurn = await aiNextTurn(draft, "你好");
  draft = botTurn.draft;
  for (const m of botTurn.messages) console.log(`🤖 ${m.text}\n`);

  while (true) {
    const userText = (await ask("👤 你：")).trim();
    if (!userText) continue;

    const t0 = Date.now();
    botTurn = await aiNextTurn(draft, userText);
    const ms = Date.now() - t0;
    draft = botTurn.draft;

    for (const m of botTurn.messages) console.log(`\n🤖 ${m.text}  ⏱${ms}ms`);

    // 顯示目前已抽出的結構化資料，方便觀察 AI 的抽取效果
    const shown = { ...draft } as Draft & { __lastReply?: string };
    delete shown.__lastReply;
    console.log("   〔目前抽到的資料〕", JSON.stringify(shown));

    if (botTurn.complete) {
      console.log("\n✅ 資料齊全並確認完成！這份 draft 會被送去建立寄件單並自動填 ITMATT：");
      console.log(JSON.stringify(shown, null, 2));
      console.log("\n（測試到此，實際系統會接著跑 Playwright 送件並回傳 QR。）");
      break;
    }
    if (botTurn.cancelled) draft = {};
    console.log("");
  }
  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
