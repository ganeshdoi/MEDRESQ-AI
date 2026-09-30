import {
  NetworkFacility,
  LogisticsTransitRoute,
  RedistributionLink,
  WeatherContourZone,
  MedicineItem
} from '../types.ts';
import { INDIA_PHC_DIRECTORY, PHC_GEO_COORDINATES } from './indiaPHCDirectory.ts';
import { generateEssentialMedicinesForPHC } from './nationalEssentialMedicines.ts';
import { evaluateNetworkMapFacilities } from '../utils/inventoryForecast.ts';

const BASE_NETWORK_FACILITIES: NetworkFacility[] = [
  // 1. Central Warehouse & Logistics Hubs
  {
    id: 'rmscl-mandore',
    name: 'RMSCL District Drug Warehouse Mandore',
    code: 'RJ-JDP-RMSCL-01',
    block: 'Mandore',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'RMSCL Warehouse',
    latitude: 26.354,
    longitude: 73.042,
    contactNumber: '+91 291 2571204',
    medicalOfficerInCharge: 'Shri R.K. Bishnoi (Warehouse Manager)',
    sanctionedBeds: 0,
    occupiedBeds: 0,
    capacityUtilization: 68,
    operationalRisk: 'LOW',
    medicineRisk: 'SURPLUS_AVAILABLE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 18,
    staffSanctionedCount: 20,
    coldChainTempC: 3.8,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 45000, surplusQuantity: 28000, unit: 'Sachets' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 12000, surplusQuantity: 6500, unit: 'Bottles' },
      { medicineName: 'Ringer Lactate Injection 500ml', currentStock: 8500, surplusQuantity: 4200, unit: 'Bottles' },
      { medicineName: 'Paracetamol Tablets IP 500mg', currentStock: 150000, surplusQuantity: 90000, unit: 'Tablets' }
    ],
    notes: 'Primary RMSCL nodal warehouse supplying 48 PHCs and 14 CHCs in Jodhpur and Phalodi districts.'
  },
  {
    id: 'depot-phalodi',
    name: 'Phalodi Regional Emergency Buffer Depot',
    code: 'RJ-PHL-DEPOT-02',
    block: 'Phalodi',
    district: 'Phalodi',
    state: 'Rajasthan',
    facilityType: 'RMSCL Warehouse',
    latitude: 27.131,
    longitude: 72.365,
    contactNumber: '+91 2925 222190',
    medicalOfficerInCharge: 'Dr. Kailash Meena (Nodal Officer)',
    sanctionedBeds: 0,
    occupiedBeds: 0,
    capacityUtilization: 45,
    operationalRisk: 'LOW',
    medicineRisk: 'SURPLUS_AVAILABLE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 8,
    staffSanctionedCount: 10,
    coldChainTempC: 4.1,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 18000, surplusQuantity: 9500, unit: 'Sachets' },
      { medicineName: 'Zinc Sulfate Dispersible Tablets 20mg', currentStock: 6000, surplusQuantity: 3200, unit: 'Tablets' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 4200, surplusQuantity: 1800, unit: 'Bottles' }
    ],
    notes: 'Desert frontier buffer depot designated for fast emergency resupply across extreme heatwave corridors.'
  },

  // 2. Primary Health Centres (PHCs)
  {
    id: 'phc-osian',
    name: 'PHC Osian (24x7)',
    code: 'RJ-JDP-PHC-021',
    block: 'Osian',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: '24x7 PHC',
    latitude: 26.726,
    longitude: 72.912,
    contactNumber: '+91 2927 220112',
    medicalOfficerInCharge: 'Dr. Suresh Chandra Bishnoi',
    sanctionedBeds: 20,
    occupiedBeds: 17,
    capacityUtilization: 85,
    operationalRisk: 'CRITICAL',
    medicineRisk: 'CRITICAL_DEFICIT',
    workforceStatus: 'SHORTAGE',
    preparednessStatus: 'ACTION_REQUIRED',
    staffPresentCount: 7,
    staffSanctionedCount: 14,
    coldChainTempC: 4.2,
    keyShortages: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 210, projectedBurnPerDay: 115, daysRemaining: 1.8, deficitQuantity: 590, unit: 'Sachets' },
      { medicineName: 'Polyvalent Anti-Snake Venom (ASV) 10ml', currentStock: 9, projectedBurnPerDay: 5, daysRemaining: 1.8, deficitQuantity: 25, unit: 'Vials' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 64, projectedBurnPerDay: 19, daysRemaining: 3.4, deficitQuantity: 116, unit: 'Bottles' },
      { medicineName: 'Oxytocin Injection 10 IU/ml', currentStock: 18, projectedBurnPerDay: 5, daysRemaining: 3.6, deficitQuantity: 40, unit: 'Ampoules' },
      { medicineName: 'Ringer Lactate Injection 500ml', currentStock: 48, projectedBurnPerDay: 14, daysRemaining: 3.4, deficitQuantity: 92, unit: 'Bottles' }
    ],
    keySurpluses: [
      { medicineName: 'Paracetamol Tablets IP 500mg', currentStock: 4200, surplusQuantity: 1200, unit: 'Tablets' }
    ],
    notes: 'Active Primary Facility: Severe heatwave surge with 44.8°C ambient temperature. Physical ORS and ASV buffer below transit window.'
  },
  {
    id: 'phc-mandore',
    name: 'PHC Mandore',
    code: 'RJ-JDP-PHC-014',
    block: 'Mandore',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'PHC',
    latitude: 26.355,
    longitude: 73.038,
    contactNumber: '+91 291 2570889',
    medicalOfficerInCharge: 'Dr. Anita Choudhary',
    sanctionedBeds: 16,
    occupiedBeds: 5,
    capacityUtilization: 31,
    operationalRisk: 'LOW',
    medicineRisk: 'SURPLUS_AVAILABLE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 12,
    staffSanctionedCount: 12,
    coldChainTempC: 3.9,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 2150, surplusQuantity: 1200, unit: 'Sachets' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 520, surplusQuantity: 220, unit: 'Bottles' },
      { medicineName: 'Zinc Sulfate Dispersible Tablets 20mg', currentStock: 850, surplusQuantity: 350, unit: 'Tablets' }
    ],
    notes: 'Surplus holding facility: Low OPD footfall, direct proximity to Mandore warehouse. High capacity for lateral redistribution.'
  },
  {
    id: 'phc-tinwari',
    name: 'PHC Tinwari',
    code: 'RJ-JDP-PHC-029',
    block: 'Tinwari',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'PHC',
    latitude: 26.565,
    longitude: 72.845,
    contactNumber: '+91 2927 241030',
    medicalOfficerInCharge: 'Dr. Dinesh Panwar',
    sanctionedBeds: 12,
    occupiedBeds: 7,
    capacityUtilization: 58,
    operationalRisk: 'MODERATE',
    medicineRisk: 'ADEQUATE',
    workforceStatus: 'MODERATE',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 8,
    staffSanctionedCount: 10,
    coldChainTempC: 4.0,
    keyShortages: [
      { medicineName: 'Zinc Sulfate Dispersible Tablets 20mg', currentStock: 90, projectedBurnPerDay: 20, daysRemaining: 4.5, deficitQuantity: 60, unit: 'Tablets' }
    ],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 800, surplusQuantity: 300, unit: 'Sachets' },
      { medicineName: 'Polyvalent Anti-Snake Venom (ASV) 10ml', currentStock: 24, surplusQuantity: 14, unit: 'Vials' },
      { medicineName: 'Oxytocin Injection 10 IU/ml', currentStock: 40, surplusQuantity: 22, unit: 'Ampoules' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 450, surplusQuantity: 180, unit: 'Bottles' },
      { medicineName: 'Ringer Lactate Injection 500ml', currentStock: 160, surplusQuantity: 70, unit: 'Bottles' }
    ],
    notes: 'Located midway along Osian-Jodhpur corridor (19.1 km south-west of Osian). Rapid surplus responder with >14 days reserve.'
  },
  {
    id: 'phc-balesar',
    name: 'PHC Balesar',
    code: 'RJ-JDP-PHC-032',
    block: 'Balesar',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'PHC',
    latitude: 26.402,
    longitude: 72.482,
    contactNumber: '+91 2929 242019',
    medicalOfficerInCharge: 'Dr. Vikram Rathore',
    sanctionedBeds: 18,
    occupiedBeds: 12,
    capacityUtilization: 66,
    operationalRisk: 'MODERATE',
    medicineRisk: 'BUFFER_DEPLETING',
    workforceStatus: 'MODERATE',
    preparednessStatus: 'ALERTED',
    staffPresentCount: 9,
    staffSanctionedCount: 12,
    coldChainTempC: 4.4,
    keyShortages: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 340, projectedBurnPerDay: 65, daysRemaining: 5.2, deficitQuantity: 180, unit: 'Sachets' }
    ],
    keySurpluses: [
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 280, surplusQuantity: 90, unit: 'Bottles' }
    ],
    notes: 'Jodhpur-Jaisalmer highway belt. 6 inpatient stabilization beds available for emergency referrals.'
  },
  {
    id: 'phc-bhopalgarh',
    name: 'PHC Bhopalgarh',
    code: 'RJ-JDP-PHC-063',
    block: 'Bhopalgarh',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: '24x7 PHC',
    latitude: 26.654,
    longitude: 73.521,
    contactNumber: '+91 2930 252088',
    medicalOfficerInCharge: 'Dr. Sunita Saran',
    sanctionedBeds: 20,
    occupiedBeds: 13,
    capacityUtilization: 65,
    operationalRisk: 'LOW',
    medicineRisk: 'SURPLUS_AVAILABLE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 14,
    staffSanctionedCount: 16,
    coldChainTempC: 3.7,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 1400, surplusQuantity: 650, unit: 'Sachets' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 320, surplusQuantity: 110, unit: 'Bottles' },
      { medicineName: 'Polyvalent Anti-Snake Venom (ASV) 10ml', currentStock: 28, surplusQuantity: 16, unit: 'Vials' },
      { medicineName: 'Oxytocin Injection 10 IU/ml', currentStock: 45, surplusQuantity: 24, unit: 'Ampoules' }
    ],
    notes: 'Eastern Jodhpur 24x7 delivery centre with stable caseload and comfortable buffer reserves of ORS, saline, ASV, and oxytocin.'
  },
  {
    id: 'phc-luni',
    name: 'PHC Luni',
    code: 'RJ-JDP-PHC-008',
    block: 'Luni',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'PHC',
    latitude: 26.142,
    longitude: 73.008,
    contactNumber: '+91 2931 234055',
    medicalOfficerInCharge: 'Dr. Mahendra Gehlot',
    sanctionedBeds: 14,
    occupiedBeds: 7,
    capacityUtilization: 50,
    operationalRisk: 'LOW',
    medicineRisk: 'ADEQUATE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 9,
    staffSanctionedCount: 10,
    coldChainTempC: 4.1,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Paracetamol Tablets IP 500mg', currentStock: 5000, surplusQuantity: 2100, unit: 'Tablets' }
    ],
    notes: 'South Jodhpur river basin zone. Moderate temperature (40.1°C), routine non-surge outpatient volumes.'
  },
  {
    id: 'phc-shergarh',
    name: 'PHC Shergarh Thar',
    code: 'RJ-JDP-PHC-052',
    block: 'Shergarh',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'PHC',
    latitude: 26.321,
    longitude: 72.285,
    contactNumber: '+91 2929 261022',
    medicalOfficerInCharge: 'Dr. Ashok Bhati',
    sanctionedBeds: 16,
    occupiedBeds: 9,
    capacityUtilization: 56,
    operationalRisk: 'LOW',
    medicineRisk: 'SURPLUS_AVAILABLE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 11,
    staffSanctionedCount: 14,
    coldChainTempC: 3.9,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 2400, surplusQuantity: 1100, unit: 'Sachets' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 380, surplusQuantity: 140, unit: 'Bottles' }
    ],
    notes: 'Western desert block centre with solar-powered cold storage and ready surplus saline.'
  },
  {
    id: 'phc-bap',
    name: 'PHC Bap Desert Frontier',
    code: 'RJ-PHL-PHC-004',
    block: 'Bap',
    district: 'Phalodi',
    state: 'Rajasthan',
    facilityType: '24x7 PHC',
    latitude: 27.375,
    longitude: 72.358,
    contactNumber: '+91 2924 233011',
    medicalOfficerInCharge: 'Dr. Rameshwar Lal Jat',
    sanctionedBeds: 18,
    occupiedBeds: 11,
    capacityUtilization: 61,
    operationalRisk: 'MODERATE',
    medicineRisk: 'ADEQUATE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'ALERTED',
    staffPresentCount: 12,
    staffSanctionedCount: 14,
    coldChainTempC: 4.0,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 1900, surplusQuantity: 750, unit: 'Sachets' },
      { medicineName: 'Polyvalent Anti-Snake Venom (ASV) 10ml', currentStock: 22, surplusQuantity: 10, unit: 'Vials' }
    ],
    notes: 'Northern Phalodi desert corridor 24x7 facility equipped with solar cold-chain backup.'
  },
  {
    id: 'phc-pokhran',
    name: 'PHC Pokhran Frontier',
    code: 'RJ-JSM-PHC-005',
    block: 'Pokhran',
    district: 'Phalodi',
    state: 'Rajasthan',
    facilityType: '24x7 PHC',
    latitude: 26.921,
    longitude: 71.918,
    contactNumber: '+91 2994 222118',
    medicalOfficerInCharge: 'Dr. Hemant Purohit',
    sanctionedBeds: 20,
    occupiedBeds: 14,
    capacityUtilization: 70,
    operationalRisk: 'MODERATE',
    medicineRisk: 'BUFFER_DEPLETING',
    workforceStatus: 'MODERATE',
    preparednessStatus: 'ALERTED',
    staffPresentCount: 12,
    staffSanctionedCount: 15,
    coldChainTempC: 4.1,
    keyShortages: [
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 45, projectedBurnPerDay: 15, daysRemaining: 3.0, deficitQuantity: 80, unit: 'Bottles' }
    ],
    keySurpluses: [
      { medicineName: 'Zinc Sulfate Dispersible Tablets 20mg', currentStock: 1800, surplusQuantity: 900, unit: 'Tablets' }
    ],
    notes: 'Strategic desert corridor health centre connecting Phalodi to Jaisalmer border.'
  },
  {
    id: 'phc-dhorimanna',
    name: 'PHC Dhorimanna Border',
    code: 'RJ-BMR-PHC-018',
    block: 'Dhorimanna',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'PHC',
    latitude: 25.321,
    longitude: 71.341,
    contactNumber: '+91 2982 245033',
    medicalOfficerInCharge: 'Dr. Ganpat Singh',
    sanctionedBeds: 14,
    occupiedBeds: 8,
    capacityUtilization: 57,
    operationalRisk: 'LOW',
    medicineRisk: 'ADEQUATE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 9,
    staffSanctionedCount: 10,
    coldChainTempC: 4.0,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 1600, surplusQuantity: 800, unit: 'Sachets' }
    ],
    notes: 'Southwestern Thar border facility.'
  },
  {
    id: 'phc-nokha',
    name: 'PHC Nokha Mandi',
    code: 'RJ-BKN-PHC-009',
    block: 'Nokha',
    district: 'Phalodi',
    state: 'Rajasthan',
    facilityType: '24x7 PHC',
    latitude: 27.598,
    longitude: 73.421,
    contactNumber: '+91 1531 220108',
    medicalOfficerInCharge: 'Dr. Rakesh Godara',
    sanctionedBeds: 20,
    occupiedBeds: 15,
    capacityUtilization: 75,
    operationalRisk: 'LOW',
    medicineRisk: 'SURPLUS_AVAILABLE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 15,
    staffSanctionedCount: 18,
    coldChainTempC: 3.7,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Paracetamol Tablets IP 500mg', currentStock: 25000, surplusQuantity: 12000, unit: 'Tablets' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 650, surplusQuantity: 280, unit: 'Bottles' }
    ],
    notes: 'Northern railhead nodal PHC with extensive warehouse stock connections.'
  },

  // 3. Community Health Centres (CHCs - Referral Hubs)
  {
    id: 'chc-baori',
    name: 'CHC Baori',
    code: 'RJ-JDP-CHC-004',
    block: 'Baori',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'CHC',
    latitude: 26.541,
    longitude: 73.125,
    contactNumber: '+91 2928 233044',
    medicalOfficerInCharge: 'Dr. Ashok Vaishnav (BMO)',
    sanctionedBeds: 30,
    occupiedBeds: 21,
    capacityUtilization: 70,
    operationalRisk: 'MODERATE',
    medicineRisk: 'SURPLUS_AVAILABLE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 22,
    staffSanctionedCount: 25,
    coldChainTempC: 3.6,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 3200, surplusQuantity: 1500, unit: 'Sachets' },
      { medicineName: 'Polyvalent Anti-Snake Venom (ASV) 10ml', currentStock: 50, surplusQuantity: 30, unit: 'Vials' },
      { medicineName: 'Oxytocin Injection 10 IU/ml', currentStock: 80, surplusQuantity: 45, unit: 'Ampoules' },
      { medicineName: 'Paracetamol IV Infusion 1000mg/100ml', currentStock: 600, surplusQuantity: 350, unit: 'Bottles' },
      { medicineName: 'Ringer Lactate Injection 500ml', currentStock: 650, surplusQuantity: 300, unit: 'Bottles' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 900, surplusQuantity: 380, unit: 'Bottles' }
    ],
    notes: '30-bed block referral hospital (29.8 km east of Osian). Equipped with major cold-chain ILR and surplus reserves >14 days.'
  },
  {
    id: 'chc-phalodi',
    name: 'CHC Sub-Divisional Hospital Phalodi',
    code: 'RJ-PHL-CHC-001',
    block: 'Phalodi',
    district: 'Phalodi',
    state: 'Rajasthan',
    facilityType: 'CHC',
    latitude: 27.135,
    longitude: 72.369,
    contactNumber: '+91 2925 222011',
    medicalOfficerInCharge: 'Dr. G.S. Bhati (CMHO In-Charge)',
    sanctionedBeds: 50,
    occupiedBeds: 44,
    capacityUtilization: 88,
    operationalRisk: 'HIGH',
    medicineRisk: 'BUFFER_DEPLETING',
    workforceStatus: 'MODERATE',
    preparednessStatus: 'ALERTED',
    staffPresentCount: 34,
    staffSanctionedCount: 42,
    coldChainTempC: 4.0,
    keyShortages: [
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 220, projectedBurnPerDay: 48, daysRemaining: 4.5, deficitQuantity: 300, unit: 'Bottles' }
    ],
    keySurpluses: [
      { medicineName: 'Zinc Sulfate Dispersible Tablets 20mg', currentStock: 3200, surplusQuantity: 1200, unit: 'Tablets' }
    ],
    notes: 'Sub-divisional desert hospital with 88% bed occupancy due to severe solar radiation admissions.'
  },
  {
    id: 'chc-bilara',
    name: 'CHC Bilara',
    code: 'RJ-JDP-CHC-009',
    block: 'Bilara',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'CHC',
    latitude: 26.182,
    longitude: 73.712,
    contactNumber: '+91 2930 222144',
    medicalOfficerInCharge: 'Dr. Priya Sharma',
    sanctionedBeds: 35,
    occupiedBeds: 19,
    capacityUtilization: 54,
    operationalRisk: 'LOW',
    medicineRisk: 'ADEQUATE',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 26,
    staffSanctionedCount: 28,
    coldChainTempC: 3.8,
    keyShortages: [],
    keySurpluses: [
      { medicineName: 'Paracetamol Tablets IP 500mg', currentStock: 12000, surplusQuantity: 5500, unit: 'Tablets' },
      { medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml', currentStock: 800, surplusQuantity: 320, unit: 'Bottles' }
    ],
    notes: 'Well-supplied referral center serving south-east Jodhpur rural clusters.'
  },

  // 4. Sub-Centres / Health & Wellness Centres (HWCs) Under PHC Osian
  {
    id: 'hwc-khetasar',
    name: 'HWC Sub-Centre Khetasar',
    code: 'RJ-JDP-HWC-021-A',
    block: 'Osian',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'Sub-Centre',
    latitude: 26.792,
    longitude: 72.871,
    contactNumber: '+91 9414 110291',
    medicalOfficerInCharge: 'Smt. Shanti Devi (CHO)',
    sanctionedBeds: 2,
    occupiedBeds: 1,
    capacityUtilization: 50,
    operationalRisk: 'HIGH',
    medicineRisk: 'CRITICAL_DEFICIT',
    workforceStatus: 'MODERATE',
    preparednessStatus: 'ACTION_REQUIRED',
    staffPresentCount: 2,
    staffSanctionedCount: 2,
    coldChainTempC: undefined,
    keyShortages: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 15, projectedBurnPerDay: 8, daysRemaining: 1.8, deficitQuantity: 65, unit: 'Sachets' },
      { medicineName: 'Paracetamol Tablets IP 500mg', currentStock: 80, projectedBurnPerDay: 30, daysRemaining: 2.6, deficitQuantity: 120, unit: 'Tablets' }
    ],
    keySurpluses: [],
    notes: 'Sub-centre 11.2 km north of Osian. Directly reliant on PHC Osian dispensary for daily replenishable stock.'
  },
  {
    id: 'hwc-bhed',
    name: 'HWC Sub-Centre Bhed',
    code: 'RJ-JDP-HWC-021-B',
    block: 'Osian',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'Sub-Centre',
    latitude: 26.685,
    longitude: 72.985,
    contactNumber: '+91 9414 110292',
    medicalOfficerInCharge: 'Shri Om Prakash (ANM/MPW)',
    sanctionedBeds: 2,
    occupiedBeds: 0,
    capacityUtilization: 0,
    operationalRisk: 'MODERATE',
    medicineRisk: 'BUFFER_DEPLETING',
    workforceStatus: 'OPTIMAL',
    preparednessStatus: 'PREPARED',
    staffPresentCount: 2,
    staffSanctionedCount: 2,
    coldChainTempC: undefined,
    keyShortages: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 25, projectedBurnPerDay: 7, daysRemaining: 3.5, deficitQuantity: 45, unit: 'Sachets' },
      { medicineName: 'Oxytocin Injection 10 IU/ml', currentStock: 6, projectedBurnPerDay: 2, daysRemaining: 3.0, deficitQuantity: 15, unit: 'Ampoules' }
    ],
    keySurpluses: [],
    notes: 'Sub-centre 9.4 km southeast of Osian along desert gravel road.'
  },
  {
    id: 'hwc-tapu',
    name: 'HWC Sub-Centre Tapu',
    code: 'RJ-JDP-HWC-021-C',
    block: 'Osian',
    district: 'Jodhpur',
    state: 'Rajasthan',
    facilityType: 'Sub-Centre',
    latitude: 26.815,
    longitude: 72.998,
    contactNumber: '+91 9414 110293',
    medicalOfficerInCharge: 'Smt. Geeta Bishnoi (CHO)',
    sanctionedBeds: 2,
    occupiedBeds: 2,
    capacityUtilization: 100,
    operationalRisk: 'CRITICAL',
    medicineRisk: 'CRITICAL_DEFICIT',
    workforceStatus: 'SHORTAGE',
    preparednessStatus: 'ACTION_REQUIRED',
    staffPresentCount: 1,
    staffSanctionedCount: 2,
    coldChainTempC: undefined,
    keyShortages: [
      { medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g', currentStock: 10, projectedBurnPerDay: 9, daysRemaining: 1.1, deficitQuantity: 80, unit: 'Sachets' },
      { medicineName: 'Polyvalent Anti-Snake Venom (ASV) 10ml', currentStock: 1, projectedBurnPerDay: 2, daysRemaining: 0.5, deficitQuantity: 8, unit: 'Vials' },
      { medicineName: 'Zinc Sulfate Dispersible Tablets 20mg', currentStock: 12, projectedBurnPerDay: 6, daysRemaining: 2.0, deficitQuantity: 35, unit: 'Tablets' }
    ],
    keySurpluses: [],
    notes: 'Remote dune hamlet 17.5 km north-east of Osian. 100% bed occupancy with dehydration cases.'
  }
];

