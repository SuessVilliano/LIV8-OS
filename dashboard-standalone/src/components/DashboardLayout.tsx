import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import ContentStudio from './ContentStudio';
import IntegrationsDashboard from './IntegrationsDashboard';
import AIStaffChat from './AIStaffChat';

// Theme context for persistence across extension and dashboard
interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  mode: 'dark' | 'dark';
  preset: string;
}

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#6366f1',  // indigo-500
  secondaryColor: '#8b5cf6',  // violet-500
  accentColor: '#10b981',  // emerald-500
  mode: 'dark',
  preset: 'default'
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {}
});

export const useTheme = () => useContext(ThemeContext);

// Theme presets
const THEME_PRESETS = {
  default: {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#10b981',
    mode: 'dark' as const
  },
  ocean: {
    primaryColor: '#0ea5e9',
    secondaryColor: '#06b6d4',
    accentColor: '#14b8a6',
    mode: 'dark' as const
  },
  sunset: {
    primaryColor: '#f97316',
    secondaryColor: '#f59e0b',
    accentColor: '#ef4444',
    mode: 'dark' as const
  },
  forest: {
    primaryColor: '#22c55e',
    secondaryColor: '#10b981',
    accentColor: '#84cc16',
    mode: 'dark' as const
  },
  midnight: {
    primaryColor: '#8b5cf6',
    secondaryColor: '#a855f7',
    accentColor: '#ec4899',
    mode: 'dark' as const
  },
  corporate: {
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8',
    accentColor: '#0ea5e9',
    mode: 'dark' as const
  }
};

// Navigation items
type ViewType = 'dashboard' | 'content' | 'staff' | 'integrations' | 'analytics' | 'calendar' | 'settings';

