import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';

// Core Ground-Level Operational Modules
import { HomeOverview } from './components/views/HomeOverview.tsx';
import { MedicineIntelligence } from './components/views/MedicineIntelligence.tsx';
import { RecordsDataCapture } from './components/views/RecordsDataCapture.tsx';
import { VoiceEntry } from './components/views/VoiceEntry.tsx';
import { FacilityCapacity } from './components/views/FacilityCapacity.tsx';
import { WorkforceIntelligence } from './components/views/WorkforceIntelligence.tsx';
import { HealthPreparedness } from './components/views/HealthPreparedness.tsx';
import { OrdersLogistics } from './components/views/OrdersLogistics.tsx';
import { AlertCentre } from './components/views/AlertCentre.tsx';
import { AnalyticsReports } from './components/views/AnalyticsReports.tsx';
import { IntegrationsView } from './components/views/IntegrationsView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';
import { MapNetworkView } from './components/views/MapNetwork/MapNetworkView.tsx';
import { GeminiChatbot } from './components/views/GeminiChatbot.tsx';
import { NationalPHCDirectory } from './components/views/NationalPHCDirectory.tsx';
import { AutonomousAgentsHub } from './components/views/AutonomousAgentsHub.tsx';

import { X, CheckCircle, WifiOff, AlertTriangle, Plus, Sliders } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeModule,
    notificationMessage,
    clearNotification,
    isOfflineMode,
    selectedPHC,
    setActiveModule,
    offlineQueue,
    activeThresholdToast,
    dismissThresholdToast,
    createOrder,
    markProactiveAlertRead
  } = useApp();

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'home':
        return <HomeOverview />;
      case 'agents':
        return <AutonomousAgentsHub />;
      case 'directory':
        return <NationalPHCDirectory />;
      case 'chat':
        return <GeminiChatbot />;
      case 'map':
        return <MapNetworkView />;
      case 'medicine':
        return <MedicineIntelligence />;
      case 'records':
        return <RecordsDataCapture />;
      case 'voice':
        return <VoiceEntry />;
      case 'capacity':
        return <FacilityCapacity />;
      case 'workforce':
        return <WorkforceIntelligence />;
      case 'preparedness':
        return <HealthPreparedness />;
      case 'orders':
        return <OrdersLogistics />;
      case 'alerts':
        return <AlertCentre />;
      case 'analytics':
        return <AnalyticsReports />;
      case 'integrations':
        return <IntegrationsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeOverview />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800 antialiased">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Persistent / Responsive Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Operational Header */}
        <TopBar />

        {/* Proactive Critical Medicine Threshold Breach Alert Banner */}
        {activeThresholdToast && (
          <div
            role="alert"
            aria-live="assertive"
            className={`px-4 py-2.5 text-xs border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs ${
              activeThresholdToast.severity === 'CRITICAL'
                ? 'bg-rose-900 text-white border-rose-950'
                : 'bg-amber-800 text-white border-amber-900'
            }`}
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-200 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-mono text-[10px] uppercase tracking-wider text-rose-200 mr-2">
                  Stock Threshold Alert · {activeThresholdToast.phcName}
                </span>
                <strong className="font-bold">{activeThresholdToast.medicineName}</strong>{' '}
                <span>
                  dropped to{' '}
                  <strong className="font-mono underline">
                    {activeThresholdToast.currentStock.toLocaleString()} {activeThresholdToast.unit}
                  </strong>{' '}
                  (below defined minimum of{' '}
                  <span className="font-mono">
                    {activeThresholdToast.thresholdLevel.toLocaleString()} {activeThresholdToast.unit}
                  </span>{' '}
                  · ~{activeThresholdToast.projectedStockoutDays} days left).
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const qty = Math.max(
                    200,
                    activeThresholdToast.thresholdLevel * 2 - activeThresholdToast.currentStock
                  );
                  createOrder({
                    medicineName: activeThresholdToast.medicineName,
                    quantityRequested: qty,
                    priority:
                      activeThresholdToast.severity === 'CRITICAL'
                        ? 'EMERGENCY_REPLENISHMENT'
                        : 'URGENT',
                    justification: `Threshold alert auto-indent: stock (${activeThresholdToast.currentStock} ${activeThresholdToast.unit}) breached facility minimum threshold (${activeThresholdToast.thresholdLevel} ${activeThresholdToast.unit}).`
                  });
                  markProactiveAlertRead(activeThresholdToast.id);
                  dismissThresholdToast();
                }}
                className="px-2.5 py-1 rounded bg-white text-slate-900 hover:bg-slate-100 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-emerald-700" />
                <span>
                  Order +{Math.max(
                    200,
                    activeThresholdToast.thresholdLevel * 2 - activeThresholdToast.currentStock
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveModule('alerts');
                  dismissThresholdToast();
                }}
                className="px-2.5 py-1 rounded bg-rose-800/80 hover:bg-rose-800 text-rose-100 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-rose-700"
              >
                <Sliders className="w-3 h-3" />
                <span>Thresholds</span>
              </button>

              <button
                type="button"
                onClick={dismissThresholdToast}
                className="p-1 hover:bg-rose-800 rounded text-rose-200 hover:text-white transition-colors cursor-pointer"
                aria-label="Dismiss threshold alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Global Notification Banner */}
        {notificationMessage && (
          <div
            role="status"
            aria-live="polite"
            className="bg-emerald-700 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs border-b border-emerald-800 animate-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-200 shrink-0" aria-hidden="true" />
              <span>{notificationMessage}</span>
            </div>
            <button
              type="button"
              onClick={clearNotification}
              className="p-1 hover:bg-emerald-800 rounded-md transition-colors text-emerald-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Offline Banner when in low-bandwidth rural mode */}
        {isOfflineMode && (
          <div
            role="status"
            className="bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-amber-800" aria-hidden="true" />
              <span>
                Offline Rural Mode Active: Dispensing & orders are saved locally and sync automatically on reconnect.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModule('alerts')}
                className="font-mono text-[10px] bg-amber-900 hover:bg-amber-950 text-amber-50 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
              >
                Offline Queue ({offlineQueue.filter((i) => i.status !== 'SYNCED').length})
              </button>
            </div>
          </div>
        )}

        {/* Scrollable View Container */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar focus:outline-none bg-slate-50"
        >
          <div className="max-w-7xl mx-auto space-y-6">{renderActiveModule()}</div>
        </main>

        {/* Quiet Institutional Footer */}
        <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-2.5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-slate-600">
            <span>
              <strong className="font-semibold text-slate-800">PHC OPERATIONS PORTAL</strong> · Primary Health Centre Clinical & Supply Chain Management
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => setActiveModule('analytics')}
              className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Reports & CSV / PDF Export
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveModule('alerts')}
              className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Stock Thresholds
            </button>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-500">
              {selectedPHC.name} ({selectedPHC.code})
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