// Build RAW_NETWORK_FACILITIES strictly from INDIA_PHC_DIRECTORY (96 total demo PHC profiles, 59 in Rajasthan)
// while preserving detailed metadata/coordinates from BASE_NETWORK_FACILITIES where matched.
const baseFacilityById = new Map(BASE_NETWORK_FACILITIES.map((f) => [f.id, f]));

export const RAW_NETWORK_FACILITIES: NetworkFacility[] = INDIA_PHC_DIRECTORY.map((phc, idx) => {
  const baseMatch = baseFacilityById.get(phc.id);
  const coords = PHC_GEO_COORDINATES[phc.id] ||
    (baseMatch ? { lat: baseMatch.latitude, lng: baseMatch.longitude } : {
      lat: 26.5 + (idx % 7) * 0.12,
      lng: 73.0 + (idx % 5) * 0.15
    });

  const utilization =
    phc.sanctionedBeds > 0 ? Math.round((phc.occupiedBeds / phc.sanctionedBeds) * 100) : 60;

  const isHighOccupancy = utilization >= 82;
  const isModOccupancy = !isHighOccupancy && utilization >= 68;

  const staffSanctioned = phc.type === '24x7 PHC' ? 16 : 12;
  const staffPresent = isHighOccupancy
    ? staffSanctioned - 4
    : isModOccupancy
    ? staffSanctioned - 2
    : staffSanctioned - 1;

  return {
    id: phc.id,
    name: phc.name,
    code: phc.code,
    block: phc.block,
    district: phc.district,
    state: phc.state,
    facilityType: phc.type,
    latitude: coords.lat,
    longitude: coords.lng,
    contactNumber: phc.contactNumber,
    medicalOfficerInCharge: phc.medicalOfficerInCharge,
    sanctionedBeds: phc.sanctionedBeds,
    occupiedBeds: phc.occupiedBeds,
    capacityUtilization: baseMatch ? baseMatch.capacityUtilization : utilization,
    operationalRisk: baseMatch
      ? baseMatch.operationalRisk
      : isHighOccupancy
      ? 'CRITICAL'
      : isModOccupancy
      ? 'MODERATE'
      : 'LOW',
    medicineRisk: 'UNKNOWN',
    workforceStatus: baseMatch
      ? baseMatch.workforceStatus
      : isHighOccupancy
      ? 'SHORTAGE'
      : isModOccupancy
      ? 'MODERATE'
      : 'OPTIMAL',
    preparednessStatus: baseMatch
      ? baseMatch.preparednessStatus
      : isHighOccupancy
      ? 'ACTION_REQUIRED'
      : isModOccupancy
      ? 'ALERTED'
      : 'PREPARED',
    staffPresentCount: baseMatch ? baseMatch.staffPresentCount : staffPresent,
    staffSanctionedCount: baseMatch ? baseMatch.staffSanctionedCount : staffSanctioned,
    coldChainTempC: baseMatch?.coldChainTempC ?? Number((3.6 + (idx % 7) * 0.1).toFixed(1)),
    keyShortages: [],
    keySurpluses: [],
    notes:
      baseMatch?.notes ||
      `${phc.type} serving ${phc.populationServed.toLocaleString()} citizens and ${phc.subCentresCovered} Sub-Centres/HWCs in ${phc.block} block, ${phc.district} (${phc.state}). Located ${phc.distanceKmFromDistrictHQ} km from District HQ.`
  };
});

