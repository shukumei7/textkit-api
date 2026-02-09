# TextKit API — Deployment Checklist

## Prerequisites

Before deploying, ensure:
- [ ] All 96 tests pass (`npm test`)
- [ ] `.env` configured with production values (see below)
- [ ] Stripe products/prices created in live mode
- [ ] Domain DNS configured

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production` |
| `TEXTKIT_PORT` | No | Default: 3100 |
| `DB_PATH` | No | SQLite directory path. Default: `./db/` |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `JWT_SECRET` | Yes | Long random string (fatal if missing in production) |
| `JWT_EXPIRES_IN` | No | Default: `7d` |
| `STRIPE_SECRET_KEY` | Yes | Stripe live secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_BASIC` | Yes | Stripe Price ID for Basic tier |
| `STRIPE_PRICE_PRO` | Yes | Stripe Price ID for Pro tier |
| `STRIPE_PRICE_ULTRA` | Yes | Stripe Price ID for Ultra tier |
| `STRIPE_PRICE_MEGA` | Yes | Stripe Price ID for Mega tier |
| `RAPIDAPI_PROXY_SECRET` | No | Only if using RapidAPI marketplace |
| `LOCAL_API_KEY` | No | Static key for local/dev testing |

## Server Requirements

- Node.js 18+
- SQLite3 (bundled via better-sqlite3, no separate install needed)
- Persistent storage for `DB_PATH` (SQLite must survive restarts)
- HTTPS (required for Stripe webhooks and secure cookies)

## Deployment Steps

### 1. Server Setup
- [ ] Node.js 18+ installed
- [ ] Git clone or push code to server
- [ ] `npm install --production`
- [ ] Create `.env` with all required variables

### 2. Database
- [ ] Ensure `DB_PATH` directory exists and is writable
- [ ] DB auto-initializes on first request (tables created automatically)
- [ ] Verify directory persists across restarts/deploys

### 3. Start the Server
```bash
# Direct
node src/index.js

# With process manager (recommended)
pm2 start src/index.js --name textkit-api
```

### 4. HTTPS / Reverse Proxy
- [ ] Configure reverse proxy (nginx/caddy) pointing to `localhost:3100`
- [ ] SSL certificate (Let's Encrypt or hosting provider)
- [ ] Verify `https://yourdomain.com` serves the landing page

### 5. Stripe Configuration
- [ ] Create webhook endpoint in Stripe dashboard
- [ ] Webhook URL: `https://yourdomain.com/stripe/webhook`
- [ ] Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [ ] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Test with Stripe CLI: `stripe trigger checkout.session.completed`

### 6. Verify
- [ ] Landing page loads: `https://yourdomain.com`
- [ ] API docs load: `https://yourdomain.com/docs`
- [ ] Terms page loads: `https://yourdomain.com/terms.html`
- [ ] Privacy page loads: `https://yourdomain.com/privacy.html`
- [ ] Registration works: `https://yourdomain.com/register.html`
- [ ] Login works: `https://yourdomain.com/login.html`
- [ ] Dashboard loads after login
- [ ] Stripe checkout flow completes
- [ ] API responds with valid key: `curl -H "X-API-Key: tk_live_..." https://yourdomain.com/api/v1/summarize`

## Domain

- Domain: `textkitapp.com`
- Contact email: `support@textkitapp.com`

## Hosting (TBD)

Hosting provider not yet decided. Options under consideration:
- SSH-accessible VPS (full control, pm2 + nginx)
- Railway (PaaS, auto-deploy from GitHub)

Update this section when decided.
