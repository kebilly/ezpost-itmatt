"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({
  url,
  confirmMessage,
}: {
  url: string;
  confirmMessage: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(confirmMessage)) return;
    setLoading(true);
    await fetch(url, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
    >
      刪除
    </button>
  );
}
