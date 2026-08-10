import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await req.json();
  const { name, company, address1, address2, city, state, postal, country, phone, email, taxId, note } = body;

  if (!name || !address1 || !city || !postal || !country || !phone) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: {
      userId: session.user.id,
      name,
      company,
      address1,
      address2,
      city,
      state,
      postal,
      country,
      phone,
      email,
      taxId,
      note,
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
