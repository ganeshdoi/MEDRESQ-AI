import React, { useState, useEffect } from 'react';
import {
  X,
  Mic,
  BookOpen,
  Volume2,
  CheckCircle2,
  Sparkles,
  Copy,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Layers,
  Building2,
  Pill,
  Lightbulb,
  Radio,
  FileCheck2
} from 'lucide-react';

interface ClinicalExample {
  id: string;
  category: 'opd' | 'emergency' | 'inpatient' | 'warehouse';
  categoryLabel: string;
  language: 'hinglish' | 'hindi' | 'english';
  languageLabel: string;
  script: string;
  breakdown: {
    medicine: string;
    quantity: string;
    action: string;
    department: string;
  };
  clinicalTip: string;
}

const CLINICAL_EXAMPLES: ClinicalExample[] = [
  {
    id: 'ex-1',
    category: 'opd',
    categoryLabel: 'OPD Dispensary',
    language: 'hinglish',
    languageLabel: 'Hinglish (Colloquial)',
    script: 'Aaj OPD dispensary mein ORS ke 35 packets dehydration patients ko dispense hue.',
    breakdown: {
      medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
      quantity: '35 packets',
      action: 'Dispensed (Consumption)',
      department: 'OPD Dispensary'
    },
    clinicalTip: 'Standard verbal formula for routine outpatient hydration distribution during heatwave conditions.'
  },
  {
    id: 'ex-2',
    category: 'emergency',
    categoryLabel: 'Emergency Triage',
    language: 'hindi',
    languageLabel: 'Hindi (हिन्दी)',
    script: 'आपातकालीन वार्ड में पैरासिटामोल 500mg की 120 गोलियां और नॉर्मल सलाइन की 10 बोतलें तुरंत दी गईं।',
    breakdown: {
      medicine: 'Paracetamol 500mg Tablets & IV Normal Saline',
      quantity: '120 tablets / 10 bottles',
      action: 'Emergency Dispensing',
      department: 'Emergency Triage Ward'
    },
    clinicalTip: 'Supports multiple medicines and Hindi numeric terms (गोलियां, बोतलें, तुरंत दी गईं).'
  },
  {
    id: 'ex-3',
    category: 'inpatient',
    categoryLabel: 'Inpatient & Maternal',
    language: 'hinglish',
    languageLabel: 'Hinglish (Colloquial)',
    script: 'Pediatric ward me Zinc tablets ke 40 packets aur Paracetamol syrup 15 bottles dispense kiye gaye.',
    breakdown: {
      medicine: 'Zinc Dispersible 20mg & Paracetamol Syrup',
      quantity: '40 packets / 15 bottles',
      action: 'Ward Issue (Consumption)',
      department: 'Pediatric Inpatient'
    },
    clinicalTip: 'Specify the inpatient wing (Maternity, Pediatric, General Male/Female) to maintain sub-store audit trails.'
  },
  {
    id: 'ex-4',
    category: 'warehouse',
    categoryLabel: 'RMSCL Inward Receipt',
    language: 'english',
    languageLabel: 'English (Indian)',
    script: 'Received 50 bottles of Normal Saline and 20 vials of Anti-Snake Venom from RMSCL Mandore warehouse today.',
    breakdown: {
      medicine: 'Normal Saline 0.9% & Anti-Snake Venom',
      quantity: '50 bottles & 20 vials',
      action: 'Inward Receipt (Stock In)',
      department: 'Main PHC Drug Store'
    },
    clinicalTip: 'Using "Received" or "Inward" automatically flags the transaction as positive inventory increment in ledger.'
  },
  {
    id: 'ex-5',
    category: 'emergency',
    categoryLabel: 'Emergency Triage',
    language: 'hinglish',
    languageLabel: 'Hinglish (Colloquial)',
    script: 'Anti-snake venom ke 4 vials bite case me emergency resuscitation room me use hue.',
    breakdown: {
      medicine: 'Polyvalent Anti-Snake Venom (ASV)',
      quantity: '4 vials',
      action: 'Emergency Life-Saving Dispense',
      department: 'Resuscitation Room'
    },
    clinicalTip: 'Critical antivenom logs trigger instantaneous stock re-verification against block threshold reserves.'
  }
];

interface VoiceClinicalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExample: (text: string, lang: 'hinglish' | 'hindi' | 'english') => void;
}

