/**
 * LIV8 Unified Scraper API
 *
 * Combines Apify, RapidAPI, Firecrawl, and built-in scrapers for comprehensive
 * website intelligence, competitor analysis, and content extraction.
 */

import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { apifyScraper } from '../services/apify-scraper.js';
import { rapidApiScrapers } from '../services/rapidapi-scrapers.js';
import { kimiStudio } from '../services/kimi-studio.js';
import { firecrawl } from '../services/firecrawl.js';
import { knowledgeScraper } from '../services/knowledge-scraper.js';

const router = express.Router();

// Auth middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const payload = authService.verifyToken(token);
        (req as any).user = payload;
        next();
    } catch (error: any) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * GET /api/scrapers/status
 * Check which scraper services are configured
 */
router.get('/status', authenticate, async (req: Request, res: Response) => {
    res.json({
        success: true,
        services: {
            apify: {
                configured: apifyScraper.isConfigured(),
                capabilities: ['website', 'google-search', 'instagram', 'linkedin', 'google-maps']
            },
            rapidapi: {
                configured: rapidApiScrapers.isConfigured(),
                capabilities: ['website-metrics', 'seo-analysis', 'business-info', 'technology-stack', 'keywords']
            },
            kimi: {
                configured: kimiStudio.isConfigured(),
                capabilities: ['website-generation', 'component-generation', 'design-system', 'seo-content']
            },
            firecrawl: {
                configured: firecrawl.isConfigured(),
                capabilities: ['brand-scraping', 'website-crawl', 'llm-extraction', 'site-mapping']
            },
            builtin: {
                configured: true,
                capabilities: ['knowledge-extraction', 'fact-verification', 'faq-extraction']
            }
        }
    });
});

/**
 * POST /api/scrapers/website
 * Deep website scrape with multiple providers
 */
