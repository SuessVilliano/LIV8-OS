/**
 * LIV8 Creative Studio API
 *
 * AI-powered content generation for images, videos, websites, and emails
 */

import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { studioDb } from '../db/studio.js';

const router = express.Router();

// Rate limiting for website analysis (per user)
const analysisRateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_ANALYSES_PER_DAY = 10;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
});

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
 * POST /api/studio/generate-image
 * Generate an image using DALL-E, Stable Diffusion, or other models
 */
router.post('/generate-image', authenticate, async (req: Request, res: Response) => {
    try {
        const { prompt, style, size, model, brandContext } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Enhance prompt with brand context and style
        let enhancedPrompt = prompt;
        if (style) {
            const stylePrompts: Record<string, string> = {
                'photorealistic': 'photorealistic, high detail, 8k resolution',
                'illustration': 'digital illustration, vibrant colors, clean lines',
                'digital-art': 'digital art, concept art style, detailed',
                '3d-render': '3D render, octane render, realistic lighting',
                'anime': 'anime style, manga, Japanese animation aesthetic',
                'watercolor': 'watercolor painting, artistic, soft edges',
                'sketch': 'pencil sketch, hand-drawn, artistic',
                'cinematic': 'cinematic, movie still, dramatic lighting, film grain'
            };
            enhancedPrompt = `${prompt}. Style: ${stylePrompts[style] || style}`;
        }

        // Add brand context if available
        if (brandContext?.colors) {
            enhancedPrompt += `. Brand colors: ${brandContext.colors}`;
        }

        // Generate with OpenAI DALL-E
        if (model === 'dall-e-3' || !model) {
            try {
                const response = await openai.images.generate({
                    model: 'dall-e-3',
                    prompt: enhancedPrompt,
                    n: 1,
                    size: size === '1792x1024' ? '1792x1024' : size === '1024x1792' ? '1024x1792' : '1024x1024',
                    quality: 'hd'
                });

                const imageUrl = response.data[0].url || '';
                const revisedPrompt = response.data[0].revised_prompt;

                // Save to database
                const user = (req as any).user;
                const clientId = user.userId || user.email || 'default';
                const savedAsset = await studioDb.saveAsset({
                    clientId,
                    type: 'image',
                    name: prompt.slice(0, 50),
                    content: imageUrl,
                    thumbnail: imageUrl,
                    prompt: revisedPrompt || enhancedPrompt,
                    metadata: { style, size, model: 'dall-e-3' },
                    status: 'complete'
                });

                return res.json({
                    success: true,
                    imageUrl,
                    revisedPrompt,
                    assetId: savedAsset.id
                });
            } catch (openaiError: any) {
                console.error('DALL-E error:', openaiError);
                // Return placeholder for demo
                const placeholderUrl = `https://placehold.co/${size.replace('x', '/')}/6366f1/ffffff?text=${encodeURIComponent(prompt.slice(0, 20))}`;

                // Still save to database as demo asset
                const user = (req as any).user;
                const clientId = user.userId || user.email || 'default';
                const savedAsset = await studioDb.saveAsset({
                    clientId,
                    type: 'image',
                    name: `Demo: ${prompt.slice(0, 40)}`,
                    content: placeholderUrl,
                    thumbnail: placeholderUrl,
                    prompt: enhancedPrompt,
                    metadata: { style, size, model: 'demo' },
                    status: 'complete'
                });

                return res.json({
                    success: true,
                    imageUrl: placeholderUrl,
                    message: 'Demo mode - configure OPENAI_API_KEY for real generation',
                    assetId: savedAsset.id
                });
            }
        }

        // Stable Diffusion via Replicate or other providers
        if (model === 'stable-diffusion') {
            // For now, return placeholder - integrate with Replicate API
            return res.json({
                success: true,
                imageUrl: `https://placehold.co/1024/6366f1/ffffff?text=Stable+Diffusion`,
                message: 'Stable Diffusion coming soon'
            });
        }

        // Midjourney - requires Discord bot integration
        if (model === 'midjourney') {
            return res.json({
                success: true,
                imageUrl: `https://placehold.co/1024/6366f1/ffffff?text=Midjourney`,
                message: 'Midjourney integration coming soon'
            });
        }

        // Flux
        if (model === 'flux') {
            return res.json({
                success: true,
                imageUrl: `https://placehold.co/1024/6366f1/ffffff?text=Flux+Pro`,
                message: 'Flux Pro coming soon'
            });
        }

        return res.json({
            success: true,
            imageUrl: `https://placehold.co/1024/6366f1/ffffff?text=AI+Generated`,
            message: 'Demo mode'
        });

    } catch (error: any) {
        console.error('Image generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/studio/generate-video
 * Generate a video using Sora, Runway, Veo, or Pika
 */
router.post('/generate-video', authenticate, async (req: Request, res: Response) => {
    try {
        const { prompt, duration, model, aspectRatio, brandContext } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Video generation is async - create a job and return status
        const jobId = `video_${Date.now()}`;

        // For now, we'll simulate video generation
        // In production, integrate with:
        // - Runway Gen-3: https://runwayml.com/
        // - OpenAI Sora: (when API available)
        // - Google Veo: (when API available)
        // - Pika Labs: https://pika.art/

        // Store job in database (simulated)
        const videoJob = {
            id: jobId,
            status: 'generating',
            prompt,
            duration,
            model,
            aspectRatio,
            createdAt: new Date(),
            estimatedCompletion: new Date(Date.now() + (parseInt(duration) || 5) * 60000) // estimate based on duration
        };

        // Runway integration example (commented out until API key is configured)
        /*
        if (model === 'runway' && process.env.RUNWAY_API_KEY) {
            const runwayResponse = await fetch('https://api.runwayml.com/v1/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    duration: parseInt(duration),
                    aspect_ratio: aspectRatio
                })
            });
            const data = await runwayResponse.json();
            return res.json({
                success: true,
                jobId: data.id,
                status: 'generating',
                thumbnail: data.thumbnail
            });
        }
        */

        res.json({
            success: true,
            jobId,
            status: 'generating',
            message: `Video generation started with ${model}. This feature requires API configuration.`,
            videoUrl: null,
            thumbnail: `https://placehold.co/1920x1080/6366f1/ffffff?text=Video+Generating`
        });

    } catch (error: any) {
        console.error('Video generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/studio/generate-website
 * Generate a website/landing page/funnel using AI
 */
router.post('/generate-website', authenticate, async (req: Request, res: Response) => {
    try {
        const { prompt, type, brandContext, template, existingHtml, customizations } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Extract comprehensive brand context
        const brand = {
            name: brandContext?.name || 'My Brand',
            tagline: brandContext?.tagline || '',
            primaryColor: brandContext?.colors?.primary || brandContext?.colors || '#6366f1',
            secondaryColor: brandContext?.colors?.secondary || '#8b5cf6',
            accentColor: brandContext?.colors?.accent || '#10b981',
            industry: brandContext?.industry || 'business',
            voice: brandContext?.voice || 'professional',
            description: brandContext?.description || '',
            services: brandContext?.services || [],
            targetAudience: brandContext?.targetAudience || '',
            uniqueValue: brandContext?.uniqueValue || '',
            logo: brandContext?.logo || ''
        };

        // Build enhanced system prompt for professional website generation
        const systemPrompt = `You are a world-class web developer and designer who creates stunning, scroll-stopping websites that rival the best agencies. Generate a complete, modern, responsive HTML page that would win design awards.

## Brand Context
- Business Name: ${brand.name}
- Tagline: ${brand.tagline}
- Industry: ${brand.industry}
- Brand Voice: ${brand.voice}
- Description: ${brand.description}
- Target Audience: ${brand.targetAudience}
- Unique Value: ${brand.uniqueValue}

## Brand Colors
- Primary: ${brand.primaryColor}
- Secondary: ${brand.secondaryColor}
- Accent: ${brand.accentColor}

## Page Type: ${type || 'landing page'}

## Design Requirements
1. **Visual Excellence**: Create a visually stunning page with:
   - Animated gradient backgrounds
   - Glassmorphism effects (backdrop-blur, semi-transparent elements)
   - Smooth scroll-triggered animations
   - Floating/hovering decorative elements
   - Modern asymmetric layouts
   - Large, bold typography with gradient text effects

2. **Technical Requirements**:
   - Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>)
   - Include Google Fonts (Inter or similar modern font)
   - Add custom CSS for advanced animations (@keyframes)
   - Implement IntersectionObserver for scroll animations
   - Fully responsive (mobile-first approach)
   - Dark mode theme (dark background, light text)

3. **Content Sections**:
   - Sticky navigation with blur effect
   - Hero section with animated background, big headline, tagline, and dual CTAs
   - Social proof/trust badges
   - Features grid with icons and hover effects
   - Stats/metrics section with animated counters
   - Testimonials with star ratings
   - FAQ accordion (if relevant)
   - Email capture CTA section
   - Professional footer with multiple columns

4. **Interactive Elements**:
   - Hover scale effects on buttons and cards
   - Smooth transitions everywhere (transition-all duration-300)
   - Glowing button effects (box-shadow with brand color)
   - Animated gradient borders on focus

5. **Output**:
   - Return ONLY the complete HTML code
   - No markdown code blocks, no explanations
   - Start with <!DOCTYPE html> and end with </html>

${existingHtml ? `\n## Existing Code to Improve:\n${existingHtml.substring(0, 2000)}...\n\nIMPROVE this existing site. Keep the structure but make it 10x better visually.` : ''}

User's Vision: ${prompt}`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Create a stunning, professional ${type || 'landing page'} that would win design awards. Vision: ${prompt}` }
                ],
                max_tokens: 8192,
                temperature: 0.8
            });

            const generatedHtml = completion.choices[0].message.content || '';

            // Clean up the response - extract just the HTML
            let html = generatedHtml;
            if (html.includes('```html')) {
                html = html.split('```html')[1].split('```')[0];
            } else if (html.includes('```')) {
                html = html.split('```')[1].split('```')[0];
            }

            // Ensure it starts with DOCTYPE
            if (!html.trim().startsWith('<!DOCTYPE') && !html.trim().startsWith('<html')) {
                // Try to find the HTML start
                const docTypeIndex = html.indexOf('<!DOCTYPE');
                const htmlIndex = html.indexOf('<html');
                const startIndex = docTypeIndex >= 0 ? docTypeIndex : htmlIndex;
                if (startIndex >= 0) {
                    html = html.substring(startIndex);
                }
            }

            const generatedHtmlClean = html.trim();

            // Save to database
            const user = (req as any).user;
            const clientId = user.userId || user.email || 'default';
            const savedAsset = await studioDb.saveAsset({
                clientId,
                type: 'website',
                name: brand.name ? `${brand.name} - ${type}` : prompt.slice(0, 50),
                content: generatedHtmlClean,
                prompt,
                metadata: { type, brand: brand.name, template: template?.id },
                status: 'complete'
            });

            return res.json({
                success: true,
                html: generatedHtmlClean,
                type,
                brandUsed: brand.name,
                assetId: savedAsset.id
            });
        } catch (aiError: any) {
            console.error('AI generation error:', aiError);
            // Return fallback HTML with professional template
            const fallbackHtml = generateProfessionalHtml(prompt, type, brand);

            // Save fallback to database
            const user = (req as any).user;
            const clientId = user.userId || user.email || 'default';
            const savedAsset = await studioDb.saveAsset({
                clientId,
                type: 'website',
                name: brand.name ? `${brand.name} - ${type}` : prompt.slice(0, 50),
                content: fallbackHtml,
                prompt,
                metadata: { type, brand: brand.name, fallback: true },
                status: 'complete'
            });

            return res.json({
                success: true,
                html: fallbackHtml,
                type,
                message: 'Generated with professional fallback template',
                assetId: savedAsset.id
            });
        }

    } catch (error: any) {
        console.error('Website generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/studio/generate-email
 * Generate an email template using AI
 */
router.post('/generate-email', authenticate, async (req: Request, res: Response) => {
    try {
        const { prompt, type, subject, brandContext } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const systemPrompt = `You are an expert email marketer. Generate a professional HTML email template.

Brand Context:
- Brand Name: ${brandContext?.name || 'My Brand'}
- Primary Color: ${brandContext?.colors || '#6366f1'}
- Voice/Tone: ${brandContext?.voice || 'professional'}

Email Type: ${type || 'newsletter'}
Subject Line: ${subject || 'Generated subject'}

Requirements:
1. Use inline CSS (email clients don't support external CSS)
2. Use table-based layout for email client compatibility
3. Include a clear CTA button
4. Be mobile-responsive
5. Include unsubscribe link placeholder
6. Output ONLY the complete HTML email code, no explanations

User Request: ${prompt}`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Create a ${type || 'newsletter'} email: ${prompt}` }
                ],
                max_tokens: 4096,
                temperature: 0.7
            });

            let emailHtml = completion.choices[0].message.content || '';

            // Clean up the response
            if (emailHtml.includes('```html')) {
                emailHtml = emailHtml.split('```html')[1].split('```')[0];
            } else if (emailHtml.includes('```')) {
                emailHtml = emailHtml.split('```')[1].split('```')[0];
            }

            const emailHtmlClean = emailHtml.trim();

            // Save to database
            const user = (req as any).user;
            const clientId = user.userId || user.email || 'default';
            const savedAsset = await studioDb.saveAsset({
                clientId,
                type: 'email',
                name: subject || `${brandContext?.name || 'Company'} - ${type}`,
                content: emailHtmlClean,
                prompt,
                metadata: { type, subject, brand: brandContext?.name },
                status: 'complete'
            });

            return res.json({
                success: true,
                html: emailHtmlClean,
                subject: subject || `${brandContext?.name || 'Company'} Newsletter`,
                type,
                assetId: savedAsset.id
            });
        } catch (aiError: any) {
            console.error('AI email generation error:', aiError);
            const fallbackEmail = generateFallbackEmail(prompt, type, brandContext);

            // Save fallback to database
            const user = (req as any).user;
            const clientId = user.userId || user.email || 'default';
            const savedAsset = await studioDb.saveAsset({
                clientId,
                type: 'email',
                name: subject || `Email - ${type}`,
                content: fallbackEmail,
                prompt,
                metadata: { type, subject, fallback: true },
                status: 'complete'
            });

            return res.json({
                success: true,
                html: fallbackEmail,
                subject: subject || 'Newsletter',
                message: 'Generated with fallback template',
                assetId: savedAsset.id
            });
        }

    } catch (error: any) {
        console.error('Email generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/studio/analyze-website
 * Analyze an existing website and create an improved version
 */
router.post('/analyze-website', authenticate, async (req: Request, res: Response) => {
    try {
        const { url, autoMigrate } = req.body;
        const user = (req as any).user;
        const userId = user.userId || user.email || 'unknown';

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Rate limiting check
        const now = Date.now();
        const userLimit = analysisRateLimits.get(userId);

        if (userLimit) {
            if (now < userLimit.resetAt) {
                if (userLimit.count >= MAX_ANALYSES_PER_DAY) {
                    return res.status(429).json({
                        error: 'Rate limit exceeded',
                        message: `You've reached the limit of ${MAX_ANALYSES_PER_DAY} website analyses per day. Please try again tomorrow.`,
                        resetAt: new Date(userLimit.resetAt).toISOString()
                    });
                }
                userLimit.count++;
            } else {
                // Reset the window
                analysisRateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
            }
        } else {
            analysisRateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        }

        console.log(`[Studio] Analyzing website: ${url} for user ${userId}`);

        // Normalize URL
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;

        // Scrape the website
        const scrapedData = await scrapeWebsite(targetUrl);

        if (!scrapedData) {
            return res.status(400).json({
                error: 'Unable to fetch website',
                message: 'The website could not be accessed. Please check the URL and try again.'
            });
        }

        // Extract design elements
        const analysis = {
            url: targetUrl,
            title: scrapedData.title,
            description: scrapedData.metaDescription,
            headings: scrapedData.headings,
            colors: scrapedData.extractedColors,
            fonts: scrapedData.fonts,
            images: scrapedData.images.slice(0, 10), // Limit to 10 images
            sections: scrapedData.sections,
            contentPreview: scrapedData.content.substring(0, 1000),
            performance: {
                hasResponsiveMetaTag: scrapedData.hasViewportMeta,
                hasHttps: targetUrl.startsWith('https'),
                estimatedLoadTime: 'Unknown'
            },
            improvements: generateImprovementSuggestions(scrapedData)
        };

        // Generate improved version if autoMigrate is true
        let improvedHtml = null;
        if (autoMigrate) {
            improvedHtml = await generateImprovedVersion(scrapedData, analysis);
        }

        res.json({
            success: true,
            analysis,
            improvedHtml,
            message: autoMigrate
                ? 'Website analyzed and improved version generated'
                : 'Website analyzed successfully. Click "Generate Improved Version" to create a better site.'
        });

    } catch (error: any) {
        console.error('Website analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/studio/generate-improved
 * Generate an improved version of an analyzed website
 */
router.post('/generate-improved', authenticate, async (req: Request, res: Response) => {
    try {
        const { analysis, brandContext } = req.body;

        if (!analysis) {
            return res.status(400).json({ error: 'Analysis data is required' });
        }

        // Merge extracted data with brand context
        const mergedBrand = {
            name: brandContext?.name || analysis.title?.split('|')[0]?.trim() || 'My Brand',
            colors: brandContext?.colors || {
                primary: analysis.colors?.[0] || '#6366f1',
                secondary: analysis.colors?.[1] || '#8b5cf6',
                accent: analysis.colors?.[2] || '#10b981'
            },
            tagline: brandContext?.tagline || analysis.description || '',
            industry: brandContext?.industry || 'business'
        };

        const improvedHtml = await generateImprovedVersion(
            { title: analysis.title, metaDescription: analysis.description, content: analysis.contentPreview, headings: analysis.headings },
            analysis,
            mergedBrand
        );

        res.json({
            success: true,
            html: improvedHtml,
            brandUsed: mergedBrand.name
        });

    } catch (error: any) {
        console.error('Generate improved error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to scrape a website
async function scrapeWebsite(url: string): Promise<any | null> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LIV8-StudioBot/1.0; +https://liv8ai.com/bot)',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 15000,
            maxRedirects: 3,
            validateStatus: (status) => status < 400
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Remove non-content elements
        $('script, style, noscript, nav[aria-label="cookie"], .cookie-banner, #cookie-consent, .popup').remove();

        // Extract title
        const title = $('title').text().trim();

        // Extract meta description
        const metaDescription = $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') || '';

        // Extract headings
        const headings: { level: string; text: string }[] = [];
        $('h1, h2, h3').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 2 && text.length < 200) {
                headings.push({ level: el.tagName.toLowerCase(), text });
            }
        });

        // Extract colors from inline styles and CSS
        const extractedColors: string[] = [];
        const colorRegex = /#[0-9A-Fa-f]{3,6}\b|rgb\([^)]+\)|rgba\([^)]+\)/g;

        $('[style]').each((_, el) => {
            const style = $(el).attr('style') || '';
            const matches = style.match(colorRegex);
            if (matches) extractedColors.push(...matches);
        });

        // Also check CSS in style tags
        $('style').each((_, el) => {
            const css = $(el).html() || '';
            const matches = css.match(colorRegex);
            if (matches) extractedColors.push(...matches);
        });

        // Deduplicate and limit colors
        const uniqueColors = [...new Set(extractedColors)].slice(0, 10);

        // Extract fonts
        const fonts: string[] = [];
        const fontRegex = /font-family:\s*([^;]+)/g;
        $('[style]').each((_, el) => {
            const style = $(el).attr('style') || '';
            const matches = style.matchAll(fontRegex);
            for (const match of matches) {
                fonts.push(match[1].trim());
            }
        });

        // Extract images
        const images: { src: string; alt: string }[] = [];
        $('img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || '';
            const alt = $(el).attr('alt') || '';
            if (src && !src.includes('data:image/') && !src.includes('pixel')) {
                // Convert relative URLs to absolute
                const absoluteSrc = src.startsWith('http') ? src : new URL(src, url).href;
                images.push({ src: absoluteSrc, alt });
            }
        });

        // Extract main content
        let content = '';
        const mainContent = $('main, article, .content, #content, .main-content, [role="main"]').first();
        if (mainContent.length) {
            content = mainContent.text().replace(/\s+/g, ' ').trim();
        } else {
            content = $('body').text().replace(/\s+/g, ' ').trim();
        }

        // Identify sections
        const sections: { type: string; content: string }[] = [];
        $('section, .section, [class*="hero"], [class*="features"], [class*="testimonial"], [class*="pricing"], [class*="contact"], [class*="about"]').each((_, el) => {
            const className = $(el).attr('class') || '';
            const text = $(el).text().substring(0, 200).trim();
            let type = 'general';

            if (className.includes('hero') || $(el).find('h1').length) type = 'hero';
            else if (className.includes('feature')) type = 'features';
            else if (className.includes('testimonial') || className.includes('review')) type = 'testimonials';
            else if (className.includes('pricing') || className.includes('price')) type = 'pricing';
            else if (className.includes('contact')) type = 'contact';
            else if (className.includes('about')) type = 'about';

            if (text.length > 10) {
                sections.push({ type, content: text });
            }
        });

        // Check for viewport meta tag
        const hasViewportMeta = $('meta[name="viewport"]').length > 0;

        return {
            title,
            metaDescription,
            headings,
            extractedColors: uniqueColors,
            fonts: [...new Set(fonts)].slice(0, 5),
            images: images.slice(0, 20),
            sections,
            content: content.substring(0, 5000),
            hasViewportMeta
        };

    } catch (error: any) {
        console.error(`[Studio] Failed to scrape ${url}:`, error.message);
        return null;
    }
}

// Generate improvement suggestions
function generateImprovementSuggestions(scrapedData: any): string[] {
    const suggestions: string[] = [];

    if (!scrapedData.hasViewportMeta) {
        suggestions.push('Add responsive viewport meta tag for mobile optimization');
    }

    if (scrapedData.extractedColors.length < 2) {
        suggestions.push('Establish a consistent color palette with primary, secondary, and accent colors');
    }

    if (!scrapedData.headings.find((h: any) => h.level === 'h1')) {
        suggestions.push('Add a clear H1 heading for better SEO and accessibility');
    }

    if (scrapedData.images.length > 0 && scrapedData.images.filter((i: any) => !i.alt).length > 0) {
        suggestions.push('Add alt text to images for accessibility and SEO');
    }

    if (!scrapedData.metaDescription) {
        suggestions.push('Add a meta description for better search engine visibility');
    }

    if (scrapedData.sections.length < 3) {
        suggestions.push('Structure content into clear sections (hero, features, testimonials, CTA)');
    }

    suggestions.push('Implement modern design patterns like glassmorphism and gradient backgrounds');
    suggestions.push('Add scroll-triggered animations for better engagement');
    suggestions.push('Optimize for Core Web Vitals (LCP, FID, CLS)');

    return suggestions;
}

// Generate an improved version using AI
async function generateImprovedVersion(scrapedData: any, analysis: any, brandOverride?: any): Promise<string> {
    const brand = brandOverride || {
        name: scrapedData.title?.split('|')[0]?.trim() || 'Brand',
        colors: {
            primary: analysis.colors?.[0] || '#6366f1',
            secondary: analysis.colors?.[1] || '#8b5cf6'
        }
    };

    // Try to use OpenAI for better generation
    if (process.env.OPENAI_API_KEY) {
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are redesigning an existing website to be 10x better. Create a stunning, modern HTML page that keeps the core content but dramatically improves the design.

Original Site Analysis:
- Title: ${scrapedData.title || 'Unknown'}
- Description: ${scrapedData.metaDescription || 'No description'}
- Key Headings: ${scrapedData.headings?.slice(0, 5).map((h: any) => h.text).join(', ') || 'None'}
- Detected Colors: ${analysis.colors?.join(', ') || 'None detected'}
- Content Preview: ${scrapedData.content?.substring(0, 1500) || 'No content'}

## Brand Context
- Name: ${brand.name}
- Primary Color: ${brand.colors?.primary || '#6366f1'}
- Secondary Color: ${brand.colors?.secondary || '#8b5cf6'}

## Improvements to Make
${analysis.improvements?.join('\n- ') || 'General improvements needed'}

## Requirements
1. Keep the core content/messaging but rewrite for better impact
2. Use Tailwind CSS via CDN
3. Add glassmorphism, animated gradients, scroll animations
4. Dark theme with vibrant accents
5. Fully responsive
6. Output ONLY complete HTML, no markdown`
                    },
                    {
                        role: 'user',
                        content: `Redesign this website to be modern, stunning, and professional. Keep the business message but make it 10x more visually impressive.`
                    }
                ],
                max_tokens: 8192,
                temperature: 0.8
            });

            let html = completion.choices[0].message.content || '';

            // Clean up response
            if (html.includes('```html')) {
                html = html.split('```html')[1].split('```')[0];
            } else if (html.includes('```')) {
                html = html.split('```')[1].split('```')[0];
            }

            return html.trim();
        } catch (error) {
            console.error('[Studio] AI improvement generation failed:', error);
        }
    }

    // Fallback to template-based improvement
    return generateProfessionalHtml(
        scrapedData.content?.substring(0, 200) || brand.name,
        'landing',
        brand
    );
}

/**
 * POST /api/studio/publish
 * Publish a website to a subdomain
 */
router.post('/publish', authenticate, async (req: Request, res: Response) => {
    try {
        const { html, subdomain, name, type, locationId, brandContext } = req.body;
        const user = (req as any).user;

        if (!html) {
            return res.status(400).json({ error: 'HTML content is required' });
        }

        // Clean and validate subdomain
        let cleanSubdomain = (subdomain || name || 'my-site')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        // Add timestamp for uniqueness if needed
        if (cleanSubdomain.length < 3) {
            cleanSubdomain = `site-${Date.now()}`;
        }

        // In production, this would:
        // 1. Store the HTML in a database or object storage (S3, Cloudflare R2)
        // 2. Configure DNS for the subdomain
        // 3. Deploy via Vercel/Netlify/Cloudflare Pages API
        // 4. Set up SSL certificate

        // Example Vercel deployment (commented for now):
        /*
        if (process.env.VERCEL_TOKEN) {
            const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: cleanSubdomain,
                    files: [
                        { file: 'index.html', data: Buffer.from(html).toString('base64'), encoding: 'base64' }
                    ],
                    projectSettings: {
                        framework: null
                    }
                })
            });
            const deployment = await vercelResponse.json();
            // deployment.url would be the actual URL
        }
        */

        const publishedUrl = `https://${cleanSubdomain}.liv8sites.com`;

        // Log the publish event
        console.log(`[Studio] Publishing site for user ${user.userId}:`);
        console.log(`  - Subdomain: ${cleanSubdomain}`);
        console.log(`  - URL: ${publishedUrl}`);
        console.log(`  - Brand: ${brandContext?.name || 'Unknown'}`);
        console.log(`  - Location: ${locationId || 'Unknown'}`);
        console.log(`  - HTML Size: ${html.length} bytes`);

        // Store site metadata (in production, save to database)
        const siteRecord = {
            id: `site_${Date.now()}`,
            userId: user.userId,
            locationId,
            subdomain: cleanSubdomain,
            url: publishedUrl,
            name: name || brandContext?.name || 'Untitled Site',
            type: type || 'landing',
            htmlSize: html.length,
            createdAt: new Date().toISOString(),
            status: 'published'
        };

        // Save or update in database
        const clientId = user.userId || user.email || 'default';
        const savedAsset = await studioDb.saveAsset({
            clientId,
            type: 'website',
            name: name || brandContext?.name || 'Published Site',
            content: html,
            metadata: {
                subdomain: cleanSubdomain,
                type,
                locationId,
                brand: brandContext?.name
            },
            status: 'published',
            publishedUrl
        });

        res.json({
            success: true,
            url: publishedUrl,
            subdomain: cleanSubdomain,
            siteId: savedAsset.id,
            assetId: savedAsset.id,
            message: 'Site published successfully!',
            note: 'Subdomain hosting coming soon. For now, your site is saved and the URL is reserved.'
        });

    } catch (error: any) {
        console.error('Publish error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/studio/assets
 * Get user's generated assets
 */
router.get('/assets', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const clientId = user.userId || user.email || 'default';
        const type = req.query.type as string;
        const search = req.query.search as string;

        let assets;
        if (search) {
            assets = await studioDb.searchAssets(clientId, search);
        } else {
            assets = await studioDb.getAssets(clientId, type);
        }

        // Get asset counts
        const counts = await studioDb.getAssetCounts(clientId);

        res.json({
            success: true,
            assets,
            counts,
            total: assets.length
        });

    } catch (error: any) {
        console.error('Assets fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/studio/assets/:id
 * Get a single asset with full details
 */
router.get('/assets/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const asset = await studioDb.getAsset(id);

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({
            success: true,
            asset
        });

    } catch (error: any) {
        console.error('Asset fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/studio/assets/:id
 * Delete an asset
 */
router.delete('/assets/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await studioDb.deleteAsset(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Asset not found or could not be deleted' });
        }

        res.json({
            success: true,
            message: 'Asset deleted'
        });

    } catch (error: any) {
        console.error('Asset delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/studio/export/:id
 * Export an asset (download HTML, get image URL, etc.)
 */
router.get('/export/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const format = req.query.format as string || 'html';

        const asset = await studioDb.getAsset(id);

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // For websites and emails, return downloadable HTML
        if (asset.type === 'website' || asset.type === 'email') {
            if (format === 'download') {
                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Content-Disposition', `attachment; filename="${asset.name.replace(/[^a-z0-9]/gi, '-')}.html"`);
                return res.send(asset.content);
            }

            return res.json({
                success: true,
                type: asset.type,
                name: asset.name,
                html: asset.content,
                exportFormats: ['html', 'download']
            });
        }

        // For images and videos, return URL
        if (asset.type === 'image' || asset.type === 'video') {
            return res.json({
                success: true,
                type: asset.type,
                name: asset.name,
                url: asset.content,
                thumbnail: asset.thumbnail,
                exportFormats: ['url', 'embed']
            });
        }

        res.json({
            success: true,
            asset
        });

    } catch (error: any) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/studio/templates
 * Get available templates
 */
router.get('/templates', async (req: Request, res: Response) => {
    try {
        const type = req.query.type as string;

        const templates = [
            { id: 't1', name: 'SaaS Landing', category: 'Landing Pages', thumbnail: '🚀', description: 'Modern SaaS product landing page', type: 'website' },
            { id: 't2', name: 'Agency Portfolio', category: 'Landing Pages', thumbnail: '💼', description: 'Creative agency showcase', type: 'website' },
            { id: 't3', name: 'Lead Magnet Funnel', category: 'Funnels', thumbnail: '🎯', description: 'Capture leads with free offer', type: 'funnel' },
            { id: 't4', name: 'Webinar Registration', category: 'Funnels', thumbnail: '📺', description: 'Webinar signup flow', type: 'funnel' },
            { id: 't5', name: 'Blog Post', category: 'Content', thumbnail: '📝', description: 'SEO-optimized blog template', type: 'blog' },
            { id: 't6', name: 'Newsletter', category: 'Email', thumbnail: '📧', description: 'Weekly newsletter template', type: 'email' },
            { id: 't7', name: 'Product Launch', category: 'Email', thumbnail: '🎉', description: 'Product announcement email', type: 'email' },
            { id: 't8', name: 'Real Estate Listing', category: 'Landing Pages', thumbnail: '🏠', description: 'Property showcase page', type: 'website' },
            { id: 't9', name: 'Fitness Coach', category: 'Landing Pages', thumbnail: '💪', description: 'Personal trainer landing', type: 'website' },
            { id: 't10', name: 'Restaurant Menu', category: 'Landing Pages', thumbnail: '🍕', description: 'Restaurant with online menu', type: 'website' },
        ];

        const filtered = type ? templates.filter(t => t.type === type) : templates;

        res.json({
            success: true,
            templates: filtered
        });

    } catch (error: any) {
        console.error('Templates fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to generate professional HTML (matches frontend quality)
function generateProfessionalHtml(prompt: string, type: string, brand: any): string {
    const brandName = brand?.name || 'My Brand';
    const primaryColor = brand?.primaryColor || brand?.colors?.primary || '#6366f1';
    const secondaryColor = brand?.secondaryColor || brand?.colors?.secondary || '#8b5cf6';
    const title = prompt.split(' ').slice(0, 6).join(' ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandName} - ${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root { --brand-primary: ${primaryColor}; --brand-secondary: ${secondaryColor}; }
        * { font-family: 'Inter', sans-serif; }
        .gradient-text { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gradient-bg { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); }
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .glow { box-shadow: 0 0 60px ${primaryColor}40; }
        .float { animation: float 6s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        .fade-up { opacity: 0; transform: translateY(30px); animation: fadeUp 0.8s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .scroll-reveal { opacity: 0; transform: translateY(50px); transition: all 0.8s ease; }
        .scroll-reveal.visible { opacity: 1; transform: translateY(0); }
    </style>
</head>
<body class="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
    <div class="fixed inset-0 pointer-events-none" style="background: radial-gradient(ellipse at top, ${primaryColor}20 0%, transparent 50%);"></div>
    <div class="fixed top-1/4 -left-32 w-96 h-96 rounded-full blur-[128px] opacity-20 float" style="background: ${primaryColor};"></div>
    <div class="fixed bottom-1/4 -right-32 w-96 h-96 rounded-full blur-[128px] opacity-20 float" style="background: ${secondaryColor}; animation-delay: 3s;"></div>

    <nav class="fixed top-0 left-0 right-0 z-50 glass">
        <div class="container mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="h-10 w-10 gradient-bg rounded-xl flex items-center justify-center font-black">${brandName.charAt(0)}</div>
                <span class="text-xl font-bold">${brandName}</span>
            </div>
            <div class="hidden md:flex items-center gap-8">
                <a href="#features" class="text-sm text-white/70 hover:text-white transition-colors">Features</a>
                <a href="#benefits" class="text-sm text-white/70 hover:text-white transition-colors">Benefits</a>
                <a href="#contact" class="text-sm text-white/70 hover:text-white transition-colors">Contact</a>
            </div>
            <button class="gradient-bg px-6 py-2.5 rounded-full text-sm font-semibold hover:scale-105 transition-transform glow">Get Started</button>
        </div>
    </nav>

    <header class="relative min-h-screen flex items-center justify-center pt-20">
        <div class="container mx-auto px-6 text-center">
            <div class="fade-up">
                <span class="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-xs font-semibold text-white/80 mb-8">
                    <span class="w-2 h-2 gradient-bg rounded-full animate-pulse"></span>
                    ${brand?.tagline || 'Transform Your Business Today'}
                </span>
            </div>
            <h1 class="text-5xl sm:text-6xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-8 fade-up" style="animation-delay: 0.1s">
                <span class="block">${title.split(' ').slice(0, 3).join(' ')}</span>
                <span class="gradient-text">${title.split(' ').slice(3).join(' ') || brandName}</span>
            </h1>
            <p class="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed fade-up" style="animation-delay: 0.2s">${brand?.description || prompt}</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center fade-up" style="animation-delay: 0.3s">
                <button class="gradient-bg px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all glow flex items-center justify-center gap-2">
                    Start Free Trial →
                </button>
                <button class="glass px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    ▶ Watch Demo
                </button>
            </div>
            <div class="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-50">
                <span class="text-sm">Trusted by 10,000+ businesses</span>
                <div class="flex items-center gap-1">★★★★★ <span class="ml-2 text-sm">4.9/5</span></div>
            </div>
        </div>
    </header>

    <section id="features" class="py-32 relative">
        <div class="container mx-auto px-6">
            <div class="text-center mb-20 scroll-reveal">
                <span class="text-sm font-semibold gradient-text uppercase tracking-wider">Features</span>
                <h2 class="text-4xl md:text-5xl font-black mt-4 mb-6">Everything you need to succeed</h2>
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${['⚡ Lightning Fast|Experience blazing fast performance', '🔒 Bank-Level Security|Your data is always protected', '🎯 Precision Analytics|Make data-driven decisions', '🚀 Scalable Growth|Built to grow with you', '🤖 AI-Powered|Leverage cutting-edge AI', '🌍 Global Ready|Reach customers worldwide']
                    .map((f, i) => {
                        const [title, desc] = f.split('|');
                        return `<div class="glass p-8 rounded-3xl hover:border-white/20 transition-all group scroll-reveal" style="animation-delay: ${i * 0.1}s">
                            <div class="w-14 h-14 gradient-bg rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">${title.split(' ')[0]}</div>
                            <h3 class="text-xl font-bold mb-3">${title.split(' ').slice(1).join(' ')}</h3>
                            <p class="text-white/50 leading-relaxed">${desc}</p>
                        </div>`;
                    }).join('')}
            </div>
        </div>
    </section>

    <section id="benefits" class="py-32 relative">
        <div class="container mx-auto px-6">
            <div class="grid lg:grid-cols-2 gap-16 items-center">
                <div class="scroll-reveal">
                    <span class="text-sm font-semibold gradient-text uppercase tracking-wider">Why Choose Us</span>
                    <h2 class="text-4xl md:text-5xl font-black mt-4 mb-6">Results that speak for themselves</h2>
                    <p class="text-white/50 mb-8 leading-relaxed">${brand?.uniqueValue || 'We deliver exceptional results that transform your business.'}</p>
                    <div class="grid grid-cols-2 gap-6">
                        ${['10K+|Happy Customers', '99.9%|Uptime Guarantee', '50M+|Tasks Completed', '24/7|Expert Support'].map(s => {
                            const [num, label] = s.split('|');
                            return `<div class="glass p-6 rounded-2xl"><div class="text-3xl font-black gradient-text">${num}</div><div class="text-sm text-white/50 mt-1">${label}</div></div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="relative scroll-reveal">
                    <div class="glass rounded-3xl p-8 glow aspect-video flex items-center justify-center">
                        <button class="w-20 h-20 gradient-bg rounded-full flex items-center justify-center hover:scale-110 transition-transform">▶</button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="contact" class="py-32">
        <div class="container mx-auto px-6">
            <div class="glass rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden scroll-reveal">
                <h2 class="text-4xl md:text-6xl font-black mb-6">Ready to get started?</h2>
                <p class="text-white/50 max-w-xl mx-auto mb-10 text-lg">Join thousands of satisfied customers today.</p>
                <form class="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                    <input type="email" placeholder="Enter your email" class="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 outline-none transition-colors" />
                    <button type="submit" class="gradient-bg px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform glow whitespace-nowrap">Get Started Free</button>
                </form>
                <p class="text-sm text-white/30 mt-6">No credit card required • Free 14-day trial</p>
            </div>
        </div>
    </section>

    <footer class="py-16 border-t border-white/10">
        <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
            <div class="flex items-center gap-3 mb-4 md:mb-0">
                <div class="h-10 w-10 gradient-bg rounded-xl flex items-center justify-center font-black">${brandName.charAt(0)}</div>
                <span class="text-xl font-bold">${brandName}</span>
            </div>
            <p class="text-white/30 text-sm">© ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
        </div>
    </footer>

    <script>
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
        }, { threshold: 0.1 });
        document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
    </script>
</body>
</html>`;
}

// Legacy fallback (redirects to professional)
function generateFallbackHtml(prompt: string, type: string, brandContext: any): string {
    return generateProfessionalHtml(prompt, type, brandContext);
}

// Helper function to generate fallback email
function generateFallbackEmail(prompt: string, type: string, brandContext: any): string {
    const brandName = brandContext?.name || 'My Brand';
    const brandColor = brandContext?.colors || '#6366f1';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
            <td style="padding: 40px 30px; text-align: center; background-color: ${brandColor};">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${brandName}</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 30px;">
                <h2 style="color: #333333; margin: 0 0 20px 0;">${prompt.split(' ').slice(0, 8).join(' ')}</h2>
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                    ${prompt}
                </p>
                <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                        <td style="background-color: ${brandColor}; padding: 15px 30px; border-radius: 8px;">
                            <a href="#" style="color: #ffffff; text-decoration: none; font-weight: bold;">Learn More</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding: 30px; text-align: center; background-color: #f8f8f8; border-top: 1px solid #eeeeee;">
                <p style="color: #999999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} ${brandName}. All rights reserved.<br>
                    <a href="#" style="color: #999999;">Unsubscribe</a>
                </p>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export default router;
