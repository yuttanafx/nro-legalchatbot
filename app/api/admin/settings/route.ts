import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// key ของ API key ที่อนุญาตให้ตั้งค่าผ่านหน้าเว็บ (เก็บใน DB แทน/ทับ Environment Variable)
const API_KEY_SETTINGS = ["anthropic_api_key", "gemini_api_key", "openai_api_key"] as const;
type ApiKeySettingKey = (typeof API_KEY_SETTINGS)[number];

function isApiKeySetting(key: string): key is ApiKeySettingKey {
  return (API_KEY_SETTINGS as readonly string[]).includes(key);
}

// แสดงผลแค่บางส่วนของ key ไม่ส่งค่าเต็มกลับไปที่ browser เพื่อความปลอดภัย
function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("settings").select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings: Record<string, string> = {};
  const apiKeys: Record<string, { configured: boolean; source: "database" | "env" | "none"; preview: string | null }> = {};

  for (const row of data ?? []) {
    if (isApiKeySetting(row.key)) continue; // ไม่ส่งค่า key จริงกลับไป
    settings[row.key] = row.value;
  }

  const dbKeyByName = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
  const envVarByKey: Record<ApiKeySettingKey, string | undefined> = {
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
    gemini_api_key: process.env.GEMINI_API_KEY,
    openai_api_key: process.env.OPENAI_API_KEY
  };

  for (const key of API_KEY_SETTINGS) {
    const dbValue: string | undefined = dbKeyByName[key];
    if (dbValue) {
      apiKeys[key] = { configured: true, source: "database", preview: maskSecret(dbValue) };
    } else if (envVarByKey[key]) {
      apiKeys[key] = { configured: true, source: "env", preview: null };
    } else {
      apiKeys[key] = { configured: false, source: "none", preview: null };
    }
  }

  return NextResponse.json({ settings, apiKeys });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const { key, value } = body;

  if (!key || typeof value !== "string" || value.trim() === "") {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  if (key === "ai_provider" && !["anthropic", "gemini", "openai"].includes(value)) {
    return NextResponse.json({ error: "invalid ai_provider value" }, { status: 400 });
  }

  if (key === "bot_tone" && !["formal", "professional_friendly", "warm_casual"].includes(value)) {
    return NextResponse.json({ error: "invalid bot_tone value" }, { status: 400 });
  }

  if (key !== "ai_provider" && key !== "bot_tone" && !isApiKeySetting(key)) {
    return NextResponse.json({ error: "invalid setting key" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("settings")
    .upsert({ key, value: value.trim(), updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // ไม่ส่งค่า API key จริงกลับไปใน response แม้จะเพิ่งบันทึกก็ตาม
  if (isApiKeySetting(key)) {
    return NextResponse.json({ setting: { key, updated_at: data.updated_at } });
  }
  return NextResponse.json({ setting: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key || !isApiKeySetting(key)) {
    return NextResponse.json({ error: "invalid setting key" }, { status: 400 });
  }

  const { error } = await supabase.from("settings").delete().eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
