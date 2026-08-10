import { prisma } from "@/lib/prisma";
import { MailType, ContentCategory } from "@prisma/client";
import type { Draft } from "./conversation";

/**
 * 解析「商家帳號」：所有 LINE 客人的寄件單都掛在這個帳號下。
 * 以 env MERCHANT_USER_EMAIL 指定，找不到則退回第一個使用者。
 */
async function resolveMerchantUserId(): Promise<string> {
  const email = process.env.MERCHANT_USER_EMAIL;
  if (email) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) return u.id;
  }
  const first = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!first) throw new Error("尚無商家帳號，請先於後台註冊一個帳號");
  return first.id;
}

/**
 * 依 LINE 對話 draft 建立寄件單（收件人 + 寄件單 + 物品），並記錄 lineUserId。
 * 寄件人使用商家的第一筆寄件人資料（非會員流程下寄件人固定為商家）。
 * 回傳新建立的 shipmentId。
 */
export async function createShipmentFromDraft(
  lineUserId: string,
  draft: Draft
): Promise<string> {
  const userId = await resolveMerchantUserId();

  const sender = await prisma.senderProfile.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (!sender) {
    throw new Error("商家尚未設定寄件人資料，請先於後台新增一筆寄件人");
  }

  const r = draft.recipient ?? {};
  const contact = await prisma.contact.create({
    data: {
      userId,
      name: r.name ?? "",
      address1: r.address1 ?? "",
      city: r.city ?? "",
      state: r.state || null,
      postal: r.postal ?? "",
      country: r.country ?? "",
      phone: r.phone ?? "",
    },
  });

  const shipment = await prisma.shipment.create({
    data: {
      userId,
      lineUserId,
      senderProfileId: sender.id,
      contactId: contact.id,
      mailType: (draft.mailType as MailType) ?? MailType.PARCEL,
      contentType: draft.contentType
        ? (draft.contentType as ContentCategory)
        : null,
      currency: "TWD",
      totalWeight: draft.totalWeight ?? null,
      lengthCm: draft.lengthCm ?? null,
      widthCm: draft.widthCm ?? null,
      heightCm: draft.heightCm ?? null,
      status: "QUEUED",
      items: {
        create: (draft.items ?? []).map((it) => ({
          description: it.description ?? "",
          quantity: it.quantity ?? 1,
          unitValue: it.unitValue ?? 0,
          weight: it.weight ?? 0,
          originCountry: it.originCountry ?? "TW",
        })),
      },
    },
  });

  return shipment.id;
}
