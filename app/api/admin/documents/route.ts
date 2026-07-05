import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createEmbedding } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const categoryId = req.nextUrl.searchParams.get("category_id");

  let query = supabase
    .from("documents")
    .select("id, category_id, title, source_ref, version, is_published, updated_by, updated_at")
    .order("updated_at", { ascending: false });

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

// สร้าง/แก้ไขเอกสาร — จะ re-embed อัตโนมัติทุกครั้งที่บันทึก เฉพาะหมวดที่แก้เท่านั้น
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();

  const { category_id, title, source_ref, content, updated_by, is_published } = body;

  if (!category_id || !title || !content) {
    return NextResponse.json(
      { error: "category_id, title, content are required" },
      { status: 400 }
    );
  }

  let embedding: number[];
  try {
    // ฝัง title รวมกับ content เพื่อให้ retrieval แม่นขึ้น
    embedding = await createEmbedding(`${title}\n${content}`);
  } catch (e: any) {
    return NextResponse.json(
      { error: `embedding failed: ${e.message}` },
      { status: 502 }
    );
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      category_id,
      title,
      source_ref: source_ref ?? null,
      content,
      embedding,
      updated_by: updated_by ?? null,
      is_published: is_published ?? false
    })
    .select("id, title, category_id, is_published")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ document: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const { id, title, source_ref, content, updated_by, is_published } = body;

  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };
  if (title !== undefined) updates.title = title;
  if (source_ref !== undefined) updates.source_ref = source_ref;
  if (updated_by !== undefined) updates.updated_by = updated_by;
  if (is_published !== undefined) updates.is_published = is_published;

  // ถ้ามีการแก้เนื้อหา ต้อง re-embed ใหม่ + เพิ่ม version
  if (content !== undefined) {
    updates.content = content;
    try {
      updates.embedding = await createEmbedding(`${title ?? ""}\n${content}`);
    } catch (e: any) {
      return NextResponse.json(
        { error: `embedding failed: ${e.message}` },
        { status: 502 }
      );
    }

    const { data: current } = await supabase
      .from("documents")
      .select("version")
      .eq("id", id)
      .single();
    updates.version = (current?.version ?? 1) + 1;
  }

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select("id, title, version, is_published")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ document: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
