
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import KnowledgeBase from './KnowledgeBase';
import { ROLE_OPTIONS } from '../constants';
import { RoleKey, BrandBrain, ApprovalPack, BuildPlan } from '../types';
import { scanBrandIdentity } from '../services/geminiService';
import { setupService } from '../services/setupService';
import { useError } from '../contexts/ErrorContext';
import { db } from '../services/database';

interface OnboardingProps {
  onComplete: () => void;
}

type Step = 'intro' | 'brand' | 'training' | 'roles' | 'plan' | 'deploying';

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('intro');
  const [loading, setLoading] = useState(false);
  const { addError, addToast } = useError();
  
  // State
  const [domain, setDomain] = useState('');
  const [socials, setSocials] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([RoleKey.AI_RECEPTIONIST, RoleKey.MISSED_CALL_RECOVERY]);
  const [brandBrain, setBrandBrain] = useState<BrandBrain | null>(null);
  const [approvalPack, setApprovalPack] = useState<ApprovalPack | null>(null);
  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null);
  
  // Deployment State
  const [deployStatus, setDeployStatus] = useState("Initializing...");
  const [deployProgress, setDeployProgress] = useState(0);

  // Handlers
  const handleScanBrand = async () => {
    setLoading(true);
    try {
      // 1. Scan
      const result = await scanBrandIdentity(domain, description, socials);
      setBrandBrain(result);
      
      // 2. Persist to SQL DB
      await db.saveBrandBrain("current_location", result);
      
      setStep('training'); // Go to Training Step instead of Roles
      addToast("Brand Brain Created", "Identity scanned. Now add training data.", "success");
    } catch (e) {
      addError(e, "Failed to scan brand. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBrain = (updated: BrandBrain) => {
    setBrandBrain(updated);
    // Persist quietly
    db.saveBrandBrain("current_location", updated);
  };

  const handleGeneratePlan = async () => {
    if (!brandBrain) return;
    setLoading(true);
    try {
      // Use setupService to get both approval pack and technical build plan
      const { approval, build } = await setupService.compileArchitecture(brandBrain, selectedRoles);
      
      // Validate build plan integrity before proceeding
      if (!build || !build.assets || !build.assets.pipelines) {
        throw new Error("Generated plan was incomplete. Please try again.");
      }

      setApprovalPack(approval);
      setBuildPlan(build);
      setStep('plan');
    } catch (e) {
      addError(e, "Failed to generate approval pack.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!buildPlan || !approvalPack) {
      addToast("Error", "Build plan is missing. Please restart generation.", "error");
      return;
    }
    setStep('deploying');
    
    try {
      await setupService.deploySystem("current_location", buildPlan, (msg, pct) => {
        setDeployStatus(msg);
        setDeployProgress(pct);
      });
      
      // Persist deployment record
      await db.saveDeployment("current_location", approvalPack, buildPlan);
      
      addToast("Deployment Successful", "LIV8AI System is now active.", "success");
      onComplete();
    } catch (e) {
      addError(e, "Deployment failed. Some assets may not have been created.");
      setStep('plan'); // Go back to plan on failure
    }
  };

  const toggleRole = (key: RoleKey) => {
    setSelectedRoles(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // --- Renderers ---

  const renderLoadingOverlay = (title: string, subtitle: string) => (
    <div className="flex flex-col items-center justify-center py-12 space-y-8 animate-in fade-in duration-500">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full animate-pulse flex items-center justify-center">
             <span className="text-xl">🧠</span>
          </div>
        </div>
      </div>
      <div className="text-center space-y-2">
         <h3 className="text-xl font-bold text-slate-900">{title}</h3>
         <p className="text-slate-500 text-sm animate-pulse">{subtitle}</p>
      </div>
    </div>
  );

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto py-12 animate-in slide-in-from-bottom-4 duration-700">
      <div className="w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl flex items-center justify-center mb-4 shadow-2xl shadow-slate-200 rotate-3 transition-transform hover:rotate-0">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">LIV8 Setup OS</h1>
      <p className="text-slate-500 text-lg leading-relaxed">
        LIV8AI will scan your brand, recruit your AI staff, and deploy a fully automated operations center inside HighLevel in <span className="text-slate-900 font-bold">120 seconds</span>.
      </p>
      <div className="pt-6 w-full">
        <Button onClick={() => setStep('brand')} fullWidth className="h-14 text-lg shadow-xl shadow-blue-500/20 rounded-xl">
          Start Setup
        </Button>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
        <span className="flex items-center gap-1">⚡ Automated</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span className="flex items-center gap-1">🔒 Secure</span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span className="flex items-center gap-1">🚀 AEO Ready</span>
      </div>
    </div>
  );

  const renderBrand = () => (
    <div className="space-y-6 max-w-xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Brand Recon</h2>
        <p className="text-slate-500">We'll scan your digital footprint to build your "Brand Brain".</p>
      </div>
      
      {loading ? renderLoadingOverlay("Analyzing Brand DNA", "Scanning website, extracting tone, and identifying services...") : (
        <>
          <Card>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website URL</label>
                <input 
                  type="text" 
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border-slate-200 bg-slate-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-sm transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Social Media Links <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input 
                  type="text" 
                  value={socials}
                  onChange={(e) => setSocials(e.target.value)}
                  placeholder="Instagram, Facebook, or LinkedIn URLs"
                  className="w-full rounded-lg border-slate-200 bg-slate-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-sm transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">Helps us understand your brand voice better.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brief Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What do you do and who do you serve?"
                  rows={3}
                  className="w-full rounded-lg border-slate-200 bg-slate-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-sm transition-all resize-none"
                />
              </div>
            </div>
          </Card>

          <Button onClick={handleScanBrand} disabled={!domain || loading} fullWidth className="h-12 shadow-lg">
            Create Brand Brain
          </Button>
        </>
      )}
    </div>
  );

  const renderTraining = () => (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500 h-[calc(100vh-140px)] flex flex-col">
       <div className="space-y-2 shrink-0">
        <h2 className="text-2xl font-bold text-slate-900">Knowledge Base</h2>
        <p className="text-slate-500">Upload documents, paste notes, or record voice messages to train your AI.</p>
      </div>
      
      <div className="flex-1 min-h-0">
        {brandBrain && <KnowledgeBase brain={brandBrain} onUpdate={handleUpdateBrain} />}
      </div>

      <div className="shrink-0 pt-4 flex gap-4">
         <Button variant="ghost" onClick={() => setStep('brand')}>Back</Button>
         <Button onClick={() => setStep('roles')} className="flex-1 shadow-lg">Continue to Roles</Button>
      </div>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Hire your AI Staff</h2>
        <p className="text-slate-500">Select the roles you want to activate immediately.</p>
      </div>

      {loading ? renderLoadingOverlay("Compiling Setup OS", "Generating workflows, pipelines, and configuration packets...") : (
        <>
          <div className="grid gap-4">
            {ROLE_OPTIONS.map((role) => (
              <div 
                key={role.key}
                onClick={() => toggleRole(role.key)}
                className={`
                  relative flex items-start p-4 border rounded-xl cursor-pointer transition-all duration-200
                  ${selectedRoles.includes(role.key) 
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-md' 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white shadow-sm'}
                `}
              >
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.key)}
                    readOnly
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600 pointer-events-none"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label className="font-bold text-slate-900 cursor-pointer flex items-center gap-2">
                    {role.label}
                    {role.recommended && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">Recommended</span>}
                  </label>
                  <p className="text-slate-500 mt-1 leading-snug">{role.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={() => setStep('training')} className="px-6">Back</Button>
            <Button onClick={handleGeneratePlan} disabled={loading} className="flex-1 h-12 shadow-lg">
              Generate Approval Pack
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderPlan = () => (
    <div className="space-y-6 max-w-3xl mx-auto h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
       <div className="space-y-2 shrink-0">
        <h2 className="text-2xl font-bold text-slate-900">Approval Pack</h2>
        <p className="text-slate-500">Review the blueprint before we deploy to your GHL account.</p>
      </div>

      {approvalPack && (
        <div className="flex-1 overflow-auto space-y-4 pr-2 pb-4">
          {/* Summary Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <span className="text-xl">🚀</span> Deployment Strategy
              </h3>
              <p className="text-slate-300 leading-relaxed text-sm md:text-base">{approvalPack.summary}</p>
              <div className="mt-4 flex items-center gap-2 text-sm bg-white/10 p-2.5 rounded-lg w-fit backdrop-blur-sm">
                <span className="text-green-400 font-bold">⚡ AEO Impact:</span>
                <span className="font-mono">{approvalPack.aeo_score_impact}</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                <span className="text-lg">🧠</span> Confirmed Brand
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Name</span>
                  <span className="font-bold text-slate-900">{brandBrain?.brand_name}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Domain</span>
                  <span className="font-mono text-xs text-slate-700">{brandBrain?.domain}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Training Data</span>
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {brandBrain?.knowledge_base?.length || 0} Items
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                 <span className="text-lg">✅</span> Included Actions
              </h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {approvalPack.deploy_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">✓</div>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
             <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                <span className="text-lg">🤖</span> AI Staff Configuration
             </h3>
             <div className="space-y-3">
                {approvalPack.ai_staff_actions.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      {item.role}
                    </span>
                    <span className="text-slate-500 text-xs mt-1 sm:mt-0 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{item.action}</span>
                  </div>
                ))}
             </div>
          </Card>
        </div>
      )}

      <div className="pt-4 shrink-0 flex gap-4 bg-gray-50 z-10 border-t border-slate-200 mt-auto">
         <Button variant="ghost" onClick={() => setStep('roles')}>Adjust Roles</Button>
         <Button onClick={handleDeploy} variant="secondary" fullWidth className="shadow-xl shadow-blue-500/20 h-12 text-base">
           Approve & Deploy System
         </Button>
      </div>
    </div>
  );

  const renderDeploying = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-12 animate-in fade-in duration-700">
      <div className="relative">
        <div className="w-32 h-32 border-[6px] border-slate-100 border-t-slate-900 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center animate-pulse">
             <span className="text-3xl">🏗️</span>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Deploying LIV8 System</h2>
          <div className="h-6 flex items-center justify-center overflow-hidden">
             <p key={deployStatus} className="text-blue-600 font-mono text-sm animate-in slide-in-from-bottom-2 duration-300">
               {deployStatus}
             </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
             <div 
               className="bg-slate-900 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden" 
               style={{ width: `${deployProgress}%` }}
             >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
             </div>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400 px-1">
             <span>INITIALIZING</span>
             <span>{deployProgress}%</span>
             <span>COMPLETE</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full px-4 py-6 md:px-8 overflow-y-auto bg-white/50">
      {step === 'intro' && renderIntro()}
      {step === 'brand' && renderBrand()}
      {step === 'training' && renderTraining()}
      {step === 'roles' && renderRoles()}
      {step === 'plan' && renderPlan()}
      {step === 'deploying' && renderDeploying()}
    </div>
  );
};

export default Onboarding;
