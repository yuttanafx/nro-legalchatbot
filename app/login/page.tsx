"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl text-ink">แอดมินบอทกฎหมาย</p>
          <p className="text-sm text-muted mt-1">องค์กร NRO</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-line rounded-md px-6 py-6 space-y-4"
        >
          <div>
            <label htmlFor="password" className="block text-sm text-ink font-medium mb-1.5">
              รหัสผ่านผู้ดูแลระบบ
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/40 focus:border-moss"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-moss hover:bg-moss_dark disabled:opacity-50 disabled:cursor-not-allowed text-paper text-sm font-medium rounded-md py-2.5 transition-colors"
          >
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
