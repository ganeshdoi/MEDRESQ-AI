import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Trash2,
  Languages,
  Zap,
  Clock
} from 'lucide-react';
import { RecentVoiceCommand } from '../../types.ts';

interface RecentVoiceCommandsFloatProps {
  commands: RecentVoiceCommand[];
  activeCommandId: string | null;
  isProcessing: boolean;
  onRetrigger: (command: RecentVoiceCommand) => void;
  onClearHistory: () => void;
}

export const RecentVoiceCommandsFloat: React.FC<RecentVoiceCommandsFloatProps> = ({
  commands,
  activeCommandId,
  isProcessing,
  onRetrigger,
  onClearHistory
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [justTriggeredId, setJustTriggeredId] = useState<string | null>(null);

  const handleTrigger = (cmd: RecentVoiceCommand) => {
    setJustTriggeredId(cmd.id);
    onRetrigger(cmd);
    setTimeout(() => {
      setJustTriggeredId((prev) => (prev === cmd.id ? null : prev));
    }, 1400);
  };

  return (
    <div
      aria-label="Recent Voice Commands Floating Micro-Interaction"
      className="bg-slate-900 text-white rounded-xl border border-slate-700/90 shadow-lg overflow-hidden transition-all duration-200"
    >
      {/* Floating Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left flex-1 cursor-pointer group"
          aria-expanded={isExpanded}
        >
          <span className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
            <History className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-white">
                Recent Commands
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {commands.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Tap any command to instantly re-trigger STT + Gemini NLU
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {commands.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Clear command history"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Collapse recent commands' : 'Expand recent commands'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Command History List */}
      {isExpanded && (
        <div className="p-2.5 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {commands.length === 0 ? (
            <div className="py-4 px-3 text-center text-[11px] text-slate-400">
              No voice commands executed yet. Speak into the microphone or run a scenario to populate history.
            </div>
          ) : (
            commands.map((cmd) => {
              const isTriggered = justTriggeredId === cmd.id || activeCommandId === cmd.id;
              return (
                <div
                  key={cmd.id}
                  className={`p-2.5 rounded-lg border transition-all duration-150 flex items-start justify-between gap-2.5 ${
                    isTriggered
                      ? 'bg-emerald-950/80 border-emerald-500/70 ring-1 ring-emerald-400/40'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <Languages className="w-2.5 h-2.5" />
                        <span>{cmd.languageLabel}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-700 text-emerald-300">
                        {cmd.parsedQuantity}u • {cmd.parsedTransaction}
                      </span>
                      {cmd.committedToLedger && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Synced</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5 ml-auto">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{cmd.executedAt}</span>
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-100 truncate" title={cmd.transcript}>
                      "{cmd.transcript}"
                    </p>

                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{cmd.parsedMedicine}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleTrigger(cmd)}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isTriggered
                        ? 'bg-emerald-500 text-slate-950 shadow-xs scale-105'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50'
                    }`}
                    title="Re-trigger this voice command"
                  >
                    {isTriggered ? (
                      <>
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Triggered</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        <span>Re-run</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
