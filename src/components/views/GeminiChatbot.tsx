import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  Bot,
  User,
  Send,
  Sparkles,
  Trash2,
  Mic,
  MicOff,
  Zap,
  Activity,
  Compass,
  CheckCircle2,
  Copy,
  BrainCircuit,
  Flame,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface PersonaOption {
  id: string;
  name: string;
  title: string;
  badge: string;
  complexity: 'fast' | 'general' | 'complex';
  model: string;
  icon: typeof Bot;
  accentColor: string;
  description: string;
  quickPrompts: string[];
}

const PERSONAS: PersonaOption[] = [
  {
    id: 'medresq_engine',
    name: 'MEDRESQ AI Prediction Engine',
    title: 'Clinical Supply Chain & Reallocation Engine',
    badge: 'Clinical Engine',
    complexity: 'general',
    model: 'gemini-3.8-flash',
    icon: Sparkles,
    accentColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    description: 'Calculates stock depletion, 30-50% seasonal surge adjustment, safe/warning/critical rating, and smart lateral reallocation in structured JSON.',
    quickPrompts: [
      'Analyze PHC Osian during May heatwave (+45% surge) for ORS, IV Saline, Oxytocin, Paracetamol IV, and Anti-Snake Venom with CHC Baori within 30 km.',
      'Post-monsoon surge prediction for Anti-Snake Venom and IV Fluids at PHC Balesar.',
      'Evaluate immediate stockout risk and lateral reallocation for Oxytocin and Paracetamol at PHC Tinwari.'
    ]
  },
  {
    id: 'clinical_officer',
    name: 'Clinical & Stock Officer',
    title: 'PHC Medical Operations',
    badge: 'General Tasks',
    complexity: 'general',
    model: 'gemini-3.8-flash',
    icon: Bot,
    accentColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    description: 'Specialized in drug inventory, FEFO batch rotation, stockout triage, and PHC operational guidance.',
    quickPrompts: [
      'Evaluate ORS & IV Saline stockout risk given current daily consumption.',
      'Draft an RMSCL emergency indent for anti-snake venom and paracetamol.',
      'What are the cold chain protocols for storing rabies vaccines at 2°C to 8°C?'
    ]
  },
  {
    id: 'epidemiologist',
    name: 'District Epidemiologist',
    title: 'Outbreak & Vector Forecaster',
    badge: 'Complex Reasoning',
    complexity: 'complex',
    model: 'gemini-3.1-pro-preview',
    icon: BrainCircuit,
    accentColor: 'text-purple-700 bg-purple-50 border-purple-200',
    description: 'High-reasoning epidemiological modeling, monsoon vector-borne surge calculations, and heatstroke risk projection.',
    quickPrompts: [
      'Model the expected dengue surge curve in Osian block over the next 3 weeks.',
      'Calculate surge inpatient bed capacity needed for a 43°C heatwave week.',
      'Analyze correlation between monsoon rainfall anomalies and waterborne diarrheal outbreaks.'
    ]
  },
  {
    id: 'rapid_dispatch',
    name: 'Rapid Dispatch & Triage',
    title: 'Instant Action Checklist',
    badge: 'Ultra Fast',
    complexity: 'fast',
    model: 'gemini-3.1-flash-lite',
    icon: Zap,
    accentColor: 'text-amber-700 bg-amber-50 border-amber-200',
    description: 'Low-latency immediate action checklists, urgent inter-facility ambulance transfer, and fast restock protocols.',
    quickPrompts: [
      'Immediate 60-second stabilization checklist for severe heat stroke patient.',
      'Emergency protocol for transferring critical respiratory distress to MDM Jodhpur.',
      'Rapid checklist: Stock borrowing protocol from nearest CHC Baori.'
    ]
  }
];

