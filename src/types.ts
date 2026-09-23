export type Role = 'phc_worker' | 'medical_officer' | 'district_admin' | 'state_admin';

export type StatusColor = 'green' | 'yellow' | 'red' | 'blue';

export interface PHCFacility {
  id: string;
  name: string;
  code: string;
  block: string;
  district: string;
  state: string;
  type: 'PHC' | '24x7 PHC' | 'CHC';
  sanctionedBeds: number;
  activeBeds: number;
  occupiedBeds: number;
  distanceKmFromDistrictHQ: number;
  contactNumber: string;
  medicalOfficerInCharge: string;
  subCentresCovered: number;
  populationServed: number;
}

export interface MedicineItem {
  id: string;
  phcId: string;
  name: string;
  category: 'Essential ORS/Fluids' | 'Analgesics' | 'Antibiotics' | 'Maternal & Child' | 'Vaccines & Antidotes' | 'Chronic Care';
  unit: string;
  currentStock: number;
  dailyConsumption: number;
  weeklyConsumption: number;
  minStockLevel: number;
  maxStockLevel: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  pendingOrders: number;
  expectedDeliveryDate?: string;
  sourceWarehouse: string;
  // AI calculated fields
  projectedStockoutDays: number;
  stockoutRisk: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS';
  predictedSurplus: number;
  forecast7Day: number;
  forecast30Day: number;
  fefoPriority: 'NORMAL' | 'EXPIRING_SOON' | 'URGENT';
}

export interface ExtractedOCRRecord {
  id: string;
  medicine: string;
  batch: string;
  quantity: number;
  date: string;
  transaction: 'Dispensed (OPD)' | 'Received (Warehouse)' | 'Emergency Inpatient' | 'Damaged/Expired';
  prescribedBy: string;
  verified: boolean;
  confidenceScore: number;
}

export interface VoiceEntryResult {
  rawTranscript: string;
  languageDetected: string;
  parsedMedicine: string;
  parsedTransaction: 'Consumption' | 'Receipt' | 'Emergency Dispense';
  parsedQuantity: number;
  parsedDate: string;
  confidence: number;
  notes?: string;
}

export interface CapacityRecord {
  phcId: string;
  date: string;
  opdFootfall: number;
  emergencyFootfall: number;
  admissions: number;
  discharges: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number; // percentage
  trend: 'increasing' | 'stable' | 'decreasing';
  laborRoomBeds: number;
  laborRoomBedsOccupied: number;
  emergencyObservationBeds: number;
  emergencyObservationOccupied: number;
  oxygenSupportedBeds: number;
  oxygenBedsOccupied: number;
  averageLengthOfStayDays: number;
  bedTurnoverRate: number;
  peakOccupancyHours: string;
  nearbyAlternatives: {
    facilityId: string;
    facilityName: string;
    distanceKm: number;
    availableBeds: number;
    utilizationRate: number;
  }[];
}

export interface StaffMember {
  id: string;
  phcId: string;
  name: string;
  role: 'Medical Officer' | 'Staff Nurse' | 'Pharmacist' | 'Lab Technician' | 'ANM / Health Worker' | 'Data Entry Operator' | string;
  qualification: string;
  assignedArea: string;
  shift: 'Morning' | 'Evening' | 'Night' | 'On Call';
  status: 'PRESENT' | 'FIELD_DUTY' | 'ON_LEAVE' | 'DEPLETED' | string;
  attendanceStatus?: 'Present' | 'On Leave' | 'Deputed' | 'Absent';
  patientLoadToday?: number;
  burnoutRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  contact: string;
}

export interface WorkforceSummary {
  phcId: string;
  totalStaffSanctioned: number;
  staffPresentToday: number;
  staffOnFieldDuty: number;
  staffOnLeave: number;
  patientLoadToday: number;
  patientToStaffRatio: number;
  workloadIndex: 'OPTIMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendation?: string;
}

export interface LikelyHealthImpact {
  condition: string;
  projectedIncrease: string;
  rationale: string;
}

export interface PreparatoryActionItem {
  action: string;
  priority: 'CRITICAL' | 'HIGH' | 'ROUTINE';
  category: string;
}

export interface WeatherPreparedness {
  phcId: string;
  location: string;
  district: string;
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
  rainfallMm: number;
  rainfallForecastMm: number;
  airQualityIndex: number;
  uvIndex: number;
  alertType: 'Heatwave Warning' | 'Monsoon Flash Surge' | 'Dust Storm' | 'Normal Summer' | 'Cold Wave Alert' | string;
  alertLevel: 'NORMAL' | 'YELLOW' | 'ORANGE' | 'RED';
  seasonalProfile: 'Summer/Heatwave' | 'Monsoon' | 'Winter';
  historicalCorrelationNote: string;
  likelyHealthImpacts: LikelyHealthImpact[];
  recommendedPreparatoryActions: PreparatoryActionItem[];
  vulnerableMedicines: {
    medicineName: string;
    demandSurgePercent: number;
    reason: string;
    actionRequired: string;
  }[];
}

export type OrderStatus =
  | 'REQUESTED'
  | 'APPROVAL PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'DISPATCHED'
  | 'IN TRANSIT'
  | 'DELIVERED'
  | 'RECEIVED';

