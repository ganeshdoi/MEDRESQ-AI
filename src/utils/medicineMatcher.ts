import type { MedicineItem } from '../types.ts';

export type MedicineMatchResult =
  | {
      status: 'MATCHED';
      medicine: MedicineItem;
    }
  | {
      status: 'AMBIGUOUS';
      candidates: MedicineItem[];
      reason: string;
    }
  | {
      status: 'UNMATCHED';
      reason: string;
    };

const GENERIC_DOSAGE_STOPWORDS = new Set([
  'oral',
  'tablets',
  'tablet',
  'capsules',
  'capsule',
  'injection',
  'infusion',
  'solution',
  'suspension',
  'powder',
  'sachets',
  'sachet',
  'vials',
  'vial',
  'bottles',
  'bottle',
  'ampoules',
  'ampoule',
  'drops',
  'syrup',
  'gel',
  'cream',
  'ointment',
  'dispersible',
  'chewable',
  'lyophilized',
  'liquid',
  'poly',
  'human',
  'adult',
  'pediatric',
  'ip',
  'bp',
  'usp',
  'who',
  'formula',
  'for',
  'and',
  'with',
  'the',
  'units',
  'packets',
  'packet',
  'strips',
  'strip'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[()[\],/+-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

const LEGACY_MEDICINE_ID_TO_NLEM_PREFIX: Record<string, string> = {
  'med-1': 'med-nlem-fl-01-',
  'med-2': 'med-nlem-ana-01-',
  'med-3': 'med-nlem-fl-02-',
  'med-4': 'med-nlem-fl-03-',
  'med-5': 'med-nlem-ant-01-',
  'med-6': 'med-nlem-abx-01-'
};

/**
 * Deterministically resolves a medicine name or explicit medicineId to a single MedicineItem
 * in the facility's inventory. Rejects unmatched or ambiguous medicine queries.
 */
export function resolveMedicineMatch(
  facilityMeds: MedicineItem[],
  rawName: string,
  explicitMedicineId?: string
): MedicineMatchResult {
  if (!Array.isArray(facilityMeds) || facilityMeds.length === 0) {
    return {
      status: 'UNMATCHED',
      reason: 'Facility medicine inventory is empty.'
    };
  }

  const cleanExplicitId = explicitMedicineId ? explicitMedicineId.trim() : '';
  const query = String(rawName || '').toLowerCase().trim();

  // 1. Explicit ID match if provided
  if (cleanExplicitId) {
    const byId = facilityMeds.find((m) => m.id === cleanExplicitId);
    if (byId) {
      return { status: 'MATCHED', medicine: byId };
    }

    // Check canonical NLEM prefix across PHC IDs (e.g. med-nlem-ana-01-phc-osian)
    const nlemPrefixMatch = /^(med-nlem-[a-z0-9]+-\d+-)/i.exec(cleanExplicitId);
    if (nlemPrefixMatch) {
      const prefix = nlemPrefixMatch[1].toLowerCase();
      const byPrefix = facilityMeds.find((m) => m.id.toLowerCase().startsWith(prefix));
      if (byPrefix) {
        return { status: 'MATCHED', medicine: byPrefix };
      }
    }

    // If rawName is not provided, check legacy ID mapping or return clear validation error
    if (!query) {
      const legacyPrefix = LEGACY_MEDICINE_ID_TO_NLEM_PREFIX[cleanExplicitId.toLowerCase()];
      if (legacyPrefix) {
        const byLegacy = facilityMeds.find((m) => m.id.toLowerCase().startsWith(legacyPrefix));
        if (byLegacy) {
          return { status: 'MATCHED', medicine: byLegacy };
        }
      }
      return {
        status: 'UNMATCHED',
        reason: `Validation error: Medicine ID "${cleanExplicitId}" was not found in facility inventory.`
      };
    }
    // When rawName IS provided alongside an unrecognized/legacy explicitMedicineId (e.g. "med-2" with "Paracetamol 500mg Tablets"),
    // fall through to deterministic name/formulation resolution against facilityMeds.
  }

  if (!query) {
    return {
      status: 'UNMATCHED',
      reason: 'Medicine name is empty.'
    };
  }

  // 2. Exact case-insensitive full name match
  const exactMatch = facilityMeds.find((m) => m.name.toLowerCase() === query);
  if (exactMatch) {
    return { status: 'MATCHED', medicine: exactMatch };
  }

  // 3. Canonical unambiguous aliases for core PHC formulary items
  if (query.includes('rehydration') || /\bors\b/.test(query)) {
    const orsMatches = facilityMeds.filter(
      (m) => m.name.toLowerCase().includes('rehydration') || m.name.toLowerCase().includes('(ors)')
    );
    if (orsMatches.length === 1) {
      return { status: 'MATCHED', medicine: orsMatches[0] };
    }
  }

  if (
    (query.includes('normal saline') || query.includes('0.9% nacl')) &&
    !query.includes('dextrose') &&
    !/\bdns\b/.test(query)
  ) {
    const nsMatches = facilityMeds.filter(
      (m) => m.name.toLowerCase().includes('normal saline') && !m.name.toLowerCase().includes('dextrose')
    );
    if (nsMatches.length === 1) {
      return { status: 'MATCHED', medicine: nsMatches[0] };
    }
  }

  if (query.includes('ringer lactate') || /\brl\b/.test(query)) {
    const rlMatches = facilityMeds.filter((m) => m.name.toLowerCase().includes('ringer lactate'));
    if (rlMatches.length === 1) {
      return { status: 'MATCHED', medicine: rlMatches[0] };
    }
  }

  if (query.includes('anti-snake') || query.includes('snake venom') || /\basv\b/.test(query)) {
    const asvMatches = facilityMeds.filter((m) => m.name.toLowerCase().includes('anti-snake venom'));
    if (asvMatches.length === 1) {
      return { status: 'MATCHED', medicine: asvMatches[0] };
    }
  }

  if (query.includes('anti-rabies') || query.includes('rabies vaccine') || /\barv\b/.test(query)) {
    const arvMatches = facilityMeds.filter((m) => m.name.toLowerCase().includes('anti-rabies'));
    if (arvMatches.length === 1) {
      return { status: 'MATCHED', medicine: arvMatches[0] };
    }
  }

  // 4. Token-based matching with active-ingredient and ambiguity validation
  const allQueryTokens = tokenize(query);
  const significantTokens = allQueryTokens.filter((t) => !GENERIC_DOSAGE_STOPWORDS.has(t));

  if (significantTokens.length === 0) {
    return {
      status: 'UNMATCHED',
      reason: `Medicine "${rawName}" contains only generic dosage terms and cannot be matched.`
    };
  }

  // Identify candidate medicines that share at least one primary active-ingredient token
  const scoredCandidates: { med: MedicineItem; score: number; matchedSignificant: number }[] = [];

  for (const med of facilityMeds) {
    const medLower = med.name.toLowerCase();
    const medTokens = tokenize(medLower);
    const medSignificantTokens = medTokens.filter((t) => !GENERIC_DOSAGE_STOPWORDS.has(t));
    const primaryDrugToken = medSignificantTokens[0] || medTokens[0];

    // Candidate must match its primary drug token (or a significant token >= 4 chars)
    const matchesPrimary =
      primaryDrugToken &&
      significantTokens.some(
        (qt) => qt === primaryDrugToken || (qt.length >= 5 && primaryDrugToken.startsWith(qt))
      );

    if (!matchesPrimary) continue;

    let matchedSignificant = 0;
    let totalScore = 0;

    for (const qt of significantTokens) {
      if (medTokens.includes(qt) || medLower.includes(qt)) {
        matchedSignificant += 1;
        totalScore += 3;
      }
    }

    // Also reward matching dosage form or strength tokens from full query
    for (const qt of allQueryTokens) {
      if (GENERIC_DOSAGE_STOPWORDS.has(qt) && (medTokens.includes(qt) || medLower.includes(qt))) {
        totalScore += 1;
      }
    }

    if (matchedSignificant > 0) {
      scoredCandidates.push({ med, score: totalScore, matchedSignificant });
    }
  }

  if (scoredCandidates.length === 0) {
    return {
      status: 'UNMATCHED',
      reason: cleanExplicitId
        ? `Validation error: Medicine ID "${cleanExplicitId}" (${rawName}) does not match any item in facility inventory.`
        : `Unrecognized medicine "${rawName}" does not match any item in facility inventory.`
    };
  }

  // Check if the query contains an unrecognized alphabetic drug word that doesn't appear in the best candidate
  scoredCandidates.sort((a, b) => b.score - a.score);
  const topScore = scoredCandidates[0].score;
  const tiedTop = scoredCandidates.filter((c) => c.score === topScore);

  if (tiedTop.length > 1) {
    return {
      status: 'AMBIGUOUS',
      candidates: tiedTop.map((c) => c.med),
      reason: `Ambiguous medicine "${rawName}" matches ${tiedTop.length} inventory items (${tiedTop
        .map((c) => c.med.name)
        .join(' vs. ')}). Please specify strength/formulation or select the exact item.`
    };
  }

  return {
    status: 'MATCHED',
    medicine: tiedTop[0].med
  };
}
