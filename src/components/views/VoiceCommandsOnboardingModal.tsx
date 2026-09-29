import React, { useState, useEffect } from 'react';
import {
  X,
  Mic,
  HelpCircle,
  Search,
  PackageSearch,
  Truck,
  AlertTriangle,
  Stethoscope,
  PackagePlus,
  Siren,
  Copy,
  CheckCircle2,
  ArrowRight,
  Volume2,
  Terminal,
  Compass
} from 'lucide-react';
import { VoiceTransactionType } from '../../types.ts';

export interface VoiceCommandTemplate {
  id: string;
  intentTitle: string;
  triggerPhrase: string;
  category: 'stock_query' | 'replenishment' | 'shortage' | 'dispensing' | 'receipt' | 'phc_register';
  categoryLabel: string;
  transactionType: VoiceTransactionType;
  syntaxPattern: string;
  description: string;
  systemOutcome: string;
  examples: {
    lang: 'english' | 'hinglish' | 'hindi';
    langLabel: string;
    spokenText: string;
    medicine: string;
    quantity: number;
  }[];
}

export const VOICE_COMMAND_TEMPLATES: VoiceCommandTemplate[] = [
  {
    id: 'cmd-check-stock',
    intentTitle: 'Check Stock',
    triggerPhrase: '"Check stock [Medicine Name]"',
    category: 'stock_query',
    categoryLabel: 'Inventory Audit',
    transactionType: 'Check Stock',
    syntaxPattern: 'Check stock + [Medicine Name] + [Optional: Ward / Store]',
    description:
      'Instantly query real-time available stock, earliest-expiring FEFO batch, daily burn rate, and remaining days of supply cover.',
    systemOutcome: 'Displays live stock audit card and verifies usable FEFO batch count',
    examples: [
      {
        lang: 'english',
        langLabel: 'English',
        spokenText: 'Check stock for Oral Rehydration Salts packets in main store.',
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        quantity: 1
      },
      {
        lang: 'hinglish',
        langLabel: 'Hinglish',
        spokenText: 'Check stock Paracetamol 500mg tablets kitna bacha hai store mein.',
        medicine: 'Paracetamol Tablets IP 500mg',
        quantity: 1
      },
      {
        lang: 'hindi',
        langLabel: 'Hindi (हिन्दी)',
        spokenText: 'मुख्य स्टोर में एंटी-स्नेक वेनम का वर्तमान स्टॉक चेक करें।',
        medicine: 'Polyvalent Anti-Snake Venom (ASV)',
        quantity: 1
      }
    ]
  },
  {
    id: 'cmd-replenishment-order',
    intentTitle: 'Add Replenishment Order',
    triggerPhrase: '"Add replenishment order [Quantity] [Medicine]"',
    category: 'replenishment',
    categoryLabel: 'Supply Chain Indent',
    transactionType: 'Replenishment Order',
    syntaxPattern: 'Add replenishment order + [Quantity] + [Medicine Name] + [Priority]',
    description:
      'Generate an automated RMSCL / e-Aushadhi replenishment requisition to the District Drug Warehouse.',
    systemOutcome: 'Creates a tracked replenishment order in the Supply Chain & Orders queue',
    examples: [
      {
        lang: 'english',
        langLabel: 'English',
        spokenText: 'Add replenishment order for 400 packets of ORS from district warehouse.',
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        quantity: 400
      },
      {
        lang: 'hinglish',
        langLabel: 'Hinglish',
        spokenText: 'Add replenishment order 150 bottles Normal Saline urgent indent.',
        medicine: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
        quantity: 150
      },
      {
        lang: 'hindi',
        langLabel: 'Hindi (हिन्दी)',
        spokenText: 'जिला वेयरहाउस से पैरासिटामोल 500mg की 500 गोलियों का रिप्लेनिशमेंट ऑर्डर जोड़ें।',
        medicine: 'Paracetamol Tablets IP 500mg',
        quantity: 500
      }
    ]
  },
  {
    id: 'cmd-report-shortage',
    intentTitle: 'Report Shortage',
    triggerPhrase: '"Report shortage [Medicine Name]"',
    category: 'shortage',
    categoryLabel: 'Shortage Escalation',
    transactionType: 'Report Shortage',
    syntaxPattern: 'Report shortage + [Medicine Name] + [Remaining Units / Ward]',
    description:
      'Flag an acute stockout risk or safety-threshold breach to trigger proactive district alerts and lateral peer-PHC transfer options.',
    systemOutcome: 'Triggers a Critical Stock Threshold Alert and flags item for peer rescue',
    examples: [
      {
        lang: 'english',
        langLabel: 'English',
        spokenText: 'Report shortage of Polyvalent Anti-Snake Venom vials at emergency triage.',
        medicine: 'Polyvalent Anti-Snake Venom (ASV)',
        quantity: 10
      },
      {
        lang: 'hinglish',
        langLabel: 'Hinglish',
        spokenText: 'Report shortage ORS packets OPD counter par stock kam ho gaya hai.',
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        quantity: 35
      },
      {
        lang: 'hindi',
        langLabel: 'Hindi (हिन्दी)',
        spokenText: 'आपातकालीन वार्ड में रिंगर लैक्टेट सलाइन की भारी कमी रिपोर्ट करें।',
        medicine: 'Ringer Lactate (RL) IV Infusion 500ml',
        quantity: 20
      }
    ]
  },
  {
    id: 'cmd-opd-dispense',
    intentTitle: 'Log OPD Dispensing',
    triggerPhrase: '"Dispensed [Quantity] [Medicine] at OPD"',
    category: 'dispensing',
    categoryLabel: 'OPD Consumption',
    transactionType: 'Consumption',
    syntaxPattern: '[Medicine Name] + [Quantity] + dispensed / use hue + [Ward]',
    description:
      'Deduct daily outpatient or inpatient ward consumption directly from the oldest non-expired FEFO batch.',
    systemOutcome: 'Deducts specified quantity from active PHC inventory ledger in FEFO order',
    examples: [
      {
        lang: 'hinglish',
        langLabel: 'Hinglish',
        spokenText: 'Aaj ORS ke 35 packets OPD dispensary mein use hue.',
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        quantity: 35
      },
      {
        lang: 'english',
        langLabel: 'English',
        spokenText: 'Dispensed 60 tablets of Amoxicillin 500mg at outpatient pharmacy.',
        medicine: 'Amoxicillin Capsules IP 500mg',
        quantity: 60
      },
      {
        lang: 'hindi',
        langLabel: 'Hindi (हिन्दी)',
        spokenText: 'ओपीडी में जिंक 20mg की 40 गोलियां मरीजों को वितरित की गईं।',
        medicine: 'Zinc Sulfate Dispersible Tablets 20mg',
        quantity: 40
      }
    ]
  },
  {
    id: 'cmd-emergency-issue',
    intentTitle: 'Emergency Triage Issue',
    triggerPhrase: '"Emergency dispense [Quantity] [Medicine]"',
    category: 'dispensing',
    categoryLabel: 'Casualty & Triage',
    transactionType: 'Emergency Dispense',
    syntaxPattern: 'Emergency + [Medicine Name] + [Quantity] + [Casualty / Labor Room]',
    description:
      'High-priority verbal logging for resuscitation, snakebite envenomation, and acute dehydration stabilization.',
    systemOutcome: 'Logs priority casualty consumption and recalculates golden-hour reserve',
    examples: [
      {
        lang: 'hindi',
        langLabel: 'Hindi (हिन्दी)',
        spokenText: 'आपातकालीन वार्ड में पैरासिटामोल 500mg की 120 गोलियां तुरंत दी गईं।',
        medicine: 'Paracetamol Tablets IP 500mg',
        quantity: 120
      },
      {
        lang: 'english',
        langLabel: 'English',
        spokenText: 'Emergency dispense 4 vials of Anti-Snake Venom in resuscitation room.',
        medicine: 'Polyvalent Anti-Snake Venom (ASV)',
        quantity: 4
      }
    ]
  },
  {
    id: 'cmd-warehouse-receipt',
    intentTitle: 'Record Warehouse Receipt',
    triggerPhrase: '"Received [Quantity] [Medicine] from warehouse"',
    category: 'receipt',
    categoryLabel: 'Inward Stock Receipt',
    transactionType: 'Receipt',
    syntaxPattern: 'Received + [Quantity] + [Medicine Name] + from warehouse',
    description:
      'Credit newly arrived RMSCL supply consignments into the facility store without manual typing.',
    systemOutcome: 'Increments facility stock balance and logs inward audit entry',
    examples: [
      {
        lang: 'english',
        langLabel: 'English',
        spokenText: 'Received 50 bottles of Normal Saline from district warehouse today.',
        medicine: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
        quantity: 50
      },
      {
        lang: 'hinglish',
        langLabel: 'Hinglish',
        spokenText: 'District warehouse se ORS ke 200 packets aaj store mein received hue.',
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        quantity: 200
      }
    ]
  },
  {
    id: 'cmd-register-entry',
    intentTitle: 'Register Physical Ledger Entry',
    triggerPhrase: '"Register [Quantity] [Medicine] batch [Batch]"',
    category: 'phc_register',
    categoryLabel: 'Register Digitization',
    transactionType: 'Register Entry',
    syntaxPattern: 'Register + [Quantity] + [Medicine Name] + [Batch] + [Dispensed / Received]',
    description:
      'Log handwritten physical register lines directly by voice with batch number and transaction type.',
    systemOutcome: 'Adds verified register entry and updates facility FEFO stock balance',
    examples: [
      {
        lang: 'english',
        langLabel: 'English',
        spokenText: 'Register 60 packets of ORS batch ORS-2609 dispensed at OPD today.',
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        quantity: 60
      },
      {
        lang: 'hinglish',
        langLabel: 'Hinglish',
        spokenText: 'Register mein Paracetamol 500mg ke 150 tablets batch PCM-440 OPD dispensed add karo.',
        medicine: 'Paracetamol Tablets IP 500mg',
        quantity: 150
      },
      {
        lang: 'hindi',
        langLabel: 'Hindi (हिन्दी)',
        spokenText: 'रजिस्टर में एमोक्सिसिलिन 500mg की 90 कैप्सूल ओपीडी वितरण दर्ज करें।',
        medicine: 'Amoxicillin Capsules IP 500mg',
        quantity: 90
      }
    ]
  },
  {
    id: 'cmd-add-phc-data',
    intentTitle: 'Add PHC Daily Data & Stock',
    triggerPhrase: '"Add PHC data [OPD patients] [occupied beds] and [Medicine]"',
    category: 'phc_register',
    categoryLabel: 'PHC Data & Telemetry',
    transactionType: 'Add PHC Data',
    syntaxPattern: 'Add PHC data + [OPD Footfall] + [Occupied Beds] + [Medicine & Quantity]',
    description:
      'Simultaneously register daily PHC operational metrics (OPD footfall, bed occupancy) and medicine stock updates in one voice command.',
    systemOutcome: 'Updates PHC OPD footfall, bed occupancy rate, and medicine inventory ledger',
    examples: [
      {
        lang: 'english',
        langLabel: 'English',
        spokenText: 'Add PHC data 240 OPD patients 16 occupied beds and 80 bottles of Normal Saline received.',
        medicine: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
        quantity: 80
      },
      {
        lang: 'hinglish',
        langLabel: 'Hinglish',
        spokenText: 'Add PHC data aaj 215 OPD patients 14 beds occupied aur 100 ORS packets received.',
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        quantity: 100
      },
      {
        lang: 'hindi',
        langLabel: 'Hindi (हिन्दी)',
        spokenText: 'पीएचसी डेटा जोड़ें 220 ओपीडी मरीज 15 बेड भर्ती और 60 रिंगर लैक्टेट बोतल प्राप्त।',
        medicine: 'Ringer Lactate (RL) IV Infusion 500ml',
        quantity: 60
      }
    ]
  }
];

