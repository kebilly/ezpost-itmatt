import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runItmattSubmission } from "@/lib/itmatt/runner";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const { id } = await params;

  const shipment = await prisma.shipment.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!shipment) return NextResponse.json({ error: "找不到寄件單" }, { status: 404 });

  if (!["DRAFT", "FAILED"].includes(shipment.status)) {
    return NextResponse.json(
      { error: "此寄件單目前狀態無法送出" },
      { status: 409 }
    );
  }

  try {
    await runItmattSubmission(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "自動化送出失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
