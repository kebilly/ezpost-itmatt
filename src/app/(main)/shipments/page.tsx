import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAIL_TYPE_LABELS } from "./ShipmentForm";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "草稿",
  QUEUED: "排入佇列",
  SUBMITTING: "送出中",
  SUBMITTED: "已送出",
  FAILED: "失敗",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  QUEUED: "bg-yellow-100 text-yellow-700",
  SUBMITTING: "bg-blue-100 text-blue-700",
  SUBMITTED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export default async function ShipmentsPage() {
  const session = await auth();
  const shipments = await prisma.shipment.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { senderProfile: true, contact: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">寄件單</h1>
        <Link
          href="/shipments/new"
          className="text-sm font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-colors"
        >
          + 新增寄件單
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {shipments.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">
            尚無寄件單
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">收件人</th>
                <th className="px-4 py-2 font-medium">寄件人</th>
                <th className="px-4 py-2 font-medium">郵件類型</th>
                <th className="px-4 py-2 font-medium">狀態</th>
                <th className="px-4 py-2 font-medium">追蹤號碼</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/shipments/${s.id}`}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      {s.contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.senderProfile.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {MAIL_TYPE_LABELS[s.mailType]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.itmattTrackingNo ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
