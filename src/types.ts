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

export interface MedicineBatch {
  batchNumber: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}

export interface MedicineItem {
  id: string;
  phcId: string;
  name: string;
  category: 'Essential ORS/Fluids' | 'Analgesics' | 'Antibiotics' | 'Maternal & Child' | 'Vaccines & Antidotes' | 'Chronic Care';
  unit: string;
  currentStock: number;
  stock?: number;
  dailyConsumption: number;
  weeklyConsumption: number;
  minStockLevel: number;
  minThreshold?: number;
  maxStockLevel: number;
  maxThreshold?: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  batches?: MedicineBatch[];
  pendingOrders: number;
  reservedStock?: number;
  expectedDeliveryDate?: string;
  sourceWarehouse: string;
  warehouseSource?: string;
  // Deterministic forecast fields
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

export type VoiceTransactionType =
  | 'Consumption'
  | 'Receipt'
  | 'Emergency Dispense'
  | 'Check Stock'
  | 'Replenishment Order'
  | 'Report Shortage'
  | 'Register Entry'
  | 'Add PHC Data';

export interface VoiceEntryResult {
  rawTranscript: string;
  languageDetected: string;
  englishTranslation?: string;
  hindiTranslation?: string;
  nativeScriptSummary?: string;
  wardDepartment?: string;
  engineUsed?: string;
  sttEngine?: string;
  commandIntent?: string;
  parsedMedicine: string;
  parsedTransaction: VoiceTransactionType;
  parsedQuantity: number;
  parsedBatch?: string;
  parsedDate: string;
  parsedOpdFootfall?: number;
  parsedOccupiedBeds?: number;
  parsedEmergencyCases?: number;
  confidence: number;
  notes?: string;
}

export interface RecentVoiceCommand {
  id: string;
  transcript: string;
  language: string;
  languageLabel: string;
  parsedMedicine: string;
  parsedQuantity: number;
  parsedTransaction: VoiceTransactionType;
  englishTranslation?: string;
  engineUsed?: string;
  executedAt: string;
  committedToLedger?: boolean;
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

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'NOT_MARKED';
export type AttendanceSyncStatus = 'SYNCED' | 'QUEUED' | 'SYNCING' | 'FAILED';

export interface StaffAttendanceRecord {
  attendanceId: string;
  staffId: string;
  staffName: string;
  designation: string;
  department?: string;
  phcId: string;
  phcName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  previousStatus?: AttendanceStatus;
  markedBy: string;
  markedByOfficerId?: string;
  markedAt: string;
  syncStatus: AttendanceSyncStatus;
}

export interface StaffMember {
  id: string;
  staffCode?: string;
  phcId: string;
  phcName?: string;
  name: string;
  role: 'Medical Officer' | 'Staff Nurse' | 'Pharmacist' | 'Lab Technician' | 'ANM / Health Worker' | 'ANM' | 'CHO' | 'Data Entry Operator' | 'Other' | string;
  designation?: string;
  department?: string;
  qualification: string;
  assignedArea: string;
  shift: 'Morning' | 'Evening' | 'Night' | 'On Call';
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'NOT_MARKED' | 'FIELD_DUTY' | 'DEPLETED' | string;
  attendanceStatus?: 'Present' | 'Absent' | 'On Leave' | 'Not Marked' | 'Deputed';
  lastAttendanceUpdate?: string;
  lastMarkedBy?: string;
  patientLoadToday?: number;
  burnoutRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  contact: string;
  isSyntheticDemo?: boolean;
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
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REQUESTED'
  | 'APPROVAL PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'DISPATCHED'
  | 'IN TRANSIT'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'CANCELLED';

export type RedistributionStatus =
  | 'PENDING_REVIEW'
  | 'PROPOSED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface StatusTransitionRecord {
  transactionId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
  actor?: string;
  note?: string;
}

export interface SupplyChainAuditEntry {
  transactionId: string;
  entityId: string;
  entityType: 'WAREHOUSE_INDENT' | 'INTER_PHC_TRANSFER' | 'INVENTORY_DISPENSE' | 'OCR_VERIFY' | 'STAFF_ATTENDANCE';
  medicineName: string;
  medicineId?: string;
  quantity: number;
  unit: string;
  source: string;
  destination: string;
  timestamp: string;
  previousStatus: string;
  newStatus: string;
  actor?: string;
  stockImpactSummary?: string;
  isHistoricalDemo?: boolean;
  notes?: string;
}

export interface LogisticsOrder {
  id: string;
  phcId: string;
  phcName: string;
  medicineId?: string;
  medicineName: string;
  quantityRequested: number;
  quantityDispatched?: number;
  source: string;
  destination: string;
  status: OrderStatus;
  requestDate: string;
  submittedDate?: string;
  approvalDate?: string;
  dispatchDate?: string;
  inTransitDate?: string;
  estimatedDelivery: string;
  actualDeliveryDate?: string;
  cancelledDate?: string;
  cancelReason?: string;
  cancellationReason?: string;
  consignmentId?: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
  notes?: string;
  isHistoricalDemo?: boolean;
  stockCredited?: boolean;
  pipelineTracked?: boolean;
  statusHistory?: StatusTransitionRecord[];
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
    usableStock?: number;
    reservedStock?: number;
    minStockLevel?: number;
    projectedDemand: number;
    potentialSurplus: number;
  };
  targetPHC?: {
    id: string;
    name: string;
    currentStock: number;
    usableStock?: number;
    projectedDemand: number;
    projectedShortage: number;
    urgencyLevel: 'HIGH' | 'CRITICAL' | 'MODERATE';
  };
  recommendedTransferQuantity: number;
  transitDistanceKm: number;
  estimatedTransitTimeHours: number;
  status: RedistributionStatus;
  donorReserved?: boolean;
  reservedQuantity?: number;
  donorDeducted?: boolean;
  receiverCredited?: boolean;
  sourceMedicineId?: string;
  targetMedicineId?: string;
  createdDate?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  completedAt?: string;
  receivedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  statusReason?: string;
  isHistoricalDemo?: boolean;
  statusHistory?: StatusTransitionRecord[];
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
  medicineId?: string;
  currentStock?: number;
  thresholdLevel?: number;
  unit?: string;
}

export interface ProactiveStockAlert {
  id: string;
  phcId: string;
  phcName: string;
  medicineId: string;
  medicineName: string;
  category: string;
  currentStock: number;
  thresholdLevel: number;
  unit: string;
  projectedStockoutDays: number;
  severity: 'CRITICAL' | 'WARNING';
  timestamp: string;
  read: boolean;
  autoIndentTriggered?: boolean;
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
  medicineRisk: 'ADEQUATE' | 'BUFFER_DEPLETING' | 'CRITICAL_DEFICIT' | 'SURPLUS_AVAILABLE' | 'UNKNOWN';
  workforceStatus: 'OPTIMAL' | 'MODERATE' | 'SHORTAGE';
  preparednessStatus: 'PREPARED' | 'ALERTED' | 'ACTION_REQUIRED';
  staffPresentCount: number;
  staffSanctionedCount: number;
  coldChainTempC?: number;
  isInventoryMatched?: boolean;
  isSimulatedData?: boolean;
  dataSourceLabel?: string;
  assessedMedicineName?: string;
  assessedRiskCategory?: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS' | 'UNKNOWN';
  assessedUsableStock?: number | null;
  assessedUnit?: string;
  assessedMinThreshold?: number | null;
  assessedMaxThreshold?: number | null;
  assessedDaysRemaining?: number | null;
  statusReason?: string;
  assessedMedicine?: {
    medicineId: string | null;
    medicineName: string;
    unit: string;
    usableStock: number | null;
    expiredBatchStock: number | null;
    dailyConsumption: number | null;
    daysRemaining: number | null;
    minThreshold: number | null;
    maxThreshold?: number | null;
    safetyStock: number | null;
    reorderPoint: number | null;
    surplusTransferableQty: number | null;
    deficitQty: number | null;
    riskCategory: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SURPLUS' | 'UNKNOWN';
    statusReason: string;
  };
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
  status: RedistributionStatus;
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
  category: 'Supply Chain' | 'Health Registry' | 'Weather & Environmental' | 'Logistics & GIS' | 'Digital Health Mission' | 'AI & Multilingual Speech';
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

export interface GoogleMapsPlace {
  title: string;
  uri: string;
  address?: string;
  snippet?: string;
}

export interface AIChatMessage {
  id: string;
  userId?: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  persona?: string;
  timestamp: string;
}

export interface OfflineQueueItem {
  id: string;
  module: 'voice' | 'medicine' | 'orders' | 'records' | 'alerts' | 'redistribution' | 'attendance';
  moduleLabel: string;
  action: string;
  entityName: string;
  quantity?: number;
  unit?: string;
  facilityId: string;
  facilityName: string;
  timestamp: string;
  formattedTime: string;
  status: 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED_RETRY';
  retryCount: number;
  payload: Record<string, any>;
  byteSize: number;
  errorMessage?: string;
}

export type RoutingOperationMode = 'DIRECT' | 'SUPPLY_CIRCUIT' | 'PERSONNEL_DEPLOYMENT' | 'CLUSTER_MESH';

export interface EmergencyRouteStop {
  facility: NetworkFacility;
  stopIndex: number;
  isOrigin?: boolean;
  isDestination?: boolean;
  suppliesToDeliver?: Array<{
    item: string;
    quantity: number;
    unit: string;
  }>;
  personnelToDeploy?: Array<{
    role: string;
    count: number;
  }>;
  legDistanceText?: string;
  legDurationText?: string;
}

export interface EmergencyCircuitPlan {
  id: string;
  title: string;
  description: string;
  category: 'SUPPLY_DISTRIBUTION' | 'PERSONNEL_DEPLOYMENT';
  originId: string;
  destinationId: string;
  waypointIds: string[];
  vehicle: {
    regNumber: string;
    model: string;
    driverName: string;
    driverPhone: string;
  };
  teamLeader: {
    name: string;
    role: string;
    phone: string;
  };
  suppliesAllocations?: Record<string, Array<{ item: string; quantity: number; unit: string }>>;
  personnelAllocations?: Record<string, Array<{ role: string; count: number }>>;
}

export interface InterPHCCorridor {
  id: string;
  facilityAId: string;
  facilityBId: string;
  roadDistanceKm: number;
  travelTimeMins: number;
  highwayType: string;
  emergencyStatus: 'CLEAR' | 'CAUTION_HEATWAVE' | 'ROUGH_TERRAIN';
}

export interface DistanceMatrixTransportEstimate {
  originFacilityId: string;
  originFacilityName: string;
  surplusFacilityId: string;
  surplusFacility: NetworkFacility;
  medicineName?: string;
  surplusQuantity?: number;
  unit?: string;
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
  durationInTrafficText?: string;
  status: 'OK' | 'ZERO_RESULTS' | 'NOT_FOUND' | 'ERROR';
  isRealtimeGoogleDistanceMatrix: boolean;
  transportMode: '108 Ambulance (Cold-Chain)' | 'RMSCL Heavy Reefer' | 'Block Mobile Courier' | 'Rapid Two-Wheeler';
  emergencyPriority: 'CRITICAL_URGENT' | 'HIGH' | 'ROUTINE';
}

