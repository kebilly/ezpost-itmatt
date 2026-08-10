import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const senders = await prisma.senderProfile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(senders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await req.json();
  const { name, company, address1, address2, city, postal, country, phone, email } = body;

  if (!name || !address1 || !city || !postal || !country || !phone) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const sender = await prisma.senderProfile.create({
    data: {
      userId: session.user.id,
      name,
      company,
      address1,
      address2,
      city,
      postal,
      country,
      phone,
      email,
    },
  });

  return NextResponse.json(sender, { status: 201 });
}
