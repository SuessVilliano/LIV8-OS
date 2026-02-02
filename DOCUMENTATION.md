# LIV8 OS - Documentation

## Overview

LIV8 OS is an AI-powered business operating system that helps entrepreneurs, agents, coaches, and business owners automate their operations with AI staff. The platform includes CRM integration, content creation, lead management, and intelligent automation.

**Live URLs:**
- Frontend: Deployed on Render (Static Site)
- Backend: Deployed on Render (Web Service)
- CRM: crm.liv8.co (Vbout whitelabel)

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Authentication](#authentication)
7. [Features](#features)
8. [API Reference](#api-reference)
9. [Integrations](#integrations)
10. [Deployment](#deployment)
11. [Chrome Extension](#chrome-extension)
12. [Affiliate Tracking](#affiliate-tracking)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LIV8 OS                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard  │  │   Chrome    │  │      Mobile PWA         │  │
│  │  (React)    │  │  Extension  │  │   (Installable)         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Backend API (Express)                   │  │
│  │  - Auth & JWT     - AI Agents      - Content Engine       │  │
│  │  - Billing/Stripe - Workflows      - Social Connectors    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  PostgreSQL │  │  Google AI  │  │    CRMs     │             │
│  │  (Vercel)   │  │  (Gemini)   │  │ GHL/Vbout   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend (Dashboard)
- **Framework:** React 18 with TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Build:** Vite
- **PWA:** Service Worker enabled

### Backend
- **Runtime:** Node.js with TSX (direct TypeScript execution)
- **Framework:** Express.js
- **Database:** PostgreSQL (Vercel Postgres)
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **AI:** Google Generative AI (Gemini), LangChain
- **Payments:** Stripe

### Chrome Extension
- **Manifest:** V3
- **Features:** Side panel, content scripts, GHL integration

---

## Project Structure

```
LIV8-OS/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── api/               # Route handlers
│   │   │   ├── auth.ts        # Authentication endpoints
│   │   │   ├── billing.ts     # Stripe billing
│   │   │   ├── content.ts     # Content generation
│   │   │   └── ...
│   │   ├── services/          # Business logic
│   │   │   ├── auth.ts        # Auth service
│   │   │   ├── stripe.ts      # Stripe service
│   │   │   ├── content-engine.ts
│   │   │   └── ...
│   │   ├── db/                # Database layer
│   │   │   ├── index.ts       # DB connection
│   │   │   └── init-tables.ts # Schema setup
│   │   ├── agents/            # AI agent system
│   │   └── index.ts           # Server entry point
│   └── package.json
│
├── dashboard-standalone/       # React frontend
│   ├── public/
│   │   ├── _redirects         # SPA routing for Render
│   │   └── manifest.json      # PWA manifest
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx    # Public landing page
│   │   │   ├── Login.tsx      # Auth page (login/signup)
│   │   │   ├── Dashboard.tsx  # Main dashboard
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ContentStudio.tsx
│   │   │   └── ...
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── services/
│   │       └── api.ts         # Backend API client
│   └── index.html
│
├── chrome-extension/          # Browser extension
│   ├── manifest.json
│   ├── sidepanel.html
│   └── sidepanel.js
│
└── DOCUMENTATION.md           # This file
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (or Vercel Postgres)

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/SuessVilliano/LIV8-OS.git
cd LIV8-OS
```

2. **Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev           # Starts on http://localhost:3001
```

3. **Frontend Setup:**
```bash
cd dashboard-standalone
npm install
npm run dev           # Starts on http://localhost:5173
```

4. **Initialize Database (optional):**
```bash
cd backend
npm run db:init
```

---

## Environment Variables

### Backend (.env)

```env
# Server
PORT=3001
NODE_ENV=development

# Database (Vercel Postgres)
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Authentication
JWT_SECRET=your-secret-key-here
ADMIN_PASSWORD=letsgrow              # Master admin password

# AI Services
GOOGLE_AI_API_KEY=your-gemini-key

# Stripe Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# GoHighLevel Integration
GHL_CLIENT_ID=your-client-id
GHL_CLIENT_SECRET=your-client-secret

# CORS
ALLOWED_ORIGINS=https://your-frontend.onrender.com
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## Authentication

### Admin Login
The system supports a master admin password that bypasses database authentication:
- **Default Password:** `letsgrow`
- Can be overridden with `ADMIN_PASSWORD` environment variable
- Admin users get `super_admin` role with full access

### Regular User Login
1. User registers with email/password/business name
2. Password is hashed with bcrypt (10 rounds)
3. JWT token issued on successful login (7-day expiry)
4. Token stored in localStorage as `os_token`

### JWT Payload
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  agencyId: string;
  role: string;  // 'owner' | 'admin' | 'member' | 'super_admin'
}
```

---

## Features

### 1. AI Staff
Deploy virtual AI agents that handle:
- Lead follow-up and nurturing
- Content creation and scheduling
- Customer support responses
- Email and SMS automation

### 2. Content Studio
- AI-powered content generation
- Multi-platform scheduling (Facebook, Instagram, LinkedIn, Twitter)
- Brand voice customization
- Content calendar management

### 3. Analytics Dashboard
- Real-time business metrics
- AI task completion tracking
- Lead pipeline visualization
- Revenue and conversion analytics

### 4. CRM Integration
- GoHighLevel (GHL) native integration
- Vbout whitelabel at crm.liv8.co
- HubSpot connectivity
- Contact sync and pipeline management

### 5. Voice Commands (VAPI)
- Voice-controlled dashboard navigation
- Hands-free content creation
- Voice note transcription

### 6. White-labeling
- Custom branding options
- Reseller dashboard
- Client management portal

---

## API Reference

### Authentication

#### POST /api/auth/login
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "owner",
    "agencyId": "uuid"
  },
  "token": "jwt-token-here"
}
```

#### POST /api/auth/register
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "agencyName": "My Business"
}

Response:
{
  "user": { ... },
  "token": "jwt-token-here",
  "agency": {
    "id": "uuid",
    "name": "My Business"
  }
}
```

#### GET /api/auth/me
Returns current user info (requires Bearer token)

### Billing

#### GET /api/billing/plans
Returns available pricing plans

#### POST /api/billing/create-checkout
Creates Stripe checkout session

#### POST /api/billing/webhook
Stripe webhook handler

### Content

#### POST /api/content/generate
Generate AI content

#### GET /api/content/scheduled
Get scheduled content

---

## Integrations

### GoHighLevel (GHL)
- OAuth2 authentication flow
- Contact and pipeline sync
- Workflow triggers
- Sub-account management

### Vbout CRM
- Whitelabeled at crm.liv8.co
- Marketing automation
- Email campaigns
- Lead scoring

### Stripe Billing
- Subscription management
- Usage-based billing (AI credits)
- Checkout sessions
- Webhook handling
- Coupon support

### PushLap Growth (Affiliate Tracking)
- Affiliate ID capture on landing page
- Tracked through checkout flow
- Commission attribution via `client_reference_id`

### MakeForm (Booking)
- Embedded scheduling form on landing page
- Strategy call booking
- Lead capture integration

---

## Deployment

### Frontend (Render Static Site)

1. **Build Command:** `npm run build`
2. **Publish Directory:** `dist`
3. **Environment Variables:**
   - `VITE_API_URL` = Backend URL

4. **SPA Routing:** The `public/_redirects` file handles client-side routing:
```
/* /index.html 200
```

### Backend (Render Web Service)

1. **Build Command:** `npm install`
2. **Start Command:** `npm start` (runs `tsx src/index.ts`)
3. **Environment Variables:** See [Environment Variables](#environment-variables)

### Database Setup

Initialize tables via API (requires admin password):
```bash
curl -X POST https://your-backend/api/auth/init-db \
  -H "Content-Type: application/json" \
  -H "x-admin-password: letsgrow"
```

---

## Chrome Extension

### Installation
1. Open Chrome → Extensions → Enable Developer Mode
2. Click "Load unpacked"
3. Select the `chrome-extension` folder

### Features
- Side panel for quick access
- GHL page integration
- Contact sync shortcuts
- Quick content generation

### Manifest Permissions
```json
{
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.gohighlevel.com/*",
    "https://*.leadconnectorhq.com/*"
  ]
}
```

---

## Affiliate Tracking

### PushLap Growth Integration

The landing page includes PushLap Growth affiliate tracking:

```html
<script
  src="https://pushlapgrowth.com/affiliate-tracker.js"
  data-affiliate
  data-program-id="9acd7ded-50dc-4b98-b698-c78edc0481b3"
  async>
</script>
```

### How It Works
1. Affiliate link brings visitor to landing page
2. `window.affiliateId` is captured and stored in localStorage
3. When user starts checkout, affiliate ID is passed to Stripe as:
   - `client_reference_id`: `{planId}|{affiliateId}`
   - `metadata.affiliateId`: affiliate ID
4. PushLap tracks conversion via Stripe webhook

---

## Pricing Plans

### Individual Plans

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| Starter | $47 | $470 | 1 workspace, 500 AI credits, 2 agents |
| Pro | $97 | $970 | 5 workspaces, 2,000 AI credits, 5 agents |
| Business | $197 | $1,970 | 15 workspaces, 5,000 AI credits, unlimited agents |

### Agency Plans

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| Agency Starter | $297 | $2,970 | 25 client workspaces, 10,000 AI credits |
| Agency Growth | $497 | $4,970 | 50 client workspaces, 25,000 AI credits |
| Enterprise | $997 | $9,970 | Unlimited everything, custom AI training |

---

## Troubleshooting

### "relation 'users' does not exist"
- Database tables not initialized
- Run `POST /api/auth/init-db` with admin password
- Or use admin login bypass with password `letsgrow`

### Build fails with "JavaScript heap out of memory"
- Backend uses `tsx` for direct TypeScript execution
- No compilation needed - `npm start` runs `tsx src/index.ts`

### Login page shows 404
- Ensure `public/_redirects` file exists with `/* /index.html 200`
- This enables SPA routing on Render

### MakeForm not loading
- Check that embed script is in `index.html`
- Verify `window.makeforms` is available before initializing
- Form initializes via useEffect with retry logic

---

## Support

- **GitHub Issues:** https://github.com/SuessVilliano/LIV8-OS/issues
- **Email:** support@liv8.ai

---

## License

Proprietary - All rights reserved.

---

*Last updated: February 2026*
