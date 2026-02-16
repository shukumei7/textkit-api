# Registration Email Automation

## Overview

Send automated emails on user registration:
1. **Admin alert** — notify team of new signups in real-time
2. **Welcome email** — guide new users to try the product

**Priority:** Enable immediate awareness of marketing effectiveness and increase new user activation.

## Trigger

Successful user registration via `POST /auth/register` after user creation and JWT token signing.

## Implementation

### 1. Admin Alert Email

**Recipients:** `config.adminEmails` (from `ADMIN_EMAILS` env var)

**Subject:** `New TextKit signup: {email}`

**Content:**
- User email
- User name (or "Not provided")
- User ID
- Registration timestamp

**Style:** Plain text or minimal HTML (not critical)

**Example:**
```
New user registered on TextKit API:

Email: user@example.com
Name: John Doe
User ID: 42
Registered: 2026-02-16 14:32:00 UTC

View user: https://www.textkitapi.com/admin.html
```

### 2. Welcome Email to New User

**Recipient:** Newly registered user's email

**Subject:** `Welcome to TextKit API — your free account is ready`

**Content:**
- Greeting with name if provided, else "there"
- Free tier benefits: 10 requests/day, access to all 9 endpoints, no credit card
- Three interfaces with direct links:
  - **Studio** (no-code web UI): https://www.textkitapi.com/studio.html
  - **Chrome Extension** (right-click tools): https://www.textkitapi.com
  - **API Docs** (for developers): https://www.textkitapi.com/docs
- Quick start suggestion: "Try Studio now — paste any text and pick a tool"
- Upgrade CTA: Plans from $9/month for 100 requests/day

**Style:** Dark theme matching password reset email
- Header: `#1a1a2e` background, `#e0e0e0` text, `#6c63ff` accent
- Body: `#16213e` background, `#c0c0c0` text
- Button: `#6c63ff` background, white text
- Footer: `#666` small text

**Example HTML template:**
```html
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#e0e0e0;background:#1a1a2e;padding:16px;border-radius:8px 8px 0 0;margin:0;text-align:center">
    Text<span style="color:#6c63ff">Kit</span> API
  </h2>
  <div style="background:#16213e;padding:24px;border-radius:0 0 8px 8px;color:#c0c0c0">
    <p>Hi {name},</p>
    <p>Welcome to TextKit API! Your free account is ready with <strong>10 requests per day</strong> across all 9 AI-powered text tools — no credit card needed.</p>

    <h3 style="color:#6c63ff">Three ways to use TextKit:</h3>
    <ul>
      <li><strong>Studio</strong> — paste text, pick a tool (no code needed)</li>
      <li><strong>Chrome Extension</strong> — right-click any text on the web</li>
      <li><strong>API</strong> — integrate with your apps</li>
    </ul>

    <div style="text-align:center;margin:24px 0">
      <a href="https://www.textkitapi.com/studio.html" style="background:#6c63ff;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
        Try Studio Now
      </a>
    </div>

    <p style="font-size:0.9rem">Need more? Upgrade from $9/month for 100 requests/day.</p>

    <hr style="border:none;border-top:1px solid #2a2a4a;margin:16px 0">
    <p style="font-size:0.8rem;color:#666;text-align:center">
      TextKit API &mdash; textkitapi.com<br>
      <a href="https://www.textkitapi.com/dashboard.html" style="color:#6c63ff">Dashboard</a> |
      <a href="https://www.textkitapi.com/docs" style="color:#6c63ff">Docs</a>
    </p>
  </div>
</div>
```

## Files Modified

| File | Change |
|------|--------|
| `src/services/email-sender.js` | Add `sendWelcomeEmail(to, name)` and `sendAdminNewUserAlert(user)` |
| `src/routes/auth.js` | Call both email functions after line 29 (after signToken), wrapped in try-catch |

## Code Integration Pattern

**In `src/routes/auth.js` after line 29:**

```javascript
const user = await createUser({ email, password, name });
const token = signToken(user);

// Fire-and-forget emails (non-blocking)
sendWelcomeEmail(email, name || null).catch(err => {
  console.error('Failed to send welcome email:', err);
});
sendAdminNewUserAlert(user).catch(err => {
  console.error('Failed to send admin alert:', err);
});

res.cookie('token', token, { /* ... */ });
```

**In `src/services/email-sender.js`:**

```javascript
async function sendWelcomeEmail(to, name) {
  if (!config.resend.apiKey) return; // Skip if not configured
  const r = getResend();
  const { error } = await r.emails.send({ /* ... */ });
  if (error) {
    console.error('Resend welcome email error:', error);
    throw new Error('Failed to send welcome email');
  }
}

async function sendAdminNewUserAlert(user) {
  if (!config.resend.apiKey || config.adminEmails.length === 0) return;
  const r = getResend();
  const { error } = await r.emails.send({ /* ... */ });
  if (error) {
    console.error('Resend admin alert error:', error);
    throw new Error('Failed to send admin alert');
  }
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail, sendAdminNewUserAlert };
```

## Design Constraints

1. **Non-blocking:** Email sending must NEVER delay or fail the registration response
2. **Fire-and-forget:** Use `.catch()` to handle errors without blocking
3. **Graceful degradation:** Skip silently if `RESEND_API_KEY` not configured
4. **No new dependencies:** Use existing Resend setup
5. **No new env vars:** Use existing `ADMIN_EMAILS`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
6. **Follow existing patterns:** Match structure/style of `sendPasswordResetEmail`

## Error Handling

- Email send failures log to console only
- Registration endpoint always returns 201 on success
- No retry logic (fire-and-forget)
- If Resend API key missing, skip silently (dev environments)

## Testing Checklist

- [ ] Register new user → receives welcome email
- [ ] Register new user → admin receives alert email
- [ ] Registration returns 201 even if email fails
- [ ] Verify emails appear in Resend dashboard (production)
- [ ] Test with `ADMIN_EMAILS=allbate@gmail.com` in `.env`
- [ ] Test with missing `RESEND_API_KEY` → no error, registration succeeds
- [ ] Verify email content matches dark theme
- [ ] Verify all links work (studio, dashboard, docs)
- [ ] Test with name provided vs not provided

## Rollout

1. Deploy to production
2. Monitor Resend dashboard for delivery status
3. Track user activation after welcome email deployment (manual check via admin dashboard)
4. If activation improves, consider A/B testing different CTAs in future

## Future Enhancements (Out of Scope)

- Welcome email sequence (day 1, day 3, day 7)
- Email preferences page
- Resend webhook for bounce/complaint tracking
- Personalized recommendations based on first endpoint used
