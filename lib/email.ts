import "server-only";
import { Resend } from "resend";

// Resend sender. Until the real domain's DNS is verified, use the sandbox
// address `onboarding@resend.dev` (works without DNS, but in sandbox mode Resend
// only delivers to the address that owns the API key). Once the Hossauges domain
// is added in Resend → Domains, set RESEND_FROM to e.g.
//   "Hossauges <drops@hossauges.com>"
// and add these DNS records at the registrar (values shown in the Resend UI):
//   • TXT  send._domainkey   → (DKIM public key from Resend)
//   • TXT  resend._domainkey → (DKIM public key from Resend)
//   • MX   send             → feedback-smtp.<region>.amazonses.com (priority 10)
//   • TXT  send             → "v=spf1 include:amazonses.com ~all"
//   • TXT  @                → "v=DMARC1; p=none;" (optional but recommended)
const FROM = process.env.RESEND_FROM ?? "Hossauges <onboarding@resend.dev>";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "hossaugessc@outlook.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export type ReserveEmailInput = {
  flavorName: string;
  meatTypeLabel: string;
  weekLabel: string;
  customerName: string;
  contact: string;
  quantity: number;
};

/**
 * Email the owners about a new reserve. Returns { sent }. Never throws — a mail
 * failure must not fail the reservation (the row is already saved).
 */
export async function sendReserveEmail(
  input: ReserveEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const client = resend();
  if (!client) return { sent: false, error: "RESEND_API_KEY not set" };

  const contactIsEmail = EMAIL_RE.test(input.contact);
  const subject = `New reserve — ${input.flavorName} ×${input.quantity}`;

  const html = `
  <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;background:#F7F3EA;color:#20242B;padding:24px">
    <div style="max-width:520px;margin:0 auto;border:2px solid #2C4A66;background:#FFFDF7">
      <div style="background:#2C4A66;color:#F7F3EA;padding:14px 20px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase">
        ★ Hossauges — New Reserve
      </div>
      <div style="padding:20px">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#E2552C">
          ${escapeHtml(input.weekLabel)} · ${escapeHtml(input.meatTypeLabel)}
        </p>
        <h1 style="margin:0 0 16px;font-size:24px;color:#2C4A66;text-transform:uppercase">
          ${escapeHtml(input.flavorName)} &times;${input.quantity}
        </h1>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6B7280;width:110px">Name</td><td style="padding:6px 0">${escapeHtml(input.customerName)}</td></tr>
          <tr><td style="padding:6px 0;color:#6B7280">Contact</td><td style="padding:6px 0">${escapeHtml(input.contact)}</td></tr>
          <tr><td style="padding:6px 0;color:#6B7280">Quantity</td><td style="padding:6px 0">${input.quantity} × 3-pack</td></tr>
        </table>
      </div>
      <div style="border-top:1px solid #2C4A6633;padding:12px 20px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#6B7280">
        Est. 2024 — Columbia, SC
      </div>
    </div>
  </div>`;

  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: OWNER_EMAIL,
      subject,
      html,
      // Reply straight to the customer when they gave an email.
      ...(contactIsEmail ? { replyTo: input.contact } : {}),
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
