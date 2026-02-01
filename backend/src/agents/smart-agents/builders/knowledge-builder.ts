/**
 * Knowledge Builder Agent
 *
 * Builds comprehensive knowledge bases from:
 * - Website scanning (leverages Brand Scanner)
 * - Document uploads (PDF, DOCX, TXT)
 * - User Q&A conversations
 * - FAQ imports
 * - Competitor analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KnowledgeEntry } from '../types.js';
import { BrandBrain, brandScanner } from '../../../services/brand-scanner.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Knowledge categories and their extraction patterns
 */
const KNOWLEDGE_CATEGORIES = {
    faq: {
        patterns: ['frequently asked', 'common questions', 'q&a', 'faq'],
        priority: 1
    },
    product: {
        patterns: ['product', 'item', 'merchandise', 'offering'],
        priority: 2
    },
    service: {
        patterns: ['service', 'solution', 'what we do', 'how we help'],
        priority: 2
    },
    policy: {
        patterns: ['policy', 'terms', 'guarantee', 'warranty', 'return', 'refund'],
        priority: 3
    },
    process: {
        patterns: ['process', 'how it works', 'steps', 'procedure', 'workflow'],
        priority: 2
    },
    script: {
        patterns: ['script', 'response', 'template', 'reply'],
        priority: 1
    }
};

/**
 * Knowledge extraction prompt
 */
const KNOWLEDGE_EXTRACTION_PROMPT = `You are a knowledge extraction specialist. Extract structured knowledge from the provided content.

For each piece of knowledge, identify:
1. Category: faq, product, service, policy, process, or script
2. Title: Clear, searchable title
3. Content: Complete, accurate information
4. Keywords: 3-5 relevant search terms

Format as JSON array:
[
  {
    "category": "faq",
    "title": "What are your business hours?",
    "content": "We are open Monday-Friday 9am-5pm EST...",
    "keywords": ["hours", "open", "schedule"]
  }
]`;

/**
 * Knowledge Builder Class
 */
