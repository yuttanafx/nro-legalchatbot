"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  slug: string;
  name_th: string;
  description: string | null;
  owner_name: string | null;
  is_active: boolean;
  updated_at: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: "", name_th: "", description: "", owner_name: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setSaving(true);
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setSaving(false);
    setShowForm(false);
    setForm({ slug: "", name_th: "", description: "", owner_name: "" });
    load();
  };

  const toggleActive = async (cat: Category) => {
    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, is_active: !cat.is_active })
    });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">หมวดกฎหมาย</h1>
          <p className="text-sm text-muted mt-1">
            แต่ละหมวดอัปเดตข้อมูลได้อิสระ โดยไม่กระทบหมวดอื่น
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm bg-moss text-white px-4 py-2 rounded-md hover:bg-moss_dark transition-colors"
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มหมวด"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 border border-line rounded-md bg-white p-5 space-y-3">
          <Field label="slug (ภาษาอังกฤษ ไม่มีเว้นวรรค)">
            <input
              className="input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="เช่น immigration"
            />
          </Field>
          <Field label="ชื่อหมวด (ไทย)">
            <input
              className="input"
              value={form.name_th}
              onChange={(e) => setForm({ ...form, name_th: e.target.value })}
              placeholder="เช่น กฎหมายคนเข้าเมือง"
            />
          </Field>
          <Field label="คำอธิบาย">
            <textarea
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="ผู้ดูแลหมวดนี้">
            <input
              className="input"
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
              placeholder="ชื่อทนายอาสา/เจ้าหน้าที่"
            />
          </Field>
          <button
            onClick={handleCreate}
            disabled={saving || !form.slug || !form.name_th}
            className="text-sm bg-ink text-white px-4 py-2 rounded-md disabled:opacity-40"
          >
            {saving ? "กำลังบันทึก…" : "บันทึกหมวด"}
          </button>
        </div>
      )}

      <div className="mt-6 border border-line rounded-md bg-white divide-y divide-line">
        {categories.map((cat) => (
          <div key={cat.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-ink font-medium">
                {cat.name_th}{" "}
                <span className="text-xs text-muted font-mono">({cat.slug})</span>
              </p>
              {cat.description && (
                <p className="text-sm text-muted mt-0.5">{cat.description}</p>
              )}
              {cat.owner_name && (
                <p className="text-xs text-muted mt-0.5">ผู้ดูแล: {cat.owner_name}</p>
              )}
            </div>
            <button
              onClick={() => toggleActive(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                cat.is_active
                  ? "border-moss text-moss"
                  : "border-line text-muted"
              }`}
            >
              {cat.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e1ded4;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
          background: white;
        }
        .input:focus {
          outline: 2px solid #3a5a44;
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
