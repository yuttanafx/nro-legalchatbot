import { SYSTEM_PROMPT, buildUserPrompt, AskParams, FALLBACK_ERROR_MESSAGE } from "../shared";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function askOpenAI(params: AskParams): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable");

  // ตั้งค่า OPENAI_MODEL ได้เอง เพราะ OpenAI ออกโมเดลใหม่บ่อย ค่าเริ่มต้นนี้เป็นรุ่นที่เสถียร ณ ตอนสร้างระบบ
  const model = process.env.OPENAI_MODEL || "gpt-4.1";

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(params) }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? FALLBACK_ERROR_MESSAGE;
}
