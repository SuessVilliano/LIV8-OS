
import React, { useState, useEffect, useRef } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Connect from './components/Connect';
import LandingPage from './components/LandingPage';
import HelpDocs from './components/HelpDocs';
import { saveToken, hasValidToken } from './services/vaultService';
import { ErrorProvider, useError } from './contexts/ErrorContext';
import { ToastContainer } from './components/ui/Toast';
import { VaultToken } from './types';

const checkSetupStatus = (locationId: string | null) => {
  if (!locationId) return false;
  const status = localStorage.getItem(`liv8_setup_${locationId}`);
  return status === 'completed';
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
      let targetLocationId: string | null = null;
      
      // 1. Try URL Params
      try {
        const searchParams = new URLSearchParams(window.location.search);
        targetLocationId = searchParams.get('locationId');
      } catch (e) {
        console.warn("Could not parse URL params", e);
      }

      // 2. Try Last Active Session (if no URL param)
      if (!targetLocationId) {
        const lastActive = localStorage.getItem('liv8_last_location');
        if (lastActive) {
          targetLocationId = lastActive;
        }
      }
      
      if (targetLocationId) {
        setLocationId(targetLocationId);
        const isValid = await hasValidToken(targetLocationId);
        
        if (isValid) {
          const isSetup = checkSetupStatus(targetLocationId);
          setView(isSetup ? 'dashboard' : 'onboarding');
        } else {
          setView('connecting');
        }
      } else {
        setView('landing');
      }
    };

    init();
  }, []);

  const handleAuthSuccess = (token: VaultToken, locId: string) => {
    saveToken(locId, token);
    setLocationId(locId);
    
    // Persist as last active for reloads
    localStorage.setItem('liv8_last_location', locId);
    
    // Update URL safely (ignore errors in sandboxed/blob environments)
    try {
      const newUrl = window.location.pathname + `?locationId=${locId}`;
      window.history.replaceState({}, document.title, newUrl);
    } catch (e) {
      console.warn("Environment does not support history.replaceState (likely Blob URL). Skipping URL update.");
    }
    
    addToast("Connected", "Secure connection established.", "success");
    
    // Check next step
    const isSetup = checkSetupStatus(locId);
    setView(isSetup ? 'dashboard' : 'onboarding');
  };

  const handleOnboardingComplete = () => {
    if (locationId) {
      localStorage.setItem(`liv8_setup_${locationId}`, 'completed');
    }
    addToast("Setup Complete", "LIV8AI System is now active.", "success");
    setView('dashboard');
  };

  // View Routing
  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-900 rounded-xl mb-4 shadow-xl"></div>
          <div className="text-slate-400 font-medium">Initializing LIV8 OS...</div>
        </div>
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onLaunch={() => setView('connecting')} onOpenDocs={() => setView('docs')} />;
  }

  if (view === 'docs') {
    return <HelpDocs onBack={() => setView('landing')} />;
  }

  if (view === 'connecting') {
    return (
      <Connect 
        locationId={locationId} 
        onAuth={handleAuthSuccess} 
      />
    );
  }

  return (
    <>
      {view === 'onboarding' && <Onboarding onComplete={handleOnboardingComplete} />}
      {view === 'dashboard' && <Dashboard />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorProvider>
      <AppContent />
      <ToastContainer />
    </ErrorProvider>
  );
};

export default App;
