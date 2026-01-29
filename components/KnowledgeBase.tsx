import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { BrandBrain, KnowledgeItem } from '../types';
import { useError } from '../contexts/ErrorContext';
import {
  FileText,
  PenTool,
  Mic,
  Trash2,
  CheckCircle2,
  BookOpen,
  CloudUpload,
  Plus
} from 'lucide-react';

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
    addToast("Knowledge Added", `"${item.title}" sync complete.`, "success");
  };

  const handleDelete = (id: string) => {
    const updated = {
      ...brain,
      knowledge_base: (brain.knowledge_base || []).filter(i => i.id !== id)
    };
    onUpdate(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTimeout(() => {
      handleAddItem({
        id: crypto.randomUUID(),
        type: 'file',
        title: file.name,
        content: "Syncing data...",
        dateAdded: Date.now(),
        status: 'indexed'
      });
    }, 800);
  };

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
            title: `Voice Instruction ${new Date().toLocaleTimeString()}`,
            content: "Audio sync...",
            dateAdded: Date.now(),
            status: 'indexed'
          });
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      addToast("Mic Blocked", "Allow microphone access in manifest/browser settings.", "error");
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
    <div className="flex flex-col h-full bg-white text-slate-800">
      <div className="grid md:grid-cols-3 gap-6 h-full">
        {!readOnly && (
          <div className="md:col-span-1 space-y-4">
            <Card className="h-full flex flex-col border-slate-100 shadow-sm">
              <div className="flex border-b border-slate-50 mb-4 p-1">
                <button onClick={() => setActiveTab('upload')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'text-neuro border-b-2 border-neuro' : 'text-slate-300'}`}>Upload</button>
                <button onClick={() => setActiveTab('write')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'write' ? 'text-neuro border-b-2 border-neuro' : 'text-slate-300'}`}>Write</button>
                <button onClick={() => setActiveTab('record')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'record' ? 'text-neuro border-b-2 border-neuro' : 'text-slate-300'}`}>Voice</button>
              </div>

              <div className="flex-1 px-4 pb-4">
                {activeTab === 'upload' && (
                  <div className="h-full flex flex-col justify-center items-center border-2 border-dashed border-slate-100 rounded-2xl bg-[#F9FBFF] hover:bg-neuro-light/10 transition-all group relative overflow-hidden">
                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <CloudUpload className="h-6 w-6 text-neuro" />
                    </div>
                    <p className="text-xs font-bold text-slate-600">Drop PDF / Assets</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">SOPs, Menus, Rules</p>
                  </div>
                )}

                {activeTab === 'write' && (
                  <div className="h-full flex flex-col space-y-3">
                    <textarea
                      className="flex-1 w-full bg-[#fcfdfe] border border-slate-100 rounded-xl p-4 text-xs resize-none focus:ring-1 focus:ring-neuro outline-none placeholder:text-slate-300"
                      placeholder="Input core instructions or rules..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                    <Button onClick={handleAddNote} className="h-10 bg-neuro hover:bg-neuro-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl border-none shadow-lg shadow-blue-500/10" disabled={!textInput.trim()}>
                      <Plus className="h-3 w-3 mr-2" /> Commit Brain
                    </Button>
                  </div>
                )}

                {activeTab === 'record' && (
                  <div className="h-full flex flex-col justify-center items-center bg-[#F9FBFF] rounded-2xl border border-slate-50">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl group ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-neuro hover:bg-neuro-dark'}`}
                    >
                      <Mic className={`h-8 w-8 text-white ${isRecording ? '' : 'group-hover:scale-110 transition-transform'}`} />
                    </button>
                    <p className={`mt-6 text-[10px] font-black uppercase tracking-widest ${isRecording ? 'text-red-500' : 'text-slate-400'}`}>
                      {isRecording ? "Recording Sync..." : "Tap to Sync Voice"}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        <div className={readOnly ? "col-span-3" : "md:col-span-2"}>
          <Card className="h-full flex flex-col bg-[#F9FBFF]/50 border-slate-100/50 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-neuro" /> Knowledge Core ({kbItems.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-5 custom-scrollbar">
              {kbItems.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-slate-200" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Brain is currently empty</p>
                </div>
              ) : (
                kbItems.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-50 rounded-xl p-4 flex items-center justify-between group hover:border-neuro-light transition-all shadow-sm">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'audio' ? 'bg-blue-50 text-neuro' :
                          item.type === 'file' ? 'bg-indigo-50 text-indigo-500' :
                            'bg-emerald-50 text-emerald-500'
                        }`}>
                        {item.type === 'audio' ? <Mic className="h-5 w-5" /> : item.type === 'file' ? <FileText className="h-5 w-5" /> : <PenTool className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-xs truncate uppercase tracking-tight">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(item.dateAdded).toLocaleDateString()}</span>
                          <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded uppercase">{item.status}</span>
                        </div>
                      </div>
                    </div>
                    {!readOnly && (
                      <button onClick={() => handleDelete(item.id)} className="text-slate-200 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
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