export const VoiceClinicalGuideModal: React.FC<VoiceClinicalGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectExample
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'opd' | 'emergency' | 'inpatient' | 'warehouse'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredExamples = selectedCategory === 'all'
    ? CLINICAL_EXAMPLES
    : CLINICAL_EXAMPLES.filter(ex => ex.category === selectedCategory);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-guide-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-emerald-400">Clinical Protocol</span>
              <span aria-hidden="true">·</span>
              <span>Audio ASR & NLP Engine</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-400">gemini-3.5-transcribe</span>
            </div>
            <h2 id="voice-guide-modal-title" className="text-lg sm:text-xl font-bold tracking-tight mt-1 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>Clinical Staff Voice Recording Guide & Protocol</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Standard operating procedures for dictating patient dispensing, ward consumption, and inward drug store receipts.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close clinical recording guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-slate-800">
          {/* Core Dictation Formula Blueprint */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  The 4-Part Clinical Speech Formula
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Structure for 98%+ Accuracy</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When speaking into the microphone, structure your sentence with these four key clinical attributes. The AI model extracts and maps them directly to your e-Aushadhi stock ledger.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">1. Medicine Name</div>
                <div className="font-semibold text-xs text-slate-900 mt-1">Drug & Strength</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">e.g. "ORS sachets", "Paracetamol 500mg", "Saline"</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">2. Exact Quantity</div>
                <div className="font-semibold text-xs text-slate-900 mt-1">Number & Unit</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">e.g. "35 packets", "120 tablets", "10 bottles"</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">3. Action Intent</div>
                <div className="font-semibold text-xs text-slate-900 mt-1">Dispensed or Received</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">e.g. "use hue", "dispense kiye", "inward aaya"</div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">4. Ward / Context</div>
                <div className="font-semibold text-xs text-slate-900 mt-1">Department Wing</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">e.g. "OPD", "Emergency", "Maternity ward"</div>
              </div>
            </div>
          </section>

          {/* Interactive Examples Section */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-700" />
                  <span>Clinical Phrasing Examples (Tap to Load or Copy)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click <strong>"Apply to Voice Entry"</strong> to immediately populate the active transcript and run entity extraction.
                </p>
              </div>

              {/* Category Filter Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All (5)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('opd')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    selectedCategory === 'opd'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  OPD
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('emergency')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    selectedCategory === 'emergency'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Emergency
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('inpatient')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    selectedCategory === 'inpatient'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inpatient
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('warehouse')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    selectedCategory === 'warehouse'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Receipts
                </button>
              </div>
            </div>

            {/* List of Examples */}
            <div className="space-y-3">
              {filteredExamples.map((ex) => (
                <div
                  key={ex.id}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900">{ex.categoryLabel}</span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span className="text-slate-500 font-mono text-[11px]">{ex.languageLabel}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(ex.id, ex.script)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy text to clipboard"
                      >
                        {copiedId === ex.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectExample(ex.script, ex.language);
                          onClose();
                        }}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <span>Apply to Voice Entry</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Verbal Script Quote */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 font-mono">
                    "{ex.script}"
                  </div>

                  {/* Extraction Breakdown Preview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block">Parsed Drug:</span>
                      <span className="font-semibold text-slate-800">{ex.breakdown.medicine}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Quantity:</span>
                      <span className="font-semibold text-emerald-700 font-mono">{ex.breakdown.quantity}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Transaction:</span>
                      <span className="font-semibold text-slate-800">{ex.breakdown.action}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Target Wing:</span>
                      <span className="font-semibold text-slate-800">{ex.breakdown.department}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 flex items-center gap-1.5">
                    <span className="font-semibold not-italic text-slate-600">Tip:</span>
                    <span>{ex.clinicalTip}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Operational Best Practices Grid */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Microphone & Acoustic Best Practices in Rural PHCs</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">1. Distance & Fan Noise</div>
                <p className="text-[11px] leading-relaxed">
                  Hold device 15–25cm from mouth. In high-temperature conditions with loud ceiling fans, speak towards the directional mic hole to avoid wind turbulence.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">2. Pause After Clicking</div>
                <p className="text-[11px] leading-relaxed">
                  Wait half a second after pressing the red recording button before speaking, ensuring the browser audio buffer captures the first syllable cleanly.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">3. Human-in-the-Loop Review</div>
                <p className="text-[11px] leading-relaxed">
                  Always glance at the structured extraction card on the right before clicking "Confirm & Commit to Ledger". Click the edit pencil if fine-tuning is required.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Follows National Health Mission (NHM) digital clinical documentation and e-Aushadhi audit standards.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
