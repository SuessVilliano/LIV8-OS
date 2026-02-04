# LIV8 GHL Backend

Secure multi-tenant backend for LIV8 GHL Operator and Setup OS.

## Features

- 🔒 Encrypted GHL token storage (no tokens on client)
- 🏢 Multi-tenant architecture (Agency → Location → User)
- 🔑 JWT authentication
- 📊 Complete audit logging
- 🤖 HighLevel MCP integration
- ✅ Strict schema validation (Zod)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Update with your values:
- `POSTGRES_URL`: Your Vercel Postgres connection string
- `JWT_SECRET`: Random secret for JWT signing
- `GHL_TEST_TOKEN`: Your GHL PIT token (for testing)
- `HIGHLEVEL_MCP_URL`: https://services.leadconnectorhq.com/mcp/

### 3. Initialize Database

Run the schema migration:

```bash
psql $POSTGRES_URL < src/db/schema.sql
```

### 4. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Authentication

**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "agencyName": "My Agency"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**POST /api/auth/connect-location**
```json
{
  "locationId": "ghl-location-id",
  "locationName": "Location Name",
  "ghlToken": "pit-..."
}
```
*Requires: `Authorization: Bearer <JWT>`*

**GET /api/auth/me**

Get current user and locations.
*Requires: `Authorization: Bearer <JWT>`*

### Operator

**POST /api/operator/execute-plan**
```json
{
  "plan": { /* ActionPlan object */ },
  "context": { /* PageContext object */ }
}
```
*Requires: `Authorization: Bearer <JWT>`*

**GET /api/operator/audit-log?limit=100**

Get audit log for agency.
*Requires: `Authorization: Bearer <JWT>`*

### Unified Inbox

**GET /api/inbox/conversations**
- List conversations with filtering by channel, status
- Returns contacts with conversation data

**POST /api/inbox/conversations/:id/send**
- Send message in a conversation
- Routes to appropriate channel (SMS, Email, WhatsApp, Voice, Live Chat)

**GET /api/inbox/analytics**
- Get inbox statistics (total, unread, by channel)

### AnyChat Live Chat

**POST /api/anychat/config**
- Save AnyChat configuration with channel routing

**POST /api/anychat/webhook/:locationId**
- Webhook receiver for AnyChat events
- Auto-logs messages to unified inbox
- Routes to team channels (Slack/Telegram/Discord)
- Triggers escalation detection

**POST /api/anychat/test-channel**
- Test connection to Slack/Telegram/Discord

### OpenClaw AI Manager API

**GET /api/openclaw/context**
- Get business context for AI responses
- *Requires: `x-openclaw-key`, `x-location-id` headers*

**GET /api/openclaw/conversations**
- Get recent conversations for AI context

**GET /api/openclaw/inbox/summary**
- Quick summary of inbox state

**POST /api/openclaw/suggest**
- Get response guidelines based on business context

### SMS Gateway

**POST /api/sms/send**
- Send SMS via configured provider (Twilio/Telnyx/TextLink)

**POST /api/textlink/send**
- Send SMS via TextLink Android gateway

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - POSTGRES_URL
# - JWT_SECRET
# - HIGHLEVEL_MCP_URL
```

## Security

- GHL tokens encrypted with AES-256-GCM
- JWT for session management (7-day expiry)
- CORS restricted to extension and dashboard origins
- All actions logged to audit trail
- Multi-tenant data isolation

## Testing

```bash
npm test
```

## Project Structure

```
backend/
├── src/
│   ├── api/                    # API routes
│   │   ├── auth.ts             # Authentication
│   │   ├── operator.ts         # Operator execution
│   │   ├── inbox.ts            # Unified multi-channel inbox
│   │   ├── anychat.ts          # AnyChat live chat webhooks
│   │   ├── openclaw.ts         # OpenClaw AI manager context API
│   │   ├── sms.ts              # Unified SMS (Twilio/Telnyx)
│   │   ├── textlink.ts         # TextLink SMS gateway
│   │   ├── late.ts             # Late social media (13 platforms)
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── auth.ts             # Auth service
│   │   ├── mcp-client.ts       # HighLevel MCP client
│   │   ├── anychat.ts          # AnyChat service layer
│   │   ├── escalation-detector.ts # Smart escalation logic
│   │   ├── textlink.ts         # TextLink API wrapper
│   │   └── ...
│   ├── db/                     # Database
│   │   ├── schema.sql          # PostgreSQL schema
│   │   ├── index.ts            # DB queries & encryption
│   │   └── conversations.ts    # Unified inbox schema
│   ├── lib/                    # Shared utilities
│   │   └── schemas.ts          # Zod validation schemas
│   └── index.ts                # Express server
├── package.json
├── tsconfig.json
└── vercel.json
```
