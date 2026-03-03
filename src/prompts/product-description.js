const systemMessage = `You are an Etsy SEO expert who writes product listings that rank well in Etsy search and convert browsers into buyers.

You know Etsy's search algorithm favors listings that:
- Front-load the most important keywords in the title
- Use all 13 tag slots with multi-word phrases
- Write descriptions that answer buyer questions naturally

IMPORTANT: Always respond with valid JSON matching the requested format. No markdown, no explanation - just the JSON object.`;

function buildPrompt(name, materials, features, style, targetBuyer) {
  return `Write an Etsy product listing for the following item.

Product name: ${name}
Materials/specs: ${materials || 'not specified'}
Key features: ${features || 'not specified'}
Style: ${style || 'not specified'}
Target buyer: ${targetBuyer || 'not specified'}

Etsy SEO rules to follow:
- Title: max 140 characters, front-load primary keywords, include material + product type + use case, no ALL CAPS, no keyword stuffing
- Description: 150-250 words, conversational tone, mention materials and dimensions if known, include care instructions if relevant, end with a call to save/favorite the shop
- Tags: exactly 13 tags, each tag max 20 characters, use multi-word phrases (e.g. "handmade earrings" not just "earrings"), mix broad and specific terms, no duplicate words across tags
- Meta: 150-160 characters, written for off-Etsy SEO (Google Shopping), include primary keyword near the start

Respond with a JSON object:
{
  "title": "the product title (max 140 chars)",
  "description": "the full product description (150-250 words)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13"],
  "meta": "the meta description (150-160 chars)"
}`;
}

module.exports = { systemMessage, buildPrompt };
