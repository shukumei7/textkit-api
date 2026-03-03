# TextKit API — Zapier Integration Setup Guide

This guide covers everything needed to deploy the TextKit Zapier app from scratch, create Zap templates, and submit for public listing. Steps are ordered for a solo founder doing this once.

---

## 1. Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- A Zapier account at [developer.zapier.com](https://developer.zapier.com) — the same account you use to build Zaps; no separate signup needed
- A TextKit API key at BASIC tier or higher (the auth test uses `/auth/verify`, which returns the `tier` field used in the `connectionLabel`)

---

## 2. One-Time CLI Setup

These steps are run once per machine. After initial setup, you only need `push` for future deploys.

```bash
cd textkit-api/zapier
npm install
npx zapier-platform-cli login
```

`zapier-platform-cli login` opens a browser tab for OAuth. Complete the flow, then return to the terminal — it saves credentials locally.

```bash
npx zapier-platform-cli register "TextKit API"
```

This registers the app name in your Zapier developer account. Run this **once only**. If you run it again on a fresh machine against an already-registered app, it will fail — use `link` instead to connect to the existing app:

```bash
npx zapier-platform-cli link   # if the app already exists in your account
```

---

## 3. Deploying the App

```bash
cd textkit-api/zapier
npx zapier-platform-cli push
```

The push command runs tests, validates the app schema, and uploads the new version. After a successful push:

- The app is immediately live as **invite-only** — not yet publicly searchable
- Your existing connections continue working without interruption

To get the invite URL so you can test with real Zaps before going public:

1. Go to [developer.zapier.com](https://developer.zapier.com)
2. Select **TextKit API** from Your Apps
3. Go to **Sharing**
4. Copy the invite link and open it in a browser to accept the invite on your own Zapier account

Test at least one end-to-end Zap (trigger → TextKit action → output step) before submitting for public listing.

---

## 4. Running Tests

```bash
cd textkit-api/zapier
npm test
```

23 tests, no live API calls. Tests run against mocked responses and validate field mappings, output shapes, and auth config. Run this before every push — `zapier push` will also run tests internally, but running them locally first gives faster feedback.

---

## 5. Creating Zap Templates (Manual — in the Developer Portal)

Zap templates are pre-built Zap configurations that appear on your app's page and in Zapier's discovery surfaces. They lower the barrier for new users to connect TextKit to tools they already use.

Navigate to [developer.zapier.com](https://developer.zapier.com) → **TextKit API** → **Templates** → **New Template**.

For each template below, configure the steps in order, fill in the field mappings exactly as listed, add the tags, then set visibility to **Public** before saving. Templates go through Zapier review before appearing in search.

---

### Template 1: RSS → Summarize → Notion

**Template Name:** Summarize new RSS articles and save to Notion

**Description:** When a new article appears in your RSS feed, automatically summarize it and save the summary to a Notion database. Build a personal research digest without reading every article in full.

**Step 1 — Trigger**
- App: RSS by Zapier
- Event: New Item in Feed
- Config: User provides their RSS feed URL

**Step 2 — Action**
- App: TextKit API
- Action: Summarize Text
- Field mappings:
  - `text` → `{{content}}` (RSS item content or description field)
  - `length` → `detailed`
  - `format` → `bullets`

**Step 3 — Action**
- App: Notion
- Action: Create Database Item
- Field mappings:
  - Title → `{{title}}` (from RSS trigger)
  - Summary → `{{summary}}` (from TextKit)
  - Key Points → `{{keyPoints}}` (from TextKit)
  - URL → `{{url}}` (from RSS trigger)
  - Published Date → `{{pubDate}}` (from RSS trigger)

**Tags:** RSS, Notion, summarize, content curation, research, newsletter

---

### Template 2: Google My Business Review → Rewrite → Gmail Draft

**Template Name:** Auto-draft replies to new Google My Business reviews

**Description:** When a new review appears on your Google Business profile, TextKit rewrites a professional, friendly reply and saves it as a Gmail draft for your approval. Never miss responding to a review again.

**Step 1 — Trigger**
- App: Google My Business
- Event: New Review
- Config: User selects their business location

**Step 2 — Action**
- App: TextKit API
- Action: Rewrite Content
- Field mappings:
  - `text` → Build from template: `Customer left a {{rating}}-star review saying: {{reviewText}}. Write a short, appreciative reply acknowledging their feedback.`
  - `tone` → `friendly`

**Step 3 — Action**
- App: Gmail
- Action: Create Draft
- Field mappings:
  - Subject → `Re: Your review of [Business Name]`
  - Body → `{{rewritten}}` (from TextKit)
  - To → User configures (typically their own address for internal review before sending)

**Tags:** Google reviews, Gmail, customer service, reputation management, small business

---

### Template 3: Typeform Submission → Extract Keywords → Airtable Row

**Template Name:** Extract keywords from form submissions and log to Airtable

**Description:** When someone submits a Typeform, extract the key topics and themes from their responses and add them as tags in an Airtable base. Perfect for categorizing customer feedback, job applications, or research survey responses.

**Step 1 — Trigger**
- App: Typeform
- Event: New Entry
- Config: User selects their form

**Step 2 — Action**
- App: TextKit API
- Action: Extract Keywords
- Field mappings:
  - `text` → `{{answer_field}}` (user maps to the main open-text response field in their form)
  - `maxKeywords` → `10`
  - `includeEntities` → `true`

**Step 3 — Action**
- App: Airtable
- Action: Create Record
- Field mappings:
  - Name → `{{respondent_email}}` (from Typeform)
  - Response → `{{answer_field}}` (from Typeform)
  - Keywords → `{{keywords}}` (from TextKit — comma-separated list)
  - Topics → `{{topics}}` (from TextKit)
  - Submitted At → `{{submitted_at}}` (from Typeform)

**Tags:** Typeform, Airtable, keywords, forms, tagging, categorization, feedback analysis

---

### Template 4: New WordPress Post → Generate SEO Meta → Update Post

**Template Name:** Auto-generate SEO meta descriptions for new WordPress posts

**Description:** When you publish a new WordPress post, TextKit automatically generates an optimized meta description and title tag and updates the post. Never forget to write SEO metadata again.

**Step 1 — Trigger**
- App: WordPress
- Event: New Post
- Config: User connects their WordPress site. Optionally filter by post status = published.

**Step 2 — Action**
- App: TextKit API
- Action: Generate SEO Meta Tags
- Field mappings:
  - `text` → `{{post_content}}` (WordPress post body)
  - `url` → `{{post_url}}` (WordPress post permalink)

**Step 3 — Action**
- App: WordPress
- Action: Update Post
- Field mappings:
  - Post ID → `{{id}}` (from WordPress trigger)
  - Meta Description → `{{metaDescription}}` (from TextKit)
  - SEO Title → `{{title}}` (from TextKit — optional, maps to Yoast or RankMath custom fields)

**Note:** Updating SEO meta fields requires a plugin like Yoast SEO or RankMath installed on the WordPress site. These plugins expose custom fields via the WordPress REST API that Zapier can write to.

**Tags:** WordPress, SEO, meta description, blogging, content marketing, Yoast

---

### Template 5: Slack Message → Translate Tone → Send Email via Gmail

**Template Name:** Turn Slack messages into formal emails automatically

**Description:** When a message is posted to a designated Slack channel, TextKit rewrites it in a formal professional tone and sends it as an email via Gmail. Great for turning quick internal notes into client-ready communications without rewriting them yourself.

**Step 1 — Trigger**
- App: Slack
- Event: New Message Posted to Channel
- Config: User selects a specific channel (e.g., #send-as-email or #client-updates)

**Step 2 — Action**
- App: TextKit API
- Action: Translate Tone
- Field mappings:
  - `text` → `{{text}}` (Slack message text)
  - `targetTone` → `professional`

**Step 3 — Action**
- App: Gmail
- Action: Send Email
- Field mappings:
  - To → User configures (client email or distribution list)
  - Subject → User configures, or derive from a Slack message prefix convention
  - Body → `{{translated}}` (from TextKit)

**Tags:** Slack, Gmail, email, tone, professional writing, communication, internal to external

---

## 6. Submitting for Public Listing

Once the app is tested and templates are created, submit for Zapier's public directory.

1. Go to [developer.zapier.com](https://developer.zapier.com) → **TextKit API** → **Publishing**
2. Fill in the submission form using the copy below (all sourced from `zapier/LISTING.md`)

**Integration Name:** TextKit API

**Short Description (140 chars max):**
> AI-powered text processing — summarize, rewrite, extract keywords, generate SEO meta, and translate tone in seconds.

**Long Description:** Copy the full long description from `zapier/LISTING.md` — it is ready to paste as-is.

**Authentication Setup Instructions:** Copy the "Authentication Setup Instructions" section from `zapier/LISTING.md`. This is shown to users during the connection step.

**Category:**
- Primary: Content & Files
- Secondary: AI Tools

**Homepage:** https://www.textkitapi.com

**Documentation:** https://www.textkitapi.com/docs

**Support Email:** support@textkitapi.com

**Logo:** Export the purple TextKit logo from `/public/logo.svg` and upload it in the portal. Zapier requires a square image at 256x256px minimum — export or convert the SVG to PNG at that size.

**Expected review timeline:** 1–2 weeks. Zapier reviewers check that auth works, all actions return non-null output fields, endpoints are stable, and the listing copy is accurate. They will test the live API.

**What reviewers look for:**
- Auth test against `GET /auth/verify` succeeds with a real API key
- Each action returns the fields declared in its output schema
- No broken or 404 endpoints
- Short description matches what the app actually does

---

## 7. Updating the App After Code Changes

For any code change to an action, the authentication config, or the app metadata:

```bash
cd textkit-api/zapier
npm test                           # catch issues before pushing
npx zapier-platform-cli push       # re-deploys immediately
```

Existing users automatically receive the update. Zapier does not require users to reconnect or reconfigure their Zaps for non-breaking changes.

**Breaking changes** — removing a field, renaming an output key, or changing an action key — will break existing Zaps for users who have mapped those fields. If a breaking change is unavoidable:
- Version the change using `zapier-platform-cli`'s versioning commands to maintain the old version alongside the new one
- Give a deprecation notice in the portal before retiring the old version

For routine updates (prompt changes, new optional input fields, output field additions), just push — no migration needed.

---

## 8. Monitoring

**Connection and task errors:**
- [developer.zapier.com](https://developer.zapier.com) → **TextKit API** → **Monitoring**
- Shows auth failures, task errors, and error rates over time
- Errors are attributed to specific actions, so you can see if one endpoint is misbehaving

**Usage volume:**
- [textkitapi.com/admin.html](https://www.textkitapi.com/admin.html) — shows API call counts by endpoint
- Or via curl:
  ```bash
  KEY=$(grep ADMIN_API_KEY .env | cut -d= -f2)
  curl -s -H "X-Admin-Key: $KEY" https://www.textkitapi.com/admin/endpoints | jq
  ```

**Error codes to watch for:**
- `401` — Bad or expired API key. User needs to reconnect their TextKit account in Zapier.
- `429` — Rate limit hit. User's tier does not support the volume they are generating. Zapier will retry, but persistent 429s indicate the user needs a higher tier.
- `422` — Validation error. A required field (usually `text`) is empty because upstream Zap data was missing.

---

## 9. Troubleshooting

**`zapier login` opens a browser instead of accepting credentials in terminal**
Expected. The Zapier CLI only supports browser-based OAuth. Complete the flow in the browser and the terminal will confirm the login.

**`zapier register` fails with "name already taken"**
The app name `TextKit API` is already registered to your account (or was registered previously). Run `npx zapier-platform-cli link` instead to connect the local directory to the existing app.

**`zapier push` fails with a validation error**
Run `npm test` first. Validation errors typically mean an output field key is declared but not returned, or a required input field is missing a `key` property. The test output will point to the specific action.

**An action returns empty output**
Zapier will silently drop output fields that are `null` or `undefined`. If downstream Zap steps show empty fields, confirm the TextKit API endpoint is returning the field in question for the input provided. Test the endpoint directly with curl to isolate whether it is a TextKit response issue or a field mapping issue in the Zapier action definition.

**Auth test fails during setup**
Confirm that `GET https://www.textkitapi.com/auth/verify` is live and returns a JSON body containing `"success": true` along with `email` and `tier` fields. Those two fields are used by the `connectionLabel`. If the endpoint is down or returns a different shape, the connection test in Zapier will fail.

**Templates not appearing in Zapier's public search after approval**
Template indexing can lag by a day or two after approval. Check the template's visibility is set to **Public** (not Private) in the portal. If visibility is correct and a week has passed, contact Zapier support via the developer portal.
