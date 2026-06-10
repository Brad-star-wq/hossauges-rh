// Admin session token — HMAC-signed, edge+node safe (Web Crypto only, no
// node:crypto). Used by server actions (set/clear cookie) and middleware (verify).
// The cookie just carries an expiry; its integrity is the HMAC signature.

export const SESSION_COOKIE = "hoss_admin";
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60; // 7 days

const enc = new TextEncoder();

function bytesToB64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToString(b64: string): string {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  return atob(s);
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bytesToB64url(sig);
}

/** Constant-time string compare (avoids signature timing leaks). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Create a signed session token valid for SESSION_MAX_AGE_S. */
export async function signSession(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const payload = bytesToB64url(
    enc.encode(JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE_S * 1000 })),
  );
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

/** True only for an untampered, unexpired token. */
export async function verifySession(token?: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(sig, expected)) return false;
  try {
    const { exp } = JSON.parse(b64urlToString(payload)) as { exp?: number };
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}
