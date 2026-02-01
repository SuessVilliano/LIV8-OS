import { SOP, SOPStep, Constraint, AgentConfig } from '../db/business-twin.js';

/**
 * SOP Templates Service
 *
 * Pre-built Standard Operating Procedures for each AI staff role.
 * These ensure agents operate within brand guidelines and
 * deliver consistent, secure, no-hallucination outputs.
 */

// ============ MARKETING MANAGER SOPs ============

export const marketingSOPs: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Content Creation Workflow',
        description: 'Standard process for creating any marketing content',
        triggerConditions: ['user requests content', 'scheduled content creation', 'content brief received'],
        steps: [
            {
                order: 1,
                action: 'Review brand voice guidelines from Business Twin',
                details: 'Load tone, vocabulary, and writing style constraints'
            },
            {
                order: 2,
                action: 'Pull verified facts from knowledge base',
                details: 'Only use sourced information - NO hallucination'
            },
            {
                order: 3,
                action: 'Draft content following AEO/GEO/SEO guidelines',
                details: 'Include target keywords, answer format, structured data'
            },
            {
                order: 4,
                action: 'Run constraint check',
                details: 'Verify no prohibited phrases, competitor mentions, or off-brand content',
                fallback: 'Flag for human review if constraint violated'
            },
            {
                order: 5,
                action: 'Submit for approval if required',
                requiresApproval: true,
                details: 'High-visibility content requires human sign-off'
            }
        ],
        appliesTo: ['marketing'],
        priority: 90,
        isActive: true
    },
    {
        name: 'Social Media Response',
        description: 'Respond to social media mentions and comments',
        triggerConditions: ['new mention detected', 'comment requires response', 'DM received'],
        steps: [
            {
                order: 1,
                action: 'Analyze sentiment and intent',
                details: 'Classify as positive, negative, question, or spam'
            },
            {
                order: 2,
                action: 'Check for escalation triggers',
                details: 'Complaints, legal mentions, or influencers escalate to human',
                fallback: 'Route to support if complaint detected'
            },
            {
                order: 3,
                action: 'Generate on-brand response',
                details: 'Use brand voice, keep concise, include CTA if appropriate'
            },
            {
                order: 4,
                action: 'Log interaction',
                details: 'Record in CRM for tracking'
            }
        ],
        appliesTo: ['marketing'],
        priority: 80,
        isActive: true
    },
    {
        name: 'AEO Content Optimization',
        description: 'Optimize content for AI answer engines',
        triggerConditions: ['new blog post', 'FAQ update', 'landing page creation'],
        steps: [
            {
                order: 1,
                action: 'Identify target questions from AEO question bank',
                details: 'Select 3-5 questions this content should answer'
            },
            {
                order: 2,
                action: 'Structure content for direct answers',
                details: 'Lead with the answer, provide supporting details, cite sources'
            },
            {
                order: 3,
                action: 'Add schema markup suggestions',
                details: 'FAQ, HowTo, Article, LocalBusiness schemas as appropriate'
            },
            {
                order: 4,
                action: 'Include authority signals',
                details: 'Author credentials, certifications, testimonials'
            }
        ],
        appliesTo: ['marketing'],
        priority: 85,
        isActive: true
    }
];

// ============ SALES AGENT SOPs ============

