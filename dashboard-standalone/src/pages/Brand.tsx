import { useState, useEffect, useRef } from 'react';
import {
    Palette,
    Image as ImageIcon,
    FileText,
    Plus,
    Calendar,
    Zap,
    MoreVertical,
    Search,
    Brain,
    Rocket,
    Instagram,
    Linkedin,
    Facebook,
    Eye,
    Sparkles,
    Share2,
    Upload,
    Trash2,
    Download,
    RefreshCw,
    BookOpen,
    MessageSquare,
    Target,
    CheckCircle2,
    X,
    Save,
    Edit3,
    Link2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getBackendUrl } from '../services/api';
import LateSettingsManager from '../components/LateSettingsManager';

interface BrandAsset {
    id: string;
    name: string;
    type: string;
    url?: string;
    size: string;
    date: string;
    category: 'logo' | 'image' | 'document' | 'template';
}

interface KnowledgeEntry {
    id: string;
    type: 'sop' | 'faq' | 'product' | 'constraint';
    title: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

interface ScheduledPost {
    id: string;
    channel: string;
    title: string;
    content: string;
    mediaUrl?: string;
    scheduledAt: string;
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    agent: string;
}

const Brand = () => {
    const { config, updateConfig } = useTheme();
    const [activeTab, setActiveTab] = useState<'library' | 'planner' | 'voice' | 'knowledge' | 'social'>('library');
    const [previewChannel, setPreviewChannel] = useState<'ig' | 'li' | 'fb'>('ig');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const API_BASE = getBackendUrl();

    // Brand Colors State
    const [brandColors, setBrandColors] = useState({
        primary: config.primaryColor || '#6366F1',
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#FAFAFA'
    });

    // Assets State
    const [assets, setAssets] = useState<BrandAsset[]>([
        { id: '1', name: 'Primary Logo', type: 'image/png', date: 'Jan 24, 2026', size: '1.2 MB', category: 'logo' },
        { id: '2', name: 'Brand Voice Blueprint', type: 'doc/pdf', date: 'Jan 25, 2026', size: '480 KB', category: 'document' },
        { id: '3', name: 'Social Post Template', type: 'image/figma', date: 'Jan 26, 2026', size: '12.4 MB', category: 'template' },
    ]);
    const [isUploading, setIsUploading] = useState(false);

    // Knowledge Base State
    const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
    const [showAddKnowledge, setShowAddKnowledge] = useState(false);
    const [newKnowledge, setNewKnowledge] = useState({
        type: 'sop' as KnowledgeEntry['type'],
        title: '',
        content: '',
        tags: ''
    });

    // Social Planner State
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [newPost, setNewPost] = useState({
        channel: 'Instagram',
        title: '',
        content: '',
        scheduledAt: ''
    });

    // Voice Tuning States
    const [tone, setTone] = useState({
        professional: 85,
        empathetic: 40,
        direct: 92,
        friendly: 15
    });
    const [voiceSaved, setVoiceSaved] = useState(false);

    // Fetch knowledge base
    const fetchKnowledge = async () => {
        try {
            const token = localStorage.getItem('os_token');
            const clientId = localStorage.getItem('os_client_id') || 'default';
            const response = await fetch(`${API_BASE}/api/brand/knowledge?clientId=${clientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setKnowledge(data.entries || []);
            }
        } catch (error) {
            console.error('Failed to fetch knowledge:', error);
            // Demo data
            setKnowledge([
                { id: 'k1', type: 'sop', title: 'Lead Response Protocol', content: 'Respond to all new leads within 5 minutes...', tags: ['sales', 'response'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                { id: 'k2', type: 'faq', title: 'Pricing Questions', content: 'When asked about pricing, always emphasize value first...', tags: ['sales', 'pricing'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                { id: 'k3', type: 'product', title: 'Core Service Package', content: 'Our main offering includes...', tags: ['product', 'services'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            ]);
        }
    };

    // Fetch GHL social posts
    const fetchSocialPosts = async () => {
        setIsLoadingPosts(true);
        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('locationId') || localStorage.getItem('os_loc_id');
            const response = await fetch(`${API_BASE}/api/ghl/social/posts?locationId=${locationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setScheduledPosts(data.posts || []);
            }
        } catch (error) {
            console.error('Failed to fetch social posts:', error);
            // Demo posts
            setScheduledPosts([
                { id: 'p1', channel: 'Instagram', title: 'Neural Agency Alpha', content: 'Automate your entire agency...', scheduledAt: '2026-01-28T10:00:00', status: 'scheduled', agent: 'Content Strategist' },
                { id: 'p2', channel: 'LinkedIn', title: 'Why LIV8 OS Dominates', content: 'The future of agency automation...', scheduledAt: '2026-01-29T14:30:00', status: 'draft', agent: 'Content Strategist' },
            ]);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    useEffect(() => {
        fetchKnowledge();
        if (activeTab === 'planner') {
            fetchSocialPosts();
        }
    }, [activeTab]);

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const file = files[0];

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('clientId', localStorage.getItem('os_client_id') || 'default');

            const token = localStorage.getItem('os_token');
            const response = await fetch(`${API_BASE}/api/brand/assets/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setAssets([...assets, data.asset]);
            } else {
                // Add locally for demo
                const newAsset: BrandAsset = {
                    id: `asset_${Date.now()}`,
                    name: file.name,
                    type: file.type || 'file',
                    size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    category: file.type.startsWith('image/') ? 'image' : 'document'
                };
                setAssets([...assets, newAsset]);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            // Add locally anyway
            const newAsset: BrandAsset = {
                id: `asset_${Date.now()}`,
                name: file.name,
                type: file.type || 'file',
                size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                category: file.type.startsWith('image/') ? 'image' : 'document'
            };
            setAssets([...assets, newAsset]);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Save brand colors
    const saveBrandColors = () => {
        updateConfig({ ...config, primaryColor: brandColors.primary });
        // Apply to CSS variables
        document.documentElement.style.setProperty('--os-primary', brandColors.primary);
    };

    // Add knowledge entry
    const addKnowledge = async () => {
        try {
            const token = localStorage.getItem('os_token');
            const clientId = localStorage.getItem('os_client_id') || 'default';

            const entry: KnowledgeEntry = {
                id: `k_${Date.now()}`,
                type: newKnowledge.type,
                title: newKnowledge.title,
                content: newKnowledge.content,
                tags: newKnowledge.tags.split(',').map(t => t.trim()).filter(Boolean),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const response = await fetch(`${API_BASE}/api/brand/knowledge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clientId, entry })
            });

            if (response.ok) {
                const data = await response.json();
                setKnowledge([...knowledge, data.entry || entry]);
            } else {
                setKnowledge([...knowledge, entry]);
            }

            setShowAddKnowledge(false);
            setNewKnowledge({ type: 'sop', title: '', content: '', tags: '' });
        } catch (error) {
            console.error('Failed to add knowledge:', error);
        }
    };

    // Delete knowledge entry
    const deleteKnowledge = (id: string) => {
        setKnowledge(knowledge.filter(k => k.id !== id));
    };

    // Create social post
    const createPost = async () => {
        try {
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('locationId') || localStorage.getItem('os_loc_id');

            const post: ScheduledPost = {
                id: `post_${Date.now()}`,
                channel: newPost.channel,
                title: newPost.title,
                content: newPost.content,
                scheduledAt: newPost.scheduledAt,
                status: 'scheduled',
                agent: 'Content Strategist'
            };

            const response = await fetch(`${API_BASE}/api/ghl/social/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ locationId, post })
            });

            if (response.ok) {
                fetchSocialPosts();
            } else {
                setScheduledPosts([...scheduledPosts, post]);
            }

            setShowCreatePost(false);
            setNewPost({ channel: 'Instagram', title: '', content: '', scheduledAt: '' });
        } catch (error) {
            console.error('Failed to create post:', error);
        }
    };

    // Sync to GHL Social Planner
    const [isSyncing, setIsSyncing] = useState<'ghl' | 'vbout' | null>(null);

    const syncToGHL = async () => {
        try {
            setIsSyncing('ghl');
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('locationId') || localStorage.getItem('os_loc_id');

            await fetch(`${API_BASE}/api/ghl/social/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ locationId, assets, brandColors, posts: scheduledPosts })
            });

            // Show success notification
            setSyncMessage('Successfully synced to GHL Social Planner!');
            setTimeout(() => setSyncMessage(null), 3000);
        } catch (error) {
            console.error('GHL Sync failed:', error);
            setSyncMessage('Sync failed. Please try again.');
            setTimeout(() => setSyncMessage(null), 3000);
        } finally {
            setIsSyncing(null);
        }
    };

    // Sync to VBout
    const syncToVBout = async () => {
        try {
            setIsSyncing('vbout');
            const token = localStorage.getItem('os_token');
            const locationId = localStorage.getItem('locationId') || localStorage.getItem('os_loc_id');

            await fetch(`${API_BASE}/api/vbout/social/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ locationId, assets, brandColors, posts: scheduledPosts })
            });

            setSyncMessage('Successfully synced to VBout!');
            setTimeout(() => setSyncMessage(null), 3000);
        } catch (error) {
            console.error('VBout Sync failed:', error);
            setSyncMessage('Sync failed. Please try again.');
            setTimeout(() => setSyncMessage(null), 3000);
        } finally {
            setIsSyncing(null);
        }
    };

    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    // Save voice settings
    const saveVoiceSettings = async () => {
        try {
            const token = localStorage.getItem('os_token');
            const clientId = localStorage.getItem('os_client_id') || 'default';

            await fetch(`${API_BASE}/api/brand/voice`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clientId, tone })
            });

            setVoiceSaved(true);
            setTimeout(() => setVoiceSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save voice settings:', error);
            setVoiceSaved(true);
            setTimeout(() => setVoiceSaved(false), 2000);
        }
    };

    const getKnowledgeTypeIcon = (type: string) => {
        switch (type) {
            case 'sop': return <BookOpen className="h-4 w-4" />;
            case 'faq': return <MessageSquare className="h-4 w-4" />;
            case 'product': return <Target className="h-4 w-4" />;
            case 'constraint': return <Zap className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-x-hidden custom-scrollbar overflow-y-auto transition-colors duration-500">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.svg"
            />

            <div className="p-10 space-y-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">
                <header className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black text-neuro uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <Palette className="h-3 w-3" /> Brand Orchestration
                        </p>
                        <h1 className="text-5xl font-black text-[var(--os-text)] tracking-tighter leading-none uppercase italic">
                            Brand <span className="text-neuro">Identity</span>
                        </h1>
                    </div>
                    <div className="flex bg-[var(--os-surface)] p-1.5 rounded-2xl border border-[var(--os-border)]">
                        {['library', 'planner', 'knowledge', 'voice', 'social'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-neuro text-white shadow-lg shadow-neuro/20' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                            >
                                {tab === 'library' ? 'Assets' : tab === 'planner' ? 'Social Planner' : tab === 'knowledge' ? 'Knowledge' : tab === 'voice' ? 'Voice' : 'Late Social'}
                            </button>
                        ))}
                    </div>
                </header>

                {activeTab === 'library' && (
                    <div className="flex-1 space-y-10 animate-in fade-in zoom-in-95 duration-500">
                        {/* Brand Colors */}
                        <div className="os-card p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                        <Palette className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase italic">Brand Colors</h3>
                                        <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-0.5">Define your visual identity</p>
                                    </div>
                                </div>
                                <button
                                    onClick={saveBrandColors}
                                    className="px-6 py-2.5 bg-neuro text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <Save className="h-3 w-3" /> Apply Colors
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {Object.entries(brandColors).map(([key, value]) => (
                                    <div key={key} className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--os-text-muted)]">{key}</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={value}
                                                onChange={(e) => setBrandColors({ ...brandColors, [key]: e.target.value })}
                                                className="h-12 w-16 rounded-xl cursor-pointer border border-[var(--os-border)]"
                                            />
                                            <input
                                                type="text"
                                                value={value}
                                                onChange={(e) => setBrandColors({ ...brandColors, [key]: e.target.value })}
                                                className="flex-1 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-neuro"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="os-card p-8 space-y-6 bg-neuro text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer" onClick={() => setActiveTab('voice')}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] group-hover:bg-white/20 transition-all"></div>
                                <Brain className="h-8 w-8 text-white/80" />
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">Voice Protocol</h3>
                                    <p className="text-[10px] font-bold text-white/60 mt-2 uppercase tracking-widest">Active Intelligence Persona</p>
                                </div>
                                <button className="h-10 px-6 bg-white/20 hover:bg-white/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/10">Tune Neural Core</button>
                            </div>
                            <div className="os-card p-8 space-y-6 hover:border-neuro/30 transition-all">
                                <ImageIcon className="h-8 w-8 text-neuro" />
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">Master Logo</h3>
                                    <p className="text-[10px] font-bold text-[var(--os-text-muted)] mt-2 uppercase tracking-widest">High-fidelity SVG Source</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {Object.values(brandColors).slice(0, 3).map((c, i) => (
                                        <div key={i} className="h-8 w-8 rounded-lg border border-[var(--os-border)] shadow-sm" style={{ backgroundColor: c }}></div>
                                    ))}
                                    <span className="text-[8px] font-black text-[var(--os-text-muted)] uppercase ml-2 italic">Neural Palette Extracted</span>
                                </div>
                            </div>
                            <div className="os-card p-8 space-y-6 hover:border-neuro/30 transition-all">
                                <Share2 className="h-8 w-8 text-neuro" />
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">Social Assets</h3>
                                    <p className="text-[10px] font-bold text-[var(--os-text-muted)] mt-2 uppercase tracking-widest">Banner & Avatar Stack</p>
                                </div>
                                <button
                                    onClick={syncToGHL}
                                    className="h-10 px-6 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-neuro hover:border-neuro/30 transition-all flex items-center gap-2"
                                >
                                    <Link2 className="h-3 w-3" /> Sync To GHL
                                </button>
                            </div>
                        </div>

                        {/* File Explorer */}
                        <div className="os-card flex flex-col p-8 space-y-8 min-h-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-lg font-black uppercase italic">Neural Vault</h3>
                                </div>
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                                        <input type="text" placeholder="Search assets..." className="bg-[var(--os-bg)] border border-[var(--os-border)] rounded-2xl pl-12 pr-6 py-2.5 text-[10px] font-bold outline-none focus:border-neuro transition-all" />
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="h-10 px-6 bg-neuro text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-neuro/10 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                        {isUploading ? 'Uploading...' : 'Upload Asset'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {assets.map(asset => (
                                    <div key={asset.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-[var(--os-surface)] transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className="h-12 w-12 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl flex items-center justify-center text-neuro group-hover:scale-110 transition-transform">
                                                <ImageIcon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-tight">{asset.name}</h4>
                                                <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-0.5">{asset.type} • {asset.size}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-[var(--os-text-muted)] uppercase tracking-widest">{asset.date}</span>
                                            <button className="p-2 text-[var(--os-text-muted)] hover:text-neuro opacity-0 group-hover:opacity-100 transition-all">
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setAssets(assets.filter(a => a.id !== asset.id))}
                                                className="p-2 text-[var(--os-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'planner' && (
                    <div className="flex-1 min-h-0 flex gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Scheduler Left */}
                        <div className="w-1/2 space-y-8 flex flex-col">
                            <div className="os-card p-8 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute bottom-0 right-0 w-64 h-full bg-neuro/10 blur-[60px]"></div>
                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Rocket className="h-6 w-6 text-neuro" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neuro">Neural Deployment</span>
                                    </div>
                                    <h3 className="text-3xl font-black uppercase italic leading-none">Strategic <span className="text-neuro">Push</span></h3>
                                    <p className="text-xs font-bold text-slate-400 max-w-sm">Assign high-conversion social orchestration to your AI Content Strategist.</p>
                                    <button
                                        onClick={() => setShowCreatePost(true)}
                                        className="w-full h-14 bg-neuro text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-neuro/30 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                                    >
                                        <Plus className="h-4 w-4" /> Create Social Task
                                    </button>
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={syncToGHL}
                                            disabled={isSyncing === 'ghl'}
                                            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            {isSyncing === 'ghl' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                                            Sync to GHL
                                        </button>
                                        <button
                                            onClick={syncToVBout}
                                            disabled={isSyncing === 'vbout'}
                                            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            {isSyncing === 'vbout' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                                            Sync to VBout
                                        </button>
                                    </div>
                                    {syncMessage && (
                                        <div className={`text-xs font-bold text-center py-2 ${syncMessage.includes('failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {syncMessage}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="os-card p-8 space-y-8 flex-1 overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-black uppercase italic">Deployment Queue</h3>
                                    </div>
                                    <button
                                        onClick={fetchSocialPosts}
                                        className="p-2 text-[var(--os-text-muted)] hover:text-neuro transition-colors"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isLoadingPosts ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                    {scheduledPosts.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Calendar className="h-12 w-12 text-[var(--os-text-muted)] mx-auto mb-4 opacity-50" />
                                            <p className="text-sm font-bold text-[var(--os-text-muted)]">No scheduled posts yet</p>
                                        </div>
                                    ) : (
                                        scheduledPosts.map(post => (
                                            <div key={post.id} className="p-6 rounded-[2rem] bg-[var(--os-surface)] border border-[var(--os-border)] flex items-center justify-between group hover:border-neuro/30 transition-all">
                                                <div className="flex items-center gap-6">
                                                    <div className="h-10 w-10 rounded-xl bg-[var(--os-bg)] flex items-center justify-center text-neuro shadow-sm">
                                                        {post.channel === 'Instagram' ? <Instagram className="h-5 w-5" /> :
                                                         post.channel === 'LinkedIn' ? <Linkedin className="h-5 w-5" /> :
                                                         <Facebook className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[11px] font-black uppercase italic">{post.title}</h4>
                                                        <p className="text-[8px] font-black text-[var(--os-text-muted)] uppercase mt-1 italic">
                                                            {post.channel} • {new Date(post.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                    post.status === 'scheduled' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    post.status === 'draft' ? 'bg-amber-500/10 text-amber-500' :
                                                    post.status === 'published' ? 'bg-neuro/10 text-neuro' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                    {post.status}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Preview Right */}
                        <div className="flex-1 os-card p-8 flex flex-col space-y-8 bg-[var(--os-surface)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Eye className="h-5 w-5 text-neuro" />
                                    <h3 className="text-lg font-black uppercase italic">Neural <span className="text-neuro">Preview</span></h3>
                                </div>
                                <div className="flex bg-[var(--os-bg)] p-1 rounded-xl border border-[var(--os-border)]">
                                    {[
                                        { id: 'ig', icon: Instagram },
                                        { id: 'li', icon: Linkedin },
                                        { id: 'fb', icon: Facebook }
                                    ].map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setPreviewChannel(c.id as any)}
                                            className={`p-2 rounded-lg transition-all ${previewChannel === c.id ? 'bg-neuro text-white shadow-md' : 'text-[var(--os-text-muted)] hover:text-neuro'}`}
                                        >
                                            <c.icon className="h-4 w-4" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center p-12">
                                <div className="w-[360px] bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
                                    <div className="p-4 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: brandColors.primary }}><Sparkles className="h-5 w-5" /></div>
                                        <div className="flex-1">
                                            <div className="text-xs font-black uppercase italic leading-none text-slate-900">LIV8 Agency</div>
                                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sponsored</div>
                                        </div>
                                        <MoreVertical className="h-4 w-4 text-slate-300" />
                                    </div>
                                    <div className="aspect-square bg-slate-100 relative group overflow-hidden">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-10 text-center space-y-6" style={{ background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})` }}>
                                            <Brain className="h-16 w-16 opacity-50 absolute -top-4 -right-4 rotate-12" />
                                            <h4 className="text-4xl font-black uppercase italic leading-none tracking-tighter">Neural <span className="text-white/50 underline">Growth</span></h4>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Phase 17 Optimized Protocol</p>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex gap-4">
                                            <Share2 className="h-5 w-5 text-slate-900" />
                                            <Share2 className="h-5 w-5 text-slate-900 rotate-180" />
                                        </div>
                                        <p className="text-[10px] font-normal text-slate-600 leading-relaxed">
                                            <span className="font-bold mr-2">liv8_agency</span>
                                            Automate your entire agency workflow with the new Neural Core integration. #LIV8OS #AgencyGrowth
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'knowledge' && (
                    <div className="flex-1 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-neuro/10 rounded-2xl flex items-center justify-center text-neuro">
                                    <Brain className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase italic">Knowledge <span className="text-neuro">Base</span></h3>
                                    <p className="text-[9px] font-bold text-[var(--os-text-muted)] uppercase tracking-widest mt-1">Train your AI agents with business knowledge</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddKnowledge(true)}
                                className="h-12 px-6 bg-neuro text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-neuro/20 flex items-center gap-2 hover:scale-105 transition-all"
                            >
                                <Plus className="h-4 w-4" /> Add Knowledge
                            </button>
                        </div>

                        {/* Knowledge Types */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                { type: 'sop', label: 'SOPs', description: 'Standard operating procedures', count: knowledge.filter(k => k.type === 'sop').length },
                                { type: 'faq', label: 'FAQs', description: 'Frequently asked questions', count: knowledge.filter(k => k.type === 'faq').length },
                                { type: 'product', label: 'Products', description: 'Product/service information', count: knowledge.filter(k => k.type === 'product').length },
                                { type: 'constraint', label: 'Constraints', description: 'Rules and limitations', count: knowledge.filter(k => k.type === 'constraint').length },
                            ].map((item) => (
                                <div key={item.type} className="os-card p-6 hover:border-neuro/30 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="h-10 w-10 bg-neuro/10 rounded-xl flex items-center justify-center text-neuro">
                                            {getKnowledgeTypeIcon(item.type)}
                                        </div>
                                        <span className="text-2xl font-black text-neuro">{item.count}</span>
                                    </div>
                                    <h4 className="text-sm font-black uppercase tracking-tight">{item.label}</h4>
                                    <p className="text-[9px] font-bold text-[var(--os-text-muted)] mt-1">{item.description}</p>
                                </div>
                            ))}
                        </div>

                        {/* Knowledge Entries */}
                        <div className="os-card p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-black uppercase italic">Knowledge Entries</h4>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
                                    <input type="text" placeholder="Search knowledge..." className="bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl pl-12 pr-6 py-2 text-[10px] font-bold outline-none focus:border-neuro" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {knowledge.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Brain className="h-12 w-12 text-[var(--os-text-muted)] mx-auto mb-4 opacity-50" />
                                        <p className="text-sm font-bold text-[var(--os-text-muted)]">No knowledge entries yet</p>
                                        <p className="text-[10px] text-[var(--os-text-muted)] mt-1">Add SOPs, FAQs, and product info to train your AI agents</p>
                                    </div>
                                ) : (
                                    knowledge.map((entry) => (
                                        <div key={entry.id} className="p-5 rounded-2xl bg-[var(--os-surface)] border border-[var(--os-border)] hover:border-neuro/30 transition-all group">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                        entry.type === 'sop' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        entry.type === 'faq' ? 'bg-amber-500/10 text-amber-500' :
                                                        entry.type === 'product' ? 'bg-neuro/10 text-neuro' :
                                                        'bg-red-500/10 text-red-500'
                                                    }`}>
                                                        {getKnowledgeTypeIcon(entry.type)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h5 className="text-sm font-black uppercase tracking-tight">{entry.title}</h5>
                                                            <span className="px-2 py-0.5 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-lg text-[8px] font-black uppercase tracking-widest">{entry.type}</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-[var(--os-text-muted)] mt-2 line-clamp-2">{entry.content}</p>
                                                        <div className="flex items-center gap-2 mt-3">
                                                            {entry.tags.map((tag) => (
                                                                <span key={tag} className="px-2 py-0.5 bg-neuro/5 text-neuro rounded-lg text-[8px] font-bold">#{tag}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button className="p-2 text-[var(--os-text-muted)] hover:text-neuro">
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteKnowledge(entry.id)}
                                                        className="p-2 text-[var(--os-text-muted)] hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'voice' && (
                    <div className="flex-1 os-card p-10 flex flex-col space-y-12 animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black uppercase italic leading-none">Neural <span className="text-neuro">Voice Tuner</span></h3>
                                <p className="text-sm text-[var(--os-text-muted)] font-bold italic">Module v4.2: Behavioral Alignment Loop</p>
                            </div>
                            <div className="h-16 w-16 bg-neuro/10 rounded-[2rem] flex items-center justify-center text-neuro animate-pulse">
                                <Brain className="h-8 w-8" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                            <div className="space-y-10">
                                {Object.entries(tone).map(([key, val]) => (
                                    <div key={key} className="space-y-4">
                                        <div className="flex justify-between items-center px-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-neuro italic">{key}</label>
                                            <span className="text-[10px] font-black">{val}%</span>
                                        </div>
                                        <div className="relative h-2 w-full bg-[var(--os-bg)] rounded-full group cursor-pointer border border-[var(--os-border)]">
                                            <div
                                                className="absolute h-full bg-neuro rounded-full shadow-[0_0_15px_rgba(16,104,235,0.4)]"
                                                style={{ width: `${val}%` }}
                                            ></div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={val}
                                                onChange={(e) => setTone({ ...tone, [key]: parseInt(e.target.value) })}
                                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col space-y-8 relative overflow-hidden shadow-2xl shadow-neuro/20">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-neuro/20 blur-[80px]"></div>
                                <div className="flex items-center gap-3 text-neuro">
                                    <Zap className="h-5 w-5" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">Live Simulation</span>
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <p className="text-2xl font-black text-white italic leading-relaxed uppercase">
                                        "Hey there, I'm your <span className="text-neuro underline">LIV8 OS</span>. Deployment of the new Reactivation suite is <span className="text-neuro">92%</span> optimized. Standing by for instructions."
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 pt-8 border-t border-white/10">
                                    <button
                                        onClick={saveVoiceSettings}
                                        className={`flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${
                                            voiceSaved ? 'bg-emerald-500 text-white' : 'bg-neuro text-white shadow-neuro/30 hover:scale-[1.02]'
                                        }`}
                                    >
                                        {voiceSaved ? <><CheckCircle2 className="h-4 w-4" /> Synced!</> : 'Apply Behavioral Sync'}
                                    </button>
                                    <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center text-white cursor-pointer hover:bg-white/10">
                                        <Share2 className="h-6 w-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'social' && (
                    <div className="flex-1 animate-in fade-in zoom-in-95 duration-500">
                        <LateSettingsManager />
                    </div>
                )}
            </div>

            {/* Add Knowledge Modal */}
            {showAddKnowledge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="os-card p-8 w-full max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase italic">Add <span className="text-neuro">Knowledge</span></h3>
                            <button onClick={() => setShowAddKnowledge(false)} className="p-2 text-[var(--os-text-muted)] hover:text-neuro">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Type</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['sop', 'faq', 'product', 'constraint'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setNewKnowledge({ ...newKnowledge, type: type as any })}
                                            className={`p-3 rounded-xl border transition-all ${
                                                newKnowledge.type === type
                                                    ? 'bg-neuro/10 border-neuro text-neuro'
                                                    : 'bg-[var(--os-bg)] border-[var(--os-border)] text-[var(--os-text-muted)]'
                                            }`}
                                        >
                                            <span className="text-[9px] font-black uppercase tracking-widest">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Title</label>
                                <input
                                    value={newKnowledge.title}
                                    onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-neuro"
                                    placeholder="e.g. Lead Response Protocol"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Content</label>
                                <textarea
                                    value={newKnowledge.content}
                                    onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                                    rows={6}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-neuro resize-none"
                                    placeholder="Enter the knowledge content that will train your AI agents..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Tags (comma separated)</label>
                                <input
                                    value={newKnowledge.tags}
                                    onChange={(e) => setNewKnowledge({ ...newKnowledge, tags: e.target.value })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-neuro"
                                    placeholder="e.g. sales, response, leads"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setShowAddKnowledge(false)}
                                className="flex-1 h-12 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addKnowledge}
                                disabled={!newKnowledge.title || !newKnowledge.content}
                                className="flex-1 h-12 bg-neuro text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-neuro/20 disabled:opacity-50 hover:scale-[1.02] transition-all"
                            >
                                Add to Knowledge Base
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Post Modal */}
            {showCreatePost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="os-card p-8 w-full max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase italic">Create <span className="text-neuro">Post</span></h3>
                            <button onClick={() => setShowCreatePost(false)} className="p-2 text-[var(--os-text-muted)] hover:text-neuro">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Channel</label>
                                <div className="flex gap-3">
                                    {['Instagram', 'LinkedIn', 'Facebook'].map((channel) => (
                                        <button
                                            key={channel}
                                            onClick={() => setNewPost({ ...newPost, channel })}
                                            className={`flex-1 p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                                                newPost.channel === channel
                                                    ? 'bg-neuro/10 border-neuro text-neuro'
                                                    : 'bg-[var(--os-bg)] border-[var(--os-border)] text-[var(--os-text-muted)]'
                                            }`}
                                        >
                                            {channel === 'Instagram' ? <Instagram className="h-4 w-4" /> :
                                             channel === 'LinkedIn' ? <Linkedin className="h-4 w-4" /> :
                                             <Facebook className="h-4 w-4" />}
                                            <span className="text-[9px] font-black uppercase">{channel}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Title</label>
                                <input
                                    value={newPost.title}
                                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-neuro"
                                    placeholder="Post title..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Content</label>
                                <textarea
                                    value={newPost.content}
                                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                    rows={4}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-neuro resize-none"
                                    placeholder="What do you want to share?"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[var(--os-text-muted)] tracking-widest">Schedule</label>
                                <input
                                    type="datetime-local"
                                    value={newPost.scheduledAt}
                                    onChange={(e) => setNewPost({ ...newPost, scheduledAt: e.target.value })}
                                    className="w-full bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-neuro"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setShowCreatePost(false)}
                                className="flex-1 h-12 bg-[var(--os-bg)] border border-[var(--os-border)] rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createPost}
                                disabled={!newPost.title || !newPost.content}
                                className="flex-1 h-12 bg-neuro text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-neuro/20 disabled:opacity-50 hover:scale-[1.02] transition-all"
                            >
                                Schedule Post
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Brand;
