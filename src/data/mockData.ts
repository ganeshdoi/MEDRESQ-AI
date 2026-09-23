import {
  PHCFacility,
  MedicineItem,
  CapacityRecord,
  StaffMember,
  WorkforceSummary,
  WeatherPreparedness,
  LogisticsOrder,
  RedistributionOpportunity,
  OperationalAlert,
  IntegrationConnector,
  ExtractedOCRRecord
} from '../types.ts';

export const FACILITIES: PHCFacility[] = [
  {
    id: 'phc-osian',
    name: 'PHC Osian (24x7)',
    code: 'RJ-JDP-PHC-021',
    block: 'Osian',
    district: 'Jodhpur',
    state: 'Rajasthan',
    type: '24x7 PHC',
    sanctionedBeds: 20,
    activeBeds: 20,
    occupiedBeds: 17,
    distanceKmFromDistrictHQ: 64,
    contactNumber: '+91 2927 220112',
    medicalOfficerInCharge: 'Dr. Suresh Chandra Bishnoi',
    subCentresCovered: 8,
    populationServed: 42500
  },
  {
    id: 'phc-mandore',
    name: 'PHC Mandore',
    code: 'RJ-JDP-PHC-014',
    block: 'Mandore',
    district: 'Jodhpur',
    state: 'Rajasthan',
    type: 'PHC',
    sanctionedBeds: 16,
    activeBeds: 16,
    occupiedBeds: 5,
    distanceKmFromDistrictHQ: 9,
    contactNumber: '+91 291 2570889',
    medicalOfficerInCharge: 'Dr. Anita Choudhary',
    subCentresCovered: 6,
    populationServed: 36800
  },
  {
    id: 'phc-balesar',
    name: 'PHC Balesar',
    code: 'RJ-JDP-PHC-032',
    block: 'Balesar',
    district: 'Jodhpur',
    state: 'Rajasthan',
    type: 'PHC',
    sanctionedBeds: 18,
    activeBeds: 18,
    occupiedBeds: 12,
    distanceKmFromDistrictHQ: 72,
    contactNumber: '+91 2929 242019',
    medicalOfficerInCharge: 'Dr. Vikram Rathore',
    subCentresCovered: 7,
    populationServed: 39100
  },
  {
    id: 'phc-bilara',
    name: 'PHC Bilara',
    code: 'RJ-JDP-PHC-045',
    block: 'Bilara',
    district: 'Jodhpur',
    state: 'Rajasthan',
    type: '24x7 PHC',
    sanctionedBeds: 24,
    activeBeds: 24,
    occupiedBeds: 14,
    distanceKmFromDistrictHQ: 78,
    contactNumber: '+91 2930 222144',
    medicalOfficerInCharge: 'Dr. Priya Sharma',
    subCentresCovered: 10,
    populationServed: 54000
  },
  {
    id: 'phc-luni',
    name: 'PHC Luni',
    code: 'RJ-JDP-PHC-008',
    block: 'Luni',
    district: 'Jodhpur',
    state: 'Rajasthan',
    type: 'PHC',
    sanctionedBeds: 14,
    activeBeds: 14,
    occupiedBeds: 7,
    distanceKmFromDistrictHQ: 38,
    contactNumber: '+91 2931 234055',
    medicalOfficerInCharge: 'Dr. Mahendra Gehlot',
    subCentresCovered: 5,
    populationServed: 31200
  }
];

