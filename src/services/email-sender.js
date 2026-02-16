const { Resend } = require('resend');
const config = require('../config');

let resend;
function getResend() {
  if (!resend) {
    resend = new Resend(config.resend.apiKey);
  }
  return resend;
}

async function sendPasswordResetEmail(to, resetUrl) {
  const r = getResend();
  const { error } = await r.emails.send({
    from: config.resend.fromEmail,
    to,
    subject: 'Reset your TextKit API password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#e0e0e0;background:#1a1a2e;padding:16px;border-radius:8px 8px 0 0;margin:0;text-align:center">
          Text<span style="color:#6c63ff">Kit</span> API
        </h2>
        <div style="background:#16213e;padding:24px;border-radius:0 0 8px 8px;color:#c0c0c0">
          <p>You requested a password reset. Click the button below to choose a new password:</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${resetUrl}" style="background:#6c63ff;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
              Reset Password
            </a>
          </div>
          <p style="font-size:0.85rem;color:#888">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
          <hr style="border:none;border-top:1px solid #2a2a4a;margin:16px 0">
          <p style="font-size:0.8rem;color:#666;text-align:center">TextKit API &mdash; textkitapi.com</p>
        </div>
      </div>
    `,
    text: `Reset your TextKit API password\n\nClick this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });

  if (error) {
    console.error('Resend email error:', error);
    throw new Error('Failed to send reset email');
  }
}

module.exports = { sendPasswordResetEmail };
