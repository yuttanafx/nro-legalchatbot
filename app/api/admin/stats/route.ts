import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const [categories, documents, conversations, escalations] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase
      .from("escalations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
  ]);

  const { data: recentConversations } = await supabase
    .from("conversations")
    .select("category_slug, user_message, was_escalated, filter_triggered, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    totalCategories: categories.count ?? 0,
    totalDocuments: documents.count ?? 0,
    totalConversations: conversations.count ?? 0,
    pendingEscalations: escalations.count ?? 0,
    recentConversations: recentConversations ?? []
  });
}
