import type {
  PHCFacility,
  MedicineItem,
  CapacityRecord,
  StaffMember,
  StaffAttendanceRecord,
  AttendanceStatus,
  WorkforceSummary,
  WeatherPreparedness,
  LogisticsOrder,
  RedistributionOpportunity,
  OperationalAlert,
  IntegrationConnector,
  ExtractedOCRRecord
} from '../types.ts';

import { INDIA_PHC_DIRECTORY } from './indiaPHCDirectory.ts';
import { generateEssentialMedicinesForPHC } from './nationalEssentialMedicines.ts';

export const FACILITIES: PHCFacility[] = INDIA_PHC_DIRECTORY;

export const INITIAL_MEDICINES: MedicineItem[] = generateEssentialMedicinesForPHC(
  'phc-osian',
  'District Drug Warehouse Mandore (RMSCL)'
);

export const INITIAL_CAPACITY: CapacityRecord = {
  phcId: 'phc-osian',
  date: '2026-09-22',
  opdFootfall: 214,
  emergencyFootfall: 36,
  admissions: 8,
  discharges: 4,
  totalBeds: 20,
  occupiedBeds: 17,
  availableBeds: 3,
  occupancyRate: 85,
  trend: 'increasing',
  laborRoomBeds: 4,
  laborRoomBedsOccupied: 3,
  emergencyObservationBeds: 4,
  emergencyObservationOccupied: 3,
  oxygenSupportedBeds: 6,
  oxygenBedsOccupied: 5,
  averageLengthOfStayDays: 2.1,
  bedTurnoverRate: 1.4,
  peakOccupancyHours: '10:00 - 13:30 IST',
  nearbyAlternatives: [
    {
      facilityId: 'phc-mandore',
      facilityName: 'PHC Mandore',
      distanceKm: 55,
      availableBeds: 11,
      utilizationRate: 31.25
    },
    {
      facilityId: 'phc-balesar',
      facilityName: 'PHC Balesar',
      distanceKm: 48,
      availableBeds: 6,
      utilizationRate: 66.6
    },
    {
      facilityId: 'phc-bilara',
      facilityName: 'PHC Bilara (24x7)',
      distanceKm: 78,
      availableBeds: 10,
      utilizationRate: 58.3
    }
  ]
};

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'STF-OSN-001',
    staffCode: 'STF-OSN-001',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Dr. Suresh Chandra Bishnoi',
    role: 'Medical Officer',
    designation: 'Medical Officer',
    department: 'OPD Chamber 1 & Casualty',
    qualification: 'MBBS, DNB Family Medicine',
    assignedArea: 'OPD Chamber 1 & Casualty',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    lastAttendanceUpdate: '08:30 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    patientLoadToday: 140,
    burnoutRisk: 'HIGH',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-002',
    staffCode: 'STF-OSN-002',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Dr. Manisha Meena',
    role: 'Medical Officer',
    designation: 'Medical Officer',
    department: 'Maternal & Child Health Ward',
    qualification: 'MBBS',
    assignedArea: 'Maternal & Child Health Ward',
    shift: 'Evening',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    lastAttendanceUpdate: '08:35 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    patientLoadToday: 65,
    burnoutRisk: 'MODERATE',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-003',
    staffCode: 'STF-OSN-003',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Kamla Devi Gurjar',
    role: 'Staff Nurse',
    designation: 'Staff Nurse',
    department: 'Emergency Observation Ward',
    qualification: 'GNM, B.Sc Nursing',
    assignedArea: 'Emergency Observation Ward',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    lastAttendanceUpdate: '08:40 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    patientLoadToday: 32,
    burnoutRisk: 'HIGH',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-004',
    staffCode: 'STF-OSN-004',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Sunita Bhati',
    role: 'Staff Nurse',
    designation: 'Staff Nurse',
    department: 'Inpatient General Ward',
    qualification: 'GNM',
    assignedArea: 'Inpatient General Ward',
    shift: 'Night',
    status: 'ON_LEAVE',
    attendanceStatus: 'On Leave',
    lastAttendanceUpdate: '08:42 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    burnoutRisk: 'LOW',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-005',
    staffCode: 'STF-OSN-005',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Rameshwar Lal Patel',
    role: 'Pharmacist',
    designation: 'Pharmacist',
    department: 'Main Pharmacy & Cold Storage',
    qualification: 'B.Pharm, Registered Pharmacist',
    assignedArea: 'Main Pharmacy & Cold Storage',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    lastAttendanceUpdate: '08:45 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    patientLoadToday: 210,
    burnoutRisk: 'HIGH',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-006',
    staffCode: 'STF-OSN-006',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Geeta Kumari',
    role: 'ANM',
    designation: 'ANM',
    department: 'Sub-Centre Bhed & Village Outreach',
    qualification: 'MPHW(F) / ANM',
    assignedArea: 'Sub-Centre Bhed & Village Outreach',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    lastAttendanceUpdate: '08:48 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    patientLoadToday: 45,
    burnoutRisk: 'MODERATE',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-007',
    staffCode: 'STF-OSN-007',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Dinesh Kumar Sen',
    role: 'Lab Technician',
    designation: 'Lab Technician',
    department: 'Clinical Diagnostics Lab',
    qualification: 'DMLT, B.Sc MLT',
    assignedArea: 'Clinical Diagnostics Lab',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    lastAttendanceUpdate: '08:50 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    patientLoadToday: 78,
    burnoutRisk: 'MODERATE',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-008',
    staffCode: 'STF-OSN-008',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Pooja Verma',
    role: 'Staff Nurse',
    designation: 'Staff Nurse',
    department: 'Labor & Delivery Room',
    qualification: 'GNM',
    assignedArea: 'Labor & Delivery Room',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    lastAttendanceUpdate: '08:52 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    patientLoadToday: 18,
    burnoutRisk: 'MODERATE',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-009',
    staffCode: 'STF-OSN-009',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Vikram Singh Rathore',
    role: 'CHO',
    designation: 'CHO',
    department: 'Ayushman Arogya Mandir Telemedicine',
    qualification: 'B.Sc Nursing, CCH',
    assignedArea: 'NCD Screening & Tele-Consultation',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    lastAttendanceUpdate: '08:55 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    patientLoadToday: 38,
    burnoutRisk: 'LOW',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-010',
    staffCode: 'STF-OSN-010',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Mahendra Gehlot',
    role: 'Data Entry Operator',
    designation: 'Data Entry Operator',
    department: 'e-Aushadhi & HMIS Registration Desk',
    qualification: 'BCA, RSCIT',
    assignedArea: 'OPD Registration & Digital Ledger',
    shift: 'Morning',
    status: 'ABSENT',
    attendanceStatus: 'Absent',
    lastAttendanceUpdate: '09:00 IST',
    lastMarkedBy: 'Dr. S.C. Bishnoi (OSN001)',
    burnoutRisk: 'LOW',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  },
  {
    id: 'STF-OSN-011',
    staffCode: 'STF-OSN-011',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    name: 'Bhawani Shankar',
    role: 'Other',
    designation: 'Other',
    department: 'Cold-Chain & Biomedical Support',
    qualification: 'Cold-Chain Handler Certificate',
    assignedArea: 'ILR Vaccine Store & Facility Support',
    shift: 'Morning',
    status: 'NOT_MARKED',
    attendanceStatus: 'Not Marked',
    burnoutRisk: 'LOW',
    contact: 'Official PHC Extension',
    isSyntheticDemo: true
  }
];

