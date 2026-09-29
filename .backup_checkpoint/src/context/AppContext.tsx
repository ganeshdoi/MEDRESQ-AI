import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Role,
  PHCFacility,
  MedicineItem,
  CapacityRecord,
  StaffMember,
  WorkforceSummary,
  WeatherPreparedness,
  LogisticsOrder,
  RedistributionOpportunity,
  OperationalAlert,
  IntegrationConnector,
  GoogleMapsPlace,
  AIChatMessage,
  OfflineQueueItem,
  ProactiveStockAlert
} from '../types.ts';
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
  INTEGRATION_CONNECTORS
} from '../data/mockData.ts';
import { generateEssentialMedicinesForPHC } from '../data/nationalEssentialMedicines.ts';
import {
  auth,
  db,
  googleProvider,
  testConnection,
  handleFirestoreError,
  OperationType
} from '../firebase.ts';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  selectedPHC: PHCFacility;
  setSelectedPHC: (phc: PHCFacility) => void;
  facilities: PHCFacility[];
  medicines: MedicineItem[];
  capacity: CapacityRecord;
  staff: StaffMember[];
  workforce: WorkforceSummary;
  weather: WeatherPreparedness;
  orders: LogisticsOrder[];
  redistributions: RedistributionOpportunity[];
  alerts: OperationalAlert[];
  connectors: IntegrationConnector[];
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

  // Firebase Auth
  currentUser: User | null;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;

  // AI & Chat
  chatMessages: AIChatMessage[];
  isChatLoading: boolean;
  sendChatMessage: (content: string, persona?: string, taskComplexity?: string) => Promise<void>;
  clearChatHistory: () => void;

  // Audio Transcription with gemini-3.5-transcribe
  transcribeAudio: (audioBlob: Blob) => Promise<string>;
  isTranscribing: boolean;

  // Maps Grounding with gemini-3.5-flash
  searchNearbyMapsGrounding: (query: string, latitude?: number, longitude?: number) => Promise<{ text: string; places: GoogleMapsPlace[] }>;
  isMapsLoading: boolean;

  // Operational Actions
  consumeMedicine: (medicineId: string, quantity: number, reason: string) => Promise<void>;
  verifyOCRRecord: (record: { medicineName: string; quantity: number; transaction: string; date: string; batch: string }) => Promise<void>;
  createOrder: (order: { medicineName: string; quantityRequested: number; priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT'; justification: string }) => Promise<void>;
  advanceOrder: (orderId: string) => Promise<void>;
  approveRedistribution: (id: string) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  toggleConnector: (id: string, status: 'CONNECTED' | 'NOT CONNECTED' | 'CONFIGURE') => Promise<void>;
  notificationMessage: string | null;
  clearNotification: () => void;
  showNotification: (msg: string) => void;

  // Local Storage Offline Queue
  offlineQueue: OfflineQueueItem[];
  isQueueSyncing: boolean;
  addToOfflineQueue: (item: {
    module: OfflineQueueItem['module'];
    moduleLabel: string;
    action: string;
    entityName: string;
    quantity?: number;
    unit?: string;
    payload: Record<string, any>;
  }) => void;
  syncOfflineQueue: () => Promise<void>;
  syncQueueItem: (id: string) => Promise<void>;
  removeQueueItem: (id: string) => void;
  clearOfflineQueue: () => void;
  addMockOfflineRecord: () => void;

  // Global Prediction Engine Modal
  isPredictionEngineOpen: boolean;
  setIsPredictionEngineOpen: (open: boolean) => void;
  openPredictionEngine: () => void;

  // Proactive Critical Stock Threshold Notification System
  proactiveStockAlerts: ProactiveStockAlert[];
  activeThresholdToast: ProactiveStockAlert | null;
  dismissThresholdToast: () => void;
  markProactiveAlertRead: (alertId: string) => void;
  dismissAllProactiveAlerts: () => void;
  updateMedicineThreshold: (medicineId: string, newMinThreshold: number) => void;
  simulateThresholdBreach: (medicineId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_CHAT_MESSAGES: AIChatMessage[] = [
  {
    id: 'msg-welcome-1',
    role: 'model',
    content: `Namaste. I am **MEDRESQ AI**, calibrated for Primary Health Centres under the National Health Mission.\n\nI can assist you with:\n- **Clinical Inventory & Stockout Triage** (ORS, IV fluids, Antivenom)\n- **Outbreak surge forecasting** using epidemiological modeling\n- **Live Google Maps Grounding** to locate referral centres, cold chains, and blood banks\n- **Microphone speech-to-text transcription** for rapid OPD stock records.\n\nSelect a specialist persona or ask a question to begin.`,
    modelUsed: 'gemini-3.5-flash',
    persona: 'clinical_officer',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

const SEED_OFFLINE_QUEUE: OfflineQueueItem[] = [
  {
    id: 'Q-VOICE-8401',
    module: 'voice',
    moduleLabel: 'Voice OPD Entry',
    action: 'DISPENSE_CONSUMPTION',
    entityName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    quantity: 35,
    unit: 'packets',
    facilityId: 'phc-osian',
    facilityName: 'PHC Osian',
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    formattedTime: '42 mins ago',
    status: 'PENDING_SYNC',
    retryCount: 0,
    byteSize: 348,
    payload: {
      transcript: 'Aaj ORS ke 35 packets use hue.',
      language: 'Hinglish',
      prescribedBy: 'Staff Nurse',
      ward: 'Dispensary OPD'
    }
  },
  {
    id: 'Q-MED-8402',
    module: 'medicine',
    moduleLabel: 'Clinical Stock Ledger',
    action: 'EMERGENCY_DISPENSE',
    entityName: 'Paracetamol 500mg Tablets',
    quantity: 120,
    unit: 'tablets',
    facilityId: 'phc-osian',
    facilityName: 'PHC Osian',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    formattedTime: '28 mins ago',
    status: 'PENDING_SYNC',
    retryCount: 0,
    byteSize: 412,
    payload: {
      medicineId: 'med-2',
      reason: 'Emergency fever triage during high-heat index',
      remainingEstimated: 460
    }
  },
  {
    id: 'Q-ORD-8403',
    module: 'orders',
    moduleLabel: 'Indent Logistics',
    action: 'CREATE_REPLENISHMENT_ORDER',
    entityName: 'Normal Saline 0.9% IV Fluids 500ml',
    quantity: 50,
    unit: 'bottles',
    facilityId: 'phc-osian',
    facilityName: 'PHC Osian',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    formattedTime: '15 mins ago',
    status: 'PENDING_SYNC',
    retryCount: 0,
    byteSize: 520,
    payload: {
      priority: 'URGENT',
      source: 'District Drug Warehouse Mandore (RMSCL)',
      justification: 'Stock below 3 days buffer due to dehydration admissions'
    }
  },
  {
    id: 'Q-ALT-8404',
    module: 'alerts',
    moduleLabel: 'Alert Resolution',
    action: 'ACKNOWLEDGE_INCIDENT',
    entityName: 'Cold Chain Excursion Warning (ILR Unit 1)',
    facilityId: 'phc-osian',
    facilityName: 'PHC Osian',
    timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    formattedTime: '6 mins ago',
    status: 'PENDING_SYNC',
    retryCount: 0,
    byteSize: 288,
    payload: {
      alertId: 'ALT-103',
      actionTaken: 'Backup generator switched on; temp stabilized at +4.2°C'
    }
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('medical_officer');
  const [facilities] = useState<PHCFacility[]>(FACILITIES);
  const [selectedPHC, setSelectedPHCState] = useState<PHCFacility>(FACILITIES[0]);
  const [activeModule, setActiveModuleState] = useState<string>('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  // Local Storage Offline Queue State
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const stored = localStorage.getItem('medresq_offline_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse offline queue from localStorage:', err);
    }
    return SEED_OFFLINE_QUEUE;
  });
  const [isQueueSyncing, setIsQueueSyncing] = useState<boolean>(false);

  // Firebase Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Audio transcription state
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  // Maps state
  const [isMapsLoading, setIsMapsLoading] = useState<boolean>(false);

  // Global Prediction Engine Modal state
  const [isPredictionEngineOpen, setIsPredictionEngineOpen] = useState<boolean>(false);
  const openPredictionEngine = () => setIsPredictionEngineOpen(true);

  const setActiveModule = (module: string) => {
    setActiveModuleState(module);
    setMobileSidebarOpen(false);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };

  const [medicines, setMedicines] = useState<MedicineItem[]>(INITIAL_MEDICINES);
  const [capacity, setCapacity] = useState<CapacityRecord>(INITIAL_CAPACITY);

  const setSelectedPHC = (phc: PHCFacility) => {
    setSelectedPHCState(phc);
    const nextMeds = generateEssentialMedicinesForPHC(phc.id, `${phc.district} District Drug Warehouse`);
    setMedicines(nextMeds);
    const totalBeds = phc.sanctionedBeds || 20;
    const occupiedBeds = Math.min(totalBeds, phc.occupiedBeds || 12);
    const availableBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    setCapacity((prev) => ({
      ...prev,
      phcId: phc.id,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
      opdFootfall: Math.max(95, Math.round((phc.populationServed || 35000) / 185))
    }));
    fetch(`/api/inventory?phcId=${encodeURIComponent(phc.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMedicines(data);
        }
      })
      .catch(() => {});
  };
  const [staff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [workforce] = useState<WorkforceSummary>(INITIAL_WORKFORCE_SUMMARY);
  const [weather] = useState<WeatherPreparedness>(INITIAL_WEATHER);
  const [orders, setOrders] = useState<LogisticsOrder[]>(INITIAL_ORDERS);
  const [redistributions, setRedistributions] = useState<RedistributionOpportunity[]>(INITIAL_REDISTRIBUTION);
  const [alerts, setAlerts] = useState<OperationalAlert[]>(INITIAL_ALERTS);
  const [connectors, setConnectors] = useState<IntegrationConnector[]>(INTEGRATION_CONNECTORS);
  const [proactiveStockAlerts, setProactiveStockAlerts] = useState<ProactiveStockAlert[]>([]);
  const [activeThresholdToast, setActiveThresholdToast] = useState<ProactiveStockAlert | null>(null);

  const dismissThresholdToast = () => setActiveThresholdToast(null);

  // Evaluate medicine stock levels against defined facility thresholds (minStockLevel)
  useEffect(() => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const breachedMeds = medicines.filter((m) => m.currentStock <= m.minStockLevel);

    setProactiveStockAlerts((prev) => {
      const nextAlerts: ProactiveStockAlert[] = breachedMeds.map((med) => {
        const existing = prev.find((p) => p.medicineId === med.id && p.phcId === selectedPHC.id);
        const isCritical =
          med.currentStock <= Math.round(med.minStockLevel * 0.55) ||
          med.projectedStockoutDays <= 3.5 ||
          med.stockoutRisk === 'CRITICAL';

        return {
          id: existing?.id || `THRESH-${selectedPHC.code}-${med.id}`,
          phcId: selectedPHC.id,
          phcName: selectedPHC.name,
          medicineId: med.id,
          medicineName: med.name,
          category: med.category,
          currentStock: med.currentStock,
          thresholdLevel: med.minStockLevel,
          unit: med.unit,
          projectedStockoutDays: med.projectedStockoutDays,
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          timestamp: existing?.timestamp || `Today, ${nowTime}`,
          read: existing ? existing.read : false,
          autoIndentTriggered: existing?.autoIndentTriggered || med.pendingOrders > 0
        };
      });

      // Sort CRITICAL first, then lowest stock-to-threshold ratio
      return nextAlerts.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'CRITICAL' ? -1 : 1;
        return a.currentStock / Math.max(1, a.thresholdLevel) - b.currentStock / Math.max(1, b.thresholdLevel);
      });
    });

    // Synchronize threshold breaches into the main OperationalAlert list so AlertCentre shows them
    setAlerts((prev) => {
      const nonThresholdAlerts = prev.filter((a) => !a.id.startsWith('ALT-THRESH-'));
      const generatedOperationalAlerts: OperationalAlert[] = breachedMeds.map((med) => {
        const alertId = `ALT-THRESH-${med.id}`;
        const existingOp = prev.find((a) => a.id === alertId);
        const isCritical =
          med.currentStock <= Math.round(med.minStockLevel * 0.55) ||
          med.projectedStockoutDays <= 3.5 ||
          med.stockoutRisk === 'CRITICAL';
        const deficit = Math.max(0, med.minStockLevel - med.currentStock);

        return {
          id: alertId,
          phcId: selectedPHC.id,
          phcName: selectedPHC.name,
          facilityName: selectedPHC.name,
          category: isCritical ? 'CRITICAL' : 'WARNING',
          title: `Threshold Breach: ${med.name} (${med.currentStock.toLocaleString()} / ${med.minStockLevel.toLocaleString()} ${med.unit})`,
          description: `Live stock (${med.currentStock.toLocaleString()} ${med.unit}) fell below the defined facility safety threshold of ${med.minStockLevel.toLocaleString()} ${med.unit} (-${deficit.toLocaleString()} ${med.unit} below threshold; ~${med.projectedStockoutDays} days supply remaining at ${med.dailyConsumption}/day burn).`,
          iconType: 'pill',
          timestamp: existingOp?.timestamp || `Today, ${nowTime}`,
          status: existingOp?.status || 'ACTIVE',
          medicineId: med.id,
          currentStock: med.currentStock,
          thresholdLevel: med.minStockLevel,
          unit: med.unit,
          whyItMatters: `Maintaining at least ${med.minStockLevel} ${med.unit} prevents clinical stockout during RMSCL warehouse transit lead time.`,
          suggestedAction: `Dispatch urgent replenishment indent for +${Math.max(200, med.minStockLevel * 2 - med.currentStock)} ${med.unit}.`
        };
      });

      return [...generatedOperationalAlerts, ...nonThresholdAlerts];
    });
  }, [medicines, selectedPHC.id, selectedPHC.name, selectedPHC.code]);

  const markProactiveAlertRead = (alertId: string) => {
    setProactiveStockAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
    );
  };

  const dismissAllProactiveAlerts = () => {
    setProactiveStockAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setActiveThresholdToast(null);
  };

  const updateMedicineThreshold = (medicineId: string, newMinThreshold: number) => {
    const cleanThreshold = Math.max(10, Math.round(newMinThreshold));
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id !== medicineId) return med;
        const isCrit =
          med.currentStock <= Math.round(cleanThreshold * 0.55) ||
          med.projectedStockoutDays <= 3.5;
        const isWarn = !isCrit && med.currentStock <= cleanThreshold;
        const nextRisk: MedicineItem['stockoutRisk'] = isCrit
          ? 'CRITICAL'
          : isWarn
          ? 'WARNING'
          : med.currentStock > cleanThreshold * 2.4
          ? 'SURPLUS'
          : 'NORMAL';

        if (med.currentStock <= cleanThreshold) {
          const toastAlert: ProactiveStockAlert = {
            id: `THRESH-${selectedPHC.code}-${med.id}-${Date.now()}`,
            phcId: selectedPHC.id,
            phcName: selectedPHC.name,
            medicineId: med.id,
            medicineName: med.name,
            category: med.category,
            currentStock: med.currentStock,
            thresholdLevel: cleanThreshold,
            unit: med.unit,
            projectedStockoutDays: med.projectedStockoutDays,
            severity: isCrit ? 'CRITICAL' : 'WARNING',
            timestamp: `Just now (${nowTime})`,
            read: false
          };
          setActiveThresholdToast(toastAlert);
        }

        return {
          ...med,
          minStockLevel: cleanThreshold,
          stockoutRisk: nextRisk
        };
      })
    );

    const target = medicines.find((m) => m.id === medicineId);
    if (target) {
      notify(
        `Updated threshold for ${target.name} to ${cleanThreshold.toLocaleString()} ${target.unit}.`
      );
    }
  };

  const simulateThresholdBreach = (medicineId?: string) => {
    const targetMed =
      (medicineId ? medicines.find((m) => m.id === medicineId) : undefined) ||
      medicines.find((m) => m.stockoutRisk === 'NORMAL') ||
      medicines[0];

    if (!targetMed) return;

    const breachedStock = Math.max(5, Math.round(targetMed.minStockLevel * 0.42));
    const projectedDays = Number(
      (breachedStock / Math.max(1, targetMed.dailyConsumption)).toFixed(1)
    );
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMedicines((prev) =>
      prev.map((m) =>
        m.id === targetMed.id
          ? {
              ...m,
              currentStock: breachedStock,
              projectedStockoutDays: projectedDays,
              stockoutRisk: 'CRITICAL'
            }
          : m
      )
    );

    const toastAlert: ProactiveStockAlert = {
      id: `THRESH-${selectedPHC.code}-${targetMed.id}-${Date.now()}`,
      phcId: selectedPHC.id,
      phcName: selectedPHC.name,
      medicineId: targetMed.id,
      medicineName: targetMed.name,
      category: targetMed.category,
      currentStock: breachedStock,
      thresholdLevel: targetMed.minStockLevel,
      unit: targetMed.unit,
      projectedStockoutDays: projectedDays,
      severity: 'CRITICAL',
      timestamp: `Just now (${nowTime})`,
      read: false
    };

    setActiveThresholdToast(toastAlert);
    notify(
      `PROACTIVE ALERT: ${targetMed.name} dropped to ${breachedStock} ${targetMed.unit} (below ${targetMed.minStockLevel} ${targetMed.unit} threshold)!`
    );
  };

  // Initial Firestore connection test
  useEffect(() => {
    testConnection();
  }, []);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (user) {
        // Save/update user profile in Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'PHC Staff Member',
            photoURL: user.photoURL || '',
            role,
            phcId: selectedPHC.id,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.warn('User profile sync deferred (offline mode):', error);
        }
      }
    });

    return () => unsubscribe();
  }, [role, selectedPHC.id]);

  // Firestore Realtime listener for Orders
  useEffect(() => {
    if (!currentUser) return;

    try {
      const ordersRef = collection(db, 'orders');
      const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreOrders: LogisticsOrder[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            firestoreOrders.push({
              id: data.id || docSnap.id,
              phcId: data.phcId,
              phcName: data.phcName || selectedPHC.name,
              medicineName: data.medicineName,
              quantityRequested: Number(data.quantityRequested) || 0,
              source: data.source || 'District Drug Warehouse Mandore (RMSCL)',
              destination: data.destination || `${selectedPHC.name} Store`,
              status: data.status || 'APPROVAL PENDING',
              requestDate: data.requestDate || new Date().toISOString().split('T')[0],
              estimatedDelivery: data.estimatedDelivery,
              priority: data.priority || 'ROUTINE',
              notes: data.notes
            });
          });

          // Merge with initial orders
          setOrders(prev => {
            const combined = [...firestoreOrders];
            for (const o of prev) {
              if (!combined.some(c => c.id === o.id)) {
                combined.push(o);
              }
            }
            return combined;
          });
        }
      }, (err) => {
        if (err.code === 'unavailable' || err.message?.includes('offline') || err.message?.includes('backend')) {
          console.warn('Firestore orders sync operating in offline mode.');
          return;
        }
        console.warn('Firestore orders listener status:', err.message);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore orders listener error:', err);
    }
  }, [currentUser, selectedPHC.name]);

  // Initial backend API fetch
  useEffect(() => {
    fetch(`/api/inventory?phcId=${encodeURIComponent(selectedPHC.id)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMedicines(data);
        }
      })
      .catch(() => {});
  }, []);

  const notify = (msg: string) => {
    setNotificationMessage(msg);
    setTimeout(() => {
      setNotificationMessage(null);
    }, 4500);
  };

  const clearNotification = () => setNotificationMessage(null);

  const toggleOfflineMode = () => {
    const next = !isOfflineMode;
    setIsOfflineMode(next);
    notify(next ? 'Switched to Low-Bandwidth Offline Sync Mode. Changes will be buffered locally.' : 'Switched to Online Real-time Sync Mode.');
  };

  // Sync offline queue to localStorage on update
  useEffect(() => {
    try {
      localStorage.setItem('medresq_offline_queue', JSON.stringify(offlineQueue));
    } catch (err) {
      console.warn('Failed to save offline queue to localStorage:', err);
    }
  }, [offlineQueue]);

  // Add record to offline queue
  const addToOfflineQueue = (item: {
    module: OfflineQueueItem['module'];
    moduleLabel: string;
    action: string;
    entityName: string;
    quantity?: number;
    unit?: string;
    payload: Record<string, any>;
  }) => {
    const rawPayload = JSON.stringify(item.payload);
    const byteSize = new Blob([rawPayload]).size;
    const newItem: OfflineQueueItem = {
      id: `Q-${item.module.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      module: item.module,
      moduleLabel: item.moduleLabel,
      action: item.action,
      entityName: item.entityName,
      quantity: item.quantity,
      unit: item.unit,
      facilityId: selectedPHC.id,
      facilityName: selectedPHC.name,
      timestamp: new Date().toISOString(),
      formattedTime: 'Just now',
      status: 'PENDING_SYNC',
      retryCount: 0,
      byteSize,
      payload: item.payload
    };

    setOfflineQueue(prev => [newItem, ...prev]);
    notify(`Saved offline record: ${item.entityName} buffered to local queue.`);
  };

  // Sync all pending records in the offline queue
  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) {
      notify('Local storage queue is empty. No offline records to sync.');
      return;
    }

    const pending = offlineQueue.filter(item => item.status !== 'SYNCED');
    if (pending.length === 0) {
      notify('All records in local storage queue are already marked as synced.');
      return;
    }

    setIsQueueSyncing(true);
    notify(`Initiating synchronization of ${pending.length} buffered offline records...`);

    try {
      // Save audit sync documents to Firestore if authenticated
      if (currentUser) {
        for (const item of pending) {
          try {
            await setDoc(doc(db, 'offline_sync_audit', item.id), {
              ...item,
              status: 'SYNCED',
              syncedAt: new Date().toISOString(),
              syncedBy: currentUser.email || currentUser.uid
            }, { merge: true });
          } catch (e) {
            console.warn('Firestore offline sync error:', e);
          }
        }
      }

      await new Promise(r => setTimeout(r, 800));

      setOfflineQueue(prev =>
        prev.map(item => ({
          ...item,
          status: 'SYNCED',
          formattedTime: 'Synced just now'
        }))
      );

      notify(`Successfully synchronized ${pending.length} offline records to central database!`);
    } catch (err) {
      console.error('Offline queue sync error:', err);
      notify('Partial sync failure. Some records remain in queue for retry.');
    } finally {
      setIsQueueSyncing(false);
    }
  };

  // Sync single queue item
  const syncQueueItem = async (id: string) => {
    setOfflineQueue(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'SYNCING' } : item)
    );

    await new Promise(r => setTimeout(r, 600));

    if (currentUser) {
      const target = offlineQueue.find(i => i.id === id);
      if (target) {
        try {
          await setDoc(doc(db, 'offline_sync_audit', target.id), {
            ...target,
            status: 'SYNCED',
            syncedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn('Item sync firestore error:', e);
        }
      }
    }

    setOfflineQueue(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'SYNCED', formattedTime: 'Synced just now' } : item)
    );
    notify(`Record #${id} synchronized to cloud database.`);
  };

  // Remove single queue item
  const removeQueueItem = (id: string) => {
    setOfflineQueue(prev => prev.filter(item => item.id !== id));
    notify(`Removed queue record #${id}.`);
  };

  // Clear offline queue
  const clearOfflineQueue = () => {
    setOfflineQueue([]);
    try {
      localStorage.removeItem('medresq_offline_queue');
    } catch (e) {}
    notify('Local offline sync queue cleared.');
  };

  // Add mock offline record for testing
  const addMockOfflineRecord = () => {
    const scenarios = [
      {
        module: 'voice' as const,
        moduleLabel: 'Voice OPD Entry',
        action: 'DISPENSE_CONSUMPTION',
        entityName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        quantity: 25,
        unit: 'packets',
        payload: {
          transcript: 'Aaj OPD me 25 ORS sachets dispense kiye gaye.',
          doctor: 'Dr. Sharma (MOIC)',
          mode: 'Sub-Centre Tiwari Offline'
        }
      },
      {
        module: 'medicine' as const,
        moduleLabel: 'Clinical Stock Ledger',
        action: 'EMERGENCY_DISPENSE',
        entityName: 'Anti-Snake Venom (ASV) 10ml Vials',
        quantity: 2,
        unit: 'vials',
        payload: {
          caseType: 'Viper Bite Resuscitation',
          ward: 'Emergency Room',
          lotNumber: 'ASV-2026-09'
        }
      },
      {
        module: 'orders' as const,
        moduleLabel: 'Indent Logistics',
        action: 'CREATE_REPLENISHMENT_ORDER',
        entityName: 'Amoxicillin 250mg Dispersible Tablets',
        quantity: 80,
        unit: 'strips',
        payload: {
          priority: 'ROUTINE',
          reason: 'Pediatric respiratory protocol buffer'
        }
      }
    ];

    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    addToOfflineQueue(randomScenario);
  };

  // Google Sign-In with Popup
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      notify(`Welcome, ${result.user.displayName || result.user.email}! Signed in to MEDRESQ AI.`);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      notify('Authentication failed. Please check popup permissions.');
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      notify('Signed out successfully.');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Audio Transcription using gemini-3.5-transcribe
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    setIsTranscribing(true);
    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;

      const mimeType = audioBlob.type || 'audio/webm';

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType })
      });

      if (!res.ok) {
        throw new Error(`Transcription HTTP ${res.status}`);
      }

      const data = await res.json();
      const transcript = data.transcript || '';

      // If user is authenticated, save transcription log to Firestore
      if (currentUser && transcript) {
        try {
          const logId = `voice-${Date.now()}`;
          await setDoc(doc(db, 'voice_logs', logId), {
            id: logId,
            userId: currentUser.uid,
            transcript,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Voice log firestore error:', err);
        }
      }

      notify('Audio successfully transcribed via gemini-3.5-transcribe.');
      return transcript;
    } catch (error) {
      console.error('Audio transcription error:', error);
      notify('Audio transcription error. Please try speaking again.');
      return '';
    } finally {
      setIsTranscribing(false);
    }
  };

  // Maps Grounding using gemini-3.5-flash with googleMaps tool
  const searchNearbyMapsGrounding = async (
    queryText: string,
    latitude: number = 26.7271,
    longitude: number = 72.9946
  ): Promise<{ text: string; places: GoogleMapsPlace[] }> => {
    setIsMapsLoading(true);
    try {
      const res = await fetch('/api/maps/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, latitude, longitude })
      });

      if (!res.ok) {
        throw new Error(`Maps Grounding HTTP ${res.status}`);
      }

      const data = await res.json();
      return {
        text: data.text || 'No location details found.',
        places: Array.isArray(data.places) ? data.places : []
      };
    } catch (error) {
      console.error('Maps Grounding error:', error);
      return {
        text: 'Unable to reach Google Maps Grounding API right now. Showing local PHC network directory.',
        places: []
      };
    } finally {
      setIsMapsLoading(false);
    }
  };

  // Multi-turn Gemini Chatbot
  const sendChatMessage = async (
    content: string,
    persona: string = 'clinical_officer',
    taskComplexity: string = 'general'
  ) => {
    if (!content.trim()) return;

    const userMessage: AIChatMessage = {
      id: `user-${Date.now()}`,
      userId: currentUser?.uid,
      role: 'user',
      content: content.trim(),
      persona,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      // Save user message to Firestore if authenticated
      if (currentUser) {
        try {
          await setDoc(doc(db, 'chat_messages', userMessage.id), {
            id: userMessage.id,
            userId: currentUser.uid,
            role: 'user',
            content: userMessage.content,
            persona,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Chat message firestore error:', err);
        }
      }

      // Format for server API
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        text: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          persona,
          taskComplexity
        })
      });

      if (!res.ok) {
        throw new Error(`Chat HTTP ${res.status}`);
      }

      const data = await res.json();
      const modelMessage: AIChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.reply || 'No response available.',
        modelUsed: data.modelUsed || 'gemini-3.5-flash',
        persona,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, modelMessage]);

      // Save model reply to Firestore if authenticated
      if (currentUser) {
        try {
          await setDoc(doc(db, 'chat_messages', modelMessage.id), {
            id: modelMessage.id,
            userId: currentUser.uid,
            role: 'model',
            content: modelMessage.content,
            modelUsed: modelMessage.modelUsed,
            persona,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Model reply firestore error:', err);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: AIChatMessage = {
        id: `error-${Date.now()}`,
        role: 'model',
        content: 'System notice: Connection to Gemini service timed out. Please check your network or try again.',
        modelUsed: 'system-offline-fallback',
        persona,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChatHistory = () => {
    setChatMessages(INITIAL_CHAT_MESSAGES);
    notify('Chat history cleared.');
  };

  // Medicine consumption
  const consumeMedicine = async (medicineId: string, quantity: number, reason: string) => {
    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/inventory/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicineId,
            phcId: selectedPHC.id,
            quantity,
            reason,
            prescribedBy: role === 'medical_officer' ? 'Dr. Medical Officer' : 'Staff Nurse'
          })
        });
        if (res.ok) {
          const data = await res.json();
          setMedicines(prev => prev.map(m => m.id === medicineId ? data.updatedMedicine : m));
          notify(`Dispensed ${quantity} units. Inventory ledger updated.`);
          return;
        }
      }
    } catch {}

    setMedicines(prev => prev.map(m => {
      if (m.id === medicineId) {
        const nextStock = Math.max(0, m.currentStock - quantity);
        const nextDaily = Math.max(1, Math.round((m.dailyConsumption * 6 + quantity) / 7));
        const nextDays = Number((nextStock / nextDaily).toFixed(1));
        const isCrit = nextStock <= Math.round(m.minStockLevel * 0.55) || nextDays <= 3.5;
        const isWarn = !isCrit && nextStock <= m.minStockLevel;
        const nextRisk: MedicineItem['stockoutRisk'] = isCrit
          ? 'CRITICAL'
          : isWarn
          ? 'WARNING'
          : nextStock > m.minStockLevel * 2.4
          ? 'SURPLUS'
          : 'NORMAL';

        // Proactively fire in-app threshold alert toast when stock falls at or below minStockLevel
        if (nextStock <= m.minStockLevel) {
          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setActiveThresholdToast({
            id: `THRESH-${selectedPHC.code}-${m.id}-${Date.now()}`,
            phcId: selectedPHC.id,
            phcName: selectedPHC.name,
            medicineId: m.id,
            medicineName: m.name,
            category: m.category,
            currentStock: nextStock,
            thresholdLevel: m.minStockLevel,
            unit: m.unit,
            projectedStockoutDays: nextDays,
            severity: isCrit ? 'CRITICAL' : 'WARNING',
            timestamp: `Just now (${nowTime})`,
            read: false
          });
        }

        return {
          ...m,
          currentStock: nextStock,
          dailyConsumption: nextDaily,
          projectedStockoutDays: nextDays,
          stockoutRisk: nextRisk
        };
      }
      return m;
    }));

    if (isOfflineMode) {
      const targetMed = medicines.find(m => m.id === medicineId);
      addToOfflineQueue({
        module: 'medicine',
        moduleLabel: 'Clinical Stock Ledger',
        action: 'DISPENSE_CONSUMPTION',
        entityName: targetMed?.name || `Medicine #${medicineId}`,
        quantity,
        unit: targetMed?.unit || 'units',
        payload: {
          medicineId,
          quantity,
          reason,
          prescribedBy: role === 'medical_officer' ? 'Dr. Medical Officer' : 'Staff Nurse',
          timestamp: new Date().toISOString()
        }
      });
    }

    notify(`Dispensed ${quantity} units (Buffered locally).`);
  };

  // OCR Verification
  const verifyOCRRecord = async (record: { medicineName: string; quantity: number; transaction: string; date: string; batch: string }) => {
    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/inventory/verify-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...record, phcId: selectedPHC.id })
        });
        if (res.ok) {
          notify(`OCR record for '${record.medicineName}' verified and ledger synchronized.`);
          const invRes = await fetch(`/api/inventory?phcId=${encodeURIComponent(selectedPHC.id)}`);
          if (invRes.ok) {
            setMedicines(await invRes.json());
          }
          return;
        }
      }
    } catch {}

    if (isOfflineMode) {
      addToOfflineQueue({
        module: 'records',
        moduleLabel: 'Physical Register OCR',
        action: 'OCR_REGISTER_VERIFY',
        entityName: record.medicineName,
        quantity: record.quantity,
        unit: 'units',
        payload: {
          ...record,
          phcId: selectedPHC.id,
          timestamp: new Date().toISOString()
        }
      });
    }

    notify(`Record for ${record.medicineName} (${record.quantity} units) approved into buffer.`);
  };

  // Create Order with Firestore sync
  const createOrder = async (orderData: {
    medicineName: string;
    quantityRequested: number;
    priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
    justification: string;
  }) => {
    const newOrd: LogisticsOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      phcId: selectedPHC.id,
      phcName: selectedPHC.name,
      medicineName: orderData.medicineName,
      quantityRequested: orderData.quantityRequested,
      source: 'District Drug Warehouse Mandore (RMSCL)',
      destination: `${selectedPHC.name} Store`,
      status: 'APPROVAL PENDING',
      requestDate: new Date().toISOString().split('T')[0],
      estimatedDelivery: '2026-09-25',
      priority: orderData.priority,
      notes: orderData.justification
    };

    // Save to Firestore if user is authenticated
    if (currentUser) {
      try {
        await setDoc(doc(db, 'orders', newOrd.id), {
          ...newOrd,
          createdBy: currentUser.email || currentUser.uid,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Order sync to Firestore buffered in local offline state:', err);
      }
    }

    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...orderData, phcId: selectedPHC.id, phcName: selectedPHC.name })
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(prev => [data.order, ...prev.filter(o => o.id !== data.order.id)]);
          notify(`Replenishment request #${data.order.id} submitted for approval.`);
          return;
        }
      }
    } catch {}

    if (isOfflineMode) {
      addToOfflineQueue({
        module: 'orders',
        moduleLabel: 'Indent Logistics',
        action: 'CREATE_REPLENISHMENT_ORDER',
        entityName: orderData.medicineName,
        quantity: orderData.quantityRequested,
        unit: 'units',
        payload: {
          ...newOrd,
          createdAt: new Date().toISOString()
        }
      });
    }

    setOrders(prev => [newOrd, ...prev]);
    notify(`Replenishment request #${newOrd.id} created.`);
  };

  // Advance Order
  const advanceOrder = async (orderId: string) => {
    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/orders/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
          notify(`Order #${orderId} advanced to status: ${data.order.status}`);

          // Sync to Firestore if user logged in
          if (currentUser) {
            try {
              await setDoc(doc(db, 'orders', orderId), data.order, { merge: true });
            } catch (err) {
              console.warn('Firestore order advance sync error:', err);
            }
          }

          if (data.order.status === 'RECEIVED') {
            const invRes = await fetch(`/api/inventory?phcId=${encodeURIComponent(selectedPHC.id)}`);
            if (invRes.ok) {
              setMedicines(await invRes.json());
            }
          }
          return;
        }
      }
    } catch {}

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

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const nextStatus = flow[o.status];
        return {
          ...o,
          status: nextStatus,
          quantityDispatched: nextStatus === 'DISPATCHED' ? o.quantityRequested : o.quantityDispatched,
          consignmentId: nextStatus === 'DISPATCHED' ? 'RJ-VTS-99120' : o.consignmentId
        };
      }
      return o;
    }));
    notify(`Order #${orderId} status advanced.`);
  };

  const approveRedistribution = async (id: string) => {
    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/redistributions/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
          const data = await res.json();
          setRedistributions(prev => prev.map(r => r.id === id ? data.redistribution : r));
          notify(`Authorized inter-PHC transfer for ${data.redistribution.medicineName} approved. Dispatch initiated.`);
          const invRes = await fetch(`/api/inventory?phcId=${encodeURIComponent(selectedPHC.id)}`);
          if (invRes.ok) {
            setMedicines(await invRes.json());
          }
          return;
        }
      }
    } catch {}

    setRedistributions(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    notify('Inter-facility redistribution proposal approved.');
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/alerts/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
          const data = await res.json();
          setAlerts(prev => prev.map(a => a.id === id ? data.alert : a));
          notify(`Alert #${id} marked as ${data.alert.status}.`);
          return;
        }
      }
    } catch {}

    if (isOfflineMode) {
      const alertItem = alerts.find(a => a.id === id);
      addToOfflineQueue({
        module: 'alerts',
        moduleLabel: 'Alert Resolution',
        action: 'ACKNOWLEDGE_INCIDENT',
        entityName: alertItem?.title || `Alert #${id}`,
        payload: {
          alertId: id,
          newStatus: alerts.find(a => a.id === id)?.status === 'ACTIVE' ? 'ACKNOWLEDGED' : 'RESOLVED',
          timestamp: new Date().toISOString()
        }
      });
    }

    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, status: a.status === 'ACTIVE' ? 'ACKNOWLEDGED' : 'RESOLVED' };
      }
      return a;
    }));
    notify(`Alert status updated.`);
  };

  const toggleConnector = async (id: string, status: 'CONNECTED' | 'NOT CONNECTED' | 'CONFIGURE') => {
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, status, lastSync: 'Just now' } : c));
    notify(`Integration '${id}' status updated to ${status}.`);
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        selectedPHC,
        setSelectedPHC,
        facilities,
        medicines,
        capacity,
        staff,
        workforce,
        weather,
        orders,
        redistributions,
        alerts,
        connectors,
        isOfflineMode,
        toggleOfflineMode,
        activeModule,
        setActiveModule,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        toggleMobileSidebar,

        // Auth
        currentUser,
        isAuthLoading,
        signInWithGoogle,
        signOutUser,

        // Chat
        chatMessages,
        isChatLoading,
        sendChatMessage,
        clearChatHistory,

        // Audio
        transcribeAudio,
        isTranscribing,

        // Maps Grounding
        searchNearbyMapsGrounding,
        isMapsLoading,

        // Actions
        consumeMedicine,
        verifyOCRRecord,
        createOrder,
        advanceOrder,
        approveRedistribution,
        acknowledgeAlert,
        toggleConnector,
        notificationMessage,
        clearNotification,
        showNotification: notify,

        // Local Storage Offline Queue
        offlineQueue,
        isQueueSyncing,
        addToOfflineQueue,
        syncOfflineQueue,
        syncQueueItem,
        removeQueueItem,
        clearOfflineQueue,
        addMockOfflineRecord,

        // Global Prediction Engine Modal
        isPredictionEngineOpen,
        setIsPredictionEngineOpen,
        openPredictionEngine,

        // Proactive Critical Stock Threshold Notification System
        proactiveStockAlerts,
        activeThresholdToast,
        dismissThresholdToast,
        markProactiveAlertRead,
        dismissAllProactiveAlerts,
        updateMedicineThreshold,
        simulateThresholdBreach
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
