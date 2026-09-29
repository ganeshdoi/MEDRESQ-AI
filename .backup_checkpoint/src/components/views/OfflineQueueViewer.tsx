import React, { useState } from 'react';
import {
  HardDrive,
  RefreshCw,
  WifiOff,
  Wifi,
  Trash2,
  PlusCircle,
  CheckCircle2,
  Clock,
  FileCode2,
  ArrowUpRight,
  Database,
  Layers,
  Copy,
  Check,
  X,
  AlertCircle,
  Eye,
  Mic,
  Pill,
  Truck,
  FileText,
  Bell
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { OfflineQueueItem } from '../../types.ts';
import { EmptyState } from '../ui/EmptyState.tsx';

export const OfflineQueueViewer: React.FC = () => {
  const {
    offlineQueue,
    isQueueSyncing,
    syncOfflineQueue,
    syncQueueItem,
    removeQueueItem,
    clearOfflineQueue,
    addMockOfflineRecord,
    isOfflineMode,
    toggleOfflineMode,
    selectedPHC,
    showNotification
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'SYNCED'>('ALL');
  const [selectedItemForPayload, setSelectedItemForPayload] = useState<OfflineQueueItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute total byte size and pending counts
  const totalBytes = offlineQueue.reduce((acc, item) => acc + (item.byteSize || 0), 0);
  const formattedSize = totalBytes > 1024 ? `${(totalBytes / 1024).toFixed(2)} KB` : `${totalBytes} B`;
  const pendingItems = offlineQueue.filter(item => item.status !== 'SYNCED');
  const syncedItems = offlineQueue.filter(item => item.status === 'SYNCED');

  const filteredQueue = offlineQueue.filter(item => {
    if (filterStatus === 'PENDING') return item.status !== 'SYNCED';
    if (filterStatus === 'SYNCED') return item.status === 'SYNCED';
    return true;
  });

  const getModuleIcon = (module: OfflineQueueItem['module']) => {
    switch (module) {
      case 'voice':
        return <Mic className="w-4 h-4 text-emerald-600" />;
      case 'medicine':
        return <Pill className="w-4 h-4 text-rose-600" />;
      case 'orders':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'records':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'alerts':
        return <Bell className="w-4 h-4 text-purple-600" />;
      default:
        return <Database className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showNotification('Payload JSON copied to clipboard.');
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(offlineQueue, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medresq_offline_queue_${selectedPHC.id}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Local offline queue exported as JSON file.');
  };

  return (
    <div className="space-y-5">
      {/* Telemetry and Network Synchronization Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          isOfflineMode
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              isOfflineMode ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-200/80 text-emerald-900'
            }`}
          >
            {isOfflineMode ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm">
                {isOfflineMode ? 'Low-Bandwidth Offline Sync Mode Active' : 'Real-Time Central Cloud Connection Active'}
              </span>
              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                  isOfflineMode ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                }`}
              >
                {isOfflineMode ? 'BUFFERING TO LOCAL STORAGE' : 'ONLINE · READY TO SYNC'}
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {isOfflineMode
                ? 'Clinical staff actions (voice entries, drug consumption, stock orders) are secured in browser LocalStorage until network reconnects.'
                : 'Transactions can be instantly synced and committed to the Rajasthan State Health server and Firebase ledger.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={toggleOfflineMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              isOfflineMode
                ? 'bg-white hover:bg-amber-100 text-amber-900 border-amber-400'
                : 'bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-400'
            }`}
          >
            {isOfflineMode ? 'Simulate Reconnect (Go Online)' : 'Simulate Outage (Go Offline)'}
          </button>
        </div>
      </div>

      {/* Storage Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Records</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {pendingItems.length}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Waiting to commit</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Synced Records</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {syncedItems.length}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Committed to cloud</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Storage Footprint</span>
            <HardDrive className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formattedSize}
          </div>
          <span className="text-[11px] text-slate-500 font-mono truncate block" title="localStorage['medresq_offline_queue']">
            localStorage key
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Target Node</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm font-bold font-mono text-blue-800 mt-2 truncate" title="RMSCL e-Aushadhi / Firebase">
            e-Aushadhi / Cloud
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Auto-retry on reconnect</span>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Filter Queue:</span>
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({offlineQueue.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PENDING')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterStatus === 'PENDING' ? 'bg-white text-amber-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Sync ({pendingItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('SYNCED')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                filterStatus === 'SYNCED' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Synced ({syncedItems.length})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addMockOfflineRecord}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Inject an offline record to verify queuing pipeline"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>Simulate Offline Record</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={offlineQueue.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Export local buffer JSON for offline audit compliance"
          >
            <FileCode2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Export JSON</span>
          </button>

          {syncedItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const pendingOnly = offlineQueue.filter(i => i.status !== 'SYNCED');
                localStorage.setItem('medresq_offline_queue', JSON.stringify(pendingOnly));
                window.location.reload();
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Purge all already-synchronized entries"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Synced</span>
            </button>
          )}

          <button
            type="button"
            onClick={syncOfflineQueue}
            disabled={isQueueSyncing || pendingItems.length === 0}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isQueueSyncing ? 'animate-spin' : ''}`} />
            <span>{isQueueSyncing ? 'Synchronizing Queue...' : `Sync Queue Now (${pendingItems.length})`}</span>
          </button>
        </div>
      </div>

      {/* Queue Item List */}
      <div className="space-y-3">
        {filteredQueue.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
            <EmptyState
              icon={HardDrive}
              title="Local Storage Queue is Empty"
              description="No offline records match the selected filter. When transactions are recorded offline, they will buffer here with automatic retry protocols."
              actionText="Simulate Sample Offline Record"
              onAction={addMockOfflineRecord}
            />
          </div>
        ) : (
          filteredQueue.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.status === 'SYNCED'
                  ? 'bg-slate-50/80 border-slate-200 opacity-80'
                  : item.status === 'SYNCING'
                  ? 'bg-blue-50/80 border-blue-300 shadow-xs'
                  : 'bg-amber-50/40 border-amber-200/90 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                  {getModuleIcon(item.module)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                      {item.id}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.moduleLabel}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-[11px] text-slate-500 font-medium">
                      {item.action}
                    </span>

                    {/* Status Badge */}
                    {item.status === 'SYNCED' ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded">
                        <Check className="w-3 h-3 text-emerald-700" />
                        SYNCED TO CLOUD
                      </span>
                    ) : item.status === 'SYNCING' ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        TRANSMITTING...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3 text-amber-700" />
                        WAITING FOR SYNC
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                    <span>{item.entityName}</span>
                    {item.quantity && (
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.quantity} {item.unit || 'units'}
                      </span>
                    )}
                  </div>

                  {/* Metadata and Payload Summary */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono">
                    <span>Facility: <strong>{item.facilityName}</strong></span>
                    <span>·</span>
                    <span>Buffered: <strong>{item.formattedTime}</strong></span>
                    <span>·</span>
                    <span>Size: <strong>{item.byteSize} B</strong></span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => setSelectedItemForPayload(item)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Inspect raw JSON payload buffered in LocalStorage"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Inspect JSON</span>
                </button>

                {item.status !== 'SYNCED' && (
                  <button
                    type="button"
                    onClick={() => syncQueueItem(item.id)}
                    disabled={isQueueSyncing}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Sync Item</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeQueueItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove record from local storage queue"
                  aria-label="Remove record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Raw Payload Inspector Modal */}
      {selectedItemForPayload && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payload-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-200 text-slate-700 rounded-lg">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="payload-modal-title" className="font-bold text-sm text-slate-900">
                    Offline Queue Payload Inspector
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {selectedItemForPayload.id} · Key: localStorage['medresq_offline_queue']
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForPayload(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                aria-label="Close inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: JSON View */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-2">
                <span>Serialized Document Payload ({selectedItemForPayload.byteSize} Bytes)</span>
                <button
                  type="button"
                  onClick={() => handleCopyPayload(selectedItemForPayload)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] leading-relaxed custom-scrollbar shadow-inner">
                <pre>{JSON.stringify(selectedItemForPayload, null, 2)}</pre>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2 font-sans">
                <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Store & Forward Protocol:</span>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    This JSON document is stored locally on the clinical client device. When internet connectivity is restored, this payload is POSTed to the central API and recorded in the Firestore audit collection.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-mono">
                Status: <strong>{selectedItemForPayload.status}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemForPayload(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Close
                </button>
                {selectedItemForPayload.status !== 'SYNCED' && (
                  <button
                    type="button"
                    onClick={() => {
                      syncQueueItem(selectedItemForPayload.id);
                      setSelectedItemForPayload(null);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Sync This Record Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