/**
 * Generates or returns the synthetic/demo staff directory strictly scoped to the specified PHC.
 * Reuses INITIAL_STAFF for phc-osian and generates deterministic PHC-specific cadres for any other PHC.
 */
export function getFacilityStaffDirectory(phc: PHCFacility): StaffMember[] {
  if (!phc || phc.id === 'phc-osian') {
    return INITIAL_STAFF.map((s) => ({ ...s }));
  }

  const cleanCode = (phc.code || phc.id.replace(/^phc-/, '')).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5) || 'PHC';
  const officerName = phc.medicalOfficerInCharge || 'Dr. Medical Officer I/C';

  const templates: Array<{
    idx: string;
    name: string;
    designation: StaffMember['role'];
    department: string;
    qualification: string;
    shift: StaffMember['shift'];
    defaultStatus: AttendanceStatus;
  }> = [
    {
      idx: '001',
      name: officerName,
      designation: 'Medical Officer',
      department: 'OPD Chamber 1 & Emergency Triage',
      qualification: 'MBBS',
      shift: 'Morning',
      defaultStatus: 'PRESENT'
    },
    {
      idx: '002',
      name: `Kavita Sharma (${phc.block})`,
      designation: 'Staff Nurse',
      department: 'Maternal & Child Health Ward',
      qualification: 'GNM, B.Sc Nursing',
      shift: 'Morning',
      defaultStatus: 'PRESENT'
    },
    {
      idx: '003',
      name: `Rajendra Prasad (${phc.block})`,
      designation: 'Pharmacist',
      department: 'Main Pharmacy & e-Aushadhi Store',
      qualification: 'B.Pharm',
      shift: 'Morning',
      defaultStatus: 'PRESENT'
    },
    {
      idx: '004',
      name: `Savitri Devi (${phc.block})`,
      designation: 'ANM',
      department: 'Sub-Centre Immunization & Outreach',
      qualification: 'MPHW(F) / ANM',
      shift: 'Morning',
      defaultStatus: 'PRESENT'
    },
    {
      idx: '005',
      name: `mukesh Kumar (${phc.block})`.replace(/^m/, 'M'),
      designation: 'Lab Technician',
      department: 'Clinical Diagnostics Laboratory',
      qualification: 'DMLT',
      shift: 'Morning',
      defaultStatus: 'PRESENT'
    },
    {
      idx: '006',
      name: `Anita Choudhary (${phc.block})`,
      designation: 'CHO',
      department: 'NCD Screening & Telemedicine Hub',
      qualification: 'B.Sc Nursing, CCH',
      shift: 'Morning',
      defaultStatus: 'ON_LEAVE'
    },
    {
      idx: '007',
      name: `Deepak Verma (${phc.block})`,
      designation: 'Data Entry Operator',
      department: 'OPD Registration & HMIS Desk',
      qualification: 'BCA',
      shift: 'Morning',
      defaultStatus: 'ABSENT'
    },
    {
      idx: '008',
      name: `Harishankar (${phc.block})`,
      designation: 'Other',
      department: 'Cold-Chain & Ward Support',
      qualification: 'Facility Support',
      shift: 'Evening',
      defaultStatus: 'NOT_MARKED'
    }
  ];

  return templates.map((t) => {
    const staffId = `STF-${cleanCode}-${t.idx}`;
    return {
      id: staffId,
      staffCode: staffId,
      phcId: phc.id,
      phcName: phc.name,
      name: t.name,
      role: t.designation,
      designation: t.designation,
      department: t.department,
      qualification: t.qualification,
      assignedArea: t.department,
      shift: t.shift,
      status: t.defaultStatus,
      attendanceStatus:
        t.defaultStatus === 'PRESENT'
          ? 'Present'
          : t.defaultStatus === 'ABSENT'
          ? 'Absent'
          : t.defaultStatus === 'ON_LEAVE'
          ? 'On Leave'
          : 'Not Marked',
      lastAttendanceUpdate: t.defaultStatus === 'NOT_MARKED' ? undefined : '08:45 IST',
      lastMarkedBy: t.defaultStatus === 'NOT_MARKED' ? undefined : officerName,
      burnoutRisk: 'MODERATE',
      contact: 'Official PHC Extension',
      isSyntheticDemo: true
    };
  });
}

