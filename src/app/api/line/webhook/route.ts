import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  nextTurn,
  STEPS,
  noticeFor,
  isAgreement,
  MAIL_TYPES,
  MAIL_TYPE_QR,
  type Draft,
} from "@/lib/line/conversation";
import { aiEnabled, aiNextTurn } from "@/lib/line/aiConversation";
import { verifyLineSignature, replyMessages } from "@/lib/line/client";
import { createShipmentFromDraft } from "@/lib/line/createShipment";
import { fulfillAndNotify } from "@/lib/line/fulfillShipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LineMessageEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events?: LineMessageEvent[] };
  const events = body.events ?? [];

  await Promise.all(events.map(handleEvent));

  // LINE 要求 webhook 快速回 200
  return NextResponse.json({ ok: true });
}

function save(userId: string, step: string, draft: Draft, consented: boolean) {
  return prisma.lineSession.update({
    where: { lineUserId: userId },
    data: { step, draft: draft as object, consented },
  });
}

async function handleEvent(event: LineMessageEvent): Promise<void> {
  if (event.type !== "message" || event.message?.type !== "text") return;
  const userId = event.source?.userId;
  const replyToken = event.replyToken;
  const text = event.message.text ?? "";
  if (!userId || !replyToken) return;

  const session = await prisma.lineSession.upsert({
    where: { lineUserId: userId },
    create: { lineUserId: userId, step: STEPS.START, draft: {} },
    update: {},
  });
  const draft = (session.draft as Draft) ?? {};

  // ── 階段一：先選郵件種類 → 顯示該類注意事項 → 同意才續問 ──
  if (!session.consented) {
    // 1a. 尚未決定郵件種類：讓 AI 解析 / 腳本用選單問，決定後顯示該類注意事項
    if (!draft.mailType) {
      if (aiEnabled()) {
        const res = await aiNextTurn(draft, text);
        const nd = res.draft as Draft;
        if (nd.mailType) {
          await save(userId, res.step, nd, false);
          await replyMessages(replyToken, [{ text: noticeFor(nd.mailType) }]);
        } else {
          await save(userId, res.step, nd, false);
          await replyMessages(replyToken, res.messages);
        }
      } else {
        const code = MAIL_TYPES[text.trim()];
        if (code) {
          await save(userId, STEPS.ASK_RECIPIENT_NAME, { ...draft, mailType: code }, false);
          await replyMessages(replyToken, [{ text: noticeFor(code) }]);
        } else {
          await replyMessages(replyToken, [
            { text: "您好！請問要寄哪一種郵件？", quickReplies: MAIL_TYPE_QR },
          ]);
        }
      }
      return;
    }

    // 1b. 已知種類、等待同意
    if (!isAgreement(text)) {
      await replyMessages(replyToken, [{ text: noticeFor(draft.mailType) }]);
      return;
    }

    // 同意了 → 標記 consented，開始問其餘資料
    if (aiEnabled()) {
      const res = await aiNextTurn(draft, "我同意，請繼續詢問其餘寄件資料");
      await save(userId, res.step, res.draft as Draft, true);
      await replyMessages(replyToken, res.messages);
    } else {
      await save(userId, STEPS.ASK_RECIPIENT_NAME, draft, true);
      await replyMessages(replyToken, [
        { text: "好的，我們開始 🙂 收件人姓名？（請用英文，或寄達國語言）" },
      ]);
    }
    return;
  }

  // ── 階段二：正常收集 → 完成送件 ──
  const result = aiEnabled()
    ? await aiNextTurn(draft, text)
    : nextTurn(session.step, draft, text);

  if (result.complete) {
    try {
      const shipmentId = await createShipmentFromDraft(userId, result.draft);
      // 非同步送件 + 推 QR（不阻塞 webhook 回應）
      void fulfillAndNotify(shipmentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "建立寄件單失敗";
      await save(userId, STEPS.START, {}, false);
      await replyMessages(replyToken, [{ text: `⚠️ ${message}\n請稍後再試，或聯繫商家。` }]);
      return;
    }
  }

  const done = result.complete || result.cancelled;
  await save(userId, result.step, done ? {} : (result.draft as Draft), done ? false : true);
  await replyMessages(replyToken, result.messages);
}