/**
 * Builds the facility-to-inventory map using the canonical INDIA_PHC_DIRECTORY -> generateEssentialMedicinesForPHC mapping.
 */
export function buildDefaultFacilityInventoryMap(
  activePHCId?: string,
  activePHCMedicines?: MedicineItem[]
): Record<string, MedicineItem[]> {
  const map: Record<string, MedicineItem[]> = {};
  for (const phc of INDIA_PHC_DIRECTORY) {
    if (activePHCId && phc.id === activePHCId && Array.isArray(activePHCMedicines) && activePHCMedicines.length > 0) {
      map[phc.id] = activePHCMedicines;
      map[phc.code] = activePHCMedicines;
    } else {
      const meds = generateEssentialMedicinesForPHC(
        phc.id,
        `${phc.district} District Drug Warehouse (RMSCL)`
      );
      map[phc.id] = meds;
      map[phc.code] = meds;
    }
  }
  return map;
}

export const DEFAULT_FACILITY_INVENTORY_MAP: Record<string, MedicineItem[]> =
  buildDefaultFacilityInventoryMap();

export const RAJASTHAN_NETWORK_FACILITIES: NetworkFacility[] = evaluateNetworkMapFacilities(
  RAW_NETWORK_FACILITIES,
  DEFAULT_FACILITY_INVENTORY_MAP,
  { assessedMedicineQuery: 'ALL', isSimulatedData: true }
);

