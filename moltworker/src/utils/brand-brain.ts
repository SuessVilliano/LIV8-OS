/**
 * Brand Brain - Client Knowledge Base with QMD (Semantic Search)
 *
 * Stores and retrieves client's brand knowledge, SOPs, constraints,
 * and business information using R2 for storage.
 *
 * QMD = keyword exact matching + semantic meaning-based reranking
 */

import { Env } from '../index';

interface KnowledgeItem {
  id: string;
  type: 'brand_voice' | 'sop' | 'constraint' | 'product' | 'faq' | 'policy' | 'custom';
  content: string;
  metadata?: Record<string, any>;
  keywords: string[];
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

interface BrandVoice {
  tone: string;
  personality: string;
  doList: string[];
  dontList: string[];
  examplePhrases: string[];
}

interface BrandBrainData {
  clientId: string;
  businessName: string;
  industry: string;
  brandVoice: BrandVoice;
  knowledge: KnowledgeItem[];
  sops: any[];
  constraints: any[];
  products: any[];
  faqs: any[];
  lastUpdated: string;
}

export class BrandBrain {
  private env: Env;
  private clientId: string;
  private data: BrandBrainData | null = null;

  constructor(env: Env, clientId: string) {
    this.env = env;
    this.clientId = clientId;
  }

  /**
   * Initialize Brand Brain with initial data
   */
  async initialize(initialData: Partial<BrandBrainData>): Promise<void> {
    this.data = {
      clientId: this.clientId,
      businessName: initialData.businessName || '',
      industry: initialData.industry || '',
      brandVoice: initialData.brandVoice || {
        tone: 'professional',
        personality: 'helpful and knowledgeable',
        doList: ['Be clear and concise', 'Use active voice', 'Be helpful'],
        dontList: ['Use jargon', 'Be pushy', 'Make promises we cant keep'],
        examplePhrases: []
      },
      knowledge: initialData.knowledge || [],
      sops: initialData.sops || [],
      constraints: initialData.constraints || [],
      products: initialData.products || [],
      faqs: initialData.faqs || [],
      lastUpdated: new Date().toISOString()
    };

    await this.save();
  }

  /**
   * Load Brand Brain data from R2
   */
  async load(): Promise<BrandBrainData | null> {
    if (this.data) return this.data;

    try {
      const object = await this.env.BRAND_BRAIN.get(`${this.clientId}/brain.json`);
      if (!object) return null;

      this.data = await object.json() as BrandBrainData;
      return this.data;
    } catch (error) {
      console.error('Failed to load Brand Brain:', error);
      return null;
    }
  }

  /**
   * Save Brand Brain data to R2
   */
  async save(): Promise<void> {
    if (!this.data) return;

    this.data.lastUpdated = new Date().toISOString();

    await this.env.BRAND_BRAIN.put(
      `${this.clientId}/brain.json`,
      JSON.stringify(this.data),
      { httpMetadata: { contentType: 'application/json' } }
    );
  }

  /**
   * Get brand voice configuration
   */
  async getBrandVoice(): Promise<BrandVoice | null> {
    await this.load();
    return this.data?.brandVoice || null;
  }

