import axios from 'axios';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST_HEADER = 'X-RapidAPI-Host';
const RAPIDAPI_KEY_HEADER = 'X-RapidAPI-Key';

interface WebsiteMetrics {
    domain: string;
    globalRank?: number;
    countryRank?: number;
    categoryRank?: number;
    monthlyVisits?: number;
    bounceRate?: number;
    pagesPerVisit?: number;
    avgVisitDuration?: number;
    trafficSources?: {
        direct: number;
        search: number;
        social: number;
        referral: number;
        mail: number;
    };
    topKeywords?: string[];
    topCountries?: Array<{ country: string; share: number }>;
    competitors?: string[];
}

interface SEOAnalysis {
    url: string;
    score: number;
    title: {
        text: string;
        length: number;
        isOptimal: boolean;
    };
    description: {
        text: string;
        length: number;
        isOptimal: boolean;
    };
    headings: {
        h1Count: number;
        h2Count: number;
        h3Count: number;
    };
    images: {
        total: number;
        withAlt: number;
        withoutAlt: number;
    };
    links: {
        internal: number;
        external: number;
        broken: number;
    };
    performance: {
        loadTime: number;
        pageSize: number;
    };
    issues: Array<{
        type: string;
        severity: 'critical' | 'warning' | 'info';
        message: string;
    }>;
}

interface BusinessInfo {
    name: string;
    domain?: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
    category?: string;
    rating?: number;
    reviewCount?: number;
    hours?: Record<string, string>;
    socialLinks?: Record<string, string>;
    employees?: string;
    founded?: string;
    revenue?: string;
}

interface EmailFinderResult {
    email: string;
    confidence: number;
    firstName?: string;
    lastName?: string;
    position?: string;
    department?: string;
    sources?: string[];
}

interface TechnologyStack {
    domain: string;
    technologies: Array<{
        name: string;
        category: string;
        version?: string;
        confidence: number;
    }>;
    frameworks: string[];
    analytics: string[];
    advertising: string[];
    widgets: string[];
    hosting: string;
    cdn?: string;
    cms?: string;
    ecommerce?: string;
}

/**
 * RapidAPI Scrapers Service
 *
 * Collection of specialized scrapers via RapidAPI marketplace.
 * Provides business intelligence, SEO analysis, and market research data.
 */
