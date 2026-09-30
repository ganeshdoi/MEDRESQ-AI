import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  ProactiveStockAlert,
  SupplyChainAuditEntry,
  StatusTransitionRecord,
  StaffAttendanceRecord,
  AttendanceStatus
} from '../types.ts';
import {
  SupportedLanguageCode,
  TranslationDictionary,
  getSavedLanguage,
  saveLanguagePreference,
  getTranslation
} from '../i18n/index.ts';
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
  getFacilityStaffDirectory,
  getInitialAttendanceRecordsForPHC
} from '../data/mockData.ts';
import { generateEssentialMedicinesForPHC } from '../data/nationalEssentialMedicines.ts';
import { buildDefaultFacilityInventoryMap } from '../data/networkData.ts';
import { resolveMedicineMatch } from '../utils/medicineMatcher.ts';
import {
  getVoiceBcp47Locale,
  type RegisterVoiceBcp47Locale
} from '../utils/registerVoiceCommandParser.ts';
import {
  applyFefoStockAdjustment,
  evaluateMedicineThresholdAndReplenishment
} from '../utils/inventoryForecast.ts';
import { buildRegionalWeatherPreparedness } from '../utils/regionalDemandProfile.ts';
import {
  AuthenticatedInchargeSession,
  loadSavedInchargeSession,
  saveInchargeSession
} from '../utils/phcAuthDirectory.ts';
import {
  executeWithExponentialBackoff,
  TransientSyncError,
  calculateExponentialBackoffDelay,
  isTransientNetworkError
} from '../utils/retryBackoff.ts';
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
  setSelectedPHC: (phc: PHCFacility, bypassPassword?: boolean) => void;
  facilities: PHCFacility[];
  medicines: MedicineItem[];
  facilityInventories: Record<string, MedicineItem[]>;
  updateFacilityMedicineStock: (
    phcId: string,
    medicineIdOrName: string,
    updates: {
      currentStock?: number;
      stock?: number;
      minStockLevel?: number;
      minThreshold?: number;
      maxThreshold?: number;
    }
  ) => void;
  capacity: CapacityRecord;
  staff: StaffMember[];
  attendanceRecords: StaffAttendanceRecord[];
  markStaffAttendance: (staffId: string, status: AttendanceStatus, dateStr?: string) => Promise<boolean>;
  saveBatchAttendance: (
    entries: Array<{ staffId: string; status: AttendanceStatus }>,
    dateStr?: string
  ) => Promise<boolean>;
  workforce: WorkforceSummary;
  language: SupportedLanguageCode;
  setLanguage: (lang: SupportedLanguageCode) => void;
  t: TranslationDictionary;
  weather: WeatherPreparedness;
  orders: LogisticsOrder[];
  redistributions: RedistributionOpportunity[];
  supplyChainAuditLog: SupplyChainAuditEntry[];
  alerts: OperationalAlert[];
  connectors: IntegrationConnector[];
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

  // Firebase Auth & PHC-Specific Incharge Password Auth
  currentUser: User | null;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  inchargeSession: AuthenticatedInchargeSession | null;
  isAuthModalOpen: boolean;
  authModalTab: 'demo' | 'officer' | 'signin' | 'signup' | 'directory';
  pendingPHCToUnlock: PHCFacility | null;
  pendingActionLabel: string | null;
  openAuthModal: (
    tab?: 'demo' | 'officer' | 'signin' | 'signup' | 'directory',
    targetPHC?: PHCFacility | null
  ) => void;
  closeAuthModal: () => void;
  authenticatePHCIncharge: (session: AuthenticatedInchargeSession, chosenPHC: PHCFacility) => void;
  signOutIncharge: () => void;
  requireAuthorizedAccess: (action: () => void | Promise<any>, actionLabel?: string) => boolean;

  // AI & Chat
  chatMessages: AIChatMessage[];
  isChatLoading: boolean;
  sendChatMessage: (content: string, persona?: string, taskComplexity?: string) => Promise<void>;
  clearChatHistory: () => void;

  // Audio Transcription with language-aware Gemini Audio ASR (en-IN, hi-IN, ta-IN, te-IN)
  transcribeAudio: (
    audioBlob: Blob,
    language?: RegisterVoiceBcp47Locale | string,
    browserTranscript?: string
  ) => Promise<string>;
  isTranscribing: boolean;

  // Maps Grounding with gemini-3.8-flash
  searchNearbyMapsGrounding: (query: string, latitude?: number, longitude?: number) => Promise<{ text: string; places: GoogleMapsPlace[] }>;
  isMapsLoading: boolean;

  // Operational Actions
  consumeMedicine: (medicineId: string, quantity: number, reason: string) => Promise<boolean>;
  verifyOCRRecord: (record: {
    medicineId?: string;
    medicineName: string;
    quantity: number;
    transaction: string;
    date: string;
    batch: string;
  }) => Promise<{ ok: boolean; matchedMedicineId?: string; matchedMedicineName?: string; error?: string }>;
  registerPHCData: (payload: {
    medicineName?: string;
    medicineId?: string;
    quantity?: number;
    transaction?: string;
    batch?: string;
    opdFootfall?: number;
    occupiedBeds?: number;
    emergencyFootfall?: number;
    admissions?: number;
    notes?: string;
  }) => Promise<boolean>;
  createOrder: (order: {
    medicineName: string;
    quantityRequested: number;
    priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
    justification: string;
    confirmedByUser?: boolean;
  }) => Promise<boolean>;
  openBulkRestockPreview: (customItems?: Array<{
    medicineName: string;
    quantityRequested: number;
    unit?: string;
    priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
    justification: string;
  }>) => void;
  advanceOrder: (orderId: string) => Promise<boolean>;
  approveRedistribution: (
    id: string,
    customTransfer?: {
      medicineName: string;
      transferQuantity: number;
      sourcePHCId: string;
      sourcePHCName: string;
      targetPHCId: string;
      targetPHCName: string;
      transitDistanceKm?: number;
      estimatedTransitTimeHours?: number;
      clinicalRationale?: string;
    },
    confirmedByUser?: boolean
  ) => Promise<boolean>;
  rejectRedistribution: (id: string, reason?: string) => Promise<boolean>;
  advanceRedistribution: (id: string) => Promise<boolean>;
  refreshServerState: (authoritativePayload?: {
    medicines?: MedicineItem[];
    updatedInventory?: MedicineItem[];
    orders?: LogisticsOrder[];
    allOrders?: LogisticsOrder[];
    redistributions?: RedistributionOpportunity[];
    allRedistributions?: RedistributionOpportunity[];
    capacity?: CapacityRecord;
    updatedCapacity?: CapacityRecord;
  }) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  toggleConnector: (id: string, status: 'CONNECTED' | 'NOT CONNECTED' | 'CONFIGURE') => Promise<void>;
  notificationMessage: string | null;
  clearNotification: () => void;
  showNotification: (msg: string) => void;

  // Local Storage Offline Queue
  offlineQueue: OfflineQueueItem[];
  isQueueSyncing: boolean;
  queueSyncProgress: number;
  queueSyncSyncedCount: number;
  queueSyncTotalCount: number;
  queueSyncCurrentRecord: string | null;
  queueRetryState: {
    itemId: string;
    entityName: string;
    attempt: number;
    maxRetries: number;
    nextDelayMs: number;
    errorMessage: string;
  } | null;
  isSyncCompleteBannerVisible: boolean;
  dismissSyncCompleteBanner: () => void;
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
    modelUsed: 'gemini-3.8-flash',
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
  const [selectedPHC, setSelectedPHCState] = useState<PHCFacility>(() => {
    const saved = loadSavedInchargeSession();
    if (saved) {
      const boundId = saved.assignedPhcId || saved.phcId;
      const found = FACILITIES.find((f) => f.id === boundId);
      if (found) return found;
    }
    return FACILITIES[0];
  });
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
  const [queueSyncProgress, setQueueSyncProgress] = useState<number>(0);
  const [queueSyncSyncedCount, setQueueSyncSyncedCount] = useState<number>(0);
  const [queueSyncTotalCount, setQueueSyncTotalCount] = useState<number>(0);
  const [queueSyncCurrentRecord, setQueueSyncCurrentRecord] = useState<string | null>(null);
  const [queueRetryState, setQueueRetryState] = useState<{
    itemId: string;
    entityName: string;
    attempt: number;
    maxRetries: number;
    nextDelayMs: number;
    errorMessage: string;
  } | null>(null);
  const [queueBackoffCycle, setQueueBackoffCycle] = useState<number>(0);
  const [isSyncCompleteBannerVisible, setIsSyncCompleteBannerVisible] = useState<boolean>(false);

  const dismissSyncCompleteBanner = () => setIsSyncCompleteBannerVisible(false);

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
  const [facilityInventories, setFacilityInventories] = useState<Record<string, MedicineItem[]>>(() =>
    buildDefaultFacilityInventoryMap(FACILITIES[0].id, INITIAL_MEDICINES)
  );
  const [capacity, setCapacity] = useState<CapacityRecord>(INITIAL_CAPACITY);

  // Keep facilityInventories synchronized with active selectedPHC medicines
  useEffect(() => {
    setFacilityInventories((prev) => ({
      ...prev,
      [selectedPHC.id]: medicines,
      [selectedPHC.code]: medicines
    }));
  }, [medicines, selectedPHC.id, selectedPHC.code]);

  const updateFacilityMedicineStock = (
    phcId: string,
    medicineIdOrName: string,
    updates: {
      currentStock?: number;
      stock?: number;
      minStockLevel?: number;
      minThreshold?: number;
      maxThreshold?: number;
    }
  ) => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        updateFacilityMedicineStock(phcId, medicineIdOrName, updates);
      };
      setPendingActionLabel(`Modify medicine stock or threshold (${medicineIdOrName})`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    const applyUpdateToList = (list: MedicineItem[]): MedicineItem[] => {
      const match = resolveMedicineMatch(list, medicineIdOrName, medicineIdOrName);
      const targetId = match.status === 'MATCHED' ? match.medicine.id : medicineIdOrName;
      return list.map((m) => {
        if (m.id !== targetId && m.name.toLowerCase() !== medicineIdOrName.toLowerCase()) {
          return m;
        }
        const rawStock = updates.currentStock ?? updates.stock;
        const nextStock =
          rawStock !== undefined
            ? Math.max(0, Math.floor(Number(rawStock)))
            : m.currentStock;
        const rawMin = updates.minStockLevel ?? updates.minThreshold;
        const nextMin =
          rawMin !== undefined
            ? Math.max(1, Math.round(Number(rawMin)))
            : m.minStockLevel;
        const nextMax =
          updates.maxThreshold !== undefined
            ? Math.max(nextMin + 1, Math.round(Number(updates.maxThreshold)))
            : m.maxThreshold;
        const nextBatches =
          Array.isArray(m.batches) && m.batches.length > 0
            ? m.batches.map((b, idx) =>
                idx === 0
                  ? {
                      ...b,
                      quantity: Math.max(
                        0,
                        nextStock -
                          m.batches!
                            .slice(1)
                            .reduce((sum, other) => sum + (other.quantity || 0), 0)
                      )
                    }
                  : b
              )
            : m.batches;

        const candidateMed: MedicineItem = {
          ...m,
          stock: nextStock,
          currentStock: nextStock,
          minThreshold: nextMin,
          minStockLevel: nextMin,
          maxThreshold: nextMax,
          batches: nextBatches
        };
        const sharedEval = evaluateMedicineThresholdAndReplenishment(candidateMed);

        return {
          ...candidateMed,
          projectedStockoutDays: sharedEval.usableDaysOfCover,
          stockoutRisk: sharedEval.riskLevel
        };
      });
    };

    if (phcId === selectedPHC.id || phcId === selectedPHC.code) {
      setMedicines((prev) => applyUpdateToList(prev));
    } else {
      setFacilityInventories((prev) => {
        const existingList = prev[phcId];
        if (!existingList) return prev;
        const updatedList = applyUpdateToList(existingList);
        const facObj = FACILITIES.find((f) => f.id === phcId || f.code === phcId);
        const nextMap = { ...prev, [phcId]: updatedList };
        if (facObj) {
          nextMap[facObj.id] = updatedList;
          nextMap[facObj.code] = updatedList;
        }
        return nextMap;
      });
    }
  };

  const [inchargeSession, setInchargeSession] = useState<AuthenticatedInchargeSession | null>(() =>
    loadSavedInchargeSession()
  );
  const inchargeSessionRef = useRef<AuthenticatedInchargeSession | null>(inchargeSession);
  inchargeSessionRef.current = inchargeSession;

  const pendingProtectedActionRef = useRef<(() => void | Promise<any>) | null>(null);
  const [pendingActionLabel, setPendingActionLabel] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<
    'demo' | 'officer' | 'signin' | 'signup' | 'directory'
  >('signin');
  const [pendingPHCToUnlock, setPendingPHCToUnlock] = useState<PHCFacility | null>(null);

  const requireAuthorizedAccess = (
    action: () => void | Promise<any>,
    actionLabel: string = 'Modify supply-chain data'
  ): boolean => {
    if (inchargeSessionRef.current) {
      void action();
      return true;
    }
    pendingProtectedActionRef.current = action;
    setPendingActionLabel(actionLabel);
    setAuthModalTab('signin');
    setIsAuthModalOpen(true);
    return false;
  };

  const applySelectedPHCInternal = (phc: PHCFacility) => {
    setSelectedPHCState(phc);
    const existingMeds = facilityInventories[phc.id];
    const nextMeds =
      existingMeds && existingMeds.length > 0
        ? existingMeds
        : generateEssentialMedicinesForPHC(phc.id, `${phc.district} District Drug Warehouse`);
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
    setWeather(buildRegionalWeatherPreparedness(phc));
    if (!isOfflineMode) {
      fetch(`/api/inventory?phcId=${encodeURIComponent(phc.id)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setMedicines(data);
          }
        })
        .catch(() => {});
    }
  };

  const setSelectedPHC = (phc: PHCFacility, _bypassPassword?: boolean) => {
    if (inchargeSession) {
      const boundPhcId = inchargeSession.assignedPhcId || inchargeSession.phcId;
      if (phc.id !== boundPhcId) {
        notify(
          `Facility Access Restricted: Officer ${inchargeSession.officerId} is strictly bound to ${
            inchargeSession.assignedPhcName || inchargeSession.phcName
          }. Sign out to authenticate into another PHC.`
        );
        return;
      }
    }
    applySelectedPHCInternal(phc);
  };

  const openAuthModal = (
    tab: 'demo' | 'officer' | 'signin' | 'signup' | 'directory' = 'signin',
    targetPHC: PHCFacility | null = null
  ) => {
    setAuthModalTab(tab);
    setPendingPHCToUnlock(targetPHC);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPendingPHCToUnlock(null);
    pendingProtectedActionRef.current = null;
    setPendingActionLabel(null);
  };

  const authenticatePHCIncharge = (
    session: AuthenticatedInchargeSession,
    chosenPHC: PHCFacility
  ) => {
    const boundSession: AuthenticatedInchargeSession = {
      ...session,
      assignedPhcId: chosenPHC.id,
      assignedPhcName: chosenPHC.name,
      phcId: chosenPHC.id,
      phcName: chosenPHC.name,
      unlockedPhcIds: [chosenPHC.id],
      authenticationStatus: 'AUTHENTICATED'
    };
    inchargeSessionRef.current = boundSession;
    setInchargeSession(boundSession);
    saveInchargeSession(boundSession, boundSession.rememberDevice);
    setRole(boundSession.role);
    if (chosenPHC.id !== selectedPHC.id) {
      applySelectedPHCInternal(chosenPHC);
    }
    setIsAuthModalOpen(false);
    setPendingPHCToUnlock(null);
    const queuedAction = pendingProtectedActionRef.current;
    pendingProtectedActionRef.current = null;
    setPendingActionLabel(null);
    if (queuedAction) {
      setTimeout(() => {
        void queuedAction();
      }, 20);
    }
  };

  const signOutIncharge = () => {
    const token = inchargeSession?.sessionToken;
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionToken: token })
      }).catch(() => {});
    }
    inchargeSessionRef.current = null;
    setInchargeSession(null);
    saveInchargeSession(null);
    setIsAuthModalOpen(false);
    setPendingPHCToUnlock(null);
    pendingProtectedActionRef.current = null;
    setPendingActionLabel(null);
  };

  // Sync initial bound PHC inventory/capacity/weather if a remembered session was restored on startup
  useEffect(() => {
    if (inchargeSession) {
      const boundId = inchargeSession.assignedPhcId || inchargeSession.phcId;
      const boundPHC = facilities.find((f) => f.id === boundId);
      if (boundPHC) {
        applySelectedPHCInternal(boundPHC);
      }
    }
  }, []);

  // Centralized Multilingual (i18n) State: en, hi, ta, te
  const [language, setLanguageState] = useState<SupportedLanguageCode>(() => getSavedLanguage());
  const setLanguage = (lang: SupportedLanguageCode) => {
    setLanguageState(lang);
    saveLanguagePreference(lang);
  };
  const t = getTranslation(language);

  const todayIsoDate = new Date().toISOString().split('T')[0];

  // Facility-scoped Staff Directory & Attendance Records
  const [staffByPhc, setStaffByPhc] = useState<Record<string, StaffMember[]>>(() => ({
    'phc-osian': getFacilityStaffDirectory(FACILITIES[0])
  }));

  const [attendanceByPhc, setAttendanceByPhc] = useState<Record<string, StaffAttendanceRecord[]>>(() => {
    const initialMap: Record<string, StaffAttendanceRecord[]> = {};
    try {
      const saved = localStorage.getItem('medresq_attendance_records_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.assign(initialMap, parsed);
        }
      }
    } catch {}
    if (!initialMap['phc-osian'] || initialMap['phc-osian'].length === 0) {
      initialMap['phc-osian'] = getInitialAttendanceRecordsForPHC(FACILITIES[0], todayIsoDate);
    }
    return initialMap;
  });

  useEffect(() => {
    try {
      localStorage.setItem('medresq_attendance_records_v1', JSON.stringify(attendanceByPhc));
    } catch {}
  }, [attendanceByPhc]);

  const activeAttendancePhc = inchargeSession
    ? facilities.find((f) => f.id === (inchargeSession.assignedPhcId || inchargeSession.phcId)) || selectedPHC
    : selectedPHC;

  // Ensure staff directory and initial attendance records exist for the active PHC and sync from server when online
  useEffect(() => {
    const phc = activeAttendancePhc;
    setStaffByPhc((prev) => {
      if (prev[phc.id] && prev[phc.id].length > 0) return prev;
      return { ...prev, [phc.id]: getFacilityStaffDirectory(phc) };
    });
    setAttendanceByPhc((prev) => {
      if (prev[phc.id] && prev[phc.id].length > 0) return prev;
      return { ...prev, [phc.id]: getInitialAttendanceRecordsForPHC(phc, todayIsoDate) };
    });

    if (!isOfflineMode) {
      const headers: Record<string, string> = {};
      if (inchargeSession?.sessionToken) {
        headers.Authorization = `Bearer ${inchargeSession.sessionToken}`;
      }
      fetch(`/api/attendance?phcId=${encodeURIComponent(phc.id)}&date=${encodeURIComponent(todayIsoDate)}`, {
        headers
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.ok && Array.isArray(data.staff) && data.staff.length > 0) {
            setStaffByPhc((prev) => ({ ...prev, [phc.id]: data.staff }));
          }
          if (data?.ok && Array.isArray(data.records) && data.records.length > 0) {
            setAttendanceByPhc((prev) => {
              const existingLocal = prev[phc.id] || [];
              // Preserve any local QUEUED / recently saved records while merging server records
              const merged = [...existingLocal];
              for (const srvRec of data.records as StaffAttendanceRecord[]) {
                const idx = merged.findIndex(
                  (r) => r.staffId === srvRec.staffId && r.phcId === srvRec.phcId && r.date === srvRec.date
                );
                if (idx === -1) {
                  merged.push(srvRec);
                }
              }
              return { ...prev, [phc.id]: merged };
            });
          }
        })
        .catch(() => {});
    }
  }, [activeAttendancePhc.id, inchargeSession?.sessionToken, isOfflineMode, todayIsoDate]);

  const currentPhcStaffBase = staffByPhc[activeAttendancePhc.id] || getFacilityStaffDirectory(activeAttendancePhc);
  const attendanceRecords =
    attendanceByPhc[activeAttendancePhc.id] || getInitialAttendanceRecordsForPHC(activeAttendancePhc, todayIsoDate);

  // Derive current staff list with today's latest attendance status reflected
  const staff: StaffMember[] = currentPhcStaffBase.map((member) => {
    const todayRec = attendanceRecords.find(
      (r) => r.staffId === member.id && r.phcId === activeAttendancePhc.id && r.date === todayIsoDate
    );
    const effectiveStatus: AttendanceStatus = todayRec
      ? todayRec.status
      : member.status === 'PRESENT' || member.status === 'FIELD_DUTY'
      ? 'PRESENT'
      : member.status === 'ABSENT'
      ? 'ABSENT'
      : member.status === 'ON_LEAVE'
      ? 'ON_LEAVE'
      : 'NOT_MARKED';

    return {
      ...member,
      status: effectiveStatus,
      attendanceStatus:
        effectiveStatus === 'PRESENT'
          ? 'Present'
          : effectiveStatus === 'ABSENT'
          ? 'Absent'
          : effectiveStatus === 'ON_LEAVE'
          ? 'On Leave'
          : 'Not Marked',
      lastAttendanceUpdate: todayRec?.markedAt || member.lastAttendanceUpdate,
      lastMarkedBy: todayRec?.markedBy || member.lastMarkedBy
    };
  });

  const presentTodayCount = staff.filter((s) => s.status === 'PRESENT').length;
  const onLeaveTodayCount = staff.filter((s) => s.status === 'ON_LEAVE').length;
  const workforce: WorkforceSummary = {
    ...INITIAL_WORKFORCE_SUMMARY,
    phcId: activeAttendancePhc.id,
    totalStaffSanctioned: staff.length,
    staffPresentToday: presentTodayCount,
    staffOnLeave: onLeaveTodayCount,
    staffOnFieldDuty: Math.min(2, presentTodayCount)
  };
  const [weather, setWeather] = useState<WeatherPreparedness>(() =>
    buildRegionalWeatherPreparedness(FACILITIES[0])
  );
  const [orders, setOrders] = useState<LogisticsOrder[]>(INITIAL_ORDERS);
  const [redistributions, setRedistributions] = useState<RedistributionOpportunity[]>(() => {
    try {
      const saved = localStorage.getItem('medresq_redistributions_state_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_REDISTRIBUTION;
  });
  const [alerts, setAlerts] = useState<OperationalAlert[]>(INITIAL_ALERTS);
  const [supplyChainAuditLog, setSupplyChainAuditLog] = useState<SupplyChainAuditEntry[]>(() => {
    try {
      const saved = localStorage.getItem('medresq_supply_chain_audit_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('medresq_redistributions_state_v1', JSON.stringify(redistributions));
    } catch {}
  }, [redistributions]);

  useEffect(() => {
    try {
      localStorage.setItem('medresq_supply_chain_audit_v1', JSON.stringify(supplyChainAuditLog));
    } catch {}
  }, [supplyChainAuditLog]);
  const [connectors, setConnectors] = useState<IntegrationConnector[]>(INTEGRATION_CONNECTORS);
  const [proactiveStockAlerts, setProactiveStockAlerts] = useState<ProactiveStockAlert[]>([]);
  const [activeThresholdToast, setActiveThresholdToast] = useState<ProactiveStockAlert | null>(null);

  const dismissThresholdToast = () => setActiveThresholdToast(null);

  // Evaluate medicine stock levels against unified facility threshold & lead-time rules
  useEffect(() => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const evaluations = medicines.map((m) => ({
      med: m,
      evalRes: evaluateMedicineThresholdAndReplenishment(m)
    }));
    const breachedPairs = evaluations.filter(({ evalRes }) => evalRes.isThresholdBreached);

    setProactiveStockAlerts((prev) => {
      const nextAlerts: ProactiveStockAlert[] = breachedPairs.map(({ med, evalRes }) => {
        const existing = prev.find((p) => p.medicineId === med.id && p.phcId === selectedPHC.id);
        const isCritical = evalRes.riskLevel === 'CRITICAL';

        return {
          id: existing?.id || `THRESH-${selectedPHC.code}-${med.id}`,
          phcId: selectedPHC.id,
          phcName: selectedPHC.name,
          medicineId: med.id,
          medicineName: med.name,
          category: med.category,
          currentStock: evalRes.usableStock,
          thresholdLevel: evalRes.minThreshold,
          unit: med.unit,
          projectedStockoutDays: evalRes.usableDaysOfCover,
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          timestamp: existing?.timestamp || `Today, ${nowTime}`,
          read: existing ? existing.read : false,
          autoIndentTriggered: existing?.autoIndentTriggered || evalRes.pendingOrders > 0
        };
      });

      // Sort CRITICAL first, then lowest stock-to-threshold ratio
      return nextAlerts.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'CRITICAL' ? -1 : 1;
        return a.currentStock / Math.max(1, a.thresholdLevel) - b.currentStock / Math.max(1, b.thresholdLevel);
      });
    });

    // Synchronize threshold breaches into the main OperationalAlert list so AlertCentre shows them without duplicates
    setAlerts((prev) => {
      const safePrev = prev.filter((a): a is OperationalAlert => Boolean(a && a.id));
      const nonThresholdAlerts = safePrev.filter(
        (a) =>
          !a.id.startsWith('ALT-THRESH-') &&
          a.id !== 'ALT-101' &&
          (!a.phcId || a.phcId === selectedPHC.id)
      );
      const generatedOperationalAlerts: OperationalAlert[] = breachedPairs.map(({ med, evalRes }) => {
        const alertId = `ALT-THRESH-${med.id}`;
        const existingOp = safePrev.find((a) => a.id === alertId);
        const isCritical = evalRes.riskLevel === 'CRITICAL';

        const pipelineBadge =
          evalRes.pendingOrders > 0
            ? ` [In Pipeline: +${evalRes.pendingOrders.toLocaleString()} ${med.unit}${
                evalRes.isCoveredByPendingOrder ? ' · Replenishment Covered' : ''
              }]`
            : '';

        return {
          id: alertId,
          phcId: selectedPHC.id,
          phcName: selectedPHC.name,
          facilityName: selectedPHC.name,
          category: isCritical ? 'CRITICAL' : 'WARNING',
          title: `${evalRes.breachRuleTitle}: ${med.name} (${evalRes.usableStock.toLocaleString()} / ${evalRes.minThreshold.toLocaleString()} ${med.unit})${pipelineBadge}`,
          description: `${evalRes.breachExplanation} ${evalRes.replenishmentFormulaSummary}.`,
          iconType: 'pill',
          timestamp: existingOp?.timestamp || `Today, ${nowTime}`,
          status:
            existingOp?.status === 'RESOLVED'
              ? 'RESOLVED'
              : evalRes.isCoveredByPendingOrder || existingOp?.status === 'ACKNOWLEDGED'
              ? 'ACKNOWLEDGED'
              : 'ACTIVE',
          medicineId: med.id,
          currentStock: evalRes.usableStock,
          thresholdLevel: evalRes.minThreshold,
          unit: med.unit,
          whyItMatters: `Maintaining at least ${evalRes.minThreshold.toLocaleString()} ${med.unit} (Critical 50% Floor: ${evalRes.criticalStockFloor.toLocaleString()} ${med.unit}; Dynamic ROP: ${evalRes.reorderPoint.toLocaleString()} ${med.unit}) prevents clinical stockout during the ${evalRes.leadTimeDays}-day RMSCL warehouse transit window.`,
          suggestedAction:
            evalRes.suggestedOrderQty > 0
              ? `Dispatch ${evalRes.recommendedPriority.replace('_', ' ')} indent for +${evalRes.suggestedOrderQty.toLocaleString()} ${med.unit} to restore ${evalRes.replenishmentCycleDays}-day cycle target (${evalRes.targetCycleStock.toLocaleString()} ${med.unit}).`
              : `Active pipeline indent (+${evalRes.pendingOrders.toLocaleString()} ${med.unit}) covers target cycle stock (${evalRes.targetCycleStock.toLocaleString()} ${med.unit}). Optional supplemental order: +${evalRes.supplementalOrderQty.toLocaleString()} ${med.unit}.`
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
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        updateMedicineThreshold(medicineId, newMinThreshold);
      };
      setPendingActionLabel(`Update medicine minimum safety threshold (${newMinThreshold} units)`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    const cleanThreshold = Math.max(1, Math.round(Number(newMinThreshold) || 1));
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id !== medicineId) return med;
        const nextMax = Math.max(cleanThreshold * 2, med.maxStockLevel || cleanThreshold * 4);
        const candidateMed: MedicineItem = {
          ...med,
          minStockLevel: cleanThreshold,
          minThreshold: cleanThreshold,
          maxStockLevel: nextMax,
          maxThreshold: nextMax
        };
        const evalRes = evaluateMedicineThresholdAndReplenishment(candidateMed);

        if (evalRes.isThresholdBreached) {
          const toastAlert: ProactiveStockAlert = {
            id: `THRESH-${selectedPHC.code}-${med.id}-${Date.now()}`,
            phcId: selectedPHC.id,
            phcName: selectedPHC.name,
            medicineId: med.id,
            medicineName: med.name,
            category: med.category,
            currentStock: evalRes.usableStock,
            thresholdLevel: cleanThreshold,
            unit: med.unit,
            projectedStockoutDays: evalRes.usableDaysOfCover,
            severity: evalRes.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
            timestamp: `Just now (${nowTime})`,
            read: false,
            autoIndentTriggered: evalRes.pendingOrders > 0
          };
          setActiveThresholdToast(toastAlert);
        } else if (activeThresholdToast?.medicineId === med.id) {
          setActiveThresholdToast(null);
        }

        return {
          ...candidateMed,
          projectedStockoutDays: evalRes.usableDaysOfCover,
          stockoutRisk: evalRes.riskLevel
        };
      })
    );

    if (!isOfflineMode) {
      fetch('/api/inventory/threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId,
          minStockLevel: cleanThreshold,
          phcId: selectedPHC.id
        })
      }).catch(() => {});
    }

    const target = medicines.find((m) => m.id === medicineId);
    if (target) {
      notify(
        `Updated safety threshold for ${target.name} to ${cleanThreshold.toLocaleString()} ${target.unit} (Critical 50% Floor: ${Math.max(1, Math.round(cleanThreshold * 0.5)).toLocaleString()} ${target.unit}).`
      );
    }
  };

  const simulateThresholdBreach = (medicineId?: string) => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        simulateThresholdBreach(medicineId);
      };
      setPendingActionLabel('Modify stock level (Simulate threshold breach)');
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
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
        // Retrieve Firebase ID Token in memory and sync user with Cloud SQL backend
        try {
          const idToken = await user.getIdToken();
          await fetch('/api/users/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              officerId: inchargeSession?.officerId,
              officerName: inchargeSession?.officerName || user.displayName || 'PHC Staff Member',
              designation: inchargeSession?.designation || 'Medical Officer In-Charge',
              assignedPhcId: selectedPHC.id,
              assignedPhcName: selectedPHC.name,
              role,
            }),
          });
        } catch (err) {
          console.warn('Cloud SQL user profile sync deferred:', err);
        }

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
  }, [role, selectedPHC.id, selectedPHC.name, inchargeSession?.officerId, inchargeSession?.officerName, inchargeSession?.designation]);

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

  // Initial backend API bootstrap fetch
  useEffect(() => {
    fetch(`/api/state?phcId=${encodeURIComponent(selectedPHC.id)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.medicines) && data.medicines.length > 0) {
          setMedicines(data.medicines);
        }
        if (Array.isArray(data?.orders)) {
          setOrders(data.orders);
        }
        if (Array.isArray(data?.redistributions)) {
          setRedistributions(data.redistributions);
        }
        if (Array.isArray(data?.supplyChainAuditLog) && data.supplyChainAuditLog.length > 0) {
          setSupplyChainAuditLog(data.supplyChainAuditLog);
        }
        if (data?.capacity && typeof data.capacity.totalBeds === 'number') {
          setCapacity(data.capacity);
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
    if (next) {
      setIsSyncCompleteBannerVisible(false);
      notify('Switched to Low-Bandwidth Offline Sync Mode. Changes will be buffered locally.');
    } else {
      const pendingCount = offlineQueue.filter(item => item.status !== 'SYNCED').length;
      if (pendingCount > 0) {
        notify(`Connection restored to Online. Uploading ${pendingCount} pending record(s) to Firestore...`);
        void syncOfflineQueue();
      } else {
        notify('Switched to Online Real-time Sync Mode.');
      }
    }
  };

  // Listen for browser online/offline network events to automatically sync pending records when connection returns to online
  useEffect(() => {
    const handleBrowserOnline = () => {
      if (isOfflineMode) {
        setIsOfflineMode(false);
      }
      const pendingCount = offlineQueue.filter(item => item.status !== 'SYNCED').length;
      if (pendingCount > 0 && !isQueueSyncing) {
        void syncOfflineQueue();
      }
    };
    const handleBrowserOffline = () => {
      if (!isOfflineMode) {
        setIsOfflineMode(true);
        notify('Browser network connection lost. Switched to Offline Rural Mode.');
      }
    };
    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);
    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, [isOfflineMode, offlineQueue, isQueueSyncing]);

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

  // Replay a single offline queue item to the backend server (throws TransientSyncError on transient HTTP/network errors)
  const replayOfflineItemToServer = async (item: OfflineQueueItem): Promise<boolean> => {
    const targetPhcId = item.facilityId || selectedPHC.id;

    const assertServerResponse = async (res: Response, endpointLabel: string) => {
      if (res.ok) return;
      const isTransientStatus =
        res.status === 408 || res.status === 429 || (res.status >= 500 && res.status <= 599);
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        if (errBody?.error) detail = `${detail}: ${errBody.error}`;
      } catch {}
      throw new TransientSyncError(
        `${endpointLabel} failed (${detail})`,
        res.status,
        isTransientStatus
      );
    };

    if (item.action === 'DISPENSE_CONSUMPTION' || item.action === 'EMERGENCY_DISPENSE') {
      const facMeds = facilityInventories[targetPhcId] || medicines;
      const match = resolveMedicineMatch(facMeds, item.entityName, item.payload?.medicineId);
      const resolvedMedId = match.status === 'MATCHED' ? match.medicine.id : item.payload?.medicineId;
      const qty = Number(item.quantity ?? item.payload?.quantity ?? 10);
      if (resolvedMedId && qty > 0) {
        const res = await fetch('/api/inventory/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicineId: resolvedMedId,
            phcId: targetPhcId,
            quantity: qty,
            reason: item.payload?.reason || item.payload?.caseType || 'Offline Queue Sync',
            prescribedBy: item.payload?.prescribedBy || item.payload?.doctor || 'PHC Staff'
          })
        });
        await assertServerResponse(res, 'Inventory consume sync');
      }
    } else if (item.action === 'OCR_REGISTER_VERIFY') {
      const qty = Number(item.quantity ?? item.payload?.quantity ?? 10);
      const res = await fetch('/api/inventory/verify-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: item.payload?.medicineId,
          medicineName: item.entityName,
          quantity: qty,
          transaction: item.payload?.transaction || 'Dispensed (OPD)',
          date: item.payload?.date || '2026-09-22',
          batch: item.payload?.batch || '',
          phcId: targetPhcId
        })
      });
      await assertServerResponse(res, 'OCR register verify sync');
    } else if (item.action === 'CREATE_REPLENISHMENT_ORDER') {
      const qty = Number(item.quantity ?? item.payload?.quantityRequested ?? 100);
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineName: item.entityName,
          quantityRequested: qty,
          priority: item.payload?.priority || 'ROUTINE',
          justification: item.payload?.justification || item.payload?.reason || 'Synced from offline queue',
          phcId: targetPhcId,
          phcName: item.facilityName || selectedPHC.name
        })
      });
      await assertServerResponse(res, 'Replenishment order sync');
    } else if (item.action === 'APPROVE_REDISTRIBUTION') {
      const res = await fetch('/api/redistributions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.payload?.redistributionId,
          customTransfer: item.payload?.customTransfer
        })
      });
      await assertServerResponse(res, 'Redistribution approval sync');
    } else if (item.action === 'ACKNOWLEDGE_INCIDENT') {
      if (item.payload?.alertId) {
        const res = await fetch('/api/alerts/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.payload.alertId })
        });
        await assertServerResponse(res, 'Alert acknowledge sync');
      }
    } else if (item.action === 'MARK_STAFF_ATTENDANCE') {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (inchargeSessionRef.current?.sessionToken) {
        headers.Authorization = `Bearer ${inchargeSessionRef.current.sessionToken}`;
      }
      const targetDate = item.payload?.date || todayIsoDate;
      const entries = Array.isArray(item.payload?.entries)
        ? item.payload.entries
        : [{ staffId: item.payload?.staffId, status: item.payload?.status }];

      // Mark records as SYNCING before network call
      setAttendanceByPhc((prev) => {
        const list = prev[targetPhcId] || [];
        return {
          ...prev,
          [targetPhcId]: list.map((r) =>
            r.date === targetDate && entries.some((e: any) => e.staffId === r.staffId)
              ? { ...r, syncStatus: 'SYNCING' }
              : r
          )
        };
      });

      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phcId: targetPhcId,
          date: targetDate,
          entries,
          markedBy: item.payload?.markedBy
        })
      });
      await assertServerResponse(res, 'Staff attendance sync');

      // Mark records as SYNCED on confirmation
      setAttendanceByPhc((prev) => {
        const list = prev[targetPhcId] || [];
        return {
          ...prev,
          [targetPhcId]: list.map((r) =>
            r.date === targetDate && entries.some((e: any) => e.staffId === r.staffId)
              ? { ...r, syncStatus: 'SYNCED' }
              : r
          )
        };
      });
    }
    return true;
  };

  // Helper to synchronize a single queue item with exponential backoff across server replay & Firestore upload
  const syncSingleItemWithBackoff = async (item: OfflineQueueItem, maxRetries = 3): Promise<void> => {
    await executeWithExponentialBackoff(
      async () => {
        await replayOfflineItemToServer(item);

        if (currentUser) {
          try {
            await setDoc(
              doc(db, 'offline_sync_audit', item.id),
              {
                ...item,
                status: 'SYNCED',
                syncedAt: new Date().toISOString(),
                syncedBy: currentUser.email || currentUser.uid
              },
              { merge: true }
            );
          } catch (firestoreErr) {
            if (isTransientNetworkError(firestoreErr)) {
              throw firestoreErr;
            }
            handleFirestoreError(firestoreErr, OperationType.WRITE, `offline_sync_audit/${item.id}`);
          }
        }
      },
      {
        maxRetries,
        baseDelayMs: 500,
        maxDelayMs: 8000,
        jitterRatio: 0.15,
        onRetry: ({ attempt, maxRetries: maxR, delayMs, error }) => {
          const reason = error instanceof Error ? error.message : 'Transient network error';
          setQueueRetryState({
            itemId: item.id,
            entityName: item.entityName,
            attempt,
            maxRetries: maxR,
            nextDelayMs: delayMs,
            errorMessage: reason
          });
          setOfflineQueue(prev =>
            prev.map(q =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'FAILED_RETRY',
                    retryCount: (q.retryCount || 0) + 1,
                    errorMessage: `Retry ${attempt}/${maxR} in ${(delayMs / 1000).toFixed(1)}s (${reason})`
                  }
                : q
            )
          );
        }
      }
    );
    setQueueRetryState(null);
  };

  // Sync all pending records in the offline queue with exponential backoff and incremental percentage progress to Firestore
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
    setIsSyncCompleteBannerVisible(true);
    setQueueRetryState(null);
    setQueueSyncTotalCount(pending.length);
    setQueueSyncSyncedCount(0);
    setQueueSyncProgress(0);
    setQueueSyncCurrentRecord(`${pending[0].id} · ${pending[0].entityName}`);

    if (isOfflineMode) {
      setIsOfflineMode(false);
    }
    notify(`Uploading ${pending.length} buffered offline record(s) to Firestore...`);

    let succeededCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        setQueueSyncCurrentRecord(`${item.id} · ${item.entityName}`);

        // Mark item as actively transmitting
        setOfflineQueue(prev =>
          prev.map(q => (q.id === item.id ? { ...q, status: 'SYNCING', errorMessage: undefined } : q))
        );

        try {
          await syncSingleItemWithBackoff(item, 3);

          // Brief visual pacing so the progress percentage step is clearly observable
          await new Promise(resolve => setTimeout(resolve, 260));

          succeededCount++;
          const nextPct = Math.round((succeededCount / pending.length) * 100);

          setOfflineQueue(prev =>
            prev.map(q =>
              q.id === item.id
                ? { ...q, status: 'SYNCED', formattedTime: 'Synced just now', errorMessage: undefined }
                : q
            )
          );
          setQueueSyncSyncedCount(succeededCount);
          setQueueSyncProgress(nextPct);
        } catch (itemErr) {
          failedCount++;
          const errMsg = itemErr instanceof Error ? itemErr.message : 'Network failure';
          setOfflineQueue(prev =>
            prev.map(q =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'FAILED_RETRY',
                    retryCount: (q.retryCount || 0) + 1,
                    errorMessage: `Sync failed after exponential backoff: ${errMsg}`
                  }
                : q
            )
          );
        }
      }

      setQueueSyncCurrentRecord(null);
      setQueueRetryState(null);

      // Refresh state from server after replaying queued operations
      try {
        const stateRes = await fetch(`/api/state?phcId=${encodeURIComponent(selectedPHC.id)}`);
        if (stateRes.ok) {
          const data = await stateRes.json();
          if (Array.isArray(data?.medicines) && data.medicines.length > 0) setMedicines(data.medicines);
          if (Array.isArray(data?.orders)) setOrders(data.orders);
          if (Array.isArray(data?.redistributions)) setRedistributions(data.redistributions);
          if (Array.isArray(data?.alerts)) setAlerts(data.alerts);
        }
      } catch {}

      if (failedCount === 0) {
        setQueueBackoffCycle(0);
        notify(`100% Complete: Synchronized ${succeededCount} offline record(s) to Firestore & server ledger.`);
        setTimeout(() => {
          setIsSyncCompleteBannerVisible(false);
        }, 6000);
      } else {
        const nextCycle = queueBackoffCycle + 1;
        setQueueBackoffCycle(nextCycle);
        const autoRetryDelayMs = calculateExponentialBackoffDelay(nextCycle, 2000, 16000, 0.15);
        notify(
          `Synced ${succeededCount}/${pending.length} record(s). ${failedCount} failed — scheduled exponential backoff retry in ${(
            autoRetryDelayMs / 1000
          ).toFixed(1)}s.`
        );
      }
    } catch (err) {
      console.error('Offline queue sync error:', err);
      notify('Partial sync failure. Some records remain in queue for exponential backoff retry.');
    } finally {
      setIsQueueSyncing(false);
    }
  };

  // Automatic queue-level exponential backoff scheduler for any remaining FAILED_RETRY items while online
  useEffect(() => {
    if (isOfflineMode || isQueueSyncing || queueBackoffCycle <= 0 || queueBackoffCycle > 3) {
      return;
    }
    const failedItems = offlineQueue.filter(i => i.status === 'FAILED_RETRY');
    if (failedItems.length === 0) {
      setQueueBackoffCycle(0);
      return;
    }

    const delayMs = calculateExponentialBackoffDelay(queueBackoffCycle, 2000, 16000, 0.15);
    const timer = setTimeout(() => {
      if (!isOfflineMode && !isQueueSyncing) {
        void syncOfflineQueue();
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [queueBackoffCycle, isOfflineMode, isQueueSyncing, offlineQueue]);

  // Sync single queue item with exponential backoff
  const syncQueueItem = async (id: string) => {
    const target = offlineQueue.find(i => i.id === id);
    if (!target) return;

    setIsQueueSyncing(true);
    setIsSyncCompleteBannerVisible(true);
    setQueueRetryState(null);
    setQueueSyncTotalCount(1);
    setQueueSyncSyncedCount(0);
    setQueueSyncProgress(25);
    setQueueSyncCurrentRecord(`${target.id} · ${target.entityName}`);

    setOfflineQueue(prev =>
      prev.map(item => (item.id === id ? { ...item, status: 'SYNCING', errorMessage: undefined } : item))
    );

    if (isOfflineMode) {
      setIsOfflineMode(false);
    }

    try {
      await syncSingleItemWithBackoff(target, 3);
      setQueueSyncProgress(75);

      try {
        const stateRes = await fetch(`/api/state?phcId=${encodeURIComponent(selectedPHC.id)}`);
        if (stateRes.ok) {
          const data = await stateRes.json();
          if (Array.isArray(data?.medicines) && data.medicines.length > 0) setMedicines(data.medicines);
          if (Array.isArray(data?.orders)) setOrders(data.orders);
          if (Array.isArray(data?.redistributions)) setRedistributions(data.redistributions);
          if (Array.isArray(data?.alerts)) setAlerts(data.alerts);
        }
      } catch {}

      setQueueSyncSyncedCount(1);
      setQueueSyncProgress(100);
      setQueueSyncCurrentRecord(null);

      setOfflineQueue(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, status: 'SYNCED', formattedTime: 'Synced just now', errorMessage: undefined }
            : item
        )
      );
      notify(`Record #${id} synchronized to Firestore & server ledger (100%).`);
      setTimeout(() => {
        setIsSyncCompleteBannerVisible(false);
      }, 5000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Transient network error';
      setOfflineQueue(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                status: 'FAILED_RETRY',
                retryCount: (item.retryCount || 0) + 1,
                errorMessage: `Sync failed after backoff retries: ${errMsg}`
              }
            : item
        )
      );
      notify(`Record #${id} failed after exponential backoff retries (${errMsg}).`);
    } finally {
      setQueueRetryState(null);
      setIsQueueSyncing(false);
    }
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

  // Audio Transcription using language-aware Gemini multimodal audio pipeline (en-IN, hi-IN, ta-IN, te-IN)
  const transcribeAudio = async (
    audioBlob: Blob,
    languageParam?: RegisterVoiceBcp47Locale | string,
    browserTranscript: string = ''
  ): Promise<string> => {
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
      const resolvedLocale: RegisterVoiceBcp47Locale = getVoiceBcp47Locale(languageParam || language);

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          language: resolvedLocale,
          locale: resolvedLocale,
          browserTranscript
        })
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
            language: resolvedLocale,
            locale: resolvedLocale,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Voice log firestore error:', err);
        }
      }

      notify(`Audio transcribed (${resolvedLocale}) via ${data.modelUsed || 'Gemini Audio ASR'}.`);
      return transcript;
    } catch (error) {
      console.error('Audio transcription error:', error);
      if (browserTranscript.trim()) {
        return browserTranscript.trim();
      }
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
          taskComplexity,
          phcId: selectedPHC.id,
          phcName: selectedPHC.name
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
        modelUsed: data.modelUsed || 'gemini-3.8-flash',
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
  const consumeMedicine = async (medicineId: string, quantity: number, reason: string): Promise<boolean> => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void consumeMedicine(medicineId, quantity, reason);
      };
      setPendingActionLabel(`Dispense / adjust medicine stock (-${quantity} units)`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return false;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      notify('Invalid quantity: quantity to dispense must be greater than 0.');
      return false;
    }

    if (!isOfflineMode) {
      try {
        const res = await fetch('/api/inventory/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicineId,
            phcId: selectedPHC.id,
            quantity: qty,
            reason,
            prescribedBy: role === 'medical_officer' ? 'Dr. Medical Officer' : 'Staff Nurse'
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(data.error || 'Failed to dispense medicine due to stock validation error.');
          return false;
        }
        if (Array.isArray(data.updatedInventory)) {
          setMedicines(data.updatedInventory);
        } else if (data.updatedMedicine) {
          setMedicines(prev => prev.map(m => m.id === medicineId ? data.updatedMedicine : m));
        }
        notify(`Dispensed ${qty} units of ${data.updatedMedicine?.name || 'medicine'}. Inventory ledger updated.`);
        return true;
      } catch {
        // Network failure: fall through to local offline buffer
      }
    }

    const targetMed = medicines.find(m => m.id === medicineId);
    if (!targetMed) {
      notify(`Medicine ID "${medicineId}" not found in facility inventory.`);
      return false;
    }

    const clonedTarget: MedicineItem = {
      ...targetMed,
      batches: targetMed.batches ? targetMed.batches.map(b => ({ ...b })) : undefined
    };
    const fefoCheck = applyFefoStockAdjustment(clonedTarget, -qty);
    if (!fefoCheck.ok) {
      notify(fefoCheck.error || `Insufficient usable stock for ${targetMed.name}.`);
      return false;
    }

    setMedicines(prev => prev.map(m => {
      if (m.id === medicineId) {
        const nextMed: MedicineItem = {
          ...m,
          batches: m.batches ? m.batches.map(b => ({ ...b })) : undefined
        };
        applyFefoStockAdjustment(nextMed, -qty);
        const nextDaily = Math.max(1, Math.round((m.dailyConsumption * 6 + qty) / 7));
        nextMed.dailyConsumption = nextDaily;
        applyFefoStockAdjustment(nextMed, 0);

        // Proactively fire in-app threshold alert toast when stock falls at or below minStockLevel
        if (nextMed.currentStock <= nextMed.minStockLevel) {
          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setActiveThresholdToast({
            id: `THRESH-${selectedPHC.code}-${nextMed.id}-${Date.now()}`,
            phcId: selectedPHC.id,
            phcName: selectedPHC.name,
            medicineId: nextMed.id,
            medicineName: nextMed.name,
            category: nextMed.category,
            currentStock: nextMed.currentStock,
            thresholdLevel: nextMed.minStockLevel,
            unit: nextMed.unit,
            projectedStockoutDays: nextMed.projectedStockoutDays,
            severity: nextMed.stockoutRisk === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
            timestamp: `Just now (${nowTime})`,
            read: false
          });
        }

        return nextMed;
      }
      return m;
    }));

    if (isOfflineMode) {
      addToOfflineQueue({
        module: 'medicine',
        moduleLabel: 'Clinical Stock Ledger',
        action: 'DISPENSE_CONSUMPTION',
        entityName: targetMed.name,
        quantity: qty,
        unit: targetMed.unit || 'units',
        payload: {
          medicineId,
          quantity: qty,
          reason,
          prescribedBy: role === 'medical_officer' ? 'Dr. Medical Officer' : 'Staff Nurse',
          timestamp: new Date().toISOString()
        }
      });
    }

    notify(`Dispensed ${qty} units of ${targetMed.name} (Buffered locally).`);
    return true;
  };

  // OCR / Register Verification — resolves exact medicine ID first, rejects unmatched/ambiguous items, applies stock adjustment once
  const verifyOCRRecord = async (record: {
    medicineId?: string;
    medicineName: string;
    quantity: number;
    transaction: string;
    date: string;
    batch: string;
  }): Promise<{ ok: boolean; matchedMedicineId?: string; matchedMedicineName?: string; error?: string }> => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void verifyOCRRecord(record);
      };
      setPendingActionLabel(`Commit OCR stock record (${record.medicineName})`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return { ok: false, error: 'Authorized access required.' };
    }
    const qty = Number(record.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      const errMsg = `Invalid quantity (${record.quantity}) for "${record.medicineName}": quantity must be greater than 0.`;
      notify(errMsg);
      return { ok: false, error: errMsg };
    }

    // Resolve against active facility inventory first
    const localMatch = resolveMedicineMatch(medicines, record.medicineName, record.medicineId);
    if (localMatch.status === 'UNMATCHED' || localMatch.status === 'AMBIGUOUS') {
      notify(localMatch.reason);
      return { ok: false, error: localMatch.reason };
    }

    if (!isOfflineMode) {
      try {
        const res = await fetch('/api/inventory/verify-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...record,
            medicineId: localMatch.medicine.id,
            phcId: selectedPHC.id
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errMsg = data.error || `Could not verify register record for "${record.medicineName}".`;
          notify(errMsg);
          return { ok: false, error: errMsg };
        }
        if (Array.isArray(data.updatedInventory)) {
          setMedicines(data.updatedInventory);
        } else {
          const invRes = await fetch(`/api/inventory?phcId=${encodeURIComponent(selectedPHC.id)}`);
          if (invRes.ok) {
            setMedicines(await invRes.json());
          }
        }
        const matchedMedName = data.updatedMedicine?.name || localMatch.medicine.name;
        const matchedId = data.matchedMedicineId || localMatch.medicine.id;
        notify(`Register entry matched to ${matchedMedName} (${matchedId}): ${qty} ${localMatch.medicine.unit} committed to stock ledger.`);
        return {
          ok: true,
          matchedMedicineId: matchedId,
          matchedMedicineName: matchedMedName
        };
      } catch {
        // Network failure: fall through to offline local verification
      }
    }

    // Offline local stock update (validated & exact once)
    const matchedMed = localMatch.medicine;
    const txLower = String(record.transaction || '').toLowerCase();
    const isDeduction =
      txLower.includes('dispensed') ||
      txLower.includes('consumption') ||
      txLower.includes('emergency') ||
      txLower.includes('damaged') ||
      txLower.includes('expired');
    const isReceipt =
      txLower.includes('received') || txLower.includes('receipt') || txLower.includes('inward');

    if (!isDeduction && !isReceipt) {
      const errMsg = `Unrecognized transaction type "${record.transaction}".`;
      notify(errMsg);
      return { ok: false, error: errMsg };
    }

    if (isDeduction && qty > matchedMed.currentStock) {
      const errMsg = `Insufficient stock for ${matchedMed.name} (${matchedMed.id}): tried to deduct ${qty} ${matchedMed.unit}, but only ${matchedMed.currentStock} ${matchedMed.unit} available.`;
      notify(errMsg);
      return { ok: false, error: errMsg };
    }

    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== matchedMed.id) return m;

        const nextStock = isDeduction ? Math.max(0, m.currentStock - qty) : m.currentStock + qty;
        const nextDays = m.dailyConsumption > 0 ? Number((nextStock / m.dailyConsumption).toFixed(1)) : 99;
        const isCrit = nextStock <= Math.round(m.minStockLevel * 0.5) || nextDays <= 3.5;
        const isWarn = !isCrit && nextStock <= m.minStockLevel;
        const nextRisk: MedicineItem['stockoutRisk'] = isCrit
          ? 'CRITICAL'
          : isWarn
          ? 'WARNING'
          : nextStock > m.maxStockLevel
          ? 'SURPLUS'
          : 'NORMAL';

        return {
          ...m,
          currentStock: nextStock,
          batchNumber: record.batch || m.batchNumber,
          projectedStockoutDays: nextDays,
          stockoutRisk: nextRisk
        };
      })
    );

    if (isOfflineMode) {
      addToOfflineQueue({
        module: 'records',
        moduleLabel: 'Physical Register OCR',
        action: 'OCR_REGISTER_VERIFY',
        entityName: matchedMed.name,
        quantity: qty,
        unit: matchedMed.unit,
        payload: {
          ...record,
          medicineId: matchedMed.id,
          phcId: selectedPHC.id,
          timestamp: new Date().toISOString()
        }
      });
    }

    notify(`Record matched to ${matchedMed.name} (${matchedMed.id}): ${qty} ${matchedMed.unit} applied and buffered.`);
    return {
      ok: true,
      matchedMedicineId: matchedMed.id,
      matchedMedicineName: matchedMed.name
    };
  };

  // Register & Add PHC Data (stock + OPD footfall + bed occupancy)
  const registerPHCData = async (payload: {
    medicineName?: string;
    medicineId?: string;
    quantity?: number;
    transaction?: string;
    batch?: string;
    opdFootfall?: number;
    occupiedBeds?: number;
    emergencyFootfall?: number;
    admissions?: number;
    notes?: string;
  }): Promise<boolean> => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void registerPHCData(payload);
      };
      setPendingActionLabel('Update PHC inventory and operational telemetry');
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return false;
    }
    if (!isOfflineMode) {
      try {
        const res = await fetch('/api/phc/register-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            phcId: selectedPHC.id
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (Array.isArray(data.updatedInventory) && data.updatedInventory.length > 0) {
            setMedicines(data.updatedInventory);
          }
          if (data.updatedCapacity && typeof data.updatedCapacity.totalBeds === 'number') {
            setCapacity(data.updatedCapacity);
          }
          const summaryParts: string[] = [];
          if (data.updatedMedicine) {
            summaryParts.push(`${payload.quantity || 0} ${data.updatedMedicine.unit} of ${data.updatedMedicine.name}`);
          }
          if (payload.opdFootfall !== undefined) {
            summaryParts.push(`OPD Footfall: ${payload.opdFootfall}`);
          }
          if (payload.occupiedBeds !== undefined) {
            summaryParts.push(`Occupied Beds: ${payload.occupiedBeds}`);
          }
          notify(
            `PHC Data Registered (${selectedPHC.name}): ${
              summaryParts.length > 0 ? summaryParts.join(' · ') : 'Updated facility ledger'
            }`
          );
          return true;
        }
      } catch {
        // Fallback to local state update
      }
    }

    if (payload.medicineName || payload.medicineId) {
      const qty = Number(payload.quantity) || 0;
      if (qty > 0) {
        await verifyOCRRecord({
          medicineId: payload.medicineId,
          medicineName: payload.medicineName || '',
          quantity: qty,
          transaction: payload.transaction || 'Received (Warehouse)',
          date: '2026-09-28',
          batch: payload.batch || 'BATCH-PHC-26'
        });
      }
    }

    if (
      payload.opdFootfall !== undefined ||
      payload.occupiedBeds !== undefined ||
      payload.emergencyFootfall !== undefined
    ) {
      setCapacity((prev) => {
        const nextTotal = prev.totalBeds || 30;
        const nextOccupied =
          payload.occupiedBeds !== undefined
            ? Math.min(nextTotal, Math.max(0, Math.round(Number(payload.occupiedBeds))))
            : prev.occupiedBeds;
        return {
          ...prev,
          opdFootfall:
            payload.opdFootfall !== undefined
              ? Math.max(0, Math.round(Number(payload.opdFootfall)))
              : prev.opdFootfall,
          occupiedBeds: nextOccupied,
          availableBeds: Math.max(0, nextTotal - nextOccupied),
          occupancyRate: Math.round((nextOccupied / Math.max(1, nextTotal)) * 100),
          emergencyFootfall:
            payload.emergencyFootfall !== undefined
              ? Math.max(0, Math.round(Number(payload.emergencyFootfall)))
              : prev.emergencyFootfall
        };
      });
    }

    notify(`PHC Data Registered for ${selectedPHC.name}.`);
    return true;
  };

  // Order & Transfer Safety Preview & Explicit Confirmation State (Priority 3)
  const [pendingSafetyAction, setPendingSafetyAction] = useState<{
    kind: 'SINGLE_ORDER' | 'BULK_RESTOCK' | 'REDISTRIBUTION_TRANSFER';
    title: string;
    items: Array<{
      medicineName: string;
      quantityRequested: number;
      unit: string;
      priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
      source: string;
      destination: string;
      estimatedDelivery: string;
      justification: string;
      isDuplicate?: boolean;
      existingOrderId?: string;
    }>;
    redistributionId?: string;
    customTransferPayload?: {
      medicineName: string;
      transferQuantity: number;
      sourcePHCId: string;
      sourcePHCName: string;
      targetPHCId: string;
      targetPHCName: string;
      transitDistanceKm?: number;
      estimatedTransitTimeHours?: number;
      clinicalRationale?: string;
    };
  } | null>(null);
  const [safetyModalChecked, setSafetyModalChecked] = useState<boolean>(false);
  const [isSubmittingSafetyModal, setIsSubmittingSafetyModal] = useState<boolean>(false);

  const findDuplicateActiveOrder = (medName: string, targetPhcId = selectedPHC.id, targetPhcName = selectedPHC.name) => {
    const clean = medName.trim().toLowerCase();
    return orders.find(
      (o) =>
        o.status !== 'RECEIVED' &&
        (o.phcId === targetPhcId || o.destination.toLowerCase().includes(targetPhcName.toLowerCase())) &&
        (o.medicineName.toLowerCase() === clean ||
          o.medicineName.toLowerCase().includes(clean) ||
          clean.includes(o.medicineName.toLowerCase()))
    );
  };

  // Create Order with Mandatory Preview, Explicit Confirmation, and Duplicate Prevention
  const createOrder = async (orderData: {
    medicineName: string;
    quantityRequested: number;
    priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
    justification: string;
    confirmedByUser?: boolean;
  }): Promise<boolean> => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void createOrder(orderData);
      };
      setPendingActionLabel(`Create replenishment order for ${orderData.medicineName}`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return false;
    }
    const qty = Math.round(Number(orderData.quantityRequested));
    if (!orderData.medicineName || !orderData.medicineName.trim()) {
      notify('Cannot create order: medicine name is required.');
      return false;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      notify('Cannot create order: quantity requested must be greater than 0.');
      return false;
    }

    const localMatch = resolveMedicineMatch(medicines, orderData.medicineName.trim());
    const matchedMedId = localMatch.status === 'MATCHED' ? localMatch.medicine.id : undefined;
    const canonicalName =
      localMatch.status === 'MATCHED' ? localMatch.medicine.name : orderData.medicineName.trim();
    const unitLabel = localMatch.status === 'MATCHED' ? localMatch.medicine.unit : 'Units';

    const dupOrder = findDuplicateActiveOrder(canonicalName);

    // If not explicitly confirmed via preview modal yet, open the Order Safety Preview & Confirmation Modal
    if (!orderData.confirmedByUser) {
      const estDeliveryLabel =
        orderData.priority === 'EMERGENCY_REPLENISHMENT'
          ? '2026-09-23 (~24h Simulated Emergency Dispatch)'
          : orderData.priority === 'URGENT'
          ? '2026-09-24 (~48h Simulated Urgent Dispatch)'
          : '2026-09-26 (~3.5d Simulated Routine Transit)';

      setSafetyModalChecked(false);
      setPendingSafetyAction({
        kind: 'SINGLE_ORDER',
        title: 'Confirm Simulated Medicine Replenishment Order',
        items: [
          {
            medicineName: canonicalName,
            quantityRequested: qty,
            unit: unitLabel,
            priority: orderData.priority,
            source: `${selectedPHC.district} District Drug Warehouse (Simulated RMSCL Hub)`,
            destination: `${selectedPHC.name} Store (${selectedPHC.district})`,
            estimatedDelivery: estDeliveryLabel,
            justification: orderData.justification,
            isDuplicate: Boolean(dupOrder),
            existingOrderId: dupOrder?.id
          }
        ]
      });
      return false;
    }

    // Enforce duplicate order prevention even on confirmed submission
    if (dupOrder) {
      notify(
        `Duplicate Order Prevented: Active simulated order #${dupOrder.id} (+${dupOrder.quantityRequested.toLocaleString()} ${unitLabel} of ${dupOrder.medicineName}) is already in pipeline (${dupOrder.status}) for ${selectedPHC.name}.`
      );
      return false;
    }

    const applyLocalPipelineIncrement = (targetMedId?: string, estDate?: string) => {
      if (!targetMedId) return;
      setMedicines((prev) =>
        prev.map((m) => {
          if (m.id !== targetMedId) return m;
          const updated: MedicineItem = {
            ...m,
            pendingOrders: Math.max(0, (m.pendingOrders || 0) + qty),
            expectedDeliveryDate: estDate || m.expectedDeliveryDate || '2026-09-24'
          };
          const evalRes = evaluateMedicineThresholdAndReplenishment(updated);
          return {
            ...updated,
            projectedStockoutDays: evalRes.usableDaysOfCover,
            stockoutRisk: evalRes.riskLevel
          };
        })
      );
      setProactiveStockAlerts((prev) =>
        prev.map((a) =>
          a.medicineId === targetMedId
            ? { ...a, autoIndentTriggered: true, read: true }
            : a
        )
      );
      setAlerts((prev) =>
        prev
          .filter((a): a is OperationalAlert => Boolean(a && a.id))
          .map((a) =>
            a.id === `ALT-THRESH-${targetMedId}` || a.medicineId === targetMedId
              ? { ...a, status: 'ACKNOWLEDGED' }
              : a
          )
      );
    };

    if (!isOfflineMode) {
      try {
        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...orderData,
            medicineId: matchedMedId,
            quantityRequested: qty,
            phcId: selectedPHC.id,
            phcName: selectedPHC.name
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(data.error || 'Failed to create replenishment order.');
          return false;
        }
        const createdOrder: LogisticsOrder = data.order;
        if (Array.isArray(data.allOrders)) {
          setOrders(data.allOrders);
        } else if (createdOrder) {
          setOrders((prev) => [createdOrder, ...prev.filter((o) => o.id !== createdOrder.id)]);
        }

        if (Array.isArray(data.updatedInventory) && data.updatedInventory.length > 0) {
          setMedicines(data.updatedInventory);
          if (matchedMedId) {
            setProactiveStockAlerts((prev) =>
              prev.map((a) =>
                a.medicineId === matchedMedId
                  ? { ...a, autoIndentTriggered: true, read: true }
                  : a
              )
            );
            setAlerts((prev) =>
              prev
                .filter((a): a is OperationalAlert => Boolean(a && a.id))
                .map((a) =>
                  a.id === `ALT-THRESH-${matchedMedId}` || a.medicineId === matchedMedId
                    ? { ...a, status: 'ACKNOWLEDGED' }
                    : a
                )
            );
          }
        } else {
          applyLocalPipelineIncrement(matchedMedId, createdOrder?.estimatedDelivery);
        }

        if (currentUser && createdOrder) {
          try {
            await setDoc(doc(db, 'orders', createdOrder.id), {
              ...createdOrder,
              createdBy: currentUser.email || currentUser.uid,
              createdAt: new Date().toISOString()
            });
          } catch (err) {
            console.warn('Order sync to Firestore buffered in local offline state:', err);
          }
        }

        notify(
          `[SIMULATED DEMO ORDER] Indent #${createdOrder.id} (+${qty.toLocaleString()} ${unitLabel} of ${createdOrder.medicineName}) submitted to demo pipeline for ${selectedPHC.name}.`
        );
        return true;
      } catch {
        // Network failure: fall through to local offline buffer
      }
    }

    const newOrd: LogisticsOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      phcId: selectedPHC.id,
      phcName: selectedPHC.name,
      medicineName: canonicalName,
      quantityRequested: qty,
      source: `${selectedPHC.district} District Drug Warehouse (Simulated RMSCL Hub)`,
      destination: `${selectedPHC.name} Store`,
      status: 'APPROVAL PENDING',
      requestDate: new Date().toISOString().split('T')[0],
      estimatedDelivery: '2026-09-24',
      priority: orderData.priority,
      notes: orderData.justification.includes('SIMULATED')
        ? orderData.justification
        : `[SIMULATED DEMO ORDER] ${orderData.justification}`
    };

    applyLocalPipelineIncrement(matchedMedId, newOrd.estimatedDelivery);

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

    if (isOfflineMode) {
      addToOfflineQueue({
        module: 'orders',
        moduleLabel: 'Indent Logistics',
        action: 'CREATE_REPLENISHMENT_ORDER',
        entityName: orderData.medicineName,
        quantity: qty,
        unit: 'units',
        payload: {
          ...newOrd,
          createdAt: new Date().toISOString()
        }
      });
    }

    setOrders(prev => [newOrd, ...prev]);
    notify(`[SIMULATED DEMO ORDER] Request #${newOrd.id} (+${qty.toLocaleString()} ${unitLabel} of ${canonicalName}) created in demo pipeline.`);
    return true;
  };

  // Open Bulk Restock Preview ("Restock All Low Medicines") with Duplicate Order Prevention & Explicit Confirmation
  const openBulkRestockPreview = (
    customItems?: Array<{
      medicineName: string;
      quantityRequested: number;
      unit?: string;
      priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
      justification: string;
    }>
  ) => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        openBulkRestockPreview(customItems);
      };
      setPendingActionLabel('Create bulk replenishment indent for low-stock medicines');
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    const rawList =
      customItems && customItems.length > 0
        ? customItems
        : medicines
            .map((m) => ({ med: m, ev: evaluateMedicineThresholdAndReplenishment(m) }))
            .filter(({ ev }) => ev.isThresholdBreached)
            .map(({ med, ev }) => ({
              medicineName: med.name,
              quantityRequested: ev.recommendedOrderQty,
              unit: med.unit,
              priority: ev.recommendedPriority,
              justification: `[SIMULATED DEMO BULK RESTOCK] ${ev.breachRuleTitle} (${ev.usableStock} / ${ev.minThreshold} ${med.unit})`
            }));

    if (rawList.length === 0) {
      notify(`All medicines at ${selectedPHC.name} currently meet their configurable demo thresholds.`);
      return;
    }

    const previewItems = rawList.map((item) => {
      const dup = findDuplicateActiveOrder(item.medicineName);
      const localMatch = resolveMedicineMatch(medicines, item.medicineName);
      const unitLabel = item.unit || (localMatch.status === 'MATCHED' ? localMatch.medicine.unit : 'Units');
      const estDeliveryLabel =
        item.priority === 'EMERGENCY_REPLENISHMENT'
          ? '2026-09-23 (~24h Simulated Emergency Dispatch)'
          : item.priority === 'URGENT'
          ? '2026-09-24 (~48h Simulated Urgent Dispatch)'
          : '2026-09-26 (~3.5d Simulated Routine Transit)';

      return {
        medicineName: item.medicineName,
        quantityRequested: item.quantityRequested,
        unit: unitLabel,
        priority: item.priority,
        source: `${selectedPHC.district} District Drug Warehouse (Simulated RMSCL Hub)`,
        destination: `${selectedPHC.name} Store (${selectedPHC.district})`,
        estimatedDelivery: estDeliveryLabel,
        justification: item.justification,
        isDuplicate: Boolean(dup),
        existingOrderId: dup?.id
      };
    });

    setSafetyModalChecked(false);
    setPendingSafetyAction({
      kind: 'BULK_RESTOCK',
      title: `Restock Low Medicines Preview (${previewItems.filter((i) => !i.isDuplicate).length} Eligible, ${previewItems.filter((i) => i.isDuplicate).length} Already Active)`,
      items: previewItems
    });
  };

  // Advance Order
  const advanceOrder = async (orderId: string): Promise<boolean> => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void advanceOrder(orderId);
      };
      setPendingActionLabel(`Approve / advance order #${orderId}`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return false;
    }
    if (!isOfflineMode) {
      try {
        const res = await fetch('/api/orders/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(data.error || `Could not advance order #${orderId}.`);
          return false;
        }
        if (Array.isArray(data.allOrders)) {
          setOrders(data.allOrders);
        } else if (data.order) {
          setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        }
        if (Array.isArray(data.updatedInventory)) {
          const targetOrderPhcId = data.order?.phcId || selectedPHC.id;
          if (targetOrderPhcId === selectedPHC.id) {
            setMedicines(data.updatedInventory);
          }
          setFacilityInventories(prev => ({
            ...prev,
            [targetOrderPhcId]: data.updatedInventory
          }));
        } else if (data.order?.status === 'RECEIVED') {
          const invRes = await fetch(`/api/inventory?phcId=${encodeURIComponent(selectedPHC.id)}`);
          if (invRes.ok) {
            const freshInv = await invRes.json();
            setMedicines(freshInv);
            setFacilityInventories(prev => ({
              ...prev,
              [selectedPHC.id]: freshInv
            }));
          }
        }
        notify(`Order #${orderId} advanced to status: ${data.order.status}`);

        // Sync to Firestore if user logged in
        if (currentUser && data.order) {
          try {
            await setDoc(doc(db, 'orders', orderId), data.order, { merge: true });
          } catch (err) {
            console.warn('Firestore order advance sync error:', err);
          }
        }
        return true;
      } catch {
        // Network failure: fall through to offline local advance
      }
    }

    const existingOrder = orders.find(o => o.id === orderId);
    if (!existingOrder) {
      notify(`Order #${orderId} not found.`);
      return false;
    }
    if (existingOrder.status === 'RECEIVED') {
      notify(`Order #${orderId} has already been RECEIVED.`);
      return false;
    }

    const flow: Record<LogisticsOrder['status'], LogisticsOrder['status']> = {
      'DRAFT': 'SUBMITTED',
      'SUBMITTED': 'APPROVED',
      'REQUESTED': 'APPROVAL PENDING',
      'APPROVAL PENDING': 'APPROVED',
      'APPROVED': 'PROCESSING',
      'PROCESSING': 'DISPATCHED',
      'DISPATCHED': 'IN TRANSIT',
      'IN TRANSIT': 'DELIVERED',
      'DELIVERED': 'RECEIVED',
      'RECEIVED': 'RECEIVED',
      'CANCELLED': 'CANCELLED'
    };

    const nextStatus = flow[existingOrder.status];
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: nextStatus,
          quantityDispatched: nextStatus === 'DISPATCHED' ? o.quantityRequested : o.quantityDispatched,
          consignmentId: nextStatus === 'DISPATCHED' ? 'RJ-VTS-99120' : o.consignmentId
        };
      }
      return o;
    }));

    // When transitioning to RECEIVED in offline mode, credit the target facility inventory once
    if (nextStatus === 'RECEIVED') {
      const targetPhcId = existingOrder.phcId || selectedPHC.id;
      const creditQty = existingOrder.quantityDispatched || existingOrder.quantityRequested || 0;
      const currentList = targetPhcId === selectedPHC.id ? medicines : (facilityInventories[targetPhcId] || []);
      const match = resolveMedicineMatch(currentList, existingOrder.medicineName);
      if (match.status === 'MATCHED' && creditQty > 0) {
        updateFacilityMedicineStock(targetPhcId, match.medicine.id, {
          currentStock: match.medicine.currentStock + creditQty
        });
      }
    }

    notify(`Order #${orderId} status advanced to ${nextStatus}.`);
    return true;
  };

  const refreshServerState = async (authoritativePayload?: {
    medicines?: MedicineItem[];
    updatedInventory?: MedicineItem[];
    orders?: LogisticsOrder[];
    allOrders?: LogisticsOrder[];
    redistributions?: RedistributionOpportunity[];
    allRedistributions?: RedistributionOpportunity[];
    capacity?: CapacityRecord;
    updatedCapacity?: CapacityRecord;
  }) => {
    // If an authoritative response payload is passed (e.g. from /api/agents/execute), apply it directly first
    if (authoritativePayload) {
      const nextMeds = authoritativePayload.updatedInventory || authoritativePayload.medicines;
      const nextOrders = authoritativePayload.allOrders || authoritativePayload.orders;
      const nextRedist = authoritativePayload.allRedistributions || authoritativePayload.redistributions;
      const nextCap = authoritativePayload.updatedCapacity || authoritativePayload.capacity;

      if (Array.isArray(nextMeds) && nextMeds.length > 0) {
        setMedicines(nextMeds);
      }
      if (Array.isArray(nextOrders)) {
        setOrders(nextOrders);
      }
      if (Array.isArray(nextRedist)) {
        setRedistributions(nextRedist);
      }
      if (nextCap && typeof nextCap.totalBeds === 'number') {
        setCapacity(nextCap);
      }
      return;
    }

    try {
      const stateRes = await fetch(`/api/state?phcId=${encodeURIComponent(selectedPHC.id)}`);
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        if (Array.isArray(stateData.medicines)) setMedicines(stateData.medicines);
        if (Array.isArray(stateData.orders)) setOrders(stateData.orders);
        if (Array.isArray(stateData.redistributions)) setRedistributions(stateData.redistributions);
        if (stateData.capacity && typeof stateData.capacity.totalBeds === 'number') {
          setCapacity(stateData.capacity);
        }
        return;
      }
    } catch (err) {
      console.warn('Failed to refresh server state from /api/state:', err);
    }
  };

  const getActiveMedicalOfficerIdentity = (): string => {
    if (inchargeSession?.inchargeName) {
      return `${inchargeSession.inchargeName} (${inchargeSession.designation || 'Medical Officer I/C'})`;
    }
    if (currentUser?.displayName) {
      return `${currentUser.displayName} (Medical Officer)`;
    }
    return 'Dr. S.C. Bishnoi (Senior Medical Officer I/C)';
  };

  const approveRedistribution = async (
    id: string,
    customTransfer?: {
      medicineName: string;
      transferQuantity: number;
      sourcePHCId: string;
      sourcePHCName: string;
      targetPHCId: string;
      targetPHCName: string;
      transitDistanceKm?: number;
      estimatedTransitTimeHours?: number;
      clinicalRationale?: string;
    },
    confirmedByUser?: boolean
  ): Promise<boolean> => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void approveRedistribution(id, customTransfer, confirmedByUser);
      };
      setPendingActionLabel(`Initiate / approve inter-PHC transfer (${id})`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return false;
    }
    const existing = redistributions.find((r) => r.id === id);
    if (
      existing &&
      (existing.status === 'APPROVED' ||
        existing.status === 'DISPATCHED' ||
        existing.status === 'IN_TRANSIT' ||
        existing.status === 'RECEIVED' ||
        existing.status === 'COMPLETED' ||
        existing.donorDeducted)
    ) {
      notify(`Duplicate Transfer Prevented: Transfer ${id} has already been approved (${existing.status}) and applied to stock.`);
      return false;
    }
    if (existing && (existing.status === 'REJECTED' || existing.status === 'CANCELLED')) {
      notify(`Action Blocked: Transfer ${id} has already been marked as ${existing.status} and cannot trigger a transfer.`);
      return false;
    }

    // Require Medical Officer Review before approving or rejecting any Inter-PHC Transfer Recommendation
    if (!confirmedByUser) {
      const previewMedName = existing?.medicineName || customTransfer?.medicineName || 'Essential Medicine';
      const previewQty =
        Number(
          existing?.recommendedTransferQuantity ||
            existing?.transferQuantity ||
            customTransfer?.transferQuantity
        ) || 100;
      const previewSource =
        existing?.sourcePHCName ||
        existing?.sourcePHC?.name ||
        customTransfer?.sourcePHCName ||
        'Neighboring Donor PHC';
      const previewDest =
        existing?.destinationPHCName ||
        existing?.targetPHC?.name ||
        customTransfer?.targetPHCName ||
        selectedPHC.name;
      const previewDist = existing?.transitDistanceKm ?? customTransfer?.transitDistanceKm ?? 28;
      const previewHours =
        existing?.estimatedTransitTimeHours ?? customTransfer?.estimatedTransitTimeHours ?? 1.2;

      setSafetyModalChecked(false);
      setPendingSafetyAction({
        kind: 'REDISTRIBUTION_TRANSFER',
        title: 'Review AI Redistribution Recommendation',
        redistributionId: id,
        customTransferPayload: customTransfer,
        items: [
          {
            medicineName: previewMedName,
            quantityRequested: previewQty,
            unit: 'Units',
            priority: 'URGENT',
            source: `${previewSource} (Surplus Donor PHC)`,
            destination: `${previewDest} (Receiving PHC)`,
            estimatedDelivery: `~${previewHours} Hours Road Transit (${previewDist} km — Inter-PHC Dispatch)`,
            justification:
              existing?.clinicalRationale ||
              customTransfer?.clinicalRationale ||
              'Lateral surplus balancing transfer recommendation',
            isDuplicate: false
          }
        ]
      });
      return false;
    }

    const reviewerActor = getActiveMedicalOfficerIdentity();

    if (!isOfflineMode) {
      try {
        const res = await fetch('/api/redistributions/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, customTransfer, actor: reviewerActor })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(data.error || 'Transfer validation failed: insufficient donor stock.');
          return false;
        }

        if (Array.isArray(data.allRedistributions)) {
          setRedistributions(data.allRedistributions);
        } else if (data.redistribution) {
          setRedistributions((prev) => {
            const exists = prev.some((r) => r.id === data.redistribution.id);
            return exists
              ? prev.map((r) => (r.id === data.redistribution.id ? data.redistribution : r))
              : [data.redistribution, ...prev];
          });
        }
        if (data.auditEntry) {
          setSupplyChainAuditLog((prev) => [data.auditEntry, ...prev.filter((a) => a.transactionId !== data.auditEntry.transactionId)]);
        }

        const invRes = await fetch(`/api/inventory?phcId=${encodeURIComponent(selectedPHC.id)}`);
        if (invRes.ok) {
          setMedicines(await invRes.json());
        }

        const approvedMedName = data.redistribution?.medicineName || customTransfer?.medicineName || '';
        const approvedQty =
          Number(data.redistribution?.recommendedTransferQuantity || customTransfer?.transferQuantity) || 0;
        const approvedSourceId = data.redistribution?.sourcePHC?.id || customTransfer?.sourcePHCId || '';
        const approvedTargetId = data.redistribution?.targetPHC?.id || customTransfer?.targetPHCId || '';
        if (approvedMedName && approvedQty > 0) {
          if (approvedSourceId && approvedSourceId !== selectedPHC.id && facilityInventories[approvedSourceId]) {
            const srcMatch = resolveMedicineMatch(facilityInventories[approvedSourceId], approvedMedName);
            if (srcMatch.status === 'MATCHED') {
              updateFacilityMedicineStock(approvedSourceId, srcMatch.medicine.id, {
                currentStock: Math.max(0, srcMatch.medicine.currentStock - approvedQty)
              });
            }
          }
          if (approvedTargetId && approvedTargetId !== selectedPHC.id && facilityInventories[approvedTargetId]) {
            const tgtMatch = resolveMedicineMatch(facilityInventories[approvedTargetId], approvedMedName);
            if (tgtMatch.status === 'MATCHED') {
              updateFacilityMedicineStock(approvedTargetId, tgtMatch.medicine.id, {
                currentStock: tgtMatch.medicine.currentStock + approvedQty
              });
            }
          }
        }

        notify(
          `Approved by ${reviewerActor}: inter-PHC transfer of ${
            data.redistribution?.recommendedTransferQuantity || customTransfer?.transferQuantity || ''
          } units of ${data.redistribution?.medicineName || customTransfer?.medicineName}. Donor & recipient ledgers updated.`
        );
        return true;
      } catch {
        // Network failure: fall through to offline local transfer validation
      }
    }

    // Offline local fallback (idempotent, validates stock if donor is active PHC)
    const transferQty =
      Number(
        existing?.recommendedTransferQuantity ||
          existing?.transferQuantity ||
          customTransfer?.transferQuantity
      ) || 0;
    if (transferQty <= 0) {
      notify('Invalid transfer quantity: must be greater than 0.');
      return false;
    }

    const medName = existing?.medicineName || customTransfer?.medicineName || '';
    const sourcePhcId = existing?.sourcePHC?.id || customTransfer?.sourcePHCId || '';
    const targetPhcId = existing?.targetPHC?.id || customTransfer?.targetPHCId || selectedPHC.id;

    const match = resolveMedicineMatch(medicines, medName);
    if ((sourcePhcId === selectedPHC.id || targetPhcId === selectedPHC.id) && match.status !== 'MATCHED') {
      notify(match.reason);
      return false;
    }

    if (sourcePhcId === selectedPHC.id && match.status === 'MATCHED') {
      if (match.medicine.currentStock < transferQty) {
        notify(
          `Insufficient donor stock at ${selectedPHC.name}: requested ${transferQty} ${match.medicine.unit}, available ${match.medicine.currentStock} ${match.medicine.unit}.`
        );
        return false;
      }
    }

    if (match.status === 'MATCHED') {
      const matchedId = match.medicine.id;
      setMedicines((prev) =>
        prev.map((m) => {
          if (m.id !== matchedId) return m;
          if (sourcePhcId === selectedPHC.id) {
            const nextStock = Math.max(0, m.currentStock - transferQty);
            const nextDays = m.dailyConsumption > 0 ? Number((nextStock / m.dailyConsumption).toFixed(1)) : 99;
            return { ...m, currentStock: nextStock, projectedStockoutDays: nextDays };
          }
          if (targetPhcId === selectedPHC.id) {
            const nextStock = m.currentStock + transferQty;
            const nextDays = m.dailyConsumption > 0 ? Number((nextStock / m.dailyConsumption).toFixed(1)) : 99;
            return { ...m, currentStock: nextStock, projectedStockoutDays: nextDays, stockoutRisk: 'NORMAL' };
          }
          return m;
        })
      );
    }

    if (sourcePhcId && sourcePhcId !== selectedPHC.id && facilityInventories[sourcePhcId]) {
      const srcMatch = resolveMedicineMatch(facilityInventories[sourcePhcId], medName);
      if (srcMatch.status === 'MATCHED') {
        updateFacilityMedicineStock(sourcePhcId, srcMatch.medicine.id, {
          currentStock: Math.max(0, srcMatch.medicine.currentStock - transferQty)
        });
      }
    }
    if (targetPhcId && targetPhcId !== selectedPHC.id && facilityInventories[targetPhcId]) {
      const tgtMatch = resolveMedicineMatch(facilityInventories[targetPhcId], medName);
      if (tgtMatch.status === 'MATCHED') {
        updateFacilityMedicineStock(targetPhcId, tgtMatch.medicine.id, {
          currentStock: tgtMatch.medicine.currentStock + transferQty
        });
      }
    }

    const nowIso = new Date().toISOString();
    const txnId = `TXN-${Date.now()}`;
    const prevStatus = existing?.status || 'PENDING_REVIEW';
    const donorLabel = existing?.sourcePHCName || existing?.sourcePHC?.name || customTransfer?.sourcePHCName || 'Donor PHC';
    const recipientLabel = existing?.destinationPHCName || existing?.targetPHC?.name || customTransfer?.targetPHCName || selectedPHC.name;
    const historyEntry: StatusTransitionRecord = {
      transactionId: txnId,
      previousStatus: prevStatus,
      newStatus: 'APPROVED',
      timestamp: nowIso,
      actor: reviewerActor,
      note: `Approved by ${reviewerActor}: deducted -${transferQty} units from ${donorLabel} & credited +${transferQty} units to ${recipientLabel}`
    };
    const auditEntry: SupplyChainAuditEntry = {
      transactionId: txnId,
      entityId: id,
      entityType: 'INTER_PHC_TRANSFER',
      medicineName: medName,
      quantity: transferQty,
      unit: 'Units',
      source: donorLabel,
      destination: recipientLabel,
      timestamp: nowIso,
      previousStatus: prevStatus,
      newStatus: 'APPROVED',
      actor: reviewerActor,
      stockImpactSummary: historyEntry.note
    };
    setSupplyChainAuditLog((prev) => [auditEntry, ...prev]);

    if (existing) {
      setRedistributions((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'APPROVED',
                donorDeducted: true,
                receiverCredited: true,
                reviewedBy: reviewerActor,
                reviewedAt: nowIso,
                approvedBy: reviewerActor,
                approvedAt: nowIso,
                statusHistory: [...(r.statusHistory || []), historyEntry]
              }
            : r
        )
      );
    } else if (customTransfer) {
      const newRedist: RedistributionOpportunity = {
        id: id || `REDIST-${Date.now().toString().slice(-6)}`,
        medicineName: customTransfer.medicineName,
        batchNumber: 'FEFO-VERIFIED',
        transferQuantity: transferQty,
        recommendedTransferQuantity: transferQty,
        sourcePHCName: customTransfer.sourcePHCName,
        destinationPHCName: customTransfer.targetPHCName,
        clinicalRationale: customTransfer.clinicalRationale || 'Inter-PHC Lateral Transfer',
        transitDistanceKm: customTransfer.transitDistanceKm || 25,
        estimatedTransitTimeHours: customTransfer.estimatedTransitTimeHours || 0.8,
        status: 'APPROVED',
        donorDeducted: true,
        receiverCredited: true,
        reviewedBy: reviewerActor,
        reviewedAt: nowIso,
        approvedBy: reviewerActor,
        approvedAt: nowIso,
        statusHistory: [historyEntry]
      };
      setRedistributions((prev) => [newRedist, ...prev]);
    }

    notify(`Approved by ${reviewerActor}: inter-facility redistribution applied to local stock.`);
    return true;
  };

  const rejectRedistribution = async (id: string, reason?: string): Promise<boolean> => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void rejectRedistribution(id, reason);
      };
      setPendingActionLabel(`Reject inter-PHC transfer recommendation (${id})`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return false;
    }
    const existing = redistributions.find((r) => r.id === id);
    if (!existing) {
      notify(`Redistribution recommendation #${id} not found.`);
      return false;
    }
    if (
      existing.status !== 'PENDING_REVIEW' &&
      existing.status !== 'PROPOSED'
    ) {
      notify(`Cannot reject recommendation #${id}: current status is ${existing.status}.`);
      return false;
    }

    const reviewerActor = getActiveMedicalOfficerIdentity();
    const cleanReason = (reason || '').trim() || 'Rejected by Medical Officer during clinical review';

    if (!isOfflineMode) {
      try {
        const res = await fetch('/api/redistributions/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            targetStatus: 'REJECTED',
            reason: cleanReason,
            actor: reviewerActor
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(data.error || `Failed to reject recommendation #${id}.`);
          return false;
        }
        if (Array.isArray(data.allRedistributions)) {
          setRedistributions(data.allRedistributions);
        } else if (data.redistribution) {
          setRedistributions((prev) => prev.map((r) => (r.id === id ? data.redistribution : r)));
        }
        if (data.auditEntry) {
          setSupplyChainAuditLog((prev) => [data.auditEntry, ...prev.filter((a) => a.transactionId !== data.auditEntry.transactionId)]);
        }
        notify(`Recommendation #${id} rejected by ${reviewerActor}. No stock or transfer executed.`);
        return true;
      } catch {
        // Fall through to offline rejection update
      }
    }

    const nowIso = new Date().toISOString();
    const txnId = `TXN-${Date.now()}`;
    const donorLabel = existing.sourcePHCName || existing.sourcePHC?.name || 'Donor PHC';
    const recipientLabel = existing.destinationPHCName || existing.targetPHC?.name || 'Recipient PHC';
    const qty = existing.recommendedTransferQuantity || existing.transferQuantity || 0;
    const historyEntry: StatusTransitionRecord = {
      transactionId: txnId,
      previousStatus: existing.status,
      newStatus: 'REJECTED',
      timestamp: nowIso,
      actor: reviewerActor,
      note: `Transfer rejected by ${reviewerActor} (${cleanReason}); no stock deducted or transferred`
    };
    const auditEntry: SupplyChainAuditEntry = {
      transactionId: txnId,
      entityId: id,
      entityType: 'INTER_PHC_TRANSFER',
      medicineName: existing.medicineName,
      quantity: qty,
      unit: 'Units',
      source: donorLabel,
      destination: recipientLabel,
      timestamp: nowIso,
      previousStatus: existing.status,
      newStatus: 'REJECTED',
      actor: reviewerActor,
      stockImpactSummary: historyEntry.note,
      notes: cleanReason
    };
    setSupplyChainAuditLog((prev) => [auditEntry, ...prev]);

    setRedistributions((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'REJECTED',
              reviewedBy: reviewerActor,
              reviewedAt: nowIso,
              rejectedBy: reviewerActor,
              rejectedAt: nowIso,
              rejectionReason: cleanReason,
              statusHistory: [...(r.statusHistory || []), historyEntry]
            }
          : r
      )
    );
    notify(`Recommendation #${id} rejected by ${reviewerActor}. No stock or transfer executed.`);
    return true;
  };

  const advanceRedistribution = async (id: string): Promise<boolean> => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void advanceRedistribution(id);
      };
      setPendingActionLabel(`Advance inter-PHC transfer (${id})`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return false;
    }
    const existing = redistributions.find((r) => r.id === id);
    if (!existing) {
      notify(`Redistribution #${id} not found.`);
      return false;
    }
    if (existing.status === 'COMPLETED') {
      notify(`Transfer #${id} is already COMPLETED.`);
      return false;
    }

    if (!isOfflineMode) {
      try {
        const res = await fetch('/api/redistributions/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, actor: getActiveMedicalOfficerIdentity() })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(data.error || `Failed to advance transfer #${id}.`);
          return false;
        }
        if (Array.isArray(data.allRedistributions)) {
          setRedistributions(data.allRedistributions);
        } else if (data.redistribution) {
          setRedistributions((prev) => prev.map((r) => (r.id === id ? data.redistribution : r)));
        }
        if (data.auditEntry) {
          setSupplyChainAuditLog((prev) => [data.auditEntry, ...prev.filter((a) => a.transactionId !== data.auditEntry.transactionId)]);
        }
        const invRes = await fetch(`/api/inventory?phcId=${encodeURIComponent(selectedPHC.id)}`);
        if (invRes.ok) {
          setMedicines(await invRes.json());
        }
        notify(`Transfer #${id} transitioned to status: ${data.redistribution?.status}`);
        return true;
      } catch {
        // Network failure: fall through to offline transition
      }
    }

    const transitionMap: Record<RedistributionOpportunity['status'], RedistributionOpportunity['status']> = {
      'PENDING_REVIEW': 'APPROVED',
      'PROPOSED': 'APPROVED',
      'APPROVED': 'DISPATCHED',
      'DISPATCHED': 'RECEIVED',
      'IN_TRANSIT': 'RECEIVED',
      'RECEIVED': 'RECEIVED',
      'COMPLETED': 'COMPLETED',
      'REJECTED': 'REJECTED',
      'CANCELLED': 'CANCELLED'
    };
    const nextStatus = transitionMap[existing.status];
    const nowIso = new Date().toISOString();
    const reviewerActor = getActiveMedicalOfficerIdentity();
    const txnId = `TXN-${Date.now()}`;
    const donorLabel = existing.sourcePHCName || existing.sourcePHC?.name || 'Donor PHC';
    const recipientLabel = existing.destinationPHCName || existing.targetPHC?.name || 'Recipient PHC';
    const qty = existing.recommendedTransferQuantity || existing.transferQuantity || 0;
    const historyEntry: StatusTransitionRecord = {
      transactionId: txnId,
      previousStatus: existing.status,
      newStatus: nextStatus,
      timestamp: nowIso,
      actor: reviewerActor,
      note: `Transfer transitioned from ${existing.status} to ${nextStatus}`
    };
    const auditEntry: SupplyChainAuditEntry = {
      transactionId: txnId,
      entityId: id,
      entityType: 'INTER_PHC_TRANSFER',
      medicineName: existing.medicineName,
      quantity: qty,
      unit: 'Units',
      source: donorLabel,
      destination: recipientLabel,
      timestamp: nowIso,
      previousStatus: existing.status,
      newStatus: nextStatus,
      actor: reviewerActor,
      stockImpactSummary: historyEntry.note
    };
    setSupplyChainAuditLog((prev) => [auditEntry, ...prev]);

    setRedistributions((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: nextStatus,
              dispatchedAt: nextStatus === 'DISPATCHED' ? nowIso : r.dispatchedAt,
              receivedAt: nextStatus === 'RECEIVED' ? nowIso : r.receivedAt,
              completedAt: nextStatus === 'RECEIVED' ? nowIso : r.completedAt,
              statusHistory: [...(r.statusHistory || []), historyEntry]
            }
          : r
      )
    );
    notify(`Transfer #${id} transitioned to ${nextStatus}.`);
    return true;
  };

  const acknowledgeAlert = async (id: string) => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void acknowledgeAlert(id);
      };
      setPendingActionLabel(`Acknowledge operational alert #${id}`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/alerts/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.alert && data.alert.id) {
            setAlerts((prev) =>
              prev
                .filter((a): a is OperationalAlert => Boolean(a && a.id))
                .map((a) => (a.id === id ? data.alert : a))
            );
            notify(`Alert #${id} marked as ${data.alert.status}.`);
            return;
          }
        }
      }
    } catch {}

    if (isOfflineMode) {
      const alertItem = alerts.find((a) => a && a.id === id);
      addToOfflineQueue({
        module: 'alerts',
        moduleLabel: 'Alert Resolution',
        action: 'ACKNOWLEDGE_INCIDENT',
        entityName: alertItem?.title || `Alert #${id}`,
        payload: {
          alertId: id,
          newStatus:
            alerts.find((a) => a && a.id === id)?.status === 'ACTIVE'
              ? 'ACKNOWLEDGED'
              : 'RESOLVED',
          timestamp: new Date().toISOString()
        }
      });
    }

    setAlerts((prev) =>
      prev
        .filter((a): a is OperationalAlert => Boolean(a && a.id))
        .map((a) => {
          if (a.id === id) {
            return { ...a, status: a.status === 'ACTIVE' ? 'ACKNOWLEDGED' : 'RESOLVED' };
          }
          return a;
        })
    );
    notify(`Alert #${id} status updated.`);
  };

  const toggleConnector = async (id: string, status: 'CONNECTED' | 'NOT CONNECTED' | 'CONFIGURE') => {
    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = () => {
        void toggleConnector(id, status);
      };
      setPendingActionLabel(`Modify system integration settings (${id})`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, status, lastSync: 'Just now' } : c));
    notify(`Integration '${id}' status updated to ${status}.`);
  };

  const scopedOrders = orders.filter((o) => !o.phcId || o.phcId === selectedPHC.id);
  const scopedAlerts = alerts.filter((a) => !a.phcId || a.phcId === selectedPHC.id);
  const scopedOfflineQueue = offlineQueue.filter(
    (item) => !item.facilityId || item.facilityId === selectedPHC.id
  );

  // Authorized Medical Officer Staff Attendance Marking (Single or Batch) with Offline Queue & Audit Trail
  const saveBatchAttendance = async (
    entries: Array<{ staffId: string; status: AttendanceStatus }>,
    dateStr?: string
  ): Promise<boolean> => {
    if (!entries || entries.length === 0) return false;
    const cleanDate = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : todayIsoDate;

    if (!inchargeSessionRef.current) {
      pendingProtectedActionRef.current = async () => {
        await saveBatchAttendance(entries, cleanDate);
      };
      setPendingActionLabel(
        entries.length === 1
          ? `Mark staff attendance (${entries[0].staffId}: ${entries[0].status})`
          : `Save PHC staff attendance (${entries.length} staff records)`
      );
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return false;
    }

    const session = inchargeSessionRef.current;
    const boundPhcId = session.assignedPhcId || session.phcId;
    const boundPhc = facilities.find((f) => f.id === boundPhcId) || activeAttendancePhc;

    // Security: Prevent logged-in officer from modifying attendance for a different PHC
    if (selectedPHC.id !== boundPhc.id) {
      notify(
        `Access Restricted: Officer ${session.officerId} can only mark attendance for ${boundPhc.name}.`
      );
      return false;
    }

    const officerActor = `${session.officerName || session.inchargeName} (${session.officerId})`;
    const nowTime = new Date().toTimeString().slice(0, 5) + ' IST';
    const nowIso = new Date().toISOString();
    const initialSyncStatus = isOfflineMode ? ('QUEUED' as const) : ('SYNCED' as const);

    const phcRoster = staffByPhc[boundPhc.id] || getFacilityStaffDirectory(boundPhc);
    const auditEntriesToAdd: SupplyChainAuditEntry[] = [];

    setAttendanceByPhc((prev) => {
      const existingList = [...(prev[boundPhc.id] || getInitialAttendanceRecordsForPHC(boundPhc, todayIsoDate))];

      for (const item of entries) {
        const member = phcRoster.find((s) => s.id === item.staffId || s.staffCode === item.staffId);
        if (!member || member.phcId !== boundPhc.id) continue;

        const existingIdx = existingList.findIndex(
          (r) => r.staffId === member.id && r.phcId === boundPhc.id && r.date === cleanDate
        );
        const previousStatus: AttendanceStatus =
          existingIdx >= 0
            ? existingList[existingIdx].status
            : (member.status as AttendanceStatus) || 'NOT_MARKED';

        const updatedRec: StaffAttendanceRecord = {
          attendanceId:
            existingIdx >= 0
              ? existingList[existingIdx].attendanceId
              : `ATT-${boundPhc.id}-${cleanDate}-${member.id}`,
          staffId: member.id,
          staffName: member.name,
          designation: member.designation || member.role,
          department: member.department || member.assignedArea,
          phcId: boundPhc.id,
          phcName: boundPhc.name,
          date: cleanDate,
          status: item.status,
          previousStatus,
          markedBy: officerActor,
          markedByOfficerId: session.officerId,
          markedAt: nowTime,
          syncStatus: initialSyncStatus
        };

        if (existingIdx >= 0) {
          existingList[existingIdx] = updatedRec;
        } else {
          existingList.unshift(updatedRec);
        }

        auditEntriesToAdd.push({
          transactionId: `AUD-ATT-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
          entityId: updatedRec.attendanceId,
          entityType: 'STAFF_ATTENDANCE',
          medicineName: `${member.name} (${member.designation || member.role})`,
          quantity: 1,
          unit: 'Staff',
          source: boundPhc.name,
          destination: `Attendance (${cleanDate})`,
          timestamp: nowIso,
          previousStatus,
          newStatus: item.status,
          actor: officerActor,
          stockImpactSummary: `Staff ${member.id} attendance updated: ${previousStatus} → ${item.status} on ${cleanDate}`,
          notes: `PHC: ${boundPhc.name} (${boundPhc.id})`
        });
      }

      return {
        ...prev,
        [boundPhc.id]: existingList
      };
    });

    if (auditEntriesToAdd.length > 0) {
      setSupplyChainAuditLog((prev) => [...auditEntriesToAdd, ...prev]);
    }

    if (isOfflineMode) {
      addToOfflineQueue({
        module: 'attendance',
        moduleLabel: 'Staff Attendance',
        action: 'MARK_STAFF_ATTENDANCE',
        entityName:
          entries.length === 1
            ? `Attendance: ${entries[0].staffId} → ${entries[0].status} (${cleanDate})`
            : `Batch Attendance (${entries.length} staff on ${cleanDate})`,
        quantity: entries.length,
        unit: 'Staff',
        payload: {
          phcId: boundPhc.id,
          date: cleanDate,
          entries,
          markedBy: officerActor
        }
      });
      notify(t.attendance.attendanceQueuedOffline);
      return true;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session.sessionToken) {
        headers.Authorization = `Bearer ${session.sessionToken}`;
      }
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phcId: boundPhc.id,
          date: cleanDate,
          entries,
          markedBy: officerActor,
          sessionToken: session.sessionToken
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      notify(t.attendance.attendanceSaved);
      return true;
    } catch {
      // Network error while marking: mark as QUEUED and push to existing Offline Queue
      setAttendanceByPhc((prev) => {
        const list = prev[boundPhc.id] || [];
        return {
          ...prev,
          [boundPhc.id]: list.map((r) =>
            r.date === cleanDate && entries.some((e) => e.staffId === r.staffId)
              ? { ...r, syncStatus: 'QUEUED' }
              : r
          )
        };
      });
      addToOfflineQueue({
        module: 'attendance',
        moduleLabel: 'Staff Attendance',
        action: 'MARK_STAFF_ATTENDANCE',
        entityName:
          entries.length === 1
            ? `Attendance: ${entries[0].staffId} → ${entries[0].status} (${cleanDate})`
            : `Batch Attendance (${entries.length} staff on ${cleanDate})`,
        quantity: entries.length,
        unit: 'Staff',
        payload: {
          phcId: boundPhc.id,
          date: cleanDate,
          entries,
          markedBy: officerActor
        }
      });
      notify(t.attendance.attendanceQueuedOffline);
      return true;
    }
  };

  const markStaffAttendance = async (
    staffId: string,
    status: AttendanceStatus,
    dateStr?: string
  ): Promise<boolean> => {
    return saveBatchAttendance([{ staffId, status }], dateStr);
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
        facilityInventories,
        updateFacilityMedicineStock,
        capacity,
        staff,
        attendanceRecords,
        markStaffAttendance,
        saveBatchAttendance,
        workforce,
        language,
        setLanguage,
        t,
        weather,
        orders: scopedOrders,
        redistributions,
        supplyChainAuditLog,
        alerts: scopedAlerts,
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
        inchargeSession,
        isAuthModalOpen,
        authModalTab,
        pendingPHCToUnlock,
        pendingActionLabel,
        openAuthModal,
        closeAuthModal,
        authenticatePHCIncharge,
        signOutIncharge,
        requireAuthorizedAccess,

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
        registerPHCData,
        createOrder,
        openBulkRestockPreview,
        advanceOrder,
        approveRedistribution,
        rejectRedistribution,
        advanceRedistribution,
        refreshServerState,
        acknowledgeAlert,
        toggleConnector,
        notificationMessage,
        clearNotification,
        showNotification: notify,

        // Local Storage Offline Queue
        offlineQueue: scopedOfflineQueue,
        isQueueSyncing,
        queueSyncProgress,
        queueSyncSyncedCount,
        queueSyncTotalCount,
        queueSyncCurrentRecord,
        queueRetryState,
        isSyncCompleteBannerVisible,
        dismissSyncCompleteBanner,
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

      {/* Global Simulated Order & Transfer Safety Preview & Explicit Confirmation Modal (Priority 3) */}
      {pendingSafetyAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="safety-order-modal-title"
          className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-4">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                    SIMULATED DEMO ORDER / TRANSFER • NOT A REAL SUBMISSION
                  </span>
                </div>
                <h3 id="safety-order-modal-title" className="font-bold text-base text-white mt-1">
                  {pendingSafetyAction.title}
                </h3>
                <p className="text-xs text-slate-300">
                  Review medicine, quantity, destination, and estimated delivery before confirming.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingSafetyAction(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close confirmation modal"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-950">
              <strong>DEMO SAFETY NOTICE:</strong> This action creates a <strong>simulated order/transfer</strong> in the local demo environment only. Duplicate active orders for the same medicine and destination are automatically blocked.
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-200">
                {pendingSafetyAction.items.map((item, idx) => (
                  <div
                    key={`${item.medicineName}-${idx}`}
                    className={`p-3.5 space-y-1.5 ${
                      item.isDuplicate ? 'bg-rose-50/70' : 'bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-900 text-sm">
                        {idx + 1}. {item.medicineName}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-950 border border-teal-300">
                          +{item.quantityRequested.toLocaleString()} {item.unit}
                        </span>
                        {item.isDuplicate ? (
                          <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                            DUPLICATE BLOCKED (Active #{item.existingOrderId})
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                            READY TO SUBMIT (SIMULATED)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 uppercase font-mono text-[10px] block">
                          Source → Destination
                        </span>
                        <strong className="text-slate-800">{item.source}</strong> →{' '}
                        <strong className="text-teal-900">{item.destination}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase font-mono text-[10px] block">
                          Estimated Delivery Window
                        </span>
                        <strong className="text-slate-800 font-mono">{item.estimatedDelivery}</strong>
                      </div>
                    </div>
                    {item.justification && (
                      <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-700">
                        <span className="text-slate-400 uppercase font-mono text-[10px] block">
                          AI Clinical Rationale & Explainability
                        </span>
                        <span>{item.justification}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {pendingSafetyAction.kind === 'REDISTRIBUTION_TRANSFER' && (
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Reviewing Medical Officer:</span>
                  <span className="font-mono font-bold text-slate-900">{getActiveMedicalOfficerIdentity()}</span>
                </div>
              )}

              {pendingSafetyAction.items.some((i) => !i.isDuplicate) ? (
                <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={safetyModalChecked}
                    onChange={(e) => setSafetyModalChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-semibold text-slate-900 leading-snug">
                    I have verified the medicine(s), quantity, destination facility (<strong>{selectedPHC.name}</strong>), and estimated delivery window above, and explicitly confirm submitting this <strong>simulated demo {pendingSafetyAction.kind === 'REDISTRIBUTION_TRANSFER' ? 'transfer' : 'order'}</strong>.
                  </span>
                </label>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-semibold text-xs">
                  All selected medicine(s) already have an active simulated order in the pipeline for {selectedPHC.name}. Accidental duplicate order creation has been prevented.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPendingSafetyAction(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>

                {pendingSafetyAction.kind === 'REDISTRIBUTION_TRANSFER' && pendingSafetyAction.redistributionId && (
                  <button
                    type="button"
                    disabled={isSubmittingSafetyModal}
                    onClick={async () => {
                      if (!pendingSafetyAction.redistributionId) return;
                      setIsSubmittingSafetyModal(true);
                      try {
                        await rejectRedistribution(
                          pendingSafetyAction.redistributionId,
                          'Rejected by Medical Officer during clinical review'
                        );
                        setPendingSafetyAction(null);
                      } finally {
                        setIsSubmittingSafetyModal(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Reject Recommendation
                  </button>
                )}

                {pendingSafetyAction.items.some((i) => !i.isDuplicate) && (
                  <button
                    type="button"
                    disabled={!safetyModalChecked || isSubmittingSafetyModal}
                    onClick={async () => {
                      if (!safetyModalChecked) return;
                      setIsSubmittingSafetyModal(true);
                      try {
                        if (pendingSafetyAction.kind === 'REDISTRIBUTION_TRANSFER' && pendingSafetyAction.redistributionId) {
                          await approveRedistribution(
                            pendingSafetyAction.redistributionId,
                            pendingSafetyAction.customTransferPayload,
                            true
                          );
                        } else {
                          const eligible = pendingSafetyAction.items.filter((i) => !i.isDuplicate);
                          let createdCount = 0;
                          for (const item of eligible) {
                            const ok = await createOrder({
                              medicineName: item.medicineName,
                              quantityRequested: item.quantityRequested,
                              priority: item.priority,
                              justification: item.justification,
                              confirmedByUser: true
                            });
                            if (ok) createdCount++;
                          }
                          if (eligible.length > 1) {
                            notify(
                              `[SIMULATED DEMO ORDERS] Confirmed & created ${createdCount} simulated replenishment orders for ${selectedPHC.name}.`
                            );
                          }
                        }
                        setPendingSafetyAction(null);
                      } finally {
                        setIsSubmittingSafetyModal(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${
                      !safetyModalChecked || isSubmittingSafetyModal
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer shadow-xs'
                    }`}
                  >
                    {isSubmittingSafetyModal
                      ? 'Submitting...'
                      : pendingSafetyAction.kind === 'REDISTRIBUTION_TRANSFER'
                      ? 'Approve & Execute Transfer'
                      : `Confirm & Submit Simulated Order${
                          pendingSafetyAction.items.filter((i) => !i.isDuplicate).length > 1
                            ? `s (${pendingSafetyAction.items.filter((i) => !i.isDuplicate).length})`
                            : ''
                        }`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
