import {
  MedicineItem,
  PHCFacility,
  OperationalAlert,
  LogisticsOrder,
  RedistributionOpportunity
} from '../types.ts';
import { NATIONAL_ESSENTIAL_MEDICINES_LIST } from '../data/nationalEssentialMedicines.ts';

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  ors: ['oral rehydration salts', 'rehydration', 'sachet', 'sachets', 'dehydration', 'diarrhea'],
  asv: ['anti-snake venom', 'snake venom', 'antivenom', 'polyvalent', 'lyophilized', 'snakebite'],
  arv: ['anti-rabies', 'rabies vaccine', 'dog bite'],
  ns: ['normal saline', '0.9% sodium chloride', 'nacl', 'iv fluid', 'saline'],
  rl: ['ringer lactate', 'hartmann', 'compound sodium lactate', 'iv fluid'],
  dns: ['dextrose normal saline', '5% dextrose'],
  pcm: ['paracetamol', 'acetaminophen', 'fever', 'antipyretic'],
  amox: ['amoxicillin', 'antibiotic', 'dispersible'],
  azi: ['azithromycin', 'antibiotic'],
  cip: ['ciprofloxacin', 'antibiotic'],
  metro: ['metronidazole', 'antibiotic'],
  oxy: ['oxytocin', 'maternal', 'uterotonic', 'labor'],
  mag: ['magnesium sulfate', 'mgso4', 'eclampsia'],
  ifa: ['iron folic acid', 'anemia', 'ferrous'],
  zinc: ['zinc sulfate', 'pediatric diarrhea'],
  crit: ['critical', 'emergency', 'shortage', 'deficit', 'stockout', 'zero'],
  warn: ['warning', 'low stock', 'buffer depleting', 'rop'],
  cold: ['cold chain', 'ilr', '2-8', 'vaccine', 'refrigerator', 'temperature'],
  exp: ['expiring', 'expired', 'fefo', 'batch']
};

/**
 * Normalizes and tokenizes a search query into individual lowercase keywords.
 */