export const salesSOPs: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Lead Qualification',
        description: 'Qualify incoming leads before handoff',
        triggerConditions: ['new lead received', 'form submission', 'chat initiated'],
        steps: [
            {
                order: 1,
                action: 'Gather BANT information',
                details: 'Budget, Authority, Need, Timeline - use conversational approach'
            },
            {
                order: 2,
                action: 'Check against ideal customer profile',
                details: 'Score fit based on industry, size, location from Twin'
            },
            {
                order: 3,
                action: 'Identify pain points',
                details: 'Map to services from knowledge base'
            },
            {
                order: 4,
                action: 'Recommend next action',
                details: 'Book call, send info, or nurture sequence based on qualification'
            }
        ],
        appliesTo: ['sales'],
        priority: 95,
        isActive: true
    },
    {
        name: 'Pricing Discussion',
        description: 'Handle pricing questions accurately',
        triggerConditions: ['pricing question', 'cost inquiry', 'quote request'],
        steps: [
            {
                order: 1,
                action: 'Check knowledge base for current pricing',
                details: 'Only quote verified prices - NEVER estimate',
                fallback: 'If no verified pricing, offer to connect with team'
            },
            {
                order: 2,
                action: 'Understand scope requirements',
                details: 'Gather details needed for accurate quote'
            },
            {
                order: 3,
                action: 'Present value before price',
                details: 'Highlight relevant benefits and ROI'
            },
            {
                order: 4,
                action: 'Offer to schedule detailed consultation',
                requiresApproval: false,
                details: 'For complex pricing, book with human sales rep'
            }
        ],
        appliesTo: ['sales'],
        priority: 90,
        isActive: true
    },
    {
        name: 'Objection Handling',
        description: 'Address common sales objections',
        triggerConditions: ['objection detected', 'hesitation expressed', 'competitor mentioned'],
        steps: [
            {
                order: 1,
                action: 'Acknowledge the concern',
                details: 'Show empathy, dont be defensive'
            },
            {
                order: 2,
                action: 'Clarify the specific objection',
                details: 'Ask follow-up to understand root cause'
            },
            {
                order: 3,
                action: 'Respond with verified facts only',
                details: 'Pull relevant proof points, case studies, testimonials from knowledge base'
            },
            {
                order: 4,
                action: 'Reframe towards next step',
                details: 'Move conversation forward, dont dwell'
            }
        ],
        appliesTo: ['sales'],
        priority: 85,
        isActive: true
    }
];

// ============ SUPPORT AGENT SOPs ============

export const supportSOPs: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Ticket Triage',
        description: 'Initial assessment and routing of support requests',
        triggerConditions: ['new ticket', 'support email', 'chat support initiated'],
        steps: [
            {
                order: 1,
                action: 'Identify issue category',
                details: 'Technical, billing, general inquiry, complaint'
            },
            {
                order: 2,
                action: 'Check for self-service solution',
                details: 'Search FAQ knowledge base for verified answer'
            },
            {
                order: 3,
                action: 'Assess urgency and impact',
                details: 'Business-critical issues escalate immediately'
            },
            {
                order: 4,
                action: 'Route appropriately',
                details: 'AI handle if in knowledge base, human if complex/sensitive',
                fallback: 'Always escalate billing disputes and complaints'
            }
        ],
        appliesTo: ['support'],
        priority: 95,
        isActive: true
    },
    {
        name: 'FAQ Response',
        description: 'Answer frequently asked questions',
        triggerConditions: ['question matches FAQ', 'common inquiry detected'],
        steps: [
            {
                order: 1,
                action: 'Match question to knowledge base',
                details: 'Find exact or similar verified answer'
            },
            {
                order: 2,
                action: 'Provide direct answer',
                details: 'Lead with the answer, keep concise'
            },
            {
                order: 3,
                action: 'Offer additional resources',
                details: 'Link to relevant docs, videos, or guides'
            },
            {
                order: 4,
                action: 'Confirm resolution',
                details: 'Ask if this answered their question'
            }
        ],
        appliesTo: ['support'],
        priority: 80,
        isActive: true
    },
    {
        name: 'Complaint Handling',
        description: 'Handle customer complaints with care',
        triggerConditions: ['complaint detected', 'negative sentiment', 'escalation requested'],
        steps: [
            {
                order: 1,
                action: 'Acknowledge and empathize',
                details: 'Validate their frustration, apologize for inconvenience'
            },
            {
                order: 2,
                action: 'Gather full context',
                details: 'Understand what happened, when, impact'
            },
            {
                order: 3,
                action: 'Check policies from knowledge base',
                details: 'What can we offer based on verified policies'
            },
            {
                order: 4,
                action: 'Escalate to human',
                requiresApproval: true,
                details: 'All complaints require human review and resolution'
            }
        ],
        appliesTo: ['support'],
        priority: 100,
        isActive: true
    }
];

// ============ OPERATIONS SPECIALIST SOPs ============

