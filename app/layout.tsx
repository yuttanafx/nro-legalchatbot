import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "แอดมินบอทกฎหมาย",
  description: "ระบบจัดการแชทบอทกฎหมายสำหรับ LINE OA"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="font-sans">{children}</body>
    </html>
  );
}
