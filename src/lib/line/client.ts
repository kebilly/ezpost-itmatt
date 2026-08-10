import { messagingApi, validateSignature } from "@line/bot-sdk";
import type { BotMessage } from "./conversation";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
export const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";

let _client: messagingApi.MessagingApiClient | null = null;
function client(): messagingApi.MessagingApiClient {
  if (!_client) {
    _client = new messagingApi.MessagingApiClient({ channelAccessToken });
  }
  return _client;
}

/** 驗證 LINE webhook 的 x-line-signature */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !LINE_CHANNEL_SECRET) return false;
  return validateSignature(rawBody, LINE_CHANNEL_SECRET, signature);
}

/** 把對話狀態機的 BotMessage 轉成 LINE 訊息物件（含快速回覆按鈕） */
export function toLineMessages(messages: BotMessage[]): messagingApi.Message[] {
  return messages.map((m) => {
    const msg: messagingApi.TextMessage = { type: "text", text: m.text };
    if (m.quickReplies?.length) {
      msg.quickReply = {
        items: m.quickReplies.map((q) => ({
          type: "action",
          action: { type: "message", label: q.label.slice(0, 20), text: q.text },
        })),
      };
    }
    return msg;
  });
}

export async function replyMessages(replyToken: string, messages: BotMessage[]): Promise<void> {
  await client().replyMessage({
    replyToken,
    messages: toLineMessages(messages),
  });
}

export async function pushMessages(to: string, messages: BotMessage[]): Promise<void> {
  await client().pushMessage({ to, messages: toLineMessages(messages) });
}

/** 推送圖片（例如產生的交寄 QR / 條碼） */
export async function pushImage(to: string, imageUrl: string): Promise<void> {
  await client().pushMessage({
    to,
    messages: [
      { type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl },
    ],
  });
}
