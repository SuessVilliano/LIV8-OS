import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Sparkles,
    Search,
    Book,
    Zap,
    MessageSquare,
    Settings,
    BarChart3,
    HelpCircle,
    ChevronRight,
    ChevronDown,
    ExternalLink,
    Play,
    FileText,
    Bot,
    ArrowLeft
} from 'lucide-react';

interface HelpArticle {
    id: string;
    title: string;
    category: string;
    content: string;
    video?: string;
}

const helpArticles: HelpArticle[] = [
    {
        id: 'getting-started',
        title: 'Getting Started with LIV8 OS',
        category: 'Onboarding',
        content: `
## Welcome to LIV8 OS!

LIV8 OS is your AI-powered business operating system. Here's how to get started:

### Step 1: Connect Your CRM
After signing up, you'll be prompted to connect your GoHighLevel account. This allows your AI agents to:
- Access your contacts and leads
- Send messages on your behalf
- Book appointments
- Trigger workflows

### Step 2: Meet Your AI Manager
Your AI Manager (Juno) will introduce itself via Telegram. Connect Telegram to receive:
- Daily morning briefings
- Lead alerts
- Content suggestions
- Task notifications

### Step 3: Configure Your Workflows
Choose from pre-built templates or create custom workflows:
- Speed-to-Lead (respond in < 60 seconds)
- Appointment Setter
- Review Request Machine
- Nurture Sequences

### Step 4: Watch It Work
Once configured, your AI team works 24/7. Monitor everything from your dashboard.
        `
    },
    {
        id: 'connecting-telegram',
        title: 'Connecting Telegram',
        category: 'Integration',
        content: `
## How to Connect Telegram

Telegram is the primary way your AI Manager communicates with you.

### Step 1: Open Telegram
Search for **@liv8_juno_bot** or click the link in your welcome email.

### Step 2: Start the Bot
Send **/start** to begin the connection process.

### Step 3: Enter Your Code
You'll receive a 6-digit code in your LIV8 dashboard. Enter it in Telegram to verify.

### Step 4: Set Preferences
Configure your notification preferences:
- Briefing time (default: 8:30 AM)
- Quiet hours
- Notification types

### What You'll Receive
- **Morning Briefings**: Daily summary of tasks, leads, and suggestions
- **Lead Alerts**: Instant notification when new leads come in
- **Content Approvals**: Review and approve AI-generated content
- **Performance Updates**: Weekly metrics and insights
        `
    },
    {
        id: 'understanding-credits',
        title: 'Understanding AI Credits',
        category: 'Billing',
        content: `
## How AI Credits Work

Credits are the currency for AI actions in LIV8 OS. Different actions cost different amounts.

### Credit Costs

| Action | Credits |
|--------|---------|
| Quick AI Response | 1 |
| Social Post | 3 |
| Email Copy | 5 |
| Blog Post | 15 |
| Brand Scan | 10 |
| SMS Sent | 1 |
| Email Sent | 0.5 |

### Monthly Allowances

| Plan | Credits |
|------|---------|
| Free | 500 |
| Starter | 3,000 |
| Growth | 10,000 |
| Scale | 30,000 |

### What Happens When Credits Run Out?
- **Free Plan**: Wait until next month or upgrade
- **Paid Plans**: Use overage credits at a discounted rate

### Tips to Save Credits
1. Use quick responses instead of complex ones when possible
2. Batch similar content creation tasks
3. Review AI suggestions before regenerating
        `
    },
    {
        id: 'ai-agents',
        title: 'Understanding AI Agents',
        category: 'Agents',
        content: `
## Your AI Team

LIV8 OS provides specialized AI agents for different tasks.

### Agent Types

**Manager Agent**
- Oversees all operations
- Sends daily briefings
- Coordinates other agents
- Reports issues and opportunities

**Sales Agent**
- Qualifies leads automatically
- Sends follow-up messages
- Books appointments
- Updates CRM records

**Content Agent**
- Creates social posts
- Writes email copy
- Generates blog content
- Schedules publications

**Support Agent**
- Handles customer inquiries
- Routes complex issues
- Maintains knowledge base

### Agent Limits by Plan
- Free: 1 Basic Assistant
- Starter: 1 Manager
- Growth: 3 Agents
- Scale: 10 Agents
- Enterprise: Unlimited

### Customizing Agents
Each agent can be trained on your:
- Brand voice
- Products/services
- Common questions
- Preferred responses
        `
    },
    {
        id: 'workflows',
        title: 'Setting Up Workflows',
        category: 'Automation',
        content: `
## Workflow Automation

Workflows automate repetitive tasks and ensure consistent execution.

### Pre-Built Templates

**Speed-to-Lead**
- Triggers when new lead arrives
- Sends personalized SMS in < 60 seconds
- Qualifies via AI conversation
- Books appointment if qualified

**Appointment Setter**
- Sends appointment reminders
- Handles rescheduling requests
- Confirms attendance
- Sends prep materials

**Review Machine**
- Sends review requests after service
- Follows up if no response
- Thanks for positive reviews
- Routes negative feedback

**30-Day Nurture**
- Drip campaign for new leads
- Educational content sequence
- Builds trust over time
- Re-engagement triggers

### Creating Custom Workflows
1. Go to Workflows page
2. Click "Create Workflow"
3. Choose trigger (lead, time, event)
4. Add actions (message, task, wait)
5. Set conditions
6. Activate

### Testing Workflows
Always test with a sample lead before activating for all contacts.
        `
    },
    {
        id: 'brand-scanner',
        title: 'Using the Brand Scanner',
        category: 'Features',
        content: `
## Brand Scanner

The Brand Scanner analyzes websites to extract brand information for AI training.

### How It Works
1. Enter a website URL
2. AI scans all pages
3. Extracts brand elements:
   - Brand voice and tone
   - Key services/products
   - Target audience
   - Unique selling points
   - Contact information

### What's Generated
- **Brand Brain**: Complete brand profile
- **Voice Guidelines**: How to communicate
- **Content Templates**: Pre-filled templates
- **Competitor Insights**: Market positioning

### Using Brand Data
The extracted data trains your AI agents to:
- Write in your voice
- Answer questions accurately
- Create on-brand content
- Represent your business correctly

### Scan Limits
- Free: 1 scan
- Starter: 5/month
- Growth: 20/month
- Scale+: Unlimited
        `
    },
    {
        id: 'ghl-integration',
        title: 'GoHighLevel Integration',
        category: 'Integration',
        content: `
## GoHighLevel (GHL) Integration

LIV8 OS integrates deeply with GoHighLevel CRM.

### What's Synced
- Contacts and leads
- Conversations
- Appointments
- Pipelines
- Custom fields
- Tags

### Setting Up
1. Go to Settings > Integrations
2. Click "Connect GoHighLevel"
3. Enter your Location ID
4. Authorize with API key
5. Select sync options

### API Key Permissions
Your API key needs these scopes:
- contacts.read/write
- conversations.read/write
- calendars.read/write
- opportunities.read/write

### Real-Time Sync
Changes in GHL appear in LIV8 instantly, and vice versa. This includes:
- New contacts
- Message history
- Appointment changes
- Tag updates

### Troubleshooting
If sync issues occur:
1. Check API key is valid
2. Verify Location ID
3. Check permissions
4. Re-authorize if needed
        `
    },
    {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        category: 'Features',
        content: `
## Your Dashboard

The dashboard gives you a real-time view of your business.

### Key Metrics
- **Active Leads**: Leads in qualification
- **Appointments Today**: Scheduled meetings
- **Messages Sent**: AI communications
- **Credits Used**: Monthly consumption

### Activity Feed
See real-time activity from your AI agents:
- Messages sent
- Appointments booked
- Content created
- Issues flagged

### Quick Actions
- View pending approvals
- Trigger manual briefings
- Pause/resume agents
- Access settings

### Customization
Arrange widgets to focus on what matters most. Drag and drop to reorder, resize, or hide sections.

### Dark Mode
Toggle dark mode in Settings > Appearance for comfortable viewing in any lighting.
        `
    }
];

