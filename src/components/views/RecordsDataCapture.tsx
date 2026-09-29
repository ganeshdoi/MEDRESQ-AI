import React, { useState, useRef } from 'react';
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
  PackagePlus
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { TableSkeleton } from '../ui/LoadingSkeleton.tsx';
import { SAMPLE_OCR_PRESETS } from '../../data/mockData.ts';
import { resolveMedicineMatch } from '../../utils/medicineMatcher.ts';
import { VoiceEntryResult } from '../../types.ts';

interface ExtractedRecord {
  id: string;
  medicine: string;
  rawMedicineText?: string;
  batch: string;
  quantity: number;
  transaction: string;
  date: string;
  prescribedBy?: string;
  confidenceScore: number;
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
    transcribeAudio,
    isTranscribing
  } = useApp();

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
  } | null>(null);

  // Live Camera Modal / Stream State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Voice Command to Register & Add PHC Data State
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceLanguage, setVoiceLanguage] = useState<string>('hinglish');
  const [voiceCommandText, setVoiceCommandText] = useState<string>(
    'Register 60 packets of ORS batch ORS-2609 dispensed at OPD today'
  );
  const [isVoiceProcessing, setIsVoiceProcessing] = useState<boolean>(false);
  const [autoCommitVoice, setAutoCommitVoice] = useState<boolean>(false);
  const [lastVoiceResult, setLastVoiceResult] = useState<VoiceEntryResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // PHC Daily Data Quick Registration State (OPD Footfall, Beds, Emergency, Stock)
  const [phcOpdInput, setPhcOpdInput] = useState<number>(capacity.opdFootfall || 210);
  const [phcBedsInput, setPhcBedsInput] = useState<number>(capacity.occupiedBeds || 14);
  const [phcEmergencyInput, setPhcEmergencyInput] = useState<number>(capacity.emergencyFootfall || 8);
  const [quickMedId, setQuickMedId] = useState<string>(medicines[0]?.id || '');
  const [quickMedQty, setQuickMedQty] = useState<number>(50);
  const [quickMedTx, setQuickMedTx] = useState<string>('Received (Warehouse)');
  const [quickMedBatch, setQuickMedBatch] = useState<string>('BATCH-PHC-2609');

  const [extractedRecords, setExtractedRecords] = useState<ExtractedRecord[]>(() =>
    (SAMPLE_OCR_PRESETS[0]?.records || []).map((r) => ({
      id: r.id,
      medicine: r.medicine,
      batch: r.batch,
      quantity: r.quantity,
      transaction: r.transaction,
      date: r.date,
      confidenceScore: r.confidenceScore
    }))
  );

  const [committedLog, setCommittedLog] = useState([
    { id: 'LOG-4491', name: 'Paracetamol Tablets IP 500mg [Dispensed (OPD)]', qty: 90, date: '2026-09-28', time: '10:30' },
    { id: 'LOG-4490', name: 'Oral Rehydration Salts (ORS) Sachets 20.5g [Received (Warehouse)]', qty: 200, date: '2026-09-28', time: '09:15' }
  ]);

  const handleRecordChange = (id: string, field: keyof ExtractedRecord, value: any) => {
    setCommitErrorBanner(null);
    setExtractedRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const addBlankRecord = () => {
    setCommitErrorBanner(null);
    const defaultMed = medicines[0]?.name || 'Oral Rehydration Salts (ORS) Sachets 20.5g';
    const defaultBatch = medicines[0]?.batchNumber || 'BATCH-2609';
    setExtractedRecords((prev) => [
      {
        id: `ocr-manual-${Date.now()}`,
        medicine: defaultMed,
        batch: defaultBatch,
        quantity: 25,
        transaction: 'Dispensed (OPD)',
        date: '2026-09-28',
        confidenceScore: 1.0
      },
      ...prev
    ]);
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
                phcId: selectedPHC.id
              }
            : {
                presetId: activePresetId,
                phcId: selectedPHC.id
              }
        )
      });

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
              (isValidDoc ? 'Verified Medical Document' : 'Non-Medical / Unrecognized Photo'),
            visualSummary:
              data.visualSummary ||
              data.name ||
              (isValidDoc
                ? `Extracted ${data.records.length} medicine entry/entries from photo.`
                : 'No medical register, prescription, or medicine label was found in this image.'),
            method: data.method || 'Gemini Vision & Optical Character Verification',
            fileName: imgName
          });

          if (!isValidDoc) {
            setExtractedRecords([]);
            setIsProcessing(false);
            showNotification(
              `Non-Medical Photo Detected: ${
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
            data.records.map((r: any, idx: number) => ({
              id: r.id || `ocr-${Date.now()}-${idx}`,
              medicine: r.medicine,
              rawMedicineText: r.rawMedicineText,
              batch: r.batch || 'BATCH-2609',
              quantity: Number(r.quantity) || 10,
              transaction: r.transaction || 'Dispensed (OPD)',
              date: r.date || '2026-09-28',
              prescribedBy: r.prescribedBy,
              confidenceScore: Number(r.confidenceScore) || 0.95
            }))
          );
          setIsVerifiedByOfficer(true);
          setIsProcessing(false);
          showNotification(
            imgBase64
              ? `Photo OCR Complete (${data.method || 'Gemini Vision'}): Extracted ${data.records.length} real medicine item(s) from "${imgName}".`
              : `Loaded ${data.records.length} register rows from ${data.name || 'preset'}.`
          );
          return;
        }
      }
    } catch (err) {
      console.warn('OCR request error:', err);
      if (imgBase64) {
        setExtractedRecords([]);
        setOcrInspectionReport({
          isMedicalDocument: false,
          imageCategory: 'OCR Scan Error',
          visualSummary: 'Could not extract medical records from this image. Please upload a clear photo of a medical register, prescription, or medicine package.',
          method: 'Vision OCR Engine',
          fileName: imgName
        });
        setIsProcessing(false);
        showNotification('Could not extract medicine records from this photo.');
        return;
      }
    }

    // Only load a preset template when the user explicitly clicked a preset (never for uploaded photos)
    if (!imgBase64) {
      const matchedPreset =
        SAMPLE_OCR_PRESETS.find((p) => p.id === activePresetId) || SAMPLE_OCR_PRESETS[0];
      if (matchedPreset) {
        setExtractedRecords(
          matchedPreset.records.map((r) => ({
            id: `${r.id}-${Date.now()}`,
            medicine: r.medicine,
            batch: r.batch,
            quantity: r.quantity,
            transaction: r.transaction,
            date: r.date,
            confidenceScore: r.confidenceScore
          }))
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
      showNotification('Could not read image file. Please try another photo.');
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

  // Commit a single row immediately
  const handleCommitSingleRow = async (rec: ExtractedRecord) => {
    setCommitErrorBanner(null);
    const match = resolveMedicineMatch(medicines, rec.medicine);
    if (match.status !== 'MATCHED') {
      setCommitErrorBanner(match.reason);
      showNotification(match.reason);
      return;
    }

    const result = await verifyOCRRecord({
      medicineId: match.medicine.id,
      medicineName: match.medicine.name,
      quantity: rec.quantity,
      transaction: rec.transaction,
      date: rec.date,
      batch: rec.batch
    });

    if (result.ok) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCommittedLog((prev) => [
        {
          id: `LOG-${Math.floor(4500 + Math.random() * 5000)}`,
          name: `${result.matchedMedicineName || match.medicine.name} [${rec.transaction}]`,
          qty: rec.quantity,
          date: rec.date,
          time: nowTime
        },
        ...prev
      ]);
      setExtractedRecords((prev) => prev.filter((r) => r.id !== rec.id));
    } else if (result.error) {
      setCommitErrorBanner(result.error);
    }
  };

  // Commit all rows in the register table
  const handleCommitAll = async () => {
    if (extractedRecords.length === 0) return;
    setCommitErrorBanner(null);

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const committedItems: Array<{ id: string; name: string; qty: number; date: string; time: string }> = [];
    const remainingRecords: ExtractedRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < extractedRecords.length; i++) {
      const rec = extractedRecords[i];
      const match = resolveMedicineMatch(medicines, rec.medicine);

      if (match.status !== 'MATCHED') {
        remainingRecords.push(rec);
        errors.push(match.reason);
        continue;
      }

      const result = await verifyOCRRecord({
        medicineId: match.medicine.id,
        medicineName: match.medicine.name,
        quantity: rec.quantity,
        transaction: rec.transaction,
        date: rec.date,
        batch: rec.batch
      });

      if (result.ok) {
        committedItems.push({
          id: `LOG-${Math.floor(4500 + Math.random() * 5000) + i}`,
          name: `${result.matchedMedicineName || match.medicine.name} [${
            result.matchedMedicineId || match.medicine.id
          }] (${rec.transaction})`,
          qty: rec.quantity,
          date: rec.date,
          time: nowTime
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
      const errorSummary = `Could not commit ${errors.length} item(s): ${errors.join(' | ')}`;
      setCommitErrorBanner(errorSummary);
      showNotification(errorSummary);
    } else {
      showNotification(`Successfully verified and committed ${committedItems.length} register record(s) to ${selectedPHC.name} stock ledger!`);
    }
  };

  // Voice Recording & Command Execution for Register & PHC Data
  const toggleVoiceRecording = async () => {
    if (isRecordingVoice && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        showNotification('Transcribing voice command via gemini-3.5-transcribe...');
        const text = await transcribeAudio(audioBlob);
        if (text) {
          setVoiceCommandText(text);
          await executeRegisterVoiceCommand(text, voiceLanguage);
        }
      };

      recorder.start();
      setIsRecordingVoice(true);
      showNotification('Listening... Speak a register entry or PHC data command.');
    } catch {
      setIsRecordingVoice(false);
      showNotification('Microphone unavailable — executing command from text box.');
      await executeRegisterVoiceCommand(voiceCommandText, voiceLanguage);
    }
  };

  const executeRegisterVoiceCommand = async (spokenText: string, langOverride?: string) => {
    const cleanText = spokenText.trim();
    if (!cleanText) return;
    const lower = cleanText.toLowerCase();

    // Check if the user spoke a command to commit/verify all register rows
    if (
      (lower.includes('commit all') ||
        lower.includes('verify all') ||
        lower.includes('save all') ||
        lower.includes('सभी सेव') ||
        lower.includes('रजिस्टर सेव')) &&
      extractedRecords.length > 0
    ) {
      await handleCommitAll();
      return;
    }

    setIsVoiceProcessing(true);
    try {
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: cleanText,
          language: langOverride || voiceLanguage,
          sttEngine: 'gemini-3.5-transcribe',
          phcId: selectedPHC.id
        })
      });

      if (res.ok) {
        const data: VoiceEntryResult = await res.json();
        setLastVoiceResult(data);

        const match = resolveMedicineMatch(medicines, data.parsedMedicine);
        const resolvedMedName = match.status === 'MATCHED' ? match.medicine.name : data.parsedMedicine;
        const resolvedBatch =
          data.parsedBatch || (match.status === 'MATCHED' ? match.medicine.batchNumber : 'BATCH-VOICE-26');
        const registerTx =
          data.parsedTransaction === 'Receipt'
            ? 'Received (Warehouse)'
            : data.parsedTransaction === 'Emergency Dispense'
            ? 'Emergency Inpatient'
            : lower.includes('received') || lower.includes('warehouse') || lower.includes('प्राप्त')
            ? 'Received (Warehouse)'
            : 'Dispensed (OPD)';

        // If command includes PHC operational telemetry (OPD footfall / occupied beds), update PHC data
        if (
          data.parsedTransaction === 'Add PHC Data' ||
          data.parsedOpdFootfall !== undefined ||
          data.parsedOccupiedBeds !== undefined
        ) {
          if (data.parsedOpdFootfall !== undefined) setPhcOpdInput(data.parsedOpdFootfall);
          if (data.parsedOccupiedBeds !== undefined) setPhcBedsInput(data.parsedOccupiedBeds);
          if (data.parsedEmergencyCases !== undefined) setPhcEmergencyInput(data.parsedEmergencyCases);

          await registerPHCData({
            medicineName: resolvedMedName,
            quantity: data.parsedQuantity,
            transaction: registerTx,
            batch: resolvedBatch,
            opdFootfall: data.parsedOpdFootfall,
            occupiedBeds: data.parsedOccupiedBeds,
            emergencyFootfall: data.parsedEmergencyCases,
            notes: `Voice PHC Data Command: "${cleanText}"`
          });

          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setCommittedLog((prev) => [
            {
              id: `LOG-V-${Math.floor(1000 + Math.random() * 9000)}`,
              name: `PHC Data + ${resolvedMedName} (${registerTx})${
                data.parsedOpdFootfall ? ` · OPD: ${data.parsedOpdFootfall}` : ''
              }${data.parsedOccupiedBeds ? ` · Beds: ${data.parsedOccupiedBeds}` : ''}`,
              qty: data.parsedQuantity,
              date: data.parsedDate || '2026-09-28',
              time: nowTime
            },
            ...prev
          ]);
          setIsVoiceProcessing(false);
          return;
        }

        const newRow: ExtractedRecord = {
          id: `ocr-voice-${Date.now()}`,
          medicine: resolvedMedName,
          rawMedicineText: `Voice: "${cleanText}"`,
          batch: resolvedBatch,
          quantity: Math.max(1, Number(data.parsedQuantity) || 25),
          transaction: registerTx,
          date: data.parsedDate || '2026-09-28',
          prescribedBy: 'Voice Register Entry',
          confidenceScore: data.confidence || 0.97
        };

        if (autoCommitVoice && match.status === 'MATCHED') {
          await handleCommitSingleRow(newRow);
          showNotification(
            `Voice Command Committed to Ledger: ${newRow.quantity} units of ${newRow.medicine} (${newRow.transaction}).`
          );
        } else {
          setExtractedRecords((prev) => [newRow, ...prev]);
          setIsVerifiedByOfficer(true);
          showNotification(
            `Voice Command Added to Register Table: ${newRow.quantity} units of ${newRow.medicine} (${newRow.transaction}).`
          );
        }
      }
    } catch (err) {
      console.error('Voice register command error:', err);
      showNotification('Could not parse voice command.');
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
        time: nowTime
      },
      ...prev
    ]);
  };

  const voiceRegisterQuickChips = [
    {
      label: 'Register 60 ORS Dispensed',
      text: 'Register 60 packets of ORS batch ORS-2609 dispensed at OPD today',
      lang: 'english'
    },
    {
      label: 'Add 150 Paracetamol Received',
      text: 'Register 150 tablets of Paracetamol 500mg received from district warehouse',
      lang: 'english'
    },
    {
      label: 'Add PHC Data (OPD + Beds + Saline)',
      text: 'Add PHC data 245 OPD patients 17 occupied beds and 80 bottles Normal Saline received',
      lang: 'english'
    },
    {
      label: 'रजिस्टर में 90 एमोक्सिसिलिन दर्ज करें',
      text: 'रजिस्टर में एमोक्सिसिलिन 500mg की 90 कैप्सूल ओपीडी वितरण दर्ज करें',
      lang: 'hindi'
    },
    {
      label: 'Hinglish: 40 RL Bottles Received',
      text: 'Register mein Ringer Lactate ke 40 bottles warehouse se received add karo',
      lang: 'hinglish'
    }
  ];

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

      {/* Voice Commands Console to Register & Add PHC Data */}
      <div className="bg-white rounded-xl border border-emerald-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={toggleVoiceRecording}
              disabled={isTranscribing || isVoiceProcessing}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                isRecordingVoice
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title={isRecordingVoice ? 'Stop recording' : 'Speak voice command to register PHC data'}
            >
              {isRecordingVoice ? <Radio className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Voice Commands to Register &amp; Add Data from PHC
                </h2>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {isRecordingVoice
                    ? 'Listening to Microphone...'
                    : isTranscribing
                    ? 'Transcribing Audio...'
                    : 'Hands-Free Voice Entry Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Speak or click any command below to add medicine rows to the register, commit stock receipts, or update PHC OPD footfall &amp; bed occupancy.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs">
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="hinglish">Hinglish</option>
                <option value="hindi">Hindi (हिन्दी)</option>
                <option value="english">English</option>
                <option value="marwari">Marwari (मारवाड़ी)</option>
                <option value="tamil">Tamil (தமிழ்)</option>
                <option value="telugu">Telugu (తెలుగు)</option>
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
              value={voiceCommandText}
              onChange={(e) => setVoiceCommandText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void executeRegisterVoiceCommand(voiceCommandText);
                }
              }}
              placeholder="Speak or type e.g. 'Register 60 packets of ORS dispensed today' or 'Add PHC data 230 OPD patients 15 occupied beds'..."
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => executeRegisterVoiceCommand(voiceCommandText)}
            disabled={isVoiceProcessing || isTranscribing || !voiceCommandText.trim()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>{isVoiceProcessing ? 'Processing Voice...' : 'Run Voice Command →'}</span>
          </button>
        </div>

        {/* 1-Click Voice Command Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 mr-1">1-Click Voice Commands:</span>
          {voiceRegisterQuickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setVoiceCommandText(chip.text);
                setVoiceLanguage(chip.lang);
                void executeRegisterVoiceCommand(chip.text, chip.lang);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              "{chip.label}"
            </button>
          ))}
        </div>

        {lastVoiceResult && (
          <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Parsed Voice Action:</strong> {lastVoiceResult.parsedTransaction} ·{' '}
                <strong>{lastVoiceResult.parsedMedicine}</strong> ({lastVoiceResult.parsedQuantity} units)
                {lastVoiceResult.parsedOpdFootfall ? ` · OPD Footfall: ${lastVoiceResult.parsedOpdFootfall}` : ''}
                {lastVoiceResult.parsedOccupiedBeds ? ` · Occupied Beds: ${lastVoiceResult.parsedOccupiedBeds}` : ''}
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-800">
              {lastVoiceResult.languageDetected}
            </span>
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
                  2. Review &amp; Commit Extracted Register Entries
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Edit any field, select exact PHC medicines from the dropdown, and commit single rows or all rows at once.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addBlankRecord}
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Register Line</span>
                </button>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                  {extractedRecords.length} Rows
                </span>
              </div>
            </div>

            {ocrInspectionReport && !ocrInspectionReport.isMedicalDocument && (
              <div
                role="alert"
                className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 flex items-start gap-3 text-xs"
              >
                <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-bold text-sm">
                      Non-Medical / Non-Document Image Detected ({ocrInspectionReport.imageCategory})
                    </strong>
                    <span className="text-[10px] font-mono bg-rose-100 text-rose-900 px-2 py-0.5 rounded border border-rose-300 font-bold">
                      Strict Accuracy Filter Active · 0 Rows Extracted
                    </span>
                  </div>
                  <p className="font-medium leading-relaxed">{ocrInspectionReport.visualSummary}</p>
                  <p className="text-[11px] text-rose-800">
                    Please upload a clear photo of a handwritten/printed PHC stock register, medical prescription, delivery challan, or medicine packaging strip/box.
                  </p>
                </div>
              </div>
            )}

            {commitErrorBanner && (
              <div
                role="alert"
                className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 flex items-start gap-3 text-xs"
              >
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Validation Notice:</strong>
                  <span className="font-medium">{commitErrorBanner}</span>
                </div>
              </div>
            )}

            {/* Editable Table or Loading / Empty State */}
            {isProcessing ? (
              <div className="py-4">
                <TableSkeleton rows={4} cols={6} />
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
                      <th scope="col" className="px-3 py-2.5">Medicine Name &amp; Quick Selector</th>
                      <th scope="col" className="px-2 py-2.5">Batch</th>
                      <th scope="col" className="px-2 py-2.5">Transaction Type</th>
                      <th scope="col" className="px-2 py-2.5 text-right w-24">Qty</th>
                      <th scope="col" className="px-2 py-2.5 w-28">Date</th>
                      <th scope="col" className="px-2 py-2.5 text-center">OCR Conf.</th>
                      <th scope="col" className="px-2 py-2.5 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedRecords.map((rec) => {
                      const match = resolveMedicineMatch(medicines, rec.medicine);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2.5 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={rec.medicine}
                                placeholder="Enter or pick medicine..."
                                onChange={(e) => handleRecordChange(rec.id, 'medicine', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <select
                                value={match.status === 'MATCHED' ? match.medicine.name : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleRecordChange(rec.id, 'medicine', e.target.value);
                                  }
                                }}
                                title="Quick pick from PHC formulary"
                                className="w-7 px-1 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <option value="">Pick from PHC Formulary...</option>
                                {medicines.map((m) => (
                                  <option key={m.id} value={m.name}>
                                    {m.name} ({m.currentStock} {m.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {rec.rawMedicineText && rec.rawMedicineText !== rec.medicine && (
                              <div className="text-[10px] font-mono text-slate-500 truncate" title={rec.rawMedicineText}>
                                Read from image: <span className="text-slate-700">{rec.rawMedicineText}</span>
                              </div>
                            )}

                            {match.status === 'MATCHED' ? (
                              <div className="text-[10px] font-mono text-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>
                                  Matched: <strong>{match.medicine.id}</strong> · Stock: {match.medicine.currentStock}{' '}
                                  {match.medicine.unit}
                                </span>
                              </div>
                            ) : match.status === 'AMBIGUOUS' ? (
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-amber-900">
                                <span>
                                  <strong>AMBIGUOUS:</strong> Pick exact formulation:
                                </span>
                                {match.candidates.map((cand) => (
                                  <button
                                    key={cand.id}
                                    type="button"
                                    onClick={() => handleRecordChange(rec.id, 'medicine', cand.name)}
                                    className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 rounded text-amber-950 font-bold cursor-pointer"
                                  >
                                    {cand.name}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-rose-900">
                                <span>
                                  <strong>UNMATCHED:</strong> Select a valid PHC medicine
                                </span>
                                {medicines[0] && (
                                  <button
                                    type="button"
                                    onClick={() => handleRecordChange(rec.id, 'medicine', medicines[0].name)}
                                    className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 rounded text-rose-950 font-bold cursor-pointer shrink-0"
                                  >
                                    Auto-Match Default
                                  </button>
                                )}
                              </div>
                            )}
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
                              min={1}
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
                            <span className="font-mono text-[11px] font-bold text-emerald-800">
                              {Math.round(rec.confidenceScore * 100)}%
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCommitSingleRow(rec)}
                                disabled={match.status !== 'MATCHED'}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                title="Commit this row immediately"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRecord(rec.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Remove item"
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
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
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
                  Authorized healthcare verification enabled — ready to commit all matched register entries to the live stock ledger for <strong>{selectedPHC.name}</strong>.
                </label>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-mono">
              {extractedRecords.length} item{extractedRecords.length === 1 ? '' : 's'} ready to commit
            </span>
            <button
              type="button"
              onClick={() => {
                setIsVerifiedByOfficer(true);
                void handleCommitAll();
              }}
              disabled={extractedRecords.length === 0}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                extractedRecords.length > 0
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify &amp; Commit All ({extractedRecords.length}) to Stock Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verification Audit Trail Log */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Recent Verified OCR &amp; Voice Register Audit Trail ({selectedPHC.name})</span>
        </h3>
        <div className="divide-y divide-slate-100 text-xs">
          {committedLog.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[11px] font-bold text-slate-500">
                  {log.id}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-bold text-slate-900">{log.name}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-emerald-800 font-mono font-bold">
                  {log.qty} Units
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Committed: {log.date} ({log.time})
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
