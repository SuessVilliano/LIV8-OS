
import React, { useState } from 'react';
import { Button } from './ui/Button';

interface HelpDocsProps {
  onBack: () => void;
}

const DOCS_DATA = [
  {
    category: "Getting Started",
    items: [
      {
        id: "readme",
        title: "ReadMe / Introduction",
        content: `
# Welcome to LIV8 OS

LIV8 OS is the world's first **Setup Operating System** for GoHighLevel agencies. We replace manual virtual assistants with intelligent agents that configure, monitor, and optimize your sub-accounts automatically.

### How it works
1. **Connect**: Link your GHL Location via OAuth.
2. **Scan**: We analyze your website to build a "Brand Brain".
3. **Hire**: Select AI roles (Receptionist, Review Collector, etc.).
4. **Deploy**: Our MCP (Model Context Protocol) engine builds pipelines, workflows, and custom values in real-time.

### Key Features
* **Setup OS**: One-click deployment of complex systems.
* **AEO Optimization**: Optimize for AI search results.
* **Voice Operator**: Talk to your CRM to execute tasks.
        `
      },
      {
        id: "installation",
        title: "Chrome Extension Installation",
        content: `
# Installing the Chrome Extension

To unlock the full power of the Voice Operator inside GoHighLevel, you need our browser extension.

### Steps:
1. Download the \`liv8-extension.zip\` from the dashboard (or Chrome Web Store).
2. Go to \`chrome://extensions\`.
3. Enable **Developer Mode** (top right toggle).
4. Drag and drop the file or click "Load Unpacked".
5. Pin the LIV8 icon to your browser bar.

**Note:** The extension requires microphone permissions to enable voice commands.
        `
      }
    ]
  },
  {
    category: "AI Staff Roles",
    items: [
      {
        id: "receptionist",
        title: "AI Receptionist",
        content: `
# AI Receptionist

The Receptionist is your front-line defense. It connects to your main Twilio number and handles inbound calls using Retell AI or Bland AI integrations (configured via LIV8).

* **Capabilities**: Answers FAQs, filters spam, forwards warm leads.
* **Configuration**: Uses the "Brand Brain" tone profile.
        `
      },
      {
        id: "recovery",
        title: "Missed Call Recovery",
        content: `
# Missed Call Recovery

Never lose a lead to voicemail. This agent detects a "Call Status: No Answer" event and immediately triggers an SMS.

> "Sorry I missed you! I'm on the other line helping a customer. How can I help? - [Name]"

It then enters a qualification conversation automatically.
        `
      }
    ]
  },
  {
    category: "Voice Access",
    items: [
      {
        id: "voice-commands",
        title: "Voice Commands",
        content: `
# Using Voice Control

LIV8 supports natural language voice commands. Click the microphone icon in the Operator panel.

### Examples:
* *"Send an SMS to John Doe saying his appointment is confirmed."*
* *"Create a task for Sarah to follow up on this lead tomorrow."*
* *"What is the sentiment of the last conversation with this contact?"*

The system converts speech to text and executes the Action Plan securely.
        `
      }
    ]
  }
];

const HelpDocs: React.FC<HelpDocsProps> = ({ onBack }) => {
  const [activeItem, setActiveItem] = useState(DOCS_DATA[0].items[0]);

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">DOCS</span>
          </div>
          <h1 className="font-bold text-slate-900">LIV8 Knowledge Base</h1>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back to App
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto hidden md:block">
          <div className="p-4 space-y-6">
            {DOCS_DATA.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  {section.category}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveItem(item)}
                        className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                          activeItem.id === item.id 
                            ? 'bg-blue-100 text-blue-700 font-medium' 
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 md:p-12">
          <div className="max-w-3xl mx-auto prose prose-slate">
             {/* Simple Markdown Renderer simulation */}
             {activeItem.content.split('\n').map((line, i) => {
               if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold text-slate-900 mb-6">{line.replace('# ', '')}</h1>;
               if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-slate-800 mt-8 mb-4">{line.replace('### ', '')}</h3>;
               if (line.startsWith('* ')) return <li key={i} className="list-disc ml-4 text-slate-600 mb-2">{line.replace('* ', '')}</li>;
               if (line.trim().match(/^\d\./)) return <li key={i} className="list-decimal ml-4 text-slate-600 mb-2">{line.replace(/^\d\.\s/, '')}</li>;
               if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-blue-500 pl-4 italic bg-blue-50 p-2 my-4 rounded-r text-slate-700">{line.replace('> ', '')}</blockquote>;
               if (line.trim() === '') return <br key={i} />;
               return <p key={i} className="text-slate-600 leading-7 mb-4">{line}</p>;
             })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HelpDocs;
