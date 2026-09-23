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
  IntegrationConnector
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
  
  // Actions
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('medical_officer');
  const [facilities] = useState<PHCFacility[]>(FACILITIES);
  const [selectedPHC, setSelectedPHC] = useState<PHCFacility>(FACILITIES[0]);
  const [activeModule, setActiveModuleState] = useState<string>('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const setActiveModule = (module: string) => {
    setActiveModuleState(module);
    setMobileSidebarOpen(false);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };

  const [medicines, setMedicines] = useState<MedicineItem[]>(INITIAL_MEDICINES);
  const [capacity, setCapacity] = useState<CapacityRecord>(INITIAL_CAPACITY);
  const [staff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [workforce] = useState<WorkforceSummary>(INITIAL_WORKFORCE_SUMMARY);
  const [weather] = useState<WeatherPreparedness>(INITIAL_WEATHER);
  const [orders, setOrders] = useState<LogisticsOrder[]>(INITIAL_ORDERS);
  const [redistributions, setRedistributions] = useState<RedistributionOpportunity[]>(INITIAL_REDISTRIBUTION);
  const [alerts, setAlerts] = useState<OperationalAlert[]>(INITIAL_ALERTS);
  const [connectors, setConnectors] = useState<IntegrationConnector[]>(INTEGRATION_CONNECTORS);

  // Sync with backend API if accessible
  useEffect(() => {
    fetch('/api/inventory')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMedicines(data);
        }
      })
      .catch(() => {
        // Safe fallback in offline mode
      });
  }, []);

  const notify = (msg: string) => {
    setNotificationMessage(msg);
    setTimeout(() => {
      setNotificationMessage(null);
    }, 4500);
  };

  const clearNotification = () => setNotificationMessage(null);

  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => {
      const next = !prev;
      notify(next ? 'Switched to Low-Bandwidth Offline Sync Mode. Changes will be buffered locally.' : 'Switched to Online Real-time Sync Mode.');
      return next;
    });
  };

  const consumeMedicine = async (medicineId: string, quantity: number, reason: string) => {
    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/inventory/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicineId, quantity, reason })
        });
        if (res.ok) {
          const data = await res.json();
          setMedicines(prev => prev.map(m => m.id === medicineId ? data.updatedMedicine : m));
          notify(`Logged dispensing of ${quantity} units. Stock updated.`);
          return;
        }
      }
    } catch {
      // Local fallback
    }

    setMedicines(prev => prev.map(m => {
      if (m.id === medicineId) {
        const currentStock = Math.max(0, m.currentStock - quantity);
        const projectedStockoutDays = m.dailyConsumption > 0 ? Number((currentStock / m.dailyConsumption).toFixed(1)) : 99;
        return {
          ...m,
          currentStock,
          projectedStockoutDays,
          stockoutRisk: currentStock <= m.minStockLevel * 0.5 ? 'CRITICAL' : currentStock <= m.minStockLevel ? 'WARNING' : 'NORMAL'
        };
      }
      return m;
    }));
    notify(`Logged dispensing of ${quantity} units (Local buffer).`);
  };

  const verifyOCRRecord = async (record: { medicineName: string; quantity: number; transaction: string; date: string; batch: string }) => {
    try {
      if (!isOfflineMode) {
        await fetch('/api/inventory/verify-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...record, phcId: selectedPHC.id })
        });
      }
    } catch {
      // fallback
    }

    setMedicines(prev => prev.map(m => {
      if (m.name.toLowerCase().includes(record.medicineName.toLowerCase().split(' ')[0])) {
        const isDispense = record.transaction.toLowerCase().includes('dispensed') || record.transaction.toLowerCase().includes('consumption');
        const currentStock = isDispense ? Math.max(0, m.currentStock - record.quantity) : m.currentStock + record.quantity;
        return {
          ...m,
          currentStock,
          projectedStockoutDays: m.dailyConsumption > 0 ? Number((currentStock / m.dailyConsumption).toFixed(1)) : 99
        };
      }
      return m;
    }));

    notify(`OCR Record for "${record.medicineName}" verified and committed to official stock book.`);
  };

  const createOrder = async (orderData: { medicineName: string; quantityRequested: number; priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT'; justification: string }) => {
    const newOrd: LogisticsOrder = {
      id: `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
      phcId: selectedPHC.id,
      phcName: selectedPHC.name,
      medicineName: orderData.medicineName,
      quantityRequested: orderData.quantityRequested,
      source: 'District Drug Warehouse Mandore (RMSCL)',
      destination: `${selectedPHC.name} Store`,
      status: 'APPROVAL PENDING',
      requestDate: '2026-09-22',
      estimatedDelivery: '2026-09-25',
      priority: orderData.priority,
      notes: orderData.justification
    };

    try {
      if (!isOfflineMode) {
        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...orderData, phcId: selectedPHC.id, phcName: selectedPHC.name })
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(prev => [data.order, ...prev]);
          notify(`Replenishment request #${data.order.id} submitted for approval.`);
          return;
        }
      }
    } catch {
      // fallback
    }

    setOrders(prev => [newOrd, ...prev]);
    notify(`Replenishment request #${newOrd.id} created.`);
  };

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
          
          if (data.order.status === 'RECEIVED') {
            // refresh medicines
            const invRes = await fetch('/api/inventory');
            if (invRes.ok) {
              const meds = await invRes.json();
              setMedicines(meds);
            }
          }
          return;
        }
      }
    } catch {
      // fallback
    }

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
          // update medicines
          const invRes = await fetch('/api/inventory');
          if (invRes.ok) {
            setMedicines(await invRes.json());
          }
          return;
        }
      }
    } catch {
      // fallback
    }

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
    } catch {
      // fallback
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
        consumeMedicine,
        verifyOCRRecord,
        createOrder,
        advanceOrder,
        approveRedistribution,
        acknowledgeAlert,
        toggleConnector,
        notificationMessage,
        clearNotification,
        showNotification: notify
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
