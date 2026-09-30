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
import { OfflineQueueViewer } from './components/views/OfflineQueueViewer.tsx';

import { X, CheckCircle, WifiOff, Wifi, RefreshCw, AlertTriangle, Plus, Sliders, KeyRound, ShieldCheck } from 'lucide-react';
import { evaluateMedicineThresholdAndReplenishment } from './utils/inventoryForecast.ts';
import { PHCAuthPortal } from './components/auth/PHCAuthPortal.tsx';

const MainLayout: React.FC = () => {
  const {
    activeModule,
    notificationMessage,
    clearNotification,
    isOfflineMode,
    toggleOfflineMode,
    selectedPHC,
    facilities,
    medicines,
    setActiveModule,
    offlineQueue,
    isQueueSyncing,
    queueSyncProgress,
    queueSyncSyncedCount,
    queueSyncTotalCount,
    queueSyncCurrentRecord,
    queueRetryState,
    isSyncCompleteBannerVisible,
    dismissSyncCompleteBanner,
    activeThresholdToast,
    dismissThresholdToast,
    createOrder,
    markProactiveAlertRead,
    inchargeSession,
    isAuthModalOpen,
    authModalTab,
    pendingPHCToUnlock,
    pendingActionLabel,
    openAuthModal,
    closeAuthModal,
    authenticatePHCIncharge,
    signOutIncharge,
    signInWithGoogle,
    isAuthLoading,
    showNotification
  } = useApp();

  const pendingOfflineRecordsCount = offlineQueue.filter((i) => i.status !== 'SYNCED').length;
  const syncedOfflineRecordsCount = offlineQueue.filter((i) => i.status === 'SYNCED').length;
  const totalOfflineRecordsCount = offlineQueue.length;
  const overallSyncedPct =
    isQueueSyncing || isSyncCompleteBannerVisible
      ? queueSyncProgress
      : totalOfflineRecordsCount > 0
      ? Math.round((syncedOfflineRecordsCount / totalOfflineRecordsCount) * 100)
      : 100;

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'home':
        return <HomeOverview />;
      case 'medicine':
        return <MedicineIntelligence />;
      case 'preparedness':
        return <HealthPreparedness />;
      case 'orders':
        return <OrdersLogistics />;
      case 'map':
        return <MapNetworkView />;
      case 'directory':
        return <NationalPHCDirectory />;
      case 'records':
        return <RecordsDataCapture />;
      case 'alerts':
        return <AlertCentre />;
      case 'attendance':
      case 'workforce':
        return <WorkforceIntelligence />;
      case 'analytics':
        return <AnalyticsReports />;
      case 'offline-queue':
        return <OfflineQueueViewer />;
      case 'voice':
        return <VoiceEntry />;
      case 'capacity':
        return <FacilityCapacity />;
      case 'integrations':
        return <IntegrationsView />;
      case 'settings':
        return <SettingsView />;
      case 'chatbot':
        return <GeminiChatbot />;
      case 'agents':
        return <AutonomousAgentsHub />;
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
              {(() => {
                const matchedMed = medicines.find((m) => m.id === activeThresholdToast.medicineId);
                const ev = matchedMed
                  ? evaluateMedicineThresholdAndReplenishment(matchedMed)
                  : null;
                const qty = ev
                  ? ev.recommendedOrderQty
                  : Math.max(
                      25,
                      activeThresholdToast.thresholdLevel * 2 - activeThresholdToast.currentStock
                    );
                return (
                  <button
                    type="button"
                    onClick={() => {
                      createOrder({
                        medicineName: activeThresholdToast.medicineName,
                        quantityRequested: qty,
                        priority:
                          activeThresholdToast.severity === 'CRITICAL'
                            ? 'EMERGENCY_REPLENISHMENT'
                            : 'URGENT',
                        justification: `Threshold alert auto-indent (${ev?.breachRuleTitle || 'Safety threshold breach'}): usable stock (${activeThresholdToast.currentStock} ${activeThresholdToast.unit}) breached facility minimum threshold (${activeThresholdToast.thresholdLevel} ${activeThresholdToast.unit}).`
                      });
                      markProactiveAlertRead(activeThresholdToast.id);
                      dismissThresholdToast();
                    }}
                    className="px-2.5 py-1 rounded bg-white text-slate-900 hover:bg-slate-100 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-emerald-700" />
                    <span>Order +{qty.toLocaleString()}</span>
                  </button>
                );
              })()}

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

        {/* Offline & Firestore Reconnect Upload Progress Banner */}
        {(isOfflineMode || isQueueSyncing || isSyncCompleteBannerVisible) && (
          <div
            role="status"
            aria-live="polite"
            className={`border-b px-4 py-2 text-xs font-semibold transition-colors ${
              isOfflineMode
                ? 'bg-amber-100 border-amber-300 text-amber-950'
                : isQueueSyncing
                ? 'bg-blue-50 border-blue-200 text-blue-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {/* Left: Status Description & Active Record */}
              <div className="flex items-center gap-2 min-w-0">
                {isOfflineMode ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-800 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      Offline Rural Mode Active: {pendingOfflineRecordsCount} pending record(s) buffered locally — will upload to Firestore on reconnect.
                    </span>
                  </>
                ) : isQueueSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-blue-700 animate-spin shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {queueRetryState
                        ? `Transient Failure on ${queueRetryState.itemId} · Exponential Backoff Retry (${queueRetryState.attempt}/${queueRetryState.maxRetries}) in ${(
                            queueRetryState.nextDelayMs / 1000
                          ).toFixed(1)}s`
                        : `Connection Restored · Uploading pending records to Firestore (${queueSyncSyncedCount}/${queueSyncTotalCount})${
                            queueSyncCurrentRecord ? ` — ${queueSyncCurrentRecord}` : '...'
                          }`}
                    </span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      Connection Online · Firestore upload complete ({queueSyncSyncedCount}/{queueSyncTotalCount} pending records synchronized).
                    </span>
                  </>
                )}
              </div>

              {/* Right: Visual Progress Bar, Percentage Indicator & Queue Actions */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[240px]">
                  <div
                    role="progressbar"
                    aria-label="Firestore pending records upload progress"
                    aria-valuenow={overallSyncedPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className={`flex-1 h-2 rounded-full overflow-hidden border ${
                      isOfflineMode
                        ? 'bg-amber-200/80 border-amber-300'
                        : isQueueSyncing
                        ? 'bg-blue-200/70 border-blue-300'
                        : 'bg-emerald-200/70 border-emerald-300'
                    }`}
                  >
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isOfflineMode
                          ? 'bg-amber-600'
                          : isQueueSyncing
                          ? 'bg-blue-600'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${overallSyncedPct}%` }}
                    />
                  </div>
                  <span
                    className={`font-mono text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                      isOfflineMode
                        ? 'bg-amber-200/90 text-amber-950'
                        : isQueueSyncing
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {overallSyncedPct}% Uploaded
                  </span>
                </div>

                {isOfflineMode && pendingOfflineRecordsCount > 0 && (
                  <button
                    type="button"
                    onClick={toggleOfflineMode}
                    className="font-mono text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded font-bold transition-colors cursor-pointer"
                  >
                    Go Online & Sync ({pendingOfflineRecordsCount})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModule('alerts')}
                  className={`font-mono text-[10px] px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    isOfflineMode
                      ? 'bg-amber-900 hover:bg-amber-950 text-amber-50'
                      : isQueueSyncing
                      ? 'bg-blue-800 hover:bg-blue-900 text-white'
                      : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                  }`}
                >
                  Offline Queue ({pendingOfflineRecordsCount})
                </button>

                {!isOfflineMode && !isQueueSyncing && isSyncCompleteBannerVisible && (
                  <button
                    type="button"
                    onClick={dismissSyncCompleteBanner}
                    className="p-0.5 rounded hover:bg-emerald-200/70 text-emerald-800 transition-colors cursor-pointer"
                    aria-label="Dismiss sync status banner"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scrollable View Container */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar focus:outline-none bg-linear-to-br from-slate-50 via-teal-50/20 to-slate-100/70"
        >
          <div className="max-w-7xl mx-auto space-y-6">{renderActiveModule()}</div>
        </main>

        {/* Modern Institutional Footer */}
        <footer className="bg-white/95 backdrop-blur-xs border-t border-slate-200/80 px-4 sm:px-6 py-2.5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            {inchargeSession ? (
              <span>
                <strong className="font-semibold text-slate-800">MEDRESQ PHC PORTAL</strong> · Signed in as{' '}
                <strong className="text-teal-800">
                  {inchargeSession.officerName || inchargeSession.inchargeName}
                </strong>{' '}
                (<span className="font-mono">{inchargeSession.officerId}</span> · {selectedPHC.name})
                {(inchargeSession.loginMode === 'DEMO_ACCESS' || inchargeSession.isDemoAccount) && (
                  <span className="ml-2 font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                    DEMO ACCOUNT · SYNTHETIC DATA
                  </span>
                )}
              </span>
            ) : (
              <span>
                <strong className="font-semibold text-slate-800">MEDRESQ PHC PORTAL</strong> ·{' '}
                <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  DEMO / READ-ONLY MODE
                </span>{' '}
                · Viewing {selectedPHC.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => openAuthModal('signin', selectedPHC)}
              className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                {inchargeSession
                  ? `Session Profile (${inchargeSession.officerId})`
                  : 'Admin / Authorized Access'}
              </span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveModule('analytics')}
              className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Reports &amp; Export
            </button>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-500">
              {selectedPHC.name} ({selectedPHC.code})
            </span>
          </div>
        </footer>

        {/* Authorized Access / Officer Session Modal */}
        {isAuthModalOpen && (
          <PHCAuthPortal
            facilities={facilities}
            selectedPHC={selectedPHC}
            targetPHCToUnlock={pendingPHCToUnlock}
            pendingActionLabel={pendingActionLabel}
            isModalMode={true}
            initialTab={authModalTab}
            onAuthenticated={(session, chosenPHC) => {
              authenticatePHCIncharge(session, chosenPHC);
              showNotification(
                `Authenticated Officer ${session.officerId} (${session.officerName || session.inchargeName}) — Authorized access unlocked.`
              );
            }}
            onCloseModal={closeAuthModal}
            onLogout={() => {
              signOutIncharge();
              showNotification('Signed out of authorized session. Returned to DEMO / READ-ONLY MODE.');
            }}
            onGoogleSignIn={signInWithGoogle}
            isAuthLoading={isAuthLoading}
            activeSession={inchargeSession}
          />
        )}
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
