import { SYSTEM_PROMPT, buildUserPrompt, AskParams, FALLBACK_ERROR_MESSAGE } from "../shared";

export async function askGemini(
  params: AskParams,
  apiKeyOverride?: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY (ตั้งค่าได้ที่หน้า /admin/settings หรือ Environment Variable)");

  // ตั้งค่า GEMINI_MODEL ได้เอง เพราะ Google ออกโมเดลใหม่บ่อย ค่าเริ่มต้นนี้เป็นรุ่น GA ที่เสถียร ณ ตอนสร้างระบบ
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: "user",
          parts: [{ text: buildUserPrompt(params) }]
        }
      ],
      generationConfig: { maxOutputTokens: 1024 }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("");
  return text || FALLBACK_ERROR_MESSAGE;
}
