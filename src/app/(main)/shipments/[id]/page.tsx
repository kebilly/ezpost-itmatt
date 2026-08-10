import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ShipmentForm, { MAIL_TYPE_LABELS } from "../ShipmentForm";
import SubmitButton from "../SubmitButton";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "草稿",
  QUEUED: "排入佇列",
  SUBMITTING: "送出中",
  SUBMITTED: "已送出",
  FAILED: "失敗",
};

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [shipment, senders, contacts] = await Promise.all([
    prisma.shipment.findFirst({
      where: { id, userId: session!.user.id },
      include: { senderProfile: true, contact: true, items: true },
    }),
    prisma.senderProfile.findMany({ where: { userId: session!.user.id } }),
    prisma.contact.findMany({ where: { userId: session!.user.id } }),
  ]);

  if (!shipment) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          寄件單 — {shipment.contact.name}
        </h1>
        <span className="text-sm font-medium text-gray-500">
          狀態：{STATUS_LABELS[shipment.status]}
        </span>
      </div>

      {shipment.status === "DRAFT" ? (
        <>
          <ShipmentForm
            senders={senders}
            contacts={contacts}
            initialData={{
              id: shipment.id,
              senderProfileId: shipment.senderProfileId,
              contactId: shipment.contactId,
              mailType: shipment.mailType,
              contentType: shipment.contentType ?? "GIFT",
              contractAccount: shipment.contractAccount ?? "",
              currency: shipment.currency,
              totalWeight: shipment.totalWeight ?? undefined,
              lengthCm: shipment.lengthCm ?? undefined,
              widthCm: shipment.widthCm ?? undefined,
              heightCm: shipment.heightCm ?? undefined,
              items: shipment.items.map((i) => ({
                description: i.description,
                quantity: i.quantity,
                unitValue: i.unitValue,
                weight: i.weight,
                originCountry: i.originCountry,
                hsCode: i.hsCode,
              })),
            }}
          />
          <div className="mt-6 pt-6 border-t border-gray-100 max-w-3xl">
            <SubmitButton shipmentId={shipment.id} />
          </div>
        </>
      ) : (
        <div className="max-w-3xl space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2 text-sm">
            <p>
              <span className="text-gray-500">寄件人：</span>
              {shipment.senderProfile.name}
            </p>
            <p>
              <span className="text-gray-500">收件人：</span>
              {shipment.contact.name}
            </p>
            <p>
              <span className="text-gray-500">郵件類型：</span>
              {MAIL_TYPE_LABELS[shipment.mailType]}
            </p>
            <p>
              <span className="text-gray-500">ITMATT 追蹤號碼：</span>
              {shipment.itmattTrackingNo ?? "—"}
            </p>
          </div>

          {shipment.qrImagePath && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500 mb-3">交寄條碼 / QR（可回傳 LINE、至郵局掃描列印）</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shipment.qrImagePath}
                alt="ITMATT 交寄條碼"
                className="max-w-xs border border-gray-200 rounded-lg"
              />
            </div>
          )}

          {shipment.submissionLog && (
            <div className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
              {shipment.submissionLog}
            </div>
          )}

          {shipment.status === "FAILED" && (
            <SubmitButton shipmentId={shipment.id} />
          )}
        </div>
      )}
    </div>
  );
}
