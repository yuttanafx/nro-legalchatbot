import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt, AskParams, FALLBACK_ERROR_MESSAGE } from "../shared";

export async function askClaude(
  params: AskParams,
  apiKeyOverride?: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY (ตั้งค่าได้ที่หน้า /admin/settings หรือ Environment Variable)");

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: buildUserPrompt(params) }]
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : FALLBACK_ERROR_MESSAGE;
}
