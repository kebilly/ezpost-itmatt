"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ContactData = {
  id?: string;
  name: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  postal: string;
  country: string;
  phone: string;
  email?: string | null;
  taxId?: string | null;
  note?: string | null;
};

const emptyContact: ContactData = {
  name: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postal: "",
  country: "",
  phone: "",
  email: "",
  taxId: "",
  note: "",
};

export default function ContactForm({
  initialData,
}: {
  initialData?: ContactData;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ContactData>(initialData ?? emptyContact);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update<K extends keyof ContactData>(key: K, value: ContactData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = form.id ? `/api/contacts/${form.id}` : "/api/contacts";
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

    router.push("/contacts");
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="城市 City" required>
          <input
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="州 / 省 / 地區 State">
          <input
            value={form.state ?? ""}
            onChange={(e) => update("state", e.target.value)}
            placeholder="New South Wales"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="郵遞區號" required>
          <input
            value={form.postal}
            onChange={(e) => update("postal", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="國家 (寄達國)" required>
          <input
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            required
            placeholder="Australia"
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

      <Field label="稅務識別碼 (選填，寄歐盟 IOSS/VAT 常需要)">
        <input
          value={form.taxId ?? ""}
          onChange={(e) => update("taxId", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="備註 (選填)">
        <textarea
          value={form.note ?? ""}
          onChange={(e) => update("note", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Field>

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
