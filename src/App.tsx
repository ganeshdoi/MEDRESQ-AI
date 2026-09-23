import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';

// 12 Operational Modules
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

import { ShieldAlert, X, CheckCircle, WifiOff } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeModule, notificationMessage, clearNotification, isOfflineMode, selectedPHC } = useApp();

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'home':
        return <HomeOverview />;
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

      {/* Persistent / Responsive Left Sidebar with 12 modules */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Operational Header */}
        <TopBar />

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
              <span>Store & Forward Cache Active: Network write operations are saved locally and will auto-sync on reconnect.</span>
            </div>
            <span className="font-mono text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
              OFFLINE BUFFER
            </span>
          </div>
        )}

        {/* Scrollable View Container */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar focus:outline-none"
        >
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveModule()}
          </div>
        </main>

        {/* Operational Safety Disclaimer Footer */}
        <footer className="bg-white border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span>
              <strong>Operational Resource Decision Support Grid:</strong> Calibrated for Primary Health Centres (PHCs). Non-diagnostic. Not for pharmaceutical prescribing.
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 shrink-0 flex items-center gap-2">
            <span>{selectedPHC.name} ({selectedPHC.code})</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Rajasthan Health Cloud</span>
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
