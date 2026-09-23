import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  FACILITIES,
  INITIAL_MEDICINES,
  INITIAL_CAPACITY,
  INITIAL_STAFF,
  INITIAL_WORKFORCE_SUMMARY,
  INITIAL_WEATHER,
  INITIAL_ORDERS,
  INITIAL_REDISTRIBUTION,
  INITIAL_ALERTS,
  INTEGRATION_CONNECTORS,
  SAMPLE_OCR_PRESETS
} from './src/data/mockData.ts';
import { LogisticsOrder, MedicineItem, OperationalAlert, RedistributionOpportunity } from './src/types.ts';

// In-memory operational database
let medicines: MedicineItem[] = [...INITIAL_MEDICINES];
let orders: LogisticsOrder[] = [...INITIAL_ORDERS];
let alerts: OperationalAlert[] = [...INITIAL_ALERTS];
let redistributions: RedistributionOpportunity[] = [...INITIAL_REDISTRIBUTION];
let connectors = [...INTEGRATION_CONNECTORS];
let capacity = { ...INITIAL_CAPACITY };
let workforce = { ...INITIAL_WORKFORCE_SUMMARY };
let weather = { ...INITIAL_WEATHER };

// Lazy initialization for Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'PHC Intelligence Operational Server',
      timestamp: new Date().toISOString(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  // Master facilities endpoint
  app.get('/api/facilities', (req, res) => {
    res.json(FACILITIES);
  });

  // Inventory endpoint
  app.get('/api/inventory', (req, res) => {
    const phcId = (req.query.phcId as string) || 'phc-osian';
    const facilityMeds = medicines.filter(m => m.phcId === phcId);
    res.json(facilityMeds);
  });

  // Consume / Dispense medicine
  app.post('/api/inventory/consume', (req, res) => {
    const { medicineId, quantity, reason, prescribedBy } = req.body;
    const med = medicines.find(m => m.id === medicineId);
    if (!med) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const qty = Number(quantity) || 0;
    med.currentStock = Math.max(0, med.currentStock - qty);
    med.dailyConsumption = Math.round((med.dailyConsumption * 6 + qty) / 7);
    med.projectedStockoutDays = med.dailyConsumption > 0 ? Number((med.currentStock / med.dailyConsumption).toFixed(1)) : 99;

    // Recalculate risk
    if (med.currentStock <= med.minStockLevel * 0.5) {
      med.stockoutRisk = 'CRITICAL';
    } else if (med.currentStock <= med.minStockLevel) {
      med.stockoutRisk = 'WARNING';
    } else if (med.currentStock > med.maxStockLevel) {
      med.stockoutRisk = 'SURPLUS';
      med.predictedSurplus = med.currentStock - med.maxStockLevel;
    } else {
      med.stockoutRisk = 'NORMAL';
    }

    res.json({ success: true, updatedMedicine: med });
  });

  // Verify and commit OCR record
  app.post('/api/inventory/verify-record', (req, res) => {
    const { medicineName, quantity, transaction, date, batch, phcId = 'phc-osian' } = req.body;

    const med = medicines.find(m => m.phcId === phcId && m.name.toLowerCase().includes(medicineName.toLowerCase().split(' ')[0]));
    if (med) {
      const qty = Number(quantity) || 0;
      if (transaction.toLowerCase().includes('dispensed') || transaction.toLowerCase().includes('consumption')) {
        med.currentStock = Math.max(0, med.currentStock - qty);
      } else if (transaction.toLowerCase().includes('received')) {
        med.currentStock += qty;
      }
      med.projectedStockoutDays = med.dailyConsumption > 0 ? Number((med.currentStock / med.dailyConsumption).toFixed(1)) : 99;
    }

    res.json({
      success: true,
      message: 'Record verified and official inventory ledger updated',
      transactionId: `TXN-${Date.now()}`
    });
  });

  // Process Voice Entry (Hindi, Hinglish, English)
  app.post('/api/voice/process', async (req, res) => {
    const { transcript, language } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript required' });
    }

    const ai = getGemini();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are an AI assistant for a Primary Health Centre (PHC) inventory system in India.
The user spoke a command in English, Hindi, or Hinglish regarding medicine dispensing or receiving.
Spoken text: "${transcript}"

Extract the following structured JSON:
{
  "parsedMedicine": "Standard medicine name (e.g. Oral Rehydration Salts (ORS) Sachets 20.5g, Paracetamol Tablets IP 500mg, Normal Saline 500ml, Zinc Sulfate 20mg)",
  "parsedTransaction": "Consumption" or "Receipt" or "Emergency Dispense",
  "parsedQuantity": number,
  "parsedDate": "2026-09-22",
  "confidence": 0.95,
  "notes": "Brief context explanation"
}`,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          rawTranscript: transcript,
          languageDetected: language || 'Hinglish / Hindi',
          ...parsed
        });
      } catch (e) {
        console.error('Gemini voice processing failed, falling back to rule engine:', e);
      }
    }

    // Fallback rule-based parsing engine
    const text = transcript.toLowerCase();
    let parsedMedicine = 'Oral Rehydration Salts (ORS) Sachets 20.5g';
    let parsedTransaction: 'Consumption' | 'Receipt' | 'Emergency Dispense' = 'Consumption';
    let parsedQuantity = 35;
    let notes = 'OPD routine dispensing';

    if (text.includes('pcm') || text.includes('paracetamol')) {
      parsedMedicine = 'Paracetamol Tablets IP 500mg';
    } else if (text.includes('saline') || text.includes('ns')) {
      parsedMedicine = 'Normal Saline (0.9% NaCl) IV Infusion 500ml';
    } else if (text.includes('rl') || text.includes('ringer')) {
      parsedMedicine = 'Ringer Lactate (RL) IV Infusion 500ml';
    } else if (text.includes('amox') || text.includes('antibiotic')) {
      parsedMedicine = 'Amoxicillin Capsules IP 500mg';
    } else if (text.includes('zinc')) {
      parsedMedicine = 'Zinc Sulfate Dispersible Tablets 20mg';
    } else if (text.includes('arv') || text.includes('rabies')) {
      parsedMedicine = 'Anti-Rabies Vaccine (ARV) 2.5 IU/ml';
    }

    // Numbers in Hindi/English
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
      parsedQuantity = parseInt(numberMatch[0], 10);
    } else if (text.includes('pachees') || text.includes('25')) {
      parsedQuantity = 25;
    } else if (text.includes('paints') || text.includes('pentees') || text.includes('35')) {
      parsedQuantity = 35;
    } else if (text.includes('sau') || text.includes('hundred')) {
      parsedQuantity = 100;
    }

    if (text.includes('received') || text.includes('aaye') || text.includes('aaya') || text.includes('receipt') || text.includes('mili')) {
      parsedTransaction = 'Receipt';
      notes = 'Inward shipment received from warehouse';
    } else if (text.includes('emergency') || text.includes('casualty')) {
      parsedTransaction = 'Emergency Dispense';
      notes = 'Emergency casualty triage administration';
    }

    res.json({
      rawTranscript: transcript,
      languageDetected: language || (/[a-zA-Z]/.test(transcript) && /[\u0900-\u097F]/.test(transcript) ? 'Hinglish' : 'Hindi/English'),
      parsedMedicine,
      parsedTransaction,
      parsedQuantity,
      parsedDate: '2026-09-22',
      confidence: 0.94,
      notes
    });
  });

  // OCR Processing endpoint
  app.post('/api/ocr/process', async (req, res) => {
    const { presetId, imageBase64 } = req.body;

    if (presetId) {
      const preset = SAMPLE_OCR_PRESETS.find(p => p.id === presetId);
      if (preset) {
        return res.json({
          success: true,
          method: 'Template Verified Scan OCR',
          name: preset.name,
          records: preset.records
        });
      }
    }

    // Default or uploaded image simulation
    const records = [
      {
        id: `ocr-${Date.now()}-1`,
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        batch: 'ORS-RJ-2604',
        quantity: 40,
        date: '2026-09-22',
        transaction: 'Dispensed (OPD)',
        prescribedBy: 'Dr. Suresh Chandra Bishnoi',
        verified: false,
        confidenceScore: 0.93
      },
      {
        id: `ocr-${Date.now()}-2`,
        medicine: 'Paracetamol Tablets IP 500mg',
        batch: 'PCM-T-440',
        quantity: 150,
        date: '2026-09-22',
        transaction: 'Dispensed (OPD)',
        prescribedBy: 'Dr. Manisha Meena',
        verified: false,
        confidenceScore: 0.96
      },
      {
        id: `ocr-${Date.now()}-3`,
        medicine: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
        batch: 'NS-IV-998',
        quantity: 12,
        date: '2026-09-22',
        transaction: 'Emergency Inpatient',
        prescribedBy: 'Dr. Suresh Chandra Bishnoi',
        verified: false,
        confidenceScore: 0.88
      }
    ];

    res.json({
      success: true,
      method: 'High-Accuracy Health Ledger OCR',
      name: 'Physical Stock Ledger Scan',
      records
    });
  });

  // Orders endpoints
  app.get('/api/orders', (req, res) => {
    res.json(orders);
  });

  app.post('/api/orders/create', (req, res) => {
    const { medicineName, quantityRequested, priority, justification, phcId = 'phc-osian', phcName = 'PHC Osian (24x7)' } = req.body;
    const newOrder: LogisticsOrder = {
      id: `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
      phcId,
      phcName,
      medicineName,
      quantityRequested: Number(quantityRequested),
      source: 'District Drug Warehouse Mandore (RMSCL)',
      destination: `${phcName} Store`,
      status: 'APPROVAL PENDING',
      requestDate: '2026-09-22',
      estimatedDelivery: '2026-09-25',
      priority: priority || 'ROUTINE',
      notes: justification || 'Demand forecast replenishment triggered'
    };

    orders.unshift(newOrder);
    res.json({ success: true, order: newOrder });
  });

  app.post('/api/orders/advance', (req, res) => {
    const { orderId } = req.body;
    const order = orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const flow: Record<LogisticsOrder['status'], LogisticsOrder['status']> = {
      'REQUESTED': 'APPROVAL PENDING',
      'APPROVAL PENDING': 'APPROVED',
      'APPROVED': 'PROCESSING',
      'PROCESSING': 'DISPATCHED',
      'DISPATCHED': 'IN TRANSIT',
      'IN TRANSIT': 'DELIVERED',
      'DELIVERED': 'RECEIVED',
      'RECEIVED': 'RECEIVED'
    };

    const nextStatus = flow[order.status];
    order.status = nextStatus;

    if (nextStatus === 'APPROVED') {
      order.approvalDate = '2026-09-22';
    } else if (nextStatus === 'DISPATCHED') {
      order.dispatchDate = '2026-09-22';
      order.quantityDispatched = order.quantityRequested;
      order.consignmentId = `RJ-VTS-${Math.floor(10000 + Math.random() * 90000)}`;
    } else if (nextStatus === 'RECEIVED') {
      order.actualDeliveryDate = '2026-09-22';
      // Automatically update medicine inventory stock!
      const med = medicines.find(m => m.phcId === order.phcId && m.name === order.medicineName);
      if (med) {
        med.currentStock += (order.quantityDispatched || order.quantityRequested);
        med.pendingOrders = Math.max(0, med.pendingOrders - order.quantityRequested);
        med.projectedStockoutDays = med.dailyConsumption > 0 ? Number((med.currentStock / med.dailyConsumption).toFixed(1)) : 99;
      }
    }

    res.json({ success: true, order });
  });

  // Redistribution opportunities
  app.get('/api/redistributions', (req, res) => {
    res.json(redistributions);
  });

  app.post('/api/redistributions/approve', (req, res) => {
    const { id } = req.body;
    const item = redistributions.find(r => r.id === id);
    if (!item) return res.status(404).json({ error: 'Redistribution opportunity not found' });

    item.status = 'APPROVED';

    // Transfer stocks in database
    const sourceMed = medicines.find(m => item.sourcePHC && m.phcId === item.sourcePHC.id && m.name === item.medicineName);
    const targetMed = medicines.find(m => item.targetPHC && m.phcId === item.targetPHC.id && m.name === item.medicineName);

    if (sourceMed && targetMed) {
      sourceMed.currentStock = Math.max(0, sourceMed.currentStock - item.recommendedTransferQuantity);
      targetMed.currentStock += item.recommendedTransferQuantity;
      targetMed.stockoutRisk = 'NORMAL';
      targetMed.projectedStockoutDays = Number((targetMed.currentStock / targetMed.dailyConsumption).toFixed(1));
    }

    res.json({ success: true, redistribution: item });
  });

  // Alerts endpoint
  app.get('/api/alerts', (req, res) => {
    res.json(alerts);
  });

  app.post('/api/alerts/acknowledge', (req, res) => {
    const { id } = req.body;
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      alert.status = alert.status === 'ACTIVE' ? 'ACKNOWLEDGED' : 'RESOLVED';
    }
    res.json({ success: true, alert });
  });

  // Other endpoints
  app.get('/api/capacity', (req, res) => res.json(capacity));
  app.get('/api/workforce', (req, res) => res.json({ summary: workforce, staff: INITIAL_STAFF }));
  app.get('/api/preparedness', (req, res) => res.json(weather));
  app.get('/api/integrations', (req, res) => res.json(connectors));
  app.post('/api/integrations/toggle', (req, res) => {
    const { id, status } = req.body;
    const connector = connectors.find(c => c.id === id);
    if (connector) {
      connector.status = status;
      connector.lastSync = 'Just now';
    }
    res.json({ success: true, connector });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PHC Intelligence Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
