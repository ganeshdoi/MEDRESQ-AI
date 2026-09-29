import React, { useState } from 'react';
import {
  ScanLine,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCw,
  Trash2,
  Check,
  ShieldCheck,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { TableSkeleton } from '../ui/LoadingSkeleton.tsx';
import { SAMPLE_OCR_PRESETS } from '../../data/mockData.ts';

interface ExtractedRecord {
  id: string;
  medicine: string;
  batch: string;
  quantity: number;
  transaction: string;
  date: string;
  confidenceScore: number;
}

export const RecordsDataCapture: React.FC = () => {
  const { consumeMedicine, showNotification, selectedPHC } = useApp();
  const [selectedPreset, setSelectedPreset] = useState<string>('preset1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifiedByOfficer, setIsVerifiedByOfficer] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [extractedRecords, setExtractedRecords] = useState<ExtractedRecord[]>([
    {
      id: 'rec-1',
      medicine: 'Paracetamol Tablets 500mg',
      batch: 'PCM-2026-08',
      quantity: 120,
      transaction: 'Dispensed (OPD)',
      date: '2026-09-22',
      confidenceScore: 0.96
    },
    {
      id: 'rec-2',
      medicine: 'ORS Sachets (WHO Formula)',
      batch: 'ORS-2026-04',
      quantity: 85,
      transaction: 'Dispensed (OPD)',
      date: '2026-09-22',
      confidenceScore: 0.94
    },
    {
      id: 'rec-3',
      medicine: 'Amoxicillin Capsules 500mg',
      batch: 'AMX-2026-01',
      quantity: 40,
      transaction: 'Dispensed (OPD)',
      date: '2026-09-22',
      confidenceScore: 0.91
    },
    {
      id: 'rec-4',
      medicine: 'Normal Saline IV 500ml',
      batch: 'NS-2026-11',
      quantity: 15,
      transaction: 'Emergency Inpatient',
      date: '2026-09-22',
      confidenceScore: 0.88
    }
  ]);

  const [committedLog, setCommittedLog] = useState([
    { id: 'LOG-4491', name: 'Paracetamol Tablets 500mg', qty: 90, date: '2026-09-21', time: '17:30' },
    { id: 'LOG-4490', name: 'Albendazole 400mg', qty: 60, date: '2026-09-21', time: '16:15' },
    { id: 'LOG-4489', name: 'Ciprofloxacin Eye Drops', qty: 25, date: '2026-09-21', time: '14:00' }
  ]);

  const handleRecordChange = (id: string, field: keyof ExtractedRecord, value: any) => {
    setExtractedRecords(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRecord = (id: string) => {
    setExtractedRecords(prev => prev.filter(r => r.id !== id));
  };

  const runOCR = (presetId?: string) => {
    setIsProcessing(true);
    setIsVerifiedByOfficer(false);

    setTimeout(() => {
      setIsProcessing(false);
      showNotification('OCR parsing complete: 4 register line items extracted with 94.2% average confidence.');
    }, 900);
  };

  const handleCommitAll = async () => {
    if (!isVerifiedByOfficer || extractedRecords.length === 0) return;

    for (const rec of extractedRecords) {
      if (rec.transaction.includes('Dispensed') || rec.transaction.includes('Emergency')) {
        await consumeMedicine(rec.id, rec.quantity, `${rec.transaction} via Verified OCR`);
      }
    }

    const newLogs = extractedRecords.map((r, i) => ({
      id: `LOG-${4500 + i}`,
      name: r.medicine,
      qty: r.quantity,
      date: r.date,
      time: '11:45'
    }));

    setCommittedLog(prev => [...newLogs, ...prev]);
    setExtractedRecords([]);
    setIsVerifiedByOfficer(false);
    showNotification('Official register items successfully verified and written to facility stock ledger.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Human-in-the-Loop OCR
            </span>
            <span className="text-xs text-slate-500 font-mono">Formulary Ledger v2.4</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-emerald-600" />
            <span>Physical Register Digitization & OCR Verification</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Bridge paper-based rural OPD tallies and physical stock ledgers into national health records with mandatory staff verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs font-mono">
            Location: {selectedPHC.name}
          </span>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Register Capture / Upload / Preset Select */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-sm text-slate-900">
                1. Select Physical Register Scan
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                Computer Vision
              </span>
            </div>

            {/* Register Photo Presets */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 block">
                Standard Register Formats
              </label>
              {SAMPLE_OCR_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    runOCR(preset.id);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedPreset === preset.id
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{preset.name}</span>
                    {selectedPreset === preset.id && (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{preset.thumbnail}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Upload Dropzone */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Or Capture Live Register Photo
              </label>
              <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/70 hover:bg-emerald-50/30 transition-colors">
                <Camera className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-800">
                  Take Snapshot or Select Image
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Smartphone camera or PNG / JPG upload
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPreviewImage(URL.createObjectURL(file));
                      runOCR();
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">Scan Engine: v3.1</span>
            <button
              type="button"
              onClick={() => runOCR()}
              disabled={isProcessing}
              className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Processing OCR...' : 'Re-scan Page'}</span>
            </button>
          </div>
        </div>

        {/* Right 2 Columns: Editable Verification Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  2. Review & Authorize Extracted Entries
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify extracted drug formulations and dispensing quantities against the physical register.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                {extractedRecords.length} Lines Detected
              </span>
            </div>

            {/* Official Audit Safeguard Notice */}
            <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-blue-950 flex items-start gap-3 text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong>Mandatory Verification Protocol:</strong> The system will never write OCR data into official stock registers without human sign-off by designated PHC staff.
              </div>
            </div>

            {/* Editable Table or Loading / Empty State */}
            {isProcessing ? (
              <div className="py-4">
                <TableSkeleton rows={4} cols={6} />
              </div>
            ) : extractedRecords.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={CheckCircle2}
                  title="All Register Lines Verified & Committed"
                  description="The current batch of register records has been audited and synchronized with the facility's inventory."
                  actionText="Scan Another Register Page"
                  onAction={() => runOCR()}
                />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs" role="table">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th scope="col" className="px-3 py-2.5">Medicine Name</th>
                      <th scope="col" className="px-2 py-2.5">Batch</th>
                      <th scope="col" className="px-2 py-2.5">Category/Use</th>
                      <th scope="col" className="px-2 py-2.5 text-right w-24">Qty</th>
                      <th scope="col" className="px-2 py-2.5 w-28">Date</th>
                      <th scope="col" className="px-2 py-2.5 text-center">Confidence</th>
                      <th scope="col" className="px-2 py-2.5 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={rec.medicine}
                            onChange={(e) => handleRecordChange(rec.id, 'medicine', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={rec.batch}
                            onChange={(e) => handleRecordChange(rec.id, 'batch', e.target.value)}
                            className="w-24 px-1.5 py-1 border border-slate-200 rounded-md text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={rec.transaction}
                            onChange={(e) => handleRecordChange(rec.id, 'transaction', e.target.value)}
                            className="w-36 px-1.5 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="Dispensed (OPD)">Dispensed (OPD)</option>
                            <option value="Received (Warehouse)">Received (Warehouse)</option>
                            <option value="Emergency Inpatient">Emergency Inpatient</option>
                            <option value="Damaged/Expired">Damaged/Expired</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            value={rec.quantity}
                            onChange={(e) => handleRecordChange(rec.id, 'quantity', Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-slate-200 rounded-md text-xs font-mono font-bold text-right text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={rec.date}
                            onChange={(e) => handleRecordChange(rec.id, 'date', e.target.value)}
                            className="w-28 px-1.5 py-1 border border-slate-200 rounded-md text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {Math.round(rec.confidenceScore * 100)}%
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRecord(rec.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove item"
                            aria-label={`Remove ${rec.medicine}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Officer Verification Checkbox */}
            {extractedRecords.length > 0 && !isProcessing && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="officer-verification"
                  checked={isVerifiedByOfficer}
                  onChange={(e) => setIsVerifiedByOfficer(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label
                  htmlFor="officer-verification"
                  className="text-xs text-amber-950 font-medium cursor-pointer leading-relaxed"
                >
                  I certify as an authorized healthcare worker that these medicine names, batch numbers, and quantities have been inspected and match the physical handwritten register page.
                </label>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-mono">
              {extractedRecords.length} item{extractedRecords.length === 1 ? '' : 's'} awaiting commitment
            </span>
            <button
              type="button"
              onClick={handleCommitAll}
              disabled={!isVerifiedByOfficer || extractedRecords.length === 0}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                isVerifiedByOfficer && extractedRecords.length > 0
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify & Commit to Stock Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verification Audit Trail Log */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Recent Verified Digitization Audit Trail (Non-repudiation Log)</span>
        </h3>
        <div className="divide-y divide-slate-100 text-xs">
          {committedLog.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {log.id}
                </span>
                <span className="font-bold text-slate-900">{log.name}</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-mono font-bold">
                  {log.qty} Units
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Verified: {log.date} ({log.time}) by Authorized Staff
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
