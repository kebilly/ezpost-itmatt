import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-xl text-indigo-700">
            EZPOST ITMATT 填單系統
          </span>
          <div className="flex gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-colors"
              >
                進入系統
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-indigo-700"
                >
                  登入
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-colors"
                >
                  註冊
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            國際郵件寄件資料管理
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            管理寄件人、收件人與報關明細，自動化產生國際郵件交寄單與 QR
          </p>
          {!session && (
            <div className="mt-8 flex gap-4 justify-center">
              <Link
                href="/register"
                className="bg-indigo-600 text-white px-8 py-3 rounded-full text-base font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                開始使用
              </Link>
              <Link
                href="/login"
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full text-base font-semibold hover:border-indigo-400 hover:text-indigo-700 transition-colors"
              >
                已有帳號登入
              </Link>
            </div>
          )}
          {session && (
            <div className="mt-8">
              <Link
                href="/dashboard"
                className="bg-indigo-600 text-white px-8 py-3 rounded-full text-base font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                前往總覽
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-8 text-sm text-gray-400 border-t border-gray-100 mt-8">
        內部工具 · 非官方郵政系統
      </footer>
    </div>
  );
}
