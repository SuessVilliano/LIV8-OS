
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { verifyManualConnection } from '../services/ghlAuth';
import { clearToken } from '../services/vaultService';
import { useError } from '../contexts/ErrorContext';
import { VaultToken } from '../types';

interface ConnectProps {
  locationId: string | null;
  onAuth: (token: VaultToken, locationId: string) => void;
}

const Connect: React.FC<ConnectProps> = ({ locationId: initialLocationId, onAuth }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [locId, setLocId] = useState(initialLocationId || '');
  const [apiKey, setApiKey] = useState('');
  const { addError, addToast } = useError();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locId.trim() || !apiKey.trim()) {
      addToast("Missing Credentials", "Please enter both Location ID and API Key.", "warning");
      return;
    }

    setIsConnecting(true);
    try {
      // Verify and get a formatted token object
      const token = await verifyManualConnection(locId, apiKey);
      
      // Pass back to App to save and redirect
      // Note: If onAuth throws (e.g. history api error), we catch it here
      onAuth(token, locId);
      
    } catch (err) {
      addError(err, "Connection failed");
      setIsConnecting(false);
    }
  };

  const handleReset = () => {
    if (confirm("Clear local credentials and refresh?")) {
      if (initialLocationId) clearToken(initialLocationId);
      localStorage.removeItem('liv8_last_location');
      
      try {
         window.location.href = window.location.pathname; 
      } catch (e) {
         window.location.reload();
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="min-h-full flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-slate-900/20">
              <span className="text-white font-bold text-xl tracking-widest">LIV8</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Connect to HighLevel</h1>
              <p className="text-slate-500 text-sm mt-1">
                Enter your location credentials to enable the AI Operator.
              </p>
            </div>
          </div>

          <form onSubmit={handleConnect} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">Location ID</label>
                <input 
                  type="text" 
                  value={locId}
                  onChange={(e) => setLocId(e.target.value)}
                  placeholder="e.g. ve92Q..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-mono text-slate-700 placeholder:font-sans"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="block text-xs font-bold uppercase text-slate-500">API Key / Access Token</label>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("Go to GHL > Settings > Business Info > API Key"); }} className="text-[10px] text-blue-600 hover:underline cursor-pointer">
                    Where do I find this?
                  </a>
                </div>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="pit-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-mono text-slate-700 placeholder:font-sans"
                />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isConnecting} 
              fullWidth 
              className="h-12 text-base shadow-lg shadow-slate-900/10"
            >
              {isConnecting ? "Verifying..." : "Connect Securely"}
            </Button>
          </form>
          
          <div className="pt-2 text-center">
             <p className="text-xs text-slate-400">
               Your keys are encrypted and stored locally on your device.
             </p>
             <button onClick={handleReset} className="mt-4 text-[10px] text-slate-300 hover:text-red-400 transition-colors">
              Reset Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connect;
