import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextTurn, STEPS, type Draft } from "@/lib/line/conversation";
import { verifyLineSignature, replyMessages } from "@/lib/line/client";
import { createShipmentFromDraft } from "@/lib/line/createShipment";

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

  const result = nextTurn(session.step, (session.draft as Draft) ?? {}, text);

  // 完成填單：建立寄件單，失敗則回覆錯誤並重置
  if (result.complete) {
    try {
      await createShipmentFromDraft(userId, result.draft);
      // TODO: 選擇器補齊後，於此非同步觸發 runItmattSubmission 並在完成後 pushImage(QR) 回傳
    } catch (err) {
      const message = err instanceof Error ? err.message : "建立寄件單失敗";
      await prisma.lineSession.update({
        where: { lineUserId: userId },
        data: { step: STEPS.START, draft: {} },
      });
      await replyMessages(replyToken, [
        { text: `⚠️ ${message}\n請稍後再試，或聯繫商家。` },
      ]);
      return;
    }
  }

  await prisma.lineSession.update({
    where: { lineUserId: userId },
    data: {
      step: result.step,
      draft: (result.complete || result.cancelled ? {} : result.draft) as object,
    },
  });

  await replyMessages(replyToken, result.messages);
}
