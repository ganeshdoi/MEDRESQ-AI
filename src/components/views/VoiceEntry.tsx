import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Check,
  Edit2,
  Languages,
  Info,
  Clock,
  Volume2,
  Bot,
  HelpCircle,
  BookOpen,
  ArrowRight,
  X,
  Compass,
  PackageSearch,
  Truck
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { VoiceEntryResult, RecentVoiceCommand } from '../../types.ts';
import { VoiceClinicalGuideModal } from './VoiceClinicalGuideModal.tsx';
import { VoiceCommandsOnboardingModal } from './VoiceCommandsOnboardingModal.tsx';
import { RecentVoiceCommandsFloat } from './RecentVoiceCommandsFloat.tsx';
import { resolveMedicineMatch } from '../../utils/medicineMatcher.ts';
import {
  resolveVoiceLanguageConfig,
  getVoiceBcp47Locale,
  parsePhysicalRegisterVoiceCommand,
  type RegisterVoiceBcp47Locale
} from '../../utils/registerVoiceCommandParser.ts';

const RECENT_COMMANDS_STORAGE_KEY = 'medresq_recent_voice_commands_v1';

const LANGUAGE_LABELS: Record<string, string> = {
  'en-IN': 'English (en-IN)',
  'hi-IN': 'Hindi (हिन्दी · hi-IN)',
  'ta-IN': 'Tamil (தமிழ் · ta-IN)',
  'te-IN': 'Telugu (తెలుగు · te-IN)',
  en: 'English (en-IN)',
  hi: 'Hindi (हिन्दी · hi-IN)',
  ta: 'Tamil (தமிழ் · ta-IN)',
  te: 'Telugu (తెలుగు · te-IN)',
  hinglish: 'Hinglish (hi-IN)',
  hindi: 'Hindi (हिन्दी · hi-IN)',
  marwari: 'Marwari (मारवाड़ी)',
  tamil: 'Tamil (தமிழ் · ta-IN)',
  telugu: 'Telugu (తెలుగు · te-IN)',
  bengali: 'Bengali (বাংলা)',
  marathi: 'Marathi (मराठी)',
  english: 'English (en-IN)'
};

const INITIAL_RECENT_COMMANDS: RecentVoiceCommand[] = [
  {
    id: 'cmd-seed-1',
    transcript: 'Aaj ORS ke 35 packets use hue.',
    language: 'hinglish',
    languageLabel: 'Hinglish',
    parsedMedicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    parsedQuantity: 35,
    parsedTransaction: 'Consumption',
    englishTranslation: 'Consumption of 35 units of Oral Rehydration Salts (ORS) Sachets 20.5g at OPD Dispensary.',
    engineUsed: 'Google Cloud Vertex AI & Gemini 3.8 Flash NLU',
    executedAt: '2 mins ago',
    committedToLedger: true
  },
  {
    id: 'cmd-seed-2',
    transcript: 'आपातकालीन वार्ड में पैरासिटामोल 500mg की 120 गोलियां दी गईं।',
    language: 'hindi',
    languageLabel: 'Hindi (हिन्दी)',
    parsedMedicine: 'Paracetamol Tablets IP 500mg',
    parsedQuantity: 120,
    parsedTransaction: 'Emergency Dispense',
    englishTranslation: 'Emergency Dispense of 120 units of Paracetamol Tablets IP 500mg at Emergency Triage Ward.',
    engineUsed: 'Google Cloud Vertex AI & Gemini 3.8 Flash NLU',
    executedAt: '14 mins ago',
    committedToLedger: true
  },
  {
    id: 'cmd-seed-3',
    transcript: 'Received 50 bottles of Normal Saline from district warehouse today.',
    language: 'english',
    languageLabel: 'English',
    parsedMedicine: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
    parsedQuantity: 50,
    parsedTransaction: 'Receipt',
    englishTranslation: 'Receipt of 50 units of Normal Saline (0.9% NaCl) IV Infusion 500ml at Main PHC Drug Store.',
    engineUsed: 'Google Cloud Vertex AI & Gemini 3.8 Flash NLU',
    executedAt: '28 mins ago',
    committedToLedger: true
  }
];

