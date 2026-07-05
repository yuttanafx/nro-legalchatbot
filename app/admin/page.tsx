"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalCategories: number;
  totalDocuments: number;
  totalConversations: number;
  pendingEscalations: number;
  recentConversations: {
    category_slug: string | null;
    user_message: string;
    was_escalated: boolean;
    filter_triggered: string | null;
    created_at: string;
  }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">ภาพรวมระบบ</h1>
      <p className="text-sm text-muted mt-1">สถานะการทำงานของแชทบอทกฎหมาย</p>

      {error && (
        <p className="mt-6 text-clay text-sm">โหลดข้อมูลไม่สำเร็จ: {error}</p>
      )}

      {!stats && !error && (
        <p className="mt-6 text-sm text-muted">กำลังโหลดข้อมูล…</p>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4 mt-6">
            <StatCard label="หมวดกฎหมาย" value={stats.totalCategories} />
            <StatCard label="เอกสารในคลัง" value={stats.totalDocuments} />
            <StatCard label="บทสนทนาทั้งหมด" value={stats.totalConversations} />
            <StatCard
              label="รอส่งต่อเจ้าหน้าที่"
              value={stats.pendingEscalations}
              accent={stats.pendingEscalations > 0}
            />
          </div>

          <div className="mt-10">
            <h2 className="font-display text-lg text-ink">บทสนทนาล่าสุด</h2>
            <div className="mt-3 border border-line rounded-md divide-y divide-line bg-white">
              {stats.recentConversations.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted">ยังไม่มีบทสนทนา</p>
              )}
              {stats.recentConversations.map((c, i) => (
                <div key={i} className="px-4 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink">{c.user_message}</p>
                    <p className="text-xs text-muted mt-1">
                      หมวด: {c.category_slug ?? "ไม่ระบุ"} ·{" "}
                      {new Date(c.created_at).toLocaleString("th-TH")}
                    </p>
                  </div>
                  {c.filter_triggered && (
                    <span className="text-xs px-2 py-1 rounded bg-clay/10 text-clay shrink-0">
                      {c.was_escalated ? "ส่งต่อเจ้าหน้าที่" : "ปฏิเสธ"}: {c.filter_triggered}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="border border-line rounded-md bg-white px-5 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-display text-3xl mt-1 ${accent ? "text-clay" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
