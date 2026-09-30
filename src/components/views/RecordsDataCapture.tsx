import React, { useState, useRef, useEffect } from 'react';
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
  Mic,
  Radio,
  Plus,
  Building2,
  Eye,
  X,
  Wand2,
  Languages,
  ArrowRight,
  BedDouble,
  Users,
  PackagePlus,
  Search
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { TableSkeleton } from '../ui/LoadingSkeleton.tsx';
import { SAMPLE_OCR_PRESETS } from '../../data/mockData.ts';
import { resolveMedicineMatch } from '../../utils/medicineMatcher.ts';
import {
  REGISTER_VOICE_LANGUAGES,
  resolveVoiceLanguageConfig,
  getVoiceBcp47Locale,
  parsePhysicalRegisterVoiceCommand,
  type RegisterVoiceLanguageCode,
  type RegisterVoiceBcp47Locale,
  type NormalizedRegisterVoiceCommand
} from '../../utils/registerVoiceCommandParser.ts';
import { VoiceEntryResult } from '../../types.ts';

interface ExtractedRecord {
  id: string;
  medicine: string;
  rawMedicineText?: string;
  batch: string;
  expiryDate?: string;
  quantity: number | string;
  transaction: string;
  date: string;
  prescribedBy?: string;
  confidenceScore: number | null;
  verificationState?: 'NEEDS_REVIEW' | 'VERIFIED' | 'MODIFIED' | 'REJECTED';
  correctedFields?: string[];
}

interface CommittedAuditLogEntry {
  id: string;
  name: string;
  qty: number;
  date: string;
  time: string;
  medicalOfficer: string;
  phcName: string;
  phcCode: string;
  batch: string;
  expiryDate?: string;
  correctedFields: string[];
}

/**
 * Helper to convert and compress an uploaded File or Blob into a clean JPEG DataURL & Base64 string
 * so large camera photos never fail upload limits and work reliably with Gemini Vision OCR.
 */
async function fileToCompressedBase64(
  file: File | Blob
): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const originalDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let width = img.width || 1000;
        let height = img.height || 750;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackB64 = originalDataUrl.split(',')[1] || originalDataUrl;
          resolve({
            dataUrl: originalDataUrl,
            base64: fallbackB64,
            mimeType: file.type || 'image/jpeg'
          });
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64 = compressedDataUrl.split(',')[1] || '';
        resolve({
          dataUrl: compressedDataUrl,
          base64,
          mimeType: 'image/jpeg'
        });
      };
      img.onerror = () => {
        const fallbackB64 = originalDataUrl.split(',')[1] || originalDataUrl;
        resolve({
          dataUrl: originalDataUrl,
          base64: fallbackB64,
          mimeType: file.type || 'image/jpeg'
        });
      };
      img.src = originalDataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a realistic PHC Physical Stock & Daily Telemetry Register image on a canvas
 * so users can test live Gemini Vision Photo OCR with a single click even without a photo file.
 */
function generateSampleRegisterPhotoDataUrl(phcName: string, variantIndex: number = 0): {
  dataUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 620;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: '', base64: '', mimeType: 'image/jpeg', fileName: 'phc_register_scan.jpg' };
  }

  // Warm paper background
  ctx.fillStyle = '#FCFBF7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ledger ruling lines
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  for (let y = 130; y < 560; y += 56) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(920, y);
    ctx.stroke();
  }

  // Red vertical margin line
  ctx.strokeStyle = '#FCA5A5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(95, 40);
  ctx.lineTo(95, 580);
  ctx.stroke();

  // Header text
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`NATIONAL HEALTH MISSION — ${phcName.toUpperCase()} PHYSICAL STOCK REGISTER`, 115, 65);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(
    variantIndex % 2 === 0
      ? 'Date: 2026-09-28 | Daily OPD Footfall: 234 Patients | Occupied Beds: 16 | Emergency Cases: 8'
      : 'Date: 2026-09-28 | Daily OPD Footfall: 198 Patients | Occupied Beds: 14 | Emergency Cases: 6',
    115,
    98
  );

  // Table column headers
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('S.No', 50, 122);
  ctx.fillText('Medicine Name (NLEM Formulary)', 115, 122);
  ctx.fillText('Batch No.', 475, 122);
  ctx.fillText('Qty', 610, 122);
  ctx.fillText('Transaction / Ward', 690, 122);

  const rows =
    variantIndex % 2 === 0
      ? [
          ['01', 'Oral Rehydration Salts (ORS) Sachets 20.5g', 'ORS-RJ-2609', '75', 'Dispensed (OPD)'],
          ['02', 'Paracetamol Tablets IP 500mg', 'PCM-T-440', '160', 'Dispensed (OPD)'],
          ['03', 'Normal Saline (0.9% NaCl) IV Infusion 500ml', 'NS-IV-998', '50', 'Received (Warehouse)'],
          ['04', 'Amoxicillin Capsules IP 500mg', 'AMX-C-312', '90', 'Dispensed (OPD)'],
          ['05', 'Ringer Lactate (RL) IV Infusion 500ml', 'RL-IV-510', '24', 'Emergency Inpatient']
        ]
      : [
          ['01', 'Paracetamol Tablets IP 500mg', 'PCM-T-812', '200', 'Received (Warehouse)'],
          ['02', 'Zinc Sulfate Dispersible Tablets 20mg', 'ZNC-D-104', '85', 'Dispensed (OPD)'],
          ['03', 'Polyvalent Anti-Snake Venom (ASV)', 'ASV-V-092', '6', 'Emergency Inpatient'],
          ['04', 'Oral Rehydration Salts (ORS) Sachets 20.5g', 'ORS-RJ-2611', '110', 'Dispensed (OPD)']
        ];

  ctx.fillStyle = '#1E3A8A';
  ctx.font = '17px monospace';
  rows.forEach((r, idx) => {
    const y = 166 + idx * 56;
    ctx.fillText(r[0], 52, y);
    ctx.fillText(r[1], 115, y);
    ctx.fillText(r[2], 475, y);
    ctx.fillText(r[3], 610, y);
    ctx.fillText(r[4], 690, y);
  });

  // Official verification stamp visual
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = 2;
  ctx.strokeRect(650, 475, 250, 75);
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('VERIFIED BY MOIC', 675, 502);
  ctx.fillText(phcName, 675, 522);
  ctx.fillText('Signed: Dr. S. C. Bishnoi', 675, 540);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const base64 = dataUrl.split(',')[1] || '';
  return {
    dataUrl,
    base64,
    mimeType: 'image/jpeg',
    fileName: `phc_register_page_${variantIndex + 1}.jpg`
  };
}

