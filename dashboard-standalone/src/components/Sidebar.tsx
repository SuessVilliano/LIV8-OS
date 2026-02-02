import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
    Users,
    Settings,
    LayoutDashboard,
    Workflow,
    MessageSquare,
    LogOut,
    Menu,
    ChevronLeft,
    Sparkles,
    LifeBuoy,
    Sun,
    Moon,
    Target,
    BarChart,
    Palette,
    Wand2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { isDark, toggleTheme, config } = useTheme();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
        { icon: Target, label: 'Opportunities', path: '/opportunities' },
        { icon: Users, label: 'Agencies', path: '/agencies' },
        { icon: MessageSquare, label: 'Staff Hub', path: '/staff' },
        { icon: Palette, label: 'Brand Hub', path: '/brand' },
        { icon: Wand2, label: 'Studio', path: '/studio' },
        { icon: Workflow, label: 'Workflows', path: '/workflows' },
        { icon: BarChart, label: 'Analytics', path: '/analytics' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const handleOpenSupport = () => {
        window.open('https://os.liv8ai.com/support', 'LIV8_Support', 'width=450,height=700');
    };

    const handleLogoutClick = () => {
        onLogout();
        navigate('/login', { replace: true });
    };

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-72'} border-r border-[var(--os-border)] bg-[var(--os-glass-bg)] backdrop-blur-xl flex flex-col p-6 space-y-8 transition-all duration-500 ease-in-out relative z-50`}>
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-10 w-6 h-6 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-full flex items-center justify-center text-[var(--os-text-muted)] hover:text-neuro hover:border-neuro transition-all shadow-sm z-[60]"
            >
                {isCollapsed ? <Menu className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            <div className={`flex items-center gap-3 px-2 cursor-pointer transition-all ${isCollapsed ? 'justify-center' : ''}`} onClick={() => navigate('/dashboard')}>
                <div className="h-10 w-10 bg-neuro rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-neuro/20 group hover:scale-110 transition-transform">
                    {config.logoUrl ? <img src={config.logoUrl} className="h-6 w-6 object-contain" /> : <Sparkles className="h-5 w-5 text-white" />}
                </div>
                {!isCollapsed && (
                    <span className="font-black text-2xl tracking-tighter text-[var(--os-text)] uppercase italic">
                        {config?.platformName?.split(' ')[0] || 'LIV8'} <span className="text-neuro">{config?.platformName?.split(' ')[1] || 'OS'}</span>
                    </span>
                )}
            </div>

            <nav className="flex-1 space-y-2 mt-4">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300 relative group ${isActive
                                ? 'bg-neuro text-white shadow-xl shadow-neuro/20 scale-[1.02]'
                                : 'text-[var(--os-text-muted)] hover:bg-[var(--os-surface)] hover:text-neuro hover:shadow-sm'
                                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-[var(--os-text-muted)] group-hover:text-neuro'} transition-colors`} />
                            {!isCollapsed && <span className="tracking-tight">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            <div className="space-y-4 pt-4 border-t border-[var(--os-border)]">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold text-[var(--os-text-muted)] hover:bg-neuro/5 hover:text-neuro transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    {!isCollapsed && <span className="tracking-tight font-black uppercase text-[10px]">{isDark ? 'Light Sync' : 'Midnight OS'}</span>}
                </button>

                <button
                    onClick={handleOpenSupport}
                    className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold text-[var(--os-text-muted)] hover:bg-neuro/5 hover:text-neuro transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <LifeBuoy className="h-5 w-5" />
                    {!isCollapsed && <span className="tracking-tight font-black uppercase text-[10px]">Live Support</span>}
                </button>

                <button
                    onClick={handleLogoutClick}
                    className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold text-[var(--os-text-muted)] hover:bg-red-50 hover:text-red-500 transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <LogOut className="h-5 w-5" />
                    {!isCollapsed && <span className="tracking-tight font-black uppercase text-[10px]">Neural Disconnect</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
