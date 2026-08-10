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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const { id } = await params;

  const shipment = await prisma.shipment.findFirst({
    where: { id, userId: session.user.id },
    include: { senderProfile: true, contact: true, items: true },
  });
  if (!shipment) return NextResponse.json({ error: "找不到寄件單" }, { status: 404 });
  return NextResponse.json(shipment);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.shipment.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "找不到寄件單" }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "只有草稿狀態的寄件單可以編輯" },
      { status: 409 }
    );
  }

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

  const shipment = await prisma.shipment.update({
    where: { id },
    data: {
      senderProfileId,
      contactId,
      mailType: mailType as MailType,
      contentType: contentType ? (contentType as ContentCategory) : null,
      contractAccount: contractAccount || null,
      currency,
      totalWeight,
      lengthCm,
      widthCm,
      heightCm,
      items: {
        deleteMany: {},
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

  return NextResponse.json(shipment);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.shipment.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "找不到寄件單" }, { status: 404 });

  await prisma.shipment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
