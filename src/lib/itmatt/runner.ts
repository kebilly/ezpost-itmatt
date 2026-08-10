import { mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ItmattClient } from "./client";
import type { ShipmentPayload } from "./types";

export async function runItmattSubmission(
  shipmentId: string,
  userId: string
): Promise<void> {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, userId },
    include: { senderProfile: true, contact: true, items: true },
  });
  if (!shipment) throw new Error("找不到寄件單");

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { status: "SUBMITTING" },
  });

  const payload: ShipmentPayload = {
    id: shipment.id,
    mailType: shipment.mailType,
    contentType: shipment.contentType,
    contractAccount: shipment.contractAccount,
    currency: shipment.currency,
    totalWeight: shipment.totalWeight,
    lengthCm: shipment.lengthCm,
    widthCm: shipment.widthCm,
    heightCm: shipment.heightCm,
    sender: {
      name: shipment.senderProfile.name,
      address1: shipment.senderProfile.address1,
      city: shipment.senderProfile.city,
      postal: shipment.senderProfile.postal,
      phone: shipment.senderProfile.phone,
    },
    recipient: {
      name: shipment.contact.name,
      address1: shipment.contact.address1,
      city: shipment.contact.city,
      state: shipment.contact.state,
      postal: shipment.contact.postal,
      country: shipment.contact.country,
      phone: shipment.contact.phone,
      taxId: shipment.contact.taxId,
    },
    items: shipment.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitValue: i.unitValue,
      weight: i.weight,
      originCountry: i.originCountry,
      hsCode: i.hsCode,
    })),
  };

  // 條碼/QR 圖存到 public/qr，讓後台與後續 LINE 推播可直接取用
  const qrDir = path.join(process.cwd(), "public", "qr");
  await mkdir(qrDir, { recursive: true });
  const qrAbsPath = path.join(qrDir, `${shipment.id}.png`);
  const qrPublicPath = `/qr/${shipment.id}.png`;

  const client = new ItmattClient();
  try {
    await client.open();
    await client.startAsGuest(payload.mailType);
    await client.fillDeclarationForm(payload);
    const result = await client.submit(qrAbsPath);

    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: "SUBMITTED",
        itmattTrackingNo: result.trackingNo,
        qrImagePath: qrPublicPath,
        submissionLog: result.log,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: "FAILED",
        submissionLog: `${client.getLog()}\n[ERROR] ${message}`,
      },
    });
    throw err;
  } finally {
    await client.close();
  }
}
