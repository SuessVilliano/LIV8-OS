/**
 * Support & Education Page
 * Comprehensive help documentation, guides, and tutorials for LIV8 OS
 */

import { useState } from 'react';
import {
    HelpCircle,
    BookOpen,
    Chrome,
    Puzzle,
    Users,
    MessageCircle,
    Search,
    ChevronRight,
    ChevronDown,
    Workflow,
    Palette,
    Mail,
    Globe,
    Lightbulb,
    Play,
    AlertCircle
} from 'lucide-react';

// Documentation sections
const DOCUMENTATION = {
    'getting-started': {
        title: 'Getting Started',
        icon: BookOpen,
        articles: [
            {
                id: 'introduction',
                title: 'Welcome to LIV8 OS',
                content: `
# Welcome to LIV8 OS

LIV8 OS is the world's first **AI-Powered Operating System** for GoHighLevel and VBout CRM users. We replace manual virtual assistants with intelligent AI agents that configure, monitor, and optimize your business operations automatically.

## How It Works

1. **Connect Your CRM**: Link your GHL Location or VBout account via OAuth or API key.
2. **Build Your Brand Brain**: We analyze your website and business info to create an AI "Brand Brain" that understands your business.
3. **Deploy AI Staff**: Select from specialized AI roles (Receptionist, Sales Agent, Support Agent, Marketing Manager, etc.).
4. **Automate Everything**: Our MCP (Model Context Protocol) engine builds pipelines, workflows, and automations in real-time.

## Core Features

- **AI Staff**: 24/7 intelligent agents handling calls, messages, and tasks
- **Brand Brain**: Unified brand identity that informs all AI interactions
- **Studio**: Generate images, videos, websites, and emails with AI
- **Workflows**: Pre-built automation templates synced to your CRM
- **Analytics**: Real-time insights into your AI team's performance
- **Opportunities**: CRM pipeline management with AI-driven insights
                `
            },
            {
                id: 'quick-start',
                title: 'Quick Start Guide',
                content: `
# Quick Start Guide

Get up and running with LIV8 OS in under 10 minutes.

## Step 1: Create Your Account

1. Visit the LIV8 OS landing page
2. Click "Get Started" or "Login"
3. Enter your email and create a password
4. Enable "Remember Me" for persistent sessions

## Step 2: Connect Your CRM

Choose your CRM platform:

**For GoHighLevel:**
- Enter your GHL Location ID
- Provide your API Key (found in Settings > API)
- Click "Connect"

**For VBout (LIV8 CRM):**
- Enter your VBout email
- Provide your VBout API key
- Click "Connect"

## Step 3: Complete Onboarding

Follow the conversational setup wizard:
1. Enter your business name and website
2. Add competitors and industry leaders
3. Connect social media accounts
4. Choose your brand voice
5. Select AI staff members
6. Upload training documents (optional)

## Step 4: Explore Your Dashboard

Once onboarded, you'll see:
- **Core Pulse**: System health and CRM status
- **Quick Stats**: Conversations, content, leads, revenue
- **Recent Activity**: AI staff actions and events
- **Active Workflows**: Running automations
                `
            },
            {
                id: 'system-requirements',
                title: 'System Requirements',
                content: `
# System Requirements

## Browser Support

LIV8 OS works best with modern browsers:
- **Chrome** 90+ (Recommended)
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## Chrome Extension

For voice commands and enhanced GHL integration:
- Chrome browser required
- Microphone permissions needed
- Active internet connection

## API Integrations

Required credentials:
- **GHL**: Location ID + API Key
- **VBout**: API Key
- **Optional**: OpenAI, Google, Anthropic API keys for enhanced AI features

## Network

- Stable internet connection
- WebSocket support for real-time updates
- CORS-enabled environment
                `
            }
        ]
    },
    'ai-staff': {
        title: 'AI Staff',
        icon: Users,
        articles: [
            {
                id: 'ai-staff-overview',
                title: 'Understanding AI Staff',
                content: `
# Understanding AI Staff

AI Staff are intelligent agents that work 24/7 to handle your business operations. Each role is specialized for specific tasks.

## Available Roles

### AI Receptionist
- Answers inbound calls
- Handles FAQs using Brand Brain
- Routes complex queries to humans
- Captures lead information

### Sales Agent
- Qualifies leads automatically
- Handles objections with training
- Presents offers and packages
- Follows up on opportunities

### Support Agent
- Responds to customer inquiries
- Schedules appointments
- Processes common requests
- Escalates when needed

### Marketing Manager
- Creates social media content
- Manages email campaigns
- Maintains brand consistency
- Analyzes performance

### Operations Specialist
- Manages CRM hygiene
- Monitors pipeline health
- Automates routine tasks
- Generates reports

### AI Manager
- Supervises all AI staff
- Sends daily summaries
- Handles escalations
- Connects via Telegram/Discord/Slack
                `
            },
            {
                id: 'training-ai-staff',
                title: 'Training Your AI Staff',
                content: `
# Training Your AI Staff

Your AI staff learn from your Brand Brain and uploaded documents.

## Brand Brain Training

The Brand Brain contains:
- Business identity (name, industry, tagline)
- Brand voice and tone
- Target audience profiles
- Unique value proposition
- Competitor analysis
- Goals and pain points

## Document Training

Upload documents to train AI staff:
- **SOPs**: Standard operating procedures
- **FAQs**: Common questions and answers
- **Scripts**: Sales and support scripts
- **Product Info**: Service descriptions, pricing

Supported formats: PDF, DOC, DOCX, TXT, MD

## Knowledge Base

Add specific knowledge items:
1. Go to **Brand Hub > Knowledge Base**
2. Click "Add Item"
3. Enter title, category, and content
4. AI staff will reference this information

## Continuous Learning

AI staff improve over time:
- Review conversation logs
- Provide feedback on responses
- Update Brand Brain regularly
- Add new training documents
                `
            },
            {
                id: 'managing-ai-staff',
                title: 'Managing AI Staff',
                content: `
# Managing AI Staff

Monitor and control your AI team from the Staff page.

## Staff Dashboard

View all active AI staff:
- Status (Active/Paused/Training)
- Recent activity
- Performance metrics
- Last action timestamp

## Quick Actions

**Settings Icon**: Configure agent behavior
- Update prompt templates
- Adjust response parameters
- Set escalation rules

**Zap Icon**: Trigger quick actions
- Force sync with CRM
- Refresh training data
- Run diagnostic tests

## Performance Monitoring

Track key metrics:
- Response time
- Resolution rate
- Customer satisfaction
- Tasks completed

## Pausing/Resuming

Temporarily disable an AI staff member:
1. Click the agent card
2. Toggle "Active" switch
3. Agent stops processing new tasks
4. Re-enable anytime
                `
            }
        ]
    },
    'chrome-extension': {
        title: 'Chrome Extension',
        icon: Chrome,
        articles: [
            {
                id: 'extension-installation',
                title: 'Installing the Extension',
                content: `
# Installing the Chrome Extension

The LIV8 Chrome Extension enables voice commands and enhanced GHL integration.

## Installation Steps

### From Chrome Web Store (Recommended)
1. Visit the Chrome Web Store
2. Search for "LIV8 OS"
3. Click "Add to Chrome"
4. Confirm the installation
5. Pin the extension to your toolbar

### Manual Installation (Developer Mode)
1. Download the extension ZIP from your dashboard
2. Navigate to \`chrome://extensions\`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the extracted folder
6. Pin the LIV8 icon to your toolbar

## Required Permissions

The extension requests:
- **Microphone**: For voice commands
- **Tabs**: To inject into GHL pages
- **Storage**: To save preferences
- **Cookies**: For authentication

## First Launch

1. Click the LIV8 icon in your toolbar
2. Log in with your LIV8 OS credentials
3. Grant microphone access when prompted
4. You're ready to use voice commands!
                `
            },
            {
                id: 'voice-commands',
                title: 'Using Voice Commands',
                content: `
# Using Voice Commands

Control your CRM with natural language voice commands.

## Activating Voice Mode

1. Click the LIV8 extension icon
2. Click the microphone button (or press hotkey)
3. Speak your command naturally
4. Review the action plan before execution

## Example Commands

### Contact Management
- "Send an SMS to John Doe saying his appointment is confirmed"
- "Create a task for Sarah to follow up tomorrow"
- "Add a note to this contact about the pricing discussion"

### Pipeline Actions
- "Move this deal to the Qualified stage"
- "Create a new opportunity for $5,000"
- "What's the total value of deals in negotiation?"

### Information Queries
- "What's the sentiment of my last conversation with this contact?"
- "Show me all contacts tagged as VIP"
- "How many appointments are scheduled this week?"

### Automation Triggers
- "Run the welcome sequence for new leads"
- "Trigger the missed call recovery workflow"
- "Send the monthly newsletter"

## Voice Command Tips

- Speak clearly and naturally
- Use specific names when possible
- Review the action plan before confirming
- Say "cancel" to abort a command
                `
            },
            {
                id: 'extension-settings',
                title: 'Extension Settings',
                content: `
# Extension Settings

Customize your Chrome extension experience.

## Accessing Settings

1. Right-click the LIV8 extension icon
2. Select "Options" or "Settings"
3. Configure your preferences

## Available Settings

### Voice Recognition
- **Language**: Select your preferred language
- **Sensitivity**: Adjust microphone sensitivity
- **Auto-activate**: Enable voice on GHL pages

### Appearance
- **Theme**: Match OS theme or override
- **Position**: Panel position (right/bottom)
- **Compact Mode**: Minimal interface

### Hotkeys
- **Activate Voice**: Default Ctrl+Shift+L
- **Quick Action**: Customizable
- **Close Panel**: Escape key

### Notifications
- **Sound Effects**: Enable/disable audio feedback
- **Desktop Notifications**: Action confirmations
- **Error Alerts**: Failure notifications

### Privacy
- **Voice History**: Enable/disable storage
- **Analytics**: Usage data collection
- **Clear Data**: Reset extension state
                `
            }
        ]
    },
    'integrations': {
        title: 'CRM Integrations',
        icon: Puzzle,
        articles: [
            {
                id: 'ghl-integration',
                title: 'GoHighLevel Integration',
                content: `
# GoHighLevel Integration

Connect LIV8 OS to your GHL account for full CRM control.

## Prerequisites

- Active GHL account
- Location-level access
- API key with appropriate scopes

## Finding Your Credentials

### Location ID
1. Log into GoHighLevel
2. Go to Settings > Business Profile
3. Copy the Location ID from the URL or settings

### API Key
1. Go to Settings > API
2. Click "Create API Key"
3. Enable required scopes:
   - Contacts (read/write)
   - Opportunities (read/write)
   - Conversations (read/write)
   - Calendars (read/write)
   - Workflows (read/write)

## Connection Process

1. In LIV8 OS, go to Settings > Integrations
2. Enter your Location ID
3. Paste your API Key
4. Click "Connect"
5. Test the connection

## Available Features

With GHL connected:
- Sync contacts and opportunities
- Trigger workflows remotely
- Send SMS/email through GHL
- Access pipeline data
- Manage appointments
- Use GHL Social Planner
                `
            },
            {
                id: 'vbout-integration',
                title: 'VBout Integration',
                content: `
# VBout (LIV8 CRM) Integration

Connect to VBout for email marketing and automation.

## Getting Started

VBout is a full-featured marketing automation platform that integrates seamlessly with LIV8 OS.

## API Key Setup

1. Log into your VBout account
2. Navigate to Settings > API
3. Generate a new API key
4. Copy the key to your clipboard

## Connecting in LIV8 OS

1. Go to Settings > Integrations
2. Select "VBout" or "LIV8 CRM"
3. Enter your API key
4. Click "Connect"

## Available Features

- Email campaign management
- Contact list synchronization
- Automation workflow triggers
- Email template access
- Analytics integration
- Webhook notifications

## Webhook Configuration

For real-time sync:
1. In VBout, go to Settings > Webhooks
2. Add your LIV8 webhook URL
3. Select events to track
4. Enable signature verification
                `
            },
            {
                id: 'api-keys',
                title: 'Managing API Keys',
                content: `
# Managing API Keys

Securely store and manage your API credentials.

## Supported APIs

LIV8 OS integrates with:
- **OpenAI**: GPT models for AI responses
- **Google**: Gemini AI and other services
- **Anthropic**: Claude AI models
- **GHL**: GoHighLevel CRM
- **VBout**: Marketing automation

## Adding API Keys

1. Go to Settings > API Keys
2. Click "Add Key"
3. Select the service
4. Paste your API key
5. Click "Save"

## Security Features

Your API keys are protected:
- **AES-256-GCM Encryption**: Keys encrypted at rest
- **Secure Transmission**: HTTPS only
- **No Plain Text Storage**: Keys never stored in plain text
- **Per-User Isolation**: Each user's keys are separate

## Testing API Keys

Verify your keys work:
1. Click "Test" next to the key
2. LIV8 sends a test request
3. Green checkmark = working
4. Red X = invalid key

## Rotating Keys

Best practice: Rotate keys periodically
1. Generate new key in the service
2. Update in LIV8 OS Settings
3. Test the new key
4. Delete the old key from the service
                `
            }
        ]
    },
    'workflows': {
        title: 'Workflows',
        icon: Workflow,
        articles: [
            {
                id: 'workflow-templates',
                title: 'Workflow Templates',
                content: `
# Workflow Templates

Pre-built automation templates ready to deploy.

## Available Templates

### Missed Call Recovery
Automatically follows up on missed calls:
- Triggers on "No Answer" call status
- Sends immediate SMS
- Starts qualification conversation
- Adds to nurture sequence

### Speed-to-Lead
Responds instantly to new leads:
- Triggers on new contact creation
- Sends welcome SMS within seconds
- Schedules follow-up call
- Notifies sales agent

### Review Request
Collects customer reviews:
- Triggers after appointment completion
- Sends review request SMS
- Includes direct Google review link
- Tracks responses

### Appointment Reminder
Reduces no-shows:
- Sends reminder 24 hours before
- Sends reminder 1 hour before
- Allows easy rescheduling
- Confirms attendance

### Nurture Sequence
Long-term lead nurturing:
- Multi-step email/SMS sequence
- Personalized content
- Behavioral triggers
- Exit on conversion

### Re-engagement Campaign
Wins back cold leads:
- Identifies inactive contacts
- Sends special offers
- Multi-channel approach
- Measures reactivation
                `
            },
            {
                id: 'creating-workflows',
                title: 'Creating Custom Workflows',
                content: `
# Creating Custom Workflows

Build your own automations with AI assistance.

## Using the AI Workflow Builder

1. Go to Workflows page
2. Click "Create with AI"
3. Describe what you want to automate
4. AI generates the workflow structure
5. Review and customize
6. Deploy to your CRM

## Example Prompts

- "Create a workflow that sends a thank you email after purchase"
- "Build an onboarding sequence for new clients"
- "Automate follow-ups for quotes not converted after 3 days"
- "Set up a birthday campaign for all contacts"

## Workflow Components

### Triggers
- Contact created/updated
- Form submitted
- Appointment scheduled
- Deal stage changed
- Tag added/removed
- Custom webhook

### Actions
- Send SMS/Email
- Create task
- Add tag
- Update contact field
- Move pipeline stage
- Wait/delay
- Branch (if/else)

### Conditions
- Contact field values
- Tag presence
- Time-based rules
- Previous actions
- Custom logic

## Deploying Workflows

1. Click "Deploy" on your workflow
2. Select target CRM (GHL or VBout)
3. Confirm deployment
4. Workflow goes live immediately
                `
            }
        ]
    },
    'studio': {
        title: 'Studio',
        icon: Palette,
        articles: [
            {
                id: 'image-generation',
                title: 'Generating Images',
                content: `
# Generating Images with Studio

Create stunning visuals with AI-powered image generation.

## Getting Started

1. Go to Studio
2. Select "Image" tab
3. Enter your prompt
4. Choose style and size
5. Click "Generate"

## Writing Effective Prompts

Good prompts include:
- **Subject**: What you want to see
- **Style**: Artistic style (realistic, cartoon, etc.)
- **Mood**: Lighting, atmosphere, emotion
- **Details**: Colors, composition, background

### Examples
- "Professional real estate photo of modern kitchen with natural lighting"
- "Social media post for solar company showing sunny rooftop installation"
- "Minimalist logo design for dental clinic in blue and white"

## Image Styles

- **Photorealistic**: Looks like real photography
- **Illustration**: Hand-drawn artistic style
- **3D Render**: Computer-generated 3D look
- **Watercolor**: Soft, painterly effect
- **Minimalist**: Clean, simple design

## Size Options

- **Square** (1024x1024): Instagram, profile pictures
- **Landscape** (1792x1024): Facebook, LinkedIn banners
- **Portrait** (1024x1792): Stories, Pinterest pins

## Saving & Exporting

Generated images are automatically saved:
- View in "History" tab
- Download in original resolution
- Copy URL for sharing
- Sync to your asset library
                `
            },
            {
                id: 'website-builder',
                title: 'Building Websites',
                content: `
# Building Websites with Studio

Create professional landing pages and websites instantly.

## Creating a Website

1. Go to Studio
2. Select "Website" tab
3. Describe your website
4. Include Brand Brain context
5. Click "Generate"

## Website Types

- **Landing Pages**: Single-page conversion focused
- **Business Sites**: Multi-section company pages
- **Portfolios**: Showcase work and services
- **Event Pages**: Promotions and registrations

## Customization

After generation:
- Edit content directly
- Change colors to match brand
- Add/remove sections
- Upload your own images
- Modify call-to-action buttons

## Publishing

Publish to a liv8sites.com subdomain:
1. Click "Publish"
2. Choose your subdomain name
3. Review settings
4. Click "Go Live"

Your site will be available at:
\`yourname.liv8sites.com\`

## Custom Domains

Connect your own domain:
1. Go to website settings
2. Enter your domain name
3. Update DNS records as shown
4. Wait for verification
5. SSL certificate auto-configured
                `
            },
            {
                id: 'email-templates',
                title: 'Creating Email Templates',
                content: `
# Creating Email Templates

Design professional email templates with AI.

## Template Creation

1. Go to Studio
2. Select "Email" tab
3. Describe your email purpose
4. Specify tone and call-to-action
5. Click "Generate"

## Email Types

- **Welcome**: New subscriber onboarding
- **Promotional**: Sales and offers
- **Newsletter**: Regular updates
- **Transactional**: Receipts, confirmations
- **Re-engagement**: Win back inactive contacts

## Customization Options

- **Colors**: Match your brand palette
- **Images**: Add product photos, logos
- **Buttons**: Configure CTA buttons
- **Footer**: Legal text, unsubscribe links
- **Personalization**: Merge fields for names

## Best Practices

1. Keep subject lines under 50 characters
2. Use a single, clear call-to-action
3. Optimize for mobile viewing
4. Include your logo
5. Test before sending

## Syncing to CRM

Export templates to your CRM:
1. Click "Export to GHL" or "Export to VBout"
2. Select destination folder
3. Confirm export
4. Template ready to use in campaigns
                `
            }
        ]
    },
    'troubleshooting': {
        title: 'Troubleshooting',
        icon: AlertCircle,
        articles: [
            {
                id: 'connection-issues',
                title: 'Connection Issues',
                content: `
# Troubleshooting Connection Issues

Common problems and solutions for CRM connectivity.

## CRM Won't Connect

### Check Credentials
- Verify Location ID is correct (GHL)
- Confirm API key has proper scopes
- Ensure key hasn't expired

### Check Network
- Verify internet connection
- Disable VPN temporarily
- Check if CRM is accessible directly

### Clear Cache
1. Go to Settings
2. Click "Clear Cache"
3. Log out and back in
4. Try connecting again

## Sync Not Working

### Force Sync
1. Go to Settings > Integrations
2. Click "Force Sync"
3. Wait for sync to complete
4. Check for error messages

### Check Webhooks
- Verify webhook URL is correct
- Ensure webhook is active in CRM
- Check webhook logs for errors

## API Errors

### Rate Limiting
If you see "429 Too Many Requests":
- Wait 5-10 minutes
- Reduce sync frequency
- Check for runaway automations

### Authentication Failed
If you see "401 Unauthorized":
- Regenerate API key in CRM
- Update key in LIV8 OS
- Test connection again

### Invalid Scope
If operations fail:
- Review required permissions
- Regenerate key with all scopes
- Re-authorize the connection
                `
            },
            {
                id: 'ai-issues',
                title: 'AI Staff Issues',
                content: `
# Troubleshooting AI Staff Issues

Fix common problems with your AI team.

## AI Not Responding

### Check Status
1. Go to Staff page
2. Verify agent is "Active"
3. Check "Last Active" timestamp
4. Review error indicators

### Verify API Keys
AI staff require valid API keys:
1. Go to Settings > API Keys
2. Test OpenAI/Anthropic key
3. Add or update if needed

### Check Brand Brain
AI needs Brand Brain data:
1. Go to Brand Hub
2. Verify Brand Brain is populated
3. Update if missing information

## Poor Quality Responses

### Update Training
1. Review and update Brand Brain
2. Add more knowledge base items
3. Upload additional documents
4. Be more specific in brand voice

### Adjust Settings
1. Go to Staff > Settings icon
2. Increase response quality setting
3. Add specific constraints
4. Review conversation examples

## Hallucinations

If AI provides incorrect info:
1. Add corrections to Knowledge Base
2. Update Brand Brain facts
3. Enable stricter guardrails
4. Review and adjust prompts
                `
            },
            {
                id: 'performance-issues',
                title: 'Performance Issues',
                content: `
# Troubleshooting Performance Issues

Speed up LIV8 OS and fix slowdowns.

## Slow Loading

### Clear Browser Cache
1. Press Ctrl+Shift+Delete
2. Select cached images and files
3. Clear data
4. Refresh LIV8 OS

### Reduce Data Load
1. Limit date ranges in Analytics
2. Close unused tabs
3. Reduce sync frequency

### Check Extensions
Browser extensions can slow down:
1. Disable other extensions temporarily
2. Test LIV8 OS performance
3. Re-enable one by one

## Data Not Updating

### Force Refresh
- Press Ctrl+R to refresh
- Pull-to-refresh on mobile
- Click refresh icons in widgets

### Check Sync Status
1. Look for sync indicators
2. Verify last sync time
3. Force sync if needed

## Mobile Issues

### Responsive Mode
1. Ensure browser is updated
2. Try landscape orientation
3. Clear mobile browser cache

### PWA Issues
1. Remove PWA from home screen
2. Clear PWA cache
3. Re-add from browser
                `
            }
        ]
    }
};

