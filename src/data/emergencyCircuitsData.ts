import { EmergencyCircuitPlan, InterPHCCorridor } from '../types.ts';

export const EMERGENCY_CIRCUITS_PRESETS: EmergencyCircuitPlan[] = [
  {
    id: 'circuit-antivenom-monsoon',
    title: 'Monsoon Antivenom & Cold-Chain Rapid Circuit',
    description: 'High-priority distribution of Anti-Snake Venom (ASV) and cold-chain temperature-controlled vials to rural PHCs in snakebite alert zones.',
    category: 'SUPPLY_DISTRIBUTION',
    originId: 'rmscl-mandore',
    waypointIds: ['phc-balesar', 'phc-tinwari', 'phc-osian'],
    destinationId: 'chc-baori',
    vehicle: {
      regNumber: 'RJ-19-GA-4821',
      model: 'Mahindra Bolero Cold-Chain Vaccine & ASV Carrier',
      driverName: 'Mohan Ram Jat',
      driverPhone: '+91 94141 88201'
    },
    teamLeader: {
      name: 'Dr. Ramesh Meena',
      role: 'District Cold-Chain & Antivenom Nodal Officer',
      phone: '+91 98290 44102'
    },
    suppliesAllocations: {
      'phc-balesar': [
        { item: 'Polyvalent Anti-Snake Venom (ASV) IP 10ml', quantity: 20, unit: 'Vials' },
        { item: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', quantity: 80, unit: 'Bottles' },
        { item: 'Adrenaline Injection IP 1:1000', quantity: 15, unit: 'Ampoules' }
      ],
      'phc-tinwari': [
        { item: 'Polyvalent Anti-Snake Venom (ASV) IP 10ml', quantity: 15, unit: 'Vials' },
        { item: 'Ringer Lactate Injection 500ml', quantity: 60, unit: 'Bottles' },
        { item: 'Hydrocortisone Injection 100mg', quantity: 20, unit: 'Vials' }
      ],
      'phc-osian': [
        { item: 'Polyvalent Anti-Snake Venom (ASV) IP 10ml', quantity: 30, unit: 'Vials' },
        { item: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', quantity: 120, unit: 'Bottles' },
        { item: 'Oral Rehydration Salts (ORS) Sachets 20.5g', quantity: 600, unit: 'Sachets' }
      ],
      'chc-baori': [
        { item: 'Polyvalent Anti-Snake Venom (ASV) IP 10ml', quantity: 40, unit: 'Vials' },
        { item: 'Ringer Lactate Injection 500ml', quantity: 150, unit: 'Bottles' }
      ]
    }
  },
  {
    id: 'circuit-heatwave-iv-ors',
    title: 'Desert Heatwave IV Fluid & Oxygen Replenishment',
    description: 'Bulk resupply of dehydration buffers (ORS, Normal Saline, Ringer Lactate) and medical Oxygen cylinders across heat-stressed PHCs.',
    category: 'SUPPLY_DISTRIBUTION',
    originId: 'rmscl-mandore',
    waypointIds: ['phc-tinwari', 'phc-osian'],
    destinationId: 'chc-phalodi',
    vehicle: {
      regNumber: 'RJ-19-GB-7712',
      model: 'Tata 407 Emergency Health Logistics Truck',
      driverName: 'Suresh Kumar Bishnoi',
      driverPhone: '+91 94142 99314'
    },
    teamLeader: {
      name: 'Shri Ashok Bishnoi',
      role: 'Senior RMSCL Logistics Pharmacist',
      phone: '+91 94601 22883'
    },
    suppliesAllocations: {
      'phc-tinwari': [
        { item: 'Oral Rehydration Salts (ORS) Sachets 20.5g', quantity: 800, unit: 'Sachets' },
        { item: 'Zinc Sulfate Dispersible Tablets 20mg', quantity: 200, unit: 'Tablets' },
        { item: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', quantity: 150, unit: 'Bottles' }
      ],
      'phc-osian': [
        { item: 'Oral Rehydration Salts (ORS) Sachets 20.5g', quantity: 1500, unit: 'Sachets' },
        { item: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', quantity: 250, unit: 'Bottles' },
        { item: 'Ringer Lactate Injection 500ml', quantity: 180, unit: 'Bottles' },
        { item: 'Type-D Medical Oxygen Cylinders (46.7L)', quantity: 4, unit: 'Cylinders' }
      ],
      'chc-phalodi': [
        { item: 'Oral Rehydration Salts (ORS) Sachets 20.5g', quantity: 2000, unit: 'Sachets' },
        { item: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', quantity: 400, unit: 'Bottles' },
        { item: 'Zinc Sulfate Dispersible Tablets 20mg', quantity: 1000, unit: 'Tablets' },
        { item: 'Type-D Medical Oxygen Cylinders (46.7L)', quantity: 8, unit: 'Cylinders' }
      ]
    }
  },
  {
    id: 'circuit-doctor-nurse-surge',
    title: 'Surge Doctor & Emergency Anesthetist Deployment',
    description: 'Rapid rotation and deployment of emergency medical officers, obstetric specialists, and critical care nurses to overburdened rural PHCs.',
    category: 'PERSONNEL_DEPLOYMENT',
    originId: 'chc-baori',
    waypointIds: ['phc-bhopalgarh', 'phc-tinwari', 'phc-osian'],
    destinationId: 'rmscl-mandore',
    vehicle: {
      regNumber: 'RJ-19-EM-9901',
      model: 'Force Traveller Emergency Medical Quick Response Unit',
      driverName: 'Kailash Choudhary',
      driverPhone: '+91 94133 66112'
    },
    teamLeader: {
      name: 'Dr. Ashok Vaishnav',
      role: 'Block Medical Officer (BMO) & Trauma Coordinator',
      phone: '+91 98281 77309'
    },
    personnelAllocations: {
      'phc-bhopalgarh': [
        { role: 'Emergency Medical Officer (MBBS)', count: 1 },
        { role: 'Staff Nurse (Critical Care)', count: 2 },
        { role: 'Lab Technician (Bio-chemistry)', count: 1 }
      ],
      'phc-tinwari': [
        { role: 'Emergency Medical Officer (MBBS)', count: 1 },
        { role: 'Pharmacist (Dispensary Lead)', count: 1 }
      ],
      'phc-osian': [
        { role: 'Obstetrician & Gynecologist Specialist', count: 1 },
        { role: 'Emergency Staff Nurse (GNM)', count: 3 },
        { role: 'Ambulance Paramedic', count: 1 }
      ],
      'rmscl-mandore': [
        { role: 'Inspection & Debriefing Officer', count: 1 }
      ]
    }
  },
  {
    id: 'circuit-monsoon-flood-epidemiology',
    title: 'Monsoon Flash Outbreak & Epidemiology Rapid Unit',
    description: 'Specialized mobile surveillance and field clinical team deployed across flood-prone river basin PHCs for acute diarrheal / fever response.',
    category: 'PERSONNEL_DEPLOYMENT',
    originId: 'chc-bilara',
    waypointIds: ['phc-bhopalgarh', 'phc-mandore', 'phc-luni'],
    destinationId: 'rmscl-mandore',
    vehicle: {
      regNumber: 'RJ-19-ER-5533',
      model: 'Tata Winger Mobile Epidemiology Surveillance Van',
      driverName: 'Devendra Singh',
      driverPhone: '+91 94143 44556'
    },
    teamLeader: {
      name: 'Dr. Priya Sharma',
      role: 'District Epidemiologist & Rapid Response Team Lead',
      phone: '+91 98292 33418'
    },
    personnelAllocations: {
      'phc-bhopalgarh': [
        { role: 'Field Epidemiologist', count: 1 },
        { role: 'Lab Technician (Rapid Antigen / Water Testing)', count: 1 }
      ],
      'phc-mandore': [
        { role: 'Public Health Nurse Officer', count: 1 },
        { role: 'Medical Officer (Pediatrics)', count: 1 }
      ],
      'phc-luni': [
        { role: 'Water Sanitation Specialist', count: 1 },
        { role: 'Emergency Staff Nurse', count: 2 },
        { role: 'Paramedic / Field Scout', count: 1 }
      ],
      'rmscl-mandore': [
        { role: 'Surveillance Data Scientist', count: 1 }
      ]
    }
  }
];

export const INTER_PHC_CORRIDORS: InterPHCCorridor[] = [
  {
    id: 'corridor-osian-tinwari',
    facilityAId: 'phc-osian',
    facilityBId: 'phc-tinwari',
    roadDistanceKm: 24.2,
    travelTimeMins: 32,
    highwayType: 'State Highway (SH-61)',
    emergencyStatus: 'CLEAR'
  },
  {
    id: 'corridor-tinwari-mandore',
    facilityAId: 'phc-tinwari',
    facilityBId: 'phc-mandore',
    roadDistanceKm: 32.5,
    travelTimeMins: 42,
    highwayType: 'National Highway (NH-62)',
    emergencyStatus: 'CLEAR'
  },
  {
    id: 'corridor-tinwari-balesar',
    facilityAId: 'phc-tinwari',
    facilityBId: 'phc-balesar',
    roadDistanceKm: 44.8,
    travelTimeMins: 56,
    highwayType: 'Major District Road (MDR-48)',
    emergencyStatus: 'CAUTION_HEATWAVE'
  },
  {
    id: 'corridor-mandore-baori',
    facilityAId: 'phc-mandore',
    facilityBId: 'chc-baori',
    roadDistanceKm: 35.8,
    travelTimeMins: 45,
    highwayType: 'National Highway (NH-62)',
    emergencyStatus: 'CLEAR'
  },
  {
    id: 'corridor-baori-bhopalgarh',
    facilityAId: 'chc-baori',
    facilityBId: 'phc-bhopalgarh',
    roadDistanceKm: 48.0,
    travelTimeMins: 54,
    highwayType: 'State Highway (SH-19)',
    emergencyStatus: 'CLEAR'
  },
  {
    id: 'corridor-mandore-luni',
    facilityAId: 'phc-mandore',
    facilityBId: 'phc-luni',
    roadDistanceKm: 28.4,
    travelTimeMins: 38,
    highwayType: 'Jodhpur Bypass / Luni Link Road',
    emergencyStatus: 'CLEAR'
  },
  {
    id: 'corridor-baori-osian',
    facilityAId: 'chc-baori',
    facilityBId: 'phc-osian',
    roadDistanceKm: 34.0,
    travelTimeMins: 44,
    highwayType: 'Baori-Osian Link Highway',
    emergencyStatus: 'CLEAR'
  },
  {
    id: 'corridor-balesar-osian',
    facilityAId: 'phc-balesar',
    facilityBId: 'phc-osian',
    roadDistanceKm: 58.2,
    travelTimeMins: 72,
    highwayType: 'Desert Rural Corridor',
    emergencyStatus: 'ROUGH_TERRAIN'
  }
];
