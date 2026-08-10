"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export const MAIL_TYPE_LABELS: Record<string, string> = {
  EMS: "國際快捷 (EMS)",
  PARCEL: "包裹",
  E_PACKET: "e 小包",
  REGISTERED_SMALL_PACKET: "掛號小包",
  SMALL_PACKET: "平常小包",
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  GIFT: "禮品",
  DOCUMENTS: "文件",
  SALE_GOODS: "銷售物品",
  COMMERCIAL_SAMPLE: "商業貨樣",
  RETURNED_GOODS: "退貨",
  OTHER: "其他",
};

type ItemData = {
  description: string;
  quantity: number;
  unitValue: number;
  weight: number;
  originCountry: string;
  hsCode?: string | null;
};

const emptyItem: ItemData = {
  description: "",
  quantity: 1,
  unitValue: 0,
  weight: 0,
  originCountry: "TW",
  hsCode: "",
};

export type ShipmentData = {
  id?: string;
  senderProfileId: string;
  contactId: string;
  mailType: string;
  contentType: string;
  contractAccount?: string | null;
  currency: string;
  totalWeight?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  items: ItemData[];
};

type Option = { id: string; name: string };

export default function ShipmentForm({
  senders,
  contacts,
  initialData,
}: {
  senders: Option[];
  contacts: Option[];
  initialData?: ShipmentData;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ShipmentData>(
    initialData ?? {
      senderProfileId: senders[0]?.id ?? "",
      contactId: contacts[0]?.id ?? "",
      mailType: "PARCEL",
      contentType: "GIFT",
      contractAccount: "",
      currency: "TWD",
      totalWeight: undefined,
      lengthCm: undefined,
      widthCm: undefined,
      heightCm: undefined,
      items: [emptyItem],
    }
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField<K extends keyof ShipmentData>(
    key: K,
    value: ShipmentData[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateItem(index: number, key: keyof ItemData, value: string | number) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [key]: value };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = form.id ? `/api/shipments/${form.id}` : "/api/shipments";
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

    router.push(`/shipments/${data.id}`);
    router.refresh();
  }

  if (senders.length === 0 || contacts.length === 0) {
    return (
      <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
        請先建立至少一筆寄件人資料與收件人資料，才能建立寄件單。
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-3 gap-4">
        <Field label="寄件人" required>
          <select
            value={form.senderProfileId}
            onChange={(e) => updateField("senderProfileId", e.target.value)}
            className={inputClass}
          >
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="收件人" required>
          <select
            value={form.contactId}
            onChange={(e) => updateField("contactId", e.target.value)}
            className={inputClass}
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="郵件類型" required>
          <select
            value={form.mailType}
            onChange={(e) => updateField("mailType", e.target.value)}
            className={inputClass}
          >
            {Object.entries(MAIL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="物品種類" required>
          <select
            value={form.contentType}
            onChange={(e) => updateField("contentType", e.target.value)}
            className={inputClass}
          >
            {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="特約戶編號 (選填)">
          <input
            value={form.contractAccount ?? ""}
            onChange={(e) => updateField("contractAccount", e.target.value)}
            placeholder="簽約局號(6碼)+特約戶號(6碼)"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="幣別">
          <input
            value={form.currency}
            onChange={(e) => updateField("currency", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="總重量 (kg，含箱袋重)">
          <input
            type="number"
            step="0.001"
            value={form.totalWeight ?? ""}
            onChange={(e) =>
              updateField(
                "totalWeight",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="長度 (cm)">
          <input
            type="number"
            step="0.1"
            value={form.lengthCm ?? ""}
            onChange={(e) =>
              updateField(
                "lengthCm",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className={inputClass}
          />
        </Field>
        <Field label="寬度 (cm)">
          <input
            type="number"
            step="0.1"
            value={form.widthCm ?? ""}
            onChange={(e) =>
              updateField(
                "widthCm",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className={inputClass}
          />
        </Field>
        <Field label="高度 (cm)">
          <input
            type="number"
            step="0.1"
            value={form.heightCm ?? ""}
            onChange={(e) =>
              updateField(
                "heightCm",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">物品明細</h3>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            + 新增物品
          </button>
        </div>

        <div className="space-y-3">
          {form.items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 items-end bg-gray-50 rounded-xl p-3"
            >
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">品名</label>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-gray-500 mb-1">數量</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(i, "quantity", Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">單價</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.unitValue}
                  onChange={(e) =>
                    updateItem(i, "unitValue", Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  重量 (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={item.weight}
                  onChange={(e) => updateItem(i, "weight", Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">原產地</label>
                <input
                  value={item.originCountry}
                  onChange={(e) =>
                    updateItem(i, "originCountry", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-gray-500 mb-1">
                  HS Code
                </label>
                <input
                  value={item.hsCode ?? ""}
                  onChange={(e) => updateItem(i, "hsCode", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={form.items.length === 1}
                  className="text-red-500 hover:text-red-700 text-sm disabled:opacity-30"
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
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
  "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white";

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
