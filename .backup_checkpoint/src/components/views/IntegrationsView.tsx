import React, { useState } from 'react';
import {
  PlugZap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  CloudSun,
  Database,
  Pill,
  Syringe,
  FileText,
  Lock,
  Radio
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';

export const IntegrationsView: React.FC = () => {
  const { connectors, toggleConnector, selectedPHC, showNotification } = useApp();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = (id: string, name: string) => {
    setSyncingId(id);
    setTimeout(() => {
      toggleConnector(id, 'CONNECTED');
      setSyncingId(null);
      showNotification(`Gateway Synchronization Complete: ${name} data stream refreshed.`);
    }, 1200);
  };

  const getConnectorIcon = (id: string) => {
    switch (id) {
      case 'dvdms_rmscl':
        return <Pill className="w-5 h-5 text-emerald-700" />;
      case 'imd_weather':
        return <CloudSun className="w-5 h-5 text-amber-700" />;
      case 'ihip_surveillance':
        return <Server className="w-5 h-5 text-blue-700" />;
      case 'abdm_health_id':
        return <ShieldCheck className="w-5 h-5 text-purple-700" />;
      case 'hmis_portal':
        return <FileText className="w-5 h-5 text-sky-700" />;
      case 'evin_vaccines':
        return <Syringe className="w-5 h-5 text-rose-700" />;
      default:
        return <PlugZap className="w-5 h-5 text-slate-700" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Interoperability Gateway
            </span>
            <span className="text-xs text-slate-500 font-mono">Central & State Portals</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <PlugZap className="w-5 h-5 text-emerald-600" />
            <span>National & State Digital Health Integrations</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Bi-directional federated connectors linking {selectedPHC.name} with Central ABDM, DVDMS drug warehouses, and IMD meteorological feeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Gateway Protocol:</span>
          <span className="text-xs font-mono font-bold bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            GovData REST / FHIR R4
          </span>
        </div>
      </div>

      {/* Grid of 6 Core Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {connectors.map((conn) => {
          const isSyncing = syncingId === conn.id;
          return (
            <div
              key={conn.id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs shrink-0">
                    {getConnectorIcon(conn.id)}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      conn.status === 'CONNECTED'
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        : conn.status === 'CONFIGURE'
                        ? 'bg-amber-100 text-amber-950 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {conn.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-3">{conn.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                  {conn.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-600 truncate flex items-center justify-between">
                    <span className="text-slate-400">Endpoint:</span>
                    <span className="font-semibold text-slate-800">{conn.endpoint}</span>
                  </div>
                  <div className="text-slate-500 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Telemetry Sync:</span>
                    <span>{conn.lastSync}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSync(conn.id, conn.name)}
                  disabled={isSyncing}
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Gateway'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = conn.status === 'CONNECTED' ? 'NOT CONNECTED' : 'CONNECTED';
                    toggleConnector(conn.id, next);
                    showNotification(`${conn.name} connector status set to ${next}.`);
                  }}
                  className="py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                >
                  {conn.status === 'CONNECTED' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interoperability & Security Compliance Box */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              NDHM / ABDM Sandbox Security Standards Compliance
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            All bi-directional synchronizations utilize mTLS encryption, OAuth 2.0 institutional service accounts, and conform to the National Digital Health Blueprint (NDHB) clinical data security frameworks.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 font-bold bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-700">
            FHIR R4 Compliant
          </span>
        </div>
      </div>
    </div>
  );
};
