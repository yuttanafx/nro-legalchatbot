# แชทบอทกฎหมาย LINE OA + เว็บแอดมินกลาง

ระบบตอบคำถามกฎหมายเบื้องต้นสำหรับประชาชนผ่าน LINE Official Account
พร้อมเว็บแอดมินสำหรับจัดการหมวดกฎหมาย คลังความรู้ และตัวกรองข้อมูลอ่อนไหว

## สถาปัตยกรรม

```
LINE OA → Webhook (/api/line/webhook) → Sensitive Filter Check
                                       → RAG Search (Supabase pgvector)
                                       → Claude API (Anthropic)
                                       → ตอบกลับ LINE + บันทึกลง DB

เว็บแอดมิน (/admin) → จัดการ หมวดกฎหมาย / เอกสาร / ตัวกรอง / ดู log
```

**AI ที่ใช้:** เลือกได้ 3 ค่าย — Claude (Anthropic), Gemini (Google), หรือ GPT (OpenAI)
สลับได้จากหน้า `/admin/settings` โดยไม่ต้องแก้โค้ดหรือ deploy ใหม่ **กรอก API key ของแต่ละค่ายได้
ตรงจากหน้าเว็บนี้เลย** (เก็บลง Supabase ตาราง `settings`) หรือจะตั้งไว้ใน Environment Variables
เป็นค่าเริ่มต้น/สำรองก็ได้ — ถ้าตั้งไว้ทั้งสองที่ ค่าที่กรอกจากหน้าเว็บจะถูกใช้ก่อนเสมอ
ค่าเริ่มต้นคือ Claude เพราะ context window ใหญ่
พอใส่มาตรากฎหมายเต็มๆ ได้แม่นยำ และควบคุมขอบเขต/โทนคำตอบผ่าน system prompt ได้ละเอียด
ระบบ prompt (guardrail + disclaimer) ใช้ชุดเดียวกันทุกค่าย เพื่อให้พฤติกรรมบอทคงที่ไม่ว่าจะสลับไปใช้ค่ายไหน

**Embedding ที่ใช้:** Voyage AI (`voyage-3-lite`) — Anthropic ไม่มี embeddings endpoint ของตัวเอง
จึงแนะนำ Voyage เป็นพาร์ทเนอร์อย่างเป็นทางการสำหรับงาน retrieval

## ขั้นตอนติดตั้ง

### 1. ติดตั้ง dependencies
```bash
npm install
```

### 2. ตั้งค่า Supabase
1. สร้างโปรเจกต์ใหม่ที่ https://supabase.com
2. เปิด SQL Editor แล้วรันไฟล์ `supabase/schema.sql` ทั้งหมด (จะเปิดใช้ pgvector,
   สร้างตาราง, สร้างฟังก์ชันค้นหา และ seed หมวดกฎหมาย + ตัวอย่างตัวกรองให้อัตโนมัติ)
3. คัดลอก Project URL และ Service Role Key ไปใส่ใน `.env.local`

### 3. ตั้งค่า AI Provider (เลือกอย่างน้อย 1 ค่าย)
วิธีที่ง่ายที่สุด: deploy ระบบก่อน (ไม่ต้องใส่ API key ของ AI provider ใน Environment Variables
ก็ได้) แล้วเข้าไปกรอก API key ที่หน้า `/admin/settings` ได้เลย — ระบบจะเก็บลงตาราง `settings`
ใน Supabase และเลือกใช้ก่อน Environment Variable เสมอ สลับค่ายหรือเปลี่ยน key เมื่อไหร่ก็ได้
โดยไม่ต้อง deploy ใหม่

ไปขอ API key ของค่ายที่ต้องการใช้ได้ที่:

| ค่าย | ขอ API key ที่ |
|---|---|
| Claude (Anthropic) | https://console.anthropic.com |
| Gemini (Google) | https://aistudio.google.com/apikey |
| GPT (OpenAI) | https://platform.openai.com/api-keys |

(ถ้าอยากตั้งเป็นค่าเริ่มต้น/สำรองผ่าน Environment Variables แทน ก็ยังทำได้ผ่าน `ANTHROPIC_API_KEY`,
`GEMINI_API_KEY`, `OPENAI_API_KEY` ใน `.env.local` — ดูตัวอย่างใน `.env.example`)

ค่าเริ่มต้นของระบบคือ **Claude** — เข้าไปเปลี่ยนได้ที่หน้า `/admin/settings` หลัง deploy แล้ว

### 4. ตั้งค่า Voyage AI (สำหรับ embeddings)
1. สมัครที่ https://www.voyageai.com แล้วสร้าง API key
2. ใส่ใน `VOYAGE_API_KEY`

### 5. ตั้งค่า LINE Official Account
1. สร้าง Provider + Channel ที่ https://developers.line.biz/console/
2. เปิดใช้ Messaging API
3. คัดลอก **Channel Secret** และสร้าง **Channel Access Token** (long-lived)
   ใส่ใน `LINE_CHANNEL_SECRET` และ `LINE_CHANNEL_ACCESS_TOKEN`
4. ตั้งค่า Webhook URL เป็น `https://<โดเมนที่ deploy>/api/line/webhook`
   แล้วเปิด "Use webhook"
5. ปิด "Auto-reply message" ของ LINE ในหน้า Official Account Manager
   (ไม่งั้นจะชนกับข้อความที่บอทตอบ)

### 6. ตั้งรหัสผ่านสำหรับหน้าแอดมิน
หน้า `/admin` และ API ทั้งหมดใต้ `/api/admin/*` ต้องล็อกอินก่อนถึงจะเข้าได้ ตั้งค่า 2 ตัวแปรนี้:
- `ADMIN_PASSWORD` — รหัสผ่านที่จะใช้ล็อกอินที่หน้า `/login`
- `ADMIN_SESSION_SECRET` — ค่าสุ่มยาวๆ สำหรับเซ็น session cookie (สุ่มด้วยคำสั่งเช่น
  `openssl rand -hex 32` แล้วอย่าเปลี่ยนภายหลัง ไม่งั้นทุกคนที่ล็อกอินไว้จะหลุด session ทันที)

