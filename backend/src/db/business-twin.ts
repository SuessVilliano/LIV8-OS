import { sql } from '@vercel/postgres';

/**
 * Business Twin - The canonical source of truth for a business
 *
 * This is the "Digital DNA" that all AI agents reference.
 * Every fact must be verified and sourced - NO HALLUCINATION.
 */

// ============ TYPE DEFINITIONS ============

export interface BusinessIdentity {
    businessName: string;
    domain: string;
    industry: string;
    subIndustry?: string;
    tagline?: string;
    foundedYear?: number;
    teamSize?: string;
    location?: string;
}

export interface BrandVoice {
    tone: string; // e.g., "Professional yet approachable"
    personality: string[]; // e.g., ["Confident", "Helpful", "Expert"]
    vocabulary: {
        preferred: string[]; // Words to use
        avoided: string[]; // Words to never use
    };
    writingStyle: string; // e.g., "Conversational, active voice, short sentences"
    samplePhrases: string[]; // Examples of how the brand speaks
}

export interface VerifiedFact {
    id: string;
    category: string; // e.g., "service", "pricing", "policy", "product"
    fact: string;
    source: string; // URL or "manual_entry"
    sourceType: 'website' | 'document' | 'manual' | 'api';
    confidence: number; // 0-100
    verifiedAt: Date;
    expiresAt?: Date; // Some facts need periodic re-verification
}

export interface Constraint {
    id: string;
    type: 'never_mention' | 'never_do' | 'always_include' | 'require_approval' | 'limit';
    rule: string;
    reason?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    appliesTo: string[]; // Which agents this applies to, or ['*'] for all
}

export interface SOP {
    id: string;
    name: string;
    description: string;
    triggerConditions: string[]; // When this SOP activates
    steps: SOPStep[];
    appliesTo: string[]; // Agent roles
    priority: number; // Higher = more important
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface SOPStep {
    order: number;
    action: string;
    details?: string;
    requiresApproval?: boolean;
    fallback?: string; // What to do if this step fails
}

export interface ContentGuidelines {
    seo: {
        primaryKeywords: string[];
        secondaryKeywords: string[];
        avoidKeywords: string[];
        metaDescriptionStyle: string;
        titleTagFormula: string;
    };
    aeo: { // Answer Engine Optimization
        targetQuestions: string[]; // Questions to rank for
        answerFormat: 'concise' | 'detailed' | 'structured';
        citationStyle: string;
        factCheckRequired: boolean;
    };
    geo: { // Generative Engine Optimization
        authoritySignals: string[]; // E-E-A-T signals
        structuredDataTypes: string[];
        contentDepthLevel: 'surface' | 'comprehensive' | 'expert';
    };
    general: {
        maxContentLength?: number;
        requiredSections?: string[];
        ctaStyle: string;
        imageAltTextGuidelines: string;
    };
}

export interface AgentConfig {
    role: string;
    name: string;
    systemPromptAdditions: string[];
    allowedActions: string[];
    restrictedActions: string[];
    knowledgeAccess: string[]; // Categories of knowledge this agent can access
    escalationRules: {
        condition: string;
        escalateTo: string; // Another agent role or 'human'
    }[];
    responseTemplates?: Record<string, string>;
}

export interface BusinessTwin {
    id: string;
    locationId: string; // GHL location or LIV8 CRM ID
    crmType: 'ghl' | 'liv8';

    // Core Identity
    identity: BusinessIdentity;
    brandVoice: BrandVoice;

    // Knowledge Base (verified facts only)
    knowledgeBase: VerifiedFact[];

    // Operational Rules
    constraints: Constraint[];
    sops: SOP[];

    // Content Optimization
    contentGuidelines: ContentGuidelines;

    // Agent Configurations (derived from SOPs)
    agentConfigs: Record<string, AgentConfig>;

