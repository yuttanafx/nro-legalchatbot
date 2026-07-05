-- ============================================================
-- Legal Chatbot — Supabase schema
-- Run this in the Supabase SQL editor once per project.
-- ============================================================

create extension if not exists vector;

-- ---------- 1. หมวดกฎหมาย ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,              -- e.g. 'labor', 'consumer', 'family', 'land', 'criminal', 'general'
  name_th text not null,                  -- ชื่อหมวดที่แสดงผล
  description text,
  owner_name text,                        -- ผู้ดูแลหมวดนี้ (เช่น ทนายอาสาคนที่รับผิดชอบ)
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- 2. เอกสารความรู้ (Knowledge Base) ----------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  title text not null,                    -- เช่น "มาตรา 420 ประมวลกฎหมายแพ่งฯ"
  source_ref text,                        -- อ้างอิงแหล่งที่มา เช่น "ป.พ.พ. มาตรา 420"
  content text not null,                  -- เนื้อหาเต็มสำหรับให้ AI อ้างอิง
  embedding vector(512),                  -- voyage-3-lite ให้ embedding ขนาด 512 มิติ (ดู lib/embeddings.ts)
  version int not null default 1,
  is_published boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists documents_category_idx on documents(category_id);

-- ---------- 3. ตัวกรองข้อมูลอ่อนไหว ----------
create table if not exists sensitive_filters (
  id uuid primary key default gen_random_uuid(),
  label text not null,                    -- ชื่อกฎ เช่น "ความรุนแรงในครอบครัว"
  match_keywords text[] not null,         -- คำ/วลีที่ trigger กฎนี้
  action text not null default 'escalate' -- 'escalate' | 'refuse'
    check (action in ('escalate', 'refuse')),
  response_template text not null,        -- ข้อความมาตรฐานที่บอทจะตอบแทน
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- 4. บทสนทนา (เก็บแบบลดข้อมูลส่วนบุคคล) ----------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  line_user_hash text not null,           -- hash ของ LINE userId ไม่เก็บ userId ตรงๆ (PDPA)
  category_slug text,
  user_message text not null,
  bot_response text,
  filter_triggered text,                  -- ชื่อ sensitive_filter ที่ทำงาน (ถ้ามี)
  was_escalated boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists conversations_created_idx on conversations(created_at desc);

-- ---------- 5. คิวส่งต่อเจ้าหน้าที่/ทนายอาสา ----------
create table if not exists escalations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete set null,
  line_user_hash text not null,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'closed')),
  assigned_to text,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- ฟังก์ชันค้นหาเอกสารด้วย vector similarity ----------
create or replace function match_documents (
  query_embedding vector(512),
  match_category_slug text,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  source_ref text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    d.id,
    d.title,
    d.source_ref,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  join categories c on c.id = d.category_id
  where d.is_published = true
    and c.is_active = true
    and (match_category_slug is null or c.slug = match_category_slug)
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------- ตั้งค่าระบบ (key-value) ----------
create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('ai_provider', 'anthropic'),  -- ค่าที่เป็นไปได้: 'anthropic' | 'gemini' | 'openai'
  ('bot_tone', 'professional_friendly')  -- ค่าที่เป็นไปได้: 'formal' | 'professional_friendly' | 'warm_casual'
on conflict (key) do nothing;

-- ---------- Seed หมวดกฎหมายเริ่มต้น ----------
insert into categories (slug, name_th, description) values
  ('general',  'กฎหมายทั่วไปสำหรับประชาชน', 'ความรู้กฎหมายพื้นฐานที่ใช้ในชีวิตประจำวัน'),
  ('criminal', 'กฎหมายอาญาเบื้องต้น', 'ความผิดอาญาทั่วไป โทษ และกระบวนการเบื้องต้น'),
  ('labor',    'กฎหมายแรงงาน', 'สิทธิลูกจ้าง การเลิกจ้าง ค่าชดเชย'),
  ('consumer', 'กฎหมายผู้บริโภค/สัญญา', 'สิทธิผู้บริโภค การทำสัญญา การผิดสัญญา'),
  ('family',   'กฎหมายครอบครัว/มรดก', 'การหย่า สิทธิบุตร มรดก พินัยกรรม'),
  ('land',     'กฎหมายที่ดิน/อสังหาริมทรัพย์', 'การซื้อขาย เช่า โฉนด ข้อพิพาทที่ดิน')
on conflict (slug) do nothing;

-- ---------- Seed ตัวอย่าง sensitive filter ----------
insert into sensitive_filters (label, match_keywords, action, response_template) values
  (
    'ความรุนแรงในครอบครัว/ล่วงละเมิด',
    array['ทำร้ายร่างกาย','ล่วงละเมิดทางเพศ','ข่มขืน','ทำร้ายเด็ก','กระทำชำเรา'],
    'escalate',
    'เรื่องนี้มีความละเอียดอ่อนและอาจต้องการความช่วยเหลือเร่งด่วน ทีมงานของเราจะติดต่อกลับโดยเร็วที่สุด หากอยู่ในเหตุฉุกเฉิน กรุณาโทร 191 (ตำรวจ) หรือ 1300 (ศูนย์ช่วยเหลือสังคม) ทันที'
  ),
  (
    'ข้อมูลส่วนบุคคลของบุคคลที่สาม',
    array['เลขบัตรประชาชน','เลขบัญชีธนาคาร','ที่อยู่บ้านเลขที่'],
    'refuse',
    'ขออภัยค่ะ/ครับ เพื่อความปลอดภัยของข้อมูลส่วนบุคคล เราไม่สามารถประมวลผลข้อมูลระบุตัวตนที่ละเอียดอ่อนนี้ได้ กรุณาสอบถามโดยไม่ระบุข้อมูลดังกล่าว หรือปรึกษาเจ้าหน้าที่โดยตรง'
  )
on conflict do nothing;