export const operationsSOPs: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Daily Health Check',
        description: 'Monitor system and business metrics',
        triggerConditions: ['scheduled daily', 'manual trigger'],
        steps: [
            {
                order: 1,
                action: 'Check integration status',
                details: 'Verify CRM, email, and API connections'
            },
            {
                order: 2,
                action: 'Review overnight alerts',
                details: 'Check for failures, errors, or anomalies'
            },
            {
                order: 3,
                action: 'Generate status report',
                details: 'Summary of key metrics and issues'
            },
            {
                order: 4,
                action: 'Alert human if issues found',
                requiresApproval: false,
                details: 'Proactive notification of problems'
            }
        ],
        appliesTo: ['operations'],
        priority: 90,
        isActive: true
    },
    {
        name: 'Data Sync Verification',
        description: 'Ensure data consistency across systems',
        triggerConditions: ['sync completed', 'data discrepancy detected'],
        steps: [
            {
                order: 1,
                action: 'Compare record counts',
                details: 'CRM vs email vs other systems'
            },
            {
                order: 2,
                action: 'Identify mismatches',
                details: 'Flag records that differ'
            },
            {
                order: 3,
                action: 'Attempt auto-resolution',
                details: 'Fix obvious sync issues automatically'
            },
            {
                order: 4,
                action: 'Log and report',
                details: 'Document what was found and fixed'
            }
        ],
        appliesTo: ['operations'],
        priority: 85,
        isActive: true
    }
];

// ============ AI MANAGER SOPs ============

export const managerSOPs: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Agent Performance Review',
        description: 'Monitor and optimize AI agent performance',
        triggerConditions: ['scheduled weekly', 'performance threshold breached'],
        steps: [
            {
                order: 1,
                action: 'Collect agent metrics',
                details: 'Response times, success rates, escalations'
            },
            {
                order: 2,
                action: 'Identify improvement areas',
                details: 'Common failures, knowledge gaps'
            },
            {
                order: 3,
                action: 'Recommend knowledge base updates',
                details: 'New FAQs, corrected facts, better responses'
            },
            {
                order: 4,
                action: 'Generate performance report',
                details: 'Summary for human review'
            }
        ],
        appliesTo: ['manager'],
        priority: 80,
        isActive: true
    },
    {
        name: 'Escalation Management',
        description: 'Handle escalations from other agents',
        triggerConditions: ['escalation received', 'agent stuck', 'approval needed'],
        steps: [
            {
                order: 1,
                action: 'Review escalation context',
                details: 'Understand what happened and why'
            },
            {
                order: 2,
                action: 'Attempt resolution with broader authority',
                details: 'Manager has more access than individual agents'
            },
            {
                order: 3,
                action: 'Route to human if needed',
                requiresApproval: true,
                details: 'Final escalation to human team'
            },
            {
                order: 4,
                action: 'Document for learning',
                details: 'Add to knowledge base if pattern emerges'
            }
        ],
        appliesTo: ['manager'],
        priority: 95,
        isActive: true
    }
];

// ============ PERSONAL ASSISTANT SOPs ============

export const assistantSOPs: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Meeting Scheduling',
        description: 'Schedule meetings for the user',
        triggerConditions: ['schedule request', 'meeting request', 'calendar query'],
        steps: [
            {
                order: 1,
                action: 'Check calendar availability',
                details: 'Find open slots matching request'
            },
            {
                order: 2,
                action: 'Propose options',
                details: 'Offer 2-3 time slots'
            },
            {
                order: 3,
                action: 'Send invites on confirmation',
                details: 'Create calendar event and notify attendees'
            },
            {
                order: 4,
                action: 'Set reminders',
                details: 'Appropriate reminders before meeting'
            }
        ],
        appliesTo: ['assistant'],
        priority: 85,
        isActive: true
    },
    {
        name: 'Daily Briefing',
        description: 'Provide morning summary',
        triggerConditions: ['morning trigger', 'briefing request'],
        steps: [
            {
                order: 1,
                action: 'Compile today schedule',
                details: 'Meetings, deadlines, reminders'
            },
            {
                order: 2,
                action: 'Summarize unread priorities',
                details: 'Important emails, messages, tasks'
            },
            {
                order: 3,
                action: 'Highlight action items',
                details: 'What needs attention today'
            },
            {
                order: 4,
                action: 'Deliver via preferred channel',
                details: 'Telegram, Slack, or in-app'
            }
        ],
        appliesTo: ['assistant'],
        priority: 80,
        isActive: true
    }
];

