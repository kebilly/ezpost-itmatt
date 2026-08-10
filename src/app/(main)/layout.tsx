import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth";

async function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="text-sm text-gray-400 hover:text-red-500 transition-colors"
      >
        登出
      </button>
    </form>
  );
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-indigo-700">
              EZPOST ITMATT
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-indigo-700 font-medium transition-colors"
              >
                總覽
              </Link>
              <Link
                href="/senders"
                className="text-gray-600 hover:text-indigo-700 font-medium transition-colors"
              >
                寄件人
              </Link>
              <Link
                href="/contacts"
                className="text-gray-600 hover:text-indigo-700 font-medium transition-colors"
              >
                收件人
              </Link>
              <Link
                href="/shipments"
                className="text-gray-600 hover:text-indigo-700 font-medium transition-colors"
              >
                寄件單
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {session.user?.name || session.user?.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