export function getInitialAttendanceRecordsForPHC(
  phc: PHCFacility,
  todayStr: string
): StaffAttendanceRecord[] {
  const roster = getFacilityStaffDirectory(phc);
  const officerLabel = phc.medicalOfficerInCharge || 'Dr. S.C. Bishnoi';
  const records: StaffAttendanceRecord[] = [];

  roster.forEach((member, idx) => {
    const statusToday: AttendanceStatus =
      member.status === 'PRESENT' || member.status === 'FIELD_DUTY'
        ? 'PRESENT'
        : member.status === 'ABSENT'
        ? 'ABSENT'
        : member.status === 'ON_LEAVE'
        ? 'ON_LEAVE'
        : 'NOT_MARKED';

    if (statusToday !== 'NOT_MARKED') {
      records.push({
        attendanceId: `ATT-${phc.id}-${todayStr}-${member.id}`,
        staffId: member.id,
        staffName: member.name,
        designation: member.designation || member.role,
        department: member.department || member.assignedArea,
        phcId: phc.id,
        phcName: phc.name,
        date: todayStr,
        status: statusToday,
        markedBy: member.lastMarkedBy || officerLabel,
        markedAt: `08:${String(30 + idx * 2).padStart(2, '0')} IST`,
        syncStatus: 'SYNCED'
      });
    }
  });

  // Also seed 1 previous day so date filtering & history table have immediate realistic synthetic records
  const prevDateObj = new Date(`${todayStr}T00:00:00`);
  if (!Number.isNaN(prevDateObj.getTime())) {
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const yesterdayStr = prevDateObj.toISOString().split('T')[0];
    roster.slice(0, 6).forEach((member, idx) => {
      const prevStatus: AttendanceStatus = idx === 4 ? 'ON_LEAVE' : idx === 5 ? 'ABSENT' : 'PRESENT';
      records.push({
        attendanceId: `ATT-${phc.id}-${yesterdayStr}-${member.id}`,
        staffId: member.id,
        staffName: member.name,
        designation: member.designation || member.role,
        department: member.department || member.assignedArea,
        phcId: phc.id,
        phcName: phc.name,
        date: yesterdayStr,
        status: prevStatus,
        markedBy: officerLabel,
        markedAt: `08:${String(25 + idx * 3).padStart(2, '0')} IST`,
        syncStatus: 'SYNCED'
      });
    });
  }

  return records;
}

export const INITIAL_WORKFORCE_SUMMARY: WorkforceSummary = {
  phcId: 'phc-osian',
  totalStaffSanctioned: 14,
  staffPresentToday: 7,
  staffOnFieldDuty: 4,
  staffOnLeave: 2,
  patientLoadToday: 250,
  patientToStaffRatio: 35.7,
  workloadIndex: 'HIGH',
  recommendation: 'PHC Osian has high patient load relative to currently available clinical personnel. Consider temporary duty deployment of 1 Staff Nurse from nearby Mandore or Balesar.'
};

export const INITIAL_WEATHER: WeatherPreparedness = {
  phcId: 'phc-osian',
  location: 'Osian Sub-Division, Thar Desert Fringe',
  district: 'Jodhpur, Rajasthan',
  temperatureC: 43.4,
  feelsLikeC: 45.8,
  humidityPercent: 26,
  rainfallMm: 0,
  rainfallForecastMm: 0,
  airQualityIndex: 168,
  uvIndex: 9.6,
  alertType: 'Heatwave Warning',
  alertLevel: 'ORANGE',
  seasonalProfile: 'Summer/Heatwave',
  historicalCorrelationNote: 'Historical PHC health data indicates temperature > 42°C correlates with a 38% surge in acute dehydration, heat exhaustion, and gastrointestinal complaints within 48-72 hours.',
  likelyHealthImpacts: [
    {
      condition: 'Heat Exhaustion & Hyperthermia',
      projectedIncrease: '+65% surge',
      rationale: 'Rural outdoor farm workers and construction laborers exposed to 43°C+ dry heat.'
    },
    {
      condition: 'Acute Dehydration & Gastroenteritis',
      projectedIncrease: '+45% surge',
      rationale: 'Summer water scarcity in desert hamlets driving rapid fluid loss.'
    },
    {
      condition: 'Dust-induced Respiratory Flare-ups',
      projectedIncrease: '+25% surge',
      rationale: 'AQI 168 with particulate sand suspension exacerbating COPD and childhood asthma.'
    }
  ],
  recommendedPreparatoryActions: [
    {
      action: 'Increase ORS Buffer Stock to minimum 1,500 sachets',
      priority: 'CRITICAL',
      category: 'Pharmacy / Drug Store'
    },
    {
      action: 'Ensure cold room / ice pack availability in casualty ward',
      priority: 'CRITICAL',
      category: 'Nursing Staff'
    },
    {
      action: 'Prepare emergency oral rehydration corner at OPD entrance',
      priority: 'HIGH',
      category: 'OPD Support Staff'
    },
    {
      action: 'Alert ASHA workers for community heat-stress house visits',
      priority: 'HIGH',
      category: 'Community Health Extension'
    },
    {
      action: 'Verify backup diesel generator for ILR vaccine refrigerator',
      priority: 'ROUTINE',
      category: 'Facility Maintenance'
    }
  ],
  vulnerableMedicines: [
    {
      medicineName: 'Oral Rehydration Salts (ORS) Sachets',
      demandSurgePercent: 65,
      reason: 'Surge in dehydration cases and agricultural field workers presenting with heat stress.',
      actionRequired: 'Accelerate pending indent #PO-2026-881; initiate inter-facility transfer from Mandore.'
    },
    {
      medicineName: 'Normal Saline (NS) & Ringer Lactate (RL) IV Infusions',
      demandSurgePercent: 45,
      reason: 'Inpatient stabilization for acute gastroenteritis and heat collapse admissions.',
      actionRequired: 'Verify cold storage, ensure IV infusion sets and cannula stocks are adequate.'
    },
    {
      medicineName: 'Zinc Sulfate Dispersible Tablets',
      demandSurgePercent: 35,
      reason: 'Pediatric diarrheal episodes accompanying summer water stress.',
      actionRequired: 'Ensure ASHA and ANM distribution kits are pre-stocked.'
    }
  ]
};

