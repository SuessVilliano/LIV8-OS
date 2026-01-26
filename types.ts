
export interface KnowledgeItem {
  id: string;
  type: 'file' | 'text' | 'audio' | 'url';
  title: string;
  content: string; // URL, Text content, or Base64 string for small files
  dateAdded: number;
  status: 'indexed' | 'processing' | 'error';
}

export interface BrandBrain {
  brand_name: string;
  domain: string;
  socials: string[];
  tone_profile: {
    professional: number;
    friendly: number;
    direct: number;
  };
  key_services: string[];
  do_say: string[];
  dont_say: string[];
  faqs: { q: string; a: string }[];
  knowledge_base: KnowledgeItem[];
}

export enum RoleKey {
  AI_RECEPTIONIST = 'AI_RECEPTIONIST',
  MISSED_CALL_RECOVERY = 'MISSED_CALL_RECOVERY',
  LEAD_QUALIFIER = 'LEAD_QUALIFIER',
  BOOKING_ASSISTANT = 'BOOKING_ASSISTANT',
  REVIEW_COLLECTOR = 'REVIEW_COLLECTOR',
  REENGAGEMENT_AGENT = 'REENGAGEMENT_AGENT'
}

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  description: string;
  recommended: boolean;
}

export interface VaultToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

// --- OPERATOR SCHEMAS ---

export type RiskLevel = "low" | "medium" | "high";

export interface ActionStep {
  id: string;
  tool: string;
  input: Record<string, any>;
  onError: "halt_and_ask" | "continue" | "retry";
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ActionPlan {
  type: "action_plan";
  summary: string;
  requiresConfirmation: boolean;
  riskLevel: RiskLevel;
  context?: {
    locationId?: string;
    contactId?: string;
    conversationId?: string;
    sourceUrl?: string;
  };
  steps: ActionStep[];
}

export interface BuildPlan {
  type: "build_plan";
  summary: string;
  requiresApproval: boolean;
  businessProfile: {
    niche: string;
    offer: string;
    geo: string;
    brandVoice: string;
    goals: string[];
  };
  assets: {
    pipelines: string[];
    workflows: string[];
    emailSequences: string[];
    smsSequences: string[];
    pages: string[];
  };
  deployment: {
    locationId: string;
    mappingNeeded: string[];
    preflightChecks: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  plan?: ActionPlan | BuildPlan;
  status?: 'thinking' | 'waiting_confirmation' | 'executing' | 'success' | 'error';
  timestamp: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  tool: string;
  status: 'success' | 'failure';
  details: string;
}

export interface ApprovalPack {
  summary: string;
  brand_confirmed: {
    name: string;
    domain: string;
  };
  ai_staff_actions: { role: string; action: string }[];
  deploy_steps: string[];
  aeo_score_impact: string;
}