interface VoiceCommandsOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (spokenText: string, language: string) => void;
}

export const VoiceCommandsOnboardingModal: React.FC<VoiceCommandsOnboardingModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'stock_query' | 'replenishment' | 'shortage' | 'dispensing' | 'receipt' | 'phc_register'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

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

  const filteredTemplates = VOICE_COMMAND_TEMPLATES.filter((tpl) => {
    const matchesCategory = activeCategory === 'all' || tpl.category === activeCategory;
    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tpl.intentTitle.toLowerCase().includes(q) ||
      tpl.triggerPhrase.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.examples.some((ex) => ex.spokenText.toLowerCase().includes(q))
    );
  });

  const handleCopyPhrase = (phrase: string) => {
    navigator.clipboard.writeText(phrase);
    setCopiedPhrase(phrase);
    setTimeout(() => setCopiedPhrase(null), 1800);
  };

  const renderCategoryIcon = (category: VoiceCommandTemplate['category']) => {
    switch (category) {
      case 'stock_query':
        return <PackageSearch className="w-4 h-4 text-emerald-700" />;
      case 'replenishment':
        return <Truck className="w-4 h-4 text-blue-700" />;
      case 'shortage':
        return <AlertTriangle className="w-4 h-4 text-amber-700" />;
      case 'dispensing':
        return <Stethoscope className="w-4 h-4 text-teal-700" />;
      case 'receipt':
        return <PackagePlus className="w-4 h-4 text-indigo-700" />;
      default:
        return <Mic className="w-4 h-4 text-emerald-700" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-onboarding-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-emerald-400">Interactive Voice Onboarding</span>
              <span aria-hidden="true">·</span>
              <span>Hands-Free Command Directory</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-400">English / Hinglish / हिन्दी</span>
            </div>
            <h2
              id="voice-onboarding-modal-title"
              className="text-lg sm:text-xl font-bold tracking-tight mt-1 flex items-center gap-2.5"
            >
              <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Voice Command Help &amp; Onboarding Overlay</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Speak naturally or select any command below to check live stock levels, add RMSCL replenishment orders, report critical shortages, or log OPD dispensing.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close voice commands onboarding overlay"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* 3-Step Onboarding Walkthrough Banner */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  How Hands-Free Voice Entry Works in 3 Steps
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Click any command example below to test it live in the console
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3.5">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200/90">
                <div className="text-xs font-bold text-emerald-800">
                  01. Speak or Pick a Command Intent
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Say a command such as <strong>"Check stock"</strong>,{' '}
                  <strong>"Add replenishment order"</strong>, or{' '}
                  <strong>"Report shortage"</strong> followed by the medicine name and quantity.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200/90">
                <div className="text-xs font-bold text-emerald-800">
                  02. AI Multilingual NLU Extraction
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Audio is transcribed via <span className="font-mono">gemini-3.5-transcribe</span> and normalized into structured NLEM drug entities, quantities, and action intents.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200/90">
                <div className="text-xs font-bold text-emerald-800">
                  03. Verify &amp; Execute Action
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Review the extracted card on the right and confirm to query FEFO stock, dispatch an RMSCL order, trigger a shortage alert, or update the ledger.
                </p>
              </div>
            </div>
          </section>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {[
                { id: 'all', label: 'All Commands (8)' },
                { id: 'phc_register', label: 'Register & PHC Data' },
                { id: 'stock_query', label: 'Check Stock' },
                { id: 'replenishment', label: 'Add Replenishment Order' },
                { id: 'shortage', label: 'Report Shortage' },
                { id: 'dispensing', label: 'Dispense / Triage' },
                { id: 'receipt', label: 'Inward Receipt' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activeCategory === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter voice commands..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Command Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTemplates.map((cmd) => (
              <div
                key={cmd.id}
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200/80 shrink-0 mt-0.5">
                        {renderCategoryIcon(cmd.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{cmd.categoryLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-emerald-700 font-semibold">
                            {cmd.transactionType}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">
                          {cmd.intentTitle}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const primary = cmd.examples[0];
                        onExecuteCommand(primary.spokenText, primary.lang);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                    >
                      <span>Try Command</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{cmd.description}</p>

                  {/* Syntax Formula Bar */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Voice Syntax Pattern
                    </div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      {cmd.syntaxPattern}
                    </div>
                  </div>

                  {/* Multilingual Interactive Phrase Examples */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Spoken Examples (Click to Execute or Copy):</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        {cmd.systemOutcome}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {cmd.examples.map((ex, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/40 hover:border-emerald-200 transition-colors flex items-center justify-between gap-2 group"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onExecuteCommand(ex.spokenText, ex.lang);
                              onClose();
                            }}
                            className="text-left flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Volume2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-slate-700">{ex.langLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{ex.medicine}</span>
                            </div>
                            <div className="text-xs font-medium text-slate-900 group-hover:text-emerald-900 mt-0.5 font-mono">
                              "{ex.spokenText}"
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyPhrase(ex.spokenText)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-md transition-colors cursor-pointer"
                              title="Copy voice command"
                            >
                              {copiedPhrase === ex.spokenText ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onExecuteCommand(ex.spokenText, ex.lang);
                                onClose();
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-700 text-emerald-800 hover:text-white border border-emerald-300 rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Run
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Pro Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px] text-slate-800">?</kbd> anytime in the Voice Entry screen to reopen this Voice Commands Help Overlay.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Got It, Return to Voice Console
          </button>
        </div>
      </div>
    </div>
  );
};