export class KnowledgeBuilder {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        if (GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        }
    }

    /**
     * Build knowledge base from website
     */
    async buildFromWebsite(websiteUrl: string): Promise<{
        brandBrain: BrandBrain;
        entries: KnowledgeEntry[];
        summary: string;
    }> {
        console.log('[KnowledgeBuilder] Scanning website:', websiteUrl);

        // Use existing brand scanner
        const brandBrain = await brandScanner.scanWebsite(websiteUrl);

        // Extract additional knowledge from brand brain
        const entries = await this.extractKnowledgeFromBrandBrain(brandBrain);

        // Generate summary
        const summary = this.generateKnowledgeSummary(brandBrain, entries);

        return {
            brandBrain,
            entries,
            summary
        };
    }

    /**
     * Extract knowledge entries from brand brain
     */
    async extractKnowledgeFromBrandBrain(brandBrain: BrandBrain): Promise<KnowledgeEntry[]> {
        const entries: KnowledgeEntry[] = [];
        const timestamp = new Date().toISOString();

        // Extract FAQs
        if (brandBrain.faqs && brandBrain.faqs.length > 0) {
            for (const faq of brandBrain.faqs) {
                entries.push({
                    id: `kb_faq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    category: 'faq',
                    title: faq.q,
                    content: faq.a,
                    keywords: this.extractKeywords(faq.q + ' ' + faq.a),
                    source: brandBrain.domain,
                    lastUpdated: timestamp
                });
            }
        }

        // Extract services as knowledge
        if (brandBrain.key_services && brandBrain.key_services.length > 0) {
            for (const service of brandBrain.key_services) {
                entries.push({
                    id: `kb_service_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    category: 'service',
                    title: service,
                    content: `${brandBrain.brand_name} offers ${service}. ${brandBrain.primary_offer}`,
                    keywords: [service.toLowerCase(), brandBrain.industry_niche.toLowerCase(), 'service'],
                    source: brandBrain.domain,
                    lastUpdated: timestamp
                });
            }
        }

        // Create main business info entry
        entries.push({
            id: `kb_business_${Date.now()}`,
            category: 'process',
            title: `About ${brandBrain.brand_name}`,
            content: `${brandBrain.brand_name} is a ${brandBrain.industry_niche} business located in ${brandBrain.geographic_location}. ${brandBrain.primary_offer}. Our main services include: ${brandBrain.key_services.join(', ')}.`,
            keywords: [brandBrain.brand_name.toLowerCase(), brandBrain.industry_niche.toLowerCase(), 'about', 'business'],
            source: brandBrain.domain,
            lastUpdated: timestamp
        });

        // Create do/don't say guidelines as scripts
        if (brandBrain.do_say && brandBrain.do_say.length > 0) {
            entries.push({
                id: `kb_dosay_${Date.now()}`,
                category: 'script',
                title: 'Approved Phrases and Talking Points',
                content: `When representing ${brandBrain.brand_name}, use these approved phrases:\n\n${brandBrain.do_say.map(s => `• ${s}`).join('\n')}`,
                keywords: ['approved', 'phrases', 'talking points', 'say'],
                source: brandBrain.domain,
                lastUpdated: timestamp
            });
        }

        if (brandBrain.dont_say && brandBrain.dont_say.length > 0) {
            entries.push({
                id: `kb_dontsay_${Date.now()}`,
                category: 'script',
                title: 'Phrases to Avoid',
                content: `When representing ${brandBrain.brand_name}, NEVER say:\n\n${brandBrain.dont_say.map(s => `• ${s}`).join('\n')}`,
                keywords: ['avoid', 'never', 'prohibited', 'dont say'],
                source: brandBrain.domain,
                lastUpdated: timestamp
            });
        }

        return entries;
    }

    /**
     * Build knowledge from raw text/document content
     */
    async buildFromText(params: {
        content: string;
        source: string;
        businessName?: string;
    }): Promise<KnowledgeEntry[]> {
        if (!this.genAI) {
            return this.manualTextExtraction(params);
        }

        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });

            const prompt = `${KNOWLEDGE_EXTRACTION_PROMPT}

Business Context: ${params.businessName || 'Unknown business'}

Content to extract from:
---
${params.content.slice(0, 10000)}
---

Extract all relevant knowledge entries:`;

            const result = await model.generateContent(prompt);
            const extracted = JSON.parse(result.response.text());

            return extracted.map((item: any, index: number) => ({
                id: `kb_text_${Date.now()}_${index}`,
                category: item.category || 'process',
                title: item.title,
                content: item.content,
                keywords: item.keywords || [],
                source: params.source,
                lastUpdated: new Date().toISOString()
            }));
        } catch (error) {
            console.error('[KnowledgeBuilder] AI extraction failed:', error);
            return this.manualTextExtraction(params);
        }
    }

    /**
     * Build knowledge from Q&A conversation
     */
    async buildFromQA(params: {
        questions: { q: string; a: string }[];
        businessName: string;
        category?: KnowledgeEntry['category'];
    }): Promise<KnowledgeEntry[]> {
        const entries: KnowledgeEntry[] = [];

        for (const qa of params.questions) {
            entries.push({
                id: `kb_qa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                category: params.category || 'faq',
                title: qa.q,
                content: qa.a,
                keywords: this.extractKeywords(qa.q),
                source: `${params.businessName} - User Input`,
                lastUpdated: new Date().toISOString()
            });
        }

        return entries;
    }

    /**
     * Build objection handling scripts
     */
    async buildObjectionHandlers(params: {
        brandBrain: BrandBrain;
        commonObjections?: string[];
    }): Promise<KnowledgeEntry[]> {
        const objections = params.commonObjections || [
            'Too expensive',
            'Need to think about it',
            'Not the right time',
            'Already working with someone',
            'Need to talk to spouse/partner',
            'Can I get a discount?'
        ];

        if (!this.genAI) {
            return this.getDefaultObjectionHandlers(params.brandBrain, objections);
        }

        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });

            const prompt = `Create objection handling scripts for ${params.brandBrain.brand_name}, a ${params.brandBrain.industry_niche} business.

Brand Context:
- Primary Offer: ${params.brandBrain.primary_offer}
- Services: ${params.brandBrain.key_services.join(', ')}
- Tone: Professional ${Math.round(params.brandBrain.tone_profile.professional * 100)}%, Friendly ${Math.round(params.brandBrain.tone_profile.friendly * 100)}%

For each objection, provide a script that:
1. Acknowledges the concern
2. Reframes it positively
3. Provides value/social proof
4. Guides toward next step

Objections to handle:
${objections.map((o, i) => `${i + 1}. "${o}"`).join('\n')}

Return JSON:
{
  "handlers": [
    {
      "objection": "the objection",
      "response": "the full script response",
      "keyPoints": ["point1", "point2"]
    }
  ]
}`;

            const result = await model.generateContent(prompt);
            const response = JSON.parse(result.response.text());

            return response.handlers.map((handler: any, index: number) => ({
                id: `kb_objection_${Date.now()}_${index}`,
                category: 'script' as const,
                title: `Objection: ${handler.objection}`,
                content: handler.response,
                keywords: ['objection', 'sales', handler.objection.toLowerCase().split(' ')[0]],
                source: params.brandBrain.domain,
                lastUpdated: new Date().toISOString()
            }));
        } catch (error) {
            console.error('[KnowledgeBuilder] Objection generation failed:', error);
            return this.getDefaultObjectionHandlers(params.brandBrain, objections);
        }
    }

    /**
     * Build competitor analysis knowledge
     */
    async buildCompetitorInsights(params: {
        brandBrain: BrandBrain;
        competitorUrls: string[];
    }): Promise<KnowledgeEntry[]> {
        const entries: KnowledgeEntry[] = [];

        for (const url of params.competitorUrls) {
            try {
                const competitorBrain = await brandScanner.scanWebsite(url);

                entries.push({
                    id: `kb_competitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    category: 'process',
                    title: `Competitor Analysis: ${competitorBrain.brand_name}`,
                    content: `**${competitorBrain.brand_name}** (${competitorBrain.domain})

**Their Services:**
${competitorBrain.key_services.map((s: string) => `• ${s}`).join('\n')}

**Their Positioning:**
${competitorBrain.primary_offer}

**How We Differ:**
Use this knowledge to highlight our unique value: ${params.brandBrain.primary_offer}`,
                    keywords: ['competitor', competitorBrain.brand_name.toLowerCase(), 'comparison'],
                    source: url,
                    lastUpdated: new Date().toISOString()
                });
            } catch (error) {
                console.error('[KnowledgeBuilder] Failed to scan competitor:', url, error);
            }
        }

        return entries;
    }

    /**
     * Search knowledge base
     */
    searchKnowledge(entries: KnowledgeEntry[], query: string): KnowledgeEntry[] {
        const queryTerms = query.toLowerCase().split(/\s+/);

        return entries
            .map(entry => {
                let score = 0;

                // Title match (highest weight)
                const titleLower = entry.title.toLowerCase();
                for (const term of queryTerms) {
                    if (titleLower.includes(term)) score += 3;
                }

                // Keyword match (medium weight)
                for (const term of queryTerms) {
                    if (entry.keywords.some(k => k.toLowerCase().includes(term))) score += 2;
                }

                // Content match (lowest weight)
                const contentLower = entry.content.toLowerCase();
                for (const term of queryTerms) {
                    if (contentLower.includes(term)) score += 1;
                }

                return { entry, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.entry);
    }

    /**
     * Merge and deduplicate knowledge entries
     */
    mergeKnowledge(existing: KnowledgeEntry[], newEntries: KnowledgeEntry[]): KnowledgeEntry[] {
        const merged = [...existing];
        const existingTitles = new Set(existing.map(e => e.title.toLowerCase()));

        for (const entry of newEntries) {
            if (!existingTitles.has(entry.title.toLowerCase())) {
                merged.push(entry);
                existingTitles.add(entry.title.toLowerCase());
            }
        }

        return merged;
    }

    /**
     * Generate knowledge summary
     */
    private generateKnowledgeSummary(brandBrain: BrandBrain, entries: KnowledgeEntry[]): string {
        const categoryCounts = entries.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return `Knowledge base for ${brandBrain.brand_name}:
- Total entries: ${entries.length}
- FAQs: ${categoryCounts.faq || 0}
- Services: ${categoryCounts.service || 0}
- Scripts: ${categoryCounts.script || 0}
- Policies: ${categoryCounts.policy || 0}
- Processes: ${categoryCounts.process || 0}

Industry: ${brandBrain.industry_niche}
Location: ${brandBrain.geographic_location}`;
    }

    /**
     * Extract keywords from text
     */
    private extractKeywords(text: string): string[] {
        const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'about', 'against', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their']);

        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

        // Get unique words, prioritize by frequency
        const wordCounts = words.reduce((acc, w) => {
            acc[w] = (acc[w] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    /**
     * Manual text extraction fallback
     */
    private manualTextExtraction(params: { content: string; source: string; businessName?: string }): KnowledgeEntry[] {
        const entries: KnowledgeEntry[] = [];
        const paragraphs = params.content.split(/\n\n+/).filter(p => p.trim().length > 50);

        for (let i = 0; i < Math.min(paragraphs.length, 10); i++) {
            const para = paragraphs[i].trim();
            const firstSentence = para.split(/[.!?]/)[0];

            entries.push({
                id: `kb_text_${Date.now()}_${i}`,
                category: 'process',
                title: firstSentence.slice(0, 100) + (firstSentence.length > 100 ? '...' : ''),
                content: para,
                keywords: this.extractKeywords(para),
                source: params.source,
                lastUpdated: new Date().toISOString()
            });
        }

        return entries;
    }

    /**
     * Default objection handlers fallback
     */
    private getDefaultObjectionHandlers(brandBrain: BrandBrain, objections: string[]): KnowledgeEntry[] {
        const defaultResponses: Record<string, string> = {
            'Too expensive': `I understand budget is important. Let me share what our clients typically say - they find that working with ${brandBrain.brand_name} actually saves them money in the long run because of [specific value]. Would you like me to walk you through how we've helped similar businesses?`,
            'Need to think about it': `Absolutely, this is an important decision. While you're thinking it over, what specific questions can I answer to help with your decision? I want to make sure you have all the information you need.`,
            'Not the right time': `I hear you. Timing is everything. Just so I understand better - is there a specific event or date you're working toward? Sometimes our clients find that starting earlier actually gives them more flexibility.`,
            'Already working with someone': `That's great that you're already taking care of this! Out of curiosity, how's that going for you? I ask because many of our clients came to us after experiencing [common pain point in industry].`,
            'Need to talk to spouse/partner': `Of course, important decisions should be made together. Would it be helpful if I prepared a summary you could share with them? I could also be available for a quick call with both of you if that would help.`,
            'Can I get a discount?': `I appreciate you asking! While our pricing reflects the value we deliver, I'd love to explore what matters most to you. Sometimes we can structure things differently to fit your needs better.`
        };

        return objections.map((objection, index) => ({
            id: `kb_objection_${Date.now()}_${index}`,
            category: 'script' as const,
            title: `Objection: ${objection}`,
            content: defaultResponses[objection] || `I understand your concern about "${objection}". Let me address that...`,
            keywords: ['objection', 'sales', objection.toLowerCase().split(' ')[0]],
            source: brandBrain.domain,
            lastUpdated: new Date().toISOString()
        }));
    }
}

/**
 * Create KnowledgeBuilder instance
 */
export function createKnowledgeBuilder(): KnowledgeBuilder {
    return new KnowledgeBuilder();
}

export default KnowledgeBuilder;
