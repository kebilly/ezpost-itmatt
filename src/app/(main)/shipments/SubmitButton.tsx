"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitButton({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (
      !confirm(
        "確定要透過瀏覽器自動化將這筆寄件單送出至 ITMATT 嗎？此動作會使用你設定的 ITMATT 帳號登入並送出報關資料。"
      )
    )
      return;

    setLoading(true);
    setError("");

    const res = await fetch(`/api/shipments/${shipmentId}/submit`, {
      method: "POST",
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "送出失敗");
    }

    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
      >
        {loading ? "送出中..." : "送出至 ITMATT"}
      </button>
      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
