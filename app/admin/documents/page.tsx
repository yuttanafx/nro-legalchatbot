"use client";

import { useEffect, useState } from "react";

type Category = { id: string; slug: string; name_th: string };
type Document = {
  id: string;
  category_id: string;
  title: string;
  source_ref: string | null;
  version: number;
  is_published: boolean;
  updated_at: string;
};

export default function DocumentsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", source_ref: "", content: "" });

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        if (d.categories?.length) setSelectedCategory(d.categories[0].id);
      });
  }, []);

  const loadDocuments = (categoryId: string) => {
    fetch(`/api/admin/documents?category_id=${categoryId}`)
      .then((r) => r.json())
      .then((d) => setDocuments(d.documents ?? []));
  };

  useEffect(() => {
    if (selectedCategory) loadDocuments(selectedCategory);
  }, [selectedCategory]);

  const handleCreate = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, category_id: selectedCategory, is_published: true })
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", source_ref: "", content: "" });
      loadDocuments(selectedCategory);
    } else {
      const d = await res.json();
      alert(`บันทึกไม่สำเร็จ: ${d.error}`);
    }
  };

  const togglePublish = async (doc: Document) => {
    await fetch("/api/admin/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: doc.id, is_published: !doc.is_published })
    });
    loadDocuments(selectedCategory);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบเอกสารนี้?")) return;
    await fetch(`/api/admin/documents?id=${id}`, { method: "DELETE" });
    loadDocuments(selectedCategory);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">คลังข้อมูล</h1>
          <p className="text-sm text-muted mt-1">
            แก้ไข/เพิ่มเอกสารจะทำการฝัง embedding ใหม่อัตโนมัติ
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-sm bg-moss text-white px-4 py-2 rounded-md hover:bg-moss_dark"
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มเอกสาร"}
        </button>
      </div>

      <div className="mt-4">
        <label className="text-xs text-muted">หมวดกฎหมาย</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="block mt-1 border border-line rounded-md px-3 py-2 text-sm bg-white"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_th}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="mt-4 border border-line rounded-md bg-white p-5 space-y-3">
          <label className="block">
            <span className="text-xs text-muted">หัวข้อ</span>
            <input
              className="input mt-1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder='เช่น "สิทธิลูกจ้างเมื่อถูกเลิกจ้างโดยไม่บอกล่วงหน้า"'
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">อ้างอิงแหล่งที่มา</span>
            <input
              className="input mt-1"
              value={form.source_ref}
              onChange={(e) => setForm({ ...form, source_ref: e.target.value })}
              placeholder="เช่น พ.ร.บ.คุ้มครองแรงงาน มาตรา 17, 118"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">เนื้อหา</span>
            <textarea
              className="input mt-1"
              rows={8}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="อธิบายเนื้อหากฎหมาย พร้อมตัวอย่างที่เข้าใจง่าย"
            />
          </label>
          <button
            onClick={handleCreate}
            disabled={saving || !form.title || !form.content}
            className="text-sm bg-ink text-white px-4 py-2 rounded-md disabled:opacity-40"
          >
            {saving ? "กำลังฝัง embedding และบันทึก…" : "บันทึกเอกสาร"}
          </button>
        </div>
      )}

      <div className="mt-6 border border-line rounded-md bg-white divide-y divide-line">
        {documents.length === 0 && (
          <p className="px-5 py-6 text-sm text-muted">ยังไม่มีเอกสารในหมวดนี้</p>
        )}
        {documents.map((doc) => (
          <div key={doc.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-ink font-medium">{doc.title}</p>
              <p className="text-xs text-muted mt-0.5">
                {doc.source_ref ?? "ไม่ระบุแหล่งอ้างอิง"} · v{doc.version} ·{" "}
                {new Date(doc.updated_at).toLocaleDateString("th-TH")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => togglePublish(doc)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  doc.is_published ? "border-moss text-moss" : "border-line text-muted"
                }`}
              >
                {doc.is_published ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
              </button>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-xs px-3 py-1.5 rounded-full border border-clay/40 text-clay"
              >
                ลบ
              </button>
            </div>
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
