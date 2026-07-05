"use client";

import { useEffect, useState } from "react";

const PROVIDERS: { value: string; label: string; keyName: string }[] = [
  {
    value: "anthropic",
    label: "Claude (Anthropic)",
    keyName: "anthropic_api_key"
  },
  {
    value: "gemini",
    label: "Gemini (Google)",
    keyName: "gemini_api_key"
  },
  {
    value: "openai",
    label: "GPT (OpenAI)",
    keyName: "openai_api_key"
  }
];

const TONE_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: "formal",
    label: "ทางการ",
    description: "สุภาพเต็มรูปแบบ กระชับ ตรงประเด็น เหมือนหน่วยงานราชการ"
  },
  {
    value: "professional_friendly",
    label: "มืออาชีพแต่เป็นมิตร (ค่าเริ่มต้น)",
    description: "สุภาพ อบอุ่นเล็กน้อย เข้าใจง่าย น่าเชื่อถือ"
  },
  {
    value: "warm_casual",
    label: "เป็นกันเอง อบอุ่น",
    description: "เหมือนคุยกับคนที่ห่วงใย เข้าถึงง่าย แต่ยังคงความแม่นยำของข้อมูล"
  }
];

type ApiKeyInfo = {
  configured: boolean;
  source: "database" | "env" | "none";
  preview: string | null;
};

