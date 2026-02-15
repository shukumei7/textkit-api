# TextKit API

Pay-per-use text/content utility API for the RapidAPI marketplace. Transform, analyze, and enhance text content with 9 AI-powered endpoints.

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd textkit-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your OpenAI API key and other settings

# Start the server
npm start
```

The API will be available at `http://localhost:3100`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/repurpose` | Repurpose content for social platforms (Twitter, LinkedIn, etc.) |
| POST | `/api/v1/summarize` | Generate summaries in various lengths and formats |
| POST | `/api/v1/rewrite` | Rewrite text with different tone and style |
| POST | `/api/v1/seo/meta` | Generate SEO meta tags (title, description, keywords) |
| POST | `/api/v1/email/subject-lines` | Create compelling email subject lines |
| POST | `/api/v1/headlines` | Generate attention-grabbing headlines |
| POST | `/api/v1/extract/keywords` | Extract keywords and named entities from text |
| POST | `/api/v1/translate/tone` | Transform text to match a specific tone |
| POST | `/api/v1/compare` | Compare two texts across multiple aspects |
| GET | `/health` | Basic health check (no auth) |
| GET | `/status` | Detailed service status (no auth) |
| GET | `/dashboard/studio/usage` | Get usage stats for Studio interface (JWT auth) |

## Chrome Extension

TextKit offers a Chrome browser extension that brings AI-powered text processing to any webpage via right-click context menu.

### Features
- **Context Menu Integration** - Select text on any webpage, right-click, and choose from 8 AI-powered actions
- **Available Actions**:
  - Summarize - Generate brief, medium, or detailed summaries
  - Rewrite - Transform text tone and style
  - Extract Keywords - Identify key terms and entities
  - Headlines - Create attention-grabbing headlines
  - SEO Meta Tags - Generate optimized meta title, description, and keywords
  - Email Subject Lines - Craft compelling subject lines
  - Translate Tone - Change text tone while preserving meaning
  - Repurpose - Adapt content for different social platforms
- **Shadow DOM Side Panel** - Results display in a non-intrusive side panel with Copy and Replace Selection buttons
- **Usage Dashboard** - Popup shows login status, current tier, and daily usage stats
- **Dark Theme** - Matches textkitapi.com design for consistency

### Installation

