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
    Wand2,
    BookOpen,
    Inbox
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import LocationSwitcher from './LocationSwitcher';

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
        { icon: Inbox, label: 'Inbox', path: '/inbox' },
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
        window.open('https://api.anychat.one/embed/4a4d5890-b444-3906-8f87-1cedb3342c68', 'LIV8_Support', 'width=450,height=700');
    };

    const handleLogoutClick = () => {
        onLogout();
        navigate('/login', { replace: true });
    };

    return (
        <aside className={`${isCollapsed ? 'w-16' : 'w-52'} min-h-screen border-r border-[var(--os-border)] bg-[var(--os-glass-bg)] backdrop-blur-xl flex flex-col p-3 space-y-3 transition-all duration-500 ease-in-out relative z-50 flex-shrink-0`}>
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 w-6 h-6 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-full flex items-center justify-center text-[var(--os-text-muted)] hover:text-neuro hover:border-neuro transition-all shadow-sm z-[60]"
            >
                {isCollapsed ? <Menu className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            {/* Logo */}
            <div className={`flex items-center gap-2 px-2 py-1 cursor-pointer transition-all ${isCollapsed ? 'justify-center' : ''}`} onClick={() => navigate('/dashboard')}>
                <div className="h-9 w-9 bg-neuro rounded-xl flex items-center justify-center shadow-lg shadow-neuro/20 hover:scale-105 transition-transform flex-shrink-0">
                    {config.logoUrl ? <img src={config.logoUrl} className="h-5 w-5 object-contain" /> : <Sparkles className="h-4 w-4 text-white" />}
                </div>
                {!isCollapsed && (
                    <span className="font-black text-lg tracking-tighter text-[var(--os-text)] uppercase italic whitespace-nowrap">
                        {config?.platformName?.split(' ')[0] || 'LIV8'} <span className="text-neuro">{config?.platformName?.split(' ')[1] || 'OS'}</span>
                    </span>
                )}
            </div>

            {/* Location Switcher for Agency Accounts */}
            {!isCollapsed && (
                <div className="border-b border-[var(--os-border)] pb-3">
                    <LocationSwitcher compact={false} />
                </div>
            )}
            {isCollapsed && <LocationSwitcher compact={true} />}

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-300 relative group ${isActive
                                ? 'bg-neuro text-white shadow-lg shadow-neuro/20'
                                : 'text-[var(--os-text-muted)] hover:bg-[var(--os-surface)] hover:text-neuro'
                                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[var(--os-text-muted)] group-hover:text-neuro'} transition-colors`} />
                            {!isCollapsed && <span className="tracking-tight truncate">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="space-y-1 pt-3 border-t border-[var(--os-border)]">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-[var(--os-text-muted)] hover:bg-neuro/5 hover:text-neuro transition-all ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : ''}
                >
                    {isDark ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
                    {!isCollapsed && <span className="tracking-tight font-black uppercase text-[9px]">{isDark ? 'Midnight OS' : 'Light Mode'}</span>}
                </button>

                <button
                    onClick={() => navigate('/support')}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-[var(--os-text-muted)] hover:bg-neuro/5 hover:text-neuro transition-all ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? 'Help & Docs' : ''}
                >
                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="tracking-tight font-black uppercase text-[9px]">Help & Docs</span>}
                </button>

                <button
                    onClick={handleOpenSupport}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-[var(--os-text-muted)] hover:bg-neuro/5 hover:text-neuro transition-all ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? 'Live Support' : ''}
                >
                    <LifeBuoy className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="tracking-tight font-black uppercase text-[9px]">Live Support</span>}
                </button>

                <button
                    onClick={handleLogoutClick}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-[var(--os-text-muted)] hover:bg-red-50 hover:text-red-500 transition-all ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? 'Logout' : ''}
                >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="tracking-tight font-black uppercase text-[9px]">Neural Disconnect</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
