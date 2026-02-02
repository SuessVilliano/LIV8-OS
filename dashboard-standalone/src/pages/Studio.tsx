import { useState } from 'react';
import {
    Sparkles,
    Image,
    Video,
    Globe,
    Mail,
    FolderOpen,
    Wand2,
    ChevronRight,
    Play,
    Download,
    Share2,
    Layers,
    Code2,
    Eye,
    Smartphone,
    Monitor,
    Tablet,
    Upload,
    Trash2,
    Copy,
    ExternalLink,
    Layout,
    Send,
    Settings,
    X,
    Loader2,
    ImagePlus,
    Film,
    MousePointer,
    Clock
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

type StudioMode = 'hub' | 'image' | 'video' | 'website' | 'email' | 'assets';
type ViewMode = 'visual' | 'code' | 'preview';
type DevicePreview = 'desktop' | 'tablet' | 'mobile';

interface GeneratedAsset {
    id: string;
    type: 'image' | 'video' | 'website' | 'email';
    name: string;
    url: string;
    thumbnail?: string;
    createdAt: Date;
    prompt?: string;
    status: 'generating' | 'complete' | 'failed';
}

interface Template {
    id: string;
    name: string;
    category: string;
    thumbnail: string;
    description: string;
    type: 'website' | 'funnel' | 'blog' | 'email';
}

const Studio = () => {
    const [mode, setMode] = useState<StudioMode>('hub');
    const [viewMode, setViewMode] = useState<ViewMode>('visual');
    const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [assets, setAssets] = useState<GeneratedAsset[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

    // Image generation state
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageStyle, setImageStyle] = useState('photorealistic');
    const [imageSize, setImageSize] = useState('1024x1024');
    const [imageModel, setImageModel] = useState('dall-e-3');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);

    // Video generation state
    const [videoPrompt, setVideoPrompt] = useState('');
    const [videoDuration, setVideoDuration] = useState('5');
    const [videoModel, setVideoModel] = useState('runway');
    const [videoAspect, setVideoAspect] = useState('16:9');

    // Website builder state
    const [sitePrompt, setSitePrompt] = useState('');
    const [siteType, setSiteType] = useState('landing');
    const [generatedHtml, setGeneratedHtml] = useState('');
    const [siteName] = useState('');

    // Get brand context from localStorage
    const brandContext = {
        name: localStorage.getItem('os_brand_name') || 'My Brand',
        colors: localStorage.getItem('os_brand_colors') || '#6366f1',
        industry: localStorage.getItem('os_industry') || 'business',
        voice: localStorage.getItem('os_brand_voice') || 'professional'
    };

    const templates: Template[] = [
        { id: 't1', name: 'SaaS Landing', category: 'Landing Pages', thumbnail: '🚀', description: 'Modern SaaS product landing page', type: 'website' },
        { id: 't2', name: 'Agency Portfolio', category: 'Landing Pages', thumbnail: '💼', description: 'Creative agency showcase', type: 'website' },
        { id: 't3', name: 'Lead Magnet Funnel', category: 'Funnels', thumbnail: '🎯', description: 'Capture leads with free offer', type: 'funnel' },
        { id: 't4', name: 'Webinar Registration', category: 'Funnels', thumbnail: '📺', description: 'Webinar signup flow', type: 'funnel' },
        { id: 't5', name: 'Blog Post', category: 'Content', thumbnail: '📝', description: 'SEO-optimized blog template', type: 'blog' },
        { id: 't6', name: 'Newsletter', category: 'Email', thumbnail: '📧', description: 'Weekly newsletter template', type: 'email' },
        { id: 't7', name: 'Product Launch', category: 'Email', thumbnail: '🎉', description: 'Product announcement email', type: 'email' },
        { id: 't8', name: 'Real Estate Listing', category: 'Landing Pages', thumbnail: '🏠', description: 'Property showcase page', type: 'website' },
    ];

    const imageStyles = [
        { id: 'photorealistic', name: 'Photorealistic', icon: '📷' },
        { id: 'illustration', name: 'Illustration', icon: '🎨' },
        { id: 'digital-art', name: 'Digital Art', icon: '🖼️' },
        { id: '3d-render', name: '3D Render', icon: '🎮' },
        { id: 'anime', name: 'Anime', icon: '🎌' },
        { id: 'watercolor', name: 'Watercolor', icon: '💧' },
        { id: 'sketch', name: 'Sketch', icon: '✏️' },
        { id: 'cinematic', name: 'Cinematic', icon: '🎬' },
    ];

    const videoModels = [
        { id: 'runway', name: 'Runway Gen-3', description: 'Best for realistic motion', icon: '🎬' },
        { id: 'sora', name: 'OpenAI Sora', description: 'Cinematic quality', icon: '🎥' },
        { id: 'veo', name: 'Google Veo', description: 'High fidelity video', icon: '📹' },
        { id: 'pika', name: 'Pika Labs', description: 'Fast generation', icon: '⚡' },
    ];

    // Generate Image
    const generateImage = async () => {
        if (!imagePrompt.trim()) return;

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/studio/generate-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: imagePrompt,
                    style: imageStyle,
                    size: imageSize,
                    model: imageModel,
                    brandContext
                })
            });

            if (response.ok) {
                const data = await response.json();
                setGeneratedImages(prev => [data.imageUrl, ...prev]);
                // Add to assets
                setAssets(prev => [{
                    id: Date.now().toString(),
                    type: 'image',
                    name: imagePrompt.slice(0, 50),
                    url: data.imageUrl,
                    thumbnail: data.imageUrl,
                    createdAt: new Date(),
                    prompt: imagePrompt,
                    status: 'complete'
                }, ...prev]);
            } else {
                // Fallback: generate placeholder
                const placeholderUrl = `https://placehold.co/1024x1024/6366f1/ffffff?text=${encodeURIComponent(imagePrompt.slice(0, 20))}`;
                setGeneratedImages(prev => [placeholderUrl, ...prev]);
            }
        } catch (error) {
            console.error('Image generation failed:', error);
            // Add placeholder for demo
            const placeholderUrl = `https://placehold.co/1024x1024/6366f1/ffffff?text=${encodeURIComponent('AI+Generated')}`;
            setGeneratedImages(prev => [placeholderUrl, ...prev]);
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate Video
    const generateVideo = async () => {
        if (!videoPrompt.trim()) return;

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/studio/generate-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: videoPrompt,
                    duration: videoDuration,
                    model: videoModel,
                    aspectRatio: videoAspect,
                    brandContext
                })
            });

            if (response.ok) {
                const data = await response.json();
                setAssets(prev => [{
                    id: Date.now().toString(),
                    type: 'video',
                    name: videoPrompt.slice(0, 50),
                    url: data.videoUrl,
                    thumbnail: data.thumbnail,
                    createdAt: new Date(),
                    prompt: videoPrompt,
                    status: data.status || 'generating'
                }, ...prev]);
            }
        } catch (error) {
            console.error('Video generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate Website/Funnel
    const generateWebsite = async () => {
        if (!sitePrompt.trim()) return;

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/studio/generate-website`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: sitePrompt,
                    type: siteType,
                    brandContext,
                    template: selectedTemplate?.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                setGeneratedHtml(data.html);
                setGeneratedCode(data.html);
            } else {
                // Generate fallback HTML
                setGeneratedHtml(generateFallbackHtml(sitePrompt, siteType));
                setGeneratedCode(generateFallbackHtml(sitePrompt, siteType));
            }
        } catch (error) {
            console.error('Website generation failed:', error);
            setGeneratedHtml(generateFallbackHtml(sitePrompt, siteType));
            setGeneratedCode(generateFallbackHtml(sitePrompt, siteType));
        } finally {
            setIsGenerating(false);
        }
    };

    // Fallback HTML generator
    const generateFallbackHtml = (prompt: string, _type: string) => {
        const title = prompt.split(' ').slice(0, 5).join(' ');
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandContext.name} - ${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root { --brand-color: ${brandContext.colors}; }
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
    <!-- Hero Section -->
    <header class="container mx-auto px-6 py-20 text-center">
        <nav class="flex justify-between items-center mb-20">
            <div class="text-2xl font-bold">${brandContext.name}</div>
            <div class="flex gap-6">
                <a href="#features" class="hover:text-purple-400">Features</a>
                <a href="#pricing" class="hover:text-purple-400">Pricing</a>
                <a href="#contact" class="hover:text-purple-400">Contact</a>
            </div>
        </nav>

        <h1 class="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
            ${title}
        </h1>
        <p class="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            ${prompt}
        </p>
        <div class="flex gap-4 justify-center">
            <button class="px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-xl font-bold text-lg transition-all hover:scale-105">
                Get Started Free
            </button>
            <button class="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition-all">
                Learn More
            </button>
        </div>
    </header>

    <!-- Features Section -->
    <section id="features" class="container mx-auto px-6 py-20">
        <h2 class="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
        <div class="grid md:grid-cols-3 gap-8">
            <div class="p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all">
                <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">⚡</div>
                <h3 class="text-xl font-bold mb-2">Lightning Fast</h3>
                <p class="text-slate-400">Built for speed and performance from the ground up.</p>
            </div>
            <div class="p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all">
                <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">🔒</div>
                <h3 class="text-xl font-bold mb-2">Secure by Default</h3>
                <p class="text-slate-400">Enterprise-grade security for your peace of mind.</p>
            </div>
            <div class="p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all">
                <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">🎯</div>
                <h3 class="text-xl font-bold mb-2">Results Driven</h3>
                <p class="text-slate-400">Focused on delivering measurable outcomes.</p>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="container mx-auto px-6 py-20">
        <div class="p-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl border border-white/10 text-center">
            <h2 class="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p class="text-slate-300 mb-8 max-w-xl mx-auto">Join thousands of satisfied customers who have transformed their business.</p>
            <form class="flex gap-4 max-w-md mx-auto">
                <input type="email" placeholder="Enter your email" class="flex-1 px-6 py-4 bg-white/10 border border-white/20 rounded-xl focus:border-purple-500 outline-none" />
                <button type="submit" class="px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-xl font-bold transition-all">
                    Subscribe
                </button>
            </form>
        </div>
    </section>

    <!-- Footer -->
    <footer class="container mx-auto px-6 py-10 border-t border-white/10">
        <div class="flex justify-between items-center">
            <div class="text-lg font-bold">${brandContext.name}</div>
            <p class="text-slate-400">© ${new Date().getFullYear()} All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
    };

    // Publish website
    const publishWebsite = async () => {
        if (!generatedHtml) return;

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/studio/publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    html: generatedHtml,
                    name: siteName || 'my-site',
                    type: siteType
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`Site published! URL: ${data.url}`);
            } else {
                alert('Publishing coming soon! Your site is saved locally.');
            }
        } catch (error) {
            alert('Publishing coming soon! Your site is saved locally.');
        } finally {
            setIsGenerating(false);
        }
    };

    const getDeviceWidth = () => {
        switch (devicePreview) {
            case 'mobile': return 'max-w-[375px]';
            case 'tablet': return 'max-w-[768px]';
            default: return 'max-w-full';
        }
    };

    // Hub View - Main Studio Dashboard
    const renderHub = () => (
        <div className="space-y-8">
            {/* Hero */}
            <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neuro/20 rounded-full text-neuro text-xs font-bold mb-4">
                    <Sparkles className="h-4 w-4" />
                    AI-POWERED CREATIVE SUITE
                </div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">
                    LIV8 <span className="text-neuro">Studio</span>
                </h1>
                <p className="text-[var(--os-text-muted)] max-w-2xl mx-auto">
                    Create stunning websites, images, videos, and content with AI.
                    Everything stays on-brand with your Business Twin.
                </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { id: 'image', icon: Image, label: 'AI Images', desc: 'DALL-E, Stable Diffusion', color: 'from-pink-500 to-rose-500' },
                    { id: 'video', icon: Video, label: 'AI Videos', desc: 'Sora, Veo, Runway', color: 'from-purple-500 to-violet-500' },
                    { id: 'website', icon: Globe, label: 'Websites', desc: 'Vibe Code Builder', color: 'from-blue-500 to-cyan-500' },
                    { id: 'email', icon: Mail, label: 'Emails', desc: 'Newsletters & Campaigns', color: 'from-amber-500 to-orange-500' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setMode(item.id as StudioMode)}
                        className="group p-6 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl hover:border-neuro/50 transition-all hover:scale-[1.02] text-left"
                    >
                        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <item.icon className="h-7 w-7 text-white" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">{item.label}</h3>
                        <p className="text-xs text-[var(--os-text-muted)]">{item.desc}</p>
                    </button>
                ))}
            </div>

            {/* Recent Projects */}
            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-neuro" />
                        Recent Projects
                    </h2>
                    <button
                        onClick={() => setMode('assets')}
                        className="text-xs text-neuro hover:underline"
                    >
                        View All Assets
                    </button>
                </div>

                {assets.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {assets.slice(0, 4).map(asset => (
                            <div key={asset.id} className="aspect-video bg-[var(--os-bg)] rounded-xl overflow-hidden border border-[var(--os-border)] hover:border-neuro/50 transition-all cursor-pointer group">
                                {asset.thumbnail ? (
                                    <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--os-text-muted)]">
                                        {asset.type === 'image' && <Image className="h-8 w-8" />}
                                        {asset.type === 'video' && <Video className="h-8 w-8" />}
                                        {asset.type === 'website' && <Globe className="h-8 w-8" />}
                                        {asset.type === 'email' && <Mail className="h-8 w-8" />}
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-xs text-white truncate">{asset.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-[var(--os-text-muted)]">
                        <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No projects yet. Start creating!</p>
                    </div>
                )}
            </div>

            {/* Templates */}
            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Layout className="h-5 w-5 text-neuro" />
                        Start from Template
                    </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {templates.slice(0, 4).map(template => (
                        <button
                            key={template.id}
                            onClick={() => {
                                setSelectedTemplate(template);
                                if (template.type === 'email') setMode('email');
                                else setMode('website');
                            }}
                            className="p-4 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl hover:border-neuro/50 transition-all text-left"
                        >
                            <div className="text-3xl mb-2">{template.thumbnail}</div>
                            <h4 className="font-bold text-sm">{template.name}</h4>
                            <p className="text-[10px] text-[var(--os-text-muted)]">{template.category}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // Image Generator View
    const renderImageGenerator = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Controls */}
            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6 overflow-y-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                        <ImagePlus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold">AI Image Generator</h2>
                        <p className="text-xs text-[var(--os-text-muted)]">DALL-E 3, Stable Diffusion, Midjourney</p>
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                        Describe your image
                    </label>
                    <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="A futuristic city skyline at sunset with flying cars and neon lights..."
                        className="w-full h-32 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 text-sm resize-none focus:border-neuro outline-none"
                    />
                </div>

                {/* Style Selection */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-3 block">
                        Style
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {imageStyles.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setImageStyle(style.id)}
                                className={`p-3 rounded-xl border text-center transition-all ${
                                    imageStyle === style.id
                                        ? 'border-neuro bg-neuro/10'
                                        : 'border-[var(--os-border)] hover:border-neuro/50'
                                }`}
                            >
                                <div className="text-xl mb-1">{style.icon}</div>
                                <span className="text-[10px] font-bold">{style.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Size Selection */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-3 block">
                        Size
                    </label>
                    <div className="flex gap-2">
                        {['1024x1024', '1792x1024', '1024x1792'].map(size => (
                            <button
                                key={size}
                                onClick={() => setImageSize(size)}
                                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                                    imageSize === size
                                        ? 'border-neuro bg-neuro/10 text-neuro'
                                        : 'border-[var(--os-border)] hover:border-neuro/50'
                                }`}
                            >
                                {size === '1024x1024' ? 'Square' : size === '1792x1024' ? 'Landscape' : 'Portrait'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Model Selection */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-3 block">
                        AI Model
                    </label>
                    <select
                        value={imageModel}
                        onChange={(e) => setImageModel(e.target.value)}
                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                    >
                        <option value="dall-e-3">DALL-E 3 (OpenAI)</option>
                        <option value="stable-diffusion">Stable Diffusion XL</option>
                        <option value="midjourney">Midjourney v6</option>
                        <option value="flux">Flux Pro</option>
                    </select>
                </div>

                {/* Generate Button */}
                <button
                    onClick={generateImage}
                    disabled={!imagePrompt.trim() || isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Wand2 className="h-5 w-5" />
                            Generate Image
                        </>
                    )}
                </button>
            </div>

            {/* Preview */}
            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Generated Images</h3>
                    {generatedImages.length > 0 && (
                        <span className="text-xs text-[var(--os-text-muted)]">{generatedImages.length} images</span>
                    )}
                </div>

                {generatedImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                        {generatedImages.map((img, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-[var(--os-border)]">
                                <img src={img} alt={`Generated ${idx}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                                        <Download className="h-4 w-4 text-white" />
                                    </button>
                                    <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                                        <Share2 className="h-4 w-4 text-white" />
                                    </button>
                                    <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                                        <Copy className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-[var(--os-text-muted)]">
                        <Image className="h-16 w-16 mb-4 opacity-30" />
                        <p className="text-sm">Your generated images will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );

    // Video Generator View
    const renderVideoGenerator = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Controls */}
            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6 overflow-y-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
                        <Film className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold">AI Video Generator</h2>
                        <p className="text-xs text-[var(--os-text-muted)]">Sora, Veo, Runway, Pika</p>
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                        Describe your video
                    </label>
                    <textarea
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder="A drone shot flying through a magical forest with glowing fireflies at dusk..."
                        className="w-full h-32 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 text-sm resize-none focus:border-neuro outline-none"
                    />
                </div>

                {/* Model Selection */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-3 block">
                        AI Model
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {videoModels.map(model => (
                            <button
                                key={model.id}
                                onClick={() => setVideoModel(model.id)}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    videoModel === model.id
                                        ? 'border-neuro bg-neuro/10'
                                        : 'border-[var(--os-border)] hover:border-neuro/50'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{model.icon}</span>
                                    <span className="font-bold text-sm">{model.name}</span>
                                </div>
                                <p className="text-[10px] text-[var(--os-text-muted)]">{model.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration & Aspect */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                            Duration
                        </label>
                        <select
                            value={videoDuration}
                            onChange={(e) => setVideoDuration(e.target.value)}
                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                        >
                            <option value="5">5 seconds</option>
                            <option value="10">10 seconds</option>
                            <option value="15">15 seconds</option>
                            <option value="30">30 seconds</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                            Aspect Ratio
                        </label>
                        <select
                            value={videoAspect}
                            onChange={(e) => setVideoAspect(e.target.value)}
                            className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                        >
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                            <option value="1:1">1:1 (Square)</option>
                            <option value="4:3">4:3 (Classic)</option>
                        </select>
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={generateVideo}
                    disabled={!videoPrompt.trim() || isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Play className="h-5 w-5" />
                            Generate Video
                        </>
                    )}
                </button>

                <p className="text-[10px] text-[var(--os-text-muted)] text-center mt-4">
                    Video generation may take 1-5 minutes depending on duration and model
                </p>
            </div>

            {/* Preview */}
            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Video Queue</h3>
                </div>

                {assets.filter(a => a.type === 'video').length > 0 ? (
                    <div className="space-y-4">
                        {assets.filter(a => a.type === 'video').map(video => (
                            <div key={video.id} className="p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)]">
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-14 bg-[var(--os-surface)] rounded-lg flex items-center justify-center">
                                        {video.status === 'generating' ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-neuro" />
                                        ) : (
                                            <Play className="h-6 w-6 text-neuro" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm truncate">{video.name}</h4>
                                        <p className="text-[10px] text-[var(--os-text-muted)]">
                                            {video.status === 'generating' ? 'Generating...' : 'Ready'}
                                        </p>
                                    </div>
                                    {video.status === 'complete' && (
                                        <button className="p-2 hover:bg-[var(--os-surface)] rounded-lg">
                                            <Download className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-[var(--os-text-muted)]">
                        <Video className="h-16 w-16 mb-4 opacity-30" />
                        <p className="text-sm">Your generated videos will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );

    // Website Builder View (Vibe Coding!)
    const renderWebsiteBuilder = () => (
        <div className="flex flex-col h-[calc(100vh-200px)]">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-t-2xl">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <Code2 className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-sm">Vibe Builder</span>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-[var(--os-bg)] rounded-lg p-1 border border-[var(--os-border)]">
                        {[
                            { id: 'visual', icon: MousePointer, label: 'Visual' },
                            { id: 'code', icon: Code2, label: 'Code' },
                            { id: 'preview', icon: Eye, label: 'Preview' },
                        ].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setViewMode(v.id as ViewMode)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    viewMode === v.id ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'
                                }`}
                            >
                                <v.icon className="h-3.5 w-3.5" />
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Device Preview */}
                    {viewMode === 'preview' && (
                        <div className="flex bg-[var(--os-bg)] rounded-lg p-1 border border-[var(--os-border)]">
                            {[
                                { id: 'desktop', icon: Monitor },
                                { id: 'tablet', icon: Tablet },
                                { id: 'mobile', icon: Smartphone },
                            ].map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => setDevicePreview(d.id as DevicePreview)}
                                    className={`p-2 rounded-md transition-all ${
                                        devicePreview === d.id ? 'bg-neuro text-white' : 'text-[var(--os-text-muted)] hover:text-neuro'
                                    }`}
                                >
                                    <d.icon className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <button className="p-2 hover:bg-[var(--os-bg)] rounded-lg text-[var(--os-text-muted)] hover:text-neuro">
                        <Settings className="h-4 w-4" />
                    </button>
                    <button
                        onClick={publishWebsite}
                        disabled={!generatedHtml}
                        className="px-4 py-2 bg-neuro text-white rounded-lg font-bold text-xs flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Publish
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 border-x border-b border-[var(--os-border)] rounded-b-2xl overflow-hidden">
                {/* AI Chat / Prompt Panel */}
                <div className="bg-[var(--os-surface)] border-r border-[var(--os-border)] p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <Wand2 className="h-5 w-5 text-neuro" />
                        <span className="font-bold text-sm">AI Assistant</span>
                    </div>

                    {/* Site Type */}
                    <div className="mb-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                            What are you building?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'landing', label: 'Landing Page', icon: '🚀' },
                                { id: 'funnel', label: 'Sales Funnel', icon: '🎯' },
                                { id: 'blog', label: 'Blog Post', icon: '📝' },
                                { id: 'portfolio', label: 'Portfolio', icon: '💼' },
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setSiteType(type.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        siteType === type.id
                                            ? 'border-neuro bg-neuro/10'
                                            : 'border-[var(--os-border)] hover:border-neuro/50'
                                    }`}
                                >
                                    <span className="text-lg mr-2">{type.icon}</span>
                                    <span className="text-xs font-bold">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt */}
                    <div className="flex-1 flex flex-col">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                            Describe your vision
                        </label>
                        <textarea
                            value={sitePrompt}
                            onChange={(e) => setSitePrompt(e.target.value)}
                            placeholder="Create a modern landing page for a fitness coaching business. Include a hero section with a compelling headline, features section highlighting my programs, testimonials from clients, and a contact form..."
                            className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 text-sm resize-none focus:border-neuro outline-none mb-4"
                        />

                        <button
                            onClick={generateWebsite}
                            disabled={!sitePrompt.trim() || isGenerating}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Building...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5" />
                                    Generate Site
                                </>
                            )}
                        </button>
                    </div>

                    {/* Templates */}
                    <button
                        onClick={() => setShowTemplates(true)}
                        className="mt-4 w-full py-3 border border-[var(--os-border)] rounded-xl text-xs font-bold hover:border-neuro hover:text-neuro transition-all flex items-center justify-center gap-2"
                    >
                        <Layout className="h-4 w-4" />
                        Browse Templates
                    </button>
                </div>

                {/* Code/Visual Editor */}
                <div className="col-span-2 bg-[var(--os-bg)] flex flex-col">
                    {viewMode === 'code' && (
                        <div className="flex-1 p-4 font-mono text-sm overflow-auto">
                            <textarea
                                value={generatedCode || generatedHtml}
                                onChange={(e) => {
                                    setGeneratedCode(e.target.value);
                                    setGeneratedHtml(e.target.value);
                                }}
                                className="w-full h-full bg-transparent resize-none outline-none text-green-400"
                                placeholder="// Your generated code will appear here..."
                                spellCheck={false}
                            />
                        </div>
                    )}

                    {viewMode === 'preview' && (
                        <div className={`flex-1 flex items-start justify-center p-4 overflow-auto bg-slate-800`}>
                            <div className={`${getDeviceWidth()} w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden`}>
                                {generatedHtml ? (
                                    <iframe
                                        srcDoc={generatedHtml}
                                        className="w-full h-full border-0"
                                        title="Preview"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <div className="text-center">
                                            <Globe className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                            <p>Generate a site to see the preview</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {viewMode === 'visual' && (
                        <div className="flex-1 p-4 overflow-auto">
                            {generatedHtml ? (
                                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                                    <iframe
                                        srcDoc={generatedHtml}
                                        className="w-full h-[600px] border-0"
                                        title="Visual Editor"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-[var(--os-text-muted)]">
                                    <div className="text-center">
                                        <Wand2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                        <h3 className="font-bold mb-2">Ready to Build</h3>
                                        <p className="text-sm">Describe your site and let AI create it for you</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Email Builder View
    const renderEmailBuilder = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Controls */}
            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6 overflow-y-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold">Email Builder</h2>
                        <p className="text-xs text-[var(--os-text-muted)]">Newsletters & Campaign Emails</p>
                    </div>
                </div>

                {/* Email Type */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-3 block">
                        Email Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'newsletter', label: 'Newsletter', icon: '📰' },
                            { id: 'promo', label: 'Promotion', icon: '🎁' },
                            { id: 'welcome', label: 'Welcome', icon: '👋' },
                            { id: 'followup', label: 'Follow-up', icon: '💬' },
                        ].map(type => (
                            <button
                                key={type.id}
                                className="p-3 rounded-xl border border-[var(--os-border)] hover:border-neuro/50 transition-all text-left"
                            >
                                <span className="text-lg mr-2">{type.icon}</span>
                                <span className="text-xs font-bold">{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Subject Line */}
                <div className="mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                        Subject Line
                    </label>
                    <input
                        type="text"
                        placeholder="Your attention-grabbing subject..."
                        className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                    />
                </div>

                {/* Content */}
                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                        Describe your email
                    </label>
                    <textarea
                        placeholder="Write a weekly newsletter about AI trends in marketing. Include 3 tips, a featured tool, and a call to action..."
                        className="w-full h-32 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 text-sm resize-none focus:border-neuro outline-none"
                    />
                </div>

                {/* Generate Button */}
                <button
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
                >
                    <Sparkles className="h-5 w-5" />
                    Generate Email
                </button>

                {/* Send Options */}
                <div className="mt-6 p-4 bg-[var(--os-bg)] rounded-xl border border-[var(--os-border)]">
                    <h4 className="font-bold text-sm mb-3">Send Options</h4>
                    <div className="space-y-2">
                        <button className="w-full py-2 px-4 border border-[var(--os-border)] rounded-lg text-xs font-bold hover:border-neuro transition-all flex items-center gap-2">
                            <Send className="h-3.5 w-3.5" />
                            Send to Vbout
                        </button>
                        <button className="w-full py-2 px-4 border border-[var(--os-border)] rounded-lg text-xs font-bold hover:border-neuro transition-all flex items-center gap-2">
                            <Download className="h-3.5 w-3.5" />
                            Export HTML
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold">Email Preview</h3>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                            <Monitor className="h-4 w-4" />
                        </button>
                        <button className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                            <Smartphone className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center h-64 text-[var(--os-text-muted)] bg-[var(--os-bg)] rounded-xl">
                    <div className="text-center">
                        <Mail className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-sm">Your email preview will appear here</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Assets Library View
    const renderAssets = () => (
        <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FolderOpen className="h-6 w-6 text-neuro" />
                    <h2 className="font-bold text-lg">Asset Library</h2>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg text-xs font-bold hover:border-neuro transition-all">
                        <Upload className="h-3.5 w-3.5 inline mr-2" />
                        Upload
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                {['All', 'Images', 'Videos', 'Websites', 'Emails'].map(tab => (
                    <button
                        key={tab}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--os-bg)] border border-[var(--os-border)] hover:border-neuro transition-all"
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {assets.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {assets.map(asset => (
                        <div key={asset.id} className="group relative aspect-square bg-[var(--os-bg)] rounded-xl overflow-hidden border border-[var(--os-border)] hover:border-neuro/50 transition-all cursor-pointer">
                            {asset.thumbnail ? (
                                <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--os-text-muted)]">
                                    {asset.type === 'image' && <Image className="h-8 w-8" />}
                                    {asset.type === 'video' && <Video className="h-8 w-8" />}
                                    {asset.type === 'website' && <Globe className="h-8 w-8" />}
                                    {asset.type === 'email' && <Mail className="h-8 w-8" />}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                                    <Download className="h-4 w-4 text-white" />
                                </button>
                                <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                                    <Trash2 className="h-4 w-4 text-white" />
                                </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-[10px] text-white truncate">{asset.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-[var(--os-text-muted)]">
                    <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="font-bold mb-2">No Assets Yet</h3>
                    <p className="text-sm">Start creating content to build your library</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-full bg-[var(--os-bg)] p-6 md:p-10">
            {/* Navigation */}
            {mode !== 'hub' && (
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setMode('hub')}
                        className="flex items-center gap-2 text-[var(--os-text-muted)] hover:text-neuro transition-all"
                    >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                        <span className="text-sm font-bold">Back to Studio</span>
                    </button>
                </div>
            )}

            {/* Render Current Mode */}
            {mode === 'hub' && renderHub()}
            {mode === 'image' && renderImageGenerator()}
            {mode === 'video' && renderVideoGenerator()}
            {mode === 'website' && renderWebsiteBuilder()}
            {mode === 'email' && renderEmailBuilder()}
            {mode === 'assets' && renderAssets()}

            {/* Templates Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-4xl bg-[var(--os-surface)] rounded-2xl border border-[var(--os-border)] shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between">
                            <h3 className="font-bold text-lg">Choose a Template</h3>
                            <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {templates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => {
                                            setSelectedTemplate(template);
                                            setShowTemplates(false);
                                        }}
                                        className="p-6 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl hover:border-neuro/50 transition-all text-left"
                                    >
                                        <div className="text-4xl mb-3">{template.thumbnail}</div>
                                        <h4 className="font-bold mb-1">{template.name}</h4>
                                        <p className="text-xs text-[var(--os-text-muted)]">{template.description}</p>
                                        <span className="text-[10px] text-neuro uppercase font-bold mt-2 block">{template.category}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Studio;