// FAQ data
const FAQS = [
    {
        question: 'How do I reset my password?',
        answer: 'Click "Forgot Password" on the login page, enter your email, and follow the reset link sent to your inbox.'
    },
    {
        question: 'Can I use LIV8 OS with multiple GHL locations?',
        answer: 'Yes! Each location requires a separate LIV8 OS account or can be managed through the Agencies feature with proper permissions.'
    },
    {
        question: 'How many AI staff can I have active?',
        answer: 'Your plan determines the number of active AI staff. Most plans include 5 AI staff members with options to add more.'
    },
    {
        question: 'Is my data secure?',
        answer: 'Yes. We use AES-256-GCM encryption for API keys, HTTPS for all communications, and follow industry best practices for data security.'
    },
    {
        question: 'Can AI staff make outbound calls?',
        answer: 'Yes, with Retell AI or Bland AI integration configured. Go to Settings > Voice Credentials to set up outbound calling.'
    },
    {
        question: 'How do I cancel my subscription?',
        answer: 'Go to Settings > Billing and click "Cancel Subscription". Your access continues until the end of the billing period.'
    },
    {
        question: 'Does LIV8 OS work with VBout/LIV8 CRM?',
        answer: 'Yes! LIV8 OS fully supports both GoHighLevel and VBout (LIV8 CRM) with feature parity across platforms.'
    },
    {
        question: 'How do I get help if I\'m stuck?',
        answer: 'Click the "Live Support" link in Settings or email support@liv8os.com. Our team typically responds within 24 hours.'
    }
];

