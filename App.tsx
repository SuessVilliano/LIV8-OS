
import React, { useState, useEffect, useRef } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Connect from './components/Connect';
import LandingPage from './components/LandingPage';
import HelpDocs from './components/HelpDocs';
import Operator from './components/Operator';
import { saveToken, hasValidToken } from './services/vaultService';
import { ErrorProvider, useError } from './contexts/ErrorContext';
import { ExtensionThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from './components/ui/Toast';
import { VaultToken } from './types';

/**
 * Check if Chrome extension APIs are available
 */
const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

/**
 * Storage abstraction - works in both extension and browser contexts
 */
const storage = {
  async get(keys: string[]): Promise<Record<string, any>> {
    if (isChromeExtension) {
      return chrome.storage.local.get(keys);
    }
    // Fallback to localStorage
    const result: Record<string, any> = {};
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      }
    });
    return result;
  },
  async set(data: Record<string, any>): Promise<void> {
    if (isChromeExtension) {
      return chrome.storage.local.set(data);
    }
    // Fallback to localStorage
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  }
};

const checkSetupStatus = async (locationId: string | null) => {
  if (!locationId) return false;
  try {
    const result = await storage.get([`liv8_setup_${locationId}`]);
    return result[`liv8_setup_${locationId}`] === 'completed';
  } catch (e) {
    console.warn('Error checking setup status:', e);
    return false;
  }
};

type ViewState = 'loading' | 'landing' | 'docs' | 'connecting' | 'onboarding' | 'dashboard';

const AppContent: React.FC = () => {
  const [view, setView] = useState<ViewState>('loading');
  const [locationId, setLocationId] = useState<string | null>(null);
  const { addToast } = useError();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        let targetLocationId: string | null = null;

        // Try to get locationId from URL params
        try {
          const searchParams = new URLSearchParams(window.location.search);
          targetLocationId = searchParams.get('locationId');
        } catch (e) {
          console.warn("Could not parse URL params", e);
        }

        // If no locationId in URL, check storage
        if (!targetLocationId) {
          try {
            const result = await storage.get(['liv8_last_location']);
            targetLocationId = result.liv8_last_location || null;
          } catch (e) {
            console.warn("Could not access storage", e);
          }
        }

        if (targetLocationId) {
          setLocationId(targetLocationId);
          const isValid = await hasValidToken(targetLocationId);
          if (isValid) {
            const isSetup = await checkSetupStatus(targetLocationId);
            setView(isSetup ? 'dashboard' : 'onboarding');
          } else {
            setView('connecting');
          }
        } else {
          setView('landing');
        }
      } catch (error) {
        console.error('Init error:', error);
        // On any error, go to landing page
        setView('landing');
      }
    };

    init();
  }, []);

  const handleAuthSuccess = async (token: VaultToken, locId: string) => {
    try {
      await saveToken(locId, token);
      setLocationId(locId);
      await storage.set({ liv8_last_location: locId });
      addToast("Connected", "Secure connection established.", "success");
      const isSetup = await checkSetupStatus(locId);
      setView(isSetup ? 'dashboard' : 'onboarding');
    } catch (error) {
      console.error('Auth success handler error:', error);
      setView('onboarding');
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      if (locationId) {
        await storage.set({ [`liv8_setup_${locationId}`]: 'completed' });
      }
      addToast("Setup Complete", "LIV8 OS is now active.", "success");
      setView('dashboard');
    } catch (error) {
      console.error('Onboarding complete error:', error);
      setView('dashboard');
    }
  };

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--os-bg)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-neuro rounded-2xl mb-4 shadow-xl shadow-neuro/30"></div>
          <div className="text-[var(--os-text-muted)] text-[10px] font-black uppercase tracking-[0.2em] text-center">Establishing<br />OS Core...</div>
        </div>
      </div>
    );
  }

  if (view === 'landing') return <LandingPage onLaunch={() => setView('connecting')} onOpenDocs={() => setView('docs')} />;
  if (view === 'docs') return <HelpDocs onBack={() => setView('landing')} />;
  if (view === 'connecting') return <Connect locationId={locationId} onAuth={handleAuthSuccess} />;

  return (
    <>
      {view === 'onboarding' && <Onboarding onComplete={handleOnboardingComplete} />}
      {view === 'dashboard' && <Operator />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorProvider>
      <ExtensionThemeProvider>
        <AppContent />
        <ToastContainer />
      </ExtensionThemeProvider>
    </ErrorProvider>
  );
};

export default App;
