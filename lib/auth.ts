// ระบบล็อกอินแบบง่าย สำหรับป้องกันหน้า /admin และ /api/admin/*
// ใช้ Web Crypto API (ไม่ใช่ Node's `crypto` module) เพื่อให้ทำงานได้ทั้งใน
// Middleware (Edge runtime) และ API routes (Node runtime)

const encoder = new TextEncoder();
const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 วัน

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let str = "";
  arr.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padLength);
  const str = atob(padded);
  const buffer = new ArrayBuffer(str.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return buffer;
}

export const ADMIN_SESSION_COOKIE = SESSION_COOKIE_NAME;

/** สร้าง session token ที่เซ็นด้วย ADMIN_SESSION_SECRET (หมดอายุใน 7 วัน) */
export async function createSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET environment variable");
  }

  const exp = Date.now() + SESSION_DURATION_MS;
  const payload = `${exp}`;
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

/** ตรวจสอบว่า session token ถูกต้องและยังไม่หมดอายุ */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  try {
    const key = await getSigningKey(secret);
    return crypto.subtle.verify("HMAC", key, fromBase64Url(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

/** เทียบรหัสผ่านกับ ADMIN_PASSWORD แบบ constant-time (กัน timing attack เบื้องต้น) */
export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  if (password.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
