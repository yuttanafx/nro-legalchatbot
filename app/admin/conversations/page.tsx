"use client";

import { useEffect, useState } from "react";

type Conversation = {
  id: string;
  line_user_hash: string;
  category_slug: string | null;
  user_message: string;
  bot_response: string | null;
  filter_triggered: string | null;
  was_escalated: boolean;
  created_at: string;
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    fetch("/api/admin/conversations")
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">บทสนทนา</h1>
      <p className="text-sm text-muted mt-1">
        รหัสผู้ใช้ถูก hash แล้วตาม PDPA — ไม่แสดง LINE userId จริง
      </p>

      <div className="mt-6 border border-line rounded-md bg-white divide-y divide-line">
        {conversations.length === 0 && (
          <p className="px-5 py-6 text-sm text-muted">ยังไม่มีบทสนทนา</p>
        )}
        {conversations.map((c) => (
          <div key={c.id} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted">
                {c.line_user_hash.slice(0, 10)}… · {c.category_slug ?? "ไม่ระบุหมวด"}
              </span>
              <span className="text-xs text-muted">
                {new Date(c.created_at).toLocaleString("th-TH")}
              </span>
            </div>
            <p className="text-sm text-ink mt-2">
              <span className="text-muted">ผู้ใช้: </span>
              {c.user_message}
            </p>
            {c.bot_response && (
              <p className="text-sm text-ink/80 mt-1">
                <span className="text-muted">บอท: </span>
                {c.bot_response}
              </p>
            )}
            {c.filter_triggered && (
              <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-clay/10 text-clay">
                {c.was_escalated ? "ส่งต่อเจ้าหน้าที่" : "ปฏิเสธ"}: {c.filter_triggered}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
