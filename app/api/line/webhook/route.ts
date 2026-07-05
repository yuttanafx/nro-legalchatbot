import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyToLine, hashLineUserId } from "@/lib/line";
import { checkSensitiveFilter } from "@/lib/sensitiveFilter";
import { searchRelevantDocs, buildContextBlock } from "@/lib/rag";
import { askLegalAssistant } from "@/lib/ai";
import { getSupabaseAdmin } from "@/lib/supabase";

// เก็บ mapping "คำในข้อความ / rich menu postback" -> category slug แบบง่ายๆ
// ระบบจริงแนะนำให้ผูกกับ Rich Menu postback event แทนการเดาจากข้อความ
function guessCategorySlug(text: string): string | null {
  const map: Record<string, string> = {
    แรงงาน: "labor",
    ลูกจ้าง: "labor",
    เลิกจ้าง: "labor",
    ผู้บริโภค: "consumer",
    สัญญา: "consumer",
    หย่า: "family",
    มรดก: "family",
    พินัยกรรม: "family",
    ที่ดิน: "land",
    โฉนด: "land",
    อาญา: "criminal",
    คดีอาญา: "criminal"
  };
  for (const [keyword, slug] of Object.entries(map)) {
    if (text.includes(keyword)) return slug;
  }
  return null; // ไม่ระบุ -> ใช้หมวด 'general' หรือค้นทุกหมวด
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  let isValid = false;
  try {
    isValid = verifyLineSignature(rawBody, signature);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  if (!isValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const supabase = getSupabaseAdmin();

  for (const event of body.events ?? []) {
    if (event.type !== "message" || event.message?.type !== "text") continue;

    const userMessage: string = event.message.text;
    const replyToken: string = event.replyToken;
    const userHash = hashLineUserId(event.source?.userId ?? "unknown");
    const categorySlug = guessCategorySlug(userMessage);

    try {
      // 1) เช็ค sensitive filter ก่อนเสมอ
      const filterMatch = await checkSensitiveFilter(userMessage);

      if (filterMatch) {
        await replyToLine(replyToken, filterMatch.response_template);

        const { data: convo } = await supabase
          .from("conversations")
          .insert({
            line_user_hash: userHash,
            category_slug: categorySlug,
            user_message: userMessage,
            bot_response: filterMatch.response_template,
            filter_triggered: filterMatch.label,
            was_escalated: filterMatch.action === "escalate"
          })
          .select("id")
          .single();

        if (filterMatch.action === "escalate") {
          await supabase.from("escalations").insert({
            conversation_id: convo?.id,
            line_user_hash: userHash,
            reason: `Sensitive filter triggered: ${filterMatch.label}`
          });
        }
        continue; // ไปข้อความถัดไป ไม่ส่งเข้า AI
      }

      // 2) ค้นหาเอกสารกฎหมายที่เกี่ยวข้อง (RAG)
      const docs = await searchRelevantDocs(userMessage, categorySlug, 5);
      const contextBlock = buildContextBlock(docs);

      const { data: categoryRow } = categorySlug
        ? await supabase
            .from("categories")
            .select("name_th")
            .eq("slug", categorySlug)
            .single()
        : { data: null };

      // 3) ส่งเข้า Claude พร้อม context ที่ค้นเจอ
      const answer = await askLegalAssistant({
        userMessage,
        contextBlock,
        categoryNameTh: categoryRow?.name_th ?? "ไม่ระบุหมวด (ทั่วไป)"
      });

      await replyToLine(replyToken, answer);

      await supabase.from("conversations").insert({
        line_user_hash: userHash,
        category_slug: categorySlug,
        user_message: userMessage,
        bot_response: answer,
        was_escalated: false
      });
    } catch (err) {
      console.error("Webhook processing error:", err);
      try {
        await replyToLine(
          replyToken,
          "ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่โดยตรง"
        );
      } catch (replyErr) {
        console.error("Failed to send error reply:", replyErr);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
