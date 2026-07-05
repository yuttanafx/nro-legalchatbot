"use client";

import { useEffect, useState } from "react";

type Filter = {
  id: string;
  label: string;
  match_keywords: string[];
  action: "escalate" | "refuse";
  response_template: string;
  is_active: boolean;
};

export default function SensitiveFiltersPage() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: "",
    keywords: "",
    action: "escalate" as "escalate" | "refuse",
    response_template: ""
  });

  const load = () => {
    fetch("/api/admin/sensitive-filters")
      .then((r) => r.json())
      .then((d) => setFilters(d.filters ?? []));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setSaving(true);
    await fetch("/api/admin/sensitive-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label,
        match_keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        action: form.action,
        response_template: form.response_template
      })
    });
    setSaving(false);
    setShowForm(false);
    setForm({ label: "", keywords: "", action: "escalate", response_template: "" });
    load();
  };

  const toggleActive = async (f: Filter) => {
    await fetch("/api/admin/sensitive-filters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, is_active: !f.is_active })
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบกฎนี้?")) return;
    await fetch(`/api/admin/sensitive-filters?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">ข้อมูลอ่อนไหว</h1>
          <p className="text-sm text-muted mt-1">
            หัวข้อ/คำที่บอทจะไม่ตอบเนื้อหาเอง — ปฏิเสธ หรือ ส่งต่อเจ้าหน้าที่ทันที
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm bg-moss text-white px-4 py-2 rounded-md hover:bg-moss_dark"
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มกฎ"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 border border-line rounded-md bg-white p-5 space-y-3">
          <label className="block">
            <span className="text-xs text-muted">ชื่อกฎ</span>
            <input
              className="input mt-1"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="เช่น ความรุนแรงในครอบครัว"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">คำ/วลีที่ trigger (คั่นด้วยลูกน้ำ)</span>
            <input
              className="input mt-1"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="ทำร้ายร่างกาย, ข่มขืน, ล่วงละเมิด"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">การตอบสนอง</span>
            <select
              className="input mt-1"
              value={form.action}
              onChange={(e) =>
                setForm({ ...form, action: e.target.value as "escalate" | "refuse" })
              }
            >
              <option value="escalate">ส่งต่อเจ้าหน้าที่ (escalate)</option>
              <option value="refuse">ปฏิเสธอย่างสุภาพ (refuse)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted">ข้อความมาตรฐานที่จะตอบแทน</span>
            <textarea
              className="input mt-1"
              rows={3}
              value={form.response_template}
              onChange={(e) => setForm({ ...form, response_template: e.target.value })}
            />
          </label>
          <button
            onClick={handleCreate}
            disabled={saving || !form.label || !form.keywords || !form.response_template}
            className="text-sm bg-ink text-white px-4 py-2 rounded-md disabled:opacity-40"
          >
            {saving ? "กำลังบันทึก…" : "บันทึกกฎ"}
          </button>
        </div>
      )}

      <div className="mt-6 border border-line rounded-md bg-white divide-y divide-line">
        {filters.map((f) => (
          <div key={f.id} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-ink font-medium">{f.label}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    f.action === "escalate" ? "bg-moss/10 text-moss" : "bg-clay/10 text-clay"
                  }`}
                >
                  {f.action === "escalate" ? "ส่งต่อเจ้าหน้าที่" : "ปฏิเสธ"}
                </span>
                <button
                  onClick={() => toggleActive(f)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    f.is_active ? "border-moss text-moss" : "border-line text-muted"
                  }`}
                >
                  {f.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="text-xs px-3 py-1.5 rounded-full border border-clay/40 text-clay"
                >
                  ลบ
                </button>
              </div>
            </div>
            <p className="text-xs text-muted mt-1">
              คำที่ตรวจจับ: {f.match_keywords.join(", ")}
            </p>
            <p className="text-sm text-ink/80 mt-2 bg-paper rounded px-3 py-2">
              {f.response_template}
            </p>
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
