/**
 * THE LAW With Gracious · email service (single authoritative implementation)
 *
 * This module is the ONLY place THE LAW With Gracious sends email. It is fully
 * independent of any legacy (Mantra/Mentra) email code, templates,
 * providers or configuration. All THE LAW With Gracious verification and password
 * emails are built here and delivered through Resend using environment
 * variables; the API key is read server-side only and never leaves the
 * server or reaches the client.
 */

const BRAND_NAME = "THE LAW With Gracious";

type Purpose = "signup" | "password_reset" | "bank_account" | "verify_account" | "delete_course";

const SUBJECTS: Record<Purpose, string> = {
  signup: "Verify your account on THE LAW With Gracious",
  password_reset: "Reset your password on THE LAW With Gracious",
  bank_account: "Secure your account on THE LAW With Gracious",
  verify_account: "Verify your account on THE LAW With Gracious",
  delete_course: "Confirm course deletion on THE LAW With Gracious – action required",
};

/**
 * Resolve the Resend "from" value.
 *
 * The sender is ALWAYS branded as THE LAW With Gracious: the address is taken from
 * EMAIL_FROM (the verified sending address for THE LAW With Gracious), and any display
 * name supplied by the environment is replaced with "THE LAW With Gracious". This
 * guarantees that a stale environment value (e.g. an old project's
 * "Lobby Markets <…>" sender) can never appear as the sender name.
 */
function resolveFrom(): string | null {
  const raw = process.env.EMAIL_FROM?.trim();
  if (!raw) return null;
  const match = raw.match(/<([^<>]+)>/);
  const address = (match ? match[1] : raw).trim();
  if (!address || !address.includes("@")) return null;
  return `${BRAND_NAME} <${address}>`;
}

interface EmailContent {
  icon: string;
  title: string;
  subtitle: string;
  body: string;
  extraContext: string;
  codeLabel: string;
  urgency: string;
}

const CONTENT: Record<Purpose, EmailContent> = {
  signup: {
    icon: "⚖️",
    title: "Welcome to THE LAW With Gracious",
    subtitle: "Finish setting up your account",
    body: "Thanks for joining THE LAW With Gracious — a calm, beautiful e-library for law. To protect your account and make sure we have the right email address, we need to verify it before activating your profile.",
    extraContext: "Once verified, you'll be able to explore legal courses, read books and PDFs in the built-in reader, watch lectures, discover articles, and study at your own pace.",
    codeLabel: "Your one-time verification code",
    urgency: "This code is valid for <strong>10 minutes</strong> and can only be used once. If you did not create an account on THE LAW With Gracious, you can safely ignore this email — no account will be created.",
  },
  password_reset: {
    icon: "🔑",
    title: "Password reset request",
    subtitle: "We received a request to reset your password",
    body: "We received a request to reset the password associated with your account on THE LAW With Gracious. If this was you, use the verification code below to proceed. If you did not make this request, your account is still secure — simply disregard this message.",
    extraContext: "For your security, this code can only be used once and will expire shortly. We recommend choosing a strong, unique password that you don't use on other platforms.",
    codeLabel: "Your password reset code",
    urgency: "This code expires in <strong>10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.",
  },
  bank_account: {
    icon: "🔐",
    title: "Secure your account",
    subtitle: "Confirm this change on your profile",
    body: "A security-sensitive action was requested on your account on THE LAW With Gracious. To complete it securely, enter the verification code below.",
    extraContext: "We take account security seriously. This verification step ensures that only you can make changes to your profile and account settings.",
    codeLabel: "Your verification code",
    urgency: "This code expires in <strong>10 minutes</strong>. If you did not initiate this request, please contact our support team immediately.",
  },
  verify_account: {
    icon: "✉️",
    title: "Verify your email address",
    subtitle: "Complete your account setup on THE LAW With Gracious",
    body: "Before you can sign in to THE LAW With Gracious, we need to confirm that this email address belongs to you. This is a standard security step that helps us keep your account safe and ensures you can recover access if needed.",
    extraContext: "Verifying your email also allows us to send you important account notifications and updates about the library.",
    codeLabel: "Your email verification code",
    urgency: "This code expires in <strong>10 minutes</strong>. If you did not create an account on THE LAW With Gracious using this email address, you can safely ignore this email.",
  },
  delete_course: {
    icon: "⚠️",
    title: "Confirm course deletion",
    subtitle: "This action is permanent and cannot be undone",
    body: "You've requested to permanently delete a course from THE LAW With Gracious. Deleting a course will remove all associated materials, uploaded files, reading progress, and quiz data. This action cannot be reversed once confirmed.",
    extraContext: "If you're unsure, consider hiding the course from the library instead of deleting it — this keeps your materials saved while removing them from public view. You can change this in the course settings.",
    codeLabel: "Your deletion confirmation code",
    urgency: "This code expires in <strong>10 minutes</strong>. If you did not request this deletion, please secure your account immediately by changing your password.",
  },
};

function buildPlainText(code: string, purpose: Purpose, recipientEmail: string): string {
  const c = CONTENT[purpose];
  const year = new Date().getFullYear();
  return `${c.title}
${c.subtitle}
${"=".repeat(60)}

${c.body}

${c.extraContext}

${c.codeLabel.toUpperCase()}
${code}

${c.urgency.replace(/<[^>]+>/g, "")}

Never share this code with anyone. THE LAW With Gracious staff will never ask for your verification code.

${"=".repeat(60)}
This email was sent to ${recipientEmail} because an action was performed on an account on THE LAW With Gracious associated with this address.

THE LAW With Gracious – Legal E-Library & Study Platform
If you have questions, reply to this email or visit https://lawbygrace.app

© ${year} THE LAW With Gracious. All rights reserved.
You received this transactional email as part of your use of THE LAW With Gracious.`;
}