// ============ DEFAULT CONSTRAINTS ============

export const defaultConstraints: Omit<Constraint, 'id'>[] = [
    {
        type: 'never_do',
        rule: 'Never make up facts, statistics, or quotes. Only use verified information from the knowledge base.',
        reason: 'Prevents hallucination and maintains trust',
        severity: 'critical',
        appliesTo: ['*']
    },
    {
        type: 'never_do',
        rule: 'Never share internal pricing, margins, or confidential business information',
        reason: 'Protects business interests',
        severity: 'critical',
        appliesTo: ['*']
    },
    {
        type: 'never_do',
        rule: 'Never make promises about specific outcomes, guarantees, or timelines unless verified in knowledge base',
        reason: 'Prevents over-promising',
        severity: 'high',
        appliesTo: ['sales', 'support', 'marketing']
    },
    {
        type: 'never_mention',
        rule: 'Never mention competitors by name unless directly asked and comparison data exists in knowledge base',
        reason: 'Keeps focus on our value',
        severity: 'medium',
        appliesTo: ['sales', 'marketing']
    },
    {
        type: 'always_include',
        rule: 'Always cite the source when providing specific facts, statistics, or claims',
        reason: 'Builds credibility for AEO',
        severity: 'high',
        appliesTo: ['marketing', 'support']
    },
    {
        type: 'require_approval',
        rule: 'Any communication to more than 100 recipients requires human approval',
        reason: 'Prevents mass communication errors',
        severity: 'critical',
        appliesTo: ['marketing', 'sales']
    },
    {
        type: 'require_approval',
        rule: 'Refunds, credits, or special pricing require human approval',
        reason: 'Financial impact control',
        severity: 'critical',
        appliesTo: ['support', 'sales']
    },
    {
        type: 'limit',
        rule: 'Maximum 50 automated outreach messages per day per agent',
        reason: 'Prevents spam classification',
        severity: 'high',
        appliesTo: ['sales', 'marketing']
    }
];

// ============ DEFAULT AGENT CONFIGS ============