export const GeminiChatbot: React.FC = () => {
  const {
    chatMessages,
    isChatLoading,
    sendChatMessage,
    clearChatHistory,
    currentUser,
    transcribeAudio,
    isTranscribing,
    showNotification
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('medresq_engine');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activePersona = PERSONAS.find(p => p.id === selectedPersonaId) || PERSONAS[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isChatLoading) return;

    const textToSend = inputText;
    setInputText('');
    await sendChatMessage(textToSend, activePersona.id, activePersona.complexity);
  };

  const handleQuickPrompt = async (prompt: string) => {
    setInputText('');
    await sendChatMessage(prompt, activePersona.id, activePersona.complexity);
  };

  // Microphone recording for voice prompt
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        const transcript = await transcribeAudio(audioBlob);
        if (transcript) {
          setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recorder.start();
      setIsRecording(true);
      showNotification('Recording voice query... Click stop when finished.');
    } catch (err) {
      console.error('Microphone error:', err);
      showNotification('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('Response copied to clipboard.');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Bot className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                MEDRESQ Gemini Multi-Turn Intelligence
                <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  AI ASSISTANT
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-turn clinical and logistics reasoning with role-tailored system instructions & model routing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Synced to Firestore as <strong>{currentUser.displayName || currentUser.email?.split('@')[0]}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Local Session (Sign in with Google to sync history)</span>
            </div>
          )}

          <button
            type="button"
            onClick={clearChatHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Role / Persona Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Select AI Operational Persona & Routing Model
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PERSONAS.map(p => {
            const Icon = p.icon;
            const isSelected = p.id === selectedPersonaId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPersonaId(p.id)}
                className={`text-left p-3.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-md ${p.accentColor}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-semibold text-sm text-slate-900">{p.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    p.complexity === 'complex' ? 'bg-purple-100 text-purple-800' :
                    p.complexity === 'fast' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{p.description}</p>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Engine:</span>
                  <span className="font-semibold text-slate-700">{p.model}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Thread */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[560px]">
        {/* Thread Header */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-700">
              Active Persona: <strong className="text-slate-900">{activePersona.title}</strong>
            </span>
            <span className="text-[11px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
              Model: {activePersona.model}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {chatMessages.length} {chatMessages.length === 1 ? 'Message' : 'Messages'}
          </span>
        </div>

        {/* Scrollable Message List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative rounded-xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                  }`}
                >
                  {/* Model & Timestamp tag */}
                  <div className="flex items-center justify-between gap-3 text-[10px] mb-1.5 opacity-70">
                    <span className="font-semibold">
                      {isUser ? (currentUser?.displayName || 'PHC Operator') : (msg.modelUsed || 'MEDRESQ AI')}
                    </span>
                    <span className="font-mono">{msg.timestamp}</span>
                  </div>

                  {/* Body */}
                  <div className="whitespace-pre-wrap space-y-1">
                    {msg.content}
                  </div>

                  {/* Message Action Bar (Copy) */}
                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="text-[10px] font-mono text-slate-400">
                        {msg.modelUsed}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(msg.content)}
                        className="p-1 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
                        title="Copy text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading bubble */}
          {isChatLoading && (
            <div className="flex gap-3 max-w-md mr-auto animate-in fade-in">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-100 text-slate-700 rounded-xl rounded-tl-none border border-slate-200 px-4 py-3 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-slate-500 ml-1">Analyzing operational guidelines via {activePersona.model}...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggested Prompts */}
        <div className="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">Suggested:</span>
          {activePersona.quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickPrompt(p)}
              className="whitespace-nowrap px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-700 hover:border-emerald-500 hover:text-emerald-800 hover:bg-emerald-50/40 transition-colors text-xs"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            {/* Microphone Button (Audio Transcription with gemini-3.5-transcribe) */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`p-2.5 rounded-lg border transition-all shrink-0 ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
              title={isRecording ? 'Stop Recording' : 'Dictate with Microphone (gemini-3.5-transcribe)'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Input field */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask ${activePersona.name} (${activePersona.model})...`}
              disabled={isChatLoading || isTranscribing}
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isChatLoading}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-slate-400 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shrink-0 shadow-xs"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          {isTranscribing && (
            <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
              <span>Transcribing your audio input via <strong>gemini-3.5-transcribe</strong>...</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
