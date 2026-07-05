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
สลับได้จากหน้า `/admin/settings` โดยไม่ต้องแก้โค้ดหรือ deploy ใหม่ (แค่ใส่ API key ของค่ายนั้น
ไว้ใน Environment Variables ล่วงหน้า) ค่าเริ่มต้นคือ Claude เพราะ context window ใหญ่
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
เลือกใส่ API key ของค่ายที่ต้องการใช้ (ใส่มากกว่า 1 ค่ายไว้ก็ได้ แล้วค่อยสลับใช้งานจริงทีหลังในหน้า
`/admin/settings` — ระบบจะอ่านค่าที่เลือกไว้จากตาราง `settings` ทุกครั้งที่มีข้อความเข้ามา)

| ค่าย | ขอ API key ที่ | ตัวแปรที่ต้องตั้ง |
|---|---|---|
| Claude (Anthropic) | https://console.anthropic.com | `ANTHROPIC_API_KEY` |
| Gemini (Google) | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| GPT (OpenAI) | https://platform.openai.com/api-keys | `OPENAI_API_KEY` |

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

### 6. คัดลอกไฟล์ตัวอย่าง env
```bash
cp .env.example .env.local
# แล้วแก้ค่าจริงทั้งหมดใน .env.local
```

### 7. รันทดสอบในเครื่อง
```bash
npm run dev
```
เปิด http://localhost:3000/admin เพื่อจัดการหมวด/เอกสาร/ตัวกรอง

### 8. Deploy ขึ้น Vercel
```bash
npx vercel
```
แล้วนำตัวแปรใน `.env.local` ไปใส่ใน Vercel Project Settings → Environment Variables
จากนั้นนำ URL ที่ได้ไปตั้งเป็น Webhook URL ใน LINE Developers Console (ข้อ 5.4)

## การใช้งานเว็บแอดมิน

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
- **Authentication สำหรับเว็บแอดมิน** — ตอนนี้ยังไม่มีระบบ login ป้องกันหน้า `/admin`
  ก่อน deploy ใช้งานจริง ต้องเพิ่ม auth (เช่น Supabase Auth หรือ NextAuth) ก่อนเปิดสาธารณะ
- **Escalation queue UI** — ตอนนี้มีตาราง `escalations` ใน DB แล้ว แต่ยังไม่มีหน้าแอดมิน
  สำหรับเจ้าหน้าที่ assign/ปิดเคส แนะนำเพิ่มหน้า `/admin/escalations`
- **อัปเดตกฎหมายเป็นระยะ** — ควรมี process ทบทวนเอกสารในคลังความรู้อย่างน้อยไตรมาสละครั้ง
  เพราะกฎหมายเปลี่ยนแปลงได้

## ความปลอดภัยของข้อมูล (PDPA)
- LINE userId จะถูก hash ด้วย SHA-256 + salt ก่อนบันทึกเสมอ ไม่เก็บ userId จริง
- Service Role Key ของ Supabase ถูกใช้ฝั่ง server เท่านั้น ไม่รั่วไปถึง client
- แนะนำตั้งนโยบายลบ log การสนทนาเก่าเป็นระยะ (เช่น เกิน 6-12 เดือน) ตามความเหมาะสม
