import nodemailer from "nodemailer";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Reuse the transporter across requests in development (avoid creating a new
// connection on every call). In production, nodemailer handles pooling.
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,   // your Gmail address
      pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not your login password)
    },
  });

  return transporter;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;
  const fromName = "Educom";
  const from = `${fromName} <${process.env.GMAIL_USER}>`;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: "Reset your Educom password",
    // Plain-text fallback for email clients that don't render HTML
    text: `Hi ${toName ?? "there"},\n\nYou requested a password reset for your Educom account.\n\nClick the link below to set a new password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n— The Educom Team`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#ea4c89;border-radius:12px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:20px;font-weight:bold;line-height:40px;">E</span>
                  </td>
                  <td style="padding-left:10px;font-size:20px;font-weight:700;color:#0d0d0d;letter-spacing:-0.5px;vertical-align:middle;">
                    Educom
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border:1px solid #e8e8e8;border-radius:16px;padding:40px 36px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0d0d0d;">Reset your password</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b6b76;line-height:1.6;">
                Hi ${toName ?? "there"},<br/><br/>
                We received a request to reset the password for your Educom account.
                Click the button below to choose a new password.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#ea4c89;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:13px;color:#9e9ea7;line-height:1.6;">
                This link will expire in <strong style="color:#6b6b76;">1 hour</strong>.
                If you didn't request a password reset, you can safely ignore this email —
                your password will not change.
              </p>

              <hr style="border:none;border-top:1px solid #f0f0f0;margin:20px 0;" />

              <p style="margin:0;font-size:12px;color:#c4c4c8;line-height:1.6;">
                Or copy and paste this URL into your browser:<br/>
                <span style="color:#6b6b76;word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#9e9ea7;">
                &copy; ${new Date().getFullYear()} Educom &mdash; All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
