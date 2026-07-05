"use client";

import { useEffect, useState } from "react";

const PROVIDERS: { value: string; label: string; note: string }[] = [
  {
    value: "anthropic",
    label: "Claude (Anthropic)",
    note: "ต้องตั้งค่า ANTHROPIC_API_KEY — แนะนำสำหรับงานนี้ context ใหญ่ อ้างอิงมาตรากฎหมายแม่นยำ"
  },
  {
    value: "gemini",
    label: "Gemini (Google)",
    note: "ต้องตั้งค่า GEMINI_API_KEY"
  },
  {
    value: "openai",
    label: "GPT (OpenAI)",
    note: "ต้องตั้งค่า OPENAI_API_KEY"
  }
];

export default function SettingsPage() {
  const [provider, setProvider] = useState<string>("anthropic");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setProvider(d.settings?.ai_provider ?? "anthropic");
        setLoaded(true);
      });
  }, []);

  const handleSelect = async (value: string) => {
    setProvider(value);
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "ai_provider", value })
    });
    setSaving(false);
  };

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">ตั้งค่าระบบ</h1>
      <p className="text-sm text-muted mt-1">
        เลือกค่าย AI ที่จะใช้ตอบคำถามใน LINE OA — สลับได้ทันทีโดยไม่ต้อง deploy ใหม่
        (ต้องใส่ API key ของค่ายนั้นไว้ใน Environment Variables ก่อน)
      </p>

      {!loaded && <p className="mt-6 text-sm text-muted">กำลังโหลด…</p>}

      {loaded && (
        <div className="mt-6 border border-line rounded-md bg-white divide-y divide-line">
          {PROVIDERS.map((p) => (
            <label
              key={p.value}
              className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-black/[0.02]"
            >
              <input
                type="radio"
                name="ai_provider"
                className="mt-1 accent-moss"
                checked={provider === p.value}
                onChange={() => handleSelect(p.value)}
                disabled={saving}
              />
              <div>
                <p className="text-ink font-medium">{p.label}</p>
                <p className="text-xs text-muted mt-0.5">{p.note}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {saving && <p className="mt-3 text-xs text-muted">กำลังบันทึก…</p>}
    </div>
  );
}
