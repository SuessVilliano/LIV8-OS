import axios from 'axios';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

interface ScrapeResult {
    success: boolean;
    data?: {
        markdown?: string;
        html?: string;
        rawHtml?: string;
        links?: string[];
        metadata?: {
            title?: string;
            description?: string;
            language?: string;
            sourceURL?: string;
            ogImage?: string;
            ogTitle?: string;
            ogDescription?: string;
        };
        llm_extraction?: Record<string, unknown>;
    };
    error?: string;
}

interface CrawlResult {
    success: boolean;
    id?: string;
    status?: string;
    total?: number;
    completed?: number;
    data?: Array<{
        markdown?: string;
        html?: string;
        metadata?: Record<string, unknown>;
        sourceURL?: string;
    }>;
    error?: string;
}

interface MapResult {
    success: boolean;
    links?: string[];
    error?: string;
}

interface ExtractResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

interface BrandScrapingResult {
    businessName: string;
    tagline?: string;
    description: string;
    services: string[];
    products: string[];
    targetAudience?: string;
    uniqueValue?: string;
    brandVoice?: string;
    colors: string[];
    fonts: string[];
    socialLinks: Record<string, string>;
    contactInfo: {
        email?: string;
        phone?: string;
        address?: string;
    };
    faqs: Array<{ question: string; answer: string }>;
    testimonials: Array<{ author: string; content: string; rating?: number }>;
    teamMembers: Array<{ name: string; role: string; bio?: string }>;
    pricingInfo: string[];
    pagesTrawled: number;
    confidence: number;
}

/**
 * Firecrawl Service
 *
 * Advanced web scraping using Firecrawl's AI-powered extraction.
 * Perfect for brand onboarding - extracts structured business data from websites.
 */
