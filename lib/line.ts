import crypto from "crypto";

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export function verifyLineSignature(rawBody: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    throw new Error("Missing LINE_CHANNEL_SECRET environment variable");
  }
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

export async function replyToLine(replyToken: string, text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN environment variable");
  }

  // LINE message text limit is 5000 chars — trim just in case
  const safeText = text.length > 4900 ? text.slice(0, 4900) + "\n…(ตัดข้อความ)" : text;

  const res = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: safeText }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LINE reply error: ${res.status} ${errText}`);
  }
}

// hash LINE userId ก่อนบันทึกลง DB เพื่อไม่เก็บ userId จริงตาม PDPA
export function hashLineUserId(userId: string): string {
  const salt = process.env.USER_ID_HASH_SALT || "change-this-salt";
  return crypto.createHash("sha256").update(salt + userId).digest("hex");
}
