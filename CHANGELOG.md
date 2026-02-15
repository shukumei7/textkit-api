# Changelog

All notable changes to TextKit API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Chrome Extension** - Browser extension for right-click text processing on any webpage
  - Context menu integration with 8 AI-powered endpoints (Summarize, Rewrite, Extract Keywords, Headlines, SEO Meta, Email Subjects, Translate Tone, Repurpose)
  - Shadow DOM side panel for displaying results with Copy and Replace Selection buttons
  - Popup interface with login form and usage dashboard (dark theme matching textkitapi.com)
  - Service worker handles context menu creation and API routing
  - JWT storage in chrome.storage.local with automatic token refresh and 5-minute early expiry buffer
  - MV3 (Manifest V3) compliant architecture
- **Bearer Token Authentication** - Added `Authorization: Bearer <jwt>` support for all API endpoints
  - Works alongside existing RapidAPI and API key authentication methods
  - Positioned between local key and test bypass in authentication chain
  - Supported on `/auth/me` and `/dashboard/studio/usage` endpoints (checks Bearer header first, falls back to cookie)
  - Login and register endpoints now return `token` in JSON response body alongside setting the cookie
  - Enables programmatic API access from Chrome extension and other clients
- **Account Deletion** - Self-service account deletion endpoint (`DELETE /dashboard/account`)
  - Password-verified deletion for security
  - Automatically cancels Stripe subscriptions
  - Deletes all user data (account, API keys, usage logs, subscriptions) in a transaction
  - Accessible via Dashboard "Account" section
- **Data Export** - GDPR-compliant data export endpoint (`GET /dashboard/export`)
  - Downloads JSON file with all user data
  - Includes account info, API key metadata, usage logs, and subscription history
  - Excludes sensitive fields (password hashes, Stripe IDs)
  - Accessible via Dashboard "Account" section
- **Account Management Service** - New `src/services/account.js` for account lifecycle
  - Centralized account deletion logic with subscription handling
  - Data export with privacy-safe field exclusion
- **Dashboard Account Section** - Added "Account" section to dashboard
  - "Export My Data" button with JSON download
  - "Delete My Account" button with password confirmation modal
- **Privacy Policy Updates** - Enhanced privacy policy for international compliance
  - GDPR legal basis disclosure (contract performance, legitimate interest, legal obligation)
  - International data transfers disclosure (OpenAI US, Stripe US)
  - Expanded data subject rights for EEA (GDPR), California (CCPA), and Canada (PIPEDA)
  - Page view data collection disclosure
  - Dashboard self-service link for exercising data rights
  - Cookie consent exemption note (strictly necessary auth cookie)
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
- Contact email corrected from `support@textkitapp.com` to `support@textkitapi.com` in privacy policy and terms of service
- Rate limiting datetime format mismatch causing silent failure (JS `.toISOString()` format `2026-02-14T00:00:00.000Z` didn't match SQLite `datetime('now')` format `2026-02-14 00:00:00` — string comparison failed because `T` > space). Now uses SQLite `datetime()` functions in queries. Nobody was ever rate-limited before this fix.
- Studio page flash-of-content before auth redirect
- Back button returning to blank Studio page during auth check (now uses `location.replace()` to prevent back-button issues)
- Open redirect vulnerability in login redirect parameter (now only allows relative paths starting with `/`)
- Express-rate-limit `X-Forwarded-For` validation error behind Railway reverse proxy (added `trust proxy` setting)

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
