/**
 * Live owner-email test (Session 6). Sends ONE reserve-style email through
 * Resend to OWNER_EMAIL — outward-facing, so run it deliberately:
 *   npx tsx scripts/test-email.ts
 *
 * Sandbox caveat: with the default sender (onboarding@resend.dev), Resend only
 * delivers to the email that owns the Resend API key. If OWNER_EMAIL is a
 * different inbox, either (a) set OWNER_EMAIL to the key-owner address for this
 * test, or (b) verify the real domain in Resend → Domains and set RESEND_FROM.
 */
import { config } from "dotenv";
import { Resend } from "resend";

config({ path: ".env.local" });

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error("RESEND_API_KEY not set in .env.local");
  process.exit(1);
}
const FROM = process.env.RESEND_FROM ?? "Hossauges <onboarding@resend.dev>";
const TO = process.env.OWNER_EMAIL ?? "hossaugessc@outlook.com";
const resend = new Resend(key);

const html = `
<div style="font-family:ui-monospace,Menlo,monospace;background:#F7F3EA;color:#20242B;padding:24px">
  <div style="max-width:520px;margin:0 auto;border:2px solid #2C4A66;background:#FFFDF7">
    <div style="background:#2C4A66;color:#F7F3EA;padding:14px 20px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase">★ Hossauges — New Reserve (TEST)</div>
    <div style="padding:20px">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#E2552C">WEEK OF JUNE 9 · 100% PORK</p>
      <h1 style="margin:0 0 16px;font-size:24px;color:#2C4A66;text-transform:uppercase">Blueberry Gouda &times;2</h1>
      <p style="font-size:14px">Name: Test Customer<br/>Contact: tester@example.com<br/>Quantity: 2 × 3-pack</p>
    </div>
    <div style="border-top:1px solid #2C4A6633;padding:12px 20px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#6B7280">Est. 2024 — Columbia, SC</div>
  </div>
</div>`;

(async () => {
  console.log(`Sending test reserve email  from: ${FROM}  to: ${TO}`);
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: "New reserve — Blueberry Gouda ×2 (TEST)",
    html,
    replyTo: "tester@example.com",
  });
  if (error) {
    console.error("✗ Resend error:", error.message);
    process.exit(1);
  }
  console.log("✓ Resend accepted the message. id:", data?.id);
  console.log(`  Now check the ${TO} inbox (and spam).`);
})();
