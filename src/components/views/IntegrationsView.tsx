import React, { useState } from 'react';
import {
  PlugZap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  CloudSun,
  Database,
  Pill,
  Syringe,
  FileText,
  Lock,
  Radio,
  Mic,
  BrainCircuit,
  Languages,
  Sparkles,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { VoiceEntryResult } from '../../types.ts';
import { resolveMedicineMatch } from '../../utils/medicineMatcher.ts';

export const IntegrationsView: React.FC = () => {
  const {
    connectors,
    toggleConnector,
    selectedPHC,
    showNotification,
    medicines,
    verifyOCRRecord,
    transcribeAudio,
    isTranscribing
  } = useApp();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>('hindi');
  const [multilingualInput, setMultilingualInput] = useState<string>(
    'आपातकालीन वार्ड में ओआरएस के 35 पैकेट और पैरासिटामोल 500mg की 120 गोलियां दी गईं।'
  );
  const [isAnalyzingMulti, setIsAnalyzingMulti] = useState<boolean>(false);
  const [multiResult, setMultiResult] = useState<VoiceEntryResult | null>(null);
  const [committedMulti, setCommittedMulti] = useState<boolean>(false);

  const handleSync = (id: string, name: string) => {
    setSyncingId(id);
    setTimeout(() => {
      toggleConnector(id, 'CONNECTED');
      setSyncingId(null);
      showNotification(`Gateway Synchronization Complete: ${name} data stream refreshed.`);
    }, 1200);
  };

  const handleRunMultilingualSubmission = async (CommitImmediately = false) => {
    if (!multilingualInput.trim()) return;
    setIsAnalyzingMulti(true);
    setCommittedMulti(false);
    try {
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: multilingualInput,
          language: selectedLang,
          sttEngine: 'gemini-3.5-transcribe + Vertex AI NLU'
        })
      });
      if (res.ok) {
        const parsed: VoiceEntryResult = await res.json();
        setMultiResult(parsed);
        if (CommitImmediately) {
          const match = resolveMedicineMatch(medicines, parsed.parsedMedicine);
          if (match.status === 'MATCHED') {
            const verifyRes = await verifyOCRRecord({
              medicineId: match.medicine.id,
              medicineName: match.medicine.name,
              quantity: parsed.parsedQuantity,
              transaction: parsed.parsedTransaction || 'Dispensed (OPD)',
              date: parsed.parsedDate || '2026-09-22',
              batch: match.medicine.batchNumber
            });
            if (verifyRes.ok) {
              setCommittedMulti(true);
              showNotification(
                `Multilingual Submission Committed: ${parsed.parsedQuantity} units of ${match.medicine.name} (${parsed.languageDetected})`
              );
            }
          }
        } else {
          showNotification(
            `Vertex AI & Gemini NLU extracted: ${parsed.parsedQuantity} units of ${parsed.parsedMedicine} (${parsed.languageDetected})`
          );
        }
      }
    } catch (err) {
      console.error('Multilingual gateway error:', err);
    } finally {
      setIsAnalyzingMulti(false);
    }
  };

  const getConnectorIcon = (id: string) => {
    switch (id) {
      case 'dvdms_rmscl':
        return <Pill className="w-5 h-5 text-emerald-700" />;
      case 'imd_weather':
        return <CloudSun className="w-5 h-5 text-amber-700" />;
      case 'ihip_surveillance':
        return <Server className="w-5 h-5 text-blue-700" />;
      case 'abdm_health_id':
        return <ShieldCheck className="w-5 h-5 text-purple-700" />;
      case 'hmis_portal':
        return <FileText className="w-5 h-5 text-sky-700" />;
      case 'evin_vaccines':
        return <Syringe className="w-5 h-5 text-rose-700" />;
      case 'google_speech_to_text':
        return <Mic className="w-5 h-5 text-emerald-600" />;
      case 'vertex_ai_gemini':
        return <BrainCircuit className="w-5 h-5 text-indigo-600" />;
      case 'multilingual_submission_gateway':
        return <Languages className="w-5 h-5 text-teal-600" />;
      default:
        return <PlugZap className="w-5 h-5 text-slate-700" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Simulated Interoperability Sandbox (Demo)
            </span>
            <span className="text-xs text-slate-500 font-mono">Prototype Connectors</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <PlugZap className="w-5 h-5 text-emerald-600" />
            <span>Digital Health Integration Connectors (Simulated)</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Simulated connector profiles demonstrating how {selectedPHC.name} would interface with state drug warehouses, weather feeds, and health registries in a production deployment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Gateway Protocol:</span>
          <span className="text-xs font-mono font-bold bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            GovData REST / FHIR R4
          </span>
        </div>
      </div>

      {/* Grid of 6 Core Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {connectors.map((conn) => {
          const isSyncing = syncingId === conn.id;
          return (
            <div
              key={conn.id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs shrink-0">
                    {getConnectorIcon(conn.id)}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      conn.status === 'CONNECTED'
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        : conn.status === 'CONFIGURE'
                        ? 'bg-amber-100 text-amber-950 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {conn.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-3">{conn.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                  {conn.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-600 truncate flex items-center justify-between">
                    <span className="text-slate-400">Endpoint:</span>
                    <span className="font-semibold text-slate-800">{conn.endpoint}</span>
                  </div>
                  <div className="text-slate-500 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Telemetry Sync:</span>
                    <span>{conn.lastSync}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSync(conn.id, conn.name)}
                  disabled={isSyncing}
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Gateway'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = conn.status === 'CONNECTED' ? 'NOT CONNECTED' : 'CONNECTED';
                    toggleConnector(conn.id, next);
                    showNotification(`${conn.name} connector status set to ${next}.`);
                  }}
                  className="py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                >
                  {conn.status === 'CONNECTED' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Speech-to-Text, Vertex AI & Gemini API Multilingual Submission Integration Panel */}
      <div className="bg-white rounded-2xl border-2 border-indigo-600/80 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Mic className="w-3 h-3" />
                <span>Speech-to-Text (gemini-3.5-transcribe)</span>
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3" />
                <span>Vertex AI &amp; Gemini API (gemini-3.8-flash)</span>
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1">
                <Languages className="w-3 h-3" />
                <span>8+ Indic Languages Submission</span>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Speech-to-Text, Vertex AI &amp; Gemini API Multilingual Submission Gateway
              </span>
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              End-to-end multilingual clinical submission pipeline combining <strong>gemini-3.5-transcribe</strong> Speech-to-Text ASR with <strong>Google Cloud Vertex AI &amp; Gemini 3.8 Flash</strong> NLU to parse regional Indian languages directly into verified PHC drug ledger transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select Multilingual Submission Language"
              value={selectedLang}
              onChange={(e) => {
                const lang = e.target.value;
                setSelectedLang(lang);
                const presets: Record<string, string> = {
                  hindi: 'आपातकालीन वार्ड में ओआरएस के 35 पैकेट और पैरासिटामोल 500mg की 120 गोलियां दी गईं।',
                  hinglish: 'Aaj OPD dispensary mein ORS ke 35 packets aur Paracetamol 120 tablets dispense hue.',
                  marwari: 'आज ओपीडी में ओआरएस रा 40 पैकेट मरीजा ने बांटिया गया।',
                  tamil: 'இன்று அவசரப் பிரிவில் 35 ORS பாக்கெட்டுகள் மற்றும் 100 பாராசிட்டமால் மாத்திரைகள் வழங்கப்பட்டன.',
                  telugu: 'అత్యవసర వార్డులో 50 నార్మల్ సెలైన్ బాటిళ్లు మరియు 40 జింక్ మాత్రలు పంపిణీ చేయబడ్డాయి.',
                  bengali: 'আজ ওপিডিতে ৩५ पैकेट ओआरएस एवं १२०टी पॅरासिटामल टॅबलेट वितरण करा हयेछे।',
                  marathi: 'आज आपत्कालीन कक्षात ५० नॉर्मल सलाईन बाटल्या आणि १२० पॅरासिटामॉल गोळ्या दिल्या गेल्या.',
                  english: 'Received 50 bottles of Normal Saline from district warehouse today.'
                };
                if (presets[lang]) setMultilingualInput(presets[lang]);
              }}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="hindi">Hindi (हिन्दी)</option>
              <option value="hinglish">Hinglish (Colloquial)</option>
              <option value="marwari">Rajasthani / Marwari (मारवाड़ी)</option>
              <option value="tamil">Tamil (தமிழ்)</option>
              <option value="telugu">Telugu (తెలుగు)</option>
              <option value="bengali">Bengali (বাংলা)</option>
              <option value="marathi">Marathi (मराठी)</option>
              <option value="english">English (Indian Clinical)</option>
            </select>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-3">
            <label className="text-xs font-bold text-slate-800 block">
              Multilingual Voice / Text Submission Input ({selectedPHC.name})
            </label>
            <textarea
              rows={3}
              value={multilingualInput}
              onChange={(e) => setMultilingualInput(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Speak or type in Hindi, Hinglish, Marwari, Tamil, Telugu, Bengali, Marathi, or English..."
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleRunMultilingualSubmission(false)}
                disabled={isAnalyzingMulti || isTranscribing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>
                  {isAnalyzingMulti
                    ? 'Processing via Vertex AI & Gemini...'
                    : 'Extract & Translate via Vertex AI / Gemini'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRunMultilingualSubmission(true)}
                disabled={isAnalyzingMulti || isTranscribing}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Submit Directly to PHC Ledger</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900">
                Vertex AI + Gemini NLU Output
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {multiResult?.engineUsed || 'gemini-3.8-flash + gemini-3.5-transcribe'}
              </span>
            </div>

            {multiResult ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Canonical Medicine
                    </span>
                    <span className="font-bold text-slate-900">{multiResult.parsedMedicine}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Qty &amp; Action
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {multiResult.parsedQuantity} units • {multiResult.parsedTransaction}
                    </span>
                  </div>
                </div>
                {multiResult.englishTranslation && (
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700">
                    <strong className="text-slate-900">English Normalization:</strong>{' '}
                    {multiResult.englishTranslation}
                  </div>
                )}
                {multiResult.hindiTranslation && (
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700">
                    <strong className="text-slate-900">Devanagari Audit Log:</strong>{' '}
                    {multiResult.hindiTranslation}
                  </div>
                )}
                {committedMulti && (
                  <div className="p-2 bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Committed to {selectedPHC.name} Stock Ledger</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Select any Indian language above and click <strong>"Extract &amp; Translate via Vertex AI / Gemini"</strong> or <strong>"Submit Directly to PHC Ledger"</strong> to verify real-time multilingual clinical submission.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Interoperability & Security Architecture Reference Box */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">
              Target Architecture Reference (Simulated Sandbox Mode)
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            In this prototype, connector states and sync actions are simulated locally. Production deployment would require institutional credentials, mTLS/OAuth 2.0 provisioning, and formal ABDM / state warehouse onboarding.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-mono text-amber-300 font-bold bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-700">
            Prototype Sandbox
          </span>
        </div>
      </div>
    </div>
  );
};