    // Metadata
    onboardingComplete: boolean;
    lastScrapedAt?: Date;
    lastUpdatedAt: Date;
    createdAt: Date;
    version: number;
}

// ============ DATABASE OPERATIONS ============

export const businessTwin = {
    /**
     * Initialize the business_twins table
     */
    async initTables(): Promise<void> {
        await sql`
            CREATE TABLE IF NOT EXISTS business_twins (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                location_id TEXT UNIQUE NOT NULL,
                crm_type TEXT CHECK (crm_type IN ('ghl', 'liv8')) NOT NULL,

                identity JSONB NOT NULL DEFAULT '{}',
                brand_voice JSONB NOT NULL DEFAULT '{}',
                knowledge_base JSONB NOT NULL DEFAULT '[]',
                constraints JSONB NOT NULL DEFAULT '[]',
                sops JSONB NOT NULL DEFAULT '[]',
                content_guidelines JSONB NOT NULL DEFAULT '{}',
                agent_configs JSONB NOT NULL DEFAULT '{}',

                onboarding_complete BOOLEAN DEFAULT false,
                last_scraped_at TIMESTAMP,
                last_updated_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                version INTEGER DEFAULT 1
            )
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_business_twins_location ON business_twins(location_id)
        `;

        // Separate table for knowledge base items (for efficient querying)
        await sql`
            CREATE TABLE IF NOT EXISTS twin_knowledge (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                twin_id UUID REFERENCES business_twins(id) ON DELETE CASCADE,
                category TEXT NOT NULL,
                fact TEXT NOT NULL,
                source TEXT NOT NULL,
                source_type TEXT CHECK (source_type IN ('website', 'document', 'manual', 'api')) NOT NULL,
                confidence INTEGER DEFAULT 100,
                verified_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Try to add vector column for semantic search (requires pgvector extension)
        // This is optional - core functionality works without it
        try {
            await sql`ALTER TABLE twin_knowledge ADD COLUMN IF NOT EXISTS embedding VECTOR(1536)`;
        } catch {
            // pgvector extension not available - semantic search disabled but core features work
            console.log('[BusinessTwin] pgvector not available - semantic search disabled');
        }

        await sql`
            CREATE INDEX IF NOT EXISTS idx_twin_knowledge_twin ON twin_knowledge(twin_id)
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_twin_knowledge_category ON twin_knowledge(category)
        `;

        // Scraped content cache
        await sql`
            CREATE TABLE IF NOT EXISTS twin_scraped_content (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                twin_id UUID REFERENCES business_twins(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                page_type TEXT, -- 'home', 'about', 'services', 'blog', etc.
                title TEXT,
                content TEXT,
                extracted_facts JSONB DEFAULT '[]',
                scraped_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(twin_id, url)
            )
        `;
    },

    /**
     * Create a new Business Twin
     */
    async create(params: {
        locationId: string;
        crmType: 'ghl' | 'liv8';
        identity: Partial<BusinessIdentity>;
    }): Promise<BusinessTwin> {
        const result = await sql`
            INSERT INTO business_twins (
                location_id,
                crm_type,
                identity
            )
            VALUES (
                ${params.locationId},
                ${params.crmType},
                ${JSON.stringify(params.identity)}
            )
            ON CONFLICT (location_id) DO UPDATE SET
                identity = ${JSON.stringify(params.identity)},
                last_updated_at = NOW()
            RETURNING *
        `;
        return this.mapRowToTwin(result.rows[0]);
    },

    /**
     * Get Business Twin by location ID
     */
    async getByLocationId(locationId: string): Promise<BusinessTwin | null> {
        const result = await sql`
            SELECT * FROM business_twins WHERE location_id = ${locationId}
        `;
        if (result.rows.length === 0) return null;
        return this.mapRowToTwin(result.rows[0]);
    },

    /**
     * Update Business Twin identity
     */
    async updateIdentity(locationId: string, identity: Partial<BusinessIdentity>): Promise<void> {
        await sql`
            UPDATE business_twins
            SET
                identity = identity || ${JSON.stringify(identity)}::jsonb,
                last_updated_at = NOW(),
                version = version + 1
            WHERE location_id = ${locationId}
        `;
    },

    /**
     * Update Brand Voice
     */
    async updateBrandVoice(locationId: string, brandVoice: Partial<BrandVoice>): Promise<void> {
        await sql`
            UPDATE business_twins
            SET
                brand_voice = brand_voice || ${JSON.stringify(brandVoice)}::jsonb,
                last_updated_at = NOW(),
                version = version + 1
            WHERE location_id = ${locationId}
        `;
    },

    /**
     * Add verified fact to knowledge base
     */
    async addKnowledge(params: {
        locationId: string;
        category: string;
        fact: string;
        source: string;
        sourceType: 'website' | 'document' | 'manual' | 'api';
        confidence?: number;
        expiresAt?: Date;
    }): Promise<string> {
        // First get the twin ID
        const twin = await sql`
            SELECT id FROM business_twins WHERE location_id = ${params.locationId}
        `;
        if (twin.rows.length === 0) {
            throw new Error('Business Twin not found');
        }

        const result = await sql`
            INSERT INTO twin_knowledge (
                twin_id, category, fact, source, source_type, confidence, expires_at
            )
            VALUES (
                ${twin.rows[0].id},
                ${params.category},
                ${params.fact},
                ${params.source},
                ${params.sourceType},
                ${params.confidence || 100},
                ${params.expiresAt || null}
            )
            RETURNING id
        `;
        return result.rows[0].id;
    },

    /**
     * Get knowledge by category
     */
    async getKnowledge(locationId: string, category?: string): Promise<VerifiedFact[]> {
        const twin = await sql`
            SELECT id FROM business_twins WHERE location_id = ${locationId}
        `;
        if (twin.rows.length === 0) return [];

        let result;
        if (category) {
            result = await sql`
                SELECT * FROM twin_knowledge
                WHERE twin_id = ${twin.rows[0].id} AND category = ${category}
                ORDER BY confidence DESC, verified_at DESC
            `;
        } else {
            result = await sql`
                SELECT * FROM twin_knowledge
                WHERE twin_id = ${twin.rows[0].id}
                ORDER BY category, confidence DESC
            `;
        }

        return result.rows.map(row => ({
            id: row.id,
            category: row.category,
            fact: row.fact,
            source: row.source,
            sourceType: row.source_type,
            confidence: row.confidence,
            verifiedAt: row.verified_at,
            expiresAt: row.expires_at
        }));
    },

    /**
     * Add or update a constraint
     */
    async upsertConstraint(locationId: string, constraint: Omit<Constraint, 'id'>): Promise<void> {
        const id = crypto.randomUUID();
        await sql`
            UPDATE business_twins
            SET
                constraints = constraints || ${JSON.stringify([{ id, ...constraint }])}::jsonb,
                last_updated_at = NOW(),
                version = version + 1
            WHERE location_id = ${locationId}
        `;
    },

    /**
     * Add or update an SOP
     */
    async upsertSOP(locationId: string, sop: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await sql`
            UPDATE business_twins
            SET
                sops = sops || ${JSON.stringify([{
                    id,
                    ...sop,
                    createdAt: now,
                    updatedAt: now
                }])}::jsonb,
                last_updated_at = NOW(),
                version = version + 1
            WHERE location_id = ${locationId}
        `;
        return id;
    },

    /**
     * Update content guidelines
     */
    async updateContentGuidelines(locationId: string, guidelines: Partial<ContentGuidelines>): Promise<void> {
        await sql`
            UPDATE business_twins
            SET
                content_guidelines = content_guidelines || ${JSON.stringify(guidelines)}::jsonb,
                last_updated_at = NOW(),
                version = version + 1
            WHERE location_id = ${locationId}
        `;
    },

    /**
     * Update agent config
     */
    async updateAgentConfig(locationId: string, role: string, config: Partial<AgentConfig>): Promise<void> {
        await sql`
            UPDATE business_twins
            SET
                agent_configs = jsonb_set(
                    agent_configs,
                    ${`{${role}}`}::text[],
                    COALESCE(agent_configs->${role}, '{}') || ${JSON.stringify(config)}::jsonb
                ),
                last_updated_at = NOW(),
                version = version + 1
            WHERE location_id = ${locationId}
        `;
    },

    /**
     * Mark onboarding complete
     */
    async completeOnboarding(locationId: string): Promise<void> {
        await sql`
            UPDATE business_twins
            SET
                onboarding_complete = true,
                last_updated_at = NOW()
            WHERE location_id = ${locationId}
        `;
    },

    /**
     * Save scraped content
     */
    async saveScrapedContent(params: {
        locationId: string;
        url: string;
        pageType?: string;
        title?: string;
        content: string;
        extractedFacts?: any[];
    }): Promise<void> {
        const twin = await sql`
            SELECT id FROM business_twins WHERE location_id = ${params.locationId}
        `;
        if (twin.rows.length === 0) {
            throw new Error('Business Twin not found');
        }

        await sql`
            INSERT INTO twin_scraped_content (
                twin_id, url, page_type, title, content, extracted_facts
            )
            VALUES (
                ${twin.rows[0].id},
                ${params.url},
                ${params.pageType || null},
                ${params.title || null},
                ${params.content},
                ${JSON.stringify(params.extractedFacts || [])}
            )
            ON CONFLICT (twin_id, url) DO UPDATE SET
                page_type = EXCLUDED.page_type,
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                extracted_facts = EXCLUDED.extracted_facts,
                scraped_at = NOW()
        `;

        // Update last scraped timestamp
        await sql`
            UPDATE business_twins
            SET last_scraped_at = NOW()
            WHERE location_id = ${params.locationId}
        `;
    },

    /**
     * Get all scraped content for a twin
     */
    async getScrapedContent(locationId: string): Promise<any[]> {
        const twin = await sql`
            SELECT id FROM business_twins WHERE location_id = ${locationId}
        `;
        if (twin.rows.length === 0) return [];

        const result = await sql`
            SELECT * FROM twin_scraped_content
            WHERE twin_id = ${twin.rows[0].id}
            ORDER BY scraped_at DESC
        `;
        return result.rows;
    },

    /**
     * Generate system prompt additions from twin data
     * This is what agents use to stay aligned with the brand
     */
    async generateAgentContext(locationId: string, agentRole: string): Promise<string> {
        const twin = await this.getByLocationId(locationId);
        if (!twin) return '';

        const knowledge = await this.getKnowledge(locationId);

        let context = `
## BUSINESS IDENTITY
Business: ${twin.identity.businessName}
Industry: ${twin.identity.industry}
${twin.identity.tagline ? `Tagline: ${twin.identity.tagline}` : ''}

## BRAND VOICE
Tone: ${twin.brandVoice.tone || 'Professional'}
Personality: ${twin.brandVoice.personality?.join(', ') || 'Helpful, knowledgeable'}
Writing Style: ${twin.brandVoice.writingStyle || 'Clear and conversational'}
${twin.brandVoice.vocabulary?.avoided?.length ? `NEVER USE: ${twin.brandVoice.vocabulary.avoided.join(', ')}` : ''}

## VERIFIED FACTS (Use ONLY these - NO HALLUCINATION)
${knowledge.slice(0, 50).map(k => `- [${k.category.toUpperCase()}] ${k.fact}`).join('\n')}

## CONSTRAINTS (MUST FOLLOW)
${twin.constraints.filter(c => c.appliesTo.includes('*') || c.appliesTo.includes(agentRole))
    .map(c => `- ${c.type.toUpperCase()}: ${c.rule}${c.severity === 'critical' ? ' [CRITICAL]' : ''}`)
    .join('\n')}

## YOUR ROLE: ${agentRole.toUpperCase()}
${twin.agentConfigs[agentRole]?.systemPromptAdditions?.join('\n') || ''}
`;

        return context.trim();
    },

    // Helper to map database row to BusinessTwin type
    mapRowToTwin(row: any): BusinessTwin {
        return {
            id: row.id,
            locationId: row.location_id,
            crmType: row.crm_type,
            identity: row.identity || {},
            brandVoice: row.brand_voice || {},
            knowledgeBase: row.knowledge_base || [],
            constraints: row.constraints || [],
            sops: row.sops || [],
            contentGuidelines: row.content_guidelines || {},
            agentConfigs: row.agent_configs || {},
            onboardingComplete: row.onboarding_complete,
            lastScrapedAt: row.last_scraped_at,
            lastUpdatedAt: row.last_updated_at,
            createdAt: row.created_at,
            version: row.version
        };
    }
};