export const INITIAL_ORDERS: LogisticsOrder[] = [
  {
    id: 'ORD-2026-904',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    quantityRequested: 500,
    quantityDispatched: 500,
    source: 'District Drug Warehouse Mandore (RMSCL)',
    destination: 'PHC Osian Store',
    status: 'IN TRANSIT',
    requestDate: '2026-09-20',
    submittedDate: '2026-09-20',
    approvalDate: '2026-09-21',
    dispatchDate: '2026-09-22',
    inTransitDate: '2026-09-22',
    estimatedDelivery: '2026-09-23',
    consignmentId: 'RJ-VTS-66014',
    priority: 'EMERGENCY_REPLENISHMENT',
    notes: 'Priority dispatch requested due to IMD heatwave orange alert and buffer stock dip.',
    isHistoricalDemo: true,
    pipelineTracked: true,
    stockCredited: false,
    statusHistory: [
      {
        transactionId: 'TXN-HIST-904-1',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        timestamp: '2026-09-20T09:15:00Z',
        actor: 'Dr. S. C. Bishnoi (MOIC)',
        note: 'Emergency indent submitted (Historical Demo Record)'
      },
      {
        transactionId: 'TXN-HIST-904-2',
        previousStatus: 'SUBMITTED',
        newStatus: 'APPROVED',
        timestamp: '2026-09-21T11:30:00Z',
        actor: 'RMSCL District Nodal Officer',
        note: 'Approved for 500 sachets'
      },
      {
        transactionId: 'TXN-HIST-904-3',
        previousStatus: 'APPROVED',
        newStatus: 'DISPATCHED',
        timestamp: '2026-09-22T08:00:00Z',
        actor: 'Mandore DDW Store',
        note: 'Consignment RJ-VTS-66014 dispatched'
      },
      {
        transactionId: 'TXN-HIST-904-4',
        previousStatus: 'DISPATCHED',
        newStatus: 'IN TRANSIT',
        timestamp: '2026-09-22T10:30:00Z',
        actor: 'RMSCL Fleet VTS',
        note: 'En route to PHC Osian Store'
      }
    ]
  },
  {
    id: 'ORD-2026-891',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
    quantityRequested: 200,
    quantityDispatched: 200,
    source: 'District Drug Warehouse Mandore (RMSCL)',
    destination: 'PHC Osian Store',
    status: 'DISPATCHED',
    requestDate: '2026-09-19',
    submittedDate: '2026-09-19',
    approvalDate: '2026-09-20',
    dispatchDate: '2026-09-22',
    estimatedDelivery: '2026-09-24',
    consignmentId: 'RJ-VTS-65980',
    priority: 'URGENT',
    notes: 'Batch assigned: NS-IV-1004',
    isHistoricalDemo: true,
    pipelineTracked: true,
    stockCredited: false,
    statusHistory: [
      {
        transactionId: 'TXN-HIST-891-1',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        timestamp: '2026-09-19T10:00:00Z',
        actor: 'Dr. S. C. Bishnoi (MOIC)',
        note: 'Urgent IV fluid indent submitted'
      },
      {
        transactionId: 'TXN-HIST-891-2',
        previousStatus: 'SUBMITTED',
        newStatus: 'APPROVED',
        timestamp: '2026-09-20T14:20:00Z',
        actor: 'RMSCL District Nodal Officer',
        note: 'Approved for 200 bottles'
      },
      {
        transactionId: 'TXN-HIST-891-3',
        previousStatus: 'APPROVED',
        newStatus: 'DISPATCHED',
        timestamp: '2026-09-22T09:15:00Z',
        actor: 'Mandore DDW Store',
        note: 'Batch NS-IV-1004 assigned to RJ-VTS-65980'
      }
    ]
  },
  {
    id: 'ORD-2026-880',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    medicineName: 'Ringer Lactate (RL) IV Infusion 500ml',
    quantityRequested: 150,
    source: 'District Drug Warehouse Mandore (RMSCL)',
    destination: 'PHC Osian Store',
    status: 'APPROVED',
    requestDate: '2026-09-21',
    submittedDate: '2026-09-21',
    approvalDate: '2026-09-22',
    estimatedDelivery: '2026-09-26',
    priority: 'ROUTINE',
    notes: 'Awaiting picker verification at district central store',
    isHistoricalDemo: true,
    pipelineTracked: true,
    stockCredited: false,
    statusHistory: [
      {
        transactionId: 'TXN-HIST-880-1',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        timestamp: '2026-09-21T11:00:00Z',
        actor: 'R. L. Patel (Pharmacist)',
        note: 'Routine cycle indent submitted'
      },
      {
        transactionId: 'TXN-HIST-880-2',
        previousStatus: 'SUBMITTED',
        newStatus: 'APPROVED',
        timestamp: '2026-09-22T15:10:00Z',
        actor: 'RMSCL District Nodal Officer',
        note: 'Approved; awaiting dispatch'
      }
    ]
  },
  {
    id: 'ORD-2026-872',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    medicineName: 'Paracetamol Tablets IP 500mg',
    quantityRequested: 2000,
    quantityDispatched: 2000,
    source: 'District Drug Warehouse Mandore (RMSCL)',
    destination: 'PHC Osian Store',
    status: 'DELIVERED',
    requestDate: '2026-09-15',
    submittedDate: '2026-09-15',
    approvalDate: '2026-09-16',
    dispatchDate: '2026-09-18',
    inTransitDate: '2026-09-18',
    estimatedDelivery: '2026-09-19',
    actualDeliveryDate: '2026-09-19',
    consignmentId: 'RJ-VTS-65412',
    priority: 'ROUTINE',
    notes: 'Received and verified in physical stock book',
    isHistoricalDemo: true,
    pipelineTracked: false,
    stockCredited: true,
    statusHistory: [
      {
        transactionId: 'TXN-HIST-872-1',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        timestamp: '2026-09-15T09:30:00Z',
        actor: 'R. L. Patel (Pharmacist)'
      },
      {
        transactionId: 'TXN-HIST-872-2',
        previousStatus: 'SUBMITTED',
        newStatus: 'APPROVED',
        timestamp: '2026-09-16T12:00:00Z',
        actor: 'RMSCL District Nodal Officer'
      },
      {
        transactionId: 'TXN-HIST-872-3',
        previousStatus: 'APPROVED',
        newStatus: 'DISPATCHED',
        timestamp: '2026-09-18T08:45:00Z',
        actor: 'Mandore DDW Store'
      },
      {
        transactionId: 'TXN-HIST-872-4',
        previousStatus: 'DISPATCHED',
        newStatus: 'IN TRANSIT',
        timestamp: '2026-09-18T11:00:00Z',
        actor: 'RMSCL Fleet VTS'
      },
      {
        transactionId: 'TXN-HIST-872-5',
        previousStatus: 'IN TRANSIT',
        newStatus: 'DELIVERED',
        timestamp: '2026-09-19T14:30:00Z',
        actor: 'R. L. Patel (Pharmacist)',
        note: 'Received +2,000 tablets into PHC Osian stock ledger'
      }
    ]
  }
];

