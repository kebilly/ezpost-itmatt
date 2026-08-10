import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MailType, ContentCategory } from "@prisma/client";

type ItemInput = {
  description: string;
  quantity: number;
  unitValue: number;
  weight: number;
  originCountry: string;
  hsCode?: string;
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const shipments = await prisma.shipment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { senderProfile: true, contact: true, items: true },
  });
  return NextResponse.json(shipments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await req.json();
  const {
    senderProfileId,
    contactId,
    mailType,
    contentType,
    contractAccount,
    currency,
    totalWeight,
    lengthCm,
    widthCm,
    heightCm,
    items,
  }: {
    senderProfileId: string;
    contactId: string;
    mailType: string;
    contentType?: string;
    contractAccount?: string;
    currency?: string;
    totalWeight?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    items: ItemInput[];
  } = body;

  if (!senderProfileId || !contactId || !mailType) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const [sender, contact] = await Promise.all([
    prisma.senderProfile.findFirst({
      where: { id: senderProfileId, userId: session.user.id },
    }),
    prisma.contact.findFirst({
      where: { id: contactId, userId: session.user.id },
    }),
  ]);
  if (!sender) return NextResponse.json({ error: "找不到寄件人" }, { status: 404 });
  if (!contact) return NextResponse.json({ error: "找不到收件人" }, { status: 404 });

  const shipment = await prisma.shipment.create({
    data: {
      userId: session.user.id,
      senderProfileId,
      contactId,
      mailType: mailType as MailType,
      contentType: contentType ? (contentType as ContentCategory) : null,
      contractAccount: contractAccount || null,
      currency: currency || "TWD",
      totalWeight,
      lengthCm,
      widthCm,
      heightCm,
      items: {
        create: (items || []).map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitValue: item.unitValue,
          weight: item.weight,
          originCountry: item.originCountry,
          hsCode: item.hsCode,
        })),
      },
    },
    include: { items: true, senderProfile: true, contact: true },
  });

  return NextResponse.json(shipment, { status: 201 });
}
