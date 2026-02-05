import axios from 'axios';

const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = 'https://integrate.api.nvidia.com/v1';

interface WebsiteGenerationParams {
    businessName: string;
    industry: string;
    description: string;
    style?: 'modern' | 'minimalist' | 'bold' | 'elegant' | 'playful' | 'professional';
    colorScheme?: string[];
    sections?: string[];
    features?: string[];
    existingContent?: string;
    inspirationUrls?: string[];
    targetAudience?: string;
}

interface GeneratedWebsite {
    html: string;
    css: string;
    javascript: string;
    pages: Array<{
        name: string;
        path: string;
        html: string;
    }>;
    assets: {
        colors: string[];
        fonts: string[];
        iconLibrary: string;
    };
    seoMetadata: {
        title: string;
        description: string;
        keywords: string[];
        ogTags: Record<string, string>;
    };
}

interface ComponentGenerationParams {
    type: 'hero' | 'features' | 'pricing' | 'testimonials' | 'contact' | 'footer' | 'navigation' | 'cta' | 'gallery' | 'team' | 'faq' | 'stats';
    content: Record<string, unknown>;
    style?: string;
    colorScheme?: string[];
}

interface DesignSystemParams {
    brandName: string;
    industry: string;
    personality: string[];
    existingColors?: string[];
}

interface DesignSystem {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
        muted: string;
    };
    typography: {
        headingFont: string;
        bodyFont: string;
        sizes: Record<string, string>;
    };
    spacing: Record<string, string>;
    borderRadius: string;
    shadows: Record<string, string>;
    cssVariables: string;
}

/**
 * Kimi Studio Service
 *
 * AI-powered website builder using Kimi 2.5 via NVIDIA NIM API.
 * Generates complete, production-ready websites with modern design.
 */