export const rapidApiScrapers = {
    /**
     * Check if RapidAPI is configured
     */
    isConfigured(): boolean {
        return !!RAPIDAPI_KEY;
    },

    /**
     * Make a RapidAPI request
     */
    async request<T>(host: string, endpoint: string, params?: Record<string, string>): Promise<T> {
        if (!RAPIDAPI_KEY) {
            throw new Error('RapidAPI key not configured');
        }

        try {
            const response = await axios.get(`https://${host}${endpoint}`, {
                headers: {
                    [RAPIDAPI_KEY_HEADER]: RAPIDAPI_KEY,
                    [RAPIDAPI_HOST_HEADER]: host
                },
                params,
                timeout: 30000
            });

            return response.data;
        } catch (error: any) {
            console.error(`[RapidAPI] Request failed:`, error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get website traffic and engagement metrics
     */
    async getWebsiteMetrics(domain: string): Promise<WebsiteMetrics> {
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

        try {
            const data = await this.request<any>(
                'similar-web.p.rapidapi.com',
                '/get-analysis',
                { domain: cleanDomain }
            );

            return {
                domain: cleanDomain,
                globalRank: data.GlobalRank?.Rank,
                countryRank: data.CountryRank?.Rank,
                categoryRank: data.CategoryRank?.Rank,
                monthlyVisits: data.Engagments?.Visits,
                bounceRate: data.Engagments?.BounceRate,
                pagesPerVisit: data.Engagments?.PagePerVisit,
                avgVisitDuration: data.Engagments?.TimeOnSite,
                trafficSources: data.TrafficSources ? {
                    direct: data.TrafficSources.Direct || 0,
                    search: data.TrafficSources.Search || 0,
                    social: data.TrafficSources.Social || 0,
                    referral: data.TrafficSources.Referrals || 0,
                    mail: data.TrafficSources.Mail || 0
                } : undefined,
                topKeywords: data.TopKeywords?.map((k: any) => k.Name) || [],
                topCountries: data.TopCountryShares?.map((c: any) => ({
                    country: c.CountryCode,
                    share: c.Value
                })) || [],
                competitors: data.SimilarSites?.map((s: any) => s.Site) || []
            };
        } catch (error) {
            console.error('[RapidAPI] Website metrics failed:', error);
            return { domain: cleanDomain };
        }
    },

    /**
     * Perform SEO analysis on a URL
     */
    async analyzeSEO(url: string): Promise<SEOAnalysis> {
        try {
            const data = await this.request<any>(
                'website-seo-analyzer.p.rapidapi.com',
                '/seo/seo-audit-basic',
                { url }
            );

            return {
                url,
                score: data.score || 0,
                title: {
                    text: data.title?.text || '',
                    length: data.title?.length || 0,
                    isOptimal: data.title?.length >= 30 && data.title?.length <= 60
                },
                description: {
                    text: data.description?.text || '',
                    length: data.description?.length || 0,
                    isOptimal: data.description?.length >= 120 && data.description?.length <= 160
                },
                headings: {
                    h1Count: data.headings?.h1?.count || 0,
                    h2Count: data.headings?.h2?.count || 0,
                    h3Count: data.headings?.h3?.count || 0
                },
                images: {
                    total: data.images?.total || 0,
                    withAlt: data.images?.withAlt || 0,
                    withoutAlt: data.images?.withoutAlt || 0
                },
                links: {
                    internal: data.links?.internal || 0,
                    external: data.links?.external || 0,
                    broken: data.links?.broken || 0
                },
                performance: {
                    loadTime: data.performance?.loadTime || 0,
                    pageSize: data.performance?.pageSize || 0
                },
                issues: data.issues || []
            };
        } catch (error) {
            console.error('[RapidAPI] SEO analysis failed:', error);
            return {
                url,
                score: 0,
                title: { text: '', length: 0, isOptimal: false },
                description: { text: '', length: 0, isOptimal: false },
                headings: { h1Count: 0, h2Count: 0, h3Count: 0 },
                images: { total: 0, withAlt: 0, withoutAlt: 0 },
                links: { internal: 0, external: 0, broken: 0 },
                performance: { loadTime: 0, pageSize: 0 },
                issues: []
            };
        }
    },

    /**
     * Find business information by name or domain
     */
    async findBusinessInfo(params: {
        name?: string;
        domain?: string;
        location?: string;
    }): Promise<BusinessInfo | null> {
        const { name, domain, location } = params;

        if (!name && !domain) {
            throw new Error('Must provide name or domain');
        }

        try {
            // Try Google Places API for local businesses
            if (name && location) {
                const placesData = await this.request<any>(
                    'google-map-places.p.rapidapi.com',
                    '/maps/api/place/textsearch/json',
                    { query: `${name} ${location}`, language: 'en' }
                );

                if (placesData.results?.length > 0) {
                    const place = placesData.results[0];
                    return {
                        name: place.name,
                        address: place.formatted_address,
                        rating: place.rating,
                        reviewCount: place.user_ratings_total,
                        category: place.types?.[0]
                    };
                }
            }

            // Try company lookup by domain
            if (domain) {
                const companyData = await this.request<any>(
                    'company-enrichment-data.p.rapidapi.com',
                    '/companies/enrich',
                    { domain: domain.replace(/^https?:\/\//, '') }
                );

                if (companyData) {
                    return {
                        name: companyData.name || name || '',
                        domain: companyData.domain,
                        description: companyData.description,
                        employees: companyData.employeesRange,
                        founded: companyData.foundedYear?.toString(),
                        category: companyData.industry,
                        socialLinks: {
                            linkedin: companyData.linkedin,
                            twitter: companyData.twitter,
                            facebook: companyData.facebook
                        }
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('[RapidAPI] Business info lookup failed:', error);
            return null;
        }
    },

    /**
     * Find email addresses for a company
     */
    async findEmails(params: {
        domain: string;
        firstName?: string;
        lastName?: string;
    }): Promise<EmailFinderResult[]> {
        const { domain, firstName, lastName } = params;
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

        try {
            const data = await this.request<any>(
                'email-finder8.p.rapidapi.com',
                '/api/email/domain-search',
                {
                    domain: cleanDomain,
                    ...(firstName && { first_name: firstName }),
                    ...(lastName && { last_name: lastName })
                }
            );

            return (data.emails || []).map((e: any) => ({
                email: e.value || e.email,
                confidence: e.confidence || 50,
                firstName: e.first_name,
                lastName: e.last_name,
                position: e.position,
                department: e.department,
                sources: e.sources
            }));
        } catch (error) {
            console.error('[RapidAPI] Email finder failed:', error);
            return [];
        }
    },

    /**
     * Detect technology stack of a website
     */
    async detectTechnologies(url: string): Promise<TechnologyStack> {
        const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

        try {
            const data = await this.request<any>(
                'website-technology-analyzer.p.rapidapi.com',
                '/api/v1/analysis',
                { url }
            );

            return {
                domain,
                technologies: (data.technologies || []).map((t: any) => ({
                    name: t.name,
                    category: t.category,
                    version: t.version,
                    confidence: t.confidence || 100
                })),
                frameworks: data.technologies
                    ?.filter((t: any) => t.category === 'JavaScript frameworks')
                    ?.map((t: any) => t.name) || [],
                analytics: data.technologies
                    ?.filter((t: any) => t.category === 'Analytics')
                    ?.map((t: any) => t.name) || [],
                advertising: data.technologies
                    ?.filter((t: any) => t.category === 'Advertising')
                    ?.map((t: any) => t.name) || [],
                widgets: data.technologies
                    ?.filter((t: any) => t.category === 'Widgets')
                    ?.map((t: any) => t.name) || [],
                hosting: data.hosting || 'Unknown',
                cdn: data.cdn,
                cms: data.technologies
                    ?.find((t: any) => t.category === 'CMS')?.name,
                ecommerce: data.technologies
                    ?.find((t: any) => t.category === 'Ecommerce')?.name
            };
        } catch (error) {
            console.error('[RapidAPI] Technology detection failed:', error);
            return {
                domain,
                technologies: [],
                frameworks: [],
                analytics: [],
                advertising: [],
                widgets: [],
                hosting: 'Unknown'
            };
        }
    },

    /**
     * Get Google search results (SERP)
     */
    async searchGoogle(params: {
        query: string;
        country?: string;
        language?: string;
        limit?: number;
    }): Promise<Array<{
        position: number;
        title: string;
        url: string;
        description: string;
    }>> {
        const { query, country = 'us', language = 'en', limit = 10 } = params;

        try {
            const data = await this.request<any>(
                'google-search74.p.rapidapi.com',
                '/search',
                {
                    query,
                    limit: limit.toString(),
                    gl: country,
                    hl: language
                }
            );

            return (data.results || []).map((r: any, index: number) => ({
                position: index + 1,
                title: r.title,
                url: r.link,
                description: r.snippet
            }));
        } catch (error) {
            console.error('[RapidAPI] Google search failed:', error);
            return [];
        }
    },

    /**
     * Get keyword suggestions for SEO
     */
    async getKeywordSuggestions(params: {
        keyword: string;
        country?: string;
    }): Promise<Array<{
        keyword: string;
        searchVolume?: number;
        difficulty?: number;
        cpc?: number;
    }>> {
        const { keyword, country = 'us' } = params;

        try {
            const data = await this.request<any>(
                'keyword-research-for-seo.p.rapidapi.com',
                '/keyword',
                { keyword, country }
            );

            return (data.suggestions || []).map((s: any) => ({
                keyword: s.keyword,
                searchVolume: s.volume,
                difficulty: s.difficulty,
                cpc: s.cpc
            }));
        } catch (error) {
            console.error('[RapidAPI] Keyword suggestions failed:', error);
            return [];
        }
    },

    /**
     * Screenshot a website
     */
    async screenshotWebsite(url: string, options?: {
        width?: number;
        height?: number;
        fullPage?: boolean;
    }): Promise<string | null> {
        const { width = 1280, height = 800, fullPage = false } = options || {};

        try {
            const data = await this.request<any>(
                'screenshot-machine.p.rapidapi.com',
                '/capture',
                {
                    url,
                    dimension: `${width}x${height}`,
                    full: fullPage.toString(),
                    format: 'png'
                }
            );

            return data.screenshot || null;
        } catch (error) {
            console.error('[RapidAPI] Screenshot failed:', error);
            return null;
        }
    },

    /**
     * Extract structured data from a webpage
     */
    async extractStructuredData(url: string): Promise<{
        schemaTypes: string[];
        jsonLd: Record<string, unknown>[];
        microdata: Record<string, unknown>[];
        openGraph: Record<string, string>;
        twitterCards: Record<string, string>;
    }> {
        try {
            const data = await this.request<any>(
                'structured-data-extractor.p.rapidapi.com',
                '/extract',
                { url }
            );

            return {
                schemaTypes: data.schemaTypes || [],
                jsonLd: data.jsonLd || [],
                microdata: data.microdata || [],
                openGraph: data.openGraph || {},
                twitterCards: data.twitterCards || {}
            };
        } catch (error) {
            console.error('[RapidAPI] Structured data extraction failed:', error);
            return {
                schemaTypes: [],
                jsonLd: [],
                microdata: [],
                openGraph: {},
                twitterCards: {}
            };
        }
    },

    /**
     * Get social media statistics for a brand
     */
    async getSocialStats(params: {
        instagram?: string;
        twitter?: string;
        facebook?: string;
        tiktok?: string;
    }): Promise<Record<string, {
        followers: number;
        engagement?: number;
        posts?: number;
    }>> {
        const results: Record<string, { followers: number; engagement?: number; posts?: number }> = {};

        // Instagram stats
        if (params.instagram) {
            try {
                const data = await this.request<any>(
                    'instagram-scraper-api2.p.rapidapi.com',
                    '/v1/info',
                    { username_or_id_or_url: params.instagram }
                );
                results.instagram = {
                    followers: data.data?.follower_count || 0,
                    posts: data.data?.media_count || 0
                };
            } catch { /* ignore */ }
        }

        // Twitter stats
        if (params.twitter) {
            try {
                const data = await this.request<any>(
                    'twitter-api47.p.rapidapi.com',
                    '/v2/user/by-username',
                    { username: params.twitter }
                );
                results.twitter = {
                    followers: data.user?.followers_count || 0,
                    posts: data.user?.statuses_count || 0
                };
            } catch { /* ignore */ }
        }

        // TikTok stats
        if (params.tiktok) {
            try {
                const data = await this.request<any>(
                    'tiktok-api23.p.rapidapi.com',
                    '/api/user/info',
                    { uniqueId: params.tiktok }
                );
                results.tiktok = {
                    followers: data.userInfo?.stats?.followerCount || 0,
                    posts: data.userInfo?.stats?.videoCount || 0
                };
            } catch { /* ignore */ }
        }

        return results;
    },

    /**
     * Get reviews from multiple platforms
     */
    async getReviews(params: {
        businessName: string;
        location?: string;
        platforms?: ('google' | 'yelp' | 'tripadvisor')[];
    }): Promise<Array<{
        platform: string;
        author: string;
        rating: number;
        text: string;
        date: string;
    }>> {
        const { businessName, location, platforms = ['google'] } = params;
        const reviews: Array<{
            platform: string;
            author: string;
            rating: number;
            text: string;
            date: string;
        }> = [];

        // Google reviews
        if (platforms.includes('google')) {
            try {
                const searchQuery = location ? `${businessName} ${location}` : businessName;
                const placesData = await this.request<any>(
                    'google-map-places.p.rapidapi.com',
                    '/maps/api/place/textsearch/json',
                    { query: searchQuery }
                );

                if (placesData.results?.[0]?.place_id) {
                    const detailsData = await this.request<any>(
                        'google-map-places.p.rapidapi.com',
                        '/maps/api/place/details/json',
                        { place_id: placesData.results[0].place_id, fields: 'reviews' }
                    );

                    (detailsData.result?.reviews || []).forEach((r: any) => {
                        reviews.push({
                            platform: 'google',
                            author: r.author_name,
                            rating: r.rating,
                            text: r.text,
                            date: r.relative_time_description
                        });
                    });
                }
            } catch { /* ignore */ }
        }

        return reviews;
    }
};

export default rapidApiScrapers;
