import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Sidebar from './components/Sidebar';
import GhlConnect from './components/GhlConnect';
import GhlOnboarding from './components/GhlOnboarding';
import CommandSidebar from './components/CommandSidebar';
import { ThemeProvider } from './contexts/ThemeContext';
import { Terminal } from 'lucide-react';

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

  const [isGhlConnected, setIsGhlConnected] = useState(() => {
    return localStorage.getItem('os_ghl_connected') === 'true';
  });

  const [isOnboarded, setIsOnboarded] = useState(() => {
    return localStorage.getItem('os_onboarded') === 'true';
  });

  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const handleLogin = () => {
    localStorage.setItem('os_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setIsGhlConnected(false);
    setIsOnboarded(false);
  };

  const handleGhlConnect = (locId: string, apiKey: string) => {
    localStorage.setItem('os_ghl_connected', 'true');
    localStorage.setItem('os_loc_id', locId);
    localStorage.setItem('os_api_key', apiKey);
    setIsGhlConnected(true);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('os_onboarded', 'true');
    setIsOnboarded(true);
  };

  const toggleCommand = () => setIsCommandOpen(!isCommandOpen);

  const isCoreActive = isAuthenticated && isGhlConnected && isOnboarded;

  return (
    <ThemeProvider>
      <Router>
        <div className="flex min-h-screen bg-[var(--os-bg)] text-[var(--os-text)] transition-colors duration-500 overflow-hidden">
          {isCoreActive && <Sidebar onLogout={handleLogout} />}

          <main className="flex-1 overflow-auto relative custom-scrollbar">
            <Routes>
              {/* 0. Public Landing Page */}
              <Route path="/" element={
                isAuthenticated ? <Navigate to={isGhlConnected ? (isOnboarded ? "/dashboard" : "/onboarding") : "/connect"} replace /> : <Landing />
              } />

              {/* 1. Base Authentication Layer */}
              <Route path="/login" element={
                isAuthenticated ? <Navigate to="/connect" replace /> : <Login onLogin={handleLogin} />
              } />

              {/* 2. GHL Connection Layer */}
              <Route path="/connect" element={
                !isAuthenticated ? <Navigate to="/login" replace /> :
                  isGhlConnected ? <Navigate to="/onboarding" replace /> : <GhlConnect onConnect={handleGhlConnect} />
              } />

              {/* 3. OS Onboarding Layer */}
              <Route path="/onboarding" element={
                !isAuthenticated ? <Navigate to="/login" replace /> :
                  !isGhlConnected ? <Navigate to="/connect" replace /> :
                    isOnboarded ? <Navigate to="/dashboard" replace /> : <GhlOnboarding onComplete={handleOnboardingComplete} />
              } />

              {/* 4. Dashboard & Core Pages */}
              <Route path="/dashboard" element={isCoreActive ? <Dashboard /> : <Navigate to="/login" replace />} />
              <Route path="/opportunities" element={isCoreActive ? <Opportunities /> : <Navigate to="/login" replace />} />
              <Route path="/agencies" element={isCoreActive ? <Agencies /> : <Navigate to="/login" replace />} />
              <Route path="/staff" element={isCoreActive ? <Staff /> : <Navigate to="/login" replace />} />
              <Route path="/brand" element={isCoreActive ? <Brand /> : <Navigate to="/login" replace />} />
              <Route path="/workflows" element={isCoreActive ? <Workflows /> : <Navigate to="/login" replace />} />
              <Route path="/analytics" element={isCoreActive ? <Analytics /> : <Navigate to="/login" replace />} />
              <Route path="/settings" element={isCoreActive ? <Settings /> : <Navigate to="/login" replace />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Universal Command Toggle */}
            {isCoreActive && (
              <button
                onClick={toggleCommand}
                className={`fixed bottom-10 right-10 h-16 w-16 rounded-[1.8rem] bg-neuro text-white flex items-center justify-center shadow-2xl shadow-neuro/40 hover:scale-110 active:scale-95 transition-all z-[90] ${isCommandOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}
              >
                <Terminal className="h-7 w-7" />
              </button>
            )}

            {/* Neural Command Sidebar */}
            {isCoreActive && (
              <CommandSidebar isOpen={isCommandOpen} onClose={toggleCommand} />
            )}
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
