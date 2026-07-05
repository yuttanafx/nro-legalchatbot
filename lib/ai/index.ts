import { getSupabaseAdmin } from "../supabase";
import { askClaude } from "./providers/anthropic";
import { askGemini } from "./providers/gemini";
import { askOpenAI } from "./providers/openai";
import { AskParams } from "./shared";

export type AiProvider = "anthropic" | "gemini" | "openai";

const DEFAULT_PROVIDER: AiProvider = "anthropic";

// รายชื่อ key ที่เก็บ API key ต่อค่ายไว้ในตาราง settings (แก้ไขได้ที่หน้า /admin/settings)
const PROVIDER_KEY_SETTING: Record<AiProvider, string> = {
  anthropic: "anthropic_api_key",
  gemini: "gemini_api_key",
  openai: "openai_api_key"
};

async function getAllSettings(): Promise<Record<string, string>> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("settings").select("key, value");
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

export async function getActiveProvider(): Promise<AiProvider> {
  const settings = await getAllSettings();
  const value = settings.ai_provider as AiProvider | undefined;
  return value && ["anthropic", "gemini", "openai"].includes(value)
    ? value
    : DEFAULT_PROVIDER;
}

export async function askLegalAssistant(params: AskParams): Promise<string> {
  const settings = await getAllSettings();
  const provider =
    (settings.ai_provider as AiProvider | undefined) &&
    ["anthropic", "gemini", "openai"].includes(settings.ai_provider)
      ? (settings.ai_provider as AiProvider)
      : DEFAULT_PROVIDER;

  // ใช้ API key ที่ตั้งค่าไว้ในหน้าเว็บ (DB) ก่อน ถ้าไม่มีจะ fallback ไปที่ Environment Variable
  const apiKey = settings[PROVIDER_KEY_SETTING[provider]];

  switch (provider) {
    case "gemini":
      return askGemini(params, apiKey);
    case "openai":
      return askOpenAI(params, apiKey);
    case "anthropic":
    default:
      return askClaude(params, apiKey);
  }
}