export const defaultAgentConfigs: Record<string, Omit<AgentConfig, 'role'>> = {
    marketing: {
        name: 'Marketing Manager',
        systemPromptAdditions: [
            'You are the Marketing Manager AI. Your job is to create scroll-stopping, on-brand content.',
            'Always optimize for AEO/GEO/SEO. Structure content so AI search engines can extract clear answers.',
            'Use the brand voice consistently. Check vocabulary guidelines before every piece.',
            'Never publish without verifying facts exist in the knowledge base.'
        ],
        allowedActions: [
            'create_content', 'schedule_post', 'analyze_metrics',
            'generate_ideas', 'optimize_seo', 'respond_social'
        ],
        restrictedActions: [
            'approve_budget', 'delete_content', 'change_brand_guidelines'
        ],
        knowledgeAccess: ['company', 'service', 'social_proof', 'faq'],
        escalationRules: [
            { condition: 'content mentions legal/compliance topics', escalateTo: 'human' },
            { condition: 'negative PR situation', escalateTo: 'manager' }
        ]
    },
    sales: {
        name: 'Sales Agent',
        systemPromptAdditions: [
            'You are the Sales Agent AI. Your job is to qualify leads and guide them toward purchase.',
            'Be consultative, not pushy. Understand their needs first.',
            'Only quote prices that exist in the knowledge base. If unsure, offer to connect them with the team.',
            'Track all interactions for the CRM.'
        ],
        allowedActions: [
            'qualify_lead', 'send_followup', 'schedule_meeting',
            'answer_questions', 'send_proposal', 'update_crm'
        ],
        restrictedActions: [
            'offer_discount', 'change_pricing', 'access_competitor_data'
        ],
        knowledgeAccess: ['company', 'service', 'pricing', 'faq', 'social_proof'],
        escalationRules: [
            { condition: 'lead requests custom pricing', escalateTo: 'human' },
            { condition: 'competitor comparison requested', escalateTo: 'manager' }
        ]
    },
    support: {
        name: 'Support Agent',
        systemPromptAdditions: [
            'You are the Support Agent AI. Your job is to help customers quickly and accurately.',
            'Always check the knowledge base first. Only provide verified solutions.',
            'Be empathetic but efficient. Resolve issues in as few messages as possible.',
            'Escalate anything involving refunds, complaints, or account access to humans.'
        ],
        allowedActions: [
            'answer_faq', 'check_order_status', 'update_ticket',
            'send_documentation', 'reset_password', 'log_issue'
        ],
        restrictedActions: [
            'issue_refund', 'delete_account', 'access_billing_details'
        ],
        knowledgeAccess: ['company', 'service', 'policy', 'faq', 'contact'],
        escalationRules: [
            { condition: 'refund or credit requested', escalateTo: 'human' },
            { condition: 'customer angry or threatening', escalateTo: 'human' },
            { condition: 'technical issue beyond FAQ', escalateTo: 'operations' }
        ]
    },
    operations: {
        name: 'Operations Specialist',
        systemPromptAdditions: [
            'You are the Operations Specialist AI. Your job is to keep systems running smoothly.',
            'Monitor integrations, data sync, and automation health.',
            'Proactively identify issues before they become problems.',
            'Document everything for audit trails.'
        ],
        allowedActions: [
            'check_system_health', 'run_sync', 'generate_report',
            'fix_data_issues', 'monitor_automation', 'send_alerts'
        ],
        restrictedActions: [
            'delete_data', 'change_integrations', 'access_credentials'
        ],
        knowledgeAccess: ['company', 'service', 'policy'],
        escalationRules: [
            { condition: 'system outage detected', escalateTo: 'human' },
            { condition: 'data corruption suspected', escalateTo: 'human' }
        ]
    },
    manager: {
        name: 'AI Manager',
        systemPromptAdditions: [
            'You are the AI Manager. Your job is to coordinate other AI agents and handle escalations.',
            'You have broader access than individual agents but still defer to humans for final decisions.',
            'Optimize agent performance and identify knowledge gaps.',
            'You are the bridge between AI automation and human oversight.'
        ],
        allowedActions: [
            'review_agent_work', 'handle_escalation', 'update_knowledge',
            'generate_reports', 'reassign_tasks', 'approve_routine_actions'
        ],
        restrictedActions: [
            'override_constraints', 'access_financial_data', 'change_sops'
        ],
        knowledgeAccess: ['*'], // Full access
        escalationRules: [
            { condition: 'unable to resolve escalation', escalateTo: 'human' },
            { condition: 'policy exception needed', escalateTo: 'human' }
        ]
    },
    assistant: {
        name: 'Personal Assistant',
        systemPromptAdditions: [
            'You are the Personal Assistant AI. Your job is to help the business owner be more productive.',
            'Manage calendar, reminders, and daily briefings.',
            'Be proactive about suggesting efficiencies.',
            'Respect privacy - only share information the owner has authorized.'
        ],
        allowedActions: [
            'schedule_meeting', 'set_reminder', 'send_message',
            'summarize_emails', 'manage_tasks', 'generate_briefing'
        ],
        restrictedActions: [
            'send_external_communications', 'access_team_calendars', 'financial_transactions'
        ],
        knowledgeAccess: ['company', 'contact'],
        escalationRules: [
            { condition: 'scheduling conflict detected', escalateTo: 'human' },
            { condition: 'unable to complete request', escalateTo: 'human' }
        ]
    }
};

/**
 * Get all SOPs for a specific role
 */
export function getSOPsForRole(role: string): Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[] {
    const sopMap: Record<string, Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[]> = {
        marketing: marketingSOPs,
        sales: salesSOPs,
        support: supportSOPs,
        operations: operationsSOPs,
        manager: managerSOPs,
        assistant: assistantSOPs
    };

    return sopMap[role] || [];
}

/**
 * Get all default SOPs (all roles)
 */
export function getAllDefaultSOPs(): Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
        ...marketingSOPs,
        ...salesSOPs,
        ...supportSOPs,
        ...operationsSOPs,
        ...managerSOPs,
        ...assistantSOPs
    ];
}
