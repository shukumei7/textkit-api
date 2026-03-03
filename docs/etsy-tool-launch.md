# Etsy Listing Generator — Launch & Promotion Guide

Everything needed to verify the tool is working, promote it on Reddit and beyond, and track whether it is converting.

---

## 1. Tool Overview

The Etsy Listing Generator at [textkitapi.com/etsy.html](https://www.textkitapi.com/etsy.html) takes product details as input and generates a complete, SEO-optimized Etsy listing package in one request.

**Inputs:**
- Product name (required)
- Materials and specs (e.g., "100% cotton, hand-dyed")
- Key features (e.g., "machine washable, gift-ready packaging")
- Style vibe: Artisan, Modern, Playful, or Professional
- Target buyer (optional — e.g., "dog moms, plant lovers")

**Outputs:**
- Etsy title — keyword-first, max 140 characters
- Full description — 150–250 words, written for Etsy's search algorithm
- 13 tags — each under 20 characters, mixing broad and specific search terms
- Meta description — for when the listing appears in Google results

**Who it's for:** Etsy sellers with multiple listings who spend hours writing copy manually. The direct competitors (Describely, Hypotenuse AI) charge $29–50/month. This tool is free for the first 3 uses with no account required.

**Access model:** Anonymous users get 3 free generations per IP per day. After 3 uses, a pricing modal appears with a signup CTA. Logged-in users get their plan's full allocation.

---

## 2. Pre-Launch Checklist

Verify all of this before posting anywhere. A broken tool in a Reddit post is worse than no post.

- [ ] [textkitapi.com/etsy.html](https://www.textkitapi.com/etsy.html) loads without errors
- [ ] Form submits a test product and returns a full result (title + description + tags + meta)
- [ ] Copy buttons work for each output field
- [ ] Pricing modal appears after 3 anonymous uses (see test instructions below)
- [ ] "Sign up free" CTA in the modal links to `/register.html`
- [ ] Mobile layout is usable — form and results should be readable on a phone

**How to test the 3-use anonymous limit:**

The try counter is stored in `localStorage` under the key `etsy_tries`. To reset it and simulate a fresh visitor:

```javascript
// Run in the browser console on textkitapi.com/etsy.html
localStorage.removeItem('etsy_tries');
```

Reload the page, then generate 3 listings. The pricing modal should appear on the 4th attempt.

---

## 3. Reddit Promotion (Primary Channel)

Reddit has the highest concentration of active Etsy sellers in any public forum. It is the first promotion channel to use.

### Post drafts

Three subreddit-specific post drafts are ready in the campaign-manager:

- `campaign-manager/content/reddit-etsy.md` — r/Etsy, casual tone, two options (question-first recommended)
- `campaign-manager/content/reddit-etsysellers.md` — r/EtsySellers, practical/direct tone, tool-focused
- `campaign-manager/content/reddit-entrepreneur-etsy.md` — r/Entrepreneur, builder sharing a niche tool, includes competitor pricing context

Read each file before posting — they contain the full post text, title options, and subreddit-specific notes.

### Account age warning

r/Etsy and r/EtsySellers both filter or shadow posts from accounts with no seller history. The account Psychological-Ad9408 is auto-generated and will likely be filtered immediately in those subreddits.

Options:

1. **Wait and participate first (best long-term):** Use the account to upvote and leave genuine comments on 5–10 threads in each subreddit over 30 days. Then post. This is slow but produces the highest-quality result.
2. **Use a personal account with existing Reddit history:** Any account that has posted in other subreddits and is older than 30 days will have better standing. r/Entrepreneur is more permissive — Psychological-Ad9408 may work there.
3. **Get an Etsy seller to post it:** Find a seller who has genuinely used the tool and is willing to share it as their own find. This framing performs better than founder-posting anyway.

### Posting rules

- Post **one subreddit at a time**, with 48+ hours between posts
- Do not cross-post the same text verbatim — each draft is already written for its subreddit
- Best days: Tuesday through Thursday
- Best time: 9–11am ET
- Reply to comments within 2 hours — unresponsive OPs get downvoted in these communities
- If a post gets removed: wait 1 week, participate in 3+ threads, then try the alternate title option from the draft

### Subreddit order

Start with r/Entrepreneur (least restrictive, includes competitor analysis which drives engagement), then r/EtsySellers (tool-friendly community), then r/Etsy (highest volume but most filtered).

---

## 4. Etsy Community Groups (Secondary Channel)

**Facebook groups for Etsy sellers:**

These groups allow tool sharing if framed as "I built this for my own shop." The key is participating before promoting — drop in to answer questions for a few days first.

- Etsy Sellers & Teams
- Etsy Seller Community
- Etsy Shop Owners

Search these names on Facebook. They typically have 50k–200k members and moderate daily activity.

**Etsy Teams (within Etsy itself):**

Etsy has a built-in teams feature at [etsy.com/teams](https://www.etsy.com/teams). Join a relevant team (handmade sellers, your niche), participate in the team forum for a week, then share the tool in a thread. Team members are active sellers, making them high-quality leads.

---

## 5. Beyond Reddit: Where Etsy Sellers Congregate

These channels take more setup but can produce compounding traffic over time.

**TikTok** — #etsyseller has 2B+ views. A 30–60 second screen recording showing a before-and-after (manual listing vs. generated listing) can reach thousands of sellers without an existing audience. No follower count required to start.

**YouTube Shorts** — A video titled "How I write 60 Etsy listings in an hour" with a demo drives high-intent traffic. YouTube Shorts appear in Google search results, so this compounds over time.

**Pinterest** — Tutorial-style pins are indexed by Google and continue driving traffic for months. A pin showing the tool's output with a link to `/etsy.html` is low effort and long-lasting. Use Canva to make it look like a "tip" graphic rather than an ad.

**Etsy Seller Handbook blog comments** — [etsy.com/seller-handbook](https://www.etsy.com/seller-handbook) articles have high-intent traffic. Comments on articles about listing optimization or SEO that mention the tool (genuinely, not spammy) reach people actively looking for this solution.

---

## 6. Tracking Results

The admin dashboard shows anonymous usage by endpoint.

```bash
KEY=$(grep ADMIN_API_KEY .env | cut -d= -f2)

# Overall usage
curl -s -H "X-Admin-Key: $KEY" https://www.textkitapi.com/admin/overview | jq

# Etsy endpoint call count
curl -s -H "X-Admin-Key: $KEY" https://www.textkitapi.com/admin/endpoints | \
  jq '.endpoints[] | select(.endpoint == "/api/product-description")'

# Recent registrations (did the tool drive signups?)
curl -s -H "X-Admin-Key: $KEY" https://www.textkitapi.com/admin/registrations | jq
```

What to watch for after a Reddit post goes live:

- `/api/product-description` call count rising within hours of posting (indicates the post is getting traffic)
- Anonymous users reaching the 3-use limit (the modal is showing — this is the conversion funnel working)
- Registration count uptick in the same time window (modal CTA is converting)

If a Reddit post gets significant upvotes but no `/api/product-description` spike, the link is not being clicked — review the post title and link placement.

---

## 7. Converting Anonymous Users to Paid

The pricing modal after 3 anonymous uses is the only conversion surface for anonymous traffic.

**Success benchmark:** 1 paid signup per 50 anonymous generations. If you see 200 generations and 4 signups, that is on track.

**If free-to-paid conversion is below 2%:**
- Review the modal copy — it should make the value clear and the ask small
- Confirm the "Sign up free" button links correctly to `/register.html`
- Consider whether the free tier allows enough uses to demonstrate value before hitting the wall

**If zero signups after 100 anonymous generations:**
- The tool is working but the pricing wall is too early
- Test increasing the free limit to 5 or 7 uses before the modal appears
- Or add a "save your result" feature that requires a free account — softer gate than a paid modal

**If people are reaching the limit but bouncing without signing up:**
- The modal may not be showing the pricing clearly
- Add one concrete example of what a paid account gets (e.g., "50 listings/month for $9") to the modal body

---

## 8. Iteration

If output quality is off for specific product types, the fix is in the prompts and service logic — not in the UI.

**If "artisan" style outputs feel generic for handmade jewelry:**
- Edit the system prompt in `src/prompts/product-description.js` (or wherever the prompt is defined)
- Add 1–2 example handmade jewelry listings to the system prompt as few-shot examples
- Test with 5–10 real products before re-deploying

**If tag quality is poor for a specific niche (vintage, POD, digital downloads):**
- Add niche-specific examples to the system prompt showing what good tags look like for that category
- Etsy sellers in the Reddit comments will tell you which categories are off — read the feedback

**If the title length is inconsistent:**
- Check the `truncateAtWordBoundary` function in `src/services/product-description.js`
- Confirm the prompt explicitly states the 140-character limit and that the model is respecting it

**For A/B testing different description styles:**
- Add a `version` query parameter or request body field to the API schema (e.g., `version: "v1"` vs `"v2"`)
- Route to different prompts based on the version value
- Compare conversion rates for each version using the admin endpoint stats