// Active Logistics Dispatches & Routes
export const ACTIVE_LOGISTICS_ROUTES: LogisticsTransitRoute[] = [
  {
    id: 'route-con-8841',
    consignmentId: 'CON-RJ-8841',
    originFacilityId: 'phc-mandore',
    originName: 'PHC Mandore (Nodal Reserve)',
    destinationFacilityId: 'phc-osian',
    destinationName: 'PHC Osian (24x7)',
    cargoDescription: '500 ORS Sachets, 150 Normal Saline (500ml), 50 Ringer Lactate, 2,000 Paracetamol',
    totalUnits: 2700,
    vehicleNumber: 'RJ 19 GC 4812',
    driverName: 'Sohan Lal Gurjar',
    driverContact: '+91 9829 441029',
    progressPercent: 68,
    currentPosition: [26.612, 72.955], // On MDR-61 between Tinwari and Osian
    waypoints: [
      [26.354, 73.042], // Mandore
      [26.425, 73.012], // Mandore Exit
      [26.512, 72.918], // Tinwari Bypass
      [26.612, 72.955], // Current truck location
      [26.726, 72.912]  // PHC Osian gate
    ],
    departureTime: '2026-09-22 08:30 IST',
    etaMinutes: 38,
    reeferTempC: 4.2,
    status: 'IN_TRANSIT',
    priority: 'EMERGENCY_REPLENISHMENT'
  },
  {
    id: 'route-con-8843',
    consignmentId: 'CON-RJ-8843',
    originFacilityId: 'phc-mandore',
    originName: 'PHC Mandore (Nodal Reserve)',
    destinationFacilityId: 'phc-bhopalgarh',
    destinationName: 'PHC Bhopalgarh',
    cargoDescription: '1,200 IV Normal Saline, 400 Ringer Lactate, Routine Antibiotics Batch',
    totalUnits: 2400,
    vehicleNumber: 'RJ 19 GA 3190',
    driverName: 'Rameshwar Choudhary',
    driverContact: '+91 9414 882190',
    progressPercent: 42,
    currentPosition: [26.448, 73.085],
    waypoints: [
      [26.354, 73.042],
      [26.448, 73.085],
      [26.654, 73.521]
    ],
    departureTime: '2026-09-22 09:15 IST',
    etaMinutes: 52,
    reeferTempC: 4.5,
    status: 'IN_TRANSIT',
    priority: 'ROUTINE'
  },
  {
    id: 'route-con-8845',
    consignmentId: 'CON-RJ-8845',
    originFacilityId: 'phc-bap',
    originName: 'PHC Bap Desert Frontier',
    destinationFacilityId: 'phc-pokhran',
    destinationName: 'PHC Pokhran Frontier',
    cargoDescription: '800 ORS Sachets, 250 IV Normal Saline, Heatwave Emergency Packets',
    totalUnits: 1350,
    vehicleNumber: 'RJ 43 GA 1120',
    driverName: 'Mukesh Solanki',
    driverContact: '+91 9414 773120',
    progressPercent: 88,
    currentPosition: [27.133, 72.167],
    waypoints: [
      [27.375, 72.358],
      [26.921, 71.918]
    ],
    departureTime: '2026-09-22 09:40 IST',
    etaMinutes: 12,
    status: 'APPROACHING',
    priority: 'URGENT'
  }
];

