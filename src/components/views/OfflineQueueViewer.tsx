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
  Bell,
  Download,
  FileSpreadsheet,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { OfflineQueueItem } from '../../types.ts';
import { EmptyState } from '../ui/EmptyState.tsx';

export const OfflineQueueViewer: React.FC = () => {
  const {
    offlineQueue,
    isQueueSyncing,
    queueSyncProgress,
    queueSyncSyncedCount,
    queueSyncTotalCount,
    queueSyncCurrentRecord,
    queueRetryState,
    isSyncCompleteBannerVisible,
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
  const [exportScope, setExportScope] = useState<'PENDING_ONLY' | 'ALL_RECORDS'>('PENDING_ONLY');
  const [lastExportSummary, setLastExportSummary] = useState<{
    format: 'JSON' | 'CSV';
    count: number;
    fileName: string;
    timestamp: string;
  } | null>(null);

  // Compute total byte size and pending counts
  const totalBytes = offlineQueue.reduce((acc, item) => acc + (item.byteSize || 0), 0);
  const formattedSize = totalBytes > 1024 ? `${(totalBytes / 1024).toFixed(2)} KB` : `${totalBytes} B`;
  const pendingItems = offlineQueue.filter(item => item.status !== 'SYNCED');
  const syncedItems = offlineQueue.filter(item => item.status === 'SYNCED');
  const failedRetryItems = offlineQueue.filter(item => item.status === 'FAILED_RETRY' || item.retryCount > 0);
  const pendingBytes = pendingItems.reduce((acc, item) => acc + (item.byteSize || 0), 0);
  const formattedPendingSize = pendingBytes > 1024 ? `${(pendingBytes / 1024).toFixed(2)} KB` : `${pendingBytes} B`;

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

  // Helper to escape CSV values safely according to RFC 4180
  const escapeCsvCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Convert an array of OfflineQueueItem records to an RFC-4180 CSV string with UTF-8 BOM
  const buildCsvFromRecords = (recordsToExport: OfflineQueueItem[]): string => {
    const headers = [
      'Record_ID',
      'Status',
      'Module',
      'Module_Label',
      'Action',
      'Entity_Medicine_Name',
      'Quantity',
      'Unit',
      'Facility_ID',
      'Facility_Name',
      'Timestamp_ISO',
      'Buffered_Time',
      'Retry_Count',
      'Byte_Size',
      'Error_Message',
      'Raw_Payload_JSON'
    ];

    const rows = recordsToExport.map((item) =>
      [
        item.id,
        item.status,
        item.module,
        item.moduleLabel,
        item.action,
        item.entityName,
        item.quantity ?? '',
        item.unit ?? '',
        item.facilityId,
        item.facilityName,
        item.timestamp,
        item.formattedTime,
        item.retryCount,
        item.byteSize,
        item.errorMessage ?? '',
        JSON.stringify(item.payload || {})
      ]
        .map(escapeCsvCell)
        .join(',')
    );

    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  };

  // Trigger a browser file download using Blob and URL.createObjectURL
  const triggerFileDownload = (content: string, mimeType: string, fileName: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleExportRecords = (
    format: 'JSON' | 'CSV',
    scopeOverride?: 'PENDING_ONLY' | 'ALL_RECORDS',
    singleRecord?: OfflineQueueItem
  ) => {
    const activeScope = scopeOverride || exportScope;
    const targetRecords = singleRecord
      ? [singleRecord]
      : activeScope === 'PENDING_ONLY'
      ? pendingItems
      : offlineQueue;

    if (targetRecords.length === 0) {
      showNotification(
        activeScope === 'PENDING_ONLY'
          ? 'No pending unsynced records to export. Switch scope to "All Queue Records" if you wish to export synced history.'
          : 'Offline queue is empty — no records to export.'
      );
      return;
    }

    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const scopeSlug = singleRecord
      ? `record_${singleRecord.id}`
      : activeScope === 'PENDING_ONLY'
      ? 'pending_recovery'
      : 'full_queue';

    if (format === 'JSON') {
      const exportPayload = {
        recoveryMetadata: {
          exportedAt: new Date().toISOString(),
          facilityId: selectedPHC.id,
          facilityName: selectedPHC.name,
          exportScope: singleRecord ? 'SINGLE_RECORD' : activeScope,
          totalRecordsExported: targetRecords.length,
          totalBytes: targetRecords.reduce((sum, r) => sum + (r.byteSize || 0), 0),
          localStorageKey: 'medresq_offline_queue'
        },
        records: targetRecords
      };
      const fileName = `medresq_${scopeSlug}_${selectedPHC.id}_${dateStamp}.json`;
      triggerFileDownload(
        JSON.stringify(exportPayload, null, 2),
        'application/json;charset=utf-8',
        fileName
      );
      setLastExportSummary({
        format: 'JSON',
        count: targetRecords.length,
        fileName,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      showNotification(
        `Exported ${targetRecords.length} ${
          activeScope === 'PENDING_ONLY' && !singleRecord ? 'pending ' : ''
        }record(s) as JSON (${fileName}).`
      );
    } else {
      const csvContent = buildCsvFromRecords(targetRecords);
      const fileName = `medresq_${scopeSlug}_${selectedPHC.id}_${dateStamp}.csv`;
      triggerFileDownload(csvContent, 'text/csv;charset=utf-8', fileName);
      setLastExportSummary({
        format: 'CSV',
        count: targetRecords.length,
        fileName,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      showNotification(
        `Exported ${targetRecords.length} ${
          activeScope === 'PENDING_ONLY' && !singleRecord ? 'pending ' : ''
        }record(s) as CSV (${fileName}).`
      );
    }
  };

  const handleCopyPendingCsvOrJson = (format: 'JSON' | 'CSV') => {
    const targetRecords = exportScope === 'PENDING_ONLY' ? pendingItems : offlineQueue;
    if (targetRecords.length === 0) {
      showNotification('No records available for the selected scope to copy.');
      return;
    }
    const text =
      format === 'JSON'
        ? JSON.stringify(targetRecords, null, 2)
        : buildCsvFromRecords(targetRecords);
    navigator.clipboard.writeText(text);
    showNotification(
      `Copied ${targetRecords.length} ${
        exportScope === 'PENDING_ONLY' ? 'pending ' : ''
      }record(s) in ${format} format to clipboard.`
    );
  };

  return (
    <div className="space-y-5">
      {/* Telemetry and Network Synchronization Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col gap-3.5 transition-all ${
          isOfflineMode
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : isQueueSyncing
            ? 'bg-blue-50/90 border-blue-300 text-blue-950'
            : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                isOfflineMode
                  ? 'bg-amber-200/80 text-amber-900'
                  : isQueueSyncing
                  ? 'bg-blue-200/80 text-blue-900'
                  : 'bg-emerald-200/80 text-emerald-900'
              }`}
            >
              {isOfflineMode ? (
                <WifiOff className="w-5 h-5" />
              ) : isQueueSyncing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Wifi className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm">
                  {isOfflineMode
                    ? 'Low-Bandwidth Offline Sync Mode Active'
                    : isQueueSyncing
                    ? 'Connection Online · Uploading Pending Records to Firestore'
                    : 'Online Demo Server & Firestore Sync Mode Active'}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                    isOfflineMode
                      ? 'bg-amber-200 text-amber-900'
                      : isQueueSyncing
                      ? 'bg-blue-200 text-blue-900'
                      : 'bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {isOfflineMode
                    ? 'BUFFERING TO LOCAL STORAGE'
                    : isQueueSyncing
                    ? `FIRESTORE UPLOAD IN PROGRESS · ${queueSyncProgress}%`
                    : 'ONLINE · READY TO SYNC'}
                </span>
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                {isOfflineMode
                  ? 'Clinical staff actions (voice entries, drug consumption, stock orders) are secured in browser LocalStorage until network reconnects.'
                  : isQueueSyncing
                  ? queueRetryState
                    ? `Exponential Backoff Retry ${queueRetryState.attempt}/${queueRetryState.maxRetries} for ${queueRetryState.itemId} in ${(
                        queueRetryState.nextDelayMs / 1000
                      ).toFixed(1)}s — ${queueRetryState.errorMessage}`
                    : `Uploading record ${queueSyncSyncedCount} of ${queueSyncTotalCount} to Firestore (offline_sync_audit)${
                        queueSyncCurrentRecord ? ` — ${queueSyncCurrentRecord}` : ''
                      }`
                  : 'Transactions sync to the MEDRESQ demo backend server and local/Firestore audit ledger (Simulated e-Aushadhi workflow).'}
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

        {/* Visual Firestore Upload Progress Bar & Percentage Indicator */}
        {(() => {
          const uploadPct =
            isQueueSyncing || isSyncCompleteBannerVisible
              ? queueSyncProgress
              : offlineQueue.length > 0
              ? Math.round((syncedItems.length / offlineQueue.length) * 100)
              : 100;
          return (
            <div className="pt-2 border-t border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center justify-between sm:justify-start gap-2 text-[11px] font-mono">
                <span className="font-bold uppercase tracking-wider">
                  Firestore Upload Progress:
                </span>
                <span>
                  {isQueueSyncing || isSyncCompleteBannerVisible
                    ? `${queueSyncSyncedCount} / ${queueSyncTotalCount} pending records uploaded`
                    : `${syncedItems.length} / ${offlineQueue.length} total queue records synced (${pendingItems.length} pending)`}
                </span>
              </div>
              <div className="flex items-center gap-2.5 min-w-[220px] sm:w-72">
                <div
                  role="progressbar"
                  aria-label="Percentage of pending records uploaded to Firestore"
                  aria-valuenow={uploadPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="flex-1 h-2 bg-white/80 rounded-full overflow-hidden border border-black/10"
                >
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isOfflineMode
                        ? 'bg-amber-600'
                        : isQueueSyncing
                        ? 'bg-blue-600'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold tabular-nums min-w-[42px] text-right">
                  {uploadPct}%
                </span>
              </div>
            </div>
          );
        })()}
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

      {/* Manual Data Recovery & Export Panel for Pending Offline Records */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                failedRetryItems.length > 0
                  ? 'bg-rose-100 text-rose-800'
                  : pendingItems.length > 0
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {failedRetryItems.length > 0 ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-900 text-sm">
                  Manual Offline Data Recovery &amp; Local Export
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">
                  {pendingItems.length} Pending ({formattedPendingSize})
                </span>
                {failedRetryItems.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-bold text-rose-700">
                      {failedRetryItems.length} Retrying / Sync Delayed
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                If persistent network or synchronization issues occur, export all pending locally-stored records as a structured <strong>JSON</strong> recovery package or <strong>CSV</strong> spreadsheet for manual upload into e-Aushadhi / district servers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Export Scope Selector */}
            <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setExportScope('PENDING_ONLY')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  exportScope === 'PENDING_ONLY'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending Only ({pendingItems.length})
              </button>
              <button
                type="button"
                onClick={() => setExportScope('ALL_RECORDS')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  exportScope === 'ALL_RECORDS'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Records ({offlineQueue.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleExportRecords('JSON')}
              disabled={
                (exportScope === 'PENDING_ONLY' ? pendingItems.length : offlineQueue.length) === 0
              }
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Download locally-stored records as a JSON recovery file"
            >
              <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Export {exportScope === 'PENDING_ONLY' ? 'Pending ' : ''}JSON (
                {exportScope === 'PENDING_ONLY' ? pendingItems.length : offlineQueue.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleExportRecords('CSV')}
              disabled={
                (exportScope === 'PENDING_ONLY' ? pendingItems.length : offlineQueue.length) === 0
              }
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Download locally-stored records as a CSV spreadsheet file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>
                Export {exportScope === 'PENDING_ONLY' ? 'Pending ' : ''}CSV (
                {exportScope === 'PENDING_ONLY' ? pendingItems.length : offlineQueue.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyPendingCsvOrJson('CSV')}
              disabled={
                (exportScope === 'PENDING_ONLY' ? pendingItems.length : offlineQueue.length) === 0
              }
              className="px-2.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy CSV data to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy CSV</span>
            </button>
          </div>
        </div>

        {lastExportSummary && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Last Manual Recovery Export: <strong>{lastExportSummary.fileName}</strong> ({lastExportSummary.count} record{lastExportSummary.count === 1 ? '' : 's'} · {lastExportSummary.format})
              </span>
            </span>
            <span className="text-[11px] text-slate-500">Generated at {lastExportSummary.timestamp}</span>
          </div>
        )}
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
            onClick={() => handleExportRecords('JSON', 'PENDING_ONLY')}
            disabled={pendingItems.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Export all pending unsynced records as JSON"
          >
            <FileCode2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Pending JSON</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportRecords('CSV', 'PENDING_ONLY')}
            disabled={pendingItems.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Export all pending unsynced records as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Pending CSV</span>
          </button>

          {syncedItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                syncedItems.forEach((item) => removeQueueItem(item.id));
                showNotification(`Cleared ${syncedItems.length} synchronized record(s) from queue.`);
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
                    ) : item.status === 'FAILED_RETRY' ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded">
                        <RefreshCw className="w-3 h-3 text-rose-700" />
                        BACKOFF RETRY ({item.retryCount || 1})
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
                    {item.retryCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-amber-800 font-bold">Retries: {item.retryCount}</span>
                      </>
                    )}
                  </div>
                  {item.errorMessage && (
                    <div className="text-[11px] font-mono text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded mt-1">
                      {item.errorMessage}
                    </div>
                  )}
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
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-mono">
                Status: <strong>{selectedItemForPayload.status}</strong>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportRecords('JSON', undefined, selectedItemForPayload)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportRecords('CSV', undefined, selectedItemForPayload)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItemForPayload(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
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
