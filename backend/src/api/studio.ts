/**
 * LIV8 Creative Studio API
 *
 * AI-powered content generation for images, videos, websites, and emails
 */

import express, { Request, Response } from 'express';
import { authService } from '../services/auth.js';
import OpenAI from 'openai';

const router = express.Router();

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

                return res.json({
                    success: true,
                    imageUrl: response.data[0].url,
                    revisedPrompt: response.data[0].revised_prompt
                });
            } catch (openaiError: any) {
                console.error('DALL-E error:', openaiError);
                // Return placeholder for demo
                return res.json({
                    success: true,
                    imageUrl: `https://placehold.co/${size.replace('x', '/')}/6366f1/ffffff?text=${encodeURIComponent(prompt.slice(0, 20))}`,
                    message: 'Demo mode - configure OPENAI_API_KEY for real generation'
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
        const { prompt, type, brandContext, template } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Build system prompt for website generation
        const systemPrompt = `You are an expert web developer and designer. Generate a complete, modern, responsive HTML page using Tailwind CSS (via CDN).

Brand Context:
- Brand Name: ${brandContext?.name || 'My Brand'}
- Primary Color: ${brandContext?.colors || '#6366f1'}
- Industry: ${brandContext?.industry || 'business'}
- Voice/Tone: ${brandContext?.voice || 'professional'}

Page Type: ${type || 'landing page'}

Requirements:
1. Use Tailwind CSS via CDN (include the script tag)
2. Make it fully responsive (mobile-first)
3. Use modern design patterns (gradients, shadows, rounded corners)
4. Include smooth animations and hover effects
5. Use the brand colors throughout
6. Include semantic HTML5 elements
7. Add placeholder images using placehold.co
8. Include a contact/signup form that can connect to a CRM
9. Output ONLY the complete HTML code, no explanations

User Request: ${prompt}`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Create a ${type || 'landing page'}: ${prompt}` }
                ],
                max_tokens: 4096,
                temperature: 0.7
            });

            const generatedHtml = completion.choices[0].message.content || '';

            // Clean up the response - extract just the HTML
            let html = generatedHtml;
            if (html.includes('```html')) {
                html = html.split('```html')[1].split('```')[0];
            } else if (html.includes('```')) {
                html = html.split('```')[1].split('```')[0];
            }

            return res.json({
                success: true,
                html: html.trim(),
                type
            });
        } catch (aiError: any) {
            console.error('AI generation error:', aiError);
            // Return fallback HTML
            return res.json({
                success: true,
                html: generateFallbackHtml(prompt, type, brandContext),
                type,
                message: 'Generated with fallback template'
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

            return res.json({
                success: true,
                html: emailHtml.trim(),
                subject: subject || `${brandContext?.name || 'Company'} Newsletter`,
                type
            });
        } catch (aiError: any) {
            console.error('AI email generation error:', aiError);
            return res.json({
                success: true,
                html: generateFallbackEmail(prompt, type, brandContext),
                subject: subject || 'Newsletter',
                message: 'Generated with fallback template'
            });
        }

    } catch (error: any) {
        console.error('Email generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/studio/publish
 * Publish a website to a hosting platform
 */
router.post('/publish', authenticate, async (req: Request, res: Response) => {
    try {
        const { html, name, type } = req.body;
        const user = (req as any).user;

        if (!html) {
            return res.status(400).json({ error: 'HTML content is required' });
        }

        // Generate a unique subdomain
        const subdomain = `${name || 'site'}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        // In production, integrate with:
        // - Vercel API: https://vercel.com/docs/rest-api
        // - Netlify API: https://docs.netlify.com/api/get-started/
        // - Custom hosting solution

        // For now, return simulated URL
        const publishedUrl = `https://${subdomain}.liv8sites.com`;

        // Store in database (simulated)
        console.log(`Publishing site for user ${user.userId}: ${publishedUrl}`);

        res.json({
            success: true,
            url: publishedUrl,
            subdomain,
            message: 'Site published successfully! (Demo mode - configure hosting API for production)'
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
        const type = req.query.type as string;

        // In production, fetch from database
        // For now, return empty array
        res.json({
            success: true,
            assets: []
        });

    } catch (error: any) {
        console.error('Assets fetch error:', error);
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

// Helper function to generate fallback HTML
function generateFallbackHtml(prompt: string, type: string, brandContext: any): string {
    const brandName = brandContext?.name || 'My Brand';
    const brandColor = brandContext?.colors || '#6366f1';
    const title = prompt.split(' ').slice(0, 5).join(' ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandName} - ${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
    <header class="container mx-auto px-6 py-20 text-center">
        <nav class="flex justify-between items-center mb-20">
            <div class="text-2xl font-bold">${brandName}</div>
            <div class="flex gap-6">
                <a href="#features" class="hover:text-purple-400">Features</a>
                <a href="#contact" class="hover:text-purple-400">Contact</a>
            </div>
        </nav>
        <h1 class="text-5xl md:text-7xl font-black mb-6">${title}</h1>
        <p class="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">${prompt}</p>
        <button class="px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-xl font-bold text-lg">
            Get Started
        </button>
    </header>
    <section id="features" class="container mx-auto px-6 py-20">
        <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
        <div class="grid md:grid-cols-3 gap-8">
            <div class="p-8 bg-white/5 rounded-2xl border border-white/10">
                <h3 class="text-xl font-bold mb-2">Feature 1</h3>
                <p class="text-slate-400">Description of your first feature.</p>
            </div>
            <div class="p-8 bg-white/5 rounded-2xl border border-white/10">
                <h3 class="text-xl font-bold mb-2">Feature 2</h3>
                <p class="text-slate-400">Description of your second feature.</p>
            </div>
            <div class="p-8 bg-white/5 rounded-2xl border border-white/10">
                <h3 class="text-xl font-bold mb-2">Feature 3</h3>
                <p class="text-slate-400">Description of your third feature.</p>
            </div>
        </div>
    </section>
    <footer class="container mx-auto px-6 py-10 border-t border-white/10 text-center">
        <p class="text-slate-400">© ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
    </footer>
</body>
</html>`;
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
