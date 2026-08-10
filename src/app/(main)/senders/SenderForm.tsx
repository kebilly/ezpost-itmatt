"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SenderData = {
  id?: string;
  name: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  postal: string;
  country: string;
  phone: string;
  email?: string | null;
};

const emptySender: SenderData = {
  name: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  postal: "",
  country: "",
  phone: "",
  email: "",
};

export default function SenderForm({
  initialData,
}: {
  initialData?: SenderData;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SenderData>(initialData ?? emptySender);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update<K extends keyof SenderData>(key: K, value: SenderData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = form.id ? `/api/senders/${form.id}` : "/api/senders";
    const method = form.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "儲存失敗");
      return;
    }

    router.push("/senders");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <Field label="姓名 / 聯絡人" required>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="公司 (選填)">
          <input
            value={form.company ?? ""}
            onChange={(e) => update("company", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="地址 1" required>
        <input
          value={form.address1}
          onChange={(e) => update("address1", e.target.value)}
          required
          className={inputClass}
        />
      </Field>
      <Field label="地址 2 (選填)">
        <input
          value={form.address2 ?? ""}
          onChange={(e) => update("address2", e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="城市" required>
          <input
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="郵遞區號" required>
          <input
            value={form.postal}
            onChange={(e) => update("postal", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="國家" required>
          <input
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            required
            placeholder="TW"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="電話" required>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Email (選填)">
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
      >
        {loading ? "儲存中..." : "儲存"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
