import { getSupabaseAdmin } from "./supabase";

export type FilterMatch = {
  label: string;
  action: "escalate" | "refuse";
  response_template: string;
};

// เช็คว่าข้อความผู้ใช้เข้าเงื่อนไข sensitive filter ข้อใดหรือไม่
// คืนค่า match แรกที่เจอ (ควรจัดลำดับความสำคัญของกฎในตาราง sensitive_filters เอง)
export async function checkSensitiveFilter(
  message: string
): Promise<FilterMatch | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sensitive_filters")
    .select("label, match_keywords, action, response_template")
    .eq("is_active", true);

  if (error) {
    throw new Error(`sensitive_filters query error: ${error.message}`);
  }

  const lowerMessage = message.toLowerCase();

  for (const filter of data ?? []) {
    const matched = (filter.match_keywords as string[]).some((kw) =>
      lowerMessage.includes(kw.toLowerCase())
    );
    if (matched) {
      return {
        label: filter.label,
        action: filter.action,
        response_template: filter.response_template
      };
    }
  }

  return null;
}
