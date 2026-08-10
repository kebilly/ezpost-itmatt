import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DeleteButton from "@/components/DeleteButton";

export default async function ContactsPage() {
  const session = await auth();
  const contacts = await prisma.contact.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">常用收件人</h1>
        <Link
          href="/contacts/new"
          className="text-sm font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-colors"
        >
          + 新增收件人
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {contacts.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">
            尚無收件人資料
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">姓名 / 公司</th>
                <th className="px-4 py-2 font-medium">地址</th>
                <th className="px-4 py-2 font-medium">電話</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.company && (
                      <p className="text-gray-400 text-xs">{c.company}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.address1}, {c.city} {c.postal}, {c.country}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      編輯
                    </Link>
                    <DeleteButton
                      url={`/api/contacts/${c.id}`}
                      confirmMessage={`確定要刪除收件人「${c.name}」嗎？`}
                    />
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
