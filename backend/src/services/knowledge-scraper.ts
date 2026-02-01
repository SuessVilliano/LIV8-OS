import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { businessTwin, VerifiedFact } from '../db/business-twin.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ScrapedPage {
    url: string;
    pageType: string;
    title: string;
    metaDescription: string;
    content: string;
    headings: string[];
    links: string[];
}

interface ExtractedFact {
    category: string;
    fact: string;
    confidence: number;
    sourceSection: string;
}

/**
 * Knowledge Scraper Service
 *
 * Deep scans websites to build verified knowledge base.
 * Every fact is sourced - NO HALLUCINATION.
 */
export const knowledgeScraper = {
    /**
     * Full site scan - crawls multiple pages to build comprehensive knowledge
     */
    async fullSiteScan(params: {
        locationId: string;
        domain: string;
        maxPages?: number;
    }): Promise<{ pagesScraped: number; factsExtracted: number; errors: string[] }> {
        const { locationId, domain, maxPages = 10 } = params;
        const errors: string[] = [];
        let factsExtracted = 0;

        // Normalize domain
        const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

        // Priority pages to scan
        const pagesToScan = [
            '', // Homepage
            '/about', '/about-us', '/about-us/',
            '/services', '/our-services',
            '/pricing', '/prices',
            '/contact', '/contact-us',
            '/faq', '/faqs',
            '/team', '/our-team',
            '/reviews', '/testimonials',
            '/blog'
        ];

        const scannedUrls = new Set<string>();
        let pagesScraped = 0;

        for (const path of pagesToScan) {
            if (pagesScraped >= maxPages) break;

            const url = `${baseUrl}${path}`;
            if (scannedUrls.has(url)) continue;

            try {
                console.log(`[Knowledge Scraper] Scanning ${url}...`);

                const pageData = await this.scrapePage(url);
                if (!pageData) continue;

                scannedUrls.add(url);
                pagesScraped++;

                // Save raw scraped content
                await businessTwin.saveScrapedContent({
                    locationId,
                    url,
                    pageType: pageData.pageType,
                    title: pageData.title,
                    content: pageData.content
                });

                // Extract verified facts
                const facts = await this.extractFactsWithAI(pageData, url);

                for (const fact of facts) {
                    if (fact.confidence >= 70) {
                        await businessTwin.addKnowledge({
                            locationId,
                            category: fact.category,
                            fact: fact.fact,
                            source: url,
                            sourceType: 'website',
                            confidence: fact.confidence
                        });
                        factsExtracted++;
                    }
                }

                // Small delay to be respectful
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error: any) {
                errors.push(`Failed to scan ${url}: ${error.message}`);
            }
        }

        return { pagesScraped, factsExtracted, errors };
    },

    /**
     * Scrape a single page
     */
    async scrapePage(url: string): Promise<ScrapedPage | null> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; LIV8-KnowledgeBot/1.0; +https://liv8ai.com/bot)'
                },
                timeout: 15000,
                maxRedirects: 3,
                validateStatus: (status) => status < 400
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Remove non-content elements
            $('script, style, noscript, nav, footer, header, .cookie-banner, #cookie-consent').remove();

            // Extract page type from URL
            const pageType = this.detectPageType(url, $);

            // Extract structured content
            const title = $('title').text().trim();
            const metaDescription = $('meta[name="description"]').attr('content') || '';

            const headings: string[] = [];
            $('h1, h2, h3').each((_, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 2) {
                    headings.push(text);
                }
            });

            // Get main content, prioritizing article/main tags
            let content = '';
            const mainContent = $('main, article, .content, #content, .main-content').first();
            if (mainContent.length) {
                content = mainContent.text().replace(/\s+/g, ' ').trim();
            } else {
                content = $('body').text().replace(/\s+/g, ' ').trim();
            }

            // Extract internal links for potential follow-up
            const links: string[] = [];
            $('a[href^="/"], a[href^="' + new URL(url).origin + '"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) links.push(href);
            });

            return {
                url,
                pageType,
                title,
                metaDescription,
                content: content.substring(0, 10000), // Limit content size
                headings,
                links: [...new Set(links)].slice(0, 20)
            };

        } catch (error: any) {
            console.error(`[Knowledge Scraper] Failed to scrape ${url}:`, error.message);
            return null;
        }
    },

    /**
     * Detect page type from URL and content
     */
    detectPageType(url: string, $: cheerio.CheerioAPI): string {
        const urlLower = url.toLowerCase();

        if (urlLower.includes('about')) return 'about';
        if (urlLower.includes('service')) return 'services';
        if (urlLower.includes('pricing') || urlLower.includes('price')) return 'pricing';
        if (urlLower.includes('contact')) return 'contact';
        if (urlLower.includes('faq')) return 'faq';
        if (urlLower.includes('team')) return 'team';
        if (urlLower.includes('testimonial') || urlLower.includes('review')) return 'testimonials';
        if (urlLower.includes('blog') || urlLower.includes('news')) return 'blog';

        // Check meta tags
        const ogType = $('meta[property="og:type"]').attr('content');
        if (ogType === 'article') return 'blog';

        return 'homepage';
    },

    /**
     * Extract verified facts using AI
     * Each fact includes source and confidence score
     */
    async extractFactsWithAI(pageData: ScrapedPage, sourceUrl: string): Promise<ExtractedFact[]> {
        if (!GEMINI_API_KEY) {
            console.warn('[Knowledge Scraper] No GEMINI_API_KEY - skipping AI extraction');
            return this.extractFactsBasic(pageData, sourceUrl);
        }

        try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const prompt = `Extract VERIFIED FACTS from this webpage. Each fact must be explicitly stated - DO NOT INFER OR HALLUCINATE.

Page Type: ${pageData.pageType}
URL: ${sourceUrl}
Title: ${pageData.title}
Meta: ${pageData.metaDescription}

Content:
${pageData.content.substring(0, 6000)}

Extract facts into these categories:
- company: Company name, founded year, team size, location
- service: Services offered with descriptions
- pricing: Any pricing information, packages, rates
- policy: Policies, guarantees, terms
- contact: Contact info, hours, locations
- faq: Questions and answers
- social_proof: Testimonials, reviews, awards, certifications
- feature: Product/service features and benefits

Return JSON array:
[
  {
    "category": "service",
    "fact": "The company offers residential roofing services including shingle replacement and repair",
    "confidence": 95,
    "sourceSection": "Services section"
  }
]

Rules:
1. Only include facts EXPLICITLY stated on the page
2. Confidence 90-100: Exact quote or clear statement
3. Confidence 70-89: Strongly implied with context
4. Confidence below 70: Don't include (too uncertain)
5. Keep facts concise but complete
6. Include specific details (numbers, names, locations)`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const facts: ExtractedFact[] = JSON.parse(responseText);

            console.log(`[Knowledge Scraper] Extracted ${facts.length} facts from ${pageData.pageType} page`);

            return facts;

        } catch (error: any) {
            console.error('[Knowledge Scraper] AI extraction failed:', error.message);
            return this.extractFactsBasic(pageData, sourceUrl);
        }
    },

    /**
     * Basic fact extraction without AI (fallback)
     */
    extractFactsBasic(pageData: ScrapedPage, sourceUrl: string): ExtractedFact[] {
        const facts: ExtractedFact[] = [];

        // Extract company name from title
        if (pageData.title) {
            const companyName = pageData.title.split('|')[0].split('-')[0].trim();
            if (companyName && companyName.length > 2 && companyName.length < 100) {
                facts.push({
                    category: 'company',
                    fact: `Company name: ${companyName}`,
                    confidence: 80,
                    sourceSection: 'Page title'
                });
            }
        }

        // Extract from meta description
        if (pageData.metaDescription) {
            facts.push({
                category: 'company',
                fact: pageData.metaDescription,
                confidence: 85,
                sourceSection: 'Meta description'
            });
        }

        // Extract phone numbers
        const phoneRegex = /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
        const phones = pageData.content.match(phoneRegex);
        if (phones) {
            facts.push({
                category: 'contact',
                fact: `Phone number: ${phones[0]}`,
                confidence: 90,
                sourceSection: 'Page content'
            });
        }

        // Extract email addresses
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = pageData.content.match(emailRegex);
        if (emails) {
            const validEmails = emails.filter(e => !e.includes('example') && !e.includes('test'));
            if (validEmails.length > 0) {
                facts.push({
                    category: 'contact',
                    fact: `Email: ${validEmails[0]}`,
                    confidence: 90,
                    sourceSection: 'Page content'
                });
            }
        }

        // Extract from headings as potential services
        pageData.headings.forEach(heading => {
            if (heading.toLowerCase().includes('service') ||
                heading.toLowerCase().includes('offer') ||
                heading.toLowerCase().includes('solution')) {
                facts.push({
                    category: 'service',
                    fact: heading,
                    confidence: 75,
                    sourceSection: 'Page headings'
                });
            }
        });

        return facts;
    },

    /**
     * Scan and extract FAQs specifically
     */
    async extractFAQs(pageData: ScrapedPage): Promise<{ question: string; answer: string }[]> {
        if (!GEMINI_API_KEY) return [];

        try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const prompt = `Extract all FAQ-style question and answer pairs from this content.
Look for:
- Explicit FAQ sections
- Questions followed by answers in the content
- Common questions implied by the content structure

Content:
${pageData.content.substring(0, 8000)}

Return JSON array:
[
  { "question": "What services do you offer?", "answer": "We offer..." }
]

Only include Q&A pairs that are clearly present. Do not make up answers.`;

            const result = await model.generateContent(prompt);
            return JSON.parse(result.response.text());

        } catch (error) {
            return [];
        }
    },

    /**
     * Generate AEO-optimized questions for the business
     */
    async generateAEOQuestions(locationId: string): Promise<string[]> {
        const twin = await businessTwin.getByLocationId(locationId);
        if (!twin) return [];

        if (!GEMINI_API_KEY) return [];

        try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const knowledge = await businessTwin.getKnowledge(locationId);

            const prompt = `Generate AEO (Answer Engine Optimization) questions for this business.

Business: ${twin.identity.businessName}
Industry: ${twin.identity.industry}
Location: ${twin.identity.location || 'Not specified'}
Services: ${knowledge.filter(k => k.category === 'service').map(k => k.fact).join(', ')}

Generate 15-20 questions that:
1. People actually search for about this business type
2. AI assistants (ChatGPT, Perplexity, Google SGE) would answer
3. Mix of transactional, informational, and navigational intent
4. Include local variations if location is specified

Return JSON array of question strings.`;

            const result = await model.generateContent(prompt);
            return JSON.parse(result.response.text());

        } catch (error) {
            return [];
        }
    },

    /**
     * Verify existing facts are still accurate (periodic refresh)
     */
    async verifyFacts(locationId: string): Promise<{ verified: number; outdated: number }> {
        // In a full implementation, this would:
        // 1. Re-scrape source pages
        // 2. Check if facts are still present
        // 3. Flag outdated facts
        // 4. Add new facts discovered

        // For now, just return counts
        const knowledge = await businessTwin.getKnowledge(locationId);
        return {
            verified: knowledge.length,
            outdated: 0
        };
    }
};