export const INITIAL_MEDICINES: MedicineItem[] = [
  {
    id: 'med-ors-osian',
    phcId: 'phc-osian',
    name: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    category: 'Essential ORS/Fluids',
    unit: 'Sachets',
    currentStock: 210,
    dailyConsumption: 58,
    weeklyConsumption: 390,
    minStockLevel: 500,
    maxStockLevel: 2500,
    batchNumber: 'ORS-RJ-2604',
    expiryDate: '2027-08-31',
    pendingOrders: 500,
    expectedDeliveryDate: '2026-09-26',
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 3.6,
    stockoutRisk: 'CRITICAL',
    predictedSurplus: 0,
    forecast7Day: 460,
    forecast30Day: 1850,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-ns-osian',
    phcId: 'phc-osian',
    name: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
    category: 'Essential ORS/Fluids',
    unit: 'Bottles',
    currentStock: 64,
    dailyConsumption: 16,
    weeklyConsumption: 110,
    minStockLevel: 100,
    maxStockLevel: 500,
    batchNumber: 'NS-IV-998',
    expiryDate: '2027-07-31',
    pendingOrders: 200,
    expectedDeliveryDate: '2026-09-24',
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 4.0,
    stockoutRisk: 'CRITICAL',
    predictedSurplus: 0,
    forecast7Day: 135,
    forecast30Day: 580,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-rl-osian',
    phcId: 'phc-osian',
    name: 'Ringer Lactate (RL) IV Infusion 500ml',
    category: 'Essential ORS/Fluids',
    unit: 'Bottles',
    currentStock: 48,
    dailyConsumption: 12,
    weeklyConsumption: 80,
    minStockLevel: 80,
    maxStockLevel: 400,
    batchNumber: 'RL-RJ-512',
    expiryDate: '2027-09-15',
    pendingOrders: 150,
    expectedDeliveryDate: '2026-09-25',
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 4.0,
    stockoutRisk: 'CRITICAL',
    predictedSurplus: 0,
    forecast7Day: 98,
    forecast30Day: 420,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-pcm-osian',
    phcId: 'phc-osian',
    name: 'Paracetamol Tablets IP 500mg',
    category: 'Analgesics',
    unit: 'Tablets',
    currentStock: 4200,
    dailyConsumption: 190,
    weeklyConsumption: 1300,
    minStockLevel: 1500,
    maxStockLevel: 8000,
    batchNumber: 'PCM-T-440',
    expiryDate: '2026-11-30', // Expiring soon in ~68 days!
    pendingOrders: 0,
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 22.1,
    stockoutRisk: 'NORMAL',
    predictedSurplus: 0,
    forecast7Day: 1330,
    forecast30Day: 5700,
    fefoPriority: 'EXPIRING_SOON'
  },
  {
    id: 'med-amox-osian',
    phcId: 'phc-osian',
    name: 'Amoxicillin Capsules IP 500mg',
    category: 'Antibiotics',
    unit: 'Capsules',
    currentStock: 820,
    dailyConsumption: 65,
    weeklyConsumption: 440,
    minStockLevel: 600,
    maxStockLevel: 3000,
    batchNumber: 'AMX-C-881',
    expiryDate: '2027-12-31',
    pendingOrders: 500,
    expectedDeliveryDate: '2026-09-28',
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 12.6,
    stockoutRisk: 'NORMAL',
    predictedSurplus: 0,
    forecast7Day: 460,
    forecast30Day: 1950,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-zinc-osian',
    phcId: 'phc-osian',
    name: 'Zinc Sulfate Dispersible Tablets 20mg',
    category: 'Maternal & Child',
    unit: 'Tablets',
    currentStock: 340,
    dailyConsumption: 42,
    weeklyConsumption: 290,
    minStockLevel: 400,
    maxStockLevel: 2000,
    batchNumber: 'ZNC-D-102',
    expiryDate: '2027-09-30',
    pendingOrders: 500,
    expectedDeliveryDate: '2026-09-27',
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 8.0,
    stockoutRisk: 'WARNING',
    predictedSurplus: 0,
    forecast7Day: 310,
    forecast30Day: 1300,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-cetz-osian',
    phcId: 'phc-osian',
    name: 'Cetirizine Hydrochloride Tablets 10mg',
    category: 'Analgesics',
    unit: 'Tablets',
    currentStock: 2900,
    dailyConsumption: 30,
    weeklyConsumption: 210,
    minStockLevel: 500,
    maxStockLevel: 2000,
    batchNumber: 'CTZ-H-312',
    expiryDate: '2028-01-31',
    pendingOrders: 0,
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 96.0,
    stockoutRisk: 'SURPLUS',
    predictedSurplus: 900,
    forecast7Day: 210,
    forecast30Day: 900,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-arv-osian',
    phcId: 'phc-osian',
    name: 'Anti-Rabies Vaccine (ARV) 2.5 IU/ml (Cold Chain 2-8°C)',
    category: 'Vaccines & Antidotes',
    unit: 'Vials',
    currentStock: 28,
    dailyConsumption: 3,
    weeklyConsumption: 20,
    minStockLevel: 25,
    maxStockLevel: 100,
    batchNumber: 'ARV-CC-704',
    expiryDate: '2027-04-30',
    pendingOrders: 30,
    expectedDeliveryDate: '2026-09-29',
    sourceWarehouse: 'State Vaccine Depot Jaipur / Jodhpur Cold Store',
    projectedStockoutDays: 9.3,
    stockoutRisk: 'NORMAL',
    predictedSurplus: 0,
    forecast7Day: 22,
    forecast30Day: 95,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-asv-osian',
    phcId: 'phc-osian',
    name: 'Polyvalent Anti-Snake Venom (ASV) 10ml',
    category: 'Vaccines & Antidotes',
    unit: 'Vials',
    currentStock: 12,
    dailyConsumption: 1,
    weeklyConsumption: 4,
    minStockLevel: 15,
    maxStockLevel: 50,
    batchNumber: 'ASV-P-191',
    expiryDate: '2027-02-28',
    pendingOrders: 20,
    expectedDeliveryDate: '2026-09-26',
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 12.0,
    stockoutRisk: 'WARNING',
    predictedSurplus: 0,
    forecast7Day: 6,
    forecast30Day: 25,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-ors-mandore',
    phcId: 'phc-mandore',
    name: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    category: 'Essential ORS/Fluids',
    unit: 'Sachets',
    currentStock: 2150,
    dailyConsumption: 22,
    weeklyConsumption: 150,
    minStockLevel: 400,
    maxStockLevel: 1800,
    batchNumber: 'ORS-RJ-2601',
    expiryDate: '2027-06-30',
    pendingOrders: 0,
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 97.7,
    stockoutRisk: 'SURPLUS',
    predictedSurplus: 1150,
    forecast7Day: 160,
    forecast30Day: 700,
    fefoPriority: 'NORMAL'
  },
  {
    id: 'med-ns-mandore',
    phcId: 'phc-mandore',
    name: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
    category: 'Essential ORS/Fluids',
    unit: 'Bottles',
    currentStock: 520,
    dailyConsumption: 8,
    weeklyConsumption: 55,
    minStockLevel: 100,
    maxStockLevel: 400,
    batchNumber: 'NS-IV-912',
    expiryDate: '2027-05-30',
    pendingOrders: 0,
    sourceWarehouse: 'District Drug Warehouse Mandore (RMSCL)',
    projectedStockoutDays: 65.0,
    stockoutRisk: 'SURPLUS',
    predictedSurplus: 220,
    forecast7Day: 60,
    forecast30Day: 260,
    fefoPriority: 'NORMAL'
  }
];

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
    id: 'st-1',
    phcId: 'phc-osian',
    name: 'Dr. Suresh Chandra Bishnoi',
    role: 'Medical Officer',
    qualification: 'MBBS, DNB Family Medicine',
    assignedArea: 'OPD Chamber 1 & Casualty',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    patientLoadToday: 140,
    burnoutRisk: 'HIGH',
    contact: '+91 98290 11422'
  },
  {
    id: 'st-2',
    phcId: 'phc-osian',
    name: 'Dr. Manisha Meena',
    role: 'Medical Officer',
    qualification: 'MBBS',
    assignedArea: 'Maternal & Child Health Ward',
    shift: 'Evening',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    patientLoadToday: 65,
    burnoutRisk: 'MODERATE',
    contact: '+91 94140 22319'
  },
  {
    id: 'st-3',
    phcId: 'phc-osian',
    name: 'Kamla Devi Gurjar',
    role: 'Staff Nurse',
    qualification: 'GNM, B.Sc Nursing',
    assignedArea: 'Emergency Observation Ward',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    patientLoadToday: 32,
    burnoutRisk: 'HIGH',
    contact: '+91 97840 88121'
  },
  {
    id: 'st-4',
    phcId: 'phc-osian',
    name: 'Sunita Bhati',
    role: 'Staff Nurse',
    qualification: 'GNM',
    assignedArea: 'Inpatient General Ward',
    shift: 'Night',
    status: 'ON_LEAVE',
    attendanceStatus: 'On Leave',
    burnoutRisk: 'LOW',
    contact: '+91 94600 34112'
  },
  {
    id: 'st-5',
    phcId: 'phc-osian',
    name: 'Rameshwar Lal Patel',
    role: 'Pharmacist',
    qualification: 'B.Pharm, Registered Pharmacist',
    assignedArea: 'Main Pharmacy & Cold Storage',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    patientLoadToday: 210,
    burnoutRisk: 'HIGH',
    contact: '+91 98292 90123'
  },
  {
    id: 'st-6',
    phcId: 'phc-osian',
    name: 'Geeta Kumari',
    role: 'ANM / Health Worker',
    qualification: 'MPHW(F) / ANM',
    assignedArea: 'Sub-Centre Bhed & Village Outreach',
    shift: 'Morning',
    status: 'FIELD_DUTY',
    attendanceStatus: 'Present',
    patientLoadToday: 45,
    burnoutRisk: 'MODERATE',
    contact: '+91 97720 19344'
  },
  {
    id: 'st-7',
    phcId: 'phc-osian',
    name: 'Dinesh Kumar Sen',
    role: 'Lab Technician',
    qualification: 'DMLT, B.Sc MLT',
    assignedArea: 'Clinical Diagnostics Lab',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    patientLoadToday: 78,
    burnoutRisk: 'MODERATE',
    contact: '+91 98294 66100'
  },
  {
    id: 'st-8',
    phcId: 'phc-osian',
    name: 'Pooja Verma',
    role: 'Staff Nurse',
    qualification: 'GNM',
    assignedArea: 'Labor & Delivery Room',
    shift: 'Morning',
    status: 'PRESENT',
    attendanceStatus: 'Present',
    patientLoadToday: 18,
    burnoutRisk: 'MODERATE',
    contact: '+91 94142 88200'
  }
];

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
    approvalDate: '2026-09-21',
    dispatchDate: '2026-09-22',
    estimatedDelivery: '2026-09-23',
    consignmentId: 'RJ-VTS-66014',
    priority: 'EMERGENCY_REPLENISHMENT',
    notes: 'Priority dispatch requested due to IMD heatwave orange alert and buffer stock dip.'
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
    approvalDate: '2026-09-20',
    dispatchDate: '2026-09-22',
    estimatedDelivery: '2026-09-24',
    consignmentId: 'RJ-VTS-65980',
    priority: 'URGENT',
    notes: 'Batch assigned: NS-IV-1004'
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
    approvalDate: '2026-09-22',
    estimatedDelivery: '2026-09-26',
    priority: 'ROUTINE',
    notes: 'Awaiting picker verification at district central store'
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
    approvalDate: '2026-09-16',
    dispatchDate: '2026-09-18',
    estimatedDelivery: '2026-09-19',
    actualDeliveryDate: '2026-09-19',
    consignmentId: 'RJ-VTS-65412',
    priority: 'ROUTINE',
    notes: 'Received and verified in physical stock book'
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
      projectedDemand: 350,
      potentialSurplus: 1200
    },
    targetPHC: {
      id: 'phc-osian',
      name: 'PHC Osian (24x7)',
      currentStock: 210,
      projectedDemand: 800,
      projectedShortage: 590,
      urgencyLevel: 'CRITICAL'
    },
    recommendedTransferQuantity: 600,
    transitDistanceKm: 55,
    estimatedTransitTimeHours: 1.2,
    status: 'PROPOSED'
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
      projectedDemand: 120,
      potentialSurplus: 220
    },
    targetPHC: {
      id: 'phc-osian',
      name: 'PHC Osian (24x7)',
      currentStock: 64,
      projectedDemand: 180,
      projectedShortage: 116,
      urgencyLevel: 'HIGH'
    },
    recommendedTransferQuantity: 100,
    transitDistanceKm: 55,
    estimatedTransitTimeHours: 1.2,
    status: 'PENDING_REVIEW'
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