const categories = [
    { id: 'onboarding', name: 'Getting Started', icon: Book },
    { id: 'integration', name: 'Integrations', icon: Zap },
    { id: 'billing', name: 'Billing & Credits', icon: FileText },
    { id: 'agents', name: 'AI Agents', icon: Bot },
    { id: 'automation', name: 'Automation', icon: Settings },
    { id: 'features', name: 'Features', icon: BarChart3 }
];

const Help: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('onboarding');

    const filteredArticles = helpArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getArticlesByCategory = (categoryId: string) =>
        filteredArticles.filter(a => a.category.toLowerCase() === categoryId);

    return (
        <div className="min-h-screen bg-[#0A0D14] text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-[#0A0D14]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tight">LIV8 <span className="text-cyan-400">OS</span></span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Hero */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black mb-4">Help Center</h1>
                    <p className="text-gray-400 text-lg mb-8">
                        Everything you need to get the most out of LIV8 OS
                    </p>

                    {/* Search */}
                    <div className="max-w-xl mx-auto relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for help..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <nav className="space-y-2 sticky top-28">
                            {categories.map((category) => {
                                const articles = getArticlesByCategory(category.id);
                                const isExpanded = expandedCategory === category.id;

                                return (
                                    <div key={category.id}>
                                        <button
                                            onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${isExpanded ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-white/5'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <category.icon className="h-5 w-5" />
                                                <span className="font-medium">{category.name}</span>
                                            </div>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isExpanded && articles.length > 0 && (
                                            <div className="ml-8 mt-2 space-y-1">
                                                {articles.map((article) => (
                                                    <button
                                                        key={article.id}
                                                        onClick={() => setSelectedArticle(article)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedArticle?.id === article.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
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

                        {/* Quick Links */}
                        <div className="mt-8 p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
                            <h3 className="font-bold mb-4">Quick Links</h3>
                            <div className="space-y-2">
                                <a href="mailto:support@liv8.co" className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                                    <MessageSquare className="h-4 w-4" />
                                    Contact Support
                                </a>
                                <a href="#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                                    <Play className="h-4 w-4" />
                                    Video Tutorials
                                </a>
                                <a href="#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                                    <ExternalLink className="h-4 w-4" />
                                    API Documentation
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Article Content */}
                    <div className="lg:col-span-3">
                        {selectedArticle ? (
                            <article className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
                                <div className="flex items-center gap-2 text-sm text-cyan-400 mb-4">
                                    <span>{selectedArticle.category}</span>
                                </div>
                                <h1 className="text-3xl font-black mb-6">{selectedArticle.title}</h1>
                                <div className="prose prose-invert prose-cyan max-w-none">
                                    <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                                        {selectedArticle.content}
                                    </div>
                                </div>

                                {/* Article Footer */}
                                <div className="mt-12 pt-8 border-t border-white/10">
                                    <p className="text-gray-400 text-sm mb-4">Was this helpful?</p>
                                    <div className="flex gap-2">
                                        <button className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors">
                                            Yes, thanks!
                                        </button>
                                        <button className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors">
                                            I need more help
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Featured Articles */}
                                {helpArticles.slice(0, 4).map((article) => (
                                    <button
                                        key={article.id}
                                        onClick={() => setSelectedArticle(article)}
                                        className="text-left p-6 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-cyan-500/30 transition-colors group"
                                    >
                                        <span className="text-xs text-cyan-400 font-medium">{article.category}</span>
                                        <h3 className="text-lg font-bold mt-2 mb-2 group-hover:text-cyan-400 transition-colors">
                                            {article.title}
                                        </h3>
                                        <p className="text-sm text-gray-400 line-clamp-2">
                                            {article.content.slice(0, 150)}...
                                        </p>
                                        <div className="flex items-center gap-1 mt-4 text-sm text-cyan-400">
                                            Read more <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Section */}
                <div className="mt-16 p-8 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-3xl text-center">
                    <HelpCircle className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-black mb-2">Still need help?</h2>
                    <p className="text-gray-400 mb-6">Our support team is here to assist you</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="mailto:support@liv8.co"
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold hover:opacity-90 transition-opacity"
                        >
                            Email Support
                        </a>
                        <a
                            href="https://t.me/liv8_support"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
                        >
                            Chat on Telegram
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Help;