export const INITIAL_REDISTRIBUTION: RedistributionOpportunity[] = [
  {
    id: 'REDIST-2026-01',
    medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    batchNumber: 'ORS-RJ-2601',
    transferQuantity: 600,
    sourcePHCName: 'PHC Mandore',
    destinationPHCName: 'PHC Osian (24x7)',
    clinicalRationale: 'PHC Mandore holds 2,150 sachets with low consumption. Transferring 600 units covers Osian heatwave surge with zero disruption to Mandore buffer.',
    sourcePHC: {
      id: 'phc-mandore',
      name: 'PHC Mandore',
      currentStock: 2150,
      usableStock: 2150,
      reservedStock: 0,
      minStockLevel: 500,
      projectedDemand: 350,
      potentialSurplus: 1200
    },
    targetPHC: {
      id: 'phc-osian',
      name: 'PHC Osian (24x7)',
      currentStock: 210,
      usableStock: 210,
      projectedDemand: 800,
      projectedShortage: 590,
      urgencyLevel: 'CRITICAL'
    },
    recommendedTransferQuantity: 600,
    transitDistanceKm: 55,
    estimatedTransitTimeHours: 1.2,
    status: 'PENDING_REVIEW',
    donorReserved: false,
    donorDeducted: false,
    receiverCredited: false,
    createdDate: '2026-09-22',
    isHistoricalDemo: true,
    statusHistory: [
      {
        transactionId: 'TXN-HIST-REDIST-01',
        previousStatus: 'NEW',
        newStatus: 'PENDING_REVIEW',
        timestamp: '2026-09-22T07:30:00Z',
        actor: 'District Redistribution Protocol',
        note: 'Proposed 600 Sachets lateral transfer from PHC Mandore to PHC Osian (24x7)'
      }
    ]
  },
  {
    id: 'REDIST-2026-02',
    medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
    batchNumber: 'NS-IV-912',
    transferQuantity: 100,
    sourcePHCName: 'PHC Mandore',
    destinationPHCName: 'PHC Osian (24x7)',
    clinicalRationale: 'Mandore warehouse surplus matches critical 4-day stockout risk at Osian before regular monthly RMSCL indent arrives.',
    sourcePHC: {
      id: 'phc-mandore',
      name: 'PHC Mandore',
      currentStock: 520,
      usableStock: 520,
      reservedStock: 0,
      minStockLevel: 100,
      projectedDemand: 120,
      potentialSurplus: 220
    },
    targetPHC: {
      id: 'phc-osian',
      name: 'PHC Osian (24x7)',
      currentStock: 64,
      usableStock: 64,
      projectedDemand: 180,
      projectedShortage: 116,
      urgencyLevel: 'HIGH'
    },
    recommendedTransferQuantity: 100,
    transitDistanceKm: 55,
    estimatedTransitTimeHours: 1.2,
    status: 'PENDING_REVIEW',
    donorReserved: false,
    donorDeducted: false,
    receiverCredited: false,
    createdDate: '2026-09-22',
    isHistoricalDemo: true,
    statusHistory: [
      {
        transactionId: 'TXN-HIST-REDIST-02',
        previousStatus: 'NEW',
        newStatus: 'PENDING_REVIEW',
        timestamp: '2026-09-22T08:00:00Z',
        actor: 'District Redistribution Protocol',
        note: 'Proposed 100 Bottles lateral transfer from PHC Mandore to PHC Osian (24x7)'
      }
    ]
  }
];