export const kimiStudio = {
    /**
     * Check if Kimi is configured
     */
    isConfigured(): boolean {
        return !!KIMI_API_KEY;
    },

    /**
     * Generate content with Kimi
     */
    async generate(prompt: string, systemPrompt?: string): Promise<string> {
        if (!KIMI_API_KEY) {
            throw new Error('Kimi API key not configured');
        }

        try {
            const response = await axios.post(
                `${KIMI_BASE_URL}/chat/completions`,
                {
                    model: 'moonshot/kimi-k2-instruct',
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 16000,
                    top_p: 0.9
                },
                {
                    headers: {
                        'Authorization': `Bearer ${KIMI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                }
            );

            return response.data.choices[0].message.content;
        } catch (error: any) {
            console.error('[Kimi Studio] Generation failed:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Generate a complete website
     */
    async generateWebsite(params: WebsiteGenerationParams): Promise<GeneratedWebsite> {
        const {
            businessName,
            industry,
            description,
            style = 'modern',
            colorScheme,
            sections = ['hero', 'features', 'about', 'testimonials', 'cta', 'contact', 'footer'],
            features = [],
            existingContent,
            inspirationUrls,
            targetAudience
        } = params;

        const systemPrompt = `You are an expert web designer and developer. Generate production-ready, responsive websites using HTML5, modern CSS (with CSS variables and Flexbox/Grid), and vanilla JavaScript.

Design principles:
- Mobile-first responsive design
- Accessible (WCAG 2.1 compliant)
- Fast-loading (optimized structure)
- SEO-optimized
- Modern, professional aesthetics
- Smooth animations and micro-interactions

Always return valid JSON with the website structure.`;

        const prompt = `Generate a complete, production-ready website for:

Business: ${businessName}
Industry: ${industry}
Description: ${description}
Style: ${style}
Target Audience: ${targetAudience || 'General'}
${colorScheme ? `Color Scheme: ${colorScheme.join(', ')}` : ''}
${existingContent ? `Existing Content to incorporate:\n${existingContent}` : ''}
${inspirationUrls ? `Inspiration URLs: ${inspirationUrls.join(', ')}` : ''}

Required Sections: ${sections.join(', ')}
${features.length > 0 ? `Special Features: ${features.join(', ')}` : ''}

Return a JSON object with this structure:
{
    "html": "Complete HTML with all sections",
    "css": "Complete CSS with variables, responsive styles, and animations",
    "javascript": "Interactive features and animations",
    "pages": [{"name": "Home", "path": "/", "html": "..."}],
    "assets": {
        "colors": ["#hex1", "#hex2"],
        "fonts": ["Font Name 1", "Font Name 2"],
        "iconLibrary": "lucide-react or heroicons"
    },
    "seoMetadata": {
        "title": "SEO Title",
        "description": "Meta description",
        "keywords": ["keyword1", "keyword2"],
        "ogTags": {"og:title": "...", "og:description": "..."}
    }
}

Make the website beautiful, modern, and fully functional. Include smooth scroll, hover effects, and responsive navigation.`;

        const response = await this.generate(prompt, systemPrompt);

        // Parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse website JSON from response');
        }

        return JSON.parse(jsonMatch[0]) as GeneratedWebsite;
    },

    /**
     * Generate a single website component
     */
    async generateComponent(params: ComponentGenerationParams): Promise<{ html: string; css: string }> {
        const { type, content, style = 'modern', colorScheme } = params;

        const prompt = `Generate a ${type} website component with the following content:
${JSON.stringify(content, null, 2)}

Style: ${style}
${colorScheme ? `Colors: ${colorScheme.join(', ')}` : ''}

Return JSON with "html" and "css" keys. Make it responsive and accessible.
Use modern CSS with CSS variables. Include smooth hover effects and transitions.`;

        const response = await this.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse component JSON');
        }

        return JSON.parse(jsonMatch[0]);
    },

    /**
     * Generate a design system for a brand
     */
    async generateDesignSystem(params: DesignSystemParams): Promise<DesignSystem> {
        const { brandName, industry, personality, existingColors } = params;

        const prompt = `Create a complete design system for:
Brand: ${brandName}
Industry: ${industry}
Personality: ${personality.join(', ')}
${existingColors ? `Existing Colors to consider: ${existingColors.join(', ')}` : ''}

Return a JSON design system with:
{
    "colors": {
        "primary": "#hex",
        "secondary": "#hex",
        "accent": "#hex",
        "background": "#hex",
        "text": "#hex",
        "muted": "#hex"
    },
    "typography": {
        "headingFont": "Google Font name",
        "bodyFont": "Google Font name",
        "sizes": {"xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem", "xl": "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem"}
    },
    "spacing": {"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "2xl": "3rem"},
    "borderRadius": "0.5rem",
    "shadows": {"sm": "...", "md": "...", "lg": "..."},
    "cssVariables": ":root { --color-primary: #hex; ... }"
}

Choose colors that match the brand personality and industry standards. Ensure good contrast ratios for accessibility.`;

        const response = await this.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse design system JSON');
        }

        return JSON.parse(jsonMatch[0]);
    },

    /**
     * Improve existing website HTML/CSS
     */
    async improveWebsite(params: {
        html: string;
        css?: string;
        improvements: string[];
    }): Promise<{ html: string; css: string; changes: string[] }> {
        const { html, css, improvements } = params;

        const prompt = `Improve this website with the following changes:
${improvements.join('\n- ')}

Current HTML:
${html.substring(0, 10000)}

${css ? `Current CSS:\n${css.substring(0, 5000)}` : ''}

Return JSON with:
{
    "html": "Improved HTML",
    "css": "Improved/new CSS",
    "changes": ["List of changes made"]
}

Keep the existing content and structure where possible. Focus on the requested improvements.`;

        const response = await this.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse improved website JSON');
        }

        return JSON.parse(jsonMatch[0]);
    },

    /**
     * Generate landing page for specific campaign
     */
    async generateLandingPage(params: {
        campaign: string;
        product: string;
        offer: string;
        cta: string;
        urgency?: string;
        socialProof?: string[];
        style?: string;
    }): Promise<GeneratedWebsite> {
        const { campaign, product, offer, cta, urgency, socialProof, style = 'high-converting' } = params;

        const prompt = `Generate a high-converting landing page for:

Campaign: ${campaign}
Product/Service: ${product}
Offer: ${offer}
CTA: ${cta}
${urgency ? `Urgency Element: ${urgency}` : ''}
${socialProof ? `Social Proof: ${socialProof.join(', ')}` : ''}
Style: ${style}

The page should:
1. Have a compelling hero with clear value proposition
2. Address pain points and provide solutions
3. Include trust signals (testimonials, logos, stats)
4. Have a clear, prominent CTA
5. Create urgency if specified
6. Be mobile-optimized
7. Load fast (minimal dependencies)

Return JSON with the same structure as a full website.`;

        const response = await this.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse landing page JSON');
        }

        return JSON.parse(jsonMatch[0]);
    },

    /**
     * Generate email template matching website style
     */
    async generateEmailTemplate(params: {
        type: 'welcome' | 'newsletter' | 'promotional' | 'transactional' | 'announcement';
        content: Record<string, string>;
        designSystem?: DesignSystem;
    }): Promise<{ html: string; plainText: string }> {
        const { type, content, designSystem } = params;

        const prompt = `Generate an email template:
Type: ${type}
Content: ${JSON.stringify(content, null, 2)}
${designSystem ? `Design System: ${JSON.stringify(designSystem.colors)}` : ''}

Return JSON with:
{
    "html": "Email-safe HTML (tables, inline styles)",
    "plainText": "Plain text version"
}

Use email-safe HTML (tables for layout, inline styles). Support major email clients.`;

        const response = await this.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse email template JSON');
        }

        return JSON.parse(jsonMatch[0]);
    },

    /**
     * Generate responsive image gallery component
     */
    async generateGallery(params: {
        images: Array<{ url: string; alt: string; caption?: string }>;
        style: 'grid' | 'masonry' | 'carousel' | 'lightbox';
    }): Promise<{ html: string; css: string; javascript: string }> {
        const { images, style } = params;

        const prompt = `Generate a ${style} image gallery component for these images:
${JSON.stringify(images, null, 2)}

Return JSON with:
{
    "html": "Gallery HTML",
    "css": "Gallery CSS with animations",
    "javascript": "Interactive features (lightbox, navigation)"
}

Make it responsive, accessible, and smooth. Include lazy loading for performance.`;

        const response = await this.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse gallery JSON');
        }

        return JSON.parse(jsonMatch[0]);
    },

    /**
     * Generate SEO-optimized content structure
     */
    async generateSEOContent(params: {
        topic: string;
        keywords: string[];
        contentType: 'landing-page' | 'blog-post' | 'product-page' | 'service-page';
        wordCount?: number;
    }): Promise<{
        title: string;
        metaDescription: string;
        headings: string[];
        content: string;
        schema: Record<string, unknown>;
    }> {
        const { topic, keywords, contentType, wordCount = 1000 } = params;

        const prompt = `Generate SEO-optimized content structure for:
Topic: ${topic}
Keywords: ${keywords.join(', ')}
Content Type: ${contentType}
Target Word Count: ${wordCount}

Return JSON with:
{
    "title": "SEO-optimized title with primary keyword",
    "metaDescription": "Compelling 150-160 character meta description",
    "headings": ["H1", "H2s and H3s in order"],
    "content": "Full content with natural keyword placement",
    "schema": {"@type": "Article or Product or Service", ...relevant schema}
}

Follow SEO best practices:
- Primary keyword in title, first paragraph, and H1
- Secondary keywords in subheadings
- Natural keyword density (1-2%)
- Internal linking suggestions
- Structured data for rich snippets`;

        const response = await this.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse SEO content JSON');
        }

        return JSON.parse(jsonMatch[0]);
    },

    /**
     * Analyze and suggest improvements for existing website
     */
    async analyzeWebsite(html: string): Promise<{
        score: number;
        issues: Array<{ severity: 'high' | 'medium' | 'low'; issue: string; fix: string }>;
        suggestions: string[];
        competitors: string[];
    }> {
        const prompt = `Analyze this website HTML and provide improvement suggestions:

${html.substring(0, 15000)}

Return JSON with:
{
    "score": 0-100 overall quality score,
    "issues": [
        {"severity": "high/medium/low", "issue": "Description", "fix": "How to fix"}
    ],
    "suggestions": ["Improvement suggestions"],
    "competitors": ["Types of competitor sites to analyze"]
}

Check for:
- SEO issues (missing meta, heading structure, etc.)
- Accessibility issues
- Performance concerns
- Mobile responsiveness indicators
- Modern design patterns
- Conversion optimization`;

        const response = await this.generate(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse analysis JSON');
        }

        return JSON.parse(jsonMatch[0]);
    }
};

export default kimiStudio;