router.post('/website', authenticate, async (req: Request, res: Response) => {
    try {
        const { url, options } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const results: any = {
            url,
            scrapedAt: new Date().toISOString()
        };

        // Use Apify for deep scraping if available
        if (apifyScraper.isConfigured() && options?.deep) {
            try {
                const apifyData = await apifyScraper.scrapeWebsite({
                    url,
                    maxPages: options?.maxPages || 5,
                    extractContent: true
                });
                results.pages = apifyData;
                results.source = 'apify';
            } catch (error: any) {
                console.error('[Scrapers] Apify scrape failed:', error.message);
            }
        }

        // Fallback to built-in scraper
        if (!results.pages) {
            const scrapedPage = await knowledgeScraper.scrapePage(url);
            if (scrapedPage) {
                results.pages = [scrapedPage];
                results.source = 'builtin';
            }
        }

        // Add RapidAPI metrics if available
        if (rapidApiScrapers.isConfigured() && options?.includeMetrics) {
            try {
                const metrics = await rapidApiScrapers.getWebsiteMetrics(url);
                results.metrics = metrics;
            } catch (error: any) {
                console.error('[Scrapers] RapidAPI metrics failed:', error.message);
            }
        }

        // Add technology detection
        if (rapidApiScrapers.isConfigured() && options?.includeTechnologies) {
            try {
                const technologies = await rapidApiScrapers.detectTechnologies(url);
                results.technologies = technologies;
            } catch (error: any) {
                console.error('[Scrapers] Technology detection failed:', error.message);
            }
        }

        res.json({
            success: true,
            ...results
        });

    } catch (error: any) {
        console.error('[Scrapers] Website scrape error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/competitor-analysis
 * Full competitor analysis combining multiple data sources
 */
router.post('/competitor-analysis', authenticate, async (req: Request, res: Response) => {
    try {
        const { domain, options } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        const analysis: any = {
            domain,
            analyzedAt: new Date().toISOString()
        };

        // Website content and structure
        if (apifyScraper.isConfigured()) {
            try {
                const competitorData = await apifyScraper.analyzeCompetitor({
                    domain,
                    includeSocial: options?.includeSocial !== false
                });
                analysis.website = competitorData;
            } catch (error: any) {
                console.error('[Scrapers] Competitor analysis failed:', error.message);
            }
        }

        // Traffic and engagement metrics
        if (rapidApiScrapers.isConfigured()) {
            try {
                const metrics = await rapidApiScrapers.getWebsiteMetrics(domain);
                analysis.metrics = metrics;

                // SEO analysis
                const seoAnalysis = await rapidApiScrapers.analyzeSEO(`https://${domain}`);
                analysis.seo = seoAnalysis;

                // Technology stack
                const techStack = await rapidApiScrapers.detectTechnologies(`https://${domain}`);
                analysis.technologies = techStack;
            } catch (error: any) {
                console.error('[Scrapers] RapidAPI analysis failed:', error.message);
            }
        }

        // Business information
        if (rapidApiScrapers.isConfigured() && options?.includeBusinessInfo) {
            try {
                const businessInfo = await rapidApiScrapers.findBusinessInfo({ domain });
                analysis.business = businessInfo;
            } catch (error: any) {
                console.error('[Scrapers] Business info lookup failed:', error.message);
            }
        }

        res.json({
            success: true,
            analysis
        });

    } catch (error: any) {
        console.error('[Scrapers] Competitor analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/seo-audit
 * Comprehensive SEO audit of a website
 */
router.post('/seo-audit', authenticate, async (req: Request, res: Response) => {
    try {
        const { url, options } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const audit: any = {
            url,
            auditedAt: new Date().toISOString()
        };

        // Basic SEO analysis via RapidAPI
        if (rapidApiScrapers.isConfigured()) {
            try {
                const seoAnalysis = await rapidApiScrapers.analyzeSEO(url);
                audit.analysis = seoAnalysis;

                // Get keyword suggestions
                if (options?.keywords) {
                    const keywords = await rapidApiScrapers.getKeywordSuggestions({
                        keyword: options.keywords
                    });
                    audit.keywordSuggestions = keywords;
                }

                // Get structured data
                const structuredData = await rapidApiScrapers.extractStructuredData(url);
                audit.structuredData = structuredData;
            } catch (error: any) {
                console.error('[Scrapers] SEO audit failed:', error.message);
            }
        }

        // AI-powered content analysis using Kimi
        if (kimiStudio.isConfigured() && options?.includeAIAnalysis) {
            try {
                // First scrape the page
                const scrapedPage = await knowledgeScraper.scrapePage(url);
                if (scrapedPage) {
                    const aiAnalysis = await kimiStudio.analyzeWebsite(scrapedPage.content);
                    audit.aiAnalysis = aiAnalysis;
                }
            } catch (error: any) {
                console.error('[Scrapers] AI analysis failed:', error.message);
            }
        }

        res.json({
            success: true,
            audit
        });

    } catch (error: any) {
        console.error('[Scrapers] SEO audit error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/google-search
 * Search Google and return structured results
 */
router.post('/google-search', authenticate, async (req: Request, res: Response) => {
    try {
        const { query, maxResults, location } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        let results = [];

        // Try Apify first for more comprehensive results
        if (apifyScraper.isConfigured()) {
            try {
                results = await apifyScraper.searchGoogle({
                    query,
                    maxResults: maxResults || 10,
                    location: location || 'United States'
                });
            } catch (error: any) {
                console.error('[Scrapers] Apify search failed:', error.message);
            }
        }

        // Fallback to RapidAPI
        if (results.length === 0 && rapidApiScrapers.isConfigured()) {
            try {
                results = await rapidApiScrapers.searchGoogle({
                    query,
                    limit: maxResults || 10
                });
            } catch (error: any) {
                console.error('[Scrapers] RapidAPI search failed:', error.message);
            }
        }

        res.json({
            success: true,
            query,
            results,
            total: results.length
        });

    } catch (error: any) {
        console.error('[Scrapers] Google search error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/social-profiles
 * Scrape social media profiles
 */
router.post('/social-profiles', authenticate, async (req: Request, res: Response) => {
    try {
        const { platform, username, hashtag } = req.body;

        if (!platform) {
            return res.status(400).json({ error: 'Platform is required' });
        }

        let profileData = null;

        if (apifyScraper.isConfigured()) {
            try {
                if (platform === 'instagram') {
                    profileData = await apifyScraper.scrapeInstagram({ username, hashtag });
                } else if (platform === 'linkedin') {
                    profileData = await apifyScraper.scrapeLinkedIn({
                        profileUrl: username ? `https://linkedin.com/in/${username}` : undefined
                    });
                }
            } catch (error: any) {
                console.error('[Scrapers] Social scrape failed:', error.message);
            }
        }

        // Get social stats via RapidAPI
        if (rapidApiScrapers.isConfigured()) {
            try {
                const stats = await rapidApiScrapers.getSocialStats({
                    [platform]: username
                });
                if (profileData) {
                    profileData.stats = stats[platform];
                } else {
                    profileData = { platform, username, stats: stats[platform] };
                }
            } catch (error: any) {
                console.error('[Scrapers] Social stats failed:', error.message);
            }
        }

        res.json({
            success: true,
            profile: profileData
        });

    } catch (error: any) {
        console.error('[Scrapers] Social profiles error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/local-business
 * Search for local businesses (Google Maps, Yelp, etc.)
 */
router.post('/local-business', authenticate, async (req: Request, res: Response) => {
    try {
        const { query, location, maxResults } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        let businesses = [];

        // Use Apify Google Maps scraper
        if (apifyScraper.isConfigured()) {
            try {
                businesses = await apifyScraper.scrapeGoogleMaps({
                    searchQuery: query,
                    location,
                    maxResults: maxResults || 20
                });
            } catch (error: any) {
                console.error('[Scrapers] Google Maps scrape failed:', error.message);
            }
        }

        // Supplement with RapidAPI business lookup
        if (rapidApiScrapers.isConfigured() && businesses.length === 0) {
            try {
                const businessInfo = await rapidApiScrapers.findBusinessInfo({
                    name: query,
                    location
                });
                if (businessInfo) {
                    businesses = [businessInfo];
                }
            } catch (error: any) {
                console.error('[Scrapers] Business lookup failed:', error.message);
            }
        }

        res.json({
            success: true,
            query,
            location,
            businesses,
            total: businesses.length
        });

    } catch (error: any) {
        console.error('[Scrapers] Local business error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/design-inspiration
 * Find design inspiration for website building
 */
router.post('/design-inspiration', authenticate, async (req: Request, res: Response) => {
    try {
        const { industry, style, limit } = req.body;

        if (!industry) {
            return res.status(400).json({ error: 'Industry is required' });
        }

        let inspiration = [];

        if (apifyScraper.isConfigured()) {
            try {
                inspiration = await apifyScraper.scrapeDesignInspiration({
                    industry,
                    style: style || 'modern',
                    limit: limit || 10
                });
            } catch (error: any) {
                console.error('[Scrapers] Design inspiration failed:', error.message);
            }
        }

        // If Kimi is available, generate design system suggestions
        let designSystem = null;
        if (kimiStudio.isConfigured()) {
            try {
                designSystem = await kimiStudio.generateDesignSystem({
                    brandName: `${industry} brand`,
                    industry,
                    personality: [style || 'modern', 'professional', 'trustworthy']
                });
            } catch (error: any) {
                console.error('[Scrapers] Design system generation failed:', error.message);
            }
        }

        res.json({
            success: true,
            industry,
            style,
            inspiration,
            suggestedDesignSystem: designSystem
        });

    } catch (error: any) {
        console.error('[Scrapers] Design inspiration error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/extract-knowledge
 * Extract verified facts from a website for Business Twin
 */
router.post('/extract-knowledge', authenticate, async (req: Request, res: Response) => {
    try {
        const { url, locationId, maxPages } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Use the built-in knowledge scraper
        const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

        const result = await knowledgeScraper.fullSiteScan({
            locationId: locationId || 'temp',
            domain,
            maxPages: maxPages || 10
        });

        res.json({
            success: true,
            domain,
            ...result
        });

    } catch (error: any) {
        console.error('[Scrapers] Knowledge extraction error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/find-emails
 * Find email addresses for a company
 */
router.post('/find-emails', authenticate, async (req: Request, res: Response) => {
    try {
        const { domain, firstName, lastName } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        let emails = [];

        if (rapidApiScrapers.isConfigured()) {
            try {
                emails = await rapidApiScrapers.findEmails({ domain, firstName, lastName });
            } catch (error: any) {
                console.error('[Scrapers] Email finder failed:', error.message);
            }
        }

        res.json({
            success: true,
            domain,
            emails,
            total: emails.length
        });

    } catch (error: any) {
        console.error('[Scrapers] Email finder error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/reviews
 * Get reviews for a business from multiple platforms
 */
router.post('/reviews', authenticate, async (req: Request, res: Response) => {
    try {
        const { businessName, location, platforms } = req.body;

        if (!businessName) {
            return res.status(400).json({ error: 'Business name is required' });
        }

        let reviews = [];

        if (rapidApiScrapers.isConfigured()) {
            try {
                reviews = await rapidApiScrapers.getReviews({
                    businessName,
                    location,
                    platforms: platforms || ['google']
                });
            } catch (error: any) {
                console.error('[Scrapers] Reviews fetch failed:', error.message);
            }
        }

        res.json({
            success: true,
            businessName,
            reviews,
            total: reviews.length
        });

    } catch (error: any) {
        console.error('[Scrapers] Reviews error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/generate-website
 * Generate a website using Kimi AI based on scraped data
 */
router.post('/generate-website', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            businessName,
            industry,
            description,
            style,
            sourceUrl,
            sections,
            features
        } = req.body;

        if (!businessName && !sourceUrl) {
            return res.status(400).json({ error: 'Business name or source URL is required' });
        }

        // Gather data from source URL if provided
        let scrapedContent = '';
        let extractedColors: string[] = [];

        if (sourceUrl) {
            try {
                const scrapedPage = await knowledgeScraper.scrapePage(sourceUrl);
                if (scrapedPage) {
                    scrapedContent = scrapedPage.content;
                }

                // Try to get design inspiration from the source
                if (apifyScraper.isConfigured()) {
                    const designData = await apifyScraper.scrapeWebsite({ url: sourceUrl, maxPages: 1 });
                    if (designData[0]) {
                        extractedColors = apifyScraper.extractColors(designData[0].html || '');
                    }
                }
            } catch (error: any) {
                console.error('[Scrapers] Source scrape failed:', error.message);
            }
        }

        if (!kimiStudio.isConfigured()) {
            return res.status(503).json({
                error: 'Kimi AI not configured',
                message: 'Please configure KIMI_API_KEY to use AI website generation'
            });
        }

        // Generate website using Kimi
        const website = await kimiStudio.generateWebsite({
            businessName: businessName || 'My Business',
            industry: industry || 'business',
            description: description || scrapedContent.substring(0, 500),
            style: style || 'modern',
            colorScheme: extractedColors.length > 0 ? extractedColors : undefined,
            sections,
            features,
            existingContent: scrapedContent.substring(0, 2000),
            inspirationUrls: sourceUrl ? [sourceUrl] : undefined
        });

        res.json({
            success: true,
            website
        });

    } catch (error: any) {
        console.error('[Scrapers] Website generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/generate-landing-page
 * Generate a high-converting landing page
 */
router.post('/generate-landing-page', authenticate, async (req: Request, res: Response) => {
    try {
        const { campaign, product, offer, cta, urgency, socialProof, style } = req.body;

        if (!product) {
            return res.status(400).json({ error: 'Product/service is required' });
        }

        if (!kimiStudio.isConfigured()) {
            return res.status(503).json({
                error: 'Kimi AI not configured',
                message: 'Please configure KIMI_API_KEY to use AI website generation'
            });
        }

        const landingPage = await kimiStudio.generateLandingPage({
            campaign: campaign || 'General',
            product,
            offer: offer || 'Learn More',
            cta: cta || 'Get Started',
            urgency,
            socialProof,
            style
        });

        res.json({
            success: true,
            landingPage
        });

    } catch (error: any) {
        console.error('[Scrapers] Landing page generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/improve-website
 * Improve an existing website using Kimi AI
 */
router.post('/improve-website', authenticate, async (req: Request, res: Response) => {
    try {
        const { html, css, improvements } = req.body;

        if (!html) {
            return res.status(400).json({ error: 'HTML is required' });
        }

        if (!kimiStudio.isConfigured()) {
            return res.status(503).json({
                error: 'Kimi AI not configured',
                message: 'Please configure KIMI_API_KEY to use AI website improvement'
            });
        }

        const improved = await kimiStudio.improveWebsite({
            html,
            css,
            improvements: improvements || ['Make it more modern', 'Improve mobile responsiveness', 'Add animations']
        });

        res.json({
            success: true,
            improved
        });

    } catch (error: any) {
        console.error('[Scrapers] Website improvement error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/generate-component
 * Generate a single website component
 */
router.post('/generate-component', authenticate, async (req: Request, res: Response) => {
    try {
        const { type, content, style, colorScheme } = req.body;

        if (!type) {
            return res.status(400).json({ error: 'Component type is required' });
        }

        if (!kimiStudio.isConfigured()) {
            return res.status(503).json({
                error: 'Kimi AI not configured',
                message: 'Please configure KIMI_API_KEY to use AI component generation'
            });
        }

        const component = await kimiStudio.generateComponent({
            type,
            content: content || {},
            style,
            colorScheme
        });

        res.json({
            success: true,
            component
        });

    } catch (error: any) {
        console.error('[Scrapers] Component generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/brand-onboarding
 * Complete brand scraping for onboarding - uses Firecrawl for comprehensive extraction
 * This is the primary endpoint for onboarding new businesses
 */
router.post('/brand-onboarding', authenticate, async (req: Request, res: Response) => {
    try {
        const { domain, options } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        // Use Firecrawl for comprehensive brand scraping (preferred)
        if (firecrawl.isConfigured()) {
            try {
                console.log(`[Scrapers] Starting Firecrawl brand onboarding for: ${domain}`);
                const brandInfo = await firecrawl.scrapeBrandInfo(domain);

                return res.json({
                    success: true,
                    source: 'firecrawl',
                    brand: brandInfo
                });
            } catch (error: any) {
                console.error('[Scrapers] Firecrawl brand scrape failed:', error.message);
                // Fall through to alternatives
            }
        }

        // Fallback to Apify + RapidAPI combination
        const brandInfo: any = {
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

        // Use built-in knowledge scraper
        try {
            const url = domain.startsWith('http') ? domain : `https://${domain}`;
            const scrapedPage = await knowledgeScraper.scrapePage(url);

            if (scrapedPage) {
                brandInfo.description = scrapedPage.content.substring(0, 500);
                brandInfo.pagesTrawled = 1;
            }
        } catch (error: any) {
            console.error('[Scrapers] Built-in scrape failed:', error.message);
        }

        // Supplement with RapidAPI business info
        if (rapidApiScrapers.isConfigured()) {
            try {
                const businessInfo = await rapidApiScrapers.findBusinessInfo({ domain });
                if (businessInfo) {
                    brandInfo.businessName = businessInfo.name || brandInfo.businessName;
                    brandInfo.description = businessInfo.description || brandInfo.description;
                    brandInfo.contactInfo.phone = businessInfo.phone;
                    brandInfo.contactInfo.email = businessInfo.email;
                    brandInfo.contactInfo.address = businessInfo.address;
                    brandInfo.socialLinks = businessInfo.socialLinks || {};
                }

                // Get technology stack
                const techStack = await rapidApiScrapers.detectTechnologies(`https://${domain}`);
                if (techStack.technologies.length > 0) {
                    brandInfo.technologies = techStack.technologies.map(t => t.name);
                }
            } catch (error: any) {
                console.error('[Scrapers] RapidAPI business info failed:', error.message);
            }
        }

        // Get social stats if links available
        if (rapidApiScrapers.isConfigured() && Object.keys(brandInfo.socialLinks).length > 0) {
            try {
                const socialStats = await rapidApiScrapers.getSocialStats(brandInfo.socialLinks);
                brandInfo.socialStats = socialStats;
            } catch (error: any) {
                console.error('[Scrapers] Social stats failed:', error.message);
            }
        }

        // Calculate confidence
        let filledFields = 0;
        if (brandInfo.businessName) filledFields++;
        if (brandInfo.description) filledFields++;
        if (brandInfo.services.length > 0) filledFields++;
        if (brandInfo.contactInfo.email || brandInfo.contactInfo.phone) filledFields++;
        if (Object.keys(brandInfo.socialLinks).length > 0) filledFields++;
        brandInfo.confidence = Math.round((filledFields / 5) * 100);

        res.json({
            success: true,
            source: 'fallback',
            brand: brandInfo
        });

    } catch (error: any) {
        console.error('[Scrapers] Brand onboarding error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/firecrawl/scrape
 * Direct Firecrawl scrape endpoint
 */
router.post('/firecrawl/scrape', authenticate, async (req: Request, res: Response) => {
    try {
        const { url, formats, onlyMainContent } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!firecrawl.isConfigured()) {
            return res.status(503).json({
                error: 'Firecrawl not configured',
                message: 'Please configure FIRECRAWL_API_KEY'
            });
        }

        const result = await firecrawl.scrape(url, { formats, onlyMainContent });
        res.json(result);

    } catch (error: any) {
        console.error('[Scrapers] Firecrawl scrape error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/firecrawl/crawl
 * Crawl multiple pages of a website
 */
router.post('/firecrawl/crawl', authenticate, async (req: Request, res: Response) => {
    try {
        const { url, limit, maxDepth, includePaths, excludePaths } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!firecrawl.isConfigured()) {
            return res.status(503).json({
                error: 'Firecrawl not configured',
                message: 'Please configure FIRECRAWL_API_KEY'
            });
        }

        const result = await firecrawl.crawl(url, { limit, maxDepth, includePaths, excludePaths });
        res.json(result);

    } catch (error: any) {
        console.error('[Scrapers] Firecrawl crawl error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/firecrawl/map
 * Map all URLs on a website
 */
router.post('/firecrawl/map', authenticate, async (req: Request, res: Response) => {
    try {
        const { url, search, limit } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!firecrawl.isConfigured()) {
            return res.status(503).json({
                error: 'Firecrawl not configured',
                message: 'Please configure FIRECRAWL_API_KEY'
            });
        }

        const result = await firecrawl.map(url, { search, limit });
        res.json(result);

    } catch (error: any) {
        console.error('[Scrapers] Firecrawl map error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scrapers/firecrawl/extract
 * Extract structured data using LLM
 */
router.post('/firecrawl/extract', authenticate, async (req: Request, res: Response) => {
    try {
        const { urls, schema, prompt } = req.body;

        if (!urls || !Array.isArray(urls)) {
            return res.status(400).json({ error: 'URLs array is required' });
        }

        if (!schema) {
            return res.status(400).json({ error: 'Schema is required' });
        }

        if (!firecrawl.isConfigured()) {
            return res.status(503).json({
                error: 'Firecrawl not configured',
                message: 'Please configure FIRECRAWL_API_KEY'
            });
        }

        const result = await firecrawl.extract(urls, schema, prompt);
        res.json(result);

    } catch (error: any) {
        console.error('[Scrapers] Firecrawl extract error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