export const INITIAL_ALERTS: OperationalAlert[] = [
  {
    id: 'ALT-101',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    facilityName: 'PHC Osian (24x7)',
    category: 'CRITICAL',
    title: 'Potential Stock-Out Risk: ORS Sachets within 3.6 Days',
    description: 'At current consumption and temperature trends, stock depletion will occur prior to regular replenishment window, exposing acute dehydration patients to stock-out risk.',
    iconType: 'pill',
    actionLink: '/medicine',
    timestamp: '2026-09-22 06:30 IST',
    whatHappened: 'ORS inventory dropped to 210 sachets with an accelerated daily burn rate of 58 sachets/day.',
    whyItMatters: 'At current consumption and temperature trends, stock depletion will occur prior to regular replenishment window, exposing acute dehydration patients to stock-out risk.',
    supportingData: 'Current stock: 210 | 7-day average consumption: 58/day | Lead time: 3 days | Stock-out projected: 2026-09-25.',
    suggestedAction: 'Expedite incoming dispatch #ORD-2026-904 and approve proposed inter-facility transfer of 600 sachets from PHC Mandore.',
    status: 'ACTIVE'
  },
  {
    id: 'ALT-102',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    facilityName: 'PHC Osian (24x7)',
    category: 'CRITICAL',
    title: 'Severe Inpatient Bed Capacity Pressure (85% Occupied)',
    description: '17 out of 20 sanctioned beds are occupied following 8 new admissions in the past 24 hours. Emergency observation beds 75% full.',
    iconType: 'heat',
    actionLink: '/capacity',
    timestamp: '2026-09-22 07:15 IST',
    whatHappened: '17 out of 20 sanctioned beds are occupied following 8 new admissions in the past 24 hours.',
    whyItMatters: 'Only 3 beds remain available with continuing morning OPD referrals and high emergency footfall.',
    supportingData: 'Occupancy: 85% | Available beds: 3 | Active admissions: 8 | Discharges today: 4.',
    suggestedAction: 'Alert PHC Medical Officer for expedited discharge review; coordinate stabilization beds with nearby PHC Balesar (6 beds available) and Mandore (11 beds available).',
    status: 'ACTIVE'
  },
  {
    id: 'ALT-103',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    facilityName: 'PHC Osian (24x7)',
    category: 'WARNING',
    title: 'FEFO Expiry Alert: Paracetamol 500mg Batch PCM-T-440',
    description: 'Batch PCM-T-440 (4,200 tablets) will reach stated shelf-life expiry on 2026-11-30 (~68 days). Prioritize First-Expiry-First-Out dispensing.',
    iconType: 'pill',
    actionLink: '/medicine',
    timestamp: '2026-09-21 16:45 IST',
    whatHappened: 'Batch PCM-T-440 (4,200 tablets) will reach stated shelf-life expiry on 2026-11-30 (~68 days).',
    whyItMatters: 'Projected consumption at this PHC indicates approximately 1,200 tablets may remain unutilized if First-Expiry-First-Out (FEFO) dispensing is not strictly enforced.',
    supportingData: 'Batch stock: 4,200 tablets | Daily burn: 190 | Expected consumption before expiry: ~3,000 tablets.',
    suggestedAction: 'Enforce FEFO dispensing order in dispensary; flag 1,000 tablets for redistribution to sub-centres or PHC Bilara with higher consumption.',
    status: 'ACTIVE'
  },
  {
    id: 'ALT-104',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    facilityName: 'PHC Osian (24x7)',
    category: 'WARNING',
    title: 'Workforce Stress: High Patient-to-Staff Ratio (35.7:1)',
    description: 'High OPD footfall (250 patients projected) with 2 clinical nursing staff on sanctioned medical leave.',
    iconType: 'users',
    actionLink: '/workforce',
    timestamp: '2026-09-22 07:00 IST',
    whatHappened: 'High OPD footfall (250 patients projected) with 2 clinical nursing staff on sanctioned medical leave.',
    whyItMatters: 'Clinician triage capacity is constrained, resulting in OPD waiting time exceeding 65 minutes and delayed immunization documentation.',
    supportingData: 'Staff present: 7 of 14 sanctioned | Present doctors: 2 | Nurses present: 2 (1 on night leave).',
    suggestedAction: 'District Administrator recommended to depute 1 roving Staff Nurse from Block Mandore for 72 hours.',
    status: 'ACTIVE'
  },
  {
    id: 'ALT-105',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    facilityName: 'PHC Osian (24x7)',
    category: 'PREPAREDNESS',
    title: 'IMD Orange Alert: Heatwave Resource Surge Forecast',
    description: 'Meteorological department issued 4-day severe heatwave warning (temperatures reaching 44.5°C in Western Rajasthan). Surge anticipated.',
    iconType: 'heat',
    actionLink: '/preparedness',
    timestamp: '2026-09-21 14:00 IST',
    whatHappened: 'Meteorological department issued 4-day severe heatwave warning (temperatures reaching 44.5°C in Western Rajasthan).',
    whyItMatters: 'Historical PHC health records correlate high temperature spells with a 40-65% increase in fluid therapy demand and acute diarrheal visits.',
    supportingData: 'Forecast: 43.4°C - 44.8°C | Humidity: 26% | Historical surge factor: +55% for ORS, +42% for IV NS/RL.',
    suggestedAction: 'Review emergency fluid buffer stocks, activate heat stroke stabilization room, ensure ORS corner in OPD is fully supplied.',
    status: 'ACTIVE'
  },
  {
    id: 'ALT-106',
    phcId: 'phc-osian',
    phcName: 'PHC Osian (24x7)',
    facilityName: 'PHC Osian (24x7)',
    category: 'INFO',
    title: 'Cold-Chain Telemetry: ILR Refrigerator Steady at 4.2°C',
    description: 'Ice-Lined Refrigerator (ILR) maintain stable 2°C - 8°C temperature window. Backup power generator fuel at 98%.',
    iconType: 'coldchain',
    actionLink: '/integrations',
    timestamp: '2026-09-22 05:00 IST',
    whatHappened: 'eVIN temperature telemetry reporting nominal parameters.',
    whyItMatters: 'Assures potency of Anti-Rabies Vaccine and seasonal antigens.',
    supportingData: 'Temp: 4.2°C | Voltage: 228V | Generator battery: 100%.',
    suggestedAction: 'Routine verification logged.',
    status: 'ACTIVE'
  }
];

