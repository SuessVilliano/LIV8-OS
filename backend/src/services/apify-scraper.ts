import axios from 'axios';

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const APIFY_BASE_URL = 'https://api.apify.com/v2';

interface ScrapedWebsite {
    url: string;
    title: string;
    description: string;
    content: string;
    html: string;
    links: string[];
    images: string[];
    metadata: Record<string, string>;
}

interface GoogleSearchResult {
    title: string;
    url: string;
    description: string;
    position: number;
}

interface SocialMediaProfile {
    platform: string;
    username: string;
    followers?: number;
    bio?: string;
    profileUrl: string;
    posts?: Array<{
        content: string;
        likes: number;
        comments: number;
        date: string;
    }>;
}

interface CompetitorAnalysis {
    domain: string;
    title: string;
    description: string;
    keywords: string[];
    socialProfiles: string[];
    estimatedTraffic?: string;
    technologies: string[];
}

/**
 * Apify Scraper Service
 *
 * Advanced web scraping using Apify's actor ecosystem.
 * Provides structured data extraction for website building and competitor analysis.
 */
export const apifyScraper = {
    /**
     * Check if Apify is configured
     */
    isConfigured(): boolean {
        return !!APIFY_API_KEY;
    },

    /**
     * Run an Apify actor and wait for results
     */
    async runActor<T>(actorId: string, input: Record<string, unknown>): Promise<T[]> {
        if (!APIFY_API_KEY) {
            throw new Error('Apify API key not configured');
        }

        try {
            // Start the actor run
            const runResponse = await axios.post(
                `${APIFY_BASE_URL}/acts/${actorId}/runs`,
                input,
                {
                    headers: {
                        'Authorization': `Bearer ${APIFY_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        timeout: 300, // 5 minute timeout
                        memory: 1024 // 1GB memory
                    }
                }
            );

            const runId = runResponse.data.data.id;
            console.log(`[Apify] Started actor ${actorId}, run ID: ${runId}`);

            // Poll for completion
            let status = 'RUNNING';
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max wait

            while (status === 'RUNNING' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000));

                const statusResponse = await axios.get(
                    `${APIFY_BASE_URL}/actor-runs/${runId}`,
                    {
                        headers: { 'Authorization': `Bearer ${APIFY_API_KEY}` }
                    }
                );

                status = statusResponse.data.data.status;
                attempts++;
                console.log(`[Apify] Run status: ${status} (attempt ${attempts})`);
            }

            if (status !== 'SUCCEEDED') {
                throw new Error(`Actor run failed with status: ${status}`);
            }

            // Get results from dataset
            const datasetId = runResponse.data.data.defaultDatasetId;
            const resultsResponse = await axios.get(
                `${APIFY_BASE_URL}/datasets/${datasetId}/items`,
                {
                    headers: { 'Authorization': `Bearer ${APIFY_API_KEY}` },
                    params: { format: 'json' }
                }
            );

            return resultsResponse.data as T[];

        } catch (error: any) {
            console.error(`[Apify] Actor ${actorId} failed:`, error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Deep website scraper - extracts full page content and structure
     */
    async scrapeWebsite(params: {
        url: string;
        maxPages?: number;
        extractContent?: boolean;
    }): Promise<ScrapedWebsite[]> {
        const { url, maxPages = 10, extractContent = true } = params;

        // Use Website Content Crawler actor
        const results = await this.runActor<ScrapedWebsite>(
            'apify/website-content-crawler',
            {
                startUrls: [{ url }],
                maxCrawlPages: maxPages,
                crawlerType: 'cheerio', // Fast HTML parsing
                maxConcurrency: 5,
                proxyConfiguration: { useApifyProxy: true },
                saveHtml: true,
                saveMarkdown: extractContent,
                removeCookieWarnings: true,
                clickElementsCssSelector: '', // Don't click elements
                htmlTransformer: 'readableText'
            }
        );

        return results.map(r => ({
            url: r.url || url,
            title: r.title || '',
            description: r.description || '',
            content: r.content || '',
            html: r.html || '',
            links: r.links || [],
            images: r.images || [],
            metadata: r.metadata || {}
        }));
    },

    /**
     * Google Search scraper - finds competitor and market information
     */
    async searchGoogle(params: {
        query: string;
        maxResults?: number;
        location?: string;
    }): Promise<GoogleSearchResult[]> {
        const { query, maxResults = 10, location = 'United States' } = params;

        const results = await this.runActor<GoogleSearchResult>(
            'apify/google-search-scraper',
            {
                queries: query,
                maxPagesPerQuery: Math.ceil(maxResults / 10),
                resultsPerPage: 10,
                mobileResults: false,
                languageCode: 'en',
                countryCode: 'us',
                includeUnfilteredResults: false
            }
        );

        return results.slice(0, maxResults).map((r, index) => ({
            title: r.title || '',
            url: r.url || '',
            description: r.description || '',
            position: index + 1
        }));
    },

    /**
     * Scrape Instagram profiles and posts
     */
    async scrapeInstagram(params: {
        username?: string;
        hashtag?: string;
        maxPosts?: number;
    }): Promise<SocialMediaProfile | null> {
        const { username, hashtag, maxPosts = 20 } = params;

        if (!username && !hashtag) {
            throw new Error('Must provide username or hashtag');
        }

        const input: Record<string, unknown> = {
            resultsLimit: maxPosts
        };

        if (username) {
            input.directUrls = [`https://www.instagram.com/${username}/`];
            input.resultsType = 'posts';
        } else if (hashtag) {
            input.hashtags = [hashtag];
            input.resultsType = 'posts';
        }

        const results = await this.runActor<any>(
            'apify/instagram-scraper',
            input
        );

        if (results.length === 0) return null;

        const profile = results[0];
        return {
            platform: 'instagram',
            username: profile.ownerUsername || username || '',
            followers: profile.ownerFollowerCount,
            bio: profile.ownerBio,
            profileUrl: `https://instagram.com/${profile.ownerUsername || username}`,
            posts: results.map((post: any) => ({
                content: post.caption || '',
                likes: post.likesCount || 0,
                comments: post.commentsCount || 0,
                date: post.timestamp || ''
            }))
        };
    },

    /**
     * Scrape LinkedIn company or profile
     */
    async scrapeLinkedIn(params: {
        companyUrl?: string;
        profileUrl?: string;
    }): Promise<any> {
        const { companyUrl, profileUrl } = params;
        const url = companyUrl || profileUrl;

        if (!url) {
            throw new Error('Must provide companyUrl or profileUrl');
        }

        const results = await this.runActor<any>(
            'anchor/linkedin-profile-scraper',
            {
                startUrls: [{ url }],
                proxyConfiguration: { useApifyProxy: true }
            }
        );

        return results[0] || null;
    },

    /**
     * Scrape Google Maps business listings
     */
    async scrapeGoogleMaps(params: {
        searchQuery: string;
        location?: string;
        maxResults?: number;
    }): Promise<any[]> {
        const { searchQuery, location, maxResults = 20 } = params;

        const results = await this.runActor<any>(
            'compass/crawler-google-places',
            {
                searchStringsArray: [searchQuery],
                locationQuery: location || '',
                maxCrawledPlacesPerSearch: maxResults,
                language: 'en',
                includeReviews: true,
                maxReviews: 5
            }
        );

        return results.map(r => ({
            name: r.title,
            address: r.address,
            phone: r.phone,
            website: r.website,
            rating: r.totalScore,
            reviewCount: r.reviewsCount,
            categories: r.categories,
            openingHours: r.openingHours,
            reviews: r.reviews
        }));
    },

    /**
     * Full competitor analysis - combines multiple scrapers
     */
    async analyzeCompetitor(params: {
        domain: string;
        includeSocial?: boolean;
    }): Promise<CompetitorAnalysis> {
        const { domain, includeSocial = true } = params;
        const url = domain.startsWith('http') ? domain : `https://${domain}`;

        // Scrape main website
        const websiteData = await this.scrapeWebsite({ url, maxPages: 5 });
        const mainPage = websiteData[0] || { title: '', description: '', content: '', links: [] };

        // Extract keywords from content
        const keywords = this.extractKeywords(mainPage.content);

        // Find social profiles from links
        const socialProfiles = mainPage.links.filter((link: string) =>
            link.includes('facebook.com') ||
            link.includes('instagram.com') ||
            link.includes('twitter.com') ||
            link.includes('linkedin.com') ||
            link.includes('youtube.com')
        );

        // Detect technologies (basic detection from HTML)
        const technologies = this.detectTechnologies(mainPage.html || '');

        return {
            domain,
            title: mainPage.title,
            description: mainPage.description,
            keywords,
            socialProfiles,
            technologies
        };
    },

    /**
     * Extract keywords from content
     */
    extractKeywords(content: string): string[] {
        if (!content) return [];

        // Simple keyword extraction - count word frequency
        const words = content.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3);

        const wordCount: Record<string, number> = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // Remove common stop words
        const stopWords = new Set([
            'the', 'and', 'for', 'that', 'this', 'with', 'from', 'your',
            'have', 'are', 'was', 'were', 'been', 'being', 'will', 'would',
            'could', 'should', 'about', 'which', 'when', 'where', 'what',
            'their', 'there', 'these', 'those', 'more', 'some', 'than'
        ]);

        return Object.entries(wordCount)
            .filter(([word]) => !stopWords.has(word))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    },

    /**
     * Detect technologies from HTML
     */
    detectTechnologies(html: string): string[] {
        const technologies: string[] = [];
        const lowerHtml = html.toLowerCase();

        if (lowerHtml.includes('react') || lowerHtml.includes('__next')) technologies.push('React');
        if (lowerHtml.includes('vue') || lowerHtml.includes('v-if')) technologies.push('Vue.js');
        if (lowerHtml.includes('angular') || lowerHtml.includes('ng-')) technologies.push('Angular');
        if (lowerHtml.includes('wordpress') || lowerHtml.includes('wp-content')) technologies.push('WordPress');
        if (lowerHtml.includes('shopify')) technologies.push('Shopify');
        if (lowerHtml.includes('wix')) technologies.push('Wix');
        if (lowerHtml.includes('squarespace')) technologies.push('Squarespace');
        if (lowerHtml.includes('webflow')) technologies.push('Webflow');
        if (lowerHtml.includes('bootstrap')) technologies.push('Bootstrap');
        if (lowerHtml.includes('tailwind')) technologies.push('Tailwind CSS');
        if (lowerHtml.includes('jquery')) technologies.push('jQuery');
        if (lowerHtml.includes('google-analytics') || lowerHtml.includes('gtag')) technologies.push('Google Analytics');
        if (lowerHtml.includes('facebook') && lowerHtml.includes('pixel')) technologies.push('Facebook Pixel');
        if (lowerHtml.includes('hotjar')) technologies.push('Hotjar');
        if (lowerHtml.includes('hubspot')) technologies.push('HubSpot');
        if (lowerHtml.includes('salesforce')) technologies.push('Salesforce');
        if (lowerHtml.includes('stripe')) technologies.push('Stripe');
        if (lowerHtml.includes('paypal')) technologies.push('PayPal');

        return technologies;
    },

    /**
     * Scrape for website design inspiration
     */
    async scrapeDesignInspiration(params: {
        industry: string;
        style?: string;
        limit?: number;
    }): Promise<Array<{ url: string; screenshot?: string; colors: string[]; fonts: string[] }>> {
        const { industry, style = 'modern', limit = 10 } = params;

        // Search for top websites in the industry
        const searchResults = await this.searchGoogle({
            query: `best ${industry} website design ${style} 2024`,
            maxResults: limit
        });

        // For each result, extract design elements
        const designs: Array<{ url: string; screenshot?: string; colors: string[]; fonts: string[] }> = [];

        for (const result of searchResults.slice(0, 5)) {
            try {
                const websiteData = await this.scrapeWebsite({ url: result.url, maxPages: 1 });
                const page = websiteData[0];
                if (!page) continue;

                // Extract colors from HTML/CSS
                const colors = this.extractColors(page.html || '');
                const fonts = this.extractFonts(page.html || '');

                designs.push({
                    url: result.url,
                    colors,
                    fonts
                });
            } catch (error) {
                // Skip failed scrapes
                continue;
            }
        }

        return designs;
    },

    /**
     * Extract color palette from HTML/CSS
     */
    extractColors(html: string): string[] {
        const colorRegex = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g;
        const matches = html.match(colorRegex) || [];
        const uniqueColors = [...new Set(matches)];
        return uniqueColors.slice(0, 10);
    },

    /**
     * Extract fonts from HTML
     */
    extractFonts(html: string): string[] {
        const fontRegex = /font-family:\s*['"]?([^;'"]+)['"]?/g;
        const fonts: string[] = [];
        let match;

        while ((match = fontRegex.exec(html)) !== null) {
            const fontFamily = match[1].split(',')[0].trim().replace(/['"]/g, '');
            if (!fonts.includes(fontFamily)) {
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
    }
};

export default apifyScraper;
