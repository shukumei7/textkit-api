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

async function sendWelcomeEmail(to, name) {
  if (!config.resend.apiKey) {
    return;
  }

  try {
    const r = getResend();
    const greeting = name ? `Hi ${name},` : 'Hi there,';

    const { error } = await r.emails.send({
      from: config.resend.fromEmail,
      to,
      subject: 'Welcome to TextKit API — your free account is ready',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#e0e0e0;background:#1a1a2e;padding:16px;border-radius:8px 8px 0 0;margin:0;text-align:center">
            Text<span style="color:#6c63ff">Kit</span> API
          </h2>
          <div style="background:#16213e;padding:24px;border-radius:0 0 8px 8px;color:#c0c0c0">
            <p>${greeting}</p>
            <p>Your free TextKit account is ready. You get 10 requests/day across all 9 AI-powered text tools — no credit card needed.</p>

            <div style="margin:32px 0">
              <div style="margin:24px 0">
                <a href="https://www.textkitapi.com/studio.html" style="background:#6c63ff;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
                  Open Studio
                </a>
                <p style="font-size:0.85rem;color:#888;margin-top:8px">Paste text, pick a tool, get results — no code needed</p>
              </div>

              <div style="margin:24px 0">
                <a href="https://www.textkitapi.com/#extension" style="background:transparent;color:#6c63ff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;border:2px solid #6c63ff">
                  Get Chrome Extension
                </a>
                <p style="font-size:0.85rem;color:#888;margin-top:8px">Right-click any text to rewrite, summarize, or analyze</p>
              </div>

              <div style="margin:24px 0">
                <a href="https://www.textkitapi.com/docs" style="color:#6c63ff;text-decoration:underline">
                  API Documentation
                </a>
                <p style="font-size:0.85rem;color:#888;margin-top:8px">REST endpoints for developers</p>
              </div>
            </div>

            <p style="margin-top:24px">Need more? <a href="https://www.textkitapi.com/dashboard.html#billing" style="color:#6c63ff">Plans start at $9/mo for 100 requests/day.</a></p>

            <hr style="border:none;border-top:1px solid #2a2a4a;margin:16px 0">
            <p style="font-size:0.8rem;color:#666;text-align:center">TextKit API &mdash; textkitapi.com</p>
          </div>
        </div>
      `,
      text: `${greeting}\n\nYour free TextKit account is ready. You get 10 requests/day across all 9 AI-powered text tools — no credit card needed.\n\nOpen Studio: https://www.textkitapi.com/studio.html\nPaste text, pick a tool, get results — no code needed\n\nGet Chrome Extension: https://www.textkitapi.com/#extension\nRight-click any text to rewrite, summarize, or analyze\n\nAPI Documentation: https://www.textkitapi.com/docs\nREST endpoints for developers\n\nNeed more? Plans start at $9/mo for 100 requests/day.\nhttps://www.textkitapi.com/dashboard.html#billing\n\nTextKit API — textkitapi.com`,
    });

    if (error) {
      console.error('Welcome email error:', error);
    }
  } catch (err) {
    console.error('Welcome email error:', err);
  }
}

async function sendAdminNewUserAlert(user) {
  if (!config.resend.apiKey || !config.adminEmails || config.adminEmails.length === 0) {
    return;
  }

  try {
    const r = getResend();
    const userName = user.name || 'not provided';

    for (const adminEmail of config.adminEmails) {
      const { error } = await r.emails.send({
        from: config.resend.fromEmail,
        to: adminEmail,
        subject: `New TextKit signup: ${user.email}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#e0e0e0;background:#1a1a2e;padding:16px;border-radius:8px 8px 0 0;margin:0;text-align:center">
              Text<span style="color:#6c63ff">Kit</span> API
            </h2>
            <div style="background:#16213e;padding:24px;border-radius:0 0 8px 8px;color:#c0c0c0">
              <h3 style="color:#e0e0e0;margin-top:0">New user registered</h3>
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px;color:#888;border-bottom:1px solid #2a2a4a">Email</td>
                  <td style="padding:8px;color:#e0e0e0;border-bottom:1px solid #2a2a4a">${user.email}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#888;border-bottom:1px solid #2a2a4a">Name</td>
                  <td style="padding:8px;color:#e0e0e0;border-bottom:1px solid #2a2a4a">${userName}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#888;border-bottom:1px solid #2a2a4a">User ID</td>
                  <td style="padding:8px;color:#e0e0e0;border-bottom:1px solid #2a2a4a">${user.id}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#888">Time</td>
                  <td style="padding:8px;color:#e0e0e0">just now</td>
                </tr>
              </table>
              <div style="text-align:center;margin:24px 0">
                <a href="https://www.textkitapi.com/admin.html" style="background:#6c63ff;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
                  View Admin Dashboard
                </a>
              </div>
              <hr style="border:none;border-top:1px solid #2a2a4a;margin:16px 0">
              <p style="font-size:0.8rem;color:#666;text-align:center">TextKit API &mdash; textkitapi.com</p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error(`Admin alert email error for ${adminEmail}:`, error);
      }
    }
  } catch (err) {
    console.error('Admin alert email error:', err);
  }
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail, sendAdminNewUserAlert };
