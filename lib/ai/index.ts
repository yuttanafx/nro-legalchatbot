import { getSupabaseAdmin } from "../supabase";
import { askClaude } from "./providers/anthropic";
import { askGemini } from "./providers/gemini";
import { askOpenAI } from "./providers/openai";
import { AskParams } from "./shared";

export type AiProvider = "anthropic" | "gemini" | "openai";

const DEFAULT_PROVIDER: AiProvider = "anthropic";

export async function getActiveProvider(): Promise<AiProvider> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "ai_provider")
    .single();

  const value = data?.value as AiProvider | undefined;
  return value && ["anthropic", "gemini", "openai"].includes(value)
    ? value
    : DEFAULT_PROVIDER;
}

export async function askLegalAssistant(params: AskParams): Promise<string> {
  const provider = await getActiveProvider();

  switch (provider) {
    case "gemini":
      return askGemini(params);
    case "openai":
      return askOpenAI(params);
    case "anthropic":
    default:
      return askClaude(params);
  }
}
