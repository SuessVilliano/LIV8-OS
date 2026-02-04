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
    Clock,
    Search,
    ArrowRightLeft,
    AlertTriangle,
    CheckCircle2,
    Undo2
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
    const [siteName, setSiteName] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [siteEditHistory, setSiteEditHistory] = useState<string[]>([]);
    const [customDomain, setCustomDomain] = useState('');
    const [publishedUrl, setPublishedUrl] = useState('');

    // Website analyzer state
    const [showAnalyzer, setShowAnalyzer] = useState(false);
    const [analyzeUrl, setAnalyzeUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [analysisError, setAnalysisError] = useState('');

    // Late cross-post state
    const [showCrossPost, setShowCrossPost] = useState(false);
    const [crossPostImage, setCrossPostImage] = useState('');
    const [crossPostContent, setCrossPostContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [isCrossPosting, setIsCrossPosting] = useState(false);
    const [crossPostError, setCrossPostError] = useState('');

    // Get comprehensive brand context from Brand Hub / Business Twin
    const getBrandContext = () => {
        try {
            const twinData = localStorage.getItem('os_business_twin');
            const twin = twinData ? JSON.parse(twinData) : null;

            return {
                name: twin?.businessName || localStorage.getItem('os_brand_name') || localStorage.getItem('businessName') || 'My Brand',
                tagline: twin?.tagline || localStorage.getItem('os_tagline') || '',
                colors: {
                    primary: twin?.brandColors?.primary || localStorage.getItem('os_brand_primary') || '#6366f1',
                    secondary: twin?.brandColors?.secondary || localStorage.getItem('os_brand_secondary') || '#8b5cf6',
                    accent: twin?.brandColors?.accent || localStorage.getItem('os_brand_accent') || '#10b981'
                },
                industry: twin?.industry || localStorage.getItem('os_industry') || 'business',
                voice: twin?.brandVoice || localStorage.getItem('os_brand_voice') || 'professional',
                description: twin?.description || localStorage.getItem('os_business_description') || '',
                services: twin?.services || [],
                targetAudience: twin?.targetAudience || localStorage.getItem('os_target_audience') || '',
                uniqueValue: twin?.uniqueValue || localStorage.getItem('os_uvp') || '',
                contactEmail: twin?.email || localStorage.getItem('os_contact_email') || '',
                phone: twin?.phone || localStorage.getItem('os_phone') || '',
                address: twin?.address || '',
                socialLinks: twin?.socialLinks || {},
                logo: twin?.logo || localStorage.getItem('os_logo_url') || ''
            };
        } catch {
            return {
                name: 'My Brand',
                tagline: '',
                colors: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#10b981' },
                industry: 'business',
                voice: 'professional',
                description: '',
                services: [],
                targetAudience: '',
                uniqueValue: '',
                contactEmail: '',
                phone: '',
                address: '',
                socialLinks: {},
                logo: ''
            };
        }
    };

    const brandContext = getBrandContext();

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

    // Open cross-post modal for an image
    const openCrossPost = (imageUrl: string) => {
        setCrossPostImage(imageUrl);
        setCrossPostContent(`Check out our latest creation! ✨ #AI #GeneratedContent`);
        setSelectedPlatforms([]);
        setCrossPostError('');
        setShowCrossPost(true);
    };

    // Cross-post to Late
    const handleCrossPost = async () => {
        if (!crossPostContent.trim() || selectedPlatforms.length === 0) {
            setCrossPostError('Please add content and select at least one platform');
            return;
        }

        setIsCrossPosting(true);
        setCrossPostError('');

        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id') || 'default';

            const response = await fetch(`${API_BASE}/api/late/publish-now`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-location-id': locationId
                },
                body: JSON.stringify({
                    content: crossPostContent,
                    platforms: selectedPlatforms,
                    mediaUrls: crossPostImage ? [crossPostImage] : undefined
                })
            });

            if (response.ok) {
                setShowCrossPost(false);
                setCrossPostImage('');
                setCrossPostContent('');
                setSelectedPlatforms([]);
                alert(`Successfully posted to ${selectedPlatforms.join(', ')}!`);
            } else {
                const data = await response.json();
                setCrossPostError(data.error || 'Failed to post. Please check your Late API key in Settings.');
            }
        } catch (error: any) {
            console.error('Cross-post failed:', error);
            setCrossPostError('Failed to post. Please check your Late API key in Settings.');
        } finally {
            setIsCrossPosting(false);
        }
    };

    const LATE_PLATFORMS = [
        { id: 'twitter', name: 'Twitter/X', color: 'bg-sky-500' },
        { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
        { id: 'facebook', name: 'Facebook', color: 'bg-blue-600' },
        { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-700' },
        { id: 'tiktok', name: 'TikTok', color: 'bg-gray-900' },
        { id: 'threads', name: 'Threads', color: 'bg-gray-800' },
        { id: 'bluesky', name: 'Bluesky', color: 'bg-sky-400' },
        { id: 'pinterest', name: 'Pinterest', color: 'bg-red-600' },
    ];

    const togglePlatform = (platformId: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        );
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
    const generateWebsite = async (improveExisting = false) => {
        if (!sitePrompt.trim() && !improveExisting) return;

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('os_token');
            const fullBrandContext = getBrandContext();

            const response = await fetch(`${API_BASE}/api/studio/generate-website`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: improveExisting
                        ? `Improve and enhance this existing website. Make it more professional, add better animations, improve the copy, and make it more visually striking. Current prompt was: ${sitePrompt}. Make it 10x better.`
                        : sitePrompt,
                    type: siteType,
                    brandContext: fullBrandContext,
                    template: selectedTemplate?.id,
                    existingHtml: improveExisting ? generatedHtml : undefined,
                    customizations: {
                        siteName,
                        customDomain
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Save to edit history
                if (generatedHtml) {
                    setSiteEditHistory(prev => [...prev, generatedHtml]);
                }
                setGeneratedHtml(data.html);
                setGeneratedCode(data.html);
            } else {
                // Generate professional fallback HTML
                const html = generateProfessionalHtml(sitePrompt, siteType, fullBrandContext);
                if (generatedHtml) {
                    setSiteEditHistory(prev => [...prev, generatedHtml]);
                }
                setGeneratedHtml(html);
                setGeneratedCode(html);
            }
        } catch (error) {
            console.error('Website generation failed:', error);
            const html = generateProfessionalHtml(sitePrompt, siteType, getBrandContext());
            if (generatedHtml) {
                setSiteEditHistory(prev => [...prev, generatedHtml]);
            }
            setGeneratedHtml(html);
            setGeneratedCode(html);
        } finally {
            setIsGenerating(false);
        }
    };

    // Undo last edit
    const undoLastEdit = () => {
        if (siteEditHistory.length > 0) {
            const lastHtml = siteEditHistory[siteEditHistory.length - 1];
            setGeneratedHtml(lastHtml);
            setGeneratedCode(lastHtml);
            setSiteEditHistory(prev => prev.slice(0, -1));
        }
    };

    // Analyze existing website
    const analyzeWebsite = async (autoMigrate = false) => {
        if (!analyzeUrl.trim()) return;

        setIsAnalyzing(true);
        setAnalysisError('');
        setAnalysisResult(null);

        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/studio/analyze-website`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: analyzeUrl,
                    autoMigrate
                })
            });

            if (response.ok) {
                const data = await response.json();
                setAnalysisResult(data.analysis);

                // If auto-migrate was requested and we got improved HTML
                if (autoMigrate && data.improvedHtml) {
                    if (generatedHtml) {
                        setSiteEditHistory(prev => [...prev, generatedHtml]);
                    }
                    setGeneratedHtml(data.improvedHtml);
                    setGeneratedCode(data.improvedHtml);
                    setSiteName(data.analysis.title?.split('|')[0]?.trim() || 'Migrated Site');
                }
            } else {
                const error = await response.json();
                setAnalysisError(error.message || 'Failed to analyze website');
            }
        } catch (error: any) {
            console.error('Website analysis failed:', error);
            setAnalysisError(error.message || 'Failed to connect to analyzer');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Generate improved version from analysis
    const generateImprovedFromAnalysis = async () => {
        if (!analysisResult) return;

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/studio/generate-improved`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    analysis: analysisResult,
                    brandContext: getBrandContext()
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (generatedHtml) {
                    setSiteEditHistory(prev => [...prev, generatedHtml]);
                }
                setGeneratedHtml(data.html);
                setGeneratedCode(data.html);
                setSiteName(analysisResult.title?.split('|')[0]?.trim() || 'Improved Site');
                setShowAnalyzer(false);
            }
        } catch (error) {
            console.error('Failed to generate improved version:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Professional HTML generator with scroll-stopping design
    const generateProfessionalHtml = (prompt: string, _type: string, brand: ReturnType<typeof getBrandContext>) => {
        const title = prompt.split(' ').slice(0, 6).join(' ');
        const primaryColor = brand.colors.primary;
        const secondaryColor = brand.colors.secondary;

        // Extract key info from prompt for better personalization
        const isForBusiness = prompt.toLowerCase().includes('business') || prompt.toLowerCase().includes('company');
        const isForProduct = prompt.toLowerCase().includes('product') || prompt.toLowerCase().includes('app') || prompt.toLowerCase().includes('saas');
        const isForService = prompt.toLowerCase().includes('service') || prompt.toLowerCase().includes('agency') || prompt.toLowerCase().includes('consulting');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brand.name} - ${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --brand-primary: ${primaryColor};
            --brand-secondary: ${secondaryColor};
        }
        * { font-family: 'Inter', sans-serif; }
        .gradient-text { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gradient-bg { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); }
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .glow { box-shadow: 0 0 60px ${primaryColor}40; }
        .float { animation: float 6s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        .fade-up { opacity: 0; transform: translateY(30px); animation: fadeUp 0.8s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .stagger-1 { animation-delay: 0.1s; } .stagger-2 { animation-delay: 0.2s; } .stagger-3 { animation-delay: 0.3s; }
        .hero-gradient { background: radial-gradient(ellipse at top, ${primaryColor}20 0%, transparent 50%), radial-gradient(ellipse at bottom, ${secondaryColor}10 0%, transparent 50%); }
        .scroll-reveal { opacity: 0; transform: translateY(50px); transition: all 0.8s ease; }
        .scroll-reveal.visible { opacity: 1; transform: translateY(0); }
    </style>
</head>
<body class="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
    <!-- Animated Background -->
    <div class="fixed inset-0 hero-gradient pointer-events-none"></div>
    <div class="fixed top-1/4 -left-32 w-96 h-96 bg-[${primaryColor}] rounded-full blur-[128px] opacity-20 float"></div>
    <div class="fixed bottom-1/4 -right-32 w-96 h-96 bg-[${secondaryColor}] rounded-full blur-[128px] opacity-20 float" style="animation-delay: 3s;"></div>

    <!-- Navigation -->
    <nav class="fixed top-0 left-0 right-0 z-50 glass">
        <div class="container mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                ${brand.logo ? `<img src="${brand.logo}" alt="${brand.name}" class="h-8 w-8 rounded-lg">` : `<div class="h-10 w-10 gradient-bg rounded-xl flex items-center justify-center font-black">${brand.name.charAt(0)}</div>`}
                <span class="text-xl font-bold">${brand.name}</span>
            </div>
            <div class="hidden md:flex items-center gap-8">
                <a href="#features" class="text-sm text-white/70 hover:text-white transition-colors">Features</a>
                <a href="#benefits" class="text-sm text-white/70 hover:text-white transition-colors">Benefits</a>
                <a href="#testimonials" class="text-sm text-white/70 hover:text-white transition-colors">Testimonials</a>
                <a href="#contact" class="text-sm text-white/70 hover:text-white transition-colors">Contact</a>
            </div>
            <button class="gradient-bg px-6 py-2.5 rounded-full text-sm font-semibold hover:scale-105 transition-transform glow">
                Get Started
            </button>
        </div>
    </nav>

    <!-- Hero Section -->
    <header class="relative min-h-screen flex items-center justify-center pt-20">
        <div class="container mx-auto px-6 text-center">
            <div class="fade-up">
                <span class="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-xs font-semibold text-white/80 mb-8">
                    <span class="w-2 h-2 gradient-bg rounded-full animate-pulse"></span>
                    ${brand.tagline || 'Transform Your Business Today'}
                </span>
            </div>

            <h1 class="text-5xl sm:text-6xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-8 fade-up stagger-1">
                <span class="block">${title.split(' ').slice(0, 3).join(' ')}</span>
                <span class="gradient-text">${title.split(' ').slice(3).join(' ') || brand.name}</span>
            </h1>

            <p class="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed fade-up stagger-2">
                ${brand.description || prompt}
            </p>

            <div class="flex flex-col sm:flex-row gap-4 justify-center fade-up stagger-3">
                <button class="gradient-bg px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all glow flex items-center justify-center gap-2">
                    Start Free Trial
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </button>
                <button class="glass px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Watch Demo
                </button>
            </div>

            <!-- Trust Badges -->
            <div class="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-50">
                <span class="text-sm">Trusted by 10,000+ businesses</span>
                <div class="flex -space-x-2">
                    ${[1,2,3,4,5].map(() => `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-2 border-[#0a0a0f]"></div>`).join('')}
                </div>
                <div class="flex items-center gap-1">
                    ${[1,2,3,4,5].map(() => `<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`).join('')}
                    <span class="ml-2 text-sm">4.9/5</span>
                </div>
            </div>
        </div>

        <!-- Scroll Indicator -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <svg class="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
        </div>
    </header>

    <!-- Features Section -->
    <section id="features" class="py-32 relative">
        <div class="container mx-auto px-6">
            <div class="text-center mb-20 scroll-reveal">
                <span class="text-sm font-semibold gradient-text uppercase tracking-wider">Features</span>
                <h2 class="text-4xl md:text-5xl font-black mt-4 mb-6">Everything you need to ${isForProduct ? 'build great products' : isForService ? 'deliver excellence' : 'succeed'}</h2>
                <p class="text-white/50 max-w-2xl mx-auto">Powerful tools designed to help you achieve more in less time.</p>
            </div>

            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${[
                    { icon: '⚡', title: 'Lightning Fast', desc: 'Experience blazing fast performance that keeps you ahead of the competition.' },
                    { icon: '🔒', title: 'Bank-Level Security', desc: 'Your data is protected with enterprise-grade encryption and security measures.' },
                    { icon: '🎯', title: 'Precision Analytics', desc: 'Make data-driven decisions with real-time insights and comprehensive reports.' },
                    { icon: '🚀', title: 'Scalable Growth', desc: 'Built to grow with you from startup to enterprise without missing a beat.' },
                    { icon: '🤖', title: 'AI-Powered', desc: 'Leverage cutting-edge AI to automate tasks and unlock new possibilities.' },
                    { icon: '🌍', title: 'Global Ready', desc: 'Reach customers worldwide with multi-language and multi-currency support.' },
                ].map((f, i) => `
                    <div class="glass p-8 rounded-3xl hover:border-white/20 transition-all group scroll-reveal" style="animation-delay: ${i * 0.1}s">
                        <div class="w-14 h-14 gradient-bg rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">${f.icon}</div>
                        <h3 class="text-xl font-bold mb-3">${f.title}</h3>
                        <p class="text-white/50 leading-relaxed">${f.desc}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Benefits / Stats Section -->
    <section id="benefits" class="py-32 relative">
        <div class="absolute inset-0 gradient-bg opacity-5"></div>
        <div class="container mx-auto px-6">
            <div class="grid lg:grid-cols-2 gap-16 items-center">
                <div class="scroll-reveal">
                    <span class="text-sm font-semibold gradient-text uppercase tracking-wider">Why Choose Us</span>
                    <h2 class="text-4xl md:text-5xl font-black mt-4 mb-6">Results that speak for themselves</h2>
                    <p class="text-white/50 mb-8 leading-relaxed">${brand.uniqueValue || 'We\'re committed to delivering exceptional results that transform your business and exceed your expectations.'}</p>

                    <div class="grid grid-cols-2 gap-6">
                        ${[
                            { num: '10K+', label: 'Happy Customers' },
                            { num: '99.9%', label: 'Uptime Guarantee' },
                            { num: '50M+', label: 'Tasks Completed' },
                            { num: '24/7', label: 'Expert Support' },
                        ].map(s => `
                            <div class="glass p-6 rounded-2xl">
                                <div class="text-3xl font-black gradient-text">${s.num}</div>
                                <div class="text-sm text-white/50 mt-1">${s.label}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="relative scroll-reveal">
                    <div class="glass rounded-3xl p-8 glow">
                        <div class="aspect-video bg-gradient-to-br from-white/5 to-transparent rounded-2xl flex items-center justify-center">
                            <button class="w-20 h-20 gradient-bg rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                                <svg class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="absolute -bottom-6 -right-6 w-32 h-32 gradient-bg rounded-3xl blur-2xl opacity-30"></div>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials -->
    <section id="testimonials" class="py-32">
        <div class="container mx-auto px-6">
            <div class="text-center mb-20 scroll-reveal">
                <span class="text-sm font-semibold gradient-text uppercase tracking-wider">Testimonials</span>
                <h2 class="text-4xl md:text-5xl font-black mt-4">Loved by thousands</h2>
            </div>

            <div class="grid md:grid-cols-3 gap-6">
                ${[
                    { name: 'Sarah Johnson', role: 'CEO, TechStart', quote: 'This has completely transformed how we do business. The results have been phenomenal.' },
                    { name: 'Michael Chen', role: 'Founder, GrowthLab', quote: 'The best investment we\'ve made. Our productivity has increased by 300% since switching.' },
                    { name: 'Emily Davis', role: 'Marketing Director', quote: 'Intuitive, powerful, and the support team is incredible. Highly recommend!' },
                ].map((t, i) => `
                    <div class="glass p-8 rounded-3xl scroll-reveal" style="animation-delay: ${i * 0.1}s">
                        <div class="flex items-center gap-1 mb-4">
                            ${[1,2,3,4,5].map(() => `<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`).join('')}
                        </div>
                        <p class="text-white/70 mb-6 leading-relaxed">"${t.quote}"</p>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 gradient-bg rounded-full"></div>
                            <div>
                                <div class="font-semibold">${t.name}</div>
                                <div class="text-sm text-white/50">${t.role}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section id="contact" class="py-32">
        <div class="container mx-auto px-6">
            <div class="glass rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden scroll-reveal">
                <div class="absolute inset-0 gradient-bg opacity-10"></div>
                <div class="relative">
                    <h2 class="text-4xl md:text-6xl font-black mb-6">Ready to get started?</h2>
                    <p class="text-white/50 max-w-xl mx-auto mb-10 text-lg">Join thousands of satisfied customers and take your ${isForBusiness ? 'business' : 'project'} to the next level.</p>

                    <form class="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                        <input type="email" placeholder="Enter your email" class="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 outline-none transition-colors text-center sm:text-left" />
                        <button type="submit" class="gradient-bg px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform glow whitespace-nowrap">
                            Get Started Free
                        </button>
                    </form>

                    <p class="text-sm text-white/30 mt-6">No credit card required • Free 14-day trial</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="py-16 border-t border-white/10">
        <div class="container mx-auto px-6">
            <div class="grid md:grid-cols-4 gap-12 mb-12">
                <div>
                    <div class="flex items-center gap-3 mb-4">
                        ${brand.logo ? `<img src="${brand.logo}" alt="${brand.name}" class="h-8 w-8 rounded-lg">` : `<div class="h-10 w-10 gradient-bg rounded-xl flex items-center justify-center font-black">${brand.name.charAt(0)}</div>`}
                        <span class="text-xl font-bold">${brand.name}</span>
                    </div>
                    <p class="text-white/50 text-sm">${brand.tagline || 'Building the future, one step at a time.'}</p>
                </div>
                ${[
                    { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Changelog'] },
                    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
                    { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
                ].map(col => `
                    <div>
                        <h4 class="font-semibold mb-4">${col.title}</h4>
                        <ul class="space-y-2">
                            ${col.links.map(link => `<li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">${link}</a></li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
            <div class="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10">
                <p class="text-white/30 text-sm">© ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
                <div class="flex gap-4 mt-4 md:mt-0">
                    ${['twitter', 'linkedin', 'github'].map(() => `
                        <a href="#" class="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                            <svg class="w-5 h-5 text-white/50" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>
                        </a>
                    `).join('')}
                </div>
            </div>
        </div>
    </footer>

    <!-- Scroll Reveal Script -->
    <script>
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
    </script>
</body>
</html>`;
    };


    // Publish website to subdomain
    const publishWebsite = async () => {
        if (!generatedHtml) return;

        setIsGenerating(true);
        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('os_loc_id') || 'default';

            // Generate a unique subdomain name
            const subdomain = customDomain ||
                (siteName ? siteName.toLowerCase().replace(/[^a-z0-9]/g, '-') : '') ||
                `my-site-${Date.now()}`;

            const response = await fetch(`${API_BASE}/api/studio/publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    html: generatedHtml,
                    subdomain: subdomain,
                    name: siteName || brandContext.name + ' Site',
                    type: siteType,
                    locationId,
                    brandContext: {
                        name: brandContext.name,
                        primaryColor: brandContext.colors.primary
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const url = data.url || `https://${subdomain}.liv8sites.com`;
                setPublishedUrl(url);
                alert(`Site published! URL: ${url}`);

                // Add to assets
                setAssets(prev => [{
                    id: Date.now().toString(),
                    type: 'website',
                    name: siteName || 'Published Site',
                    url: url,
                    thumbnail: undefined,
                    createdAt: new Date(),
                    prompt: sitePrompt,
                    status: 'complete'
                }, ...prev]);
            } else {
                // API not available - offer download instead
                alert('Hosting service not configured. Click "Export" to download your website HTML.');
                setPublishedUrl('');
            }
        } catch (error) {
            console.error('Publish error:', error);
            // API error - offer download instead
            alert('Could not publish site. Click "Export" to download your website HTML and host it manually.');
            setPublishedUrl('');
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
                                    <a href={img} download className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                                        <Download className="h-4 w-4 text-white" />
                                    </a>
                                    <button onClick={() => openCrossPost(img)} className="p-2 bg-purple-500/80 rounded-lg hover:bg-purple-500" title="Post to Social Media">
                                        <Share2 className="h-4 w-4 text-white" />
                                    </button>
                                    <button onClick={() => navigator.clipboard.writeText(img)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
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

                    {/* Undo Button */}
                    {siteEditHistory.length > 0 && (
                        <button
                            onClick={undoLastEdit}
                            className="p-2 hover:bg-[var(--os-bg)] rounded-lg text-[var(--os-text-muted)] hover:text-neuro"
                            title="Undo last change"
                        >
                            <Undo2 className="h-4 w-4" />
                        </button>
                    )}

                    {/* Analyze Existing Site Button */}
                    <button
                        onClick={() => setShowAnalyzer(true)}
                        className="px-3 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-xs font-bold flex items-center gap-2 hover:border-amber-500 hover:text-amber-500 transition-all"
                    >
                        <Search className="h-3.5 w-3.5" />
                        Analyze Site
                    </button>

                    {/* Improve Button */}
                    {generatedHtml && (
                        <button
                            onClick={() => { generateWebsite(true); }}
                            disabled={isGenerating}
                            className="px-3 py-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg text-xs font-bold flex items-center gap-2 hover:border-neuro hover:text-neuro transition-all"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Improve
                        </button>
                    )}

                    {/* Settings Button */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 hover:bg-[var(--os-bg)] rounded-lg text-[var(--os-text-muted)] hover:text-neuro"
                    >
                        <Settings className="h-4 w-4" />
                    </button>

                    {/* Publish Button */}
                    <button
                        onClick={publishWebsite}
                        disabled={!generatedHtml || isGenerating}
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
                            onClick={() => generateWebsite()}
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

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-lg bg-[var(--os-surface)] rounded-2xl border border-[var(--os-border)] shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings className="h-5 w-5 text-neuro" />
                                <h3 className="font-bold text-lg">Site Settings</h3>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Site Name */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                    Site Name
                                </label>
                                <input
                                    type="text"
                                    value={siteName}
                                    onChange={(e) => setSiteName(e.target.value)}
                                    placeholder="my-awesome-site"
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                />
                            </div>

                            {/* Custom Domain */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                    Custom Subdomain
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="your-brand"
                                        className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-l-xl px-4 py-3 text-sm focus:border-neuro outline-none"
                                    />
                                    <span className="bg-[var(--os-bg)] border border-l-0 border-[var(--os-border)] rounded-r-xl px-4 py-3 text-sm text-[var(--os-text-muted)]">
                                        .liv8sites.com
                                    </span>
                                </div>
                                <p className="text-[10px] text-[var(--os-text-muted)] mt-2">
                                    Your site will be published to: {customDomain || siteName || 'your-brand'}.liv8sites.com
                                </p>
                            </div>

                            {/* Brand Context Preview */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                    Brand Context (from Brand Hub)
                                </label>
                                <div className="bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[var(--os-text-muted)]">Business Name</span>
                                        <span className="font-bold">{brandContext.name}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[var(--os-text-muted)]">Industry</span>
                                        <span className="font-bold capitalize">{brandContext.industry}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[var(--os-text-muted)]">Brand Voice</span>
                                        <span className="font-bold capitalize">{brandContext.voice}</span>
                                    </div>
                                    <div className="flex justify-between text-xs items-center">
                                        <span className="text-[var(--os-text-muted)]">Brand Colors</span>
                                        <div className="flex gap-1">
                                            <div className="w-5 h-5 rounded" style={{ backgroundColor: brandContext.colors.primary }}></div>
                                            <div className="w-5 h-5 rounded" style={{ backgroundColor: brandContext.colors.secondary }}></div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-[var(--os-text-muted)] mt-2">
                                    Update your brand info in Brand Hub to customize generated sites
                                </p>
                            </div>

                            {/* Published URL */}
                            {publishedUrl && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 block">
                                        Published URL
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={publishedUrl}
                                            readOnly
                                            className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-500"
                                        />
                                        <button
                                            onClick={() => window.open(publishedUrl, '_blank')}
                                            className="p-3 bg-emerald-500 text-white rounded-xl hover:scale-105 transition-all"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="flex-1 py-3 border border-[var(--os-border)] rounded-xl font-bold text-sm hover:border-neuro transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSettings(false);
                                    }}
                                    className="flex-1 py-3 bg-neuro text-white rounded-xl font-bold text-sm hover:scale-[1.02] transition-all"
                                >
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Website Analyzer Modal */}
            {showAnalyzer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-2xl bg-[var(--os-surface)] rounded-2xl border border-[var(--os-border)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-[var(--os-border)] flex items-center justify-between sticky top-0 bg-[var(--os-surface)] z-10">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                                    <Search className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Website Analyzer</h3>
                                    <p className="text-xs text-[var(--os-text-muted)]">Analyze any website and create an improved version</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowAnalyzer(false); setAnalysisResult(null); setAnalysisError(''); }} className="p-2 hover:bg-[var(--os-bg)] rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* URL Input */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                    Website URL
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={analyzeUrl}
                                        onChange={(e) => setAnalyzeUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none"
                                    />
                                    <button
                                        onClick={() => analyzeWebsite(false)}
                                        disabled={!analyzeUrl.trim() || isAnalyzing}
                                        className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        {isAnalyzing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Search className="h-4 w-4" />
                                        )}
                                        Analyze
                                    </button>
                                </div>
                                <p className="text-[10px] text-[var(--os-text-muted)] mt-2">
                                    Limited to 10 analyses per day to prevent API overuse
                                </p>
                            </div>

                            {/* Error Display */}
                            {analysisError && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                                    <div>
                                        <p className="font-bold text-red-500 text-sm">Analysis Failed</p>
                                        <p className="text-xs text-red-400 mt-1">{analysisError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Analysis Results */}
                            {analysisResult && (
                                <div className="space-y-4">
                                    {/* Header */}
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="font-bold text-emerald-500 text-sm">Analysis Complete</p>
                                            <p className="text-xs text-emerald-400 mt-1">{analysisResult.title || 'Website analyzed successfully'}</p>
                                        </div>
                                    </div>

                                    {/* Site Info */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                            Site Information
                                        </label>
                                        <div className="bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-[var(--os-text-muted)]">Title</span>
                                                <span className="font-bold truncate max-w-[60%]">{analysisResult.title || 'N/A'}</span>
                                            </div>
                                            {analysisResult.description && (
                                                <div className="text-xs">
                                                    <span className="text-[var(--os-text-muted)]">Description:</span>
                                                    <p className="mt-1 text-[var(--os-text)] line-clamp-2">{analysisResult.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Detected Colors */}
                                    {analysisResult.colors && analysisResult.colors.length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                                Detected Colors
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {analysisResult.colors.slice(0, 8).map((color: string, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="w-10 h-10 rounded-lg border border-[var(--os-border)] flex items-center justify-center text-[8px] font-mono"
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Improvements */}
                                    {analysisResult.improvements && analysisResult.improvements.length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--os-text-muted)] mb-2 block">
                                                Suggested Improvements
                                            </label>
                                            <div className="bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl p-4 space-y-2">
                                                {analysisResult.improvements.slice(0, 5).map((imp: string, i: number) => (
                                                    <div key={i} className="flex items-start gap-2 text-xs">
                                                        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                        <span>{imp}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-4 border-t border-[var(--os-border)]">
                                        <button
                                            onClick={generateImprovedFromAnalysis}
                                            disabled={isGenerating}
                                            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isGenerating ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowRightLeft className="h-4 w-4" />
                                            )}
                                            Generate Improved Version
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-center text-[var(--os-text-muted)]">
                                        Creates a brand-new LIV8-optimized version based on the analyzed content
                                    </p>
                                </div>
                            )}

                            {/* Quick Migrate Option */}
                            {!analysisResult && !isAnalyzing && analyzeUrl.trim() && (
                                <div className="pt-4 border-t border-[var(--os-border)]">
                                    <button
                                        onClick={() => analyzeWebsite(true)}
                                        className="w-full py-3 border border-amber-500/30 bg-amber-500/5 text-amber-500 rounded-xl font-bold text-sm hover:bg-amber-500/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Wand2 className="h-4 w-4" />
                                        Auto-Analyze & Generate Improved Version
                                    </button>
                                    <p className="text-[10px] text-center text-[var(--os-text-muted)] mt-2">
                                        One-click: Analyze the site and automatically generate a better version
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Late Cross-Post Modal */}
            {showCrossPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="os-card p-8 w-full max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase italic">
                                Share to <span className="text-purple-500">Social</span>
                            </h3>
                            <button
                                onClick={() => setShowCrossPost(false)}
                                className="p-2 text-[var(--os-text-muted)] hover:text-neuro"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Image Preview */}
                        {crossPostImage && (
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--os-border)]">
                                <img src={crossPostImage} alt="Post preview" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {/* Content */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Post Content</label>
                            <textarea
                                value={crossPostContent}
                                onChange={(e) => setCrossPostContent(e.target.value)}
                                rows={3}
                                className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-purple-500 resize-none"
                                placeholder="What do you want to share?"
                            />
                        </div>

                        {/* Platform Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Select Platforms</label>
                            <div className="grid grid-cols-4 gap-2">
                                {LATE_PLATFORMS.map((platform) => (
                                    <button
                                        key={platform.id}
                                        onClick={() => togglePlatform(platform.id)}
                                        className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                                            selectedPlatforms.includes(platform.id)
                                                ? 'bg-purple-500/10 border-purple-500 text-purple-500'
                                                : 'bg-[var(--os-bg)] border-[var(--os-border)] text-[var(--os-text-muted)]'
                                        }`}
                                    >
                                        <div className={`h-3 w-3 rounded-full ${platform.color}`} />
                                        <span className="text-[8px] font-black uppercase">{platform.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {crossPostError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold">
                                {crossPostError}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setShowCrossPost(false)}
                                className="flex-1 h-12 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCrossPost}
                                disabled={isCrossPosting || selectedPlatforms.length === 0}
                                className="flex-1 h-12 bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 disabled:opacity-50 hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
                            >
                                {isCrossPosting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Share2 className="h-4 w-4" />
                                )}
                                Post to {selectedPlatforms.length || 'Selected'}
                            </button>
                        </div>

                        <p className="text-[9px] text-center text-[var(--os-text-muted)]">
                            Powered by Late - Post to 13 social platforms with one click.
                            Configure your Late API key in Settings.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Studio;
