import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  BedDouble,
  Users,
  ScanLine,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useApp } from '../../context/AppContext.tsx';
import {
  MOCK_HISTORICAL_CONSUMPTION,
  MOCK_BED_OCCUPANCY_HISTORY,
  MOCK_OCR_ACCURACY_DATA
} from '../../data/mockData.ts';

export const AnalyticsReports: React.FC = () => {
  const { selectedPHC, showNotification } = useApp();
  const [reportRange, setReportRange] = useState('Quarter 3 (Jul – Sep 2026)');

  const handleExport = () => {
    showNotification(`Dossier Generated: ${selectedPHC.name} Operational Health Report for ${reportRange} ready.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-800 bg-slate-200/90 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Health MIS Intelligence
            </span>
            <span className="text-xs text-slate-500 font-mono">Quarterly Administrative Dossier</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Operational Analytics & District Reporting</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Aggregated utilization trends for Chief Medical Officer (CMO) reviews, procurement forecasting, and cadre workload audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={reportRange}
            onChange={(e) => setReportRange(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <option>Quarter 3 (Jul – Sep 2026)</option>
            <option>Quarter 2 (Apr – Jun 2026)</option>
            <option>Fiscal Year 2026-27 YTD</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export District Dossier</span>
          </button>
        </div>
      </div>

      {/* Top 3 KPI Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            OCR Verification Accuracy
          </span>
          <div className="text-3xl font-bold font-mono text-emerald-700 mt-2">96.8%</div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Benchmarked against 480 handwritten register records
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Warehouse Lead Time
          </span>
          <div className="text-3xl font-bold font-mono text-blue-700 mt-2">3.2 Days</div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Down from 6.8 days via automated RMSCL indenting
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Stockout Prevention Rate
          </span>
          <div className="text-3xl font-bold font-mono text-purple-700 mt-2">98.4%</div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Zero stockouts for maternal, neonatal, and snakebite serums
          </p>
        </div>
      </div>

      {/* Charts Grid: 1. Monthly Medicine Consumption Trends + 2. Inpatient Bed Occupancy History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medicine Consumption Trends */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Medicine Consumption Trend (Units Dispensed)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                Monthly Audit
              </span>
            </div>

            <div className="h-64 w-full mt-4 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_HISTORICAL_CONSUMPTION}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="ors" name="ORS Packets" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paracetamol" name="Paracetamol (Tabs)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="amoxicillin" name="Amoxicillin (Caps)" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            ORS demand doubles beginning May–June, corresponding directly with Thar desert temperature spikes above 42°C.
          </p>
        </div>

        {/* Bed Occupancy History */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-sky-600" />
                <span>Bed Occupancy Rate & Surge Load (%)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                Monthly Mean
              </span>
            </div>

            <div className="h-64 w-full mt-4 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_BED_OCCUPANCY_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="inpatient" name="Inpatient Ward (%)" stroke="#0284c7" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="emergency" name="Emergency Obs (%)" stroke="#e11d48" strokeWidth={2} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="maternity" name="Labor / Maternity (%)" stroke="#ec4899" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
            Emergency observation bed load crossed 85% in June during acute heat exhaustion episodes, requiring step-down beds.
          </p>
        </div>
      </div>

      {/* Data Capture Accuracy Table (OCR & Voice Performance) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Data Digitization Engine Precision & Verification Audits
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">
            Audit sample: 1,840 records
          </span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs" role="table">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Register / Input Format</th>
                <th scope="col" className="px-3 py-3 text-right">Samples Processed</th>
                <th scope="col" className="px-3 py-3 text-right">Raw OCR Accuracy</th>
                <th scope="col" className="px-3 py-3 text-right">Staff Corrections</th>
                <th scope="col" className="px-3 py-3 text-right">Post-Verification Precision</th>
                <th scope="col" className="px-3 py-3 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_OCR_ACCURACY_DATA.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors font-mono">
                  <td className="px-4 py-3 font-sans font-bold text-slate-900">{row.type}</td>
                  <td className="px-3 py-3 text-right text-slate-700 font-semibold">{row.processed}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{row.accuracy}%</td>
                  <td className="px-3 py-3 text-right text-slate-500">{row.corrections}</td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-700">100.0%</td>
                  <td className="px-3 py-3 text-center font-sans">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
                      Certified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
          <span>Standards Compliance: ISO 27001 / ABDM Milestone 2 Ready</span>
          <span className="font-mono text-slate-500">Official Report Signature: Dr. Rajesh Sharma, MO I/C</span>
        </div>
      </div>
    </div>
  );
};
