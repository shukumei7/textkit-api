# Changelog

All notable changes to TextKit API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **TextKit Studio** - Web-based UI for non-technical users at `/studio.html`
  - Interactive forms for all 9 AI text endpoints
  - Real-time usage tracking with tier limits display
  - Visual endpoint selection with descriptions
  - No API key management required (uses JWT cookie auth)
- **JWT Cookie Authentication** - Added cookie-based auth for web application
  - Supports Dashboard and Studio interfaces
  - Secure HttpOnly cookies in production
  - 7-day token expiration
- **Studio Usage Endpoint** - `GET /dashboard/studio/usage`
  - Returns current tier, today's usage count, and rate limits
  - Used by Studio interface for real-time usage tracking
- **FREE Tier** - Added FREE tier to subscription system
  - 10 requests/day, 2 requests/minute
  - Improves conversion rate for new users
- **Subscription Tiers** - Added tiered subscription system
  - FREE: 10 requests/day, 2 requests/minute
  - BASIC: 100 requests/day, 10 requests/minute ($5/mo)
  - PRO: 500 requests/day, 30 requests/minute ($15/mo)
  - ULTRA: 2,000 requests/day, 60 requests/minute ($30/mo)
  - MEGA: 10,000 requests/day, 120 requests/minute ($50/mo)
- **Stripe Integration** - Payment processing and subscription management
  - Checkout sessions for tier subscriptions
  - Customer Portal for subscription management
  - Webhook handling for subscription lifecycle events
- **User Authentication** - Registration and login system
  - JWT-based session management
  - Bcrypt password hashing
  - Cookie-based web authentication
- **API Key Management** - User-generated API keys
  - Create, list, and delete API keys via dashboard
  - `tk_live_*` prefixed keys for production use
  - Secure key storage with SHA-256 hashing
- **Rate Limiting** - Tier-based rate limits
  - Daily and per-minute limits
  - Rate limit headers in responses
  - Demo tier for public "Try It" widgets
- **Usage Tracking** - SQLite-based usage logging
  - Per-endpoint usage statistics
  - Daily usage charts
  - Token consumption tracking
- **9 AI Text Endpoints**
  - `/api/v1/repurpose` - Repurpose content for social platforms
  - `/api/v1/summarize` - Generate summaries
  - `/api/v1/rewrite` - Rewrite text with different tone
  - `/api/v1/seo/meta` - Generate SEO meta tags
  - `/api/v1/email/subject-lines` - Create email subject lines
  - `/api/v1/headlines` - Generate headlines
  - `/api/v1/extract/keywords` - Extract keywords
  - `/api/v1/translate/tone` - Translate tone
  - `/api/v1/compare` - Compare two texts
- **Web Dashboard** - User dashboard at `/dashboard.html`
  - View usage statistics (last 30 days)
  - Manage API keys
  - View subscription status
  - Access to Customer Portal
- **OpenAPI Documentation** - Swagger UI at `/docs`
  - Interactive API testing
  - Complete endpoint reference
  - Authentication examples

### Changed
- Enhanced authentication middleware to support JWT cookie auth
- Updated API documentation to include JWT cookie authentication method
- Improved error messages for authentication failures

### Fixed
- Rate limiting datetime format mismatch causing silent failure (JS `.toISOString()` format `2026-02-14T00:00:00.000Z` didn't match SQLite `datetime('now')` format `2026-02-14 00:00:00` — string comparison failed because `T` > space). Now uses SQLite `datetime()` functions in queries. Nobody was ever rate-limited before this fix.
- Studio page flash-of-content before auth redirect
- Back button returning to blank Studio page during auth check (now uses `location.replace()` to prevent back-button issues)

### Technical
- Express 5.x server setup
- SQLite database with better-sqlite3
- OpenAI API integration (gpt-4o-mini)
- Jest test suite with 164+ passing tests
- Railway deployment configuration
- Security hardening with helmet and rate limiting
- Git commit and version logging for deployment verification

## [1.0.0] - 2024-01-XX

### Added
- Initial release of TextKit API
- RapidAPI marketplace integration