export default function SettingsPage() {
  const [provider, setProvider] = useState<string>("anthropic");
  const [tone, setTone] = useState<string>("professional_friendly");
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyInfo>>({});
  const [saving, setSaving] = useState(false);
  const [toneSaving, setToneSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ค่าที่กำลังพิมพ์อยู่ในช่อง input ของแต่ละค่าย (ยังไม่บันทึก)
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [keySaving, setKeySaving] = useState<Record<string, boolean>>({});
  const [keyMessage, setKeyMessage] = useState<Record<string, string>>({});

  const loadSettings = () => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setProvider(d.settings?.ai_provider ?? "anthropic");
        setTone(d.settings?.bot_tone ?? "professional_friendly");
        setApiKeys(d.apiKeys ?? {});
        setLoaded(true);
      });
  };

  useEffect(() => {
    loadSettings();
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

  const handleSelectTone = async (value: string) => {
    setTone(value);
    setToneSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "bot_tone", value })
    });
    setToneSaving(false);
  };

  const handleSaveKey = async (keyName: string) => {
    const value = keyDrafts[keyName]?.trim();
    if (!value) return;

    setKeySaving((s) => ({ ...s, [keyName]: true }));
    setKeyMessage((m) => ({ ...m, [keyName]: "" }));

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyName, value })
      });
      if (!res.ok) {
        const d = await res.json();
        setKeyMessage((m) => ({ ...m, [keyName]: d.error || "บันทึกไม่สำเร็จ" }));
        return;
      }
      setKeyDrafts((d) => ({ ...d, [keyName]: "" }));
      setKeyMessage((m) => ({ ...m, [keyName]: "บันทึกแล้ว" }));
      loadSettings();
    } finally {
      setKeySaving((s) => ({ ...s, [keyName]: false }));
    }
  };

  const handleRemoveKey = async (keyName: string) => {
    setKeySaving((s) => ({ ...s, [keyName]: true }));
    try {
      await fetch(`/api/admin/settings?key=${keyName}`, { method: "DELETE" });
      setKeyMessage((m) => ({ ...m, [keyName]: "ลบแล้ว (จะใช้ค่าจาก Environment Variable แทน ถ้ามี)" }));
      loadSettings();
    } finally {
      setKeySaving((s) => ({ ...s, [keyName]: false }));
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">ตั้งค่าระบบ</h1>
      <p className="text-sm text-muted mt-1">
        เลือกค่าย AI ที่จะใช้ตอบคำถามใน LINE OA และตั้งค่า API key ได้จากหน้านี้โดยตรง —
        สลับหรือเปลี่ยน key ได้ทันทีโดยไม่ต้อง deploy ใหม่
      </p>

      {!loaded && <p className="mt-6 text-sm text-muted">กำลังโหลด…</p>}

      {loaded && (
        <>
          <div className="mt-6 border border-line rounded-md bg-white divide-y divide-line">
            {PROVIDERS.map((p) => {
              const info = apiKeys[p.keyName];
              return (
                <div key={p.value} className="px-5 py-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="ai_provider"
                      className="mt-1 accent-moss"
                      checked={provider === p.value}
                      onChange={() => handleSelect(p.value)}
                      disabled={saving}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-ink font-medium">{p.label}</p>
                        {info?.configured ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-moss/10 text-moss">
                            {info.source === "database" ? "ตั้งค่าจากหน้าเว็บ" : "ตั้งค่าจาก Environment Variable"}
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-clay/10 text-clay">
                            ยังไม่ได้ตั้งค่า
                          </span>
                        )}
                      </div>
                      {info?.preview && (
                        <p className="text-xs text-muted mt-0.5 font-mono">{info.preview}</p>
                      )}
                    </div>
                  </label>

                  <div className="mt-3 ml-7 flex items-center gap-2">
                    <input
                      type="password"
                      placeholder={
                        info?.source === "database"
                          ? "กรอก key ใหม่เพื่อเปลี่ยน…"
                          : "กรอก API key…"
                      }
                      value={keyDrafts[p.keyName] ?? ""}
                      onChange={(e) =>
                        setKeyDrafts((d) => ({ ...d, [p.keyName]: e.target.value }))
                      }
                      className="flex-1 rounded-md border border-line px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/40 focus:border-moss font-mono"
                      disabled={keySaving[p.keyName]}
                    />
                    <button
                      onClick={() => handleSaveKey(p.keyName)}
                      disabled={keySaving[p.keyName] || !keyDrafts[p.keyName]?.trim()}
                      className="text-sm bg-moss hover:bg-moss_dark disabled:opacity-40 disabled:cursor-not-allowed text-paper rounded-md px-3 py-1.5 transition-colors shrink-0"
                    >
                      บันทึก
                    </button>
                    {info?.source === "database" && (
                      <button
                        onClick={() => handleRemoveKey(p.keyName)}
                        disabled={keySaving[p.keyName]}
                        className="text-sm text-muted hover:text-clay disabled:opacity-40 shrink-0"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                  {keyMessage[p.keyName] && (
                    <p className="ml-7 mt-1.5 text-xs text-muted">{keyMessage[p.keyName]}</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-muted">
            หมายเหตุ: API key ที่กรอกที่นี่จะถูกเก็บไว้ในฐานข้อมูล Supabase (ตาราง settings)
            และมีสิทธิ์เข้าถึงเฉพาะผู้ที่ล็อกอินเข้าหน้าแอดมินนี้เท่านั้น หากไม่ได้ตั้งค่าไว้ที่นี่
            ระบบจะใช้ค่าเริ่มต้นจาก Environment Variable แทน
          </p>

          <h2 className="font-display text-xl text-ink mt-10">โทนการตอบของบอท</h2>
          <p className="text-sm text-muted mt-1">
            ปรับน้ำเสียง/ความเป็นกันเองของคำตอบได้ กฎเรื่องความถูกต้องของข้อมูลกฎหมายและ
            disclaimer ยังคงเหมือนเดิมทุกโทน เปลี่ยนแค่วิธีเรียบเรียงคำตอบเท่านั้น
          </p>

          <div className="mt-4 border border-line rounded-md bg-white divide-y divide-line">
            {TONE_OPTIONS.map((t) => (
              <label key={t.value} className="flex items-start gap-3 px-5 py-4 cursor-pointer">
                <input
                  type="radio"
                  name="bot_tone"
                  className="mt-1 accent-moss"
                  checked={tone === t.value}
                  onChange={() => handleSelectTone(t.value)}
                  disabled={toneSaving}
                />
                <div>
                  <p className="text-ink font-medium">{t.label}</p>
                  <p className="text-xs text-muted mt-0.5">{t.description}</p>
                </div>
              </label>
            ))}
          </div>
          {toneSaving && <p className="mt-2 text-xs text-muted">กำลังบันทึก…</p>}
        </>
      )}

      {saving && <p className="mt-3 text-xs text-muted">กำลังบันทึก…</p>}
    </div>
  );
}
