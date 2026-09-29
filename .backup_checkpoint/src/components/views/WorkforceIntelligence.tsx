import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  UserCheck,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FilterX,
  Stethoscope,
  Send,
  Building2
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { INITIAL_STAFF } from '../../data/mockData.ts';
import { StaffMember } from '../../types.ts';

export const WorkforceIntelligence: React.FC = () => {
  const { workforce, staff: contextStaff, selectedPHC, showNotification } = useApp();
  const [filterRole, setFilterRole] = useState('ALL');
  const [localStaffOverrides, setLocalStaffOverrides] = useState<Record<string, StaffMember['status']>>({});
  const [requestSent, setRequestSent] = useState(false);

  const staffList = (contextStaff && contextStaff.length > 0 ? contextStaff : INITIAL_STAFF).map((s) => ({
    ...s,
    status: localStaffOverrides[s.id] || s.status
  }));

  const filteredStaff = staffList.filter((s: StaffMember) => {
    if (filterRole === 'ALL') return true;
    return s.role.toLowerCase().includes(filterRole.toLowerCase());
  });

  const handleToggleStaffStatus = (person: StaffMember) => {
    const cycle: Record<string, StaffMember['status']> = {
      PRESENT: 'FIELD_DUTY',
      FIELD_DUTY: 'ON_LEAVE',
      ON_LEAVE: 'PRESENT'
    };
    const nextStatus = cycle[person.status] || 'PRESENT';
    setLocalStaffOverrides((prev) => ({ ...prev, [person.id]: nextStatus }));
    showNotification(`${person.name} (${person.role}) status updated to ${nextStatus.replace('_', ' ')}.`);
  };

  const handleRebalanceRequest = () => {
    setRequestSent(true);
    showNotification('District CMO Notified: Visiting Medical Officer relocation requisition submitted.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Health Human Resources
            </span>
            <span className="text-xs text-slate-500 font-mono">Sanctioned vs On-Duty</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Clinical Workforce & Roster Intelligence</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Shift scheduling, clinical workload distribution, provider burnout indicators, and field outreach deployment for {selectedPHC.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRebalanceRequest}
            disabled={requestSent}
            className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{requestSent ? 'Relocation Requested' : 'Request Relief Doctor'}</span>
          </button>
        </div>
      </div>

      {/* Workforce Rebalance Advisory Banner */}
      <div
        role="region"
        aria-label="Workforce Rebalance Advisory"
        className="bg-amber-50/90 border-l-4 border-amber-500 rounded-r-xl p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm text-amber-950 flex flex-wrap items-center gap-2">
              <span>Workforce Rebalance Advisory: High Provider Workload Ratio</span>
              <StatusBadge status="WARNING" text="Workload Index: HIGH" />
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              <strong>1 Medical Officer managing 140 OPD patients today</strong> (benchmark: &le;75 patients/doctor/day). Dr. Rajesh Sharma has exceeded the 90th percentile consultation volume. Temporary administrative rebalance of 1 visiting medical officer from Mandore Sub-district Hospital is recommended for Thursday.
            </p>
          </div>
        </div>
      </div>

      {/* Workforce Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block">
            Present On Site
          </span>
          <div className="text-3xl font-bold font-mono text-emerald-700 mt-2">
            {workforce.staffPresentToday} / {workforce.totalStaffSanctioned}
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block font-medium">
            Facility Clinic Staff
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block">
            Field Outreach Duty
          </span>
          <div className="text-3xl font-bold font-mono text-sky-700 mt-2">
            {workforce.staffOnFieldDuty} Staff
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block font-medium">
            ANMs & ASHAs in Villages
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block">
            Authorized Leave
          </span>
          <div className="text-3xl font-bold font-mono text-amber-700 mt-2">
            {workforce.staffOnLeave} Staff
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block font-medium">
            Sanctioned Casual/Medical
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block">
            Burnout Risk
          </span>
          <div className="text-3xl font-bold font-mono text-rose-700 mt-2">
            Elevated
          </div>
          <span className="text-[11px] text-rose-800 font-bold mt-2 block">
            OPD Surge Ratio: 140/Doc
          </span>
        </div>
      </div>

      {/* Staff Roster & Cadre Management Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Duty Roster & Shift Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live attendance and patient consultation count across facility healthcare cadres
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-bold">Cadre:</span>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Cadres ({staffList.length})</option>
              <option value="Medical Officer">Medical Officers</option>
              <option value="Staff Nurse">Staff Nurses</option>
              <option value="ANM">ANMs (Auxiliary Nurse Midwives)</option>
              <option value="ASHA">ASHAs</option>
              <option value="Pharmacist">Pharmacists</option>
              <option value="Lab Technician">Lab Technicians</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {filteredStaff.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FilterX}
                title="No Healthcare Staff Matching Filter"
                description="There are currently no staff members matching the selected cadre filter."
                actionText="Reset Filter"
                onAction={() => setFilterRole('ALL')}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs" role="table">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Staff Member & Cadre</th>
                  <th scope="col" className="px-3 py-3">Assigned Duty / Ward</th>
                  <th scope="col" className="px-3 py-3">Shift</th>
                  <th scope="col" className="px-3 py-3 text-center">Attendance Status (Click to Update)</th>
                  <th scope="col" className="px-3 py-3 text-right">Patients / Day</th>
                  <th scope="col" className="px-3 py-3 text-center">Burnout Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{person.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {person.role} · {person.qualification}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">{person.assignedArea}</div>
                      <div className="text-[11px] text-slate-500">{selectedPHC.name}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-700">
                      {person.shift}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffStatus(person)}
                        title="Click to cycle attendance status"
                        className={`inline-flex items-center gap-1.5 font-semibold text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                          person.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                            : person.status === 'FIELD_DUTY'
                            ? 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100'
                            : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            person.status === 'PRESENT'
                              ? 'bg-emerald-600'
                              : person.status === 'FIELD_DUTY'
                              ? 'bg-sky-600'
                              : 'bg-amber-600'
                          }`}
                        />
                        {person.status.replace('_', ' ')}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {person.patientLoadToday ? person.patientLoadToday : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded ${
                          person.burnoutRisk === 'HIGH'
                            ? 'bg-rose-50 text-rose-900 border border-rose-200'
                            : person.burnoutRisk === 'MODERATE'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {person.burnoutRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
          <span>
            Total rostered cadres: <strong>{staffList.length}</strong>
          </span>
          <span className="text-slate-500">
            Click any staff member&apos;s status to update attendance
          </span>
        </div>
      </div>
    </div>
  );
};