export interface LogisticsOrder {
  id: string;
  phcId: string;
  phcName: string;
  medicineName: string;
  quantityRequested: number;
  quantityDispatched?: number;
  source: string;
  destination: string;
  status: OrderStatus;
  requestDate: string;
  approvalDate?: string;
  dispatchDate?: string;
  estimatedDelivery: string;
  actualDeliveryDate?: string;
  consignmentId?: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
  notes?: string;
}

export interface RedistributionOpportunity {
  id: string;
  medicineName: string;
  batchNumber?: string;
  transferQuantity?: number;
  sourcePHCName?: string;
  destinationPHCName?: string;
  clinicalRationale?: string;
  sourcePHC?: {
    id: string;
    name: string;
    currentStock: number;
    projectedDemand: number;
    potentialSurplus: number;
  };
  targetPHC?: {
    id: string;
    name: string;
    currentStock: number;
    projectedDemand: number;
    projectedShortage: number;
    urgencyLevel: 'HIGH' | 'CRITICAL' | 'MODERATE';
  };
  recommendedTransferQuantity: number;
  transitDistanceKm: number;
  estimatedTransitTimeHours: number;
  status: 'PENDING_REVIEW' | 'PROPOSED' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED';
}

export interface OperationalAlert {
  id: string;
  phcId: string;
  phcName: string;
  facilityName?: string;
  category: 'CRITICAL' | 'WARNING' | 'PREPAREDNESS' | 'INFO';
  title: string;
  description?: string;
  iconType?: string;
  actionLink?: string;
  timestamp: string;
  whatHappened?: string;
  whyItMatters?: string;
  supportingData?: string;
  suggestedAction?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface NetworkFacility {
  id: string;
  name: string;
  code: string;
  block: string;
  district: string;
  state: string;
  facilityType: 'PHC' | '24x7 PHC' | 'CHC' | 'Sub-Centre' | 'RMSCL Warehouse';
  latitude: number;
  longitude: number;
  contactNumber: string;
  medicalOfficerInCharge: string;
  sanctionedBeds: number;
  occupiedBeds: number;
  capacityUtilization: number; // percentage
  operationalRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  medicineRisk: 'ADEQUATE' | 'BUFFER_DEPLETING' | 'CRITICAL_DEFICIT' | 'SURPLUS_AVAILABLE';
  workforceStatus: 'OPTIMAL' | 'MODERATE' | 'SHORTAGE';
  preparednessStatus: 'PREPARED' | 'ALERTED' | 'ACTION_REQUIRED';
  staffPresentCount: number;
  staffSanctionedCount: number;
  coldChainTempC?: number;
  keyShortages: {
    medicineName: string;
    currentStock: number;
    projectedBurnPerDay: number;
    daysRemaining: number;
    deficitQuantity: number;
    unit: string;
  }[];
  keySurpluses: {
    medicineName: string;
    currentStock: number;
    surplusQuantity: number;
    unit: string;
  }[];
  notes?: string;
}

export interface LogisticsTransitRoute {
  id: string;
  consignmentId: string;
  originFacilityId: string;
  originName: string;
  destinationFacilityId: string;
  destinationName: string;
  cargoDescription: string;
  totalUnits: number;
  vehicleNumber: string;
  driverName: string;
  driverContact: string;
  progressPercent: number; // 0 - 100
  currentPosition: [number, number]; // [lat, lng]
  waypoints: [number, number][];
  departureTime: string;
  etaMinutes: number;
  reeferTempC?: number;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'APPROACHING' | 'DELIVERED';
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
}

export interface RedistributionLink {
  id: string;
  sourceFacilityId: string;
  destinationFacilityId: string;
  medicineName: string;
  recommendedQuantity: number;
  unit: string;
  distanceKm: number;
  estimatedTransitHours: number;
  status: 'PROPOSED' | 'PENDING_REVIEW' | 'APPROVED' | 'IN_TRANSIT';
  urgency: 'HIGH' | 'CRITICAL' | 'MODERATE';
}

export interface WeatherContourZone {
  id: string;
  name: string;
  alertLevel: 'RED_ALERT' | 'ORANGE_ALERT' | 'YELLOW_ALERT' | 'GREEN_NORMAL';
  ambientTempC: number;
  relativeHumidity: number;
  heatIndexC: number;
  polygon: [number, number][];
  advisoryText: string;
}

export interface IntegrationConnector {
  id: string;
  name: string;
  acronym: string;
  category: 'Supply Chain' | 'Health Registry' | 'Weather & Environmental' | 'Logistics & GIS' | 'Digital Health Mission';
  description: string;
  status: 'CONNECTED' | 'NOT CONNECTED' | 'CONFIGURE';
  lastSync?: string;
  latencyMs?: number;
  endpoint?: string;
  endpointUrl?: string;
  protocol: 'REST / JSON' | 'HL7 / FHIR' | 'SFTP / Batch' | 'MQTT / IoT';
  dataExchanged: string;
}

export interface SurplusCandidate {
  facility: NetworkFacility;
  medicineName: string;
  availableStock: number;
  projectedSurplus: number;
  distanceKm: number;
  estimatedTravelTimeMinutes: number;
  transitSpeedKmh: number;
  roadQuality: 'Highway (NH-62)' | 'State Highway' | 'Rural / Desert Road';
  unit: string;
  authorizedMOIC: string;
  contactNumber: string;
}