export const RecordsDataCapture: React.FC = () => {
  const {
    medicines,
    capacity,
    verifyOCRRecord,
    registerPHCData,
    showNotification,
    selectedPHC,
    inchargeSession,
    isOfflineMode,
    transcribeAudio,
    isTranscribing,
    language: appLanguage,
    setLanguage
  } = useApp();

  const activeMedicalOfficerName =
    inchargeSession?.inchargeName || selectedPHC.medicalOfficerInCharge || 'Dr. S.C. Bishnoi (MO I/C)';

  // Photo & OCR State
  const [selectedPreset, setSelectedPreset] = useState<string>(SAMPLE_OCR_PRESETS[0]?.id || 'sample-stock-book');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifiedByOfficer, setIsVerifiedByOfficer] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastImagePayload, setLastImagePayload] = useState<{
    base64: string;
    mimeType: string;
    fileName: string;
  } | null>(null);
  const [ocrMethodLabel, setOcrMethodLabel] = useState<string>('Ready for Live Photo OCR or Preset');
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [showRawOcr, setShowRawOcr] = useState<boolean>(false);
  const [sampleScanCounter, setSampleScanCounter] = useState<number>(0);
  const [commitErrorBanner, setCommitErrorBanner] = useState<string | null>(null);
  const [ocrInspectionReport, setOcrInspectionReport] = useState<{
    isMedicalDocument: boolean;
    imageCategory: string;
    visualSummary: string;
    method: string;
    fileName: string;
    errorCode?: string;
  } | null>(null);

  // Live Camera Modal / Stream State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Voice Command to Register & Add PHC Data State (Language-Aware: en-IN, hi-IN, ta-IN, te-IN linked to active UI language)
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceLanguage, setVoiceLanguage] = useState<RegisterVoiceBcp47Locale>(() =>
    getVoiceBcp47Locale(appLanguage)
  );
  const [voiceCommandText, setVoiceCommandText] = useState<string>(
    REGISTER_VOICE_LANGUAGES[resolveVoiceLanguageConfig(appLanguage).code].sampleCommands[0].transcript
  );
  const [isVoiceProcessing, setIsVoiceProcessing] = useState<boolean>(false);
  const [autoCommitVoice, setAutoCommitVoice] = useState<boolean>(false);
  const [lastVoiceResult, setLastVoiceResult] = useState<VoiceEntryResult | null>(null);
  const [parsedVoiceCommand, setParsedVoiceCommand] = useState<NormalizedRegisterVoiceCommand | null>(null);
  const [voiceListeningStatus, setVoiceListeningStatus] = useState<
    'IDLE' | 'LISTENING_SPEECH' | 'AI_TRANSCRIBING' | 'PARSING' | 'PARSED' | 'NEEDS_CONFIRMATION' | 'ERROR'
  >('IDLE');
  const [voicePipelineSource, setVoicePipelineSource] = useState<string>('Ready (SpeechRecognition + Gemini Audio ASR)');
  const [voiceErrorBanner, setVoiceErrorBanner] = useState<string | null>(null);
  const [registerSearchQuery, setRegisterSearchQuery] = useState<string>('');

  // Editable confirmation state before modifying inventory when command is low-confidence or user wants to review
  const [pendingConfirmAction, setPendingConfirmAction] = useState<'ADD' | 'DISPENSE' | 'UPDATE'>('ADD');
  const [pendingConfirmMedName, setPendingConfirmMedName] = useState<string>('');
  const [pendingConfirmQty, setPendingConfirmQty] = useState<number>(20);
  const [pendingConfirmBatch, setPendingConfirmBatch] = useState<string>('BATCH-VOICE-26');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const browserInterimTranscriptRef = useRef<string>('');

  // Sync Physical Register voice language parameter (en-IN, hi-IN, ta-IN, te-IN) when main app UI language switcher changes
  useEffect(() => {
    const cfg = resolveVoiceLanguageConfig(appLanguage);
    setVoiceLanguage(cfg.locale);
    setVoiceCommandText(REGISTER_VOICE_LANGUAGES[cfg.code].sampleCommands[0].transcript);
    setVoiceErrorBanner(null);
  }, [appLanguage]);

  // PHC Daily Data Quick Registration State (OPD Footfall, Beds, Emergency, Stock)
  const [phcOpdInput, setPhcOpdInput] = useState<number>(capacity.opdFootfall || 210);
  const [phcBedsInput, setPhcBedsInput] = useState<number>(capacity.occupiedBeds || 14);
  const [phcEmergencyInput, setPhcEmergencyInput] = useState<number>(capacity.emergencyFootfall || 8);
  const [quickMedId, setQuickMedId] = useState<string>(medicines[0]?.id || '');
  const [quickMedQty, setQuickMedQty] = useState<number>(50);
  const [quickMedTx, setQuickMedTx] = useState<string>('Received (Warehouse)');
  const [quickMedBatch, setQuickMedBatch] = useState<string>('BATCH-PHC-2609');

  const [extractedRecords, setExtractedRecords] = useState<ExtractedRecord[]>(() =>
    (SAMPLE_OCR_PRESETS[0]?.records || []).map((r) => {
      const mMatch = resolveMedicineMatch(medicines, r.medicine);
      const defaultExpiry = mMatch.status === 'MATCHED' ? mMatch.medicine.expiryDate : undefined;
      return {
        id: r.id,
        medicine: r.medicine,
        rawMedicineText: r.medicine,
        batch: r.batch,
        expiryDate: defaultExpiry,
        quantity: r.quantity,
        transaction: r.transaction,
        date: r.date,
        confidenceScore: r.confidenceScore,
        verificationState: mMatch.status === 'MATCHED' && r.confidenceScore >= 0.85 ? 'VERIFIED' : 'NEEDS_REVIEW',
        correctedFields: []
      };
    })
  );

  const [committedLog, setCommittedLog] = useState<CommittedAuditLogEntry[]>([
    {
      id: 'LOG-4491',
      name: 'Paracetamol Tablets IP 500mg [Dispensed (OPD)]',
      qty: 90,
      date: '2026-09-28',
      time: '10:30',
      medicalOfficer: activeMedicalOfficerName,
      phcName: selectedPHC.name,
      phcCode: selectedPHC.code,
      batch: 'PCM-T-440',
      expiryDate: '2027-08-15',
      correctedFields: []
    },
    {
      id: 'LOG-4490',
      name: 'Oral Rehydration Salts (ORS) Sachets 20.5g [Received (Warehouse)]',
      qty: 200,
      date: '2026-09-28',
      time: '09:15',
      medicalOfficer: activeMedicalOfficerName,
      phcName: selectedPHC.name,
      phcCode: selectedPHC.code,
      batch: 'ORS-RJ-2609',
      expiryDate: '2027-06-30',
      correctedFields: ['Quantity']
    }
  ]);

  const fieldLabelMap: Record<string, string> = {
    medicine: 'Medicine',
    quantity: 'Quantity',
    batch: 'Batch',
    expiryDate: 'Expiry Date',
    transaction: 'Transaction',
    date: 'Date'
  };

  const handleRecordChange = (id: string, field: keyof ExtractedRecord, value: any) => {
    setCommitErrorBanner(null);
    setExtractedRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const label = fieldLabelMap[field as string];
        const nextCorrected = label
          ? Array.from(new Set([...(r.correctedFields || []), label]))
          : r.correctedFields || [];
        let nextExpiry = field === 'expiryDate' ? value : r.expiryDate;
        if (field === 'medicine') {
          const mMatch = resolveMedicineMatch(medicines, String(value || ''));
          if (mMatch.status === 'MATCHED' && !nextExpiry) {
            nextExpiry = mMatch.medicine.expiryDate;
          }
        }
        return {
          ...r,
          [field]: value,
          expiryDate: nextExpiry,
          verificationState: r.verificationState === 'REJECTED' ? 'MODIFIED' : 'MODIFIED',
          correctedFields: nextCorrected
        };
      })
    );
  };

  const setRecordVerificationState = (
    id: string,
    state: 'NEEDS_REVIEW' | 'VERIFIED' | 'MODIFIED' | 'REJECTED'
  ) => {
    setCommitErrorBanner(null);
    setExtractedRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, verificationState: state } : r))
    );
  };

  const validateExtractedRow = (rec: ExtractedRecord) => {
    const match = resolveMedicineMatch(medicines, rec.medicine);
    const rawQty = rec.quantity;
    const isQtyMissing = rawQty === '' || rawQty === null || rawQty === undefined;
    const numQty = Number(rawQty);
    const isQtyInvalid = !isQtyMissing && (!Number.isFinite(numQty) || numQty <= 0);
    const isBatchMissing = !rec.batch || !String(rec.batch).trim() || rec.batch === 'UNSPECIFIED';
    const isExpiryUnclear =
      !rec.expiryDate ||
      !String(rec.expiryDate).trim() ||
      Number.isNaN(Date.parse(`${rec.expiryDate}T00:00:00Z`));
    const isExpired =
      !isExpiryUnclear &&
      Date.parse(`${rec.expiryDate}T00:00:00Z`) <= Date.parse('2026-09-22T00:00:00Z');
    const isLowConfidence =
      rec.confidenceScore !== null && rec.confidenceScore !== undefined && rec.confidenceScore < 0.8;

    const issues: string[] = [];
    if (match.status === 'UNMATCHED') {
      issues.push('Medicine cannot be matched to PHC formulary');
    } else if (match.status === 'AMBIGUOUS') {
      issues.push(`Multiple possible medicine matches (${match.candidates.length} candidates)`);
    }
    if (isQtyMissing) {
      issues.push('Quantity missing');
    } else if (isQtyInvalid) {
      issues.push(`Invalid quantity (${rawQty}) — must be > 0`);
    }
    if (isExpiryUnclear) {
      issues.push('Expiry information unclear or missing');
    } else if (isExpired) {
      issues.push(`Batch expiry (${rec.expiryDate}) is expired`);
    }
    if (isBatchMissing) {
      issues.push('Batch number unclear');
    }

    const canVerifyAndCommit =
      rec.verificationState !== 'REJECTED' &&
      match.status === 'MATCHED' &&
      !isQtyMissing &&
      !isQtyInvalid;

    const matchingConfidenceLabel =
      match.status === 'MATCHED'
        ? match.medicine.name.toLowerCase() === String(rec.medicine || '').trim().toLowerCase()
          ? 'Exact Match (100%)'
          : 'Formulary Match (92%)'
        : match.status === 'AMBIGUOUS'
        ? `Ambiguous (${match.candidates.length})`
        : 'Unmatched (0%)';

    return {
      match,
      isQtyMissing,
      isQtyInvalid,
      numQty: isQtyMissing || isQtyInvalid ? 0 : Math.round(numQty),
      isBatchMissing,
      isExpiryUnclear,
      isExpired,
      isBatchExpired: isExpired,
      isLowConfidence,
      issues,
      hasWarning: issues.length > 0 || isLowConfidence,
      matchingConfidenceLabel,
      canVerifyAndCommit
    };
  };

  const addBlankRecord = () => {
    setCommitErrorBanner(null);
    const defaultMed = medicines[0]?.name || 'Oral Rehydration Salts (ORS) Sachets 20.5g';
    const defaultBatch = medicines[0]?.batchNumber || 'BATCH-2609';
    const defaultExpiry = medicines[0]?.expiryDate || '2027-06-30';
    setExtractedRecords((prev) => [
      {
        id: `ocr-manual-${Date.now()}`,
        medicine: defaultMed,
        rawMedicineText: 'Manual Officer Entry',
        batch: defaultBatch,
        expiryDate: defaultExpiry,
        quantity: 25,
        transaction: 'Dispensed (OPD)',
        date: '2026-09-28',
        confidenceScore: null,
        verificationState: 'MODIFIED',
        correctedFields: ['Manual Entry']
      },
      ...prev
    ]);
  };

  // Load edge-case OCR rows to verify error handling (Unmatched, Ambiguous, Missing/Invalid Qty, Unclear Expiry)
  const loadOcrEdgeCaseScenario = (
    scenario: 'UNMATCHED_AND_AMBIGUOUS' | 'INVALID_QTY_AND_EXPIRY' | 'UNREADABLE_IMAGE'
  ) => {
    setCommitErrorBanner(null);
    if (scenario === 'UNREADABLE_IMAGE') {
      setExtractedRecords([]);
      setOcrInspectionReport({
        isMedicalDocument: false,
        imageCategory: 'Unreadable / Blurred Register Photo',
        visualSummary:
          'Image cannot be read or no medicine entries were detected due to severe blur/low contrast. Please retry capture, upload a clearer register photo, or enter rows manually.',
        method: 'Gemini Vision OCR Diagnostic',
        fileName: 'blurred_register_page.jpg',
        errorCode: 'IMAGE_UNREADABLE'
      });
      showNotification('OCR Diagnostic: Image cannot be read (0 medicines extracted). Retry or add rows manually.');
      return;
    }

    setOcrInspectionReport({
      isMedicalDocument: true,
      imageCategory: 'Handwritten Register Page (Needs Human Verification)',
      visualSummary:
        'Extracted register entries contain ambiguous drug names, unmatched brand names, missing/invalid quantities, or unclear expiry dates requiring Medical Officer review.',
      method: 'Gemini Vision OCR + NLEM Matcher',
      fileName: 'handwritten_register_review.jpg'
    });

    if (scenario === 'UNMATCHED_AND_AMBIGUOUS') {
      setExtractedRecords([
        {
          id: `ocr-edge-unmatched-${Date.now()}`,
          medicine: 'Cefpodoxime Proxetil 200mg BrandX',
          rawMedicineText: 'Tab Cefpodoxime 200mg (Handwritten)',
          batch: 'CFP-991',
          expiryDate: '2027-05-30',
          quantity: 40,
          transaction: 'Dispensed (OPD)',
          date: '2026-09-28',
          confidenceScore: 0.64,
          verificationState: 'NEEDS_REVIEW',
          correctedFields: []
        },
        {
          id: `ocr-edge-ambig-${Date.now() + 1}`,
          medicine: 'Paracetamol',
          rawMedicineText: 'Paracetamol (Strength smudged)',
          batch: 'PCM-2608',
          expiryDate: '2027-08-15',
          quantity: 100,
          transaction: 'Dispensed (OPD)',
          date: '2026-09-28',
          confidenceScore: 0.72,
          verificationState: 'NEEDS_REVIEW',
          correctedFields: []
        },
        {
          id: `ocr-edge-valid-${Date.now() + 2}`,
          medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
          rawMedicineText: 'ORS Sachets 20.5g WHO',
          batch: 'ORS-RJ-2609',
          expiryDate: '2027-06-30',
          quantity: 80,
          transaction: 'Dispensed (OPD)',
          date: '2026-09-28',
          confidenceScore: 0.96,
          verificationState: 'VERIFIED',
          correctedFields: []
        }
      ]);
      showNotification('Loaded OCR review rows with Unmatched & Ambiguous medicines for Medical Officer verification.');
    } else {
      setExtractedRecords([
        {
          id: `ocr-edge-qty-missing-${Date.now()}`,
          medicine: 'Amoxicillin Capsules IP 500mg',
          rawMedicineText: 'Cap Amoxicillin 500mg (Qty blank)',
          batch: 'AMX-C-312',
          expiryDate: '',
          quantity: '',
          transaction: 'Dispensed (OPD)',
          date: '2026-09-28',
          confidenceScore: 0.68,
          verificationState: 'NEEDS_REVIEW',
          correctedFields: []
        },
        {
          id: `ocr-edge-qty-invalid-${Date.now() + 1}`,
          medicine: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
          rawMedicineText: 'IV Normal Saline 500ml (Qty: -5)',
          batch: 'UNSPECIFIED',
          expiryDate: 'UNCLEAR-EXP',
          quantity: -5,
          transaction: 'Received (Warehouse)',
          date: '2026-09-28',
          confidenceScore: 0.61,
          verificationState: 'NEEDS_REVIEW',
          correctedFields: []
        }
      ]);
      showNotification('Loaded OCR review rows with Missing/Invalid Quantity & Unclear Expiry for correction.');
    }
  };

  const removeRecord = (id: string) => {
    setCommitErrorBanner(null);
    setExtractedRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Run OCR on either a real uploaded photo (base64) or a preset template
  const runOCR = async (options?: {
    presetId?: string;
    imageBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => {
    const activePresetId = options?.presetId || selectedPreset;
    const imgBase64 = options?.imageBase64;
    const imgMime = options?.mimeType || 'image/jpeg';
    const imgName = options?.fileName || 'register_photo.jpg';

    setIsProcessing(true);
    setCommitErrorBanner(null);

    try {
      const res = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          imgBase64
            ? {
                imageBase64: imgBase64,
                mimeType: imgMime,
                fileName: imgName,
                phcId: selectedPHC.id,
                language: appLanguage
              }
            : {
                presetId: activePresetId,
                phcId: selectedPHC.id,
                language: appLanguage
              }
        )
      });

      if (!res.ok) {
        let apiErrDetail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.error) apiErrDetail = errJson.error;
        } catch {}
        throw new Error(`OCR API Failure (${apiErrDetail})`);
      }

      if (res.ok) {
        const data = await res.json();
        if (data.method) {
          setOcrMethodLabel(data.method);
        }
        setRawOcrText(data.rawOcrText || '');

        if (imgBase64) {
          const isValidDoc =
            data.isMedicalDocument !== false &&
            Array.isArray(data.records) &&
            data.records.length > 0;

          setOcrInspectionReport({
            isMedicalDocument: isValidDoc,
            imageCategory:
              data.imageCategory ||
              (isValidDoc ? 'Verified Medical Document' : 'No Medicine Detected / Non-Medical Image'),
            visualSummary:
              data.visualSummary ||
              data.name ||
              (isValidDoc
                ? `Extracted ${data.records.length} medicine entry/entries from photo.`
                : 'No medical register, prescription, or medicine label was detected in this image.'),
            method: data.method || 'Gemini Vision & Optical Character Verification',
            fileName: imgName,
            errorCode: isValidDoc ? undefined : 'NO_MEDICINE_DETECTED'
          });

          if (!isValidDoc) {
            setExtractedRecords([]);
            setIsProcessing(false);
            showNotification(
              `No Medicine Detected: ${
                data.visualSummary ||
                'No medicine names or register entries were found in your uploaded image (0 items extracted).'
              }`
            );
            return;
          }
        } else {
          setOcrInspectionReport(null);
        }

        if (data.phcTelemetry) {
          if (data.phcTelemetry.opdFootfall) setPhcOpdInput(Number(data.phcTelemetry.opdFootfall));
          if (data.phcTelemetry.occupiedBeds) setPhcBedsInput(Number(data.phcTelemetry.occupiedBeds));
          if (data.phcTelemetry.emergencyCases) setPhcEmergencyInput(Number(data.phcTelemetry.emergencyCases));
        }

        if (Array.isArray(data.records) && data.records.length > 0) {
          setExtractedRecords(
            data.records.map((r: any, idx: number) => {
              const mMatch = resolveMedicineMatch(medicines, r.medicine || '');
              const rawConf =
                r.confidenceScore !== undefined && r.confidenceScore !== null
                  ? Number(r.confidenceScore)
                  : null;
              const rawQty = r.quantity !== undefined && r.quantity !== null ? r.quantity : '';
              const numQty = Number(rawQty);
              const isValidRow =
                mMatch.status === 'MATCHED' &&
                rawQty !== '' &&
                Number.isFinite(numQty) &&
                numQty > 0 &&
                (rawConf === null || rawConf >= 0.8);
              const fallbackExpiry =
                r.expiryDate ||
                (mMatch.status === 'MATCHED' ? mMatch.medicine.expiryDate : undefined);

              return {
                id: r.id || `ocr-${Date.now()}-${idx}`,
                medicine: r.medicine || '',
                rawMedicineText: r.rawMedicineText || r.medicine || '',
                batch: r.batch || 'UNSPECIFIED',
                expiryDate: fallbackExpiry,
                quantity: rawQty,
                transaction: r.transaction || 'Dispensed (OPD)',
                date: r.date || '2026-09-28',
                prescribedBy: r.prescribedBy,
                confidenceScore: rawConf,
                verificationState: isValidRow ? 'VERIFIED' : 'NEEDS_REVIEW',
                correctedFields: []
              };
            })
          );
          setIsVerifiedByOfficer(true);
          setIsProcessing(false);
          showNotification(
            imgBase64
              ? `Photo OCR Complete (${data.method || 'Gemini Vision'}): Extracted ${data.records.length} medicine item(s) from "${imgName}".`
              : `Loaded ${data.records.length} register rows from ${data.name || 'preset'}.`
          );
          return;
        }
      }
    } catch (err) {
      console.warn('OCR request error:', err);
      const errMsg = err instanceof Error ? err.message : 'OCR service unreachable';
      if (imgBase64) {
        setExtractedRecords([]);
        setOcrInspectionReport({
          isMedicalDocument: false,
          imageCategory: 'OCR API / Image Read Failure',
          visualSummary: `Could not extract medical records (${errMsg}). Please retry scan, check connection, or upload a clearer photo of a medical register.`,
          method: 'Vision OCR Engine',
          fileName: imgName,
          errorCode: 'OCR_API_FAILURE'
        });
        setCommitErrorBanner(
          `OCR Scan Failed (${errMsg}): No unverified data was committed. You can click "Re-Scan Photo" to retry or add rows manually.`
        );
        setIsProcessing(false);
        showNotification('OCR API / scan error — please retry or correct manually.');
        return;
      }
    }

    // Only load a preset template when the user explicitly clicked a preset (never for uploaded photos)
    if (!imgBase64) {
      const matchedPreset =
        SAMPLE_OCR_PRESETS.find((p) => p.id === activePresetId) || SAMPLE_OCR_PRESETS[0];
      if (matchedPreset) {
        setExtractedRecords(
          matchedPreset.records.map((r) => {
            const mMatch = resolveMedicineMatch(medicines, r.medicine);
            return {
              id: `${r.id}-${Date.now()}`,
              medicine: r.medicine,
              rawMedicineText: r.medicine,
              batch: r.batch,
              expiryDate: mMatch.status === 'MATCHED' ? mMatch.medicine.expiryDate : undefined,
              quantity: r.quantity,
              transaction: r.transaction,
              date: r.date,
              confidenceScore: r.confidenceScore,
              verificationState:
                mMatch.status === 'MATCHED' && r.confidenceScore >= 0.85 ? 'VERIFIED' : 'NEEDS_REVIEW',
              correctedFields: []
            };
          })
        );
        setOcrMethodLabel('Standard PHC Register Template');
      }
      setIsVerifiedByOfficer(true);
      setIsProcessing(false);
      showNotification('Register preset template loaded.');
    } else {
      setExtractedRecords([]);
      setIsProcessing(false);
    }
  };

  // Handle user uploading a photo file
  const handlePhotoFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      showNotification(`Reading photo "${file.name}" with Gemini Vision OCR...`);
      const compressed = await fileToCompressedBase64(file);
      setPreviewImage(compressed.dataUrl);
      setLastImagePayload({
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        fileName: file.name
      });
      await runOCR({
        imageBase64: compressed.base64,
        mimeType: compressed.mimeType,
        fileName: file.name
      });
    } catch (err) {
      console.error('Photo processing error:', err);
      setIsProcessing(false);
      setOcrInspectionReport({
        isMedicalDocument: false,
        imageCategory: 'Image Cannot Be Read',
        visualSummary: `The selected file "${file.name}" could not be decoded as a valid image. Please upload a clear JPG, PNG, or WEBP photo.`,
        method: 'Local Image Decoder',
        fileName: file.name,
        errorCode: 'IMAGE_UNREADABLE'
      });
      showNotification('Image cannot be read. Please try another photo.');
    }
  };

  // Handle 1-click generated sample register photo scan
  const handleGenerateAndScanSamplePhoto = async () => {
    const nextIdx = sampleScanCounter;
    setSampleScanCounter((prev) => prev + 1);
    const sample = generateSampleRegisterPhotoDataUrl(selectedPHC.name, nextIdx);
    if (!sample.base64) return;
    setPreviewImage(sample.dataUrl);
    setLastImagePayload({
      base64: sample.base64,
      mimeType: sample.mimeType,
      fileName: sample.fileName
    });
    await runOCR({
      imageBase64: sample.base64,
      mimeType: sample.mimeType,
      fileName: sample.fileName
    });
  };

  // Open live camera viewfinder
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 100);
    } catch {
      showNotification('Camera access unavailable in preview frame — opening photo file selector.');
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureCameraFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.split(',')[1] || '';
    stopCamera();
    const fileName = `camera_capture_${Date.now()}.jpg`;
    setPreviewImage(dataUrl);
    setLastImagePayload({ base64, mimeType: 'image/jpeg', fileName });
    await runOCR({ imageBase64: base64, mimeType: 'image/jpeg', fileName });
  };

  // Commit a single verified row immediately
  const handleCommitSingleRow = async (rec: ExtractedRecord) => {
    setCommitErrorBanner(null);
    if (rec.verificationState === 'REJECTED') {
      const msg = `Row "${rec.medicine}" is marked Rejected / Not Usable and cannot be committed to inventory.`;
      setCommitErrorBanner(msg);
      showNotification(msg);
      return;
    }

    const rowValidation = validateExtractedRow(rec);
    if (rowValidation.match.status !== 'MATCHED') {
      setCommitErrorBanner(rowValidation.match.reason);
      showNotification(rowValidation.match.reason);
      return;
    }
    if (rowValidation.isQtyMissing || rowValidation.isQtyInvalid) {
      const qtyMsg = rowValidation.isQtyMissing
        ? `Quantity is missing for "${rec.medicine}". Please enter a valid quantity > 0 before committing.`
        : `Invalid quantity (${rec.quantity}) for "${rec.medicine}". Quantity must be a positive number > 0.`;
      setCommitErrorBanner(qtyMsg);
      showNotification(qtyMsg);
      return;
    }

    const matchedMed = rowValidation.match.medicine;
    const cleanQty = rowValidation.numQty;

    const result = await verifyOCRRecord({
      medicineId: matchedMed.id,
      medicineName: matchedMed.name,
      quantity: cleanQty,
      transaction: rec.transaction,
      date: rec.date,
      batch: rec.batch
    });

    if (result.ok) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCommittedLog((prev) => [
        {
          id: `LOG-${Math.floor(4500 + Math.random() * 5000)}`,
          name: `${result.matchedMedicineName || matchedMed.name} [${rec.transaction}]`,
          qty: cleanQty,
          date: rec.date,
          time: nowTime,
          medicalOfficer: activeMedicalOfficerName,
          phcName: selectedPHC.name,
          phcCode: selectedPHC.code,
          batch: rec.batch || matchedMed.batchNumber,
          expiryDate: rec.expiryDate || matchedMed.expiryDate,
          correctedFields: rec.correctedFields || []
        },
        ...prev
      ]);
      setExtractedRecords((prev) => prev.filter((r) => r.id !== rec.id));
    } else if (result.error) {
      setCommitErrorBanner(result.error);
    }
  };

  // Commit all verified rows in the register table (never commits REJECTED or invalid/unverified rows)
  const handleCommitAll = async () => {
    if (extractedRecords.length === 0) return;
    setCommitErrorBanner(null);

    if (!isVerifiedByOfficer) {
      const msg = 'Medical Officer verification checkbox must be enabled before committing register records to the inventory ledger.';
      setCommitErrorBanner(msg);
      showNotification(msg);
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const committedItems: CommittedAuditLogEntry[] = [];
    const remainingRecords: ExtractedRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < extractedRecords.length; i++) {
      const rec = extractedRecords[i];

      // Skip rejected rows without committing them
      if (rec.verificationState === 'REJECTED') {
        remainingRecords.push(rec);
        continue;
      }

      const rowVal = validateExtractedRow(rec);

      if (rowVal.match.status !== 'MATCHED') {
        remainingRecords.push({ ...rec, verificationState: 'NEEDS_REVIEW' });
        errors.push(rowVal.match.reason);
        continue;
      }

      if (rowVal.isQtyMissing || rowVal.isQtyInvalid) {
        remainingRecords.push({ ...rec, verificationState: 'NEEDS_REVIEW' });
        errors.push(
          rowVal.isQtyMissing
            ? `Missing quantity for "${rec.medicine}".`
            : `Invalid quantity (${rec.quantity}) for "${rec.medicine}".`
        );
        continue;
      }

      if (rec.verificationState === 'NEEDS_REVIEW') {
        remainingRecords.push(rec);
        errors.push(`"${rec.medicine}" is marked "Needs Review" — please click Verify or edit before committing.`);
        continue;
      }

      const matchedMed = rowVal.match.medicine;
      const cleanQty = rowVal.numQty;

      const result = await verifyOCRRecord({
        medicineId: matchedMed.id,
        medicineName: matchedMed.name,
        quantity: cleanQty,
        transaction: rec.transaction,
        date: rec.date,
        batch: rec.batch
      });

      if (result.ok) {
        committedItems.push({
          id: `LOG-${Math.floor(4500 + Math.random() * 5000) + i}`,
          name: `${result.matchedMedicineName || matchedMed.name} [${
            result.matchedMedicineId || matchedMed.id
          }] (${rec.transaction})`,
          qty: cleanQty,
          date: rec.date,
          time: nowTime,
          medicalOfficer: activeMedicalOfficerName,
          phcName: selectedPHC.name,
          phcCode: selectedPHC.code,
          batch: rec.batch || matchedMed.batchNumber,
          expiryDate: rec.expiryDate || matchedMed.expiryDate,
          correctedFields: rec.correctedFields || []
        });
      } else {
        remainingRecords.push(rec);
        errors.push(result.error || `Failed to commit "${rec.medicine}".`);
      }
    }

    if (committedItems.length > 0) {
      setCommittedLog((prev) => [...committedItems, ...prev]);
    }

    setExtractedRecords(remainingRecords);

    if (errors.length > 0) {
      const errorSummary = `Committed ${committedItems.length} verified item(s). Held back ${errors.length} item(s) requiring review: ${errors.join(' | ')}`;
      setCommitErrorBanner(errorSummary);
      showNotification(errorSummary);
    } else if (committedItems.length > 0) {
      showNotification(
        `Successfully verified and committed ${committedItems.length} register record(s) to ${selectedPHC.name} stock ledger${
          isOfflineMode ? ' (Buffered to Offline Queue)' : ''
        }!`
      );
    } else {
      showNotification('No verified records eligible for ledger commit.');
    }
  };

  // Voice Recording & Command Execution for Physical Register (Hybrid Browser SpeechRecognition + Server AI Transcription Fallback)
  const toggleVoiceRecording = async (languageParam?: RegisterVoiceBcp47Locale | string) => {
    const activeLangConfig = resolveVoiceLanguageConfig(languageParam || voiceLanguage || appLanguage);
    const targetBcp47Locale: RegisterVoiceBcp47Locale = activeLangConfig.locale;

    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    setVoiceErrorBanner(null);
    browserInterimTranscriptRef.current = '';
    let speechErrorOccurred = false;

    // 1. Start Browser SpeechRecognition with exact BCP-47 locale (en-IN, hi-IN, ta-IN, te-IN) if supported
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = targetBcp47Locale; // en-IN, hi-IN, ta-IN, or te-IN
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
            setVoiceCommandText(cleanInterim);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn(`SpeechRecognition (${targetBcp47Locale}) notice:`, event?.error);
          speechErrorOccurred = true;
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition start failed, relying on AI audio capture:', err);
        speechErrorOccurred = true;
      }
    } else {
      speechErrorOccurred = true;
    }

    // 2. Simultaneously capture raw microphone audio via MediaRecorder for Server AI Transcription fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
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
        stream.getTracks().forEach((t) => t.stop());

        const browserCapturedText = browserInterimTranscriptRef.current.trim();
        const browserPreviewParse = browserCapturedText
          ? parsePhysicalRegisterVoiceCommand(browserCapturedText, targetBcp47Locale, medicines)
          : null;

        // Fast path: Browser SpeechRecognition succeeded AND returned a valid command in the selected language
        if (
          !speechErrorOccurred &&
          browserCapturedText.length > 1 &&
          browserPreviewParse &&
          browserPreviewParse.action !== 'UNKNOWN' &&
          !browserPreviewParse.validationError
        ) {
          setVoicePipelineSource(`Browser SpeechRecognition (${targetBcp47Locale})`);
          setVoiceCommandText(browserCapturedText);
          await executeRegisterVoiceCommand(
            browserCapturedText,
            targetBcp47Locale,
            `Browser SpeechRecognition (${targetBcp47Locale})`
          );
          return;
        }

        // Primary AI Fallback: Browser SpeechRecognition failed, returned empty/unclear text, or language was unsupported
        setVoiceListeningStatus('AI_TRANSCRIBING');
        setVoicePipelineSource(`AI Transcription Fallback (${targetBcp47Locale} · Gemini Audio)`);
        showNotification(
          `Transcribing ${activeLangConfig.label} (${targetBcp47Locale}) audio via Gemini transcription API...`
        );

        const aiText = await transcribeAudio(
          audioBlob,
          targetBcp47Locale,
          browserCapturedText
        );
        const finalTranscript = (aiText || browserCapturedText).trim();

        if (finalTranscript) {
          setVoiceCommandText(finalTranscript);
          await executeRegisterVoiceCommand(
            finalTranscript,
            targetBcp47Locale,
            `Gemini Transcription API Fallback (${targetBcp47Locale})`
          );
        } else {
          setVoiceListeningStatus('ERROR');
          const unclearMsg =
            'Could not understand command in selected language. Please try again or edit manually.';
          setVoiceErrorBanner(unclearMsg);
          showNotification(unclearMsg);
        }
      };

      recorder.start();
      setIsRecordingVoice(true);
      setVoiceListeningStatus('LISTENING_SPEECH');
      setVoicePipelineSource(
        SpeechRecognitionAPI
          ? `Listening (${targetBcp47Locale} SpeechRecognition + Gemini Audio Capture)`
          : `Listening (${targetBcp47Locale} Gemini Audio Capture)`
      );
      showNotification(
        `Listening in ${activeLangConfig.label} (${targetBcp47Locale})... Speak your register command now.`
      );
    } catch {
      setIsRecordingVoice(false);
      // If MediaRecorder is blocked in iframe preview, route through /api/voice/transcribe fallback or execute current text
      const fallbackText = browserInterimTranscriptRef.current.trim() || voiceCommandText.trim();
      if (fallbackText) {
        showNotification(
          `Executing ${activeLangConfig.label} (${targetBcp47Locale}) voice command...`
        );
        await executeRegisterVoiceCommand(
          fallbackText,
          targetBcp47Locale,
          `Direct Voice Command Parser (${targetBcp47Locale})`
        );
      } else {
        setVoiceListeningStatus('ERROR');
        setVoiceErrorBanner(
          'Microphone access unavailable in preview environment. Type or select a command below.'
        );
      }
    }
  };

  // Apply a normalized voice command (ADD, DISPENSE, UPDATE, SEARCH, VERIFY, SAVE, ADD_PHC_DATA) to the Physical Register
  const applyNormalizedVoiceCommandToRegister = async (
    cmd: NormalizedRegisterVoiceCommand,
    forceExecute: boolean = false
  ) => {
    setVoiceErrorBanner(null);

    if (cmd.action === 'UNKNOWN' || (cmd.validationError && !forceExecute)) {
      setVoiceListeningStatus('NEEDS_CONFIRMATION');
      setVoiceErrorBanner(
        `Could not understand command in selected language (${cmd.locale}). Please try again or edit manually.`
      );
      setPendingConfirmAction('ADD');
      setPendingConfirmMedName(cmd.medicineName || medicines[0]?.name || 'Paracetamol Tablets IP 500mg');
      setPendingConfirmQty(cmd.quantity || 20);
      setPendingConfirmBatch(cmd.batch || medicines[0]?.batchNumber || 'BATCH-VOICE-26');
      showNotification(cmd.nativeConfirmation);
      return;
    }

    // If command has low confidence or requires human confirmation before modifying inventory
    if (cmd.requiresConfirmation && !forceExecute) {
      setVoiceListeningStatus('NEEDS_CONFIRMATION');
      setPendingConfirmAction(
        cmd.action === 'DISPENSE' ? 'DISPENSE' : cmd.action === 'UPDATE' ? 'UPDATE' : 'ADD'
      );
      setPendingConfirmMedName(cmd.medicineName || medicines[0]?.name || 'Paracetamol Tablets IP 500mg');
      setPendingConfirmQty(cmd.quantity || 20);
      setPendingConfirmBatch(cmd.batch || medicines[0]?.batchNumber || 'BATCH-VOICE-26');
      showNotification(
        `Please review & confirm interpreted ${cmd.locale} command before applying to register.`
      );
      return;
    }

    setVoiceListeningStatus('PARSED');

    // ACTION 1: SAVE REGISTER
    if (cmd.action === 'SAVE') {
      setIsVerifiedByOfficer(true);
      await handleCommitAll();
      showNotification(cmd.nativeConfirmation);
      return;
    }

    // ACTION 2: VERIFY ENTRY
    if (cmd.action === 'VERIFY') {
      let verifiedCount = 0;
      setExtractedRecords((prev) =>
        prev.map((row) => {
          const matchesMed =
            !cmd.medicineName ||
            row.medicine.toLowerCase().includes(cmd.medicineName.toLowerCase().split(' ')[0]);
          if (matchesMed && row.verificationState !== 'REJECTED') {
            verifiedCount++;
            return { ...row, verificationState: 'VERIFIED' };
          }
          return row;
        })
      );
      setIsVerifiedByOfficer(true);
      showNotification(
        verifiedCount > 0
          ? `${cmd.nativeConfirmation} (${verifiedCount} row(s) marked Verified)`
          : cmd.nativeConfirmation
      );
      return;
    }

    // ACTION 3: SEARCH REGISTER
    if (cmd.action === 'SEARCH') {
      const searchTarget = cmd.medicineName || cmd.rawTranscript;
      setRegisterSearchQuery(searchTarget);
      showNotification(cmd.nativeConfirmation);
      return;
    }

    // ACTION 4: ADD PHC DATA (OPD Footfall / Beds / Stock)
    if (cmd.action === 'ADD_PHC_DATA') {
      if (cmd.opdFootfall) setPhcOpdInput(cmd.opdFootfall);
      if (cmd.occupiedBeds) setPhcBedsInput(cmd.occupiedBeds);
      if (cmd.emergencyCases) setPhcEmergencyInput(cmd.emergencyCases);

      const resolvedMed = cmd.medicineName || medicines[0]?.name || 'Normal Saline (0.9% NaCl) IV Infusion 500ml';
      const resolvedQty = cmd.quantity || 50;
      const resolvedBatch = cmd.batch || 'BATCH-PHC-2609';

      await registerPHCData({
        medicineName: resolvedMed,
        quantity: resolvedQty,
        transaction: 'Received (Warehouse)',
        batch: resolvedBatch,
        opdFootfall: cmd.opdFootfall ?? undefined,
        occupiedBeds: cmd.occupiedBeds ?? undefined,
        emergencyFootfall: cmd.emergencyCases ?? undefined,
        notes: `Voice PHC Data (${cmd.locale}): "${cmd.rawTranscript}"`
      });
      showNotification(cmd.nativeConfirmation);
      return;
    }

    // ACTION 5: UPDATE EXISTING REGISTER ROW (or create updated row)
    const match = resolveMedicineMatch(medicines, cmd.medicineName || '');
    const resolvedMedName =
      match.status === 'MATCHED'
        ? match.medicine.name
        : cmd.medicineName || 'Paracetamol Tablets IP 500mg';
    const resolvedBatch =
      cmd.batch || (match.status === 'MATCHED' ? match.medicine.batchNumber : 'BATCH-VOICE-26');
    const resolvedQty = Math.max(1, Number(cmd.quantity) || 20);

    if (cmd.action === 'UPDATE') {
      setRegisterSearchQuery('');
      const existingIdx = extractedRecords.findIndex(
        (r) => r.medicine.toLowerCase() === resolvedMedName.toLowerCase()
      );
      if (existingIdx >= 0) {
        setExtractedRecords((prev) =>
          prev.map((r, i) =>
            i === existingIdx
              ? {
                  ...r,
                  quantity: resolvedQty,
                  batch: resolvedBatch,
                  rawMedicineText: `Voice Update (${cmd.locale}): "${cmd.rawTranscript}"`,
                  verificationState: match.status === 'MATCHED' ? 'VERIFIED' : 'MODIFIED',
                  correctedFields: Array.from(new Set([...(r.correctedFields || []), 'Quantity (Voice)']))
                }
              : r
          )
        );
      } else {
        const updatedRow: ExtractedRecord = {
          id: `ocr-voice-upd-${Date.now()}`,
          medicine: resolvedMedName,
          rawMedicineText: `Voice Update (${cmd.locale}): "${cmd.rawTranscript}"`,
          batch: resolvedBatch,
          expiryDate: match.status === 'MATCHED' ? match.medicine.expiryDate : undefined,
          quantity: resolvedQty,
          transaction: 'Received (Warehouse)',
          date: '2026-09-28',
          prescribedBy: `Voice Command (${cmd.locale})`,
          confidenceScore: cmd.confidence || 0.96,
          verificationState: match.status === 'MATCHED' ? 'VERIFIED' : 'NEEDS_REVIEW',
          correctedFields: ['Quantity (Voice)']
        };
        setExtractedRecords((prev) => [updatedRow, ...prev]);
      }
      setIsVerifiedByOfficer(true);
      showNotification(cmd.nativeConfirmation);
      return;
    }

    // ACTION 6: ADD (+Received) or DISPENSE (-Dispensed OPD)
    setRegisterSearchQuery('');
    const registerTx =
      cmd.action === 'ADD' ? 'Received (Warehouse)' : 'Dispensed (OPD)';

    const newRow: ExtractedRecord = {
      id: `ocr-voice-${Date.now()}`,
      medicine: resolvedMedName,
      rawMedicineText: `Voice (${cmd.locale}): "${cmd.rawTranscript}"`,
      batch: resolvedBatch,
      expiryDate: match.status === 'MATCHED' ? match.medicine.expiryDate : undefined,
      quantity: resolvedQty,
      transaction: registerTx,
      date: '2026-09-28',
      prescribedBy: `Voice Register Entry (${cmd.locale})`,
      confidenceScore: cmd.confidence || 0.97,
      verificationState: match.status === 'MATCHED' ? 'VERIFIED' : 'NEEDS_REVIEW',
      correctedFields: []
    };

    if (autoCommitVoice && match.status === 'MATCHED') {
      await handleCommitSingleRow(newRow);
      showNotification(`${cmd.nativeConfirmation} [Committed to Ledger]`);
    } else {
      setExtractedRecords((prev) => [newRow, ...prev]);
      setIsVerifiedByOfficer(true);
      showNotification(cmd.nativeConfirmation);
    }
  };

  const executeRegisterVoiceCommand = async (
    spokenText: string,
    langOverride?: string,
    pipelineSourceLabel?: string
  ) => {
    const cleanText = spokenText.trim();
    const activeLangConfig = resolveVoiceLanguageConfig(langOverride || voiceLanguage);
    setVoiceErrorBanner(null);

    if (!cleanText) {
      setVoiceListeningStatus('ERROR');
      setVoiceErrorBanner(
        'Could not understand command in selected language. Please try again or edit manually.'
      );
      return;
    }

    if (pipelineSourceLabel) {
      setVoicePipelineSource(pipelineSourceLabel);
    }

    setIsVoiceProcessing(true);
    setVoiceListeningStatus('PARSING');

    // 1. Parse locally first using deterministic multilingual parser (en-IN, hi-IN, ta-IN, te-IN)
    const localNormalized = parsePhysicalRegisterVoiceCommand(
      cleanText,
      activeLangConfig.code,
      medicines
    );
    setParsedVoiceCommand(localNormalized);

    try {
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: cleanText,
          language: activeLangConfig.code,
          locale: activeLangConfig.locale,
          sttEngine: pipelineSourceLabel || 'hybrid-speech-ai',
          phcId: selectedPHC.id
        })
      });

      if (res.ok) {
        const data: VoiceEntryResult & { normalizedCommand?: NormalizedRegisterVoiceCommand } =
          await res.json();
        setLastVoiceResult(data);

        const serverNormalized: NormalizedRegisterVoiceCommand =
          data.normalizedCommand ||
          parsePhysicalRegisterVoiceCommand(cleanText, activeLangConfig.code, medicines, {
            parsedMedicine: data.parsedMedicine,
            parsedQuantity: data.parsedQuantity,
            parsedBatch: data.parsedBatch,
            parsedTransaction: data.parsedTransaction,
            parsedOpdFootfall: data.parsedOpdFootfall,
            parsedOccupiedBeds: data.parsedOccupiedBeds,
            parsedEmergencyCases: data.parsedEmergencyCases,
            confidence: data.confidence
          });

        setParsedVoiceCommand(serverNormalized);
        await applyNormalizedVoiceCommandToRegister(serverNormalized);
      } else {
        await applyNormalizedVoiceCommandToRegister(localNormalized);
      }
    } catch (err) {
      console.warn('Voice API fallback to local multilingual parser:', err);
      await applyNormalizedVoiceCommandToRegister(localNormalized);
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  // Handle Quick PHC Data & Stock Form Submit
  const handleQuickPhcDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMed = medicines.find((m) => m.id === quickMedId) || medicines[0];
    await registerPHCData({
      medicineId: selectedMed?.id,
      medicineName: selectedMed?.name,
      quantity: quickMedQty,
      transaction: quickMedTx,
      batch: quickMedBatch,
      opdFootfall: phcOpdInput,
      occupiedBeds: phcBedsInput,
      emergencyFootfall: phcEmergencyInput,
      notes: 'Quick PHC Data & Register Entry'
    });

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCommittedLog((prev) => [
      {
        id: `LOG-PHC-${Math.floor(1000 + Math.random() * 9000)}`,
        name: `${selectedMed?.name || 'PHC Stock'} (${quickMedTx}) · OPD: ${phcOpdInput} · Beds: ${phcBedsInput}/${capacity.totalBeds}`,
        qty: quickMedQty,
        date: '2026-09-28',
        time: nowTime,
        medicalOfficer: activeMedicalOfficerName,
        phcName: selectedPHC.name,
        phcCode: selectedPHC.code,
        batch: quickMedBatch,
        expiryDate: selectedMed?.expiryDate,
        correctedFields: []
      },
      ...prev
    ]);
  };

  const activeVoiceLangConfig = resolveVoiceLanguageConfig(voiceLanguage);
  const filteredExtractedRecords = registerSearchQuery.trim()
    ? extractedRecords.filter(
        (r) =>
          r.medicine.toLowerCase().includes(registerSearchQuery.trim().toLowerCase()) ||
          (r.rawMedicineText || '').toLowerCase().includes(registerSearchQuery.trim().toLowerCase()) ||
          r.batch.toLowerCase().includes(registerSearchQuery.trim().toLowerCase())
      )
    : extractedRecords;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-800">
              Live Gemini Vision Photo OCR &amp; Voice Register Hub
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Models: gemini-3.8-flash + gemini-3.5-transcribe</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-emerald-600" />
            <span>Physical Register OCR &amp; Voice PHC Data Capture</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Scan photos of handwritten registers or medicine labels, speak voice commands to add rows, or register daily PHC data for <strong>{selectedPHC.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs text-slate-700 flex items-center gap-3">
            <span>
              Facility: <strong className="text-slate-900">{selectedPHC.name}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <span>
              OPD Today: <strong className="text-emerald-700">{capacity.opdFootfall}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <span>
              Beds: <strong className="text-blue-700">{capacity.occupiedBeds}/{capacity.totalBeds}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Voice Commands Console to Register & Add PHC Data (Language-Aware: en-IN, hi-IN, ta-IN, te-IN) */}
      <div className="bg-white rounded-xl border border-emerald-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              id="physical-register-voice-mic-btn"
              onClick={() => toggleVoiceRecording(voiceLanguage)}
              disabled={isTranscribing || isVoiceProcessing}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                isRecordingVoice
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title={
                isRecordingVoice
                  ? 'Stop recording'
                  : `Speak voice command in ${activeVoiceLangConfig.label} (${activeVoiceLangConfig.locale})`
              }
            >
              {isRecordingVoice ? <Radio className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Physical Register Voice Command Console
                </h2>
                <span className="text-[11px] font-mono font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Language: {activeVoiceLangConfig.nativeLabel} ({activeVoiceLangConfig.locale})
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    isRecordingVoice
                      ? 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
                      : isTranscribing || voiceListeningStatus === 'AI_TRANSCRIBING'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : voiceListeningStatus === 'NEEDS_CONFIRMATION' || voiceListeningStatus === 'ERROR'
                      ? 'bg-rose-50 text-rose-900 border-rose-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isRecordingVoice
                    ? `Listening (${activeVoiceLangConfig.locale})...`
                    : isTranscribing || voiceListeningStatus === 'AI_TRANSCRIBING'
                    ? `AI Transcription Fallback (${activeVoiceLangConfig.locale})...`
                    : isVoiceProcessing
                    ? `Parsing ${activeVoiceLangConfig.locale} Command...`
                    : voiceListeningStatus === 'PARSED'
                    ? `Command Executed (${activeVoiceLangConfig.locale})`
                    : voiceListeningStatus === 'NEEDS_CONFIRMATION'
                    ? 'Review & Confirm Command'
                    : 'Ready for Voice Input'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Supports <strong>English (en-IN)</strong>, <strong>हिन्दी (hi-IN)</strong>,{' '}
                <strong>ਪੰਜਾਬੀ (pa-IN)</strong>, <strong>தமிழ் (ta-IN)</strong>,{' '}
                <strong>తెలుగు (te-IN)</strong>, and <strong>മലയാളം (ml-IN)</strong> via hybrid browser SpeechRecognition + Gemini AI Audio Transcription fallback.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 6-Language Voice Recognition Selector (en-IN, hi-IN, pa-IN, ta-IN, te-IN, ml-IN) */}
            <div className="flex items-center gap-1.5 text-xs">
              <Languages className="w-3.5 h-3.5 text-emerald-700" />
              <label htmlFor="register-voice-lang-select" className="text-[11px] font-bold text-slate-600">
                Voice Locale:
              </label>
              <select
                id="register-voice-lang-select"
                value={activeVoiceLangConfig.locale}
                onChange={(e) => {
                  const nextLocale = e.target.value as RegisterVoiceBcp47Locale;
                  const nextCfg = resolveVoiceLanguageConfig(nextLocale);
                  setVoiceLanguage(nextCfg.locale);
                  setLanguage(nextCfg.code);
                  setVoiceCommandText(nextCfg.sampleCommands[0].transcript);
                  setVoiceErrorBanner(null);
                  setVoiceListeningStatus('IDLE');
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="en-IN">English — en-IN</option>
                <option value="hi-IN">हिन्दी (Hindi) — hi-IN</option>
                <option value="pa-IN">ਪੰਜਾਬੀ (Punjabi) — pa-IN</option>
                <option value="ta-IN">தமிழ் (Tamil) — ta-IN</option>
                <option value="te-IN">తెలుగు (Telugu) — te-IN</option>
                <option value="ml-IN">മലയാളം (Malayalam) — ml-IN</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={autoCommitVoice}
                onChange={(e) => setAutoCommitVoice(e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-500"
              />
              <span>Auto-Commit Voice to Ledger</span>
            </label>
          </div>
        </div>

        {/* Voice Input Bar + Execute Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              id="physical-register-voice-input"
              value={voiceCommandText}
              onChange={(e) => setVoiceCommandText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void executeRegisterVoiceCommand(voiceCommandText, voiceLanguage);
                }
              }}
              placeholder={`Speak or type in ${activeVoiceLangConfig.nativeLabel} (${activeVoiceLangConfig.locale}): e.g. "${activeVoiceLangConfig.sampleCommands[0].transcript}"...`}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            id="physical-register-voice-run-btn"
            onClick={() =>
              executeRegisterVoiceCommand(
                voiceCommandText,
                voiceLanguage,
                `Language-Aware Parser (${activeVoiceLangConfig.locale})`
              )
            }
            disabled={isVoiceProcessing || isTranscribing || !voiceCommandText.trim()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>
              {isVoiceProcessing
                ? `Parsing (${activeVoiceLangConfig.locale})...`
                : `Run Voice Command (${activeVoiceLangConfig.locale}) →`}
            </span>
          </button>
        </div>

        {/* 1-Click Multilingual Voice Command Chips for the Selected Language */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-600">
              {activeVoiceLangConfig.nativeLabel} ({activeVoiceLangConfig.locale}) Voice Command Examples — Click to Test:
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Pipeline: {voicePipelineSource}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {activeVoiceLangConfig.sampleCommands.map((sample, idx) => (
              <button
                key={`${activeVoiceLangConfig.code}-${idx}`}
                type="button"
                onClick={() => {
                  setVoiceCommandText(sample.transcript);
                  void executeRegisterVoiceCommand(
                    sample.transcript,
                    activeVoiceLangConfig.code,
                    `Multilingual Command (${activeVoiceLangConfig.locale})`
                  );
                }}
                title={sample.translation}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {sample.actionLabel}
                </span>
                <span>"{sample.transcript}"</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 6 User Feedback Panel: Selected Language, Listening Status, Recognized Transcript & Interpreted Command */}
        {(parsedVoiceCommand || lastVoiceResult) && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  1. Selected Language
                </span>
                <strong className="text-slate-900 font-semibold">
                  {activeVoiceLangConfig.label} ({activeVoiceLangConfig.locale})
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  2. Listening / ASR Status
                </span>
                <strong className="text-emerald-800 font-mono text-[11px]">
                  {voicePipelineSource}
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  3. Recognized Transcript
                </span>
                <strong className="text-slate-900">
                  "{parsedVoiceCommand?.rawTranscript || lastVoiceResult?.rawTranscript || voiceCommandText}"
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  4. Interpreted Command
                </span>
                <strong className="text-teal-900 font-mono text-[11px]">
                  {parsedVoiceCommand?.normalizedCommandText ||
                    `${lastVoiceResult?.parsedTransaction} · ${lastVoiceResult?.parsedMedicine} (${lastVoiceResult?.parsedQuantity})`}
                </strong>
              </div>
            </div>

            {parsedVoiceCommand && parsedVoiceCommand.action !== 'UNKNOWN' && (
              <div className="px-3 py-2 rounded-lg bg-emerald-50/80 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>{parsedVoiceCommand.nativeConfirmation}</strong>
                    <span className="text-slate-600 ml-2 text-[11px]">
                      ({parsedVoiceCommand.englishSummary})
                    </span>
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                  Action: {parsedVoiceCommand.action} · {parsedVoiceCommand.locale}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Unclear / Low-Confidence Command Manual Edit & Confirmation Safeguard */}
        {(voiceErrorBanner || voiceListeningStatus === 'NEEDS_CONFIRMATION') && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">
                    {voiceErrorBanner ||
                      'Could not understand command in selected language. Please try again or edit manually.'}
                  </strong>
                  {parsedVoiceCommand?.nativeConfirmation && (
                    <span className="text-[11px] text-amber-900 block mt-0.5">
                      {parsedVoiceCommand.nativeConfirmation}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVoiceErrorBanner(null);
                  setVoiceListeningStatus('IDLE');
                }}
                className="text-amber-700 hover:text-amber-950 p-0.5 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inline Manual Edit & Confirm before modifying register/inventory */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/80 items-end">
              <div>
                <label className="text-[10px] font-bold text-amber-900 block mb-1">
                  Register Action
                </label>
                <select
                  value={pendingConfirmAction}
                  onChange={(e) =>
                    setPendingConfirmAction(e.target.value as 'ADD' | 'DISPENSE' | 'UPDATE')
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  <option value="ADD">ADD (+Received Stock)</option>
                  <option value="DISPENSE">DISPENSE (-OPD Stock)</option>
                  <option value="UPDATE">UPDATE (Set Quantity)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-amber-900 block mb-1">
                  Medicine (PHC NLEM Catalogue)
                </label>
                <select
                  value={pendingConfirmMedName}
                  onChange={(e) => setPendingConfirmMedName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.currentStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-amber-900 block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={pendingConfirmQty}
                    onChange={(e) => setPendingConfirmQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const manualCmd = parsePhysicalRegisterVoiceCommand(
                      `${pendingConfirmAction.toLowerCase()} ${pendingConfirmQty} ${pendingConfirmMedName}`,
                      voiceLanguage,
                      medicines
                    );
                    manualCmd.action = pendingConfirmAction;
                    manualCmd.medicineName = pendingConfirmMedName;
                    manualCmd.quantity = pendingConfirmQty;
                    manualCmd.batch = pendingConfirmBatch;
                    manualCmd.requiresConfirmation = false;
                    manualCmd.validationError = null;
                    setParsedVoiceCommand(manualCmd);
                    void applyNormalizedVoiceCommandToRegister(manualCmd, true);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                >
                  Confirm &amp; Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Photo OCR Scanner & Quick PHC Data Entry */}
        <div className="space-y-6">
          {/* Card 1: Live Photo & Camera OCR Scanner */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-bold text-sm text-slate-900 block">
                  1. Scan Register or Medicine Photo (AI OCR)
                </span>
                <span className="text-[11px] text-slate-500">
                  Reads handwritten registers, drug strips, or challans
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Vision OCR
              </span>
            </div>

            {/* Upload Photo & Camera Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer bg-emerald-50/40 hover:bg-emerald-50/80 transition-colors text-center">
                <Upload className="w-5 h-5 text-emerald-700 mb-1" />
                <span className="text-xs font-bold text-slate-900">Upload Photo</span>
                <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, WEBP</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handlePhotoFileUpload(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={startCamera}
                className="border-2 border-slate-200 hover:border-emerald-500 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer bg-slate-50/70 hover:bg-emerald-50/30 transition-colors text-center"
              >
                <Camera className="w-5 h-5 text-slate-700 mb-1" />
                <span className="text-xs font-bold text-slate-900">Use Live Camera</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Snap Register Page</span>
              </button>
            </div>

            {/* 1-Click Test Sample Register Photo Generator + Real OCR */}
            <button
              type="button"
              onClick={handleGenerateAndScanSamplePhoto}
              disabled={isProcessing}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <Wand2 className="w-4 h-4 text-emerald-400" />
              <span>Generate &amp; Scan Sample PHC Register Photo (Test Live OCR)</span>
            </button>

            {/* Live Camera Viewfinder if active */}
            {isCameraOpen && (
              <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Live Camera Viewfinder</span>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <video
                  ref={videoRef}
                  className="w-full h-48 object-cover rounded-lg bg-black"
                  playsInline
                  muted
                />
                <button
                  type="button"
                  onClick={captureCameraFrame}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Capture Photo &amp; Extract OCR Rows
                </button>
              </div>
            )}

            {/* Uploaded / Captured Photo Preview + Re-Scan & Raw OCR Text */}
            {previewImage && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scanned Photo Preview</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {rawOcrText && (
                      <button
                        type="button"
                        onClick={() => setShowRawOcr(!showRawOcr)}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{showRawOcr ? 'Hide OCR Text' : 'View Raw Text'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(null);
                        setLastImagePayload(null);
                        setOcrInspectionReport(null);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <img
                  src={previewImage}
                  alt="Scanned PHC Register"
                  referrerPolicy="no-referrer"
                  className="w-full max-h-44 object-contain rounded-lg border border-slate-200 bg-white"
                />

                {ocrInspectionReport && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                      ocrInspectionReport.isMedicalDocument
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span className="flex items-center gap-1.5">
                        {ocrInspectionReport.isMedicalDocument ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>{ocrInspectionReport.imageCategory}</span>
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-current/20">
                        {ocrInspectionReport.isMedicalDocument ? 'Valid Document' : '0 Medicines Found'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {ocrInspectionReport.visualSummary}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono text-emerald-800 truncate">{ocrMethodLabel}</span>
                  {lastImagePayload && (
                    <button
                      type="button"
                      onClick={() =>
                        runOCR({
                          imageBase64: lastImagePayload.base64,
                          mimeType: lastImagePayload.mimeType,
                          fileName: lastImagePayload.fileName
                        })
                      }
                      disabled={isProcessing}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md font-bold text-slate-800 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <RotateCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>Re-Scan Photo</span>
                    </button>
                  )}
                </div>

                {showRawOcr && rawOcrText && (
                  <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {rawOcrText}
                  </pre>
                )}
              </div>
            )}

            {/* Standard Register Template Presets */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Or Load Standard PHC Register Format
              </label>
              {SAMPLE_OCR_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    void runOCR({ presetId: preset.id });
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedPreset === preset.id && !previewImage
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{preset.name}</span>
                    {selectedPreset === preset.id && !previewImage && (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{preset.thumbnail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Easy Quick Add Data from PHC (OPD Footfall, Beds, & Stock) */}
          <form
            onSubmit={handleQuickPhcDataSubmit}
            className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Quick Register PHC Daily Data
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">{selectedPHC.code}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  OPD Footfall
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={phcOpdInput}
                    onChange={(e) => setPhcOpdInput(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Occupied Beds
                </label>
                <input
                  type="number"
                  min={0}
                  max={capacity.totalBeds || 30}
                  value={phcBedsInput}
                  onChange={(e) => setPhcBedsInput(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Emergency Cases
                </label>
                <input
                  type="number"
                  min={0}
                  value={phcEmergencyInput}
                  onChange={(e) => setPhcEmergencyInput(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  Medicine Item (Optional Stock Update)
                </label>
                <select
                  value={quickMedId}
                  onChange={(e) => setQuickMedId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Stock: {m.currentStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quickMedQty}
                    onChange={(e) => setQuickMedQty(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Action Type
                  </label>
                  <select
                    value={quickMedTx}
                    onChange={(e) => setQuickMedTx(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="Received (Warehouse)">Received (+Stock)</option>
                    <option value="Dispensed (OPD)">Dispensed (-Stock)</option>
                    <option value="Emergency Inpatient">Emergency (-Stock)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Save PHC Telemetry &amp; Stock Data</span>
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Editable Verification Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  2. Review, Verify &amp; Commit Extracted Register Entries
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Correct medicine, quantity, batch, or expiry date. Only verified records reach the live PHC inventory ledger.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={registerSearchQuery}
                    onChange={(e) => setRegisterSearchQuery(e.target.value)}
                    placeholder="Search register medicine..."
                    className="pl-7 pr-6 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
                  />
                  {registerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRegisterSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Clear search filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addBlankRecord}
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Register Line</span>
                </button>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                  {filteredExtractedRecords.length} / {extractedRecords.length} Rows
                </span>
              </div>
            </div>

            {/* 5-Stage OCR Workflow Pipeline Banner */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-700">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono">
                  1. Register Image
                </span>
                <span className="text-slate-400">→</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono">
                  2. Gemini OCR Extraction
                </span>
                <span className="text-slate-400">→</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono">
                  3. Medicine Matching
                </span>
                <span className="text-slate-400">→</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-bold">
                  4. Human Verification
                </span>
                <span className="text-slate-400">→</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono">
                  5. Inventory Ledger Commit
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Reviewer: <strong className="text-slate-800">{activeMedicalOfficerName}</strong>
              </span>
            </div>

            {ocrInspectionReport && !ocrInspectionReport.isMedicalDocument && (
              <div
                role="alert"
                className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 flex items-start gap-3 text-xs"
              >
                <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="font-bold text-sm">
                      {ocrInspectionReport.imageCategory}
                    </strong>
                    <span className="text-[10px] font-mono bg-rose-100 text-rose-900 px-2 py-0.5 rounded border border-rose-300 font-bold">
                      {ocrInspectionReport.errorCode || 'NO_MEDICINE_DETECTED'} · Unverified Data Blocked
                    </span>
                  </div>
                  <p className="font-medium leading-relaxed">{ocrInspectionReport.visualSummary}</p>
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    {lastImagePayload && (
                      <button
                        type="button"
                        onClick={() =>
                          runOCR({
                            imageBase64: lastImagePayload.base64,
                            mimeType: lastImagePayload.mimeType,
                            fileName: lastImagePayload.fileName
                          })
                        }
                        className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Retry OCR Scan</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={addBlankRecord}
                      className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Enter Register Row Manually</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {commitErrorBanner && (
              <div
                role="alert"
                className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">OCR Verification Safeguard:</strong>
                    <span className="font-medium">{commitErrorBanner}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCommitErrorBanner(null)}
                  className="text-rose-600 hover:text-rose-900 p-0.5 cursor-pointer shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Editable Table or Loading / Empty State */}
            {isProcessing ? (
              <div className="py-4">
                <TableSkeleton rows={4} cols={7} />
              </div>
            ) : extractedRecords.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={ocrInspectionReport && !ocrInspectionReport.isMedicalDocument ? AlertTriangle : CheckCircle2}
                  title={
                    ocrInspectionReport && !ocrInspectionReport.isMedicalDocument
                      ? 'No Medicine Records Found in Uploaded Photo'
                      : 'All Register Lines Verified & Committed'
                  }
                  description={
                    ocrInspectionReport && !ocrInspectionReport.isMedicalDocument
                      ? ocrInspectionReport.visualSummary
                      : 'All extracted photo OCR and voice register records have been synchronized with the PHC inventory ledger.'
                  }
                  actionText="Scan Sample Register Photo"
                  onAction={handleGenerateAndScanSamplePhoto}
                />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs" role="table">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th scope="col" className="px-3 py-2.5">Extracted &amp; Matched Medicine</th>
                      <th scope="col" className="px-2 py-2.5">Batch &amp; Expiry</th>
                      <th scope="col" className="px-2 py-2.5">Transaction</th>
                      <th scope="col" className="px-2 py-2.5 text-right w-24">Quantity</th>
                      <th scope="col" className="px-2 py-2.5 text-center">OCR &amp; Match Conf.</th>
                      <th scope="col" className="px-2 py-2.5 text-center">Verification Status</th>
                      <th scope="col" className="px-2 py-2.5 text-center w-36">Human Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExtractedRecords.map((rec) => {
                      const rowVal = validateExtractedRow(rec);
                      const match = rowVal.match;
                      const isRejected = rec.verificationState === 'REJECTED';
                      const canCommitRow =
                        !isRejected &&
                        match.status === 'MATCHED' &&
                        !rowVal.isQtyMissing &&
                        !rowVal.isQtyInvalid &&
                        (rec.verificationState === 'VERIFIED' || rec.verificationState === 'MODIFIED');

                      return (
                        <tr
                          key={rec.id}
                          className={`transition-colors ${
                            isRejected
                              ? 'bg-slate-100/70 opacity-65'
                              : rowVal.hasWarning && rec.verificationState === 'NEEDS_REVIEW'
                              ? 'bg-amber-50/30 hover:bg-amber-50/60'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* 1. Extracted & Matched Catalogue Medicine */}
                          <td className="px-3 py-2.5 space-y-1.5 min-w-[230px]">
                            <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between gap-1">
                              <span className="truncate" title={rec.rawMedicineText || rec.medicine}>
                                Extracted:{' '}
                                <strong className="text-slate-700">
                                  {rec.rawMedicineText || rec.medicine || '—'}
                                </strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                disabled={isRejected}
                                value={rec.medicine}
                                placeholder="Enter or pick medicine..."
                                onChange={(e) => handleRecordChange(rec.id, 'medicine', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                              />
                              <select
                                disabled={isRejected}
                                value={match.status === 'MATCHED' ? match.medicine.name : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleRecordChange(rec.id, 'medicine', e.target.value);
                                  }
                                }}
                                title="Select matched catalogue medicine"
                                className="w-7 px-1 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <option value="">Select PHC Catalogue Medicine...</option>
                                {medicines.map((m) => (
                                  <option key={m.id} value={m.name}>
                                    {m.name} ({m.currentStock} {m.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {match.status === 'MATCHED' ? (
                              <div className="text-[10px] font-mono text-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>
                                  Matched Catalogue: <strong>{match.medicine.name}</strong> ({match.medicine.id}) · Stock:{' '}
                                  {match.medicine.currentStock} {match.medicine.unit}
                                </span>
                              </div>
                            ) : match.status === 'AMBIGUOUS' ? (
                              <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                                <span>
                                  <strong>AMBIGUOUS MATCH:</strong> Select exact formulation:
                                </span>
                                {match.candidates.map((cand) => (
                                  <button
                                    key={cand.id}
                                    type="button"
                                    onClick={() => handleRecordChange(rec.id, 'medicine', cand.name)}
                                    className="px-1.5 py-0.5 bg-amber-200/80 hover:bg-amber-300 rounded text-amber-950 font-bold cursor-pointer"
                                  >
                                    {cand.name}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-rose-900 bg-rose-50 p-1.5 rounded border border-rose-200">
                                <span>
                                  <strong>UNMATCHED MEDICINE:</strong> Pick from PHC catalogue
                                </span>
                                {medicines[0] && (
                                  <button
                                    type="button"
                                    onClick={() => handleRecordChange(rec.id, 'medicine', medicines[0].name)}
                                    className="px-1.5 py-0.5 bg-rose-200 hover:bg-rose-300 rounded text-rose-950 font-bold cursor-pointer shrink-0"
                                  >
                                    Match First
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 2. Batch & Expiry Date */}
                          <td className="px-2 py-2 space-y-1.5 min-w-[145px]">
                            <div>
                              <label className="text-[9px] font-mono uppercase text-slate-500 block">
                                Batch No.
                              </label>
                              <input
                                type="text"
                                disabled={isRejected}
                                value={rec.batch}
                                placeholder="Batch ID"
                                onChange={(e) => handleRecordChange(rec.id, 'batch', e.target.value)}
                                className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-mono uppercase text-slate-500 block">
                                Expiry Date
                              </label>
                              <input
                                type="date"
                                disabled={isRejected}
                                value={rec.expiryDate || ''}
                                onChange={(e) => handleRecordChange(rec.id, 'expiryDate', e.target.value)}
                                className={`w-full px-1.5 py-1 border rounded-md text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 ${
                                  rowVal.isBatchExpired
                                    ? 'border-rose-400 bg-rose-50 text-rose-900 font-bold'
                                    : 'border-slate-200 text-slate-700'
                                }`}
                              />
                            </div>
                            {rowVal.isBatchExpired && (
                              <span className="inline-block text-[9px] font-mono font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded">
                                EXPIRED BATCH DETECTED
                              </span>
                            )}
                          </td>

                          {/* 3. Transaction & Date */}
                          <td className="px-2 py-2 space-y-1.5 min-w-[145px]">
                            <select
                              disabled={isRejected}
                              value={rec.transaction}
                              onChange={(e) => handleRecordChange(rec.id, 'transaction', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                            >
                              <option value="Dispensed (OPD)">Dispensed (OPD)</option>
                              <option value="Received (Warehouse)">Received (Warehouse)</option>
                              <option value="Emergency Inpatient">Emergency Inpatient</option>
                              <option value="Damaged/Expired">Damaged/Expired</option>
                            </select>
                            <input
                              type="date"
                              disabled={isRejected}
                              value={rec.date}
                              onChange={(e) => handleRecordChange(rec.id, 'date', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-md text-[11px] font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                            />
                          </td>

                          {/* 4. Quantity */}
                          <td className="px-2 py-2 text-right align-top">
                            <input
                              type="number"
                              min={1}
                              disabled={isRejected}
                              value={rec.quantity}
                              placeholder="Qty"
                              onChange={(e) =>
                                handleRecordChange(
                                  rec.id,
                                  'quantity',
                                  e.target.value === '' ? '' : Number(e.target.value)
                                )
                              }
                              className={`w-20 px-2 py-1 border rounded-md text-xs font-mono font-bold text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 ${
                                rowVal.isQtyMissing || rowVal.isQtyInvalid
                                  ? 'border-rose-400 bg-rose-50 text-rose-900'
                                  : 'border-slate-200 text-slate-900'
                              }`}
                            />
                            {rowVal.isQtyMissing && (
                              <div className="text-[9px] font-mono font-bold text-rose-700 mt-1">
                                Missing Qty
                              </div>
                            )}
                            {!rowVal.isQtyMissing && rowVal.isQtyInvalid && (
                              <div className="text-[9px] font-mono font-bold text-rose-700 mt-1">
                                Invalid (&gt;0)
                              </div>
                            )}
                          </td>

                          {/* 5. OCR & Matching Confidence */}
                          <td className="px-2 py-2 text-center align-top space-y-1 min-w-[125px]">
                            <div>
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">
                                OCR Conf.
                              </span>
                              {rec.confidenceScore !== null ? (
                                <span
                                  className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded inline-block ${
                                    rowVal.isLowConfidence
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {Math.round(rec.confidenceScore * 100)}%
                                  {rowVal.isLowConfidence ? ' (Low)' : ''}
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                                  Manual Entry
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[9px] font-mono uppercase text-slate-500 block">
                                Catalogue Match
                              </span>
                              <span
                                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded inline-block ${
                                  match.status === 'MATCHED'
                                    ? 'text-emerald-800 bg-emerald-50'
                                    : match.status === 'AMBIGUOUS'
                                    ? 'text-amber-900 bg-amber-100'
                                    : 'text-rose-900 bg-rose-100'
                                }`}
                              >
                                {rowVal.matchingConfidenceLabel}
                              </span>
                            </div>
                          </td>

                          {/* 6. Human Verification Status */}
                          <td className="px-2 py-2 text-center align-top space-y-1 min-w-[130px]">
                            {rec.verificationState === 'VERIFIED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                Verified
                              </span>
                            )}
                            {rec.verificationState === 'MODIFIED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300">
                                <Check className="w-3 h-3 text-blue-700" />
                                Modified
                              </span>
                            )}
                            {rec.verificationState === 'NEEDS_REVIEW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                Needs Review
                              </span>
                            )}
                            {rec.verificationState === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                <X className="w-3 h-3 text-rose-700" />
                                Rejected / Not Usable
                              </span>
                            )}

                            {rec.correctedFields && rec.correctedFields.length > 0 && (
                              <div className="text-[9px] font-mono text-blue-800">
                                Edited: {rec.correctedFields.join(', ')}
                              </div>
                            )}
                          </td>

                          {/* 7. Actions: Verify / Reject / Commit / Remove */}
                          <td className="px-2 py-2 text-center align-top">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {rec.verificationState === 'NEEDS_REVIEW' && (
                                <button
                                  type="button"
                                  onClick={() => setRecordVerificationState(rec.id, 'VERIFIED')}
                                  disabled={
                                    match.status !== 'MATCHED' || rowVal.isQtyMissing || rowVal.isQtyInvalid
                                  }
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Mark row as Verified by Medical Officer"
                                >
                                  Verify
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleCommitSingleRow(rec)}
                                disabled={!canCommitRow}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                title={
                                  canCommitRow
                                    ? 'Commit verified record to PHC inventory ledger'
                                    : 'Record must be Matched, Verified/Modified, and have a valid quantity > 0'
                                }
                              >
                                Commit
                              </button>

                              {rec.verificationState !== 'REJECTED' ? (
                                <button
                                  type="button"
                                  onClick={() => setRecordVerificationState(rec.id, 'REJECTED')}
                                  className="px-1.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                  title="Mark as Rejected / Not Usable (will not modify inventory)"
                                >
                                  Reject
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setRecordVerificationState(rec.id, 'NEEDS_REVIEW')}
                                  className="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                  title="Restore row for review"
                                >
                                  Restore
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => removeRecord(rec.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Delete row from table"
                                aria-label={`Remove ${rec.medicine}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Officer Verification Checkbox */}
            {extractedRecords.length > 0 && !isProcessing && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="officer-verification"
                    checked={isVerifiedByOfficer}
                    onChange={(e) => setIsVerifiedByOfficer(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label
                    htmlFor="officer-verification"
                    className="text-xs text-emerald-950 font-medium cursor-pointer leading-relaxed"
                  >
                    Medical Officer Verification (<strong>{activeMedicalOfficerName}</strong>) — I confirm that only{' '}
                    <strong>Verified</strong> or <strong>Modified</strong> rows will be committed to the live stock ledger for{' '}
                    <strong>{selectedPHC.name}</strong>. Unverified or Rejected rows will not modify inventory.
                  </label>
                </div>
                {extractedRecords.some((r) => r.verificationState === 'NEEDS_REVIEW') && (
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedRecords((prev) =>
                        prev.map((r) => {
                          if (r.verificationState !== 'NEEDS_REVIEW') return r;
                          const v = validateExtractedRow(r);
                          if (v.match.status === 'MATCHED' && !v.isQtyMissing && !v.isQtyInvalid) {
                            return { ...r, verificationState: 'VERIFIED' };
                          }
                          return r;
                        })
                      );
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Mark All Valid Matched Rows Verified
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono">
              <span>
                Verified/Modified:{' '}
                <strong className="text-emerald-700">
                  {
                    extractedRecords.filter(
                      (r) => r.verificationState === 'VERIFIED' || r.verificationState === 'MODIFIED'
                    ).length
                  }
                </strong>
              </span>
              <span>·</span>
              <span>
                Needs Review:{' '}
                <strong className="text-amber-700">
                  {extractedRecords.filter((r) => r.verificationState === 'NEEDS_REVIEW').length}
                </strong>
              </span>
              <span>·</span>
              <span>
                Rejected:{' '}
                <strong className="text-rose-700">
                  {extractedRecords.filter((r) => r.verificationState === 'REJECTED').length}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsVerifiedByOfficer(true);
                void handleCommitAll();
              }}
              disabled={
                extractedRecords.filter(
                  (r) => r.verificationState === 'VERIFIED' || r.verificationState === 'MODIFIED'
                ).length === 0
              }
              className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                extractedRecords.filter(
                  (r) => r.verificationState === 'VERIFIED' || r.verificationState === 'MODIFIED'
                ).length > 0
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Commit Verified Records (
                {
                  extractedRecords.filter(
                    (r) => r.verificationState === 'VERIFIED' || r.verificationState === 'MODIFIED'
                  ).length
                }
                ) to Stock Ledger
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Verification Audit Trail Log */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verified OCR &amp; Voice Register Ledger Commit Audit Trail ({selectedPHC.name})</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Active Reviewer: <strong className="text-slate-800">{activeMedicalOfficerName}</strong> · Facility:{' '}
            <strong className="text-slate-800">{selectedPHC.code}</strong>
          </span>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {committedLog.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {log.id}
                </span>
                <span className="font-bold text-slate-900">{log.name}</span>
                <span className="text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {log.qty} Units
                </span>
                {log.batch && (
                  <span className="text-[11px] font-mono text-slate-600">
                    Batch: <strong>{log.batch}</strong>
                  </span>
                )}
                {log.expiryDate && (
                  <span className="text-[11px] font-mono text-slate-600">
                    Exp: <strong>{log.expiryDate}</strong>
                  </span>
                )}
                {log.correctedFields && log.correctedFields.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    Corrected: {log.correctedFields.join(', ')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>
                  Verified by: <strong className="text-slate-800">{log.medicalOfficer}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  PHC: <strong className="text-slate-700">{log.phcCode || selectedPHC.code}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Timestamp: {log.date} ({log.time})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
