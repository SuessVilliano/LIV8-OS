# LIV8 OS — Complete Platform Documentation

> **Version:** 2.0 | **Last Updated:** February 2026
> **Purpose:** Training materials, infographics, slide decks, and onboarding

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Architecture](#2-architecture)
3. [Dashboard Pages](#3-dashboard-pages)
4. [AI & Automation Engine](#4-ai--automation-engine)
5. [Voice AI (VAPI Integration)](#5-voice-ai-vapi-integration)
6. [Unified Inbox & Messaging](#6-unified-inbox--messaging)
7. [Social Media Management (Late API)](#7-social-media-management-late-api)
8. [Interactive Messaging](#8-interactive-messaging)
9. [CRM & Contacts](#9-crm--contacts)
10. [Creative Studio](#10-creative-studio)
11. [Business Twin / Brand Brain](#11-business-twin--brand-brain)
12. [Workflows & Automation](#12-workflows--automation)
13. [Staff Hub (AI Employees)](#13-staff-hub-ai-employees)
14. [Analytics & Reporting](#14-analytics--reporting)
15. [Agency Management](#15-agency-management)
16. [Billing & Subscriptions](#16-billing--subscriptions)
17. [Opportunities Pipeline](#17-opportunities-pipeline)
18. [Integrations](#18-integrations)
19. [API Reference](#19-api-reference)
20. [Database Schema](#20-database-schema)
21. [Deployment](#21-deployment)
22. [Security](#22-security)

---

## 1. Platform Overview

### What is LIV8 OS?

LIV8 OS is an **all-in-one AI-powered operating system for businesses**. It unifies CRM, marketing, voice AI, social media, messaging, content creation, workflow automation, and analytics into a single white-label platform.

### Core Value Propositions

| Feature | Description |
|---------|-------------|
| **AI-First** | Every module is powered by AI — from content generation to voice assistants to automated customer interactions |
| **White-Label Ready** | Agencies can rebrand the entire platform under their own name, logo, and domain |
| **Multi-Channel** | Unified inbox across SMS (4 providers), email, voice, WhatsApp, Facebook, Instagram, Twitter/X, LinkedIn, Telegram, TikTok, Google Business |
| **No-Code Automation** | Visual workflow builder with 30+ triggers and 50+ actions |
| **Headless Voice AI** | Full VAPI integration — create voice assistants, manage calls, phone numbers, and call logs without any VAPI branding |
| **13-Platform Social** | Post, schedule, and analyze across Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat |

### Target Users

- **Marketing Agencies** — Manage multiple client accounts from a single dashboard
- **Small Businesses** — Automate customer communication, content, and sales
- **SaaS Companies** — White-label the platform for their own customers
- **AI Consultants** — Deploy AI voice agents and chatbots for clients

---

## 2. Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express.js + TypeScript |
| **Database** | PostgreSQL via `@vercel/postgres` |
| **AI Models** | Google Gemini (primary), OpenAI, Anthropic, Groq |
| **Voice** | VAPI AI (voice assistants, phone calls) |
| **Social** | Late API (13 platforms), GoHighLevel (GHL) |
| **SMS** | Twilio, Telnyx, TextLink, GHL |
| **Email** | Nodemailer (SMTP), GHL |
| **Payments** | Stripe |
| **Scraping** | Firecrawl, Apify, RapidAPI |
| **Hosting** | Vercel (frontend), Render (backend) |

### Directory Structure

```
LIV8-OS/
├── backend/                    # Express.js API server
│   └── src/
│       ├── api/                # 37 route files
│       ├── db/                 # 8 database modules
│       ├── integrations/       # 13 integration modules
│       └── services/           # 31 service modules
├── dashboard-standalone/       # React frontend
│   └── src/
│       ├── pages/              # 17 page components
│       ├── components/         # Shared components (Sidebar, UnifiedInbox, etc.)
│       ├── contexts/           # ThemeContext
│       └── services/           # API client
├── chrome-extension/           # Browser extension
├── moltworker/                 # Background worker service
└── render.yaml                 # Deployment config
```

### Authentication Flow

1. User submits email/password → `POST /api/auth/login`
2. Server validates credentials, returns JWT token (`os_token`)
3. Frontend stores token in `localStorage`
4. All API requests include `Authorization: Bearer <token>` header
5. Backend middleware (`authService.verifyToken`) validates on each request
6. Token payload includes: `userId`, `email`, `role`, `agencyId`, `locationId`

### Credential Security

- All third-party API keys are encrypted with **AES-256-CBC** before storage
- Encryption key sourced from `CREDENTIALS_ENCRYPTION_KEY` env variable
- Keys are stored in `late_credentials`, `sms_credentials` tables (encrypted)
- Decryption happens only at request time, never exposed to frontend

---

## 3. Dashboard Pages

### 3.1 Landing Page (`/`)
- Public marketing page with feature showcase
- Animated hero section, pricing tiers, testimonials
- CTA buttons route to `/login`

### 3.2 Login (`/login`)
- Email + password authentication
- Agency selection (for multi-agency users)
- Token stored in `localStorage` as `os_token`

### 3.3 Dashboard (`/dashboard`)
- **KPI Cards**: Total contacts, active conversations, tasks completed, revenue
- **Activity Feed**: Real-time stream of platform events
- **Quick Actions**: Start conversation, create content, launch workflow
- **Charts**: Contact growth, message volume, task completion rates
- **AI Insights**: Gemini-powered daily digest of key metrics and recommendations

### 3.4 Brand (`/brand`)
- **Brand Scanner**: Enter a URL → AI scrapes and extracts brand identity (logo, colors, tone, mission)
- **Brand Brain Editor**: Full business profile — name, tagline, target audience, products, competitors
- **Knowledge Base**: Upload documents, FAQs, SOPs that AI agents use as context
- **Voice & Tone**: Define communication style for all AI-generated content

### 3.5 Staff Hub (`/staff`)
- **AI Employees**: Create virtual team members with specific roles and capabilities
- **Roles**: Social Media Manager, Customer Support Agent, Sales Rep, Content Writer, etc.
- **Assignment**: Route conversations and tasks to specific AI staff members
- **Performance**: Track each AI staff member's response time, satisfaction, tasks completed

### 3.6 Voice AI (`/voice-ai`)
- **Overview Tab**: KPI stats (total calls, average duration, active assistants), recent calls feed
- **Assistants Tab**: Card grid with CRUD — create/edit voice assistants with model, voice, prompt, first message configuration
- **Call Logs Tab**: Searchable/filterable table with expandable rows showing transcript, recording player, AI summary
- **Phone Numbers Tab**: Manage VAPI phone numbers — assign to assistants, view usage
- **Analytics Tab**: Per-assistant performance, call outcome breakdown, hourly volume chart

### 3.7 Inbox (`/inbox`)
- **Unified Inbox**: Multi-channel conversation list with channel badges (SMS, email, voice, WhatsApp, Facebook, Instagram, Twitter, LinkedIn, Telegram, Google Business)
- **Search & Filter**: Search contacts, filter by channel
- **Chat Interface**: Message bubbles with status indicators (sent, delivered, read, failed)
- **Interactive Messages**: Quick replies, buttons, carousels rendered inline
- **Interactive Compose Tools**: Build quick replies (up to 13), buttons (up to 3), carousel cards (up to 10) directly in the compose area
- **Quick Actions**: AI Reply, Assign, Quick Reply toolbar

### 3.8 Studio (`/studio`)
- **AI Content Generator**: Generate images, videos, blog posts, social content
- **Website Builder**: Create landing pages, multi-page websites with AI
- **Asset Library**: All generated content stored and browsable
- **Templates**: Pre-built templates for common content types
- **Export**: Download generated assets or publish directly

### 3.9 Workflows (`/workflows`)
- **Visual Builder**: Drag-and-drop workflow canvas
- **Triggers**: New contact, form submission, tag applied, date reached, API webhook, etc.
- **Actions**: Send SMS, send email, create task, update contact, add to pipeline, trigger AI agent, post to social, etc.
- **Conditions**: If/else branching based on contact properties, time, and custom logic
- **Templates**: Pre-built workflow templates for common scenarios

### 3.10 Opportunities (`/opportunities`)
- **Pipeline Board**: Kanban-style board with customizable stages
- **Deal Cards**: Contact info, deal value, stage, assigned to, probability
- **Drag & Drop**: Move deals between stages
- **Filters**: By stage, assigned to, value range, date

### 3.11 Analytics (`/analytics`)
- **Overview Dashboard**: Consolidated metrics across all modules
- **Channel Analytics**: Breakdown by SMS, email, voice, social
- **Campaign Performance**: Track content and campaign results
- **AI Performance**: Agent response times, satisfaction scores

### 3.12 Agencies (`/agencies`)
- **Agency Management**: Create and manage sub-agencies
- **Location Management**: Multiple business locations per agency
- **White-Label Config**: Custom branding per agency (logo, colors, domain)
- **Billing Management**: Per-agency subscription tracking

### 3.13 Settings (`/settings`)
- **API Keys**: Configure GHL, VAPI, Late, Twilio, Telnyx, TextLink, Stripe keys
- **SMS Configuration**: Select and configure SMS provider
- **Social Connections**: Connect social media accounts via Late OAuth
- **Notifications**: Email, in-app, Slack notification preferences
- **Team Members**: Invite and manage human team members

### 3.14 Pricing (`/pricing`)
- **Plan Tiers**: Free, Starter, Pro, Enterprise with feature matrices
- **Stripe Integration**: Checkout, subscription management, plan switching
- **Coupon Codes**: Support for promotional pricing

### 3.15 Support (`/support`)
- **Help Center**: Searchable knowledge base
- **Live Chat**: In-app support chat
- **Ticket System**: Create and track support tickets
- **Documentation Links**: API docs, guides, tutorials

---

## 4. AI & Automation Engine

### AI Providers

LIV8 OS supports multiple AI providers, configurable per-task:

| Provider | Models | Primary Use |
|----------|--------|-------------|
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro | Primary AI engine — content, analysis, agents |
| **OpenAI** | gpt-4o, gpt-4o-mini | Fallback AI, specialized tasks |
| **Anthropic** | claude-3.5-sonnet | Complex reasoning tasks |
| **Groq** | llama-3.1-70b, mixtral | Fast inference, bulk processing |

### Agent Executor

The Agent Executor (`agent-executor.ts`) is the core AI task runner:

1. Receives a task (e.g., "analyze this contact list")
2. Loads Business Twin context (brand voice, knowledge base)
3. Builds system prompt with available MCP tools
4. Executes multi-turn conversation with AI model
5. Handles tool calls (GHL API, database queries, web scraping)
6. Returns structured results with metadata

### MCP (Model Context Protocol) Tools

The MCP client (`mcp-client.ts`) maps 30+ GHL API operations to AI-callable tools:

**Contacts**: search, create, update, delete, add tags, remove tags, add notes
**Conversations**: list, create, update messages
**Calendars**: list, get appointments, get notes, get free slots
**Opportunities**: search, create, update, delete, pipelines
**Blogs**: list posts, get post, create post, check slug, update categories
**Social Media**: get posts, list social accounts
**Workflows**: list, get workflow
**Payments**: get order, list transactions
**Emails**: create template, fetch template

---

## 5. Voice AI (VAPI Integration)

### White-Label VAPI Platform

LIV8 OS wraps the entire VAPI AI API behind a branded proxy layer. Users interact with "LIV8 Voice AI" — never seeing VAPI branding.

### Architecture

```
User Dashboard → LIV8 Voice AI API → VAPI API (hidden)
                ↓
        Call Logs in DB → Analytics Dashboard
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Create Assistants** | Configure AI voice agents with model, voice, personality, first message |
| **Manage Phone Numbers** | Provision, assign, and monitor phone numbers |
| **Outbound Calls** | Initiate calls programmatically or from the dashboard |
| **Call Logs** | Full call history with duration, outcome, cost tracking |
| **Transcripts** | Real-time transcription with speaker identification |
| **Recordings** | Audio playback of call recordings |
| **Analytics** | Call volume, duration averages, outcome breakdown, per-assistant performance |
| **Webhooks** | Real-time VAPI event processing (call started, ended, function calls) |
| **Function Calls** | AI assistants can invoke custom functions during calls |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/voice-ai/assistants` | List all voice assistants |
| POST | `/api/voice-ai/assistants` | Create a new assistant |
| GET | `/api/voice-ai/assistants/:id` | Get assistant details |
| PATCH | `/api/voice-ai/assistants/:id` | Update assistant |
| DELETE | `/api/voice-ai/assistants/:id` | Delete assistant |
| POST | `/api/voice-ai/assistants/:id/duplicate` | Duplicate assistant |
| GET | `/api/voice-ai/calls` | List call logs |
| POST | `/api/voice-ai/calls` | Create outbound call |
| GET | `/api/voice-ai/calls/:id` | Get call details |
| GET | `/api/voice-ai/phone-numbers` | List phone numbers |
| POST | `/api/voice-ai/phone-numbers` | Provision phone number |
| PATCH | `/api/voice-ai/phone-numbers/:id` | Update phone number |
| DELETE | `/api/voice-ai/phone-numbers/:id` | Release phone number |
| POST | `/api/voice-ai/analytics` | Custom analytics query |
| GET | `/api/voice-ai/analytics/summary` | Pre-computed analytics summary |
| POST | `/api/voice-ai/webhooks/vapi` | VAPI webhook handler |

---

## 6. Unified Inbox & Messaging

### Supported Channels (14 Total)

| Channel | Provider | Features |
|---------|----------|----------|
| **SMS (Twilio)** | Twilio | Send/receive SMS, MMS, delivery receipts |
| **SMS (Telnyx)** | Telnyx | Send/receive SMS, media messages |
| **SMS (TextLink)** | TextLink | Send/receive SMS, bulk messaging |
| **SMS (GHL)** | GoHighLevel | Send/receive through GHL platform |
| **Email** | SMTP / GHL | Send/receive with HTML templates |
| **Voice** | VAPI AI | Outbound AI voice calls |
| **WhatsApp** | GHL | Send/receive WhatsApp messages |
| **Live Chat** | GHL | Website live chat widget |
| **Facebook** | GHL / Late | Facebook Messenger DMs |
| **Instagram** | GHL / Late | Instagram DMs, interactive messages |
| **Twitter/X** | Late API | Twitter DMs |
| **LinkedIn** | Late API | LinkedIn messages |
| **Telegram** | Late / Bot API | Telegram messages, inline keyboards |
| **Google Business** | Late API | Google Business messages |
| **TikTok** | Late API | TikTok DMs |

### Message Flow

```
Inbound:  External Platform → Webhook → inbox.ts → DB (conversations + messages) → WebSocket → UI
Outbound: UI → inbox.ts → Provider API → External Platform → Status Webhook → DB Update
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inbox/conversations` | List conversations (filterable by channel, status) |
| GET | `/api/inbox/conversations/:id` | Get conversation with messages |
| GET | `/api/inbox/conversations/:id/messages` | Paginated messages |
| POST | `/api/inbox/conversations/:id/read` | Mark as read |
| POST | `/api/inbox/conversations/:id/assign` | Assign to user/AI |
| POST | `/api/inbox/conversations/:id/archive` | Archive conversation |
| POST | `/api/inbox/send` | Send message (any channel) |
| GET | `/api/inbox/contacts` | Search contacts |
| POST | `/api/inbox/contacts` | Create/update contact |
| GET | `/api/inbox/contacts/:id` | Get contact with conversations |
| POST | `/api/inbox/webhook/sms` | Generic SMS webhook |
| POST | `/api/inbox/webhook/twilio` | Twilio-specific webhook |
| GET | `/api/inbox/stats` | Inbox statistics |

---

## 7. Social Media Management (Late API)

### Supported Platforms (13)

Twitter/X, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat

### Features

| Feature | Description |
|---------|-------------|
| **Cross-Post** | Publish to multiple platforms simultaneously |
| **Schedule** | Schedule posts for future publication |
| **Draft** | Save drafts for later |
| **Media Upload** | Images, videos, documents with platform-specific optimization |
| **Analytics** | Per-post performance metrics |
| **Retry** | Automatic and manual retry for failed posts |
| **Profiles** | Organize accounts into profiles |
| **OAuth Connect** | Headless OAuth flow for connecting accounts |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/late/credentials` | Store Late API key (encrypted) |
| GET | `/api/late/credentials` | Get stored credentials (masked) |
| DELETE | `/api/late/credentials` | Delete credentials |
| POST | `/api/late/test` | Test API key validity |
| GET | `/api/late/accounts` | List connected social accounts |
| GET | `/api/late/connect/:platform` | Get OAuth URL for platform |
| GET | `/api/late/profiles` | List profiles |
| POST | `/api/late/post` | Create/publish a post |
| POST | `/api/late/publish-now` | Publish immediately |
| POST | `/api/late/schedule` | Schedule a post |
| GET | `/api/late/posts` | List posts (filterable by status) |
| GET | `/api/late/posts/:id` | Get post details |
| DELETE | `/api/late/posts/:id` | Delete a post |
| POST | `/api/late/posts/:id/retry` | Retry failed post |
| POST | `/api/late/retry-all-failed` | Retry all failed posts |
| GET | `/api/late/posts/:id/analytics` | Post analytics |
| POST | `/api/late/media/upload-link` | Get media upload URL |
| GET | `/api/late/media/:token/status` | Check upload status |
| GET | `/api/late/platforms` | List supported platforms with limits |

---

## 8. Interactive Messaging

### Overview

LIV8 OS supports rich, interactive messaging across Instagram, Facebook, and Telegram via the Late Inbox API. Users can send:

- **Quick Replies** — Tappable suggestion chips (up to 13 on IG/FB, inline keyboard on Telegram)
- **Buttons** — Call-to-action buttons (up to 3 on IG/FB, inline keyboard on Telegram)
- **Carousels** — Scrollable card templates with images, titles, subtitles, and buttons
- **File Attachments** — Send images, videos, audio, and files on Instagram
- **Reply Markup** — Telegram-specific keyboard layouts (inline keyboard, custom keyboard, remove keyboard)

### Platform Compatibility Matrix

| Feature | Instagram | Facebook | Telegram |
|---------|-----------|----------|----------|
| Quick Replies | Up to 13 | Up to 13 | Inline keyboard |
| Buttons | Up to 3 | Up to 3 | Inline keyboard |
| Carousel / Generic Template | Carousel | Carousel | Photo + keyboard |
| Reply Markup | N/A | N/A | Full support |
| File Attachments | Full support | N/A | N/A |
| Edit Messages | N/A | N/A | Full support |
| Bot Commands | N/A | N/A | Full support |

### Interactive Messaging API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/late/inbox/conversations/:id/messages` | Send interactive message |
| PATCH | `/api/late/inbox/conversations/:id/messages/:msgId` | Edit Telegram message |
| GET | `/api/late/inbox/conversations` | List inbox conversations |
| GET | `/api/late/inbox/conversations/:id/messages` | Get conversation messages |
| GET | `/api/late/accounts/:id/telegram-commands` | Get Telegram bot commands |
| PUT | `/api/late/accounts/:id/telegram-commands` | Set Telegram bot commands |
| DELETE | `/api/late/accounts/:id/telegram-commands` | Delete bot commands |

### Send Interactive Message Request Body

```json
{
  "text": "Choose an option:",
  "quickReplies": [
    { "title": "Option A", "payload": "opt_a" },
    { "title": "Option B", "payload": "opt_b" }
  ],
  "buttons": [
    { "title": "Visit Site", "type": "url", "url": "https://example.com" },
    { "title": "Learn More", "type": "postback", "payload": "learn_more" }
  ],
  "genericTemplates": [
    {
      "title": "Product 1",
      "subtitle": "$29.99",
      "imageUrl": "https://example.com/img.jpg",
      "buttons": [
        { "title": "Buy Now", "type": "url", "url": "https://example.com/buy" }
      ]
    }
  ],
  "replyMarkup": {
    "inlineKeyboard": [
      [{ "text": "Yes", "callbackData": "yes" }, { "text": "No", "callbackData": "no" }]
    ]
  },
  "fileUrl": "https://example.com/document.pdf",
  "fileType": "file",
  "fileName": "document.pdf"
}
```

### Webhook Events

The webhook handler at `POST /api/late/webhook` processes:

| Event | Description |
|-------|-------------|
| `inbox.message.received` | New message received in a conversation |
| `inbox.button.clicked` | User tapped a button |
| `inbox.quickreply.clicked` | User tapped a quick reply |
| `inbox.postback` | Postback event from button tap |

All events are stored in the inbox database for full conversation history.

### Frontend Interactive Compose Tools

The Unified Inbox UI provides visual builders:

1. **Quick Reply Builder**: Add up to 13 quick reply chips with counter, press Enter to add
2. **Button Builder**: Add up to 3 buttons, choose type (URL or Action), set label and URL
3. **Carousel Builder**: Add up to 10 cards, each with title, subtitle, image URL, and up to 3 buttons

Tools appear in the compose toolbar only when the selected conversation is on a supported channel (Facebook, Instagram, Telegram, Twitter, LinkedIn, TikTok, Google Business).

---

## 9. CRM & Contacts

### Contact Management

| Feature | Description |
|---------|-------------|
| **Unified Contact Record** | Single profile across all channels |
| **Multi-Channel** | Phone, email, social handles linked to one contact |
| **GHL Sync** | Bi-directional sync with GoHighLevel contacts |
| **Tags** | Add/remove tags for segmentation |
| **Notes** | Add notes to contact records |
| **Custom Fields** | Store arbitrary metadata |
| **Conversation History** | Full message history across all channels |

### API Endpoints (CRM)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/crm/contacts` | List contacts with pagination |
| POST | `/api/crm/contacts` | Create contact |
| GET | `/api/crm/contacts/:id` | Get contact |
| PUT | `/api/crm/contacts/:id` | Update contact |
| DELETE | `/api/crm/contacts/:id` | Delete contact |
| POST | `/api/crm/contacts/:id/tags` | Add tags |
| DELETE | `/api/crm/contacts/:id/tags` | Remove tags |
| POST | `/api/crm/contacts/:id/notes` | Add note |

---

## 10. Creative Studio

### Content Generation

| Type | AI Model | Description |
|------|----------|-------------|
| **Images** | Gemini / Kimi | AI-generated images with brand styling |
| **Videos** | Kimi Studio | Short-form video generation |
| **Blog Posts** | Gemini | SEO-optimized blog content |
| **Social Posts** | Gemini | Platform-specific social content |
| **Websites** | Gemini | Landing page / website generation |
| **Email Templates** | Gemini | Marketing email designs |

### Asset Storage

- All generated content saved to `studio_assets` table
- Assets linked to location for multi-tenant isolation
- Supports metadata: title, description, tags, dimensions, format
- Website sessions tracked in `studio_website_sessions`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/studio/generate` | Generate content (image, video, blog, etc.) |
| GET | `/api/studio/assets` | List generated assets |
| GET | `/api/studio/assets/:id` | Get asset details |
| DELETE | `/api/studio/assets/:id` | Delete asset |
| POST | `/api/studio/websites/create` | Generate a website |
| GET | `/api/studio/websites/:id` | Get website |
| POST | `/api/studio/websites/:id/publish` | Publish website |

---

## 11. Business Twin / Brand Brain

### Concept

The Business Twin is an AI-powered digital replica of a business. It captures:

- **Brand Identity**: Name, tagline, mission, values, tone of voice
- **Products & Services**: Catalog with descriptions, pricing, features
- **Target Audience**: Demographics, pain points, buying behavior
- **Competitor Analysis**: Competing businesses, differentiation points
- **Knowledge Base**: FAQs, SOPs, documentation, scraped website content
- **Communication Style**: Formal/casual, humor level, emoji usage

### How It's Used

Every AI interaction in LIV8 OS is grounded by the Business Twin:

1. **Voice AI Assistants** — Use brand context for natural, on-brand conversations
2. **Content Generation** — Writing matches the brand's tone and audience
3. **Social Posts** — Automated posting uses brand voice
4. **Customer Support** — AI replies stay consistent with brand guidelines
5. **Sales Agents** — Know product catalog, pricing, and competitive advantages

### Database Structure

Stored in `business_twins` table with:
- Location-scoped (multi-tenant)
- Versioned knowledge base
- Scraped website data (via Firecrawl)
- Document uploads (PDFs, docs)

---

## 12. Workflows & Automation

### Visual Workflow Builder

The drag-and-drop workflow builder supports:

**Triggers**:
- New contact created
- Form submission
- Tag added/removed
- Date/time reached
- API webhook received
- Conversation started
- Call completed
- Deal stage changed

**Actions**:
- Send SMS/Email/WhatsApp
- Create/update contact
- Add/remove tags
- Create task
- Move deal to stage
- Trigger AI agent
- Post to social media
- Wait (delay)
- Send notification
- Make API call (webhook)
- Send voice call (VAPI)

**Conditions**:
- If/else branching
- Contact property checks
- Time-based conditions
- Custom expressions

### Content Scheduler

The content scheduler (`content-scheduler.ts`) handles:
- Recurring post schedules
- Optimal timing based on analytics
- Multi-platform batch scheduling
- Failed post retry queue

---

## 13. Staff Hub (AI Employees)

### AI Staff Roles

| Role | Capabilities |
|------|-------------|
| **Social Media Manager** | Create posts, schedule content, respond to comments |
| **Customer Support Agent** | Handle inbox messages, resolve tickets, escalate |
| **Sales Representative** | Qualify leads, follow up, move pipeline deals |
| **Content Writer** | Blog posts, social copy, email campaigns |
| **Voice Agent** | Handle inbound/outbound voice calls |
| **Data Analyst** | Generate reports, surface insights |

### Staff Assignment

- Conversations can be assigned to specific AI staff members
- Round-robin assignment for load balancing
- Escalation rules for complex issues
- Performance tracking per staff member

### Escalation Detection

The escalation detector (`escalation-detector.ts`) monitors:
- Sentiment analysis on incoming messages
- Keyword triggers (angry, lawsuit, cancel, etc.)
- Repeated contact within time window
- Automatically escalates to human when thresholds hit

---

## 14. Analytics & Reporting

### Data Sources

| Source | Metrics |
|--------|---------|
| **GHL** | Contacts, conversations, appointments, pipeline value |
| **VAPI** | Call volume, duration, outcomes, costs |
| **Late** | Post impressions, engagement, reach |
| **Inbox DB** | Message counts, response times, channel distribution |
| **Stripe** | Revenue, MRR, churn rate |

### Real-Time Analytics

The analytics service (`analytics.ts`) provides:
- **Dashboard Widgets**: Real-time KPI cards
- **Trend Charts**: Time-series data with configurable ranges
- **Channel Breakdown**: Performance comparison across channels
- **AI Performance**: Response time, accuracy, satisfaction scores
- **Custom Queries**: Flexible date range and dimension filtering

---

## 15. Agency Management

### Multi-Tenant Architecture

```
Agency (Top Level)
├── Location 1 (Business A)
│   ├── Contacts, Conversations, Content
│   ├── AI Staff, Workflows, Analytics
│   └── Voice AI, Social Accounts
├── Location 2 (Business B)
│   └── ... (fully isolated)
└── Location 3 (Business C)
    └── ... (fully isolated)
```

### White-Label Configuration

| Setting | Description |
|---------|-------------|
| **App Name** | Custom platform name |
| **Logo** | Custom logo (light and dark mode) |
| **Favicon** | Custom browser tab icon |
| **Primary Color** | Brand accent color |
| **Domain** | Custom domain mapping |
| **Email From** | Custom sender email |
| **Support URL** | Custom help center link |

### Agency API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agency` | Get agency details |
| PUT | `/api/agency` | Update agency |
| GET | `/api/agency/locations` | List locations |
| POST | `/api/agency/locations` | Create location |
| PUT | `/api/agency/locations/:id` | Update location |
| DELETE | `/api/agency/locations/:id` | Delete location |
| GET | `/api/agency/users` | List agency users |
| POST | `/api/agency/users/invite` | Invite user |

---

## 16. Billing & Subscriptions

### Stripe Integration

| Feature | Description |
|---------|-------------|
| **Plans** | Free, Starter ($49/mo), Pro ($149/mo), Enterprise (custom) |
| **Checkout** | Stripe Checkout for new subscriptions |
| **Portal** | Stripe Customer Portal for management |
| **Webhooks** | Real-time subscription status updates |
| **Coupons** | Promotional discount codes |
| **Usage Tracking** | Metered billing for API calls, AI tokens |

### Billing API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/checkout` | Create Stripe checkout session |
| GET | `/api/billing/subscription` | Get current subscription |
| POST | `/api/billing/portal` | Open Stripe customer portal |
| POST | `/api/billing/webhook` | Stripe webhook handler |
| GET | `/api/billing/plans` | List available plans |
| POST | `/api/billing/coupon/validate` | Validate coupon code |

---

## 17. Opportunities Pipeline

### Kanban Pipeline

- **Customizable Stages**: New, Qualified, Proposal, Negotiation, Won, Lost
- **Deal Cards**: Contact, value, probability, expected close date
- **Drag & Drop**: Move deals between stages
- **GHL Sync**: Bi-directional pipeline sync with GoHighLevel

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/opportunities` | List opportunities |
| POST | `/api/opportunities` | Create opportunity |
| PUT | `/api/opportunities/:id` | Update opportunity |
| DELETE | `/api/opportunities/:id` | Delete opportunity |
| GET | `/api/opportunities/pipelines` | List pipelines |
| PUT | `/api/opportunities/:id/stage` | Move to stage |

---

## 18. Integrations

### Primary Integrations

| Integration | Purpose | Config |
|-------------|---------|--------|
| **GoHighLevel (GHL)** | CRM, messaging, calendars, pipelines, blogs | `GHL_API_KEY`, OAuth |
| **VAPI AI** | Voice assistants, phone calls | `VAPI_API_KEY` |
| **Late** | Social media management (13 platforms) | `LATE_API_KEY` |
| **Twilio** | SMS/MMS messaging | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **Telnyx** | SMS messaging | `TELNYX_API_KEY` |
| **TextLink** | SMS messaging | `TEXTLINK_API_KEY` |
| **Stripe** | Billing, subscriptions | `STRIPE_SECRET_KEY` |
| **Vbout** | CRM, email marketing | `VBOUT_API_KEY` |
| **Firecrawl** | Website scraping | `FIRECRAWL_API_KEY` |
| **Apify** | Data scraping | `APIFY_API_TOKEN` |
| **RapidAPI** | Business data scrapers | `RAPIDAPI_KEY` |
| **TaskMagic** | Browser automation | `TASKMAGIC_API_KEY` |
| **Telegram Bot API** | Telegram messaging | `TELEGRAM_BOT_TOKEN` |
| **Google Gemini** | AI text generation | `GOOGLE_GEMINI_API_KEY` |
| **OpenAI** | AI text generation | `OPENAI_API_KEY` |
| **Anthropic** | AI text generation | `ANTHROPIC_API_KEY` |
| **Groq** | Fast AI inference | `GROQ_API_KEY` |

---

## 19. API Reference

### Complete Route Map (37 Route Files)

| Module | Route Prefix | File | Endpoints |
|--------|-------------|------|-----------|
| Auth | `/api/auth` | `auth.ts` | Login, register, verify token |
| Dashboard | `/api/dashboard` | `dashboard.ts` | KPIs, activity feed, insights |
| CRM | `/api/crm` | `crm.ts` | Contacts, tags, notes |
| Inbox | `/api/inbox` | `inbox.ts` | Conversations, messages, send, webhooks |
| Voice AI | `/api/voice-ai` | `voice-ai.ts` | Assistants, calls, phone numbers, analytics |
| Late Social | `/api/late` | `late.ts` | Posts, accounts, profiles, interactive messages |
| Studio | `/api/studio` | `studio.ts` | Content generation, assets, websites |
| Brand | `/api/brand` | `brand.ts` | Brand scanner, brain editor |
| Twin | `/api/twin` | `twin.ts` | Business twin CRUD, knowledge base |
| Staff | `/api/staff` | `staff.ts` | AI employees, roles, assignment |
| Workflows | `/api/scheduler` | `scheduler.ts` | Content scheduler, posting queue |
| Analytics | `/api/analytics` | `analytics.ts` | Custom queries, reports |
| Billing | `/api/billing` | `billing.ts` | Stripe checkout, subscriptions |
| Agency | `/api/agency` | `agency.ts` | Agency management, locations |
| Settings | `/api/settings` | `settings.ts` | User preferences, API keys |
| Opportunities | `/api/opportunities` | `opportunities.ts` | Pipeline deals, stages |
| Social Content | `/api/social-content` | `social-content.ts` | Social content engine |
| Social | `/api/social` | `social.ts` | Social media management |
| Content | `/api/content` | `content.ts` | Content management |
| AI | `/api/ai` | `ai.ts` | AI model interactions |
| Agents | `/api/agents` | `agents.ts` | AI agent management |
| Smart Agents | `/api/smart-agents` | `smart-agents.ts` | Advanced agent capabilities |
| Actions | `/api/actions` | `actions.ts` | Platform actions (make call, get analytics, etc.) |
| SMS | `/api/sms` | `sms.ts` | SMS management |
| TextLink | `/api/textlink` | `textlink.ts` | TextLink SMS provider |
| Vbout | `/api/vbout` | `vbout.ts` | Vbout CRM integration |
| Voice Creds | `/api/voice-credentials` | `voice-credentials.ts` | Voice credential management |
| Integrations | `/api/integrations` | `integrations.ts` | Integration management |
| Notifications | `/api/notifications` | `notifications.ts` | Notification system |
| Operator | `/api/operator` | `operator.ts` | Operator controls |
| White-Label | `/api/whitelabel` | `whitelabel.ts` | White-label configuration |
| Setup | `/api/setup` | `setup.ts` | Initial setup wizard |
| Scrapers | `/api/scrapers` | `scrapers.ts` | Web scraping tools |
| OpenClaw | `/api/openclaw` | `openclaw.ts` | OpenClaw integration |
| AnyChat | `/api/anychat` | `anychat.ts` | Universal chat interface |
| Webhooks | `/api/webhooks` | `webhooks.ts` | External webhook handlers |
| TaskMagic | `/api/taskmagic` | `taskmagic.ts` | TaskMagic automation |

---

## 20. Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `agencies` | Agency/organization records |
| `users` | User accounts with encrypted passwords |
| `ghl_locations` | GoHighLevel location connections |
| `audit_log` | Activity audit trail |
| `brand_brains` | Business twin/brand brain data |
| `subscriptions` | Billing subscription records |
| `coupons` | Promotional coupon codes |

### Inbox Tables

| Table | Purpose |
|-------|---------|
| `inbox_contacts` | Contact records (phone, email, social IDs) |
| `inbox_conversations` | Conversation threads (channel, status, unread count) |
| `inbox_messages` | Individual messages (direction, content, status, metadata) |

### Studio Tables

| Table | Purpose |
|-------|---------|
| `studio_assets` | Generated content assets |
| `studio_website_sessions` | Website builder sessions |

### Credential Tables

| Table | Purpose |
|-------|---------|
| `late_credentials` | Encrypted Late API keys per user/location |
| `sms_credentials` | Encrypted SMS provider credentials |

### Agent Tables

| Table | Purpose |
|-------|---------|
| `agent_sessions` | AI agent execution sessions |
| `knowledge_base` | Business knowledge documents |

---

## 21. Deployment

### Environment Setup

#### Required Environment Variables

```env
# Database
POSTGRES_URL=postgresql://...

# Authentication
JWT_SECRET=your-jwt-secret
CREDENTIALS_ENCRYPTION_KEY=32-char-key

# AI Providers
GOOGLE_GEMINI_API_KEY=...
OPENAI_API_KEY=...           # Optional
ANTHROPIC_API_KEY=...         # Optional
GROQ_API_KEY=...              # Optional

# GoHighLevel
GHL_API_KEY=...
GHL_CLIENT_ID=...
GHL_CLIENT_SECRET=...

# VAPI Voice AI
VAPI_API_KEY=...

# Late Social Media
LATE_API_KEY=...
LATE_WEBHOOK_SECRET=...       # Optional

# SMS Providers
TWILIO_ACCOUNT_SID=...        # Optional
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
TELNYX_API_KEY=...            # Optional
TELNYX_FROM_NUMBER=...
TEXTLINK_API_KEY=...          # Optional

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

# Telegram
TELEGRAM_BOT_TOKEN=...        # Optional

# Billing
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Scraping
FIRECRAWL_API_KEY=...         # Optional
APIFY_API_TOKEN=...           # Optional
RAPIDAPI_KEY=...              # Optional
```

### Deployment Platforms

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Vercel | Auto-deploy from git |
| Backend | Render | `render.yaml` config |
| Database | Vercel Postgres | Managed PostgreSQL |
| Workers | Render | Background job runner |

### render.yaml

The `render.yaml` file configures:
- Backend web service (Node.js)
- Worker service (moltworker)
- Environment variable groups
- Health check endpoints

---

## 22. Security

### Authentication & Authorization

| Layer | Implementation |
|-------|---------------|
| **Password Hashing** | bcrypt with salt rounds |
| **Token** | JWT with configurable expiry |
| **API Keys** | AES-256-CBC encrypted at rest |
| **Rate Limiting** | Express rate limiter per endpoint category |
| **CORS** | Configured for dashboard domains |
| **Webhook Verification** | HMAC-SHA256 signature validation |

### Data Isolation

- **Multi-Tenant**: All queries scoped by `location_id`
- **Agency Isolation**: Agencies cannot access other agencies' data
- **Token Scoping**: JWT contains `agencyId` and `locationId` claims
- **Encrypted Storage**: Third-party API keys encrypted before database storage

### Rate Limiting Presets

| Category | Limit |
|----------|-------|
| Auth | 5 requests / 15 minutes |
| API | 100 requests / minute |
| Webhooks | 500 requests / minute |
| Upload | 10 requests / minute |

---

## Appendix: Quick Reference Cards

### For Infographics: Platform Capabilities at a Glance

```
LIV8 OS Platform Capabilities
═══════════════════════════════
   📞 Voice AI     →  Create AI callers, manage calls & numbers
   💬 14 Channels  →  SMS, email, voice, WhatsApp, 9 social platforms
   🤖 AI Staff     →  Virtual employees with defined roles
   🎨 Studio       →  Generate images, videos, blogs, websites
   📊 Analytics    →  Real-time dashboards across all modules
   🔄 Workflows    →  Visual automation builder
   📱 Social       →  13-platform posting & scheduling
   🏢 Agencies     →  Multi-tenant white-label management
   💳 Billing      →  Stripe-powered subscriptions
   🎯 CRM          →  Contact management with GHL sync
   🔌 37 APIs      →  Full REST API coverage
   🛡️  Security     →  AES-256 encryption, JWT auth, rate limiting
```

### For Training: User Journey

```
1. Agency Admin creates account
2. Sets up agency branding (white-label)
3. Connects integrations (GHL, VAPI, Late, SMS)
4. Creates business locations for clients
5. For each location:
   a. Scans client website → builds Brand Brain
   b. Creates AI staff members
   c. Sets up voice AI assistants
   d. Connects social media accounts
   e. Builds workflows for automation
   f. Launches campaigns from Studio
6. Monitor everything from Analytics dashboard
```

---

*This documentation covers LIV8 OS v2.0 — a comprehensive AI-powered business operating system.*