function buildEmail(code: string, purpose: Purpose, recipientEmail: string): string {
  const c = CONTENT[purpose];
  const year = new Date().getFullYear();
  const digits = code.split("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no" />
  <title>${c.title} – THE LAW With Gracious</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#eef3fb;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Your ${c.codeLabel.toLowerCase()} is ${code}. Valid for 10 minutes. Do not share this code with anyone.
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#eef3fb;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 16px 24px;">

        <!-- Wrapper -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="580" style="max-width:580px;width:100%;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#2563eb 100%);border-radius:14px;padding:12px 22px;">
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">THE LAW With Gracious</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(15,23,42,0.08);">

              <!-- Top accent bar -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background:linear-gradient(90deg,#1d4ed8 0%,#0ea5e9 100%);height:5px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Card body -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:44px 48px 40px;">

                    <!-- Icon + title -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom:24px;">
                          <p style="margin:0 0 12px;font-size:36px;line-height:1;">${c.icon}</p>
                          <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;line-height:1.25;">${c.title}</h1>
                          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#64748b;font-weight:500;line-height:1.4;">${c.subtitle}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="border-top:1px solid #eef2f8;padding-bottom:28px;font-size:0;line-height:0;"></td>
                      </tr>
                    </table>

                    <!-- Body text -->
                    <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#334155;line-height:1.75;">${c.body}</p>

                    <!-- Extra context -->
                    <p style="margin:0 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#64748b;line-height:1.75;">${c.extraContext}</p>

                    <!-- Code label -->
                    <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${c.codeLabel}</p>

                    <!-- OTP code box -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="background-color:#f4f7fd;border:1.5px solid #dbe6f8;border-radius:16px;padding:28px 20px;text-align:center;">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                            <tr>
                              ${digits.map((d, i) => `
                              <td style="padding:${i < digits.length - 1 ? "0 6px 0 0" : "0"};">
                                <div style="width:46px;height:58px;background-color:#ffffff;border:2px solid #c9d9f5;border-radius:12px;display:inline-block;text-align:center;line-height:58px;">
                                  <span style="font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;color:#1d4ed8;">${d}</span>
                                </div>
                              </td>`).join("")}
                            </tr>
                          </table>
                          <p style="margin:18px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;color:#94a3b8;">or copy the code: <strong style="color:#1d4ed8;font-family:'Courier New',Courier,monospace;letter-spacing:4px;font-size:15px;">${code}</strong></p>
                        </td>
                      </tr>
                    </table>

                    <!-- Urgency notice -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
                      <tr>
                        <td style="background-color:#eff6ff;border-left:4px solid #2563eb;border-radius:0 10px 10px 0;padding:14px 18px;">
                          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e40af;line-height:1.6;">${c.urgency}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Security note -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
                      <tr>
                        <td style="background-color:#f8fafc;border-radius:12px;padding:16px 20px;">
                          <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;color:#334155;">🔒 Keep this code private</p>
                          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;color:#64748b;line-height:1.6;">Never share this code with anyone — including people claiming to be from THE LAW With Gracious. Our team will <strong>never</strong> ask for your verification code via email, chat, or phone.</p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 8px 12px;">
              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#64748b;text-align:center;line-height:1.7;">
                This email was sent to <strong style="color:#334155;">${recipientEmail}</strong> because an action was requested on an account on THE LAW With Gracious associated with this address.
              </p>
              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#64748b;text-align:center;line-height:1.7;">
                If you did not perform this action, you can safely ignore this email. This is a transactional message — you cannot unsubscribe from security-related notifications.
              </p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
                © ${year} THE LAW With Gracious. All rights reserved. &nbsp;·&nbsp; Legal E-Library &amp; Study Platform<br />
                <span style="font-size:10px;color:#b6c2d4;">THE LAW With Gracious · lawbygrace.app</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type EmailDelivery = "email" | "dev";

/** True when Resend is configured for real email delivery. */
export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && resolveFrom());
}

/**
 * Email abstraction — the rest of auth does not care which provider is used.
 *
 * Development provider: when no Resend key is configured the verification
 * code is only written to the server log (and may be echoed back by routes
 * when NODE_ENV is development). No email is claimed to have been sent.
 *
 * Production provider: real delivery through Resend (environment variables).
 * Codes are never returned to the client in production.
 */
export async function sendVerificationCode(
  email: string,
  code: string,
  purpose: Purpose
): Promise<EmailDelivery> {
  if (!isEmailConfigured()) {
    console.log(
      `\n[THE LAW With Gracious · DEV EMAIL — no provider configured]` +
        `\n  To: ${email}` +
        `\n  Subject: ${SUBJECTS[purpose]}` +
        `\n  Verification code: ${code}` +
        `\n  Valid for 10 minutes. This code is only shown in development.\n`
    );
    return "dev";
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = resolveFrom();
  if (!from) {
    throw new Error("Email delivery is not configured (missing EMAIL_FROM)");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: SUBJECTS[purpose],
      html: buildEmail(code, purpose, email),
      text: buildPlainText(code, purpose, email),
    }),
  });

  if (!res.ok) {
    // Safe diagnostics only — never log the API key or verification code.
    const detail = (await res.text()).slice(0, 400);
    console.error(
      `[email] Resend delivery failed (${res.status}) from=${from} to=${email}:`,
      detail
    );
    throw new Error("Email delivery failed");
  }
  return "email";
}