1. Navigate to the `chrome-extension/` directory in this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension/` folder

### Usage

1. **Login** - Click the TextKit extension icon and log in with your textkitapi.com credentials
2. **Select Text** - Highlight any text on a webpage
3. **Right-Click** - Choose **TextKit** from the context menu
4. **Pick Action** - Select the desired text processing action
5. **View Results** - Results appear in the side panel with options to copy or replace the selected text

The extension automatically handles JWT authentication and token refresh, storing credentials securely in Chrome's local storage.

## Authentication

### Bearer Token (Programmatic Access)

For programmatic API access (e.g., from the Chrome extension or custom applications), use Bearer token authentication:

```bash
curl -X POST http://localhost:3100/api/v1/summarize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Your long text here...", "length": "brief"}'
```

**Obtaining a token:**
1. Register or login via `/auth/register` or `/auth/login`
2. The response includes a `token` field containing your JWT
3. Use this token in the `Authorization: Bearer <token>` header for subsequent API calls

**Token details:**
- Expires after 7 days
- Returned in both login and registration responses
- Works alongside cookie-based authentication

### JWT Cookie (Web Application)

The web dashboard and Studio interface use JWT cookie authentication. After logging in via `/login.html`, a secure JWT cookie is set that authenticates all subsequent requests to dashboard and Studio endpoints.

**Endpoints using JWT auth:**
- `/dashboard/*` - Dashboard endpoints
- `/studio.html` - TextKit Studio interface

**Cookie details:**
- Name: `token`
- HttpOnly: Yes (in production)
- SameSite: Strict
- Expires: 7 days

### Production (RapidAPI)

Requests are authenticated via RapidAPI's proxy secret:

```bash
curl -X POST http://localhost:3100/api/v1/summarize \
  -H "X-RapidAPI-Proxy-Secret: your-proxy-secret" \
  -H "Content-Type: application/json" \
  -d '{"text": "Your long text here...", "length": "brief"}'
```

### Development (Local)

For local development, use the API key from your `.env` file or a JWT Bearer token:

```bash
# Using API key
curl -X POST http://localhost:3100/api/v1/summarize \
  -H "X-Api-Key: your-local-api-key" \
  -H "Content-Type: application/json" \
  -d '{"text": "Your long text here...", "length": "brief"}'

# Using Bearer token (after login)
curl -X POST http://localhost:3100/api/v1/summarize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Your long text here...", "length": "brief"}'
```

## TextKit Studio

TextKit Studio is a web-based UI for non-technical users to access all 9 AI text endpoints without coding.

**Features:**
- Interactive forms for all API endpoints
- Real-time usage tracking with tier limits
- Visual endpoint selection with descriptions
- JWT cookie authentication (same login as dashboard)
- No API key management required

**Access:**
After logging in at `/login.html`, navigate to `/studio.html` to use the Studio interface.

**Usage Tracking:**
Studio displays your current tier, today's usage count, and remaining requests. Usage updates in real-time as you make API calls.

## Rate Limits

Rate limits are enforced based on subscription tier:

| Tier | Price | Requests/Day | Requests/Minute |
|------|-------|--------------|-----------------|
| BASIC | $5/mo | 100 | 10 |
| PRO | $15/mo | 500 | 30 |
| ULTRA | $30/mo | 2,000 | 60 |
| MEGA | $50/mo | 10,000 | 120 |

Rate limit information is included in response headers:
- `X-RateLimit-Limit-Day` - Daily request limit
- `X-RateLimit-Remaining-Day` - Remaining daily requests
- `X-RateLimit-Limit-Minute` - Per-minute request limit
- `X-RateLimit-Remaining-Minute` - Remaining per-minute requests

## Example Requests

### Repurpose Content

Transform content for multiple social media platforms:

```bash
curl -X POST http://localhost:3100/api/v1/repurpose \
  -H "X-Api-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Just launched our new product feature that helps teams collaborate better. It includes real-time editing, smart notifications, and seamless integrations with popular tools.",
    "platforms": ["twitter", "linkedin", "instagram"],
    "tone": "professional"
  }'
```

Response:
```json
{
  "platforms": {
    "twitter": "🚀 New feature alert! Real-time editing, smart notifications & seamless integrations—everything your team needs to collaborate better. #ProductLaunch #TeamCollaboration",
    "linkedin": "Excited to announce our latest product feature designed to enhance team collaboration. With real-time editing, intelligent notifications, and integrations with your favorite tools, working together has never been easier. Learn more about how we're helping teams work smarter.",
    "instagram": "✨ Collaboration just got easier! Our new feature brings real-time editing, smart notifications, and all your favorite tool integrations in one place. Swipe to see what's new! 👉 #NewFeature #TeamWork #Productivity"
  },
  "metadata": {
    "platformCount": 3,
    "tone": "professional",
    "tokensUsed": 425
  }
}
```

### Summarize Text

Generate a brief summary in bullet points:

```bash
curl -X POST http://localhost:3100/api/v1/summarize \
  -H "X-Api-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Artificial intelligence has made remarkable progress in recent years. Machine learning models can now understand natural language, recognize images with human-level accuracy, and even generate creative content. Deep learning, a subset of machine learning, uses neural networks with multiple layers to learn complex patterns. Applications range from autonomous vehicles to medical diagnosis, transforming industries worldwide.",
    "length": "brief",
    "format": "bullets"
  }'
```

Response:
```json
{
  "summary": "• AI has advanced significantly with improvements in natural language understanding and image recognition\n• Deep learning uses multi-layered neural networks to identify complex patterns\n• Applications span autonomous vehicles, medical diagnosis, and other industries",
  "metadata": {
    "length": "brief",
    "format": "bullets",
    "tokensUsed": 280
  }
}
```

### Generate SEO Meta Tags

Create optimized meta tags for a blog post:

```bash
curl -X POST http://localhost:3100/api/v1/seo/meta \
  -H "X-Api-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "In this comprehensive guide, we explore the best practices for building scalable web applications. Learn about microservices architecture, database optimization, caching strategies, and load balancing techniques that help your application handle millions of users.",
    "keywords": ["web development", "scalability", "microservices"]
  }'
```

Response:
```json
{
  "title": "Complete Guide to Building Scalable Web Applications | Best Practices 2024",
  "description": "Master web application scalability with our comprehensive guide. Learn microservices architecture, database optimization, caching strategies, and load balancing for millions of users.",
  "keywords": ["web development", "scalability", "microservices", "database optimization", "load balancing"],
  "metadata": {
    "tokensUsed": 340
  }
}
```

## Development

### Running in Development Mode

Use Node.js watch mode for automatic restarts:

```bash
npm run dev
```

### Running Tests

Execute the test suite with coverage:

```bash
npm test
```

Watch mode for continuous testing:

```bash
npm run test:watch
```

### Environment Variables

Required environment variables (see `.env.example`):

```env
# Server
PORT=3100
NODE_ENV=development

# OpenAI API
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Authentication
RAPIDAPI_PROXY_SECRET=your-rapidapi-secret
LOCAL_API_KEY=your-local-dev-key

# Database
DB_PATH=./data/textkit.db
```

## Deployment

### VPS Deployment

1. **Provision a VPS** (Ubuntu 22.04 or later recommended)

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd textkit-api
   npm install --production
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

5. **Use PM2 for process management**:
   ```bash
   sudo npm install -g pm2
   pm2 start src/index.js --name textkit-api
   pm2 startup
   pm2 save
   ```

6. **Setup nginx reverse proxy** (optional):
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3100;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Environment-Specific Settings

**Production checklist**:
- Set `NODE_ENV=production`
- Use strong `RAPIDAPI_PROXY_SECRET`
- Configure `OPENAI_API_KEY` with production key
- Set appropriate rate limits in database
- Enable HTTPS with SSL certificate
- Configure monitoring and logging

**Reverse Proxy Deployment**:
When deploying behind a reverse proxy (Railway, Render, nginx, etc.), the application includes `app.set('trust proxy', 1)` to correctly identify client IPs from the `X-Forwarded-For` header. This is required for:
- Rate limiting to work correctly
- Accurate IP-based analytics
- Preventing `express-rate-limit` validation errors

## API Documentation

Interactive API documentation is available via Swagger UI:

**Local**: http://localhost:3100/docs

The Swagger UI provides:
- Complete endpoint reference
- Request/response schemas
- Interactive API testing
- Authentication examples
- Rate limit information

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 5.x
- **Database**: SQLite (better-sqlite3)
- **LLM Provider**: OpenAI API
- **Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest + Supertest

## Project Structure

```
textkit-api/
├── src/
│   ├── routes/          # API route handlers
│   │   ├── v1/          # Version 1 endpoints
│   │   └── health.js    # Health check endpoints
│   ├── services/        # Business logic and LLM calls
│   ├── prompts/         # LLM prompt templates
│   ├── middleware/      # Express middleware
│   ├── config.js        # Configuration management
│   ├── db.js            # Database initialization
│   ├── server.js        # Express app setup
│   └── index.js         # Entry point
├── data/                # SQLite database (gitignored)
├── tests/               # Test suites
├── swagger.json         # OpenAPI specification
├── .env.example         # Environment template
└── package.json         # Dependencies
```

## License

Proprietary - All rights reserved

## Support

For API support and questions:
- Email: support@yourdomain.com
- Documentation: http://localhost:3100/docs
- RapidAPI Hub: https://rapidapi.com/your-api
