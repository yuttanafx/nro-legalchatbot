import { getSupabaseAdmin } from "./supabase";
import { createEmbedding } from "./embeddings";

export type RetrievedDoc = {
  id: string;
  title: string;
  source_ref: string | null;
  content: string;
  similarity: number;
};

// ค้นหาเอกสารกฎหมายที่เกี่ยวข้องที่สุดกับคำถาม ภายในหมวดที่ระบุ (ถ้ามี)
export async function searchRelevantDocs(
  question: string,
  categorySlug: string | null,
  matchCount = 5
): Promise<RetrievedDoc[]> {
  const embedding = await createEmbedding(question);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_category_slug: categorySlug,
    match_count: matchCount
  });

  if (error) {
    throw new Error(`match_documents RPC error: ${error.message}`);
  }

  return data as RetrievedDoc[];
}

// รวมเอกสารที่ค้นเจอให้เป็น context text พร้อมเลขอ้างอิง สำหรับใส่ใน prompt
export function buildContextBlock(docs: RetrievedDoc[]): string {
  if (docs.length === 0) {
    return "(ไม่พบข้อมูลที่เกี่ยวข้องในคลังความรู้สำหรับคำถามนี้)";
  }
  return docs
    .map(
      (d, i) =>
        `[อ้างอิง ${i + 1}] ${d.title}${d.source_ref ? ` (${d.source_ref})` : ""}\n${d.content}`
    )
    .join("\n\n");
}