// Potential Lateral Redistribution Channels on Map
export const REDISTRIBUTION_MAP_LINKS: RedistributionLink[] = [
  {
    id: 'link-mandore-osian-ors',
    sourceFacilityId: 'phc-mandore',
    destinationFacilityId: 'phc-osian',
    medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    recommendedQuantity: 600,
    unit: 'Sachets',
    distanceKm: 41,
    estimatedTransitHours: 0.9,
    status: 'PENDING_REVIEW',
    urgency: 'CRITICAL'
  },
  {
    id: 'link-mandore-osian-ns',
    sourceFacilityId: 'phc-mandore',
    destinationFacilityId: 'phc-osian',
    medicineName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
    recommendedQuantity: 100,
    unit: 'Bottles',
    distanceKm: 41,
    estimatedTransitHours: 0.9,
    status: 'PENDING_REVIEW',
    urgency: 'HIGH'
  },
  {
    id: 'link-bhopalgarh-osian-rl',
    sourceFacilityId: 'phc-bhopalgarh',
    destinationFacilityId: 'phc-osian',
    medicineName: 'Ringer Lactate Injection 500ml',
    recommendedQuantity: 80,
    unit: 'Bottles',
    distanceKm: 62,
    estimatedTransitHours: 1.2,
    status: 'PENDING_REVIEW',
    urgency: 'MODERATE'
  },
  {
    id: 'link-tinwari-osian-ors',
    sourceFacilityId: 'phc-tinwari',
    destinationFacilityId: 'phc-osian',
    medicineName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    recommendedQuantity: 250,
    unit: 'Sachets',
    distanceKm: 24,
    estimatedTransitHours: 0.5,
    status: 'PENDING_REVIEW',
    urgency: 'HIGH'
  }
];

