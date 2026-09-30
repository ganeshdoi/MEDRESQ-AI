import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FilterX,
  Search,
  Save,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Building2,
  History,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import {
  formatAttendanceStatusLabel,
  formatDesignationLabel
} from '../../i18n/index.ts';
import type {
  AttendanceStatus,
  AttendanceSyncStatus,
  StaffMember,
  StaffAttendanceRecord
} from '../../types.ts';

export const WorkforceIntelligence: React.FC = () => {
  const {
    staff,
    attendanceRecords,
    markStaffAttendance,
    saveBatchAttendance,
    selectedPHC,
    facilities,
    inchargeSession,
    isOfflineMode,
    supplyChainAuditLog,
    language,
    t
  } = useApp();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date(`${todayStr}T00:00:00`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [todayStr]);

  // Security: When a Medical Officer is signed in, strictly lock the view to their assigned PHC
  const boundPhc = useMemo(() => {
    if (inchargeSession) {
      const targetId = inchargeSession.assignedPhcId || inchargeSession.phcId;
      return facilities.find((f) => f.id === targetId) || selectedPHC;
    }
    return selectedPHC;
  }, [inchargeSession, facilities, selectedPHC]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [designationFilter, setDesignationFilter] = useState<string>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);

  // Scoped staff list strictly for boundPhc
  const phcStaffList = useMemo(
    () => staff.filter((s) => s.phcId === boundPhc.id),
    [staff, boundPhc.id]
  );

  // Scoped attendance records strictly for boundPhc
  const phcAttendanceRecords = useMemo(
    () => attendanceRecords.filter((r) => r.phcId === boundPhc.id),
    [attendanceRecords, boundPhc.id]
  );

  // Map each staff member to their attendance record for `selectedDate`
  const staffWithDateAttendance = useMemo(() => {
    return phcStaffList.map((member) => {
      const recForDate = phcAttendanceRecords.find(
        (r) => r.staffId === member.id && r.phcId === boundPhc.id && r.date === selectedDate
      );
      const effectiveStatus: AttendanceStatus = recForDate
        ? recForDate.status
        : selectedDate === todayStr &&
          (member.status === 'PRESENT' ||
            member.status === 'ABSENT' ||
            member.status === 'ON_LEAVE' ||
            member.status === 'NOT_MARKED')
        ? (member.status as AttendanceStatus)
        : 'NOT_MARKED';

      const syncStatus: AttendanceSyncStatus = recForDate?.syncStatus || 'SYNCED';

      return {
        member,
        record: recForDate || null,
        effectiveStatus,
        syncStatus,
        lastMarkedAt: recForDate?.markedAt || (selectedDate === todayStr ? member.lastAttendanceUpdate : undefined),
        lastMarkedBy: recForDate?.markedBy || (selectedDate === todayStr ? member.lastMarkedBy : undefined)
      };
    });
  }, [phcStaffList, phcAttendanceRecords, boundPhc.id, selectedDate, todayStr]);

  // Dynamic Attendance Summary calculated directly from actual attendance records for selectedDate
  const summaryCounts = useMemo(() => {
    const total = staffWithDateAttendance.length;
    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let notMarked = 0;

    for (const row of staffWithDateAttendance) {
      if (row.effectiveStatus === 'PRESENT') present++;
      else if (row.effectiveStatus === 'ABSENT') absent++;
      else if (row.effectiveStatus === 'ON_LEAVE') onLeave++;
      else notMarked++;
    }

    return { total, present, absent, onLeave, notMarked };
  }, [staffWithDateAttendance]);

  // Filtered staff directory (Search by Staff Name, Staff ID, or Designation within boundPhc)
  const filteredDirectoryRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffWithDateAttendance.filter(({ member, effectiveStatus }) => {
      if (directoryStatusFilter !== 'ALL' && effectiveStatus !== directoryStatusFilter) {
        return false;
      }
      const desig = (member.designation || member.role || '').trim();
      if (designationFilter !== 'ALL' && desig.toLowerCase() !== designationFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      const staffCode = (member.staffCode || member.id || '').toLowerCase();
      const name = (member.name || '').toLowerCase();
      const roleStr = desig.toLowerCase();
      const dept = (member.department || member.assignedArea || '').toLowerCase();
      return (
        name.includes(q) ||
        staffCode.includes(q) ||
        roleStr.includes(q) ||
        dept.includes(q)
      );
    });
  }, [staffWithDateAttendance, directoryStatusFilter, designationFilter, searchQuery]);

  // Attendance History rows (including NOT_MARKED staff for the selected date when 'NOT_MARKED' or 'ALL' is chosen)
  const historyRows = useMemo(() => {
    const combined: StaffAttendanceRecord[] = [...phcAttendanceRecords];

    // Also include any staff on selectedDate who are currently NOT_MARKED so the "Not Marked" filter works accurately
    for (const { member, record, effectiveStatus } of staffWithDateAttendance) {
      if (!record && effectiveStatus === 'NOT_MARKED') {
        combined.push({
          attendanceId: `UNMARKED-${boundPhc.id}-${selectedDate}-${member.id}`,
          staffId: member.id,
          staffName: member.name,
          designation: member.designation || member.role,
          department: member.department || member.assignedArea,
          phcId: boundPhc.id,
          phcName: boundPhc.name,
          date: selectedDate,
          status: 'NOT_MARKED',
          markedBy: '—',
          markedAt: '—',
          syncStatus: 'SYNCED'
        });
      }
    }

    return combined.filter((rec) => {
      if (historyStatusFilter !== 'ALL' && rec.status !== historyStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          rec.staffName.toLowerCase().includes(q) ||
          rec.staffId.toLowerCase().includes(q) ||
          rec.designation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [phcAttendanceRecords, staffWithDateAttendance, boundPhc.id, boundPhc.name, selectedDate, historyStatusFilter, searchQuery]);

  // Attendance Audit Entries from unified supplyChainAuditLog
  const attendanceAuditEntries = useMemo(
    () =>
      supplyChainAuditLog.filter(
        (entry) => entry.entityType === 'STAFF_ATTENDANCE' && entry.source === boundPhc.name
      ),
    [supplyChainAuditLog, boundPhc.name]
  );

  const handleMarkSingle = async (staffId: string, status: AttendanceStatus) => {
    await markStaffAttendance(staffId, status, selectedDate);
  };

  const handleSaveAllCurrentDate = async () => {
    setIsSavingBatch(true);
    try {
      const entriesToSave = staffWithDateAttendance.map((row) => ({
        staffId: row.member.id,
        status: row.effectiveStatus === 'NOT_MARKED' ? ('PRESENT' as AttendanceStatus) : row.effectiveStatus
      }));
      await saveBatchAttendance(entriesToSave, selectedDate);
    } finally {
      setIsSavingBatch(false);
    }
  };

  const renderSyncBadge = (syncStatus: AttendanceSyncStatus) => {
    if (syncStatus === 'QUEUED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <WifiOff className="w-3 h-3 text-amber-700" />
          <span>{t.common.queued}</span>
        </span>
      );
    }
    if (syncStatus === 'SYNCING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300">
          <RefreshCw className="w-3 h-3 text-sky-700 animate-spin" />
          <span>{t.common.syncing}</span>
        </span>
      );
    }
    if (syncStatus === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300">
          <AlertCircle className="w-3 h-3 text-rose-700" />
          <span>{t.common.failed}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>{t.common.synced}</span>
      </span>
    );
  };

  const renderStatusPill = (status: AttendanceStatus) => {
    const label = formatAttendanceStatusLabel(status, language);
    if (status === 'PRESENT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>{label}</span>
        </span>
      );
    }
    if (status === 'ABSENT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          <span>{label}</span>
        </span>
      );
    }
    if (status === 'ON_LEAVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6" id="staff-attendance-module">
      {/* 1. Top Header: PHC Name, District, Current Date, and Save Attendance */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="bg-linear-to-r from-slate-900 via-teal-950 to-emerald-950 text-white p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-400/20 border border-teal-400/30 text-teal-200 font-bold text-[11px] font-mono">
                  <Building2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>
                    {boundPhc.name} ({boundPhc.code})
                  </span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-slate-200 font-mono text-[11px]">
                  {t.common.district}: <strong>{boundPhc.district}</strong> · {boundPhc.state}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 font-mono text-[11px] font-bold">
                  {t.attendance.syntheticDataNotice}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <Users className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>
                  {t.attendance.title} — {boundPhc.name}
                </span>
              </h1>

              <p className="text-xs text-teal-100/85 max-w-3xl leading-relaxed">
                {t.attendance.subtitle}
              </p>
            </div>

            {/* Date Picker & Save Attendance Action */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-emerald-300 shrink-0" />
                <label htmlFor="attendance-date-picker" className="text-[11px] font-bold text-teal-100">
                  {t.attendance.date}:
                </label>
                <input
                  id="attendance-date-picker"
                  type="date"
                  value={selectedDate}
                  max={todayStr}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer"
                />
                {selectedDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className="px-2 py-0.5 rounded bg-teal-500/30 hover:bg-teal-500/50 text-[10px] font-mono font-bold text-white cursor-pointer"
                  >
                    {t.common.today}
                  </button>
                )}
              </div>

              <button
                type="button"
                id="save-attendance-btn"
                disabled={isSavingBatch}
                onClick={handleSaveAllCurrentDate}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{t.attendance.saveAttendance}</span>
              </button>
            </div>
          </div>

          {/* Session & Offline Status Bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              {inchargeSession ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {t.attendance.lockedToPhcNotice} ({inchargeSession.officerName} · {inchargeSession.officerId})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-200 font-semibold">
                  <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{t.attendance.readOnlyAttendanceNotice}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 font-mono">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-0.5 rounded border text-[11px] cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-white text-slate-900 border-white font-bold'
                    : 'bg-white/10 text-teal-100 border-white/20 hover:bg-white/20'
                }`}
              >
                {t.common.today} ({todayStr})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(yesterdayStr)}
                className={`px-2.5 py-0.5 rounded border text-[11px] cursor-pointer ${
                  selectedDate === yesterdayStr
                    ? 'bg-white text-slate-900 border-white font-bold'
                    : 'bg-white/10 text-teal-100 border-white/20 hover:bg-white/20'
                }`}
              >
                {yesterdayStr}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Daily Attendance Summary KPI Strip (Calculated dynamically from records) */}
        <div
          className="p-4 sm:p-5 bg-slate-50/80 grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-slate-200"
          role="region"
          aria-label="Attendance Summary"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              {t.attendance.totalStaff}
            </span>
            <div
              id="attendance-summary-total"
              className="text-2xl font-extrabold font-mono text-slate-900 mt-1"
            >
              {summaryCounts.total}
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
              {boundPhc.code} · {selectedDate}
            </span>
          </div>

          <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              {t.attendance.present}
            </span>
            <div
              id="attendance-summary-present"
              className="text-2xl font-extrabold font-mono text-emerald-700 mt-1"
            >
              {summaryCounts.present}
            </div>
            <span className="text-[10px] font-mono text-emerald-800/80 mt-0.5 block">
              ENUM: PRESENT
            </span>
          </div>

          <div className="bg-rose-50/70 rounded-xl border border-rose-200 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">
              {t.attendance.absent}
            </span>
            <div
              id="attendance-summary-absent"
              className="text-2xl font-extrabold font-mono text-rose-700 mt-1"
            >
              {summaryCounts.absent}
            </div>
            <span className="text-[10px] font-mono text-rose-800/80 mt-0.5 block">
              ENUM: ABSENT
            </span>
          </div>

          <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
              {t.attendance.onLeave}
            </span>
            <div
              id="attendance-summary-on-leave"
              className="text-2xl font-extrabold font-mono text-amber-700 mt-1"
            >
              {summaryCounts.onLeave}
            </div>
            <span className="text-[10px] font-mono text-amber-800/80 mt-0.5 block">
              ENUM: ON_LEAVE
            </span>
          </div>

          <div className="bg-slate-100/80 rounded-xl border border-slate-300 p-3.5 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
              {t.attendance.notMarked}
            </span>
            <div
              id="attendance-summary-not-marked"
              className="text-2xl font-extrabold font-mono text-slate-700 mt-1"
            >
              {summaryCounts.notMarked}
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
              ENUM: NOT_MARKED
            </span>
          </div>
        </div>
      </div>

      {/* 3. Staff Directory & Mark Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-700" />
              <span>
                {t.attendance.title} — {boundPhc.name} ({selectedDate})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.attendance.syntheticDataNotice}
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="staff-attendance-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.attendance.searchStaffPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <select
              id="staff-designation-filter"
              aria-label={t.attendance.filterByDesignation}
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">
                {t.common.all} — {t.attendance.designation} ({phcStaffList.length})
              </option>
              <option value="Medical Officer">{t.attendance.designations.medicalOfficer}</option>
              <option value="Staff Nurse">{t.attendance.designations.staffNurse}</option>
              <option value="Pharmacist">{t.attendance.designations.pharmacist}</option>
              <option value="Lab Technician">{t.attendance.designations.labTechnician}</option>
              <option value="ANM">{t.attendance.designations.anm}</option>
              <option value="CHO">{t.attendance.designations.cho}</option>
              <option value="Data Entry Operator">{t.attendance.designations.dataEntryOperator}</option>
              <option value="Other">{t.attendance.designations.other}</option>
            </select>

            <select
              id="staff-status-filter"
              aria-label={t.attendance.filterByStatus}
              value={directoryStatusFilter}
              onChange={(e) => setDirectoryStatusFilter(e.target.value as 'ALL' | AttendanceStatus)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">{t.common.all}</option>
              <option value="PRESENT">{t.attendance.present}</option>
              <option value="ABSENT">{t.attendance.absent}</option>
              <option value="ON_LEAVE">{t.attendance.onLeave}</option>
              <option value="NOT_MARKED">{t.attendance.notMarked}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredDirectoryRows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FilterX}
                title={t.attendance.noStaffFound}
                description={t.attendance.syntheticDataNotice}
                actionText={t.common.all}
                onAction={() => {
                  setSearchQuery('');
                  setDirectoryStatusFilter('ALL');
                  setDesignationFilter('ALL');
                }}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs" role="table">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    {t.attendance.staffId}
                  </th>
                  <th scope="col" className="px-3 py-3">
                    {t.attendance.staffName}
                  </th>
                  <th scope="col" className="px-3 py-3">
                    {t.attendance.designation}
                  </th>
                  <th scope="col" className="px-3 py-3">
                    {t.attendance.departmentRole} &amp; {t.attendance.assignedPhc}
                  </th>
                  <th scope="col" className="px-3 py-3 text-center">
                    {t.attendance.attendanceStatus}
                  </th>
                  <th scope="col" className="px-3 py-3">
                    {t.attendance.lastAttendanceUpdate}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {t.attendance.markAttendance}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDirectoryRows.map(
                  ({ member, effectiveStatus, syncStatus, lastMarkedAt, lastMarkedBy }) => {
                    const rawStaffId = member.staffCode || member.id;
                    const rawDesignation = member.designation || member.role;
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {rawStaffId}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-slate-900">{member.name}</div>
                          <div className="text-[11px] text-slate-500">{member.qualification}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px]">
                            {formatDesignationLabel(rawDesignation, language)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-800">
                            {member.department || member.assignedArea}
                          </div>
                          <div className="text-[11px] font-mono text-teal-800">
                            {boundPhc.name} ({boundPhc.id})
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {renderStatusPill(effectiveStatus)}
                            {renderSyncBadge(syncStatus)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-600">
                          {lastMarkedAt ? (
                            <div>
                              <div className="font-mono font-bold text-slate-800 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>
                                  {selectedDate} · {lastMarkedAt}
                                </span>
                              </div>
                              {lastMarkedBy && (
                                <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                                  {t.attendance.markedBy}: {lastMarkedBy}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">{t.attendance.notMarked}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div
                            className="inline-flex items-center gap-1.5"
                            role="group"
                            aria-label={`${t.attendance.markAttendance} ${member.name}`}
                          >
                            <button
                              type="button"
                              data-testid={`mark-present-${rawStaffId}`}
                              onClick={() => handleMarkSingle(member.id, 'PRESENT')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                effectiveStatus === 'PRESENT'
                                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              {t.attendance.present}
                            </button>
                            <button
                              type="button"
                              data-testid={`mark-absent-${rawStaffId}`}
                              onClick={() => handleMarkSingle(member.id, 'ABSENT')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                effectiveStatus === 'ABSENT'
                                  ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                                  : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                              }`}
                            >
                              {t.attendance.absent}
                            </button>
                            <button
                              type="button"
                              data-testid={`mark-on-leave-${rawStaffId}`}
                              onClick={() => handleMarkSingle(member.id, 'ON_LEAVE')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                effectiveStatus === 'ON_LEAVE'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              {t.attendance.onLeave}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. Compact Attendance History & Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-teal-700" />
              <span>
                {t.attendance.attendanceHistory} &amp; {t.attendance.attendanceAuditLog}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {boundPhc.name} ({boundPhc.id}) · {attendanceAuditEntries.length} audit events recorded
            </p>
          </div>

          {/* History Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'ALL', label: t.common.all },
                { key: 'PRESENT', label: t.attendance.present },
                { key: 'ABSENT', label: t.attendance.absent },
                { key: 'ON_LEAVE', label: t.attendance.onLeave },
                { key: 'NOT_MARKED', label: t.attendance.notMarked }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setHistoryStatusFilter(tab.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  historyStatusFilter === tab.key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {historyRows.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {t.attendance.noHistoryFound}
            </div>
          ) : (
            <table className="w-full text-left text-xs" role="table">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    {t.attendance.date}
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    {t.attendance.staff}
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    {t.attendance.designation}
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    {t.attendance.attendanceStatus}
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    {t.attendance.markedBy}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    {t.attendance.time}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyRows.slice(0, 30).map((rec) => (
                  <tr key={rec.attendanceId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {rec.date}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900">{rec.staffName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{rec.staffId}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-medium">
                      {formatDesignationLabel(rec.designation, language)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rec.previousStatus && rec.previousStatus !== rec.status && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {formatAttendanceStatusLabel(rec.previousStatus, language)} →
                          </span>
                        )}
                        {renderStatusPill(rec.status)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-medium">
                      {rec.markedBy}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="font-mono text-slate-700">{rec.markedAt}</span>
                        {renderSyncBadge(rec.syncStatus)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