  /**
   * Add knowledge item to Brand Brain
   */
  async addKnowledge(type: KnowledgeItem['type'], content: string, metadata?: Record<string, any>): Promise<KnowledgeItem> {
    await this.load();
    if (!this.data) {
      await this.initialize({});
    }

    const item: KnowledgeItem = {
      id: `knowledge_${Date.now()}`,
      type,
      content,
      metadata,
      keywords: this.extractKeywords(content),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data!.knowledge.push(item);
    await this.save();

    return item;
  }

  /**
   * Query Brand Brain using QMD (keyword + semantic matching)
   */
  async query(queryText: string, topK: number = 5): Promise<KnowledgeItem[]> {
    await this.load();
    if (!this.data || !this.data.knowledge.length) return [];

    const queryKeywords = this.extractKeywords(queryText);

    // Score each knowledge item
    const scored = this.data.knowledge.map(item => {
      const keywordScore = this.calculateKeywordScore(queryKeywords, item.keywords);
      const semanticScore = this.calculateSemanticScore(queryText, item.content);
      const typeBoost = this.getTypeBoost(item.type, queryText);

      return {
        item,
        score: (keywordScore * 0.4) + (semanticScore * 0.5) + (typeBoost * 0.1)
      };
    });

    // Sort by score and return top K
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(s => s.score > 0.1)
      .map(s => s.item);
  }

  /**
   * Get all knowledge of a specific type
   */
  async getByType(type: KnowledgeItem['type']): Promise<KnowledgeItem[]> {
    await this.load();
    if (!this.data) return [];
    return this.data.knowledge.filter(k => k.type === type);
  }

  /**
   * Add SOP (Standard Operating Procedure)
   */
  async addSOP(sop: {
    name: string;
    description: string;
    trigger: string;
    steps: string[];
    appliesTo: string[];
  }): Promise<void> {
    await this.load();
    if (!this.data) await this.initialize({});

    this.data!.sops.push({
      id: `sop_${Date.now()}`,
      ...sop,
      isActive: true,
      createdAt: new Date().toISOString()
    });

    await this.save();
  }

  /**
   * Add constraint (guardrail)
   */
  async addConstraint(constraint: {
    type: 'pricing' | 'discount' | 'policy' | 'custom';
    rule: string;
    severity: 'hard' | 'soft';
    appliesTo: string[];
  }): Promise<void> {
    await this.load();
    if (!this.data) await this.initialize({});

    this.data!.constraints.push({
      id: `constraint_${Date.now()}`,
      ...constraint,
      createdAt: new Date().toISOString()
    });

    await this.save();
  }

  /**
   * Add product/service information
   */
  async addProduct(product: {
    name: string;
    description: string;
    pricing?: string;
    features?: string[];
    category?: string;
  }): Promise<void> {
    await this.load();
    if (!this.data) await this.initialize({});

    this.data!.products.push({
      id: `product_${Date.now()}`,
      ...product,
      createdAt: new Date().toISOString()
    });

    // Also add as knowledge item for searchability
    await this.addKnowledge('product', `${product.name}: ${product.description}`, { productId: `product_${Date.now()}` });
  }

  /**
   * Add FAQ
   */
  async addFAQ(question: string, answer: string): Promise<void> {
    await this.load();
    if (!this.data) await this.initialize({});

    this.data!.faqs.push({
      id: `faq_${Date.now()}`,
      question,
      answer,
      createdAt: new Date().toISOString()
    });

    // Also add as knowledge item
    await this.addKnowledge('faq', `Q: ${question}\nA: ${answer}`);
  }

  /**
   * Generate context string for AI agents
   */
  async generateAgentContext(agentRole: string): Promise<string> {
    await this.load();
    if (!this.data) return '';

    let context = `## Business Context\n`;
    context += `Business: ${this.data.businessName}\n`;
    context += `Industry: ${this.data.industry}\n\n`;

    // Brand voice
    context += `## Brand Voice\n`;
    context += `Tone: ${this.data.brandVoice.tone}\n`;
    context += `Personality: ${this.data.brandVoice.personality}\n`;
    context += `Do: ${this.data.brandVoice.doList.join(', ')}\n`;
    context += `Don't: ${this.data.brandVoice.dontList.join(', ')}\n\n`;

    // Relevant SOPs for this agent
    const relevantSOPs = this.data.sops.filter(
      s => s.isActive && (s.appliesTo.includes('*') || s.appliesTo.includes(agentRole))
    );
    if (relevantSOPs.length > 0) {
      context += `## Standard Operating Procedures\n`;
      relevantSOPs.forEach(sop => {
        context += `### ${sop.name}\n`;
        context += `${sop.description}\n`;
        context += `Trigger: ${sop.trigger}\n`;
        context += `Steps: ${sop.steps.join(' → ')}\n\n`;
      });
    }

    // Constraints
    const relevantConstraints = this.data.constraints.filter(
      c => c.appliesTo.includes('*') || c.appliesTo.includes(agentRole)
    );
    if (relevantConstraints.length > 0) {
      context += `## Constraints & Guardrails\n`;
      relevantConstraints.forEach(c => {
        const severity = c.severity === 'hard' ? '[MUST]' : '[SHOULD]';
        context += `${severity} ${c.rule}\n`;
      });
    }

    return context;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
      'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also']);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  private calculateKeywordScore(queryKeywords: string[], itemKeywords: string[]): number {
    if (queryKeywords.length === 0 || itemKeywords.length === 0) return 0;

    const itemKeywordSet = new Set(itemKeywords);
    let matches = 0;

    for (const keyword of queryKeywords) {
      if (itemKeywordSet.has(keyword)) {
        matches++;
      } else {
        // Partial match
        for (const itemKeyword of itemKeywords) {
          if (itemKeyword.includes(keyword) || keyword.includes(itemKeyword)) {
            matches += 0.5;
            break;
          }
        }
      }
    }

    return matches / queryKeywords.length;
  }

  private calculateSemanticScore(query: string, content: string): number {
    // Simple semantic similarity based on word overlap and position
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);

    let score = 0;
    for (const qWord of queryWords) {
      const index = contentWords.indexOf(qWord);
      if (index !== -1) {
        // Earlier matches get higher scores
        score += 1 - (index / contentWords.length) * 0.5;
      }
    }

    return Math.min(score / queryWords.length, 1);
  }

  private getTypeBoost(type: KnowledgeItem['type'], queryText: string): number {
    const lower = queryText.toLowerCase();

    // Boost certain types based on query intent
    if (lower.includes('price') || lower.includes('cost') || lower.includes('buy')) {
      return type === 'product' ? 1 : type === 'policy' ? 0.5 : 0;
    }
    if (lower.includes('how') || lower.includes('what') || lower.includes('why')) {
      return type === 'faq' ? 1 : type === 'sop' ? 0.5 : 0;
    }
    if (lower.includes('rule') || lower.includes('policy') || lower.includes('can we')) {
      return type === 'constraint' ? 1 : type === 'policy' ? 0.8 : 0;
    }

    return 0;
  }
}
