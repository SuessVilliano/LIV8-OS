import React, { useState } from 'react';
import {
  Shield,
  Key,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/Button';
import { verifyManualConnection } from '../services/ghlAuth';
import { saveToken, clearToken } from '../services/vaultService';
import { auth } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { VaultToken } from '../types';

interface ConnectProps {
  locationId: string | null;
  onAuth: (token: VaultToken, locationId: string) => void;
  onBack?: () => void;
}

const Connect: React.FC<ConnectProps> = ({ locationId: initialLocationId, onAuth, onBack }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [locId, setLocId] = useState(initialLocationId || '');
  const [apiKey, setApiKey] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const { addError, addToast } = useError();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locId.trim() || !apiKey.trim()) {
      addToast("Missing Credentials", "Please enter both Location ID and API Key.", "warning");
      return;
    }

    setIsConnecting(true);
    try {
      // 1. Verify credentials with actual GHL API
      const token = await verifyManualConnection(locId, apiKey);

      // 2. Try to save location to backend (for full features)
      // This enables backend deployment, analytics, etc.
      try {
        await auth.connectLocation(locId, 'GHL Location', apiKey);
        console.log('[Connect] Location saved to backend successfully');
      } catch (backendErr) {
        // Backend might not be available or user not logged in
        // Extension still works with local storage
        console.warn('[Connect] Backend connection skipped (local mode):', backendErr);
      }

      // 3. Proceed with local auth
      await onAuth(token, locId);
    } catch (err) {
      addError(err, "Connection failed");
      setIsConnecting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col font-sans text-slate-800">

      {/* Header */}
      <div className="px-6 py-8 space-y-4">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 transition flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enter Credentials</h1>
          <p className="text-sm text-slate-500 font-medium">Step 4: Connect your GoHighLevel account.</p>
        </div>
      </div>

      <div className="px-6 pb-20 space-y-10">

        {/* Help Link */}
        <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#1068EB]">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="text-xs font-bold text-[#1068EB] uppercase tracking-wide">Connection Guide</div>
          </div>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            Need help finding your Location ID or Private Integration Token? View our setup guide for step-by-step instructions.
          </p>
          <button
            className="text-xs font-bold text-[#1068EB] hover:underline flex items-center gap-1"
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? 'Hide Installation Guide' : 'View Installation Guide'} <ChevronDown className={`h-3 w-3 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleConnect} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Location Identifier</label>
              <input
                type="text"
                value={locId}
                onChange={(e) => setLocId(e.target.value)}
                placeholder="Paste Location ID here"
                className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-5 py-4 text-sm focus:ring-1 focus:ring-[#1068EB] focus:border-[#1068EB] outline-none transition-all placeholder:text-slate-300 font-medium"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Private App Key (PIT)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste Private Integration Token here"
                className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-5 py-4 text-sm focus:ring-1 focus:ring-[#1068EB] focus:border-[#1068EB] outline-none transition-all placeholder:text-slate-300 font-medium"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isConnecting}
              className="h-14 bg-[#1068EB] hover:bg-[#0D55C2] text-white w-full rounded-xl border-none font-bold text-sm tracking-wide shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              {isConnecting ? "Establishing Link..." : <>Connect and start using LIV8 <ChevronRight className="h-4 w-4" /></>}
            </Button>

            <p className="text-[10px] text-slate-400 font-medium text-center px-4 leading-relaxed">
              By connecting, you agree to our <a href="#" className="underline">Terms of Service</a> and allow the agent to interact with your CRM data.
            </p>
          </div>
        </form>

        {/* Collapsible Guide */}
        {showGuide && (
          <div className="pt-8 border-t border-slate-100 space-y-10">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1068EB] text-white flex items-center justify-center shrink-0 text-xs font-black ring-4 ring-blue-50">1</div>
                <div className="space-y-1 pt-1">
                  <h4 className="font-bold text-slate-900 text-sm">Install Extension</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Ensure you have the latest LIV8 OS extension installed from the Chrome Web Store.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1068EB] text-white flex items-center justify-center shrink-0 text-xs font-black ring-4 ring-blue-50">2</div>
                <div className="space-y-1 pt-1">
                  <h4 className="font-bold text-slate-900 text-sm">Get Your Location ID</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Go to HighLevel Settings &gt; Business Profile and copy the 'Location ID' value.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1068EB] text-white flex items-center justify-center shrink-0 text-xs font-black ring-4 ring-blue-50">3</div>
                <div className="space-y-1 pt-1">
                  <h4 className="font-bold text-slate-900 text-sm">Create Private Token</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Navigate to Settings &gt; Private Integrations. Click 'Create New Token', name it 'LIV8 Integration', selection all permissions, and copy the resulting Key.</p>
                </div>
              </div>
            </div>

            <Button className="w-full bg-white text-[#1068EB] border-blue-100 hover:bg-blue-50 uppercase tracking-widest text-[10px] font-black h-12 rounded-lg">
              View Complete Setup Guide <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Connect;