export const firecrawl = {
    /**
     * Check if Firecrawl is configured
     */
    isConfigured(): boolean {
        return !!FIRECRAWL_API_KEY;
    },

    /**
     * Scrape a single URL
     */
    async scrape(url: string, options?: {
        formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
        includeTags?: string[];
        excludeTags?: string[];
        onlyMainContent?: boolean;
        waitFor?: number;
    }): Promise<ScrapeResult> {
        if (!FIRECRAWL_API_KEY) {
            throw new Error('Firecrawl API key not configured');
        }

        try {
            const response = await axios.post(
                `${FIRECRAWL_BASE_URL}/scrape`,
                {
                    url,
                    formats: options?.formats || ['markdown', 'html'],
                    includeTags: options?.includeTags,
                    excludeTags: options?.excludeTags,
                    onlyMainContent: options?.onlyMainContent ?? true,
                    waitFor: options?.waitFor || 0
                },
                {
                    headers: {
                        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('[Firecrawl] Scrape failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    },

    /**
     * Crawl a website (multiple pages)
     */
    async crawl(url: string, options?: {
        limit?: number;
        maxDepth?: number;
        includePaths?: string[];
        excludePaths?: string[];
        allowBackwardLinks?: boolean;
        allowExternalLinks?: boolean;
    }): Promise<CrawlResult> {
        if (!FIRECRAWL_API_KEY) {
            throw new Error('Firecrawl API key not configured');
        }

        try {
            // Start the crawl
            const startResponse = await axios.post(
                `${FIRECRAWL_BASE_URL}/crawl`,
                {
                    url,
                    limit: options?.limit || 20,
                    maxDepth: options?.maxDepth || 3,
                    includePaths: options?.includePaths,
                    excludePaths: options?.excludePaths || ['/blog/*', '/news/*', '/careers/*'],
                    allowBackwardLinks: options?.allowBackwardLinks ?? false,
                    allowExternalLinks: options?.allowExternalLinks ?? false,
                    scrapeOptions: {
                        formats: ['markdown', 'html'],
                        onlyMainContent: true
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!startResponse.data.success) {
                return { success: false, error: startResponse.data.error };
            }

            const crawlId = startResponse.data.id;
            console.log(`[Firecrawl] Crawl started: ${crawlId}`);

            // Poll for completion
            let status = 'scraping';
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max

            while (status === 'scraping' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                attempts++;

                const statusResponse = await axios.get(
                    `${FIRECRAWL_BASE_URL}/crawl/${crawlId}`,
                    {
                        headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` }
                    }
                );

                status = statusResponse.data.status;
                console.log(`[Firecrawl] Crawl status: ${status} (${statusResponse.data.completed || 0}/${statusResponse.data.total || 0})`);

                if (status === 'completed') {
                    return {
                        success: true,
                        data: statusResponse.data.data,
                        total: statusResponse.data.total,
                        completed: statusResponse.data.completed
                    };
                }

                if (status === 'failed') {
                    return {
                        success: false,
                        error: statusResponse.data.error || 'Crawl failed'
                    };
                }
            }

            return {
                success: false,
                error: 'Crawl timed out'
            };

        } catch (error: any) {
            console.error('[Firecrawl] Crawl failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    },

    /**
     * Map a website - quickly discover all URLs without scraping content
     */
    async map(url: string, options?: {
        search?: string;
        ignoreSitemap?: boolean;
        includeSubdomains?: boolean;
        limit?: number;
    }): Promise<MapResult> {
        if (!FIRECRAWL_API_KEY) {
            throw new Error('Firecrawl API key not configured');
        }

        try {
            const response = await axios.post(
                `${FIRECRAWL_BASE_URL}/map`,
                {
                    url,
                    search: options?.search,
                    ignoreSitemap: options?.ignoreSitemap ?? false,
                    includeSubdomains: options?.includeSubdomains ?? false,
                    limit: options?.limit || 100
                },
                {
                    headers: {
                        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: response.data.success,
                links: response.data.links
            };
        } catch (error: any) {
            console.error('[Firecrawl] Map failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    },

    /**
     * Extract structured data using LLM
     */
    async extract(urls: string[], schema: Record<string, unknown>, prompt?: string): Promise<ExtractResult> {
        if (!FIRECRAWL_API_KEY) {
            throw new Error('Firecrawl API key not configured');
        }

        try {
            const response = await axios.post(
                `${FIRECRAWL_BASE_URL}/extract`,
                {
                    urls,
                    schema,
                    prompt: prompt || 'Extract the specified data from these pages'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                }
            );

            return {
                success: response.data.success,
                data: response.data.data
            };
        } catch (error: any) {
            console.error('[Firecrawl] Extract failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    },

    /**
     * Complete brand scraping - crawls website and extracts all brand information
     * Perfect for onboarding new businesses
     */
    async scrapeBrandInfo(domain: string): Promise<BrandScrapingResult> {
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        console.log(`[Firecrawl] Starting brand scrape for: ${url}`);

        const result: BrandScrapingResult = {
            businessName: '',
            description: '',
            services: [],
            products: [],
            colors: [],
            fonts: [],
            socialLinks: {},
            contactInfo: {},
            faqs: [],
            testimonials: [],
            teamMembers: [],
            pricingInfo: [],
            pagesTrawled: 0,
            confidence: 0
        };

        try {
            // First, map the website to find all relevant pages
            const mapResult = await this.map(url, { limit: 50 });
            const links = mapResult.links || [url];

            // Identify important pages
            const importantPages = {
                home: url,
                about: links.find(l => /about|who-we-are|our-story/i.test(l)),
                services: links.find(l => /services|solutions|what-we-do/i.test(l)),
                products: links.find(l => /products|shop|store/i.test(l)),
                pricing: links.find(l => /pricing|plans|packages/i.test(l)),
                contact: links.find(l => /contact|get-in-touch|reach-us/i.test(l)),
                team: links.find(l => /team|people|staff|about-us/i.test(l)),
                faq: links.find(l => /faq|help|support|questions/i.test(l)),
                testimonials: links.find(l => /testimonials|reviews|clients|success/i.test(l))
            };

            // Pages to scrape
            const pagesToScrape = Object.values(importantPages).filter(Boolean) as string[];
            result.pagesTrawled = pagesToScrape.length;

            // Scrape each page
            const scrapedPages: Array<{ url: string; content: string; html?: string }> = [];

            for (const pageUrl of pagesToScrape.slice(0, 10)) {
                const scrapeResult = await this.scrape(pageUrl, {
                    formats: ['markdown', 'html'],
                    onlyMainContent: true
                });

                if (scrapeResult.success && scrapeResult.data) {
                    scrapedPages.push({
                        url: pageUrl,
                        content: scrapeResult.data.markdown || '',
                        html: scrapeResult.data.html
                    });

                    // Extract metadata from homepage
                    if (pageUrl === url && scrapeResult.data.metadata) {
                        result.businessName = scrapeResult.data.metadata.ogTitle ||
                            scrapeResult.data.metadata.title?.split('|')[0]?.trim() ||
                            scrapeResult.data.metadata.title?.split('-')[0]?.trim() || '';
                        result.description = scrapeResult.data.metadata.ogDescription ||
                            scrapeResult.data.metadata.description || '';
                    }
                }

                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Extract structured data using LLM
            if (scrapedPages.length > 0) {
                const combinedContent = scrapedPages
                    .map(p => `--- PAGE: ${p.url} ---\n${p.content}`)
                    .join('\n\n')
                    .substring(0, 50000); // Limit content size

                const extractResult = await this.extract(
                    [url],
                    {
                        type: 'object',
                        properties: {
                            businessName: { type: 'string' },
                            tagline: { type: 'string' },
                            description: { type: 'string' },
                            services: { type: 'array', items: { type: 'string' } },
                            products: { type: 'array', items: { type: 'string' } },
                            targetAudience: { type: 'string' },
                            uniqueValue: { type: 'string' },
                            brandVoice: { type: 'string' },
                            email: { type: 'string' },
                            phone: { type: 'string' },
                            address: { type: 'string' },
                            socialLinks: {
                                type: 'object',
                                properties: {
                                    facebook: { type: 'string' },
                                    instagram: { type: 'string' },
                                    twitter: { type: 'string' },
                                    linkedin: { type: 'string' },
                                    youtube: { type: 'string' },
                                    tiktok: { type: 'string' }
                                }
                            },
                            faqs: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        question: { type: 'string' },
                                        answer: { type: 'string' }
                                    }
                                }
                            },
                            testimonials: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        author: { type: 'string' },
                                        content: { type: 'string' },
                                        rating: { type: 'number' }
                                    }
                                }
                            },
                            teamMembers: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        role: { type: 'string' },
                                        bio: { type: 'string' }
                                    }
                                }
                            },
                            pricingInfo: { type: 'array', items: { type: 'string' } }
                        }
                    },
                    `Extract comprehensive business information from this website.
                    Focus on: company name, services/products offered, target audience, brand voice/personality,
                    unique value proposition, contact details, social media links, FAQs, testimonials, team members, and pricing.

                    Website content:
                    ${combinedContent}`
                );

                if (extractResult.success && extractResult.data) {
                    const data = extractResult.data as any;
                    result.businessName = data.businessName || result.businessName;
                    result.tagline = data.tagline;
                    result.description = data.description || result.description;
                    result.services = data.services || [];
                    result.products = data.products || [];
                    result.targetAudience = data.targetAudience;
                    result.uniqueValue = data.uniqueValue;
                    result.brandVoice = data.brandVoice;
                    result.contactInfo = {
                        email: data.email,
                        phone: data.phone,
                        address: data.address
                    };
                    result.socialLinks = data.socialLinks || {};
                    result.faqs = data.faqs || [];
                    result.testimonials = data.testimonials || [];
                    result.teamMembers = data.teamMembers || [];
                    result.pricingInfo = data.pricingInfo || [];
                }
            }

            // Extract colors and fonts from HTML
            const homePageHtml = scrapedPages.find(p => p.url === url)?.html || '';
            result.colors = this.extractColors(homePageHtml);
            result.fonts = this.extractFonts(homePageHtml);

            // Extract social links from HTML if not found via LLM
            if (Object.keys(result.socialLinks).length === 0) {
                result.socialLinks = this.extractSocialLinks(homePageHtml);
            }

            // Calculate confidence score
            let filledFields = 0;
            if (result.businessName) filledFields++;
            if (result.description) filledFields++;
            if (result.services.length > 0) filledFields++;
            if (result.contactInfo.email || result.contactInfo.phone) filledFields++;
            if (Object.keys(result.socialLinks).length > 0) filledFields++;
            if (result.faqs.length > 0) filledFields++;
            if (result.testimonials.length > 0) filledFields++;

            result.confidence = Math.round((filledFields / 7) * 100);

            console.log(`[Firecrawl] Brand scrape complete. Confidence: ${result.confidence}%`);
            return result;

        } catch (error: any) {
            console.error('[Firecrawl] Brand scrape failed:', error.message);
            return result;
        }
    },

    /**
     * Extract colors from HTML
     */
    extractColors(html: string): string[] {
        const colorRegex = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g;
        const matches = html.match(colorRegex) || [];
        return [...new Set(matches)].slice(0, 10);
    },

    /**
     * Extract fonts from HTML
     */
    extractFonts(html: string): string[] {
        const fonts: string[] = [];
        const fontRegex = /font-family:\s*['"]?([^;'"]+)['"]?/gi;
        let match;

        while ((match = fontRegex.exec(html)) !== null) {
            const fontFamily = match[1].split(',')[0].trim().replace(/['"]/g, '');
            if (fontFamily && !fonts.includes(fontFamily) && fontFamily.length < 50) {
                fonts.push(fontFamily);
            }
        }

        // Also check for Google Fonts
        const googleFontRegex = /fonts\.googleapis\.com\/css[^"']*family=([^"'&]+)/g;
        while ((match = googleFontRegex.exec(html)) !== null) {
            const fontName = decodeURIComponent(match[1]).replace(/\+/g, ' ').split(':')[0];
            if (!fonts.includes(fontName)) {
                fonts.push(fontName);
            }
        }

        return fonts.slice(0, 10);
    },

    /**
     * Extract social links from HTML
     */
    extractSocialLinks(html: string): Record<string, string> {
        const socialLinks: Record<string, string> = {};

        const patterns: Record<string, RegExp> = {
            facebook: /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+/gi,
            instagram: /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi,
            twitter: /https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9._-]+/gi,
            linkedin: /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9._-]+/gi,
            youtube: /https?:\/\/(www\.)?youtube\.com\/(channel|c|@)[a-zA-Z0-9._-]+/gi,
            tiktok: /https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+/gi
        };

        for (const [platform, regex] of Object.entries(patterns)) {
            const match = html.match(regex);
            if (match && match[0]) {
                socialLinks[platform] = match[0];
            }
        }

        return socialLinks;
    }
};

export default firecrawl;