// Simulated Seasonal Heatwave Scenario Contours (Demo Data — Not Live Weather)
export const WEATHER_CONTOURS: WeatherContourZone[] = [
  {
    id: 'imd-heatwave-red',
    name: 'Simulated Severe Heatwave Scenario Zone (Thar Frontier Demo)',
    alertLevel: 'RED_ALERT',
    ambientTempC: 46.5,
    relativeHumidity: 12,
    heatIndexC: 49.2,
    polygon: [
      [27.35, 72.10],
      [27.30, 72.65],
      [26.90, 72.85],
      [26.75, 72.40],
      [26.95, 72.05],
      [27.35, 72.10]
    ],
    advisoryText: 'Simulated desert heat scenario (46.5°C demo parameter) used to model elevated oral/IV rehydration demand.'
  },
  {
    id: 'imd-heatwave-orange',
    name: 'Simulated Elevated Heat Scenario Zone (Jodhpur-Osian Basin Demo)',
    alertLevel: 'ORANGE_ALERT',
    ambientTempC: 44.8,
    relativeHumidity: 17,
    heatIndexC: 47.1,
    polygon: [
      [26.90, 72.60],
      [26.85, 73.25],
      [26.50, 73.40],
      [26.25, 73.15],
      [26.30, 72.55],
      [26.65, 72.50],
      [26.90, 72.60]
    ],
    advisoryText: 'Simulated summer temperature scenario across Osian, Mandore, Tinwari, and Baori blocks (synthetic demo overlay).'
  },
  {
    id: 'imd-heatwave-yellow',
    name: 'Simulated Moderate Summer Scenario Zone (South-Eastern Belt Demo)',
    alertLevel: 'YELLOW_ALERT',
    ambientTempC: 40.5,
    relativeHumidity: 32,
    heatIndexC: 42.0,
    polygon: [
      [26.35, 73.15],
      [26.40, 73.75],
      [26.05, 73.80],
      [26.00, 73.00],
      [26.35, 73.15]
    ],
    advisoryText: 'Simulated moderate summer scenario along Luni and Bilara river plains (synthetic demo overlay).'
  }
];

// Distance Calculation Utilities
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Calculate realistic road transit distance taking into account winding desert corridors
export function calculateRoadDistanceKm(haversineKm: number): number {
  // Rajasthan desert roads have an average tortuosity multiplier of 1.25x - 1.30x
  return parseFloat((haversineKm * 1.28).toFixed(1));
}

// Estimate travel time in minutes based on road conditions and vehicle type
export function estimateTravelTimeMinutes(
  roadKm: number,
  roadQuality: 'Highway (NH-62)' | 'State Highway' | 'Rural / Desert Road' = 'State Highway'
): number {
  let averageSpeedKmh = 50;
  if (roadQuality === 'Highway (NH-62)') {
    averageSpeedKmh = 65;
  } else if (roadQuality === 'Rural / Desert Road') {
    averageSpeedKmh = 35;
  }
  const hours = roadKm / averageSpeedKmh;
  return Math.max(5, Math.round(hours * 60));
}
