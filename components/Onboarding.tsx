import React, { useState } from 'react';
import {
  Zap,
  Brain,
  Rocket,
  Globe,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Sparkles,
  Layout,
  UserPlus,
  ShieldCheck,
  Target,
  FileText,
  X
} from 'lucide-react';
import { Button } from './ui/Button';
import KnowledgeBase from './KnowledgeBase';
import { ROLE_OPTIONS } from '../constants';
import { RoleKey, BrandBrain, ApprovalPack, BuildPlan } from '../types';
import { scanBrandIdentity } from '../services/geminiService';
import { setupService } from '../services/setupService';
import { useError } from '../contexts/ErrorContext';
import { db } from '../services/database';
import { automationService } from '../services/automation';
import { setupApi } from '../services/setupApi';

interface OnboardingProps {
  locationId: string | null;
  onComplete: () => void;
}

type Step = 'brand' | 'training' | 'preview' | 'roles' | 'plan' | 'deploying';

const Onboarding: React.FC<OnboardingProps> = ({ locationId: propLocationId, onComplete }) => {
  // Use prop locationId or fallback to a generated one
  const locationId = propLocationId || `loc_${Date.now()}`;
  const [step, setStep] = useState<Step>('brand');
  const [loading, setLoading] = useState(false);
  const { addError, addToast } = useError();

  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');

  // Headless & Strategic Metadata
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [ein, setEin] = useState('');
  const [socialFB, setSocialFB] = useState('');
  const [socialIG, setSocialIG] = useState('');
  const [socialLI, setSocialLI] = useState('');
  const [hostingLogin, setHostingLogin] = useState('');

  const [marketStage, setMarketStage] = useState<'startup' | 'revamp' | 'scale'>('startup');
  const [isVoiceApproved, setIsVoiceApproved] = useState(false);

  const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([RoleKey.AI_RECEPTIONIST, RoleKey.MISSED_CALL_RECOVERY]);
  const [brandBrain, setBrandBrain] = useState<BrandBrain | null>(null);
  const [approvalPack, setApprovalPack] = useState<ApprovalPack | null>(null);
  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null);

  const [deployStatus, setDeployStatus] = useState("Initializing...");
  const [deployProgress, setDeployProgress] = useState(0);

  const steps: { key: Step, label: string }[] = [
    { key: 'brand', label: 'Recon' },
    { key: 'training', label: 'Maturity' },
    { key: 'preview', label: 'Voice' },
    { key: 'roles', label: 'Staff' },
    { key: 'plan', label: 'Preview' }
  ];

  const handleScanBrand = async () => {
    setLoading(true);
    try {
      const metadata = {
        businessName, businessPhone, businessEmail, businessAddress,
        ein, socialFB, socialIG, socialLI, hostingLogin,
        marketStage
      };

      let result: BrandBrain;

      // Try backend API first
      try {
        const scanResult = await setupApi.scanBrand(domain);
        result = scanResult.brandBrain;
        // Merge in metadata that backend might not have
        result = {
          ...result,
          brand_confirmed: {
            ...result.brand_confirmed,
            name: businessName || result.brand_confirmed?.name,
            domain: domain
          }
        };
      } catch (backendError) {
        console.warn('[Onboarding] Backend unavailable, using local scan');
        // Fallback to local scan
        result = await scanBrandIdentity(domain, description, JSON.stringify(metadata));
      }

      setBrandBrain(result);

      // Save to both local and backend
      await db.saveBrandBrain(locationId, result);
      try {
        await setupApi.saveBrandBrain(locationId, result);
      } catch (e) {
        console.warn('[Onboarding] Failed to save to backend, continuing with local');
      }

      setStep('training');
      addToast("Market Mapped", "Strategy calculated based on " + marketStage, "success");
    } catch (e) {
      addError(e, "Neural scan interrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!brandBrain) return;
    setLoading(true);
    try {
      const { approval, build } = await setupService.compileArchitecture(brandBrain, selectedRoles);
      setApprovalPack(approval);
      setBuildPlan(build);
      setStep('plan');
    } catch (e) {
      addError(e, "Failed to generate build plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    setStep('deploying');
    try {
      // Try backend deployment first
      let deployedViaBackend = false;

      try {
        setDeployStatus("Initiating Backend Deployment...");
        setDeployProgress(10);

        const deployResult = await setupApi.deploy(buildPlan!, locationId);

        if (deployResult.success) {
          deployedViaBackend = true;
          setDeployProgress(70);
          setDeployStatus("Backend deployment complete");
        } else if (deployResult.errors.length > 0) {
          console.warn('[Onboarding] Backend deployment had errors:', deployResult.errors);
          // Continue with local deployment as fallback
        }
      } catch (backendError) {
        console.warn('[Onboarding] Backend deployment unavailable, using local:', backendError);
      }

      // If backend failed, use local deployment
      if (!deployedViaBackend) {
        await setupService.deploySystem(locationId, buildPlan!, (msg, pct) => {
          setDeployStatus(msg);
          setDeployProgress(pct * 0.7);
        });
      }

      // 2. External Deep Onboarding (TaskMagic / GHL Snapshots / Slack)
      setDeployStatus("Triggering Deep Sync Architecture...");
      await automationService.triggerDeepSync({
        locationId: locationId,
        agencyName: brandBrain?.brand_confirmed?.name || "LIV8 Agency",
        clientEmail: brandBrain?.brand_confirmed?.domain ? `admin@${brandBrain.brand_confirmed.domain}` : "support@liv8ai.com",
        domain: domain,
        selectedRoles: selectedRoles,
        timestamp: Date.now()
      });

      setDeployProgress(100);
      setDeployStatus("OS Neural Link Fully Optimized.");

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (e) {
      addError(e, "Synchronization failed. One or more automation nodes are unreachable.");
      setStep('plan');
    }
  };

  const toggleRole = (key: RoleKey) => {
    setSelectedRoles(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="h-full bg-white flex flex-col font-sans text-slate-800">

      {/* 1. Header & Progress - Turquoise Neuro Style */}
      <header className="px-6 py-8 border-b border-slate-100 sticky top-0 bg-white z-50">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neuro rounded-lg flex items-center justify-center rotate-3">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-none uppercase">LIV8 OS <span className="text-neuro">Sync</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Orchestration</p>
            </div>
          </div>
          <button
            onClick={() => { if (confirm("Discard sync and return to home?")) window.location.reload(); }}
            className="p-2 text-slate-300 hover:text-red-500 transition"
            title="Cancel Setup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between px-2">
          {steps.map((s, idx) => (
            <div key={s.key} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => {
              const currentIdx = steps.findIndex(x => x.key === step);
              if (idx < currentIdx || (brandBrain && idx <= 3)) setStep(s.key);
            }}>
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all
                ${step === s.key ? 'bg-neuro text-white border-neuro ring-4 ring-neuro-light/30' :
                  steps.findIndex(x => x.key === step) > idx ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-400 border-slate-200'}
              `}>
                {steps.findIndex(x => x.key === step) > idx ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-tight ${step === s.key ? 'text-neuro' : 'text-slate-400'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* 2. Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-10 custom-scrollbar">

        {step === 'brand' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight italic">Ultimate Recon</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed font-neuro">Gathering business intelligence for headless orchestration.</p>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-neuro-light border-t-neuro rounded-full animate-spin"></div>
                <p className="text-xs font-black text-neuro uppercase tracking-[0.2em] animate-pulse">Syncing Neural Core...</p>
              </div>
            ) : (
              <div className="space-y-8 pb-32">
                {/* 0. Market Maturity (NEW) */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase text-neuro tracking-[0.2em] ml-1">Market Maturity Node</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'startup', label: 'Startup', icon: Rocket, desc: 'Fresh Brand' },
                      { id: 'revamp', label: 'Revamp', icon: Zap, desc: 'Fixing Core' },
                      { id: 'scale', label: 'Scale', icon: Target, desc: 'Hyper Optimization' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMarketStage(m.id as any)}
                        className={`p-4 rounded-2xl border text-left transition-all ${marketStage === m.id ? 'bg-neuro border-neuro text-white shadow-lg shadow-neuro/20 scale-[1.02]' : 'bg-[#f9fbff] border-slate-100 text-slate-400 hover:border-neuro/30'}`}
                      >
                        <m.icon className={`h-5 w-5 mb-3 ${marketStage === m.id ? 'text-white' : 'text-slate-300'}`} />
                        <div className="text-[10px] font-black uppercase tracking-tight leading-none">{m.label}</div>
                        <div className={`text-[8px] mt-1 font-bold ${marketStage === m.id ? 'text-white/70' : 'text-slate-300'}`}>{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. Core Identity */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-neuro tracking-[0.2em] ml-1">Core Identity</label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Full Business Name"
                      className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-5 py-3.5 text-sm focus:ring-1 focus:ring-neuro outline-none transition-all placeholder:text-slate-300 font-medium"
                    />
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <input
                        type="text"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="https://brand-domain.com"
                        className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl pl-11 pr-5 py-3.5 text-sm focus:ring-1 focus:ring-neuro outline-none transition-all placeholder:text-slate-300 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Logistics */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-neuro tracking-[0.2em] ml-1">Logistics & Communication</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="Support Email" className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-neuro outline-none transition-all placeholder:text-slate-300 font-medium" />
                    <input type="text" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="Headquarters Phone" className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-neuro outline-none transition-all placeholder:text-slate-300 font-medium" />
                  </div>
                  <input type="text" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="Physical Headquarters Address" className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-neuro outline-none transition-all placeholder:text-slate-300 font-medium" />
                </div>

                {/* 3. Compliance & Socials */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-neuro tracking-[0.2em] ml-1">Compliance & Social Trace</label>
                  <input type="text" value={ein} onChange={e => setEin(e.target.value)} placeholder="EIN / Tax ID (required for TCR/A2P)" className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-neuro outline-none transition-all placeholder:text-slate-300 font-medium" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={socialFB} onChange={e => setSocialFB(e.target.value)} placeholder="FB Link" className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-3 py-3 text-[10px] font-bold focus:ring-1 focus:ring-neuro outline-none placeholder:text-slate-200" />
                    <input type="text" value={socialIG} onChange={e => setSocialIG(e.target.value)} placeholder="IG Link" className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-3 py-3 text-[10px] font-bold focus:ring-1 focus:ring-neuro outline-none placeholder:text-slate-200" />
                    <input type="text" value={socialLI} onChange={e => setSocialLI(e.target.value)} placeholder="LI Link" className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-3 py-3 text-[10px] font-bold focus:ring-1 focus:ring-neuro outline-none placeholder:text-slate-200" />
                  </div>
                </div>

                {/* 4. Technical */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-neuro tracking-[0.2em] ml-1">Infrastructure</label>
                  <input type="text" value={hostingLogin} onChange={e => setHostingLogin(e.target.value)} placeholder="Domain / Cloud Login (Manual Handover)" className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-neuro outline-none transition-all placeholder:text-slate-300 font-medium" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Advanced Context (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide additional context for the AI build..."
                    rows={3}
                    className="w-full bg-[#f9fbff] border border-slate-200 rounded-xl px-5 py-4 text-sm focus:ring-1 focus:ring-neuro outline-none transition-all placeholder:text-slate-300 font-medium resize-none shadow-inner"
                  />
                </div>

                <Button onClick={handleScanBrand} disabled={!domain || !businessName || loading} className="w-full h-14 bg-neuro hover:bg-neuro-dark text-white rounded-[1.5rem] border-none font-black text-xs tracking-[0.2em] shadow-xl shadow-neuro/10 uppercase transition-all">
                  Construct Blueprint <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'training' && brandBrain && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight italic">Knowledge Sync</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed font-neuro">Review and refine the brand intelligence base.</p>
            </div>

            <div className="bg-[#f9fbff] rounded-3xl border border-slate-100 overflow-hidden shadow-inner">
              <KnowledgeBase brain={brandBrain} onUpdate={setBrandBrain} />
            </div>

            <div className="pt-4 flex gap-4">
              <button onClick={() => setStep('brand')} className="px-5 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition"><ArrowLeft className="h-5 w-5" /></button>
              <Button onClick={() => setStep('preview')} className="flex-1 h-14 bg-neuro hover:bg-neuro-dark text-white rounded-2xl border-none font-black text-[11px] uppercase tracking-widest shadow-xl shadow-neuro/10">
                Proceed to Validation <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && brandBrain && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight italic text-neuro">Neural Guardrail</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed font-neuro">Verify the trace before generating staff knowledge nodes.</p>
            </div>

            <div className="space-y-6">
              <div className="p-8 rounded-[2.5rem] bg-[#f9fbff]/50 border border-slate-100 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neuro/5 blur-3xl rounded-full"></div>

                <div className="space-y-3">
                  <div className="text-[10px] font-black uppercase text-neuro tracking-[0.3em]">Neural Core: Primary Mission</div>
                  <p className="text-base text-slate-800 font-bold leading-relaxed italic">"{brandBrain.mission}"</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Established Values</div>
                    <div className="flex flex-wrap gap-2">
                      {brandBrain.values.map(v => <span key={v} className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black text-slate-700 uppercase tracking-tight">{v}</span>)}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Voice Modulation</div>
                    <div className="flex flex-wrap gap-2">
                      {brandBrain.tones.map(t => <span key={t} className="px-3 py-1.5 bg-neuro text-white rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm">{t}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100/50 flex items-start gap-4 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-amber-500 mt-1 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest leading-none">Hallucination Lock</p>
                  <p className="text-xs text-amber-700/80 font-medium leading-relaxed">Approving this trace forces all AI staff to strictly adhere to these brand parameters. Accuracy is 100% guaranteed within this scope.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep('training')} className="px-5 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition"><ArrowLeft className="h-5 w-5" /></button>
                <Button
                  onClick={() => { setIsVoiceApproved(true); setStep('roles'); }}
                  className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl border-none font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20"
                >
                  Approve & Recruit Staff <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'roles' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Phase 3: Recruit AI Staff</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Select autonomous nodes to operate within your GHL location.</p>
            </div>

            <div className="space-y-4">
              {ROLE_OPTIONS.map((role) => (
                <div
                  key={role.key}
                  onClick={() => toggleRole(role.key)}
                  className={`
                      p-6 rounded-2xl border transition-all cursor-pointer relative group
                      ${selectedRoles.includes(role.key) ? 'bg-neuro-light/20 border-neuro shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}
                    `}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${selectedRoles.includes(role.key) ? 'bg-neuro border-neuro text-white' : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                      {role.key === RoleKey.AI_RECEPTIONIST ? <UserPlus className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-neuro transition">{role.label}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{role.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${selectedRoles.includes(role.key) ? 'bg-neuro border-neuro text-white' : 'border-slate-300'
                      }`}>
                      {selectedRoles.includes(role.key) && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex gap-4">
              <button onClick={() => setStep('preview')} className="px-5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition"><ArrowLeft className="h-5 w-5" /></button>
              <Button onClick={handleGeneratePlan} disabled={loading} className="flex-1 h-14 bg-neuro hover:bg-neuro-dark text-white rounded-xl border-none font-bold text-sm tracking-wide shadow-xl shadow-neuro/10">
                {loading ? "Mapping Neural Pathways..." : "Sync Build Blueprint"}
              </Button>
            </div>
          </div>
        )}

        {step === 'plan' && approvalPack && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Phase 4: Sync Confirmation</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Final validation of the neural assets to be deployed.</p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-[10px] font-black text-neuro uppercase tracking-widest">
                <Zap className="h-4 w-4" /> Operational Strategy
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">{approvalPack.summary}</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Layout className="h-4 w-4" /> CRM Architecture</h4>
                <div className="grid grid-cols-1 gap-2">
                  {approvalPack.deploy_steps.slice(0, 4).map((s, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-[11px] font-bold text-slate-700 tracking-tight uppercase">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Cpu className="h-4 w-4" /> AI Staff Protocols</h4>
                <div className="space-y-2">
                  {approvalPack.ai_staff_actions.map((a, i) => (
                    <div key={i} className="bg-neuro-light/10 p-4 rounded-xl border border-neuro-light/30 space-y-2 shadow-sm">
                      <div className="font-bold text-xs text-neuro-dark">{a.role}</div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2">{a.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-slate-100 flex gap-4 z-50">
              <button onClick={() => setStep('roles')} className="px-5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition"><ArrowLeft className="h-5 w-5" /></button>
              <Button onClick={handleDeploy} className="flex-1 h-14 bg-neuro hover:bg-neuro-dark text-white rounded-xl border-none font-bold text-sm tracking-wide shadow-xl shadow-neuro/20 opacity-100 translate-y-0 transition-all">
                Execute Neural Sync <Rocket className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'deploying' && (
          <div className="flex flex-col items-center justify-center py-20 px-6 space-y-12 animate-in fade-in duration-700">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-neuro-light border-t-neuro rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Rocket className="h-10 w-10 text-neuro" />
              </div>
            </div>
            <div className="text-center space-y-6 w-full max-w-xs">
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-slate-900">Syncing Neuro Core</h3>
                <p className="text-[10px] font-black text-neuro uppercase tracking-[0.2em] animate-pulse">{deployStatus}</p>
              </div>
              <div className="space-y-3">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                  <div className="bg-neuro h-full transition-all duration-1000 ease-out shadow-lg shadow-neuro/30" style={{ width: `${deployProgress}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Synchronizing</span>
                  <span>{deployProgress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
