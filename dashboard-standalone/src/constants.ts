import { RoleKey } from './types';
import type { RoleDefinition } from './types';

export const ROLE_OPTIONS: RoleDefinition[] = [
  {
    key: RoleKey.AI_RECEPTIONIST,
    label: "AI Receptionist",
    description: "Answers inbound calls 24/7, handles FAQs, and filters spam.",
    recommended: true
  },
  {
    key: RoleKey.MISSED_CALL_RECOVERY,
    label: "Missed Call Recovery",
    description: "Instantly texts back missed calls to save the lead.",
    recommended: true
  },
  {
    key: RoleKey.LEAD_QUALIFIER,
    label: "Lead Qualifier",
    description: "Asks qualification questions via SMS/IG before booking.",
    recommended: false
  },
  {
    key: RoleKey.BOOKING_ASSISTANT,
    label: "Booking Assistant",
    description: "Negotiates times and books directly to your calendar.",
    recommended: false
  },
  {
    key: RoleKey.REVIEW_COLLECTOR,
    label: "Review Collector",
    description: "Automatically requests reviews after successful service.",
    recommended: true
  },
  {
    key: RoleKey.REENGAGEMENT_AGENT,
    label: "Re-engagement Agent",
    description: "Wakes up cold leads from 90+ days ago.",
    recommended: false
  }
];

// Fallback if API key is missing
export const MOCK_APPROVAL_PACK = {
  summary: "LIV8AI will configure your location for maximum Answer Engine Optimization (AEO) and deploy 3 active AI agents.",
  brand_confirmed: {
    name: "Detected Brand",
    domain: "example.com"
  },
  ai_staff_actions: [
    { role: "AI Receptionist", action: "Configured to answer with 'Professional' tone." },
    { role: "Missed Call Recovery", action: "Will trigger SMS 1 minute after missed call." }
  ],
  deploy_steps: [
    "Inject Brand Brain into Knowledge Base",
    "Configure GHL Workflows for Speed-to-Lead",
    "Activate Voice Agent on Main Line"
  ],
  aeo_score_impact: "High (+45 points)"
};

// Automation & Webhooks - Use environment variables for sensitive data
export const TASKMAGIC_WEBHOOK_URL = import.meta.env.VITE_TASKMAGIC_WEBHOOK_URL || '';
export const TASKMAGIC_MCP_TOKEN = import.meta.env.VITE_TASKMAGIC_MCP_TOKEN || '';
export const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL || 'https://api.anychat.one/embed/4a4d5890-b444-3906-8f87-1cedb3342c68';
export const FEEDBACK_WEBHOOK_URL = import.meta.env.VITE_FEEDBACK_WEBHOOK_URL || TASKMAGIC_WEBHOOK_URL;

export const PLATFORM_NAME = 'LIV8 OS';
export const PLATFORM_VERSION = 'v2.5';