export const INTEGRATION_CONNECTORS: IntegrationConnector[] = [
  {
    id: 'dvdms_rmscl',
    name: 'e-Aushadhi / RMSCL DVDMS',
    acronym: 'DVDMS',
    category: 'Supply Chain',
    description: 'Rajasthan State Medical Services Corporation Ltd Drug & Vaccine Distribution Management System.',
    status: 'CONNECTED',
    lastSync: '12 mins ago',
    latencyMs: 142,
    endpoint: 'https://dvdms.rajasthan.gov.in/api/v2/phc/inventory',
    endpointUrl: 'https://dvdms.rajasthan.gov.in/api/v2/phc/inventory',
    protocol: 'REST / JSON',
    dataExchanged: 'Stock receipts, Indents, Batch tracking, Expiry notifications, Warehouse dispatches'
  },
  {
    id: 'ihip_surveillance',
    name: 'IHIP / HMIS Outbreak Portal',
    acronym: 'IHIP',
    category: 'Health Registry',
    description: 'Ministry of Health & Family Welfare Integrated Health Information Platform & Disease Surveillance.',
    status: 'CONNECTED',
    lastSync: '45 mins ago',
    latencyMs: 280,
    endpoint: 'https://ihip.nhp.gov.in/idsp/api/outbreak-surveillance',
    endpointUrl: 'https://ihip.nhp.gov.in/idsp/api/outbreak-surveillance',
    protocol: 'REST / JSON',
    dataExchanged: 'Daily OPD counts, Inpatient admissions, Syndromic surveillance, Disease signals'
  },
  {
    id: 'abdm_health_id',
    name: 'Ayushman Bharat Digital Mission (ABDM)',
    acronym: 'ABDM',
    category: 'Digital Health Mission',
    description: 'National Identification Number (NIN) & ABHA digital patient registry interface.',
    status: 'CONNECTED',
    lastSync: '2 hours ago',
    latencyMs: 110,
    endpoint: 'https://facility.abdm.gov.in/api/v1/registry/RJ-JDP-00214',
    endpointUrl: 'https://facility.abdm.gov.in/api/v1/registry/RJ-JDP-00214',
    protocol: 'REST / JSON',
    dataExchanged: 'Sanctioned bed counts, Facility Geo-coordinates, Service availability profile'
  },
  {
    id: 'imd_weather',
    name: 'India Meteorological Department (IMD) Weather Grid',
    acronym: 'IMD API',
    category: 'Weather & Environmental',
    description: 'Automated gridded meteorological data feeds: temperature, heatwave warnings, rainfall, and humidity.',
    status: 'CONNECTED',
    lastSync: '18 mins ago',
    latencyMs: 95,
    endpoint: 'https://mausam.imd.gov.in/api/v3/grid/rajasthan/jodhpur',
    endpointUrl: 'https://mausam.imd.gov.in/api/v3/grid/rajasthan/jodhpur',
    protocol: 'REST / JSON',
    dataExchanged: 'Hourly temperatures, Heatwave alerts, Humidity, Precipitation forecasts'
  },
  {
    id: 'hmis_portal',
    name: 'HMIS Monthly Service Delivery Register',
    acronym: 'HMIS',
    category: 'Health Registry',
    description: 'Health Management Information System for monthly institutional delivery and immunisation indicators.',
    status: 'CONNECTED',
    lastSync: '1 hour ago',
    latencyMs: 190,
    endpoint: 'https://hmis.mohfw.gov.in/api/v1/data-entry',
    endpointUrl: 'https://hmis.mohfw.gov.in/api/v1/data-entry',
    protocol: 'REST / JSON',
    dataExchanged: 'Maternal health indicators, Child immunization coverage, Communicable disease cases'
  },
  {
    id: 'evin_vaccines',
    name: 'eVIN (electronic Vaccine Intelligence Network)',
    acronym: 'eVIN',
    category: 'Supply Chain',
    description: 'Real-time cold-chain temperature telemetry and vaccine stock monitoring across immunization points.',
    status: 'CONNECTED',
    lastSync: '5 mins ago',
    latencyMs: 65,
    endpoint: 'https://evin.mohfw.gov.in/api/v2/telemetry/coldchain',
    endpointUrl: 'https://evin.mohfw.gov.in/api/v2/telemetry/coldchain',
    protocol: 'MQTT / IoT',
    dataExchanged: 'ILR Refrigerator temperature (2-8°C), Cold room power backup status, Antigen inventories'
  },
  {
    id: 'google_speech_to_text',
    name: 'Google Speech-to-Text & Gemini Audio ASR (gemini-3.5-transcribe)',
    acronym: 'STT / ASR',
    category: 'AI & Multilingual Speech',
    description: 'Real-time clinical Speech-to-Text transcription engine supporting noisy OPD acoustic environments, Hindi, Hinglish, and regional Indic dialects.',
    status: 'CONNECTED',
    lastSync: 'Just now',
    latencyMs: 82,
    endpoint: '/api/voice/transcribe (gemini-3.5-transcribe)',
    endpointUrl: '/api/voice/transcribe',
    protocol: 'REST / JSON',
    dataExchanged: 'WebM/WAV microphone audio streams, verbatim multilingual transcripts, acoustic confidence telemetry'
  },
  {
    id: 'vertex_ai_gemini',
    name: 'Google Cloud Vertex AI & Gemini API (@google/genai)',
    acronym: 'VERTEX / GEMINI',
    category: 'AI & Multilingual Speech',
    description: 'Server-side Vertex AI & Gemini 3.8 Flash NLU pipeline for structured clinical entity extraction, FEFO stockout forecasting, and epidemic surge alerts.',
    status: 'CONNECTED',
    lastSync: 'Just now',
    latencyMs: 118,
    endpoint: '/api/voice/process & /api/ai/health-preparedness-surge',
    endpointUrl: '/api/voice/process',
    protocol: 'REST / JSON',
    dataExchanged: 'Canonical NLEM drug resolution, multilingual translation, epidemiological ML surge synthesis'
  },
  {
    id: 'multilingual_submission_gateway',
    name: 'Indic Multilingual Submission & Translation Gateway',
    acronym: 'INDIC-NLU',
    category: 'AI & Multilingual Speech',
    description: 'Cross-lingual voice & text submission bridge converting 8+ Indian languages (Hindi, Hinglish, Marwari, Tamil, Telugu, Bengali, Marathi, Gujarati) into standardized e-Aushadhi ledger transactions.',
    status: 'CONNECTED',
    lastSync: '1 min ago',
    latencyMs: 94,
    endpoint: '/api/voice/multilingual-submit',
    endpointUrl: '/api/voice/multilingual-submit',
    protocol: 'REST / JSON',
    dataExchanged: 'Multilingual voice/text submissions, English & Devanagari cross-translations, verified PHC ledger commits'
  }
];

