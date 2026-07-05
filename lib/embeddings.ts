// สร้าง embedding สำหรับข้อความ ใช้ Voyage AI (คำแนะนำอย่างเป็นทางการของ Anthropic
// สำหรับงาน embedding เนื่องจาก Claude เองไม่มี embeddings endpoint)
// ดู https://docs.voyageai.com

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VOYAGE_API_KEY environment variable");
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "voyage-3-lite", // ประหยัด และคุณภาพเพียงพอสำหรับ retrieval งานนี้
      input: [text]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voyage embedding error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.data[0].embedding as number[];
}