const NAV_ITEMS: { id: ViewType; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'content', label: 'Content Studio', icon: '✍️' },
  { id: 'staff', label: 'AI Staff', icon: '🤖' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

interface DashboardLayoutProps {
  children?: ReactNode;
  initialView?: ViewType;
}

export default function DashboardLayout({ children: _children, initialView = 'dashboard' }: DashboardLayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [theme, setThemeState] = useState<ThemeConfig>(defaultTheme);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);

  const locationId = localStorage.getItem('locationId') || 'demo_location';

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('liv8_theme');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setThemeState(parsed);
        applyTheme(parsed);
      } catch (e) {
        console.error('Failed to parse saved theme');
      }
    }

    // Check for extension connection
    checkExtensionConnection();

    // Listen for theme changes from extension
    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

  const checkExtensionConnection = () => {
    // Check if extension is installed and connected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeRuntime = (typeof chrome !== 'undefined' && (chrome as any).runtime) as any;
    if (chromeRuntime?.sendMessage) {
      try {
        chromeRuntime.sendMessage({ type: 'LIV8_PING' }, (response: any) => {
          if (response?.connected) {
            setExtensionConnected(true);
            setRightSidebarOpen(false); // Hide right sidebar when extension is connected
          }
        });
      } catch (e) {
        // Extension not available
      }
    }
  };

  const handleExtensionMessage = (event: MessageEvent) => {
    if (event.data?.type === 'LIV8_THEME_CHANGE') {
      const newTheme = event.data.theme;
      setThemeState(newTheme);
      applyTheme(newTheme);
      localStorage.setItem('liv8_theme', JSON.stringify(newTheme));
    }
  };

  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('liv8_theme', JSON.stringify(newTheme));

    // Notify extension of theme change
    window.postMessage({ type: 'LIV8_THEME_CHANGE', theme: newTheme }, '*');

    // Also try direct extension communication
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeRuntime = (typeof chrome !== 'undefined' && (chrome as any).runtime) as any;
    if (chromeRuntime?.sendMessage) {
      try {
        chromeRuntime.sendMessage({ type: 'LIV8_SET_THEME', theme: newTheme });
      } catch (e) { /* Extension not available */ }
    }
  };

  const applyTheme = (theme: ThemeConfig) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);

    if (theme.mode === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'content':
        return <ContentStudio />;
      case 'integrations':
        return <IntegrationsDashboard />;
      case 'staff':
        return (
          <div className="h-full">
            <AIStaffChat locationId={locationId} onClose={() => {}} />
          </div>
        );
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'calendar':
        return <CalendarView />;
      case 'settings':
        return <SettingsView theme={theme} setTheme={setTheme} showThemePicker={showThemePicker} setShowThemePicker={setShowThemePicker} />;
      default:
        return <DashboardHome setCurrentView={setCurrentView} />;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`min-h-screen ${theme.mode === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        {/* Left Sidebar */}
        <aside
          className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
            leftSidebarOpen ? 'w-64' : 'w-16'
          }`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            {leftSidebarOpen && (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                >
                  L8
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">LIV8 OS</span>
              </div>
            )}
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {leftSidebarOpen ? '◀️' : '▶️'}
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={currentView === item.id ? { backgroundColor: theme.primaryColor } : {}}
              >
                <span className="text-xl">{item.icon}</span>
                {leftSidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Bottom section */}
          {leftSidebarOpen && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {localStorage.getItem('businessName') || 'Your Business'}
                  </div>
                  <div className="text-xs text-gray-500">Free Plan</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main
          className={`transition-all duration-300 ${
            leftSidebarOpen ? 'ml-64' : 'ml-16'
          } ${rightSidebarOpen ? 'mr-80' : 'mr-0'}`}
        >
          {/* Top Bar */}
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 sticky top-0 z-30">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {NAV_ITEMS.find(i => i.id === currentView)?.label || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme picker toggle */}
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Theme"
              >
                🎨
              </button>

              {/* Extension status */}
              <div className={`px-3 py-1 rounded-full text-xs ${
                extensionConnected
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {extensionConnected ? '🔗 Extension Connected' : '📦 Extension Available'}
              </div>

              {/* MCP Panel toggle */}
              <button
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  rightSidebarOpen
                    ? 'text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                style={rightSidebarOpen ? { backgroundColor: theme.primaryColor } : {}}
                title="MCP Browser Panel"
              >
                {rightSidebarOpen ? '✕' : '🌐'}
              </button>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6">
            {renderMainContent()}
          </div>
        </main>

        {/* Right Sidebar - MCP Browser Panel */}
        <aside
          className={`fixed right-0 top-0 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
            rightSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
          }`}
        >
          {rightSidebarOpen && (
            <div className="h-full flex flex-col">
              <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-white">MCP Browser</span>
                <button
                  onClick={() => setRightSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 p-4">
                {extensionConnected ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Extension is managing this panel</p>
                  </div>
                ) : (
                  <MCPBrowserPanel theme={theme} />
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Theme Picker Modal */}
        {showThemePicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Choose Theme
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {Object.entries(THEME_PRESETS).map(([name, preset]) => (
                  <button
                    key={name}
                    onClick={() => setTheme({ ...preset, preset: name })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      theme.preset === name
                        ? 'border-gray-900 dark:border-white'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.primaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.secondaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.accentColor }}
                      />
                    </div>
                    <div className="text-xs capitalize text-gray-700 dark:text-gray-300">
                      {name}
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Primary Color</label>
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={e => setTheme({ ...theme, primaryColor: e.target.value, preset: 'custom' })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowThemePicker(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeContext.Provider>
  );
}

// MCP Browser Panel Component
function MCPBrowserPanel({ theme }: { theme: ThemeConfig }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      // Use the scraper service
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/twin/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      setResult(data.success ? 'Scraped successfully!' : data.error);
    } catch (error) {
      setResult('Failed to scrape');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Scrape web pages to add to your knowledge base
      </p>

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://..."
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"
        />
        <button
          onClick={handleScrape}
          disabled={loading}
          className="px-3 py-2 text-white rounded-lg"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {loading ? '...' : '🔍'}
        </button>
      </div>

      {result && (
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
          {result}
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quick Actions
        </h4>
        <div className="space-y-2">
          {[
            { label: 'Scrape Current Page', icon: '📄' },
            { label: 'Extract All Links', icon: '🔗' },
            { label: 'Download Images', icon: '🖼️' },
            { label: 'Get Page SEO', icon: '📊' }
          ].map(action => (
            <button
              key={action.label}
              className="w-full flex items-center gap-2 p-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dashboard Home Component
function DashboardHome({ setCurrentView }: { setCurrentView: (view: ViewType) => void }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'AI Conversations', value: '124', change: '+12%', icon: '💬' },
          { label: 'Content Created', value: '45', change: '+8%', icon: '✍️' },
          { label: 'Leads Generated', value: '32', change: '+25%', icon: '🎯' },
          { label: 'Tasks Completed', value: '89', change: '+15%', icon: '✅' }
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-green-600 text-sm">{stat.change}</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Create Content', description: 'Generate AI-powered content', icon: '✨', view: 'content' as ViewType },
          { title: 'Chat with AI Staff', description: 'Talk to your AI team', icon: '🤖', view: 'staff' as ViewType },
          { title: 'View Analytics', description: 'See your performance', icon: '📊', view: 'analytics' as ViewType }
        ].map(action => (
          <button
            key={action.title}
            onClick={() => setCurrentView(action.view)}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-left hover:border-indigo-500 transition-colors"
          >
            <div className="text-3xl mb-2">{action.icon}</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{action.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{action.description}</p>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[
            { action: 'Content created', detail: 'Instagram post for Product Launch', time: '5 min ago', icon: '✍️' },
            { action: 'AI conversation', detail: 'Customer support - Order inquiry', time: '12 min ago', icon: '💬' },
            { action: 'Lead captured', detail: 'John Doe - Marketing consultation', time: '1 hour ago', icon: '🎯' },
            { action: 'Scheduled post', detail: 'LinkedIn article for tomorrow', time: '2 hours ago', icon: '📅' }
          ].map((item, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="text-2xl">{item.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">{item.action}</div>
                <div className="text-sm text-gray-500">{item.detail}</div>
              </div>
              <div className="text-sm text-gray-400">{item.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Analytics Dashboard Placeholder
function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Content Performance</h3>
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Chart Coming Soon</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">AI Staff Activity</h3>
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Chart Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Calendar View Placeholder
function CalendarView() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Content Calendar</h3>
      <p className="text-gray-500">Calendar view coming soon...</p>
    </div>
  );
}

// Settings View
function SettingsView({ theme, setTheme, showThemePicker: _showThemePicker, setShowThemePicker }: {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  showThemePicker: boolean;
  setShowThemePicker: (show: boolean) => void;
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Theme</div>
              <div className="text-sm text-gray-500">Customize dashboard colors</div>
            </div>
            <button
              onClick={() => setShowThemePicker(true)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              Customize
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Dark Mode</div>
              <div className="text-sm text-gray-500">Toggle dark mode</div>
            </div>
            <button
              onClick={() => setTheme({ ...theme, mode: theme.mode === 'dark' ? 'light' : 'dark' })}
              className={`w-12 h-6 rounded-full transition-colors ${
                theme.mode === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                theme.mode === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
