import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { brandSync } from './services/BrandSync';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import Agencies from './pages/Agencies';
import Staff from './pages/Staff';
import Brand from './pages/Brand';
import Workflows from './pages/Workflows';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Pricing from './pages/Pricing';
import Studio from './pages/Studio';
import Sidebar from './components/Sidebar';
import CrmConnect from './components/CrmConnect';
import GhlOnboarding from './components/GhlOnboarding';
import UnifiedCommandPanel from './components/UnifiedCommandPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { Sparkles } from 'lucide-react';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('os_auth') === 'true';
  });

  const [isCrmConnected, setIsCrmConnected] = useState(() => {
    return localStorage.getItem('os_crm_connected') === 'true';
  });

  const [isOnboarded, setIsOnboarded] = useState(() => {
    return localStorage.getItem('os_onboarded') === 'true';
  });

  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Initialize brand sync when user is fully onboarded
  useEffect(() => {
    if (isAuthenticated && isCrmConnected && isOnboarded) {
      // Sync brand data from server to localStorage on app init
      brandSync.initialize()
        .then((data) => {
          if (data) {
            console.log('[App] Brand data synced:', data.businessName);
          }
        })
        .catch((err) => {
          console.error('[App] Brand sync failed:', err);
        });

      // Start periodic sync to keep server and local in sync
      brandSync.startPeriodicSync();

      return () => {
        brandSync.stopPeriodicSync();
      };
    }
  }, [isAuthenticated, isCrmConnected, isOnboarded]);

  const handleLogin = () => {
    localStorage.setItem('os_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setIsCrmConnected(false);
    setIsOnboarded(false);
  };

  const handleCrmConnect = (crmType: string, credentials: { locationId?: string; apiKey?: string; email?: string; password?: string }) => {
    localStorage.setItem('os_crm_connected', 'true');
    localStorage.setItem('os_crm_type', crmType);

    if (crmType === 'ghl') {
      localStorage.setItem('os_loc_id', credentials.locationId || '');
      localStorage.setItem('os_api_key', credentials.apiKey || '');
    } else if (crmType === 'liv8') {
      localStorage.setItem('os_vbout_email', credentials.email || '');
      // Note: Don't store password in localStorage for security
    }

    setIsCrmConnected(true);
  };

  const handleOnboardingComplete = async () => {
    localStorage.setItem('os_onboarded', 'true');
    setIsOnboarded(true);

    // Force sync brand data to server after onboarding
    try {
      await brandSync.forceSync();
      console.log('[App] Onboarding data synced to server');
    } catch (err) {
      console.error('[App] Failed to sync onboarding data:', err);
    }
  };

  const toggleCommand = () => setIsCommandOpen(!isCommandOpen);

  const isCoreActive = isAuthenticated && isCrmConnected && isOnboarded;

  return (
    <ThemeProvider>
      <Router>
        <div className="flex h-screen bg-[var(--os-bg)] text-[var(--os-text)] transition-colors duration-500 overflow-hidden">
          {isCoreActive && <Sidebar onLogout={handleLogout} />}

          <main className="flex-1 overflow-auto relative custom-scrollbar">
            <Routes>
              {/* 0. Public Landing Page */}
              <Route path="/" element={
                isAuthenticated ? <Navigate to={isCrmConnected ? (isOnboarded ? "/dashboard" : "/onboarding") : "/connect"} replace /> : <Landing />
              } />

              {/* 1. Base Authentication Layer */}
              <Route path="/login" element={
                isAuthenticated ? <Navigate to="/connect" replace /> : <Login onLogin={handleLogin} />
              } />

              {/* 2. CRM Connection Layer */}
              <Route path="/connect" element={
                !isAuthenticated ? <Navigate to="/login" replace /> :
                  isCrmConnected ? <Navigate to="/onboarding" replace /> : <CrmConnect onConnect={handleCrmConnect} />
              } />

              {/* 3. OS Onboarding Layer */}
              <Route path="/onboarding" element={
                !isAuthenticated ? <Navigate to="/login" replace /> :
                  !isCrmConnected ? <Navigate to="/connect" replace /> :
                    isOnboarded ? <Navigate to="/dashboard" replace /> : <GhlOnboarding onComplete={handleOnboardingComplete} />
              } />

              {/* 4. Dashboard & Core Pages - Wrapped in ErrorBoundary */}
              <Route path="/dashboard" element={isCoreActive ? <ErrorBoundary><Dashboard /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/opportunities" element={isCoreActive ? <ErrorBoundary><Opportunities /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/agencies" element={isCoreActive ? <ErrorBoundary><Agencies /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/staff" element={isCoreActive ? <ErrorBoundary><Staff /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/brand" element={isCoreActive ? <ErrorBoundary><Brand /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/workflows" element={isCoreActive ? <ErrorBoundary><Workflows /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/studio" element={isCoreActive ? <ErrorBoundary><Studio /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/analytics" element={isCoreActive ? <ErrorBoundary><Analytics /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/settings" element={isCoreActive ? <ErrorBoundary><Settings /></ErrorBoundary> : <Navigate to="/login" replace />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/pricing" element={<Pricing />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Universal Command Toggle */}
            {isCoreActive && (
              <button
                onClick={toggleCommand}
                className={`fixed bottom-10 right-10 h-16 w-16 rounded-[1.8rem] bg-neuro text-white flex items-center justify-center shadow-2xl shadow-neuro/40 hover:scale-110 active:scale-95 transition-all z-[90] ${isCommandOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}
              >
                <Sparkles className="h-7 w-7" />
              </button>
            )}

            {/* Unified Neural Command Panel */}
            {isCoreActive && (
              <UnifiedCommandPanel isOpen={isCommandOpen} onClose={toggleCommand} />
            )}
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