export function tokenizeSearchQuery(query: string): string[] {
  return String(query || '')
    .toLowerCase()
    .replace(/[,;|/\\]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Multi-keyword matcher: returns true if EVERY keyword token in `query` matches
 * at least one of the provided `fields` (or its medical/supply-chain synonyms).
 */
export function matchesSearchKeywords(
  query: string,
  ...fields: Array<string | number | boolean | undefined | null>
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;

  const combinedHaystack = fields
    .filter((f) => f !== undefined && f !== null && f !== false)
    .map((f) => String(f).toLowerCase())
    .join(' | ');

  return tokens.every((token) => {
    if (combinedHaystack.includes(token)) return true;

    // Check synonym expansion
    const synonyms = KEYWORD_SYNONYMS[token];
    if (synonyms && synonyms.some((syn) => combinedHaystack.includes(syn))) {
      return true;
    }

    // Also check if any synonym key matches when user types prefix >= 3 chars
    for (const [abbr, synList] of Object.entries(KEYWORD_SYNONYMS)) {
      if (abbr === token && synList.some((s) => combinedHaystack.includes(s))) {
        return true;
      }
      if (
        token.length >= 3 &&
        synList.some((s) => s.includes(token)) &&
        combinedHaystack.includes(abbr)
      ) {
        return true;
      }
    }

    return false;
  });
}

export type GlobalSearchResultCategory =
  | 'MEDICINE'
  | 'PHC_FACILITY'
  | 'ALERT'
  | 'ORDER_TRANSFER'
  | 'MODULE'
  | 'NLEM_CATALOGUE';

export interface GlobalSearchResultItem {
  id: string;
  category: GlobalSearchResultCategory;
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeTone?: 'critical' | 'warning' | 'normal' | 'surplus' | 'info';
  targetModule: string;
  phcToSelect?: PHCFacility;
  medicineItem?: MedicineItem;
  searchKeywordToPass?: string;
  score: number;
}

const PORTAL_MODULES: Array<{
  id: string;
  title: string;
  subtitle: string;
  keywords: string;
}> = [
  {
    id: 'home',
    title: 'Supply Overview & Daily Command Center',
    subtitle: 'Quick dispense, critical stock risk & instant warehouse ordering',
    keywords: 'home overview dashboard dispense command center daily summary stockout'
  },
  {
    id: 'medicine',
    title: 'Medicine Inventory & FEFO Batch Ledger',
    subtitle: '51 NLEM drugs, FEFO batch expiry, 30-day consumption forecast & EOQ',
    keywords: 'medicine inventory fefo batch expiry stock ledger dispense reorder eoq forecast'
  },
  {
    id: 'preparedness',
    title: 'Seasonal Demand & Surge Preparedness',
    subtitle: 'Heatwave, monsoon dengue/malaria & epidemiological demand surge',
    keywords: 'preparedness demand surge forecast weather heatwave dengue malaria outbreak'
  },
  {
    id: 'orders',
    title: 'Replenishment Orders & Inter-PHC Transfers',
    subtitle: 'RMSCL warehouse indents, consignment tracking & lateral PHC sharing',
    keywords: 'orders logistics replenishment indent warehouse rmscl transfer redistribution sharing'
  },
  {
    id: 'map',
    title: 'Network Stock Map & GIS Routing',
    subtitle: '53 mapped PHCs, 30km cluster radius, TSP supply circuit & transfer ETAs',
    keywords: 'map network gis routing distance matrix nearby surplus cluster circuit google maps'
  },
  {
    id: 'directory',
    title: 'PHC Directory & NLEM 2022 Formulary Catalogue',
    subtitle: 'Browse Rajasthan & All-India PHCs and 51 NLEM essential medicines',
    keywords: 'directory catalogue phc facility rajasthan india nlem formulary cold chain who'
  },
  {
    id: 'records',
    title: 'Register Scan (OCR) & Stock Verification',
    subtitle: 'Extract handwritten stock book entries & verify pharmacy ledger',
    keywords: 'records ocr scan camera register stock book verification upload image'
  },
  {
    id: 'alerts',
    title: 'Critical Stock Alerts, Threshold Rules & Offline Queue',
    subtitle: '3-tier safety thresholds, ROP configuration & local JSON/CSV recovery',
    keywords: 'alerts threshold rules minimum buffer rop critical warning offline sync queue export json csv'
  },
  {
    id: 'analytics',
    title: 'CSV / PDF Reports & Compliance Analytics',
    subtitle: 'Download monthly PHC stock audit, consumption & order reports',
    keywords: 'analytics reports export pdf csv download audit compliance summary'
  }
];

export function runGlobalPortalSearch(params: {
  query: string;
  medicines: MedicineItem[];
  facilities: PHCFacility[];
  alerts: OperationalAlert[];
  orders: LogisticsOrder[];
  redistributions: RedistributionOpportunity[];
  selectedPHC: PHCFacility;
  categoryFilter?: 'ALL' | GlobalSearchResultCategory;
}): GlobalSearchResultItem[] {
  const {
    query,
    medicines,
    facilities,
    alerts,
    orders,
    redistributions,
    selectedPHC,
    categoryFilter = 'ALL'
  } = params;

  const trimmed = query.trim();
  const results: GlobalSearchResultItem[] = [];

  // If query is empty, return top actionable items (critical medicines, active PHCs, key modules)
  if (!trimmed) {
    if (categoryFilter === 'ALL' || categoryFilter === 'MEDICINE') {
      medicines
        .filter((m) => m.stockoutRisk === 'CRITICAL' || m.stockoutRisk === 'WARNING')
        .slice(0, 4)
        .forEach((m) => {
          results.push({
            id: `med-${m.id}`,
            category: 'MEDICINE',
            title: m.name,
            subtitle: `${selectedPHC.name} · Stock: ${m.currentStock} ${m.unit} (Min: ${m.minStockLevel}) · Batch ${m.batchNumber}`,
            badgeText: `${m.stockoutRisk} (${m.projectedStockoutDays}d)`,
            badgeTone: m.stockoutRisk === 'CRITICAL' ? 'critical' : 'warning',
            targetModule: 'medicine',
            medicineItem: m,
            searchKeywordToPass: m.name,
            score: 100
          });
        });
    }
    if (categoryFilter === 'ALL' || categoryFilter === 'PHC_FACILITY') {
      facilities.slice(0, 4).forEach((fac) => {
        results.push({
          id: `fac-${fac.id}`,
          category: 'PHC_FACILITY',
          title: `${fac.name} (${fac.code})`,
          subtitle: `${fac.type} · ${fac.block} Block, ${fac.district}, ${fac.state} · MOIC: ${fac.medicalOfficerInCharge}`,
          badgeText: fac.id === selectedPHC.id ? 'ACTIVE PHC' : fac.state,
          badgeTone: fac.id === selectedPHC.id ? 'normal' : 'info',
          targetModule: 'home',
          phcToSelect: fac,
          score: 90
        });
      });
    }
    if (categoryFilter === 'ALL' || categoryFilter === 'MODULE') {
      PORTAL_MODULES.slice(0, 4).forEach((mod) => {
        results.push({
          id: `mod-${mod.id}`,
          category: 'MODULE',
          title: mod.title,
          subtitle: mod.subtitle,
          badgeText: 'Module',
          badgeTone: 'info',
          targetModule: mod.id,
          score: 80
        });
      });
    }
    return results;
  }

  const lowerQ = trimmed.toLowerCase();

  // 1. Search Medicines in Active PHC Inventory
  if (categoryFilter === 'ALL' || categoryFilter === 'MEDICINE') {
    for (const med of medicines) {
      const batchStr = (med.batches || [])
        .map((b) => `${b.batchNumber} ${b.expiryDate} ${b.status || ''}`)
        .join(' ');
      if (
        matchesSearchKeywords(
          trimmed,
          med.name,
          med.category,
          med.batchNumber,
          med.unit,
          med.stockoutRisk,
          med.fefoPriority,
          med.sourceWarehouse,
          med.expiryDate,
          batchStr,
          'medicine drug stock inventory batch fefo'
        )
      ) {
        const exactBonus = med.name.toLowerCase().includes(lowerQ) ? 35 : 0;
        const critBonus = med.stockoutRisk === 'CRITICAL' ? 15 : med.stockoutRisk === 'WARNING' ? 8 : 0;
        results.push({
          id: `med-${med.id}`,
          category: 'MEDICINE',
          title: med.name,
          subtitle: `${med.category} · Usable: ${med.currentStock.toLocaleString()} ${med.unit} (Min: ${med.minStockLevel}) · Batch: ${med.batchNumber} · Exp: ${med.expiryDate}`,
          badgeText: `${med.stockoutRisk} · ${med.projectedStockoutDays}d`,
          badgeTone:
            med.stockoutRisk === 'CRITICAL'
              ? 'critical'
              : med.stockoutRisk === 'WARNING'
              ? 'warning'
              : med.stockoutRisk === 'SURPLUS'
              ? 'surplus'
              : 'normal',
          targetModule: 'medicine',
          medicineItem: med,
          searchKeywordToPass: med.name,
          score: 80 + exactBonus + critBonus
        });
      }
    }
  }

  // 2. Search PHCs & Health Facilities
  if (categoryFilter === 'ALL' || categoryFilter === 'PHC_FACILITY') {
    for (const fac of facilities) {
      if (
        matchesSearchKeywords(
          trimmed,
          fac.name,
          fac.code,
          fac.block,
          fac.district,
          fac.state,
          fac.type,
          fac.medicalOfficerInCharge,
          fac.contactNumber,
          'phc facility hospital clinic center centre block district'
        )
      ) {
        const exactBonus =
          fac.name.toLowerCase().includes(lowerQ) || fac.code.toLowerCase().includes(lowerQ)
            ? 40
            : fac.district.toLowerCase().includes(lowerQ) || fac.block.toLowerCase().includes(lowerQ)
            ? 25
            : 0;
        results.push({
          id: `fac-${fac.id}`,
          category: 'PHC_FACILITY',
          title: `${fac.name} (${fac.code})`,
          subtitle: `${fac.type} · ${fac.block} Block, ${fac.district}, ${fac.state} · Beds: ${fac.occupiedBeds}/${fac.sanctionedBeds} · ${fac.medicalOfficerInCharge}`,
          badgeText: fac.id === selectedPHC.id ? 'Active PHC' : `${fac.district}, ${fac.state}`,
          badgeTone: fac.id === selectedPHC.id ? 'normal' : 'info',
          targetModule: 'home',
          phcToSelect: fac,
          searchKeywordToPass: fac.name,
          score: 78 + exactBonus
        });
      }
    }
  }

  // 3. Search Active Alerts & Threshold Breaches
  if (categoryFilter === 'ALL' || categoryFilter === 'ALERT') {
    for (const alert of alerts) {
      if (!alert || !alert.id) continue;
      if (
        matchesSearchKeywords(
          trimmed,
          alert.id,
          alert.title,
          alert.description,
          alert.category,
          alert.status,
          alert.facilityName,
          alert.phcName,
          alert.unit,
          'alert threshold breach warning critical incident'
        )
      ) {
        results.push({
          id: `alert-${alert.id}`,
          category: 'ALERT',
          title: alert.title,
          subtitle: `${alert.facilityName || alert.phcName || selectedPHC.name} · Status: ${alert.status} · ${alert.timestamp}`,
          badgeText: alert.category,
          badgeTone:
            alert.category === 'CRITICAL'
              ? 'critical'
              : alert.category === 'WARNING'
              ? 'warning'
              : 'info',
          targetModule: 'alerts',
          score: alert.category === 'CRITICAL' ? 88 : 72
        });
      }
    }
  }

  // 4. Search Replenishment Orders & Lateral Transfers
  if (categoryFilter === 'ALL' || categoryFilter === 'ORDER_TRANSFER') {
    for (const ord of orders) {
      if (
        matchesSearchKeywords(
          trimmed,
          ord.id,
          ord.medicineName,
          ord.status,
          ord.priority,
          ord.source,
          ord.destination,
          ord.phcName,
          ord.consignmentId,
          ord.notes,
          'order indent requisition delivery transit warehouse rmscl'
        )
      ) {
        results.push({
          id: `ord-${ord.id}`,
          category: 'ORDER_TRANSFER',
          title: `Order ${ord.id}: ${ord.medicineName} (+${ord.quantityRequested.toLocaleString()})`,
          subtitle: `${ord.status} · Priority: ${ord.priority.replace('_', ' ')} · Source: ${ord.source} · ETA: ${ord.estimatedDelivery}`,
          badgeText: ord.status,
          badgeTone:
            ord.priority === 'EMERGENCY_REPLENISHMENT'
              ? 'critical'
              : ord.status === 'RECEIVED' || ord.status === 'DELIVERED'
              ? 'normal'
              : 'warning',
          targetModule: 'orders',
          score: 75
        });
      }
    }

    for (const red of redistributions) {
      const donor = red.sourcePHCName || red.sourcePHC?.name || '';
      const target = red.destinationPHCName || red.targetPHC?.name || '';
      const qty = red.recommendedTransferQuantity || red.transferQuantity || 0;
      if (
        matchesSearchKeywords(
          trimmed,
          red.id,
          red.medicineName,
          donor,
          target,
          red.status,
          red.clinicalRationale,
          'transfer redistribution lateral sharing surplus donor'
        )
      ) {
        results.push({
          id: `redist-${red.id}`,
          category: 'ORDER_TRANSFER',
          title: `Transfer ${red.id}: ${red.medicineName} (${qty} units)`,
          subtitle: `${donor} → ${target} (${red.transitDistanceKm} km) · Status: ${red.status}`,
          badgeText: red.status,
          badgeTone: red.status === 'APPROVED' || red.status === 'COMPLETED' ? 'normal' : 'info',
          targetModule: 'orders',
          score: 74
        });
      }
    }
  }

  // 5. Search Portal Modules & Quick Navigation
  if (categoryFilter === 'ALL' || categoryFilter === 'MODULE') {
    for (const mod of PORTAL_MODULES) {
      if (matchesSearchKeywords(trimmed, mod.title, mod.subtitle, mod.keywords, mod.id)) {
        results.push({
          id: `mod-${mod.id}`,
          category: 'MODULE',
          title: mod.title,
          subtitle: mod.subtitle,
          badgeText: 'Open Module',
          badgeTone: 'info',
          targetModule: mod.id,
          score: 85
        });
      }
    }
  }

  // 6. Search NLEM 2022 Reference Catalogue
  if (categoryFilter === 'ALL' || categoryFilter === 'NLEM_CATALOGUE') {
    for (const nlem of NATIONAL_ESSENTIAL_MEDICINES_LIST) {
      if (
        matchesSearchKeywords(
          trimmed,
          nlem.code,
          nlem.name,
          nlem.category,
          nlem.therapeuticClass,
          nlem.dosageForm,
          nlem.strength,
          nlem.isColdChainRequired ? 'cold chain 2-8c' : '',
          'nlem formulary catalogue essential drug'
        )
      ) {
        results.push({
          id: `nlem-${nlem.code}`,
          category: 'NLEM_CATALOGUE',
          title: `${nlem.name} (${nlem.code})`,
          subtitle: `${nlem.therapeuticClass} · ${nlem.dosageForm} (${nlem.strength}) · Min Buffer: ${nlem.standardMinStock} ${nlem.unit}${
            nlem.isColdChainRequired ? ' · Cold Chain 2–8°C' : ''
          }`,
          badgeText: nlem.code,
          badgeTone: 'info',
          targetModule: 'directory',
          searchKeywordToPass: nlem.name,
          score: 65
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 30);
}