export const SAMPLE_OCR_PRESETS = [
  {
    id: 'sample-stock-book',
    name: 'Daily OPD Medicine Dispensing Register (Page 14)',
    thumbnail: 'Register Scan: OPD Ward 1 Dispensing Log',
    records: [
      {
        id: 'ocr-1',
        medicine: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
        batch: 'ORS-RJ-2604',
        quantity: 35,
        date: '2026-09-22',
        transaction: 'Dispensed (OPD)' as const,
        prescribedBy: 'Dr. S. C. Bishnoi',
        verified: false,
        confidenceScore: 0.94
      },
      {
        id: 'ocr-2',
        medicine: 'Paracetamol Tablets IP 500mg',
        batch: 'PCM-T-440',
        quantity: 120,
        date: '2026-09-22',
        transaction: 'Dispensed (OPD)' as const,
        prescribedBy: 'Dr. M. Meena',
        verified: false,
        confidenceScore: 0.98
      },
      {
        id: 'ocr-3',
        medicine: 'Zinc Sulfate Dispersible Tablets 20mg',
        batch: 'ZNC-D-102',
        quantity: 25,
        date: '2026-09-22',
        transaction: 'Dispensed (OPD)' as const,
        prescribedBy: 'Dr. S. C. Bishnoi',
        verified: false,
        confidenceScore: 0.91
      },
      {
        id: 'ocr-4',
        medicine: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
        batch: 'NS-IV-998',
        quantity: 8,
        date: '2026-09-22',
        transaction: 'Emergency Inpatient' as const,
        prescribedBy: 'Dr. S. C. Bishnoi',
        verified: false,
        confidenceScore: 0.89
      }
    ]
  },
  {
    id: 'sample-warehouse-receipt',
    name: 'Warehouse Receipt & Inward Challan #CH-8812',
    thumbnail: 'Inward Challan: District Warehouse Delivery',
    records: [
      {
        id: 'ocr-5',
        medicine: 'Amoxicillin Capsules IP 500mg',
        batch: 'AMX-C-901',
        quantity: 500,
        date: '2026-09-22',
        transaction: 'Received (Warehouse)' as const,
        prescribedBy: 'Store In-Charge R. L. Patel',
        verified: false,
        confidenceScore: 0.96
      },
      {
        id: 'ocr-6',
        medicine: 'Ringer Lactate (RL) IV Infusion 500ml',
        batch: 'RL-RJ-601',
        quantity: 50,
        date: '2026-09-22',
        transaction: 'Received (Warehouse)' as const,
        prescribedBy: 'Store In-Charge R. L. Patel',
        verified: false,
        confidenceScore: 0.95
      }
    ]
  }
];

export const MOCK_HISTORICAL_CONSUMPTION = [
  { month: 'Apr 2026', ors: 820, paracetamol: 3400, amoxicillin: 950 },
  { month: 'May 2026', ors: 1450, paracetamol: 3900, amoxicillin: 1100 },
  { month: 'Jun 2026', ors: 2100, paracetamol: 4200, amoxicillin: 1250 },
  { month: 'Jul 2026', ors: 1850, paracetamol: 4600, amoxicillin: 1400 },
  { month: 'Aug 2026', ors: 1600, paracetamol: 4300, amoxicillin: 1350 },
  { month: 'Sep 2026 (YTD)', ors: 1720, paracetamol: 4200, amoxicillin: 1200 }
];

export const MOCK_BED_OCCUPANCY_HISTORY = [
  { month: 'Apr 2026', inpatient: 62, emergency: 55, maternity: 70 },
  { month: 'May 2026', inpatient: 74, emergency: 78, maternity: 68 },
  { month: 'Jun 2026', inpatient: 88, emergency: 86, maternity: 72 },
  { month: 'Jul 2026', inpatient: 82, emergency: 75, maternity: 80 },
  { month: 'Aug 2026', inpatient: 79, emergency: 70, maternity: 85 },
  { month: 'Sep 2026', inpatient: 85, emergency: 82, maternity: 78 }
];

export const MOCK_OCR_ACCURACY_DATA = [
  { type: 'Daily OPD Dispensing Register (Handwritten)', processed: 640, accuracy: 95.8, corrections: 27 },
  { type: 'Warehouse Inward Challans (Printed/Stamp)', processed: 280, accuracy: 98.9, corrections: 3 },
  { type: 'Sub-Centre ASHA Outreach Log (Pencil/Pen)', processed: 420, accuracy: 93.4, corrections: 28 },
  { type: 'Physical Stock Inventory Ledger Sheet', processed: 320, accuracy: 97.2, corrections: 9 },
  { type: 'Voice Entries (Hindi/Hinglish NLP)', processed: 180, accuracy: 96.5, corrections: 6 }
];
