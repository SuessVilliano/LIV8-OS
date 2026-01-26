
import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { BrandBrain, KnowledgeItem } from '../types';
import { useError } from '../contexts/ErrorContext';

interface KnowledgeBaseProps {
  brain: BrandBrain;
  onUpdate: (updatedBrain: BrandBrain) => void;
  readOnly?: boolean;
}

type Tab = 'upload' | 'write' | 'record';

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ brain, onUpdate, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { addToast } = useError();

  const handleAddItem = (item: KnowledgeItem) => {
    const updated = {
      ...brain,
      knowledge_base: [item, ...(brain.knowledge_base || [])]
    };
    onUpdate(updated);
    addToast("Knowledge Added", `"${item.title}" added to Brand Brain.`, "success");
  };

  const handleDelete = (id: string) => {
    const updated = {
      ...brain,
      knowledge_base: brain.knowledge_base.filter(i => i.id !== id)
    };
    onUpdate(updated);
  };

  // --- File Upload ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate upload
    setTimeout(() => {
      handleAddItem({
        id: crypto.randomUUID(),
        type: 'file',
        title: file.name,
        content: "Binary content simulated",
        dateAdded: Date.now(),
        status: 'indexed'
      });
    }, 800);
  };

  // --- Text Note ---
  const handleAddNote = () => {
    if (!textInput.trim()) return;
    handleAddItem({
      id: crypto.randomUUID(),
      type: 'text',
      title: `Note: ${textInput.substring(0, 20)}...`,
      content: textInput,
      dateAdded: Date.now(),
      status: 'indexed'
    });
    setTextInput('');
  };

  // --- Voice Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          handleAddItem({
            id: crypto.randomUUID(),
            type: 'audio',
            title: `Voice Memo ${new Date().toLocaleTimeString()}`,
            content: "Audio Blob simulated",
            dateAdded: Date.now(),
            status: 'indexed'
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      addToast("Microphone Error", "Could not access microphone.", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const kbItems = brain.knowledge_base || [];

  return (
    <div className="flex flex-col h-full">
      <div className="grid md:grid-cols-3 gap-6 h-full">
        
        {/* Left: Input Methods */}
        {!readOnly && (
          <div className="md:col-span-1 space-y-4">
            <Card className="h-full flex flex-col">
              <div className="flex border-b border-slate-100 mb-4">
                <button onClick={() => setActiveTab('upload')} className={`flex-1 pb-2 text-xs font-bold uppercase ${activeTab === 'upload' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Upload</button>
                <button onClick={() => setActiveTab('write')} className={`flex-1 pb-2 text-xs font-bold uppercase ${activeTab === 'write' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Write</button>
                <button onClick={() => setActiveTab('record')} className={`flex-1 pb-2 text-xs font-bold uppercase ${activeTab === 'record' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Voice</button>
              </div>

              <div className="flex-1">
                {activeTab === 'upload' && (
                  <div className="h-full flex flex-col justify-center items-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors relative">
                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <span className="text-4xl mb-2">📄</span>
                    <p className="text-sm font-medium text-slate-600">Drop PDF or Docx</p>
                    <p className="text-xs text-slate-400 mt-1">Pricing, SOPs, Menus</p>
                  </div>
                )}

                {activeTab === 'write' && (
                  <div className="h-full flex flex-col">
                    <textarea 
                      className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Paste instructions, scripts, or rules here..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                    <Button onClick={handleAddNote} className="mt-3" disabled={!textInput.trim()}>Add Note</Button>
                  </div>
                )}

                {activeTab === 'record' && (
                  <div className="h-full flex flex-col justify-center items-center bg-slate-50 rounded-lg border border-slate-100">
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                      <span className="text-3xl text-white">🎙️</span>
                    </button>
                    <p className="mt-4 text-sm font-medium text-slate-700">
                      {isRecording ? "Recording... (Tap to stop)" : "Tap to record instructions"}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 text-center max-w-[200px]">
                      "Hey Agent, when someone asks about pricing, tell them it depends on square footage..."
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Right: Library */}
        <div className={readOnly ? "col-span-3" : "md:col-span-2"}>
          <Card className="h-full flex flex-col bg-slate-50/50">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>📚</span> Knowledge Library ({kbItems.length})
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {kbItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p>No knowledge added yet.</p>
                  <p className="text-sm">Upload docs or record voice notes to train your agents.</p>
                </div>
              ) : (
                kbItems.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between group hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'audio' ? 'bg-purple-100 text-purple-600' :
                        item.type === 'file' ? 'bg-blue-100 text-blue-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        {item.type === 'audio' ? '🔊' : item.type === 'file' ? '📄' : '📝'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-slate-900 text-sm truncate">{item.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <span>{new Date(item.dateAdded).toLocaleDateString()}</span>
                           <span>•</span>
                           <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">{item.status}</span>
                        </div>
                      </div>
                    </div>
                    {!readOnly && (
                      <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        🗑️
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
