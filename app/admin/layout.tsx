"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/categories", label: "หมวดกฎหมาย" },
  { href: "/admin/documents", label: "คลังข้อมูล" },
  { href: "/admin/sensitive-filters", label: "ข้อมูลอ่อนไหว" },
  { href: "/admin/conversations", label: "บทสนทนา" },
  { href: "/admin/settings", label: "ตั้งค่าระบบ" }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-line bg-white/60 flex flex-col">
        <div className="px-6 py-6 border-b border-line">
          <p className="font-display text-lg text-ink leading-tight">แอดมินบอทกฎหมาย</p>
          <p className="text-xs text-muted mt-1">มูลนิธิช่วยเหลือประชาชน</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-6 py-2.5 text-sm border-l-2 transition-colors ${
                  active
                    ? "border-moss text-ink font-medium bg-moss/5"
                    : "border-transparent text-muted hover:text-ink hover:bg-black/[0.02]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-line">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-muted hover:text-clay transition-colors disabled:opacity-50"
          >
            {loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
          </button>
        </div>
      </aside>
      <main className="flex-1 px-10 py-8 max-w-5xl">{children}</main>
    </div>
  );
}