export default function Support() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('getting-started');
    const [activeArticle, setActiveArticle] = useState('introduction');
    const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());

    const currentCategory = DOCUMENTATION[activeCategory as keyof typeof DOCUMENTATION];
    const currentArticle = currentCategory?.articles.find(a => a.id === activeArticle);

    const toggleFaq = (index: number) => {
        const newExpanded = new Set(expandedFaqs);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedFaqs(newExpanded);
    };

    // Filter articles by search
    const filteredResults = searchQuery.trim() ? Object.entries(DOCUMENTATION).flatMap(([catId, cat]) =>
        cat.articles.filter(a =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.content.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(a => ({ ...a, categoryId: catId, categoryTitle: cat.title }))
    ) : [];

    return (
        <div className="min-h-screen bg-[var(--os-bg)] text-[var(--os-text)] p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-neuro to-purple-600 flex items-center justify-center shadow-lg shadow-neuro/20">
                            <HelpCircle className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Support & Education</h1>
                            <p className="text-[var(--os-text-muted)]">Everything you need to master LIV8 OS</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-2xl mt-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--os-text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search documentation, guides, and FAQs..."
                            className="w-full pl-12 pr-4 py-4 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl text-sm focus:border-neuro focus:ring-2 focus:ring-neuro/20 outline-none transition-all"
                        />
                        {/* Search Results Dropdown */}
                        {filteredResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl shadow-xl max-h-80 overflow-auto z-50">
                                {filteredResults.map((result, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setActiveCategory(result.categoryId);
                                            setActiveArticle(result.id);
                                            setSearchQuery('');
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-[var(--os-bg)] border-b border-[var(--os-border)] last:border-0"
                                    >
                                        <div className="font-medium text-sm">{result.title}</div>
                                        <div className="text-xs text-[var(--os-text-muted)]">{result.categoryTitle}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                {/* Quick Links */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { icon: Play, title: 'Quick Start', desc: 'Get started fast', action: () => { setActiveCategory('getting-started'); setActiveArticle('quick-start'); } },
                        { icon: Chrome, title: 'Chrome Extension', desc: 'Install & setup', action: () => { setActiveCategory('chrome-extension'); setActiveArticle('extension-installation'); } },
                        { icon: Users, title: 'AI Staff Guide', desc: 'Train your team', action: () => { setActiveCategory('ai-staff'); setActiveArticle('ai-staff-overview'); } },
                        { icon: AlertCircle, title: 'Troubleshooting', desc: 'Fix common issues', action: () => { setActiveCategory('troubleshooting'); setActiveArticle('connection-issues'); } },
                    ].map((link, i) => (
                        <button
                            key={i}
                            onClick={link.action}
                            className="p-5 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl hover:border-neuro/50 hover:shadow-lg transition-all group text-left"
                        >
                            <div className="h-10 w-10 rounded-lg bg-neuro/10 flex items-center justify-center mb-3 group-hover:bg-neuro/20 transition-colors">
                                <link.icon className="h-5 w-5 text-neuro" />
                            </div>
                            <h3 className="font-semibold text-sm">{link.title}</h3>
                            <p className="text-xs text-[var(--os-text-muted)] mt-1">{link.desc}</p>
                        </button>
                    ))}
                </section>

                {/* Main Content */}
                <div className="flex gap-8">
                    {/* Sidebar Navigation */}
                    <aside className="w-64 shrink-0 hidden lg:block">
                        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4 sticky top-6">
                            <h3 className="text-xs font-bold text-[var(--os-text-muted)] uppercase tracking-wider mb-4 px-2">
                                Documentation
                            </h3>
                            <nav className="space-y-1">
                                {Object.entries(DOCUMENTATION).map(([id, category]) => {
                                    const Icon = category.icon;
                                    const isActive = activeCategory === id;
                                    return (
                                        <div key={id}>
                                            <button
                                                onClick={() => {
                                                    setActiveCategory(id);
                                                    setActiveArticle(category.articles[0].id);
                                                }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                                                    ? 'bg-neuro/10 text-neuro font-medium'
                                                    : 'text-[var(--os-text-muted)] hover:bg-[var(--os-bg)] hover:text-[var(--os-text)]'
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {category.title}
                                            </button>
                                            {isActive && (
                                                <div className="ml-6 mt-1 space-y-1">
                                                    {category.articles.map(article => (
                                                        <button
                                                            key={article.id}
                                                            onClick={() => setActiveArticle(article.id)}
                                                            className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${activeArticle === article.id
                                                                ? 'text-neuro font-medium'
                                                                : 'text-[var(--os-text-muted)] hover:text-[var(--os-text)]'
                                                                }`}
                                                        >
                                                            {article.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </nav>
                        </div>
                    </aside>

                    {/* Article Content */}
                    <main className="flex-1 min-w-0">
                        <article className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-8">
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-2 text-xs text-[var(--os-text-muted)] mb-6">
                                <span>{currentCategory?.title}</span>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-[var(--os-text)]">{currentArticle?.title}</span>
                            </div>

                            {/* Render markdown-like content */}
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                {currentArticle?.content.split('\n').map((line, i) => {
                                    if (line.startsWith('# ')) {
                                        return <h1 key={i} className="text-2xl font-bold mb-6">{line.replace('# ', '')}</h1>;
                                    }
                                    if (line.startsWith('## ')) {
                                        return <h2 key={i} className="text-xl font-bold mt-8 mb-4">{line.replace('## ', '')}</h2>;
                                    }
                                    if (line.startsWith('### ')) {
                                        return <h3 key={i} className="text-lg font-semibold mt-6 mb-3">{line.replace('### ', '')}</h3>;
                                    }
                                    if (line.startsWith('- ') || line.startsWith('* ')) {
                                        return <li key={i} className="list-disc ml-6 text-[var(--os-text-muted)] mb-2">{line.replace(/^[-*]\s/, '')}</li>;
                                    }
                                    if (line.match(/^\d\./)) {
                                        return <li key={i} className="list-decimal ml-6 text-[var(--os-text-muted)] mb-2">{line.replace(/^\d\.\s/, '')}</li>;
                                    }
                                    if (line.startsWith('**') && line.endsWith('**')) {
                                        return <p key={i} className="font-bold mb-2">{line.replace(/\*\*/g, '')}</p>;
                                    }
                                    if (line.trim() === '') {
                                        return <br key={i} />;
                                    }
                                    // Handle inline formatting
                                    const formatted = line
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/`(.*?)`/g, '<code class="bg-[var(--os-bg)] px-1.5 py-0.5 rounded text-neuro text-sm">$1</code>');
                                    return <p key={i} className="text-[var(--os-text-muted)] leading-7 mb-4" dangerouslySetInnerHTML={{ __html: formatted }} />;
                                })}
                            </div>

                            {/* Article Navigation */}
                            <div className="flex items-center justify-between pt-8 mt-8 border-t border-[var(--os-border)]">
                                {currentCategory?.articles.findIndex(a => a.id === activeArticle) > 0 ? (
                                    <button
                                        onClick={() => {
                                            const idx = currentCategory.articles.findIndex(a => a.id === activeArticle);
                                            setActiveArticle(currentCategory.articles[idx - 1].id);
                                        }}
                                        className="flex items-center gap-2 text-sm text-[var(--os-text-muted)] hover:text-neuro transition-colors"
                                    >
                                        <ChevronRight className="h-4 w-4 rotate-180" />
                                        Previous
                                    </button>
                                ) : <div />}
                                {currentCategory?.articles.findIndex(a => a.id === activeArticle) < currentCategory?.articles.length - 1 ? (
                                    <button
                                        onClick={() => {
                                            const idx = currentCategory.articles.findIndex(a => a.id === activeArticle);
                                            setActiveArticle(currentCategory.articles[idx + 1].id);
                                        }}
                                        className="flex items-center gap-2 text-sm text-[var(--os-text-muted)] hover:text-neuro transition-colors"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                ) : <div />}
                            </div>
                        </article>

                        {/* FAQ Section */}
                        <section className="mt-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-neuro" />
                                Frequently Asked Questions
                            </h2>
                            <div className="space-y-3">
                                {FAQS.map((faq, i) => (
                                    <div key={i} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => toggleFaq(i)}
                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--os-bg)] transition-colors"
                                        >
                                            <span className="font-medium text-sm">{faq.question}</span>
                                            <ChevronDown className={`h-4 w-4 text-[var(--os-text-muted)] transition-transform ${expandedFaqs.has(i) ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expandedFaqs.has(i) && (
                                            <div className="px-4 pb-4 text-sm text-[var(--os-text-muted)] leading-relaxed">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Contact Support */}
                        <section className="mt-8 bg-gradient-to-r from-neuro/10 to-purple-500/10 border border-neuro/20 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-neuro/20 flex items-center justify-center">
                                    <Lightbulb className="h-6 w-6 text-neuro" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg mb-2">Still need help?</h3>
                                    <p className="text-sm text-[var(--os-text-muted)] mb-4">
                                        Our support team is ready to assist you with any questions or issues.
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <a
                                            href="mailto:support@liv8os.com"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-neuro text-white rounded-lg text-sm font-medium hover:bg-neuro/90 transition-colors"
                                        >
                                            <Mail className="h-4 w-4" />
                                            Email Support
                                        </a>
                                        <a
                                            href="https://liv8os.com/help"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-sm font-medium hover:border-neuro transition-colors"
                                        >
                                            <Globe className="h-4 w-4" />
                                            Help Center
                                        </a>
                                        <a
                                            href="https://discord.gg/liv8os"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-sm font-medium hover:border-neuro transition-colors"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Discord Community
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
}