### 7. คัดลอกไฟล์ตัวอย่าง env
```bash
cp .env.example .env.local
# แล้วแก้ค่าจริงทั้งหมดใน .env.local
```

### 8. รันทดสอบในเครื่อง
```bash
npm run dev
```
เปิด http://localhost:3000/admin เพื่อจัดการหมวด/เอกสาร/ตัวกรอง

### 9. Deploy ขึ้น Vercel
```bash
npx vercel
```
แล้วนำตัวแปรใน `.env.local` ไปใส่ใน Vercel Project Settings → Environment Variables
จากนั้นนำ URL ที่ได้ไปตั้งเป็น Webhook URL ใน LINE Developers Console (ข้อ 5.4)

## การใช้งานเว็บแอดมิน

เข้าหน้า `/admin` ครั้งแรกจะถูก redirect ไปหน้า `/login` ให้กรอกรหัสผ่าน (ค่าเดียวกับ
`ADMIN_PASSWORD` ที่ตั้งไว้) ก่อนถึงจะใช้งานเมนูต่างๆ ด้านล่างนี้ได้ — login แล้วจะอยู่ได้ 7 วัน
ก่อน session หมดอายุ

| หน้า | ใช้ทำอะไร |
|---|---|
| **ภาพรวม** | ดูสถิติรวม จำนวนบทสนทนา เคสที่รอส่งต่อเจ้าหน้าที่ |
| **หมวดกฎหมาย** | เพิ่ม/ปิดหมวดกฎหมาย กำหนดผู้ดูแลแต่ละหมวด |
| **คลังข้อมูล** | เพิ่ม/แก้ไขเอกสารกฎหมายในแต่ละหมวด ระบบจะฝัง embedding ใหม่อัตโนมัติทุกครั้งที่บันทึก |
| **ข้อมูลอ่อนไหว** | ตั้งกฎคำ/วลีที่บอทจะไม่ตอบเอง (ปฏิเสธ หรือ ส่งต่อเจ้าหน้าที่) พร้อมข้อความมาตรฐาน |
| **บทสนทนา** | ดู log การสนทนา (userId ถูก hash แล้วตาม PDPA) |
| **ตั้งค่าระบบ** | เลือกค่าย AI ที่จะใช้ตอบ (Claude / Gemini / GPT) สลับได้ทันที |

## จุดที่ควรพัฒนาต่อ (v2)

- **Sensitive filter แบบ keyword matching** ในเวอร์ชันนี้เป็นการจับคำแบบง่าย (substring match)
  ควรอัปเกรดเป็น classifier หรือใช้ Claude เองช่วยจัดประเภทความอ่อนไหวเพิ่มเติม เพื่อจับ
  กรณีที่ผู้ใช้ไม่ได้พิมพ์คำ trigger ตรงๆ แต่สื่อความหมายเดียวกัน
- **Rich Menu** บน LINE OA เพื่อให้ผู้ใช้เลือกหมวดกฎหมายเองตั้งแต่ต้น (ลดการเดา category
  จากข้อความ ซึ่งตอนนี้ยังเป็น keyword matching ง่ายๆ ใน `guessCategorySlug()`)
  แนะนำให้ผูก postback event ของ Rich Menu เข้ากับ category slug โดยตรง
- **Authentication สำหรับเว็บแอดมิน** — ตอนนี้ป้องกันด้วยรหัสผ่านเดียว (`ADMIN_PASSWORD`)
  ใช้ได้ดีสำหรับทีมเล็กๆ ที่แชร์รหัสผ่านกัน ถ้าต้องการแยกสิทธิ์ผู้ใช้แต่ละคน (audit log
  ว่าใครแก้ไขอะไร) ควรอัปเกรดเป็น Supabase Auth หรือ NextAuth แบบ multi-user ในอนาคต
- **Escalation queue UI** — ตอนนี้มีตาราง `escalations` ใน DB แล้ว แต่ยังไม่มีหน้าแอดมิน
  สำหรับเจ้าหน้าที่ assign/ปิดเคส แนะนำเพิ่มหน้า `/admin/escalations`
- **อัปเดตกฎหมายเป็นระยะ** — ควรมี process ทบทวนเอกสารในคลังความรู้อย่างน้อยไตรมาสละครั้ง
  เพราะกฎหมายเปลี่ยนแปลงได้

## ความปลอดภัยของข้อมูล (PDPA)
- LINE userId จะถูก hash ด้วย SHA-256 + salt ก่อนบันทึกเสมอ ไม่เก็บ userId จริง
- Service Role Key ของ Supabase ถูกใช้ฝั่ง server เท่านั้น ไม่รั่วไปถึง client
- API key ของ AI provider ที่กรอกในหน้า `/admin/settings` เก็บเป็น plain text ในตาราง `settings`
  (เพื่อความเรียบง่าย) หน้า `/admin` ทั้งหมดถูกป้องกันด้วยรหัสผ่านแล้ว แต่ผู้ที่เข้าถึง Supabase
  โปรเจกต์โดยตรง (เช่นผ่าน Service Role Key) จะเห็นค่าเหล่านี้ได้ ควรจำกัดสิทธิ์เข้าถึง Supabase
  dashboard เฉพาะคนที่จำเป็น
- แนะนำตั้งนโยบายลบ log การสนทนาเก่าเป็นระยะ (เช่น เกิน 6-12 เดือน) ตามความเหมาะสม
