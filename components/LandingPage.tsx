
import React from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface LandingPageProps {
  onLaunch: () => void;
  onOpenDocs: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch, onOpenDocs }) => {
  
  const handleDownloadExtension = () => {
    // Simulate downloading extension package
    const link = document.createElement("a");
    link.href = "data:text/plain;charset=utf-8,LIV8%20Extension%20Package%20(Unpack%20in%20Developer%20Mode)";
    link.download = "liv8-extension.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("Extension downloaded! Unzip and load via chrome://extensions");
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 relative">
      
      {/* 1. Navbar - Sticky & High Z-Index */}
      <nav className="sticky top-0 z-[100] bg-white/95 backdrop-blur-xl border-b border-slate-100 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
              <span className="text-white font-bold text-sm tracking-widest">LIV8</span>
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">LIV8 OS</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onOpenDocs} className="hidden md:block text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              How it Works
            </button>
            <Button onClick={onLaunch} className="shadow-xl shadow-blue-500/10">
              Launch OS
            </Button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section - Added padding top to prevent cut-off */}
      <section className="relative pt-12 md:pt-24 pb-20 md:pb-32 overflow-hidden flex-shrink-0">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-100 rounded-full blur-[80px] md:blur-[120px] mix-blend-multiply"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-100 rounded-full blur-[80px] md:blur-[120px] mix-blend-multiply"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-sm font-medium mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>The future of Agency Automation is here</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1]">
            Turn HighLevel into a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Self-Driving Revenue Engine.</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 md:mb-12 leading-relaxed">
            Stop selling empty sub-accounts. LIV8 OS replaces manual setup with autonomous AI agents. Scan your client's brand, recruit their AI staff, and deploy a fully operational business in 120 seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={onLaunch} className="h-14 px-10 text-lg rounded-full shadow-xl shadow-blue-600/20 w-full sm:w-auto hover:scale-105 transition-transform">
              Deploy Your First OS
            </Button>
            <button onClick={onOpenDocs} className="flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 font-medium px-6 py-4 w-full sm:w-auto">
              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">▶</span>
              Watch the Demo
            </button>
          </div>
        </div>
      </section>

      {/* 3. The Problem ("Why") */}
      <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">The "Empty CRM" Epidemic</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Agencies face 40% churn in the first 90 days. Why? Because giving a client a tool they don't know how to use doesn't solve their problem.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-2xl mb-6">⏳</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Setup Paralysis</h3>
              <p className="text-slate-500 leading-relaxed">
                You waste hours configuring custom fields, pipelines, and workflows for every new niche. It's unscalable and prone to human error.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl mb-6">📉</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Speed-to-Lead Failure</h3>
              <p className="text-slate-500 leading-relaxed">
                Your clients miss calls. Basic auto-responders feel robotic. Leads go cold instantly, and the client blames your leads.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center text-2xl mb-6">🤖</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Complexity Churn</h3>
              <p className="text-slate-500 leading-relaxed">
                HighLevel is powerful but complex. Clients get overwhelmed by the dashboard and cancel because "it's too hard to use."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. The Solution ("What") */}
      <section className="py-16 md:py-24 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="inline-flex px-3 py-1 rounded bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">The Solution</div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Meet LIV8 OS. <br/>Intelligent Infrastructure.</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                LIV8 isn't just a snapshot. It's an active operating system that understands your client's business and builds itself.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Brand Brain Technology</h4>
                    <p className="text-slate-500 mt-1">We scan the client's website and socials to create a digital DNA. Every email, SMS, and voice agent speaks with their unique tone.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Setup Autopilot</h4>
                    <p className="text-slate-500 mt-1">Our MCP engine constructs pipelines, custom values, and automations tailored to the specific niche—instantly.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Active AI Staff</h4>
                    <p className="text-slate-500 mt-1">Don't just give them software. Give them a Receptionist, a Sales Rep, and a Support Agent that work 24/7 inside the account.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 w-full relative">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl transform rotate-3 opacity-10"></div>
               <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                       <span className="text-2xl">🧠</span>
                       <div>
                         <div className="text-sm font-bold text-blue-900">Brand Brain Active</div>
                         <div className="text-xs text-blue-700">Analyzing domain structure & tone...</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100 opacity-75">
                       <span className="text-2xl">👷</span>
                       <div>
                         <div className="text-sm font-bold text-green-900">Constructing Pipeline</div>
                         <div className="text-xs text-green-700">Stage: 'Qualified Opportunity' created</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100 opacity-50">
                       <span className="text-2xl">📞</span>
                       <div>
                         <div className="text-sm font-bold text-purple-900">Deploying Voice Agent</div>
                         <div className="text-xs text-purple-700">Connecting to Twilio stream...</div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Chrome Extension ("How to Operate") */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative flex-shrink-0">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px] opacity-20"></div>
         
         <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 order-2 md:order-1 w-full">
               <div className="relative rounded-xl overflow-hidden shadow-2xl border border-slate-700 group">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10"></div>
                  <div className="aspect-video bg-slate-800 flex items-center justify-center">
                    <span className="text-6xl">🖥️</span>
                  </div>
                  {/* Floating Elements */}
                  <div className="absolute bottom-6 right-6 z-20 bg-white text-slate-900 p-4 rounded-lg shadow-xl flex items-center gap-3 animate-bounce">
                    <span className="text-2xl">🎙️</span>
                    <div className="text-left">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Voice Command</div>
                      <div className="text-sm font-bold">"Book an appointment for Sarah."</div>
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="flex-1 space-y-8 order-1 md:order-2">
               <h2 className="text-3xl md:text-4xl font-bold">Operate with Voice.<br/>The Setup is just the beginning.</h2>
               <p className="text-slate-400 text-lg">
                 Once the OS is deployed, use our Chrome Extension to manage the business. Talk to your CRM like a human.
               </p>
               <ul className="space-y-4">
                 <li className="flex items-start gap-3">
                   <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold mt-1">✓</div>
                   <span className="text-slate-300">Injects an AI Operator button directly into the HighLevel sidebar.</span>
                 </li>
                 <li className="flex items-start gap-3">
                   <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold mt-1">✓</div>
                   <span className="text-slate-300">Context-aware: It reads the screen (Contact info, Opportunity value).</span>
                 </li>
                 <li className="flex items-start gap-3">
                   <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold mt-1">✓</div>
                   <span className="text-slate-300">Executes complex tasks securely via vault tokens.</span>
                 </li>
               </ul>
               <Button onClick={handleDownloadExtension} className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-500/30">
                 Install Chrome Extension
               </Button>
            </div>
         </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-white border-t border-slate-100 py-12 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-900 font-extrabold tracking-widest text-lg">LIV8 OS</span>
            <span className="text-xs text-slate-400 ml-2">© 2024 Automation Inc.</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-500">
            <button onClick={onOpenDocs} className="hover:text-slate-900 transition-colors">Documentation</button>
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