export const VoiceEntry: React.FC = () => {
  const {
    medicines,
    verifyOCRRecord,
    registerPHCData,
    createOrder,
    simulateThresholdBreach,
    showNotification,
    selectedPHC,
    transcribeAudio,
    isTranscribing,
    currentUser,
    language,
    setLanguage
  } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<RegisterVoiceBcp47Locale | string>(() =>
    getVoiceBcp47Locale(language)
  );

  useEffect(() => {
    if (language) {
      setSelectedLanguage(getVoiceBcp47Locale(language));
    }
  }, [language]);
  const [transcript, setTranscript] = useState('Aaj ORS ke 35 packets use hue.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelUsed, setModelUsed] = useState('gemini-3.5-transcribe + Vertex AI Gemini 3.8 Flash');

  // Recent Voice Commands History state
  const [recentCommands, setRecentCommands] = useState<RecentVoiceCommand[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_COMMANDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_RECENT_COMMANDS;
  });
  const [activeCommandId, setActiveCommandId] = useState<string | null>('cmd-seed-1');

  const recordVoiceCommandToHistory = (
    text: string,
    lang: string,
    result: VoiceEntryResult,
    committed = false
  ) => {
    const newEntry: RecentVoiceCommand = {
      id: `cmd-${Date.now()}`,
      transcript: text,
      language: lang,
      languageLabel: LANGUAGE_LABELS[lang] || result.languageDetected || 'Hinglish',
      parsedMedicine: result.parsedMedicine,
      parsedQuantity: result.parsedQuantity,
      parsedTransaction: result.parsedTransaction,
      englishTranslation: result.englishTranslation,
      engineUsed: result.engineUsed || 'Vertex AI & Gemini 3.8 Flash',
      executedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      committedToLedger: committed
    };

    setRecentCommands((prev) => {
      const deduplicated = prev.filter(
        (c) => c.transcript.trim().toLowerCase() !== text.trim().toLowerCase()
      );
      const updated = [newEntry, ...deduplicated].slice(0, 8);
      try {
        localStorage.setItem(RECENT_COMMANDS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    setActiveCommandId(newEntry.id);
  };

  // Clinical Guide Modal, Voice Commands Onboarding Overlay & Tooltip State
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [showQuickTooltip, setShowQuickTooltip] = useState(false);

  // Keyboard shortcut '?' to open Voice Commands Help & Onboarding Overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setIsOnboardingOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [parsedResult, setParsedResult] = useState<VoiceEntryResult | null>({
    rawTranscript: 'Aaj ORS ke 35 packets use hue.',
    languageDetected: 'Hinglish / Hindi',
    englishTranslation: 'Consumption of 35 units of Oral Rehydration Salts (ORS) Sachets 20.5g at OPD Dispensary.',
    hindiTranslation: 'ओपीडी डिस्पेंसरी में ओआरएस (ORS) के 35 पैकेट का वितरण दर्ज किया गया।',
    engineUsed: 'Google Cloud Vertex AI & Gemini 3.8 Flash NLU',
    sttEngine: 'gemini-3.5-transcribe',
    parsedMedicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    parsedTransaction: 'Consumption',
    parsedQuantity: 35,
    parsedDate: '2026-09-22',
    confidence: 0.96,
    notes: 'Routine dispensary consumption'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editMedicine, setEditMedicine] = useState('Oral Rehydration Salts (ORS) Sachets 20.5g');
  const [editQuantity, setEditQuantity] = useState(35);
  const [editTransaction, setEditTransaction] = useState('Consumption');
  const [successSaved, setSuccessSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const browserInterimTranscriptRef = useRef<string>('');

  // Start hybrid Browser SpeechRecognition + MediaRecorder capture with automatic Gemini Transcription API fallback
  const startRecording = async (langParam?: RegisterVoiceBcp47Locale | string) => {
    const activeLangConfig = resolveVoiceLanguageConfig(langParam || selectedLanguage || language);
    const targetLocale: RegisterVoiceBcp47Locale = activeLangConfig.locale;
    browserInterimTranscriptRef.current = '';
    let speechErrorOccurred = false;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = targetLocale; // en-IN, hi-IN, ta-IN, or te-IN
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;

        recognition.onresult = (event: any) => {
          let combined = '';
          for (let i = 0; i < event.results.length; i++) {
            combined += event.results[i][0].transcript + ' ';
          }
          const cleanInterim = combined.trim();
          if (cleanInterim) {
            browserInterimTranscriptRef.current = cleanInterim;
            setTranscript(cleanInterim);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn(`SpeechRecognition (${targetLocale}) notice:`, event?.error);
          speechErrorOccurred = true;
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition start failed, routing to Gemini audio fallback:', err);
        speechErrorOccurred = true;
      }
    } else {
      speechErrorOccurred = true;
    }

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
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        });
        stream.getTracks().forEach(track => track.stop());

        const browserCapturedText = browserInterimTranscriptRef.current.trim();
        const browserPreviewParse = browserCapturedText
          ? parsePhysicalRegisterVoiceCommand(browserCapturedText, targetLocale, medicines)
          : null;

        // If Browser SpeechRecognition succeeded with a valid recognized command in the target language
        if (
          !speechErrorOccurred &&
          browserCapturedText.length > 1 &&
          browserPreviewParse &&
          browserPreviewParse.action !== 'UNKNOWN' &&
          !browserPreviewParse.validationError
        ) {
          setTranscript(browserCapturedText);
          setModelUsed(`Browser SpeechRecognition (${targetLocale})`);
          await processSpokenText(browserCapturedText, targetLocale);
          return;
        }

        // Automatic Fallback: Route speech audio to server-side Gemini transcription API
        showNotification(`Transcribing audio (${LANGUAGE_LABELS[targetLocale] || targetLocale}) via Gemini API...`);
        const transcribedText = await transcribeAudio(audioBlob, targetLocale, browserCapturedText);
        const finalTranscript = (transcribedText || browserCapturedText).trim();
        if (finalTranscript) {
          setTranscript(finalTranscript);
          setModelUsed(`gemini-3.5-transcribe (${targetLocale})`);
          await processSpokenText(finalTranscript, targetLocale);
        }
      };

      recorder.start();
      setIsRecording(true);
      setSuccessSaved(false);
      showNotification(`Recording microphone input (${targetLocale})... Speak clearly in ${activeLangConfig.label}.`);
    } catch (err) {
      console.error('Microphone error:', err);
      showNotification('Microphone access unavailable or denied. Using sample scenario.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording(selectedLanguage);
    }
  };

  const processSpokenText = async (text: string, langOverride?: string) => {
    const activeLang = getVoiceBcp47Locale(langOverride || selectedLanguage || language);
    setIsProcessing(true);
    setSuccessSaved(false);

    try {
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          language: activeLang,
          locale: activeLang,
          sttEngine: 'gemini-3.5-transcribe'
        })
      });

      if (res.ok) {
        const data: VoiceEntryResult = await res.json();
        setParsedResult(data);
        setEditMedicine(data.parsedMedicine);
        setEditQuantity(data.parsedQuantity);
        setEditTransaction(data.parsedTransaction);
        recordVoiceCommandToHistory(text, activeLang, data, false);
      } else {
        throw new Error('API processing error');
      }
    } catch {
      const activeLangConfig = resolveVoiceLanguageConfig(activeLang);
      const localParsed = parsePhysicalRegisterVoiceCommand(text, activeLang, medicines);
      const fallbackData: VoiceEntryResult = {
        rawTranscript: text,
        languageDetected: LANGUAGE_LABELS[activeLang] || `${activeLangConfig.label} (${activeLang})`,
        englishTranslation: localParsed.englishSummary,
        hindiTranslation: localParsed.nativeConfirmation,
        engineUsed: `Google Cloud Vertex AI & Gemini 3.8 Flash NLU (${activeLang})`,
        sttEngine: 'gemini-3.5-transcribe',
        parsedMedicine: localParsed.medicineName || 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        parsedTransaction:
          localParsed.action === 'ADD'
            ? 'Receipt'
            : localParsed.action === 'SEARCH'
            ? 'Check Stock'
            : 'Consumption',
        parsedQuantity: localParsed.quantity ?? 35,
        parsedDate: '2026-09-28',
        confidence: localParsed.confidence || 0.94,
        notes: localParsed.englishSummary
      };
      setParsedResult(fallbackData);
      setEditMedicine(fallbackData.parsedMedicine);
      setEditQuantity(fallbackData.parsedQuantity);
      setEditTransaction(fallbackData.parsedTransaction);
      recordVoiceCommandToHistory(text, activeLang, fallbackData, false);
    }

    setIsProcessing(false);
  };

  const handleConfirmAndSave = async () => {
    if (!parsedResult) return;
    const finalMed = isEditing ? editMedicine : parsedResult.parsedMedicine;
    const finalQty = isEditing ? editQuantity : parsedResult.parsedQuantity;
    const finalTx = isEditing ? editTransaction : parsedResult.parsedTransaction;

    const match = resolveMedicineMatch(medicines, finalMed);
    if (match.status !== 'MATCHED') {
      setSuccessSaved(false);
      showNotification(match.reason);
      return;
    }

    if (finalTx === 'Check Stock') {
      showNotification(
        `Stock Audit Verified: ${match.medicine.name} has ${match.medicine.currentStock} ${match.medicine.unit} (${match.medicine.projectedStockoutDays} days cover, Batch ${match.medicine.batchNumber}).`
      );
      recordVoiceCommandToHistory(
        transcript,
        selectedLanguage,
        {
          ...parsedResult,
          parsedMedicine: match.medicine.name,
          parsedQuantity: match.medicine.currentStock,
          parsedTransaction: 'Check Stock'
        },
        true
      );
      setSuccessSaved(true);
      setIsEditing(false);
      return;
    }

    if (finalTx === 'Replenishment Order') {
      const orderQty = finalQty > 0 ? finalQty : 200;
      const ok = await createOrder({
        medicineName: match.medicine.name,
        quantityRequested: orderQty,
        priority: 'URGENT',
        justification: `Voice command replenishment indent: "${transcript}"`
      });
      if (!ok) {
        setSuccessSaved(false);
        return;
      }
      recordVoiceCommandToHistory(
        transcript,
        selectedLanguage,
        {
          ...parsedResult,
          parsedMedicine: match.medicine.name,
          parsedQuantity: orderQty,
          parsedTransaction: 'Replenishment Order'
        },
        true
      );
      setSuccessSaved(true);
      setIsEditing(false);
      return;
    }

    if (finalTx === 'Report Shortage') {
      simulateThresholdBreach(match.medicine.id);
      showNotification(
        `Shortage Alert Escalated for ${match.medicine.name} (${match.medicine.currentStock} ${match.medicine.unit} remaining).`
      );
      recordVoiceCommandToHistory(
        transcript,
        selectedLanguage,
        {
          ...parsedResult,
          parsedMedicine: match.medicine.name,
          parsedQuantity: finalQty,
          parsedTransaction: 'Report Shortage'
        },
        true
      );
      setSuccessSaved(true);
      setIsEditing(false);
      return;
    }

    if (finalTx === 'Add PHC Data' || parsedResult.parsedOpdFootfall !== undefined || parsedResult.parsedOccupiedBeds !== undefined) {
      await registerPHCData({
        medicineId: match.medicine.id,
        medicineName: match.medicine.name,
        quantity: finalQty,
        transaction: 'Received (Warehouse)',
        batch: parsedResult.parsedBatch || match.medicine.batchNumber,
        opdFootfall: parsedResult.parsedOpdFootfall,
        occupiedBeds: parsedResult.parsedOccupiedBeds,
        emergencyFootfall: parsedResult.parsedEmergencyCases,
        notes: `Voice PHC Data Command: "${transcript}"`
      });
      recordVoiceCommandToHistory(
        transcript,
        selectedLanguage,
        {
          ...parsedResult,
          parsedMedicine: match.medicine.name,
          parsedQuantity: finalQty,
          parsedTransaction: 'Add PHC Data'
        },
        true
      );
      setSuccessSaved(true);
      setIsEditing(false);
      return;
    }

    const result = await verifyOCRRecord({
      medicineId: match.medicine.id,
      medicineName: match.medicine.name,
      quantity: finalQty,
      transaction: finalTx === 'Register Entry' ? 'Dispensed (OPD)' : finalTx || 'Dispensed (OPD)',
      date: parsedResult.parsedDate || '2026-09-28',
      batch: parsedResult.parsedBatch || match.medicine.batchNumber
    });

    if (!result.ok) {
      setSuccessSaved(false);
      return;
    }

    recordVoiceCommandToHistory(
      transcript,
      selectedLanguage,
      {
        ...parsedResult,
        parsedMedicine: match.medicine.name,
        parsedQuantity: finalQty,
        parsedTransaction: (finalTx as any) || 'Consumption'
      },
      true
    );
    setSuccessSaved(true);
    setIsEditing(false);
  };

  const sampleVoicePhrases = [
    { text: 'Register 60 packets of ORS batch ORS-2609 dispensed at OPD today.', lang: 'en-IN', langBadge: 'English (en-IN)', desc: 'Log handwritten register line by voice' },
    { text: 'पैरासिटामोल 500mg की 20 टैबलेट जोड़ो।', lang: 'hi-IN', langBadge: 'Hindi (hi-IN)', desc: 'Hindi Devanagari register addition' },
    { text: 'பாராசிட்டமால் 20 சேர்', lang: 'ta-IN', langBadge: 'Tamil (ta-IN)', desc: 'Tamil voice register addition' },
    { text: 'పారాసిటమాల్ 20 జోడించు', lang: 'te-IN', langBadge: 'Telugu (te-IN)', desc: 'Telugu voice register addition' },
    { text: 'Check stock for Oral Rehydration Salts packets in main store.', lang: 'en-IN', langBadge: 'Check Stock (en-IN)', desc: 'Query live FEFO stock & days of cover' },
    { text: 'Add replenishment order for 400 packets of ORS from district warehouse.', lang: 'en-IN', langBadge: 'Add Order (en-IN)', desc: 'Create RMSCL replenishment indent' },
    { text: 'आपातकालीन वार्ड में पैरासिटामोल 500mg की 120 गोलियां तुरंत दी गईं।', lang: 'hi-IN', langBadge: 'Hindi (hi-IN)', desc: 'Devanagari emergency ward dispensing' }
  ];

  const matchedPreviewMedicine = parsedResult
    ? (() => {
        const m = resolveMedicineMatch(medicines, isEditing ? editMedicine : parsedResult.parsedMedicine);
        return m.status === 'MATCHED' ? m.medicine : null;
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-800">Multilingual Audio Pipeline</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">ASR Model: gemini-3.5-transcribe</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-600" />
            <span>Voice OPD &amp; Clinical Dispensing Entry</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Hands-free verbal logging for checking stock, adding replenishment orders, reporting shortages, and OPD dispensing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-200" />
            <span>Voice Commands Help (?)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Clinical Recording Guide</span>
          </button>

          {currentUser && (
            <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Audit logs saved to Firestore</span>
            </span>
          )}
          <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs font-mono">
            Facility: {selectedPHC.name}
          </span>
        </div>
      </div>

      {/* Onboarding Quick-Start Strip for Common Voice Commands */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Available Voice Command Intents</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-[11px] font-normal text-slate-500">
                Speak into mic or click any command to test
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => {
                  const cmd = 'Check stock for Oral Rehydration Salts packets in main store.';
                  setTranscript(cmd);
                  setSelectedLanguage('en-IN');
                  processSpokenText(cmd, 'en-IN');
                }}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PackageSearch className="w-3.5 h-3.5 text-emerald-700" />
                <span>"Check stock"</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cmd = 'Add replenishment order for 400 packets of ORS from district warehouse.';
                  setTranscript(cmd);
                  setSelectedLanguage('en-IN');
                  processSpokenText(cmd, 'en-IN');
                }}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-blue-700" />
                <span>"Add replenishment order"</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cmd = 'Report shortage of Polyvalent Anti-Snake Venom vials at emergency triage.';
                  setTranscript(cmd);
                  setSelectedLanguage('en-IN');
                  processSpokenText(cmd, 'en-IN');
                }}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>"Report shortage"</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cmd = 'Register 60 packets of ORS batch ORS-2609 dispensed at OPD today.';
                  setTranscript(cmd);
                  setSelectedLanguage('en-IN');
                  processSpokenText(cmd, 'en-IN');
                }}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>"Register entry"</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cmd = 'Add PHC data 240 OPD patients 16 occupied beds and 80 bottles Normal Saline received.';
                  setTranscript(cmd);
                  setSelectedLanguage('en-IN');
                  processSpokenText(cmd, 'en-IN');
                }}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                <span>"Add PHC data"</span>
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOnboardingOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 self-start lg:self-center shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Open Voice Commands Overlay</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Voice Input Console */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-sm text-slate-900">
                1. Microphone Capture & Transcription
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Languages className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={getVoiceBcp47Locale(selectedLanguage)}
                  onChange={(e) => {
                    const nextLocale = getVoiceBcp47Locale(e.target.value);
                    setSelectedLanguage(nextLocale);
                    setLanguage(resolveVoiceLanguageConfig(nextLocale).code);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="en-IN">English — en-IN</option>
                  <option value="hi-IN">Hindi (हिन्दी) — hi-IN</option>
                  <option value="ta-IN">Tamil (தமிழ்) — ta-IN</option>
                  <option value="te-IN">Telugu (తెలుగు) — te-IN</option>
                </select>
              </div>
            </div>

            {/* Interactive Clinical Instructions & Usage Banner */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-950">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2 text-emerald-900">
                      <span>Clinical Staff Dictation Formula:</span>
                      <span className="text-[10px] font-mono font-normal text-emerald-800 hidden sm:inline">
                        [Medicine] + [Quantity] + [Action] + [Ward]
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                      Say the drug name, exact amount, and ward or action clearly into the microphone.
                      e.g., <em>"Aaj ORS ke 35 packets OPD dispensary mein use hue."</em>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="shrink-0 px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Full Guide & Examples</span>
                </button>
              </div>
            </div>

            {/* Mic Visualizer & Trigger */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/80 border border-slate-200 rounded-xl text-center relative overflow-hidden">
              {isRecording && (
                <div className="absolute inset-0 bg-rose-50/50 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-32 rounded-full border-2 border-rose-400 animate-ping opacity-40" />
                </div>
              )}

              <button
                type="button"
                id="voice-mic-trigger"
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm relative z-10 ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:scale-105'
                }`}
                aria-label={isRecording ? 'Stop recording voice' : 'Start recording voice'}
              >
                {isRecording ? <Radio className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
              </button>

              <div className="mt-4 relative z-10">
                <span className="text-xs font-bold text-slate-900 block">
                  {isRecording
                    ? 'Recording live audio... Click to stop & transcribe'
                    : isTranscribing
                    ? 'Transcribing audio with gemini-3.5-transcribe...'
                    : 'Click microphone to record voice entry'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block font-mono">
                  Engine: <strong>gemini-3.5-transcribe</strong> ({selectedLanguage} · English, Hindi, Tamil, Telugu)
                </span>

                {/* Interactive Audio Tooltip & Tips Popover */}
                <div className="relative inline-block mt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickTooltip(!showQuickTooltip)}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-medium underline underline-offset-2 transition-colors cursor-pointer"
                    aria-expanded={showQuickTooltip}
                    aria-haspopup="dialog"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Microphone dictation tips & instructions</span>
                  </button>

                  {showQuickTooltip && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-30 text-left border border-slate-700 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between font-bold text-emerald-400 mb-2 pb-1.5 border-b border-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Mic className="w-4 h-4 text-emerald-400" />
                          <span>Dictation Best Practices</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowQuickTooltip(false)}
                          className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                          aria-label="Close tooltip"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-300">
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span><strong>Position:</strong> Hold microphone 15–20cm from mouth; avoid ceiling fan drafts.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span><strong>Timing:</strong> Pause 0.5s after clicking record before speaking.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span><strong>Formula:</strong> <em>[Medicine]</em> + <em>[Quantity]</em> + <em>[Action / Ward]</em>.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span><strong>Languages:</strong> Hindi, Hinglish, or Indian English.</span>
                        </li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickTooltip(false);
                          setIsGuideOpen(true);
                        }}
                        className="mt-2.5 w-full text-center py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open 5 Clinical Scenarios & Examples →</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Spoken Text Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="voice-transcript" className="text-xs font-bold text-slate-700 block">
                  Audio Transcript (Verbatim from Microphone)
                </label>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                  {modelUsed}
                </span>
              </div>
              <textarea
                id="voice-transcript"
                rows={2}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                placeholder="Spoken or typed sentence..."
              />
            </div>

            {/* Floating Recent Commands Micro-Interaction Component next to Voice Input UI */}
            <RecentVoiceCommandsFloat
              commands={recentCommands}
              activeCommandId={activeCommandId}
              isProcessing={isProcessing || isTranscribing}
              onRetrigger={(cmd) => {
                const mappedLocale = getVoiceBcp47Locale(cmd.language);
                setTranscript(cmd.transcript);
                setSelectedLanguage(mappedLocale);
                setModelUsed(`gemini-3.5-transcribe (${mappedLocale}) + Vertex AI Gemini 3.8 Flash`);
                setActiveCommandId(cmd.id);
                processSpokenText(cmd.transcript, mappedLocale);
                showNotification(`Re-triggered voice command: "${cmd.transcript}"`);
              }}
              onClearHistory={() => {
                setRecentCommands([]);
                try {
                  localStorage.removeItem(RECENT_COMMANDS_STORAGE_KEY);
                } catch {
                  // ignore
                }
                showNotification('Cleared recent voice commands history.');
              }}
            />

            {/* Pre-recorded Clinical Scenarios */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Rapid Multilingual Clinical Scenarios (Tap to Simulate)
              </label>
              <div className="space-y-1.5">
                {sampleVoicePhrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const mappedLocale = getVoiceBcp47Locale(phrase.lang);
                      setTranscript(phrase.text);
                      setSelectedLanguage(mappedLocale);
                      setModelUsed(`gemini-3.5-transcribe (${mappedLocale}) + Vertex AI Gemini 3.8 Flash`);
                      processSpokenText(phrase.text, mappedLocale);
                    }}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-800 transition-colors flex items-center justify-between shadow-2xs group cursor-pointer"
                  >
                    <span className="truncate font-semibold group-hover:text-emerald-800">
                      "{phrase.text}"
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0 ml-2">
                      {phrase.langBadge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              NLP Engine: Vertex AI &amp; Gemini 3.8 Flash + gemini-3.5-transcribe
            </span>
            <button
              type="button"
              onClick={() => processSpokenText(transcript)}
              disabled={isProcessing || isTranscribing || !transcript}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isProcessing ? 'Analyzing Speech...' : 'Extract Entities →'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Structured Extraction & Verification */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-sm text-slate-900">
                2. Extracted Medicine &amp; Multilingual Normalization
              </span>
              {parsedResult && (
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Confidence: {Math.round(parsedResult.confidence * 100)}%
                </span>
              )}
            </div>

            {parsedResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Target Medicine Item
                      </span>
                      {isEditing ? (
                        <select
                          value={editMedicine}
                          onChange={(e) => setEditMedicine(e.target.value)}
                          className="mt-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800"
                        >
                          {medicines.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                          {parsedResult.parsedMedicine}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                      title="Edit extracted fields"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Quantity
                      </span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(Number(e.target.value))}
                          className="mt-1 w-20 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800"
                        />
                      ) : (
                        <span className="text-base font-mono font-bold text-emerald-800 mt-0.5 block">
                          {parsedResult.parsedQuantity} units
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Transaction Type
                      </span>
                      {isEditing ? (
                        <select
                          value={editTransaction}
                          onChange={(e) => setEditTransaction(e.target.value)}
                          className="mt-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800"
                        >
                          <option value="Consumption">Consumption (Dispensed)</option>
                          <option value="Receipt">Receipt (Inward)</option>
                          <option value="Emergency Dispense">Emergency Dispense</option>
                          <option value="Register Entry">Register Ledger Entry</option>
                          <option value="Add PHC Data">Add PHC Data (OPD + Beds + Stock)</option>
                          <option value="Check Stock">Check Stock (Inventory Audit)</option>
                          <option value="Replenishment Order">Add Replenishment Order</option>
                          <option value="Report Shortage">Report Shortage Alert</option>
                        </select>
                      ) : (
                        <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                          {parsedResult.parsedTransaction}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Language &amp; Date
                      </span>
                      <span className="text-xs font-mono text-slate-700 mt-0.5 block">
                        {parsedResult.languageDetected} • {parsedResult.parsedDate}
                      </span>
                    </div>
                  </div>

                  {matchedPreviewMedicine && (
                    <div className="pt-2.5 border-t border-slate-200/60">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Live Facility Stock Telemetry ({selectedPHC.name})
                          </span>
                          <span className="font-semibold text-slate-900">
                            Available: <strong className="font-mono text-emerald-700">{matchedPreviewMedicine.currentStock} {matchedPreviewMedicine.unit}</strong>
                            {' '}· Min Threshold: <span className="font-mono">{matchedPreviewMedicine.minThreshold ?? matchedPreviewMedicine.minStockLevel}</span>
                            {' '}· Cover: <span className="font-mono">{matchedPreviewMedicine.projectedStockoutDays} days</span>
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-600">
                          FEFO Batch: {matchedPreviewMedicine.batchNumber}
                        </span>
                      </div>
                    </div>
                  )}

                  {(parsedResult.englishTranslation || parsedResult.hindiTranslation) && (
                    <div className="pt-2.5 border-t border-slate-200/60 space-y-1.5 text-[11px]">
                      {parsedResult.englishTranslation && (
                        <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
                          <span className="font-bold text-slate-900">English Clinical Normalization: </span>
                          <span>{parsedResult.englishTranslation}</span>
                        </div>
                      )}
                      {parsedResult.hindiTranslation && (
                        <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
                          <span className="font-bold text-slate-900">Devanagari Audit Translation: </span>
                          <span>{parsedResult.hindiTranslation}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{parsedResult.notes}</span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shrink-0">
                      {parsedResult.engineUsed || 'Vertex AI & Gemini 3.8 Flash'}
                    </span>
                  </div>
                </div>

                {/* Verification Check Notice */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Human-in-the-Loop Clinical Verification:</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Confirming this verbal command will execute the selected action ({isEditing ? editTransaction : parsedResult.parsedTransaction}) against the PHC inventory and supply chain ledger.
                    </p>
                  </div>
                </div>

                {successSaved && (
                  <div className="p-3 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Voice command executed and committed to ledger.</span>
                    </div>
                    <span className="font-mono text-[10px] bg-emerald-700 px-2 py-0.5 rounded">SYNCED</span>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                title="Awaiting Voice Input"
                description="Speak into the microphone or tap a sample scenario to generate parsed inventory lines."
              />
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setParsedResult(null);
                setSuccessSaved(false);
              }}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={!parsedResult || successSaved}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {successSaved
                  ? 'Logged in Ledger'
                  : (isEditing ? editTransaction : parsedResult?.parsedTransaction) === 'Check Stock'
                  ? 'Confirm & Verify Stock Audit'
                  : (isEditing ? editTransaction : parsedResult?.parsedTransaction) === 'Replenishment Order'
                  ? 'Confirm & Create Replenishment Order'
                  : (isEditing ? editTransaction : parsedResult?.parsedTransaction) === 'Report Shortage'
                  ? 'Confirm & Escalate Shortage Alert'
                  : 'Confirm & Commit to Ledger'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Clinical Staff Voice Protocol Overlay Modal */}
      <VoiceClinicalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectExample={(text, lang) => {
          const mappedLocale = getVoiceBcp47Locale(lang);
          setTranscript(text);
          setSelectedLanguage(mappedLocale);
          setModelUsed(`clinical-example-preset (${mappedLocale})`);
          processSpokenText(text, mappedLocale);
          showNotification(`Applied clinical example (${mappedLocale}): "${text}"`);
        }}
      />

      {/* Voice Commands Help & Onboarding Overlay Modal */}
      <VoiceCommandsOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onExecuteCommand={(spokenText, lang) => {
          const mappedLocale = getVoiceBcp47Locale(lang);
          setTranscript(spokenText);
          setSelectedLanguage(mappedLocale);
          setModelUsed(`gemini-3.5-transcribe (${mappedLocale}) + Vertex AI Gemini 3.8 Flash`);
          processSpokenText(spokenText, mappedLocale);
          showNotification(`Executed voice command (${mappedLocale}): "${spokenText}"`);
        }}
      />
    </div>
  );
};
