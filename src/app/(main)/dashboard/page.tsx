import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "草稿",
  QUEUED: "排入佇列",
  SUBMITTING: "送出中",
  SUBMITTED: "已送出",
  FAILED: "失敗",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [senderCount, contactCount, shipments] = await Promise.all([
    prisma.senderProfile.count({ where: { userId } }),
    prisma.contact.count({ where: { userId } }),
    prisma.shipment.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
  ]);

  const statusCounts = Object.fromEntries(
    shipments.map((s) => [s.status, s._count])
  );

  const recent = await prisma.shipment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { contact: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">總覽</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">寄件人資料</p>
          <p className="text-2xl font-bold text-gray-900">{senderCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">常用收件人</p>
          <p className="text-2xl font-bold text-gray-900">{contactCount}</p>
        </div>
        {Object.entries(STATUS_LABELS)
          .slice(0, 2)
          .map(([key, label]) => (
            <div
              key={key}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusCounts[key] ?? 0}
              </p>
            </div>
          ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">最近的寄件單</h2>
        <Link
          href="/shipments/new"
          className="text-sm font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-colors"
        >
          + 新增寄件單
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {recent.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">
            尚無寄件單，點右上角「+ 新增寄件單」開始建立
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">收件人</th>
                <th className="px-4 py-2 font-medium">郵件類型</th>
                <th className="px-4 py-2 font-medium">狀態</th>
                <th className="px-4 py-2 font-medium">追蹤號碼</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/shipments/${s.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {s.contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.mailType}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {STATUS_LABELS[s.status]}
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
