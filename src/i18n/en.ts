export interface TranslationDictionary {
  common: {
    appName: string;
    appSubtitle: string;
    languageLabel: string;
    demoReadOnlyMode: string;
    adminAuthorizedAccess: string;
    authenticatedSession: string;
    signOut: string;
    switchAccount: string;
    searchPlaceholder: string;
    online: string;
    offlineMode: string;
    queued: string;
    syncing: string;
    synced: string;
    failed: string;
    cancel: string;
    authenticate: string;
    save: string;
    all: string;
    today: string;
    district: string;
    state: string;
    phc: string;
    syntheticDemoData: string;
  };
  nav: {
    coreOperationsGroup: string;
    supplyOverview: string;
    medicineInventory: string;
    demandSurgeForecast: string;
    ordersTransfers: string;
    networkStockMap: string;
    phcNlemCatalogue: string;
    registerScan: string;
    alertsOfflineQueue: string;
    staffAttendance: string;
    csvPdfReports: string;
  };
  auth: {
    authorizedAccessRequired: string;
    protectedActionExplanation: string;
    officerIdLabel: string;
    passwordLabel: string;
    showPassword: string;
    hidePassword: string;
    incorrectPassword: string;
    demoPrototypeAuthLabel: string;
  };
  attendance: {
    title: string;
    subtitle: string;
    staffToday: string;
    viewAttendance: string;
    totalStaff: string;
    present: string;
    absent: string;
    onLeave: string;
    notMarked: string;
    staffId: string;
    staffName: string;
    staff: string;
    designation: string;
    departmentRole: string;
    assignedPhc: string;
    attendanceStatus: string;
    lastAttendanceUpdate: string;
    date: string;
    markedBy: string;
    time: string;
    saveAttendance: string;
    attendanceSaved: string;
    attendanceQueuedOffline: string;
    attendanceHistory: string;
    attendanceAuditLog: string;
    searchStaffPlaceholder: string;
    filterByStatus: string;
    filterByDesignation: string;
    markAttendance: string;
    syntheticDataNotice: string;
    lockedToPhcNotice: string;
    readOnlyAttendanceNotice: string;
    noStaffFound: string;
    noHistoryFound: string;
    syncStatusLabel: string;
    previousStatus: string;
    newStatus: string;
    designations: {
      medicalOfficer: string;
      staffNurse: string;
      pharmacist: string;
      labTechnician: string;
      anm: string;
      cho: string;
      dataEntryOperator: string;
      other: string;
    };
  };
}

export const en: TranslationDictionary = {
  common: {
    appName: 'MedResQ AI',
    appSubtitle: 'PHC Supply & Forecast',
    languageLabel: 'Language',
    demoReadOnlyMode: 'DEMO / READ-ONLY MODE',
    adminAuthorizedAccess: 'Admin / Authorized Access',
    authenticatedSession: 'Authenticated Session',
    signOut: 'Sign Out',
    switchAccount: 'Switch Account',
    searchPlaceholder: 'Search medicines, orders, alerts, staff...',
    online: 'Online',
    offlineMode: 'Offline Queue Mode',
    queued: 'QUEUED',
    syncing: 'SYNCING',
    synced: 'SYNCED',
    failed: 'FAILED',
    cancel: 'Cancel',
    authenticate: 'Authenticate',
    save: 'Save',
    all: 'All',
    today: 'Today',
    district: 'District',
    state: 'State',
    phc: 'PHC',
    syntheticDemoData: 'Synthetic / Demo Data'
  },
  nav: {
    coreOperationsGroup: 'PHC Core Operations',
    supplyOverview: 'Supply Overview',
    medicineInventory: 'Medicine Inventory',
    demandSurgeForecast: 'Demand & Surge Forecast',
    ordersTransfers: 'Orders & PHC Transfers',
    networkStockMap: 'Network Stock Map',
    phcNlemCatalogue: 'PHC & NLEM Catalogue',
    registerScan: 'Register Scan',
    alertsOfflineQueue: 'Alerts & Offline Queue',
    staffAttendance: 'Staff Attendance',
    csvPdfReports: 'CSV / PDF Reports'
  },
  auth: {
    authorizedAccessRequired: 'Authorized access required',
    protectedActionExplanation: 'This action modifies supply-chain data. Please authenticate to continue.',
    officerIdLabel: 'Officer ID',
    passwordLabel: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    incorrectPassword: 'Incorrect password. Please try again.',
    demoPrototypeAuthLabel: 'Demo / Prototype Authentication — Bound PHC Session'
  },
  attendance: {
    title: 'Staff Attendance',
    subtitle: 'Daily PHC healthcare workforce attendance register, audit trail, and offline-resilient ledger',
    staffToday: 'Staff Today',
    viewAttendance: 'View Attendance',
    totalStaff: 'Total Staff',
    present: 'Present',
    absent: 'Absent',
    onLeave: 'On Leave',
    notMarked: 'Not Marked',
    staffId: 'Staff ID',
    staffName: 'Staff Name',
    staff: 'Staff',
    designation: 'Designation',
    departmentRole: 'Department / Duty Area',
    assignedPhc: 'Assigned PHC',
    attendanceStatus: 'Attendance Status',
    lastAttendanceUpdate: 'Last Attendance Update',
    date: 'Date',
    markedBy: 'Marked By',
    time: 'Time',
    saveAttendance: 'Save Attendance',
    attendanceSaved: 'Attendance saved to PHC operational ledger.',
    attendanceQueuedOffline: 'Offline mode active: Attendance queued in Offline Queue for automatic sync.',
    attendanceHistory: 'Attendance History',
    attendanceAuditLog: 'Attendance Audit Trail',
    searchStaffPlaceholder: 'Search by Staff Name, Staff ID, or Designation...',
    filterByStatus: 'Filter by Status',
    filterByDesignation: 'Filter by Designation',
    markAttendance: 'Mark Attendance',
    syntheticDataNotice: 'Synthetic / Demo Staff Directory — Operational Prototype Data Only',
    lockedToPhcNotice: 'Bound to authenticated PHC session. Cross-PHC attendance access is restricted.',
    readOnlyAttendanceNotice: 'Public Demo / Read-Only Mode: Authenticate as PHC Medical Officer In-Charge to mark or save attendance.',
    noStaffFound: 'No staff members match the current search or filter within this PHC.',
    noHistoryFound: 'No attendance history records match the selected status filter.',
    syncStatusLabel: 'Sync Status',
    previousStatus: 'Previous Status',
    newStatus: 'New Status',
    designations: {
      medicalOfficer: 'Medical Officer',
      staffNurse: 'Staff Nurse',
      pharmacist: 'Pharmacist',
      labTechnician: 'Lab Technician',
      anm: 'ANM',
      cho: 'CHO',
      dataEntryOperator: 'Data Entry Operator',
      other: 'Other'
    }
  }
};
