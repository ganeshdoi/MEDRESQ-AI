import type { MedicineItem } from '../types.ts';
import { resolveMedicineMatch } from './medicineMatcher.ts';

export type RegisterVoiceLanguageCode = 'en' | 'hi' | 'ta' | 'te';
export type RegisterVoiceBcp47Locale = 'en-IN' | 'hi-IN' | 'ta-IN' | 'te-IN';

export type RegisterVoiceActionType =
  | 'ADD'
  | 'DISPENSE'
  | 'UPDATE'
  | 'SEARCH'
  | 'VERIFY'
  | 'SAVE'
  | 'ADD_PHC_DATA'
  | 'UNKNOWN';

export interface VoiceLanguageConfig {
  code: RegisterVoiceLanguageCode;
  legacyKey: 'english' | 'hindi' | 'tamil' | 'telugu';
  locale: RegisterVoiceBcp47Locale;
  label: string;
  nativeLabel: string;
  scriptName: string;
  sampleCommands: Array<{
    actionLabel: string;
    transcript: string;
    translation: string;
  }>;
}

export const REGISTER_VOICE_LANGUAGES: Record<RegisterVoiceLanguageCode, VoiceLanguageConfig> = {
  en: {
    code: 'en',
    legacyKey: 'english',
    locale: 'en-IN',
    label: 'English (India)',
    nativeLabel: 'English',
    scriptName: 'Latin',
    sampleCommands: [
      {
        actionLabel: 'Add Stock (+)',
        transcript: 'add 20 paracetamol',
        translation: 'Add 20 units of Paracetamol 500mg to register'
      },
      {
        actionLabel: 'Dispense (-)',
        transcript: 'dispense 10 ORS',
        translation: 'Dispense 10 sachets of ORS at OPD'
      },
      {
        actionLabel: 'Update Stock',
        transcript: 'update amoxicillin 50',
        translation: 'Update Amoxicillin 500mg register entry to 50'
      },
      {
        actionLabel: 'Search Register',
        transcript: 'search paracetamol',
        translation: 'Filter physical register rows by Paracetamol'
      },
      {
        actionLabel: 'Verify Entry',
        transcript: 'verify entry',
        translation: 'Verify pending physical register entry'
      },
      {
        actionLabel: 'Save Register',
        transcript: 'save register',
        translation: 'Commit and save verified register entries to inventory'
      }
    ]
  },
  hi: {
    code: 'hi',
    legacyKey: 'hindi',
    locale: 'hi-IN',
    label: 'Hindi (हिन्दी)',
    nativeLabel: 'हिन्दी',
    scriptName: 'Devanagari',
    sampleCommands: [
      {
        actionLabel: 'जोड़ें (Add +)',
        transcript: 'पैरासिटामोल 20 जोड़ो',
        translation: 'Add 20 units of Paracetamol 500mg to register'
      },
      {
        actionLabel: 'कम करें (Dispense -)',
        transcript: 'ओआरएस 10 कम करो',
        translation: 'Dispense 10 sachets of ORS from stock'
      },
      {
        actionLabel: 'अपडेट करें (Update)',
        transcript: 'अमोक्सिसिलिन 50 अपडेट करो',
        translation: 'Update Amoxicillin 500mg register quantity to 50'
      },
      {
        actionLabel: 'खोजें (Search)',
        transcript: 'पैरासिटामोल खोजो',
        translation: 'Search Paracetamol in physical register'
      },
      {
        actionLabel: 'सत्यापित करें (Verify)',
        transcript: 'एंट्री वेरीफाई करो',
        translation: 'Verify pending register entry'
      },
      {
        actionLabel: 'सेव करें (Save)',
        transcript: 'रजिस्टर सेव करो',
        translation: 'Save & commit physical register entries'
      }
    ]
  },
  ta: {
    code: 'ta',
    legacyKey: 'tamil',
    locale: 'ta-IN',
    label: 'Tamil (தமிழ்)',
    nativeLabel: 'தமிழ்',
    scriptName: 'Tamil',
    sampleCommands: [
      {
        actionLabel: 'சேர் (Add +)',
        transcript: 'பாராசிட்டமால் 20 சேர்',
        translation: 'Add 20 units of Paracetamol 500mg to register'
      },
      {
        actionLabel: 'குறை (Dispense -)',
        transcript: 'ORS 10 குறை',
        translation: 'Dispense 10 sachets of ORS from stock'
      },
      {
        actionLabel: 'புதுப்பி (Update)',
        transcript: 'அமாக்சிசிலின் 50 புதுப்பி',
        translation: 'Update Amoxicillin 500mg register quantity to 50'
      },
      {
        actionLabel: 'தேடு (Search)',
        transcript: 'பாராசிட்டமால் தேடு',
        translation: 'Search Paracetamol in physical register'
      },
      {
        actionLabel: 'சரிபார் (Verify)',
        transcript: 'பதிவை சரிபார்',
        translation: 'Verify pending register entry'
      },
      {
        actionLabel: 'சேமி (Save)',
        transcript: 'பதிவேட்டை சேமி',
        translation: 'Save & commit physical register entries'
      }
    ]
  },
  te: {
    code: 'te',
    legacyKey: 'telugu',
    locale: 'te-IN',
    label: 'Telugu (తెలుగు)',
    nativeLabel: 'తెలుగు',
    scriptName: 'Telugu',
    sampleCommands: [
      {
        actionLabel: 'జోడించు (Add +)',
        transcript: 'పారాసిటమాల్ 20 జోడించు',
        translation: 'Add 20 units of Paracetamol 500mg to register'
      },
      {
        actionLabel: 'తగ్గించు (Dispense -)',
        transcript: 'ORS 10 తగ్గించు',
        translation: 'Dispense 10 sachets of ORS from stock'
      },
      {
        actionLabel: 'అప్డేట్ చేయి (Update)',
        transcript: 'అమాక్సిసిలిన్ 50 అప్డేట్ చేయి',
        translation: 'Update Amoxicillin 500mg register quantity to 50'
      },
      {
        actionLabel: 'వెతుకు (Search)',
        transcript: 'పారాసిటమాల్ వెతుకు',
        translation: 'Search Paracetamol in physical register'
      },
      {
        actionLabel: 'ధృవీకరించు (Verify)',
        transcript: 'ఎంట్రీ ధృవీకరించు',
        translation: 'Verify pending register entry'
      },
      {
        actionLabel: 'సేవ్ చేయి (Save)',
        transcript: 'రిజిస్టర్ సేవ్ చేయి',
        translation: 'Save & commit physical register entries'
      }
    ]
  }
};

export interface NormalizedRegisterVoiceCommand {
  action: RegisterVoiceActionType;
  medicineName: string | null;
  matchedMedicineId: string | null;
  quantity: number | null;
  unit: string | null;
  batch: string | null;
  transactionType:
    | 'Received (Warehouse)'
    | 'Dispensed (OPD)'
    | 'Emergency Inpatient'
    | 'Stock Update'
    | null;
  language: RegisterVoiceLanguageCode;
  locale: RegisterVoiceBcp47Locale;
  rawTranscript: string;
  normalizedCommandText: string;
  nativeConfirmation: string;
  englishSummary: string;
  confidence: number;
  opdFootfall?: number | null;
  occupiedBeds?: number | null;
  emergencyCases?: number | null;
  requiresConfirmation: boolean;
  validationError?: string | null;
}

/**
 * Resolves any language identifier ('en', 'hi', 'ta', 'te', 'english', 'hindi', 'tamil', 'telugu', 'en-IN', etc.)
 * to a canonical VoiceLanguageConfig.
 */
export function resolveVoiceLanguageConfig(input?: string | null): VoiceLanguageConfig {
  const clean = String(input || '').trim().toLowerCase();
  if (clean === 'hi' || clean === 'hi-in' || clean === 'hindi' || clean === 'hinglish') {
    return REGISTER_VOICE_LANGUAGES.hi;
  }
  if (clean === 'ta' || clean === 'ta-in' || clean === 'tamil') {
    return REGISTER_VOICE_LANGUAGES.ta;
  }
  if (clean === 'te' || clean === 'te-in' || clean === 'telugu') {
    return REGISTER_VOICE_LANGUAGES.te;
  }
  if (clean === 'en' || clean === 'en-in' || clean === 'english') {
    return REGISTER_VOICE_LANGUAGES.en;
  }
  return REGISTER_VOICE_LANGUAGES.en;
}

/**
 * Maps any UI language code or locale string to its canonical BCP-47 voice parameter:
 * 'en-IN' | 'hi-IN' | 'ta-IN' | 'te-IN'
 */
export function getVoiceBcp47Locale(input?: string | null): RegisterVoiceBcp47Locale {
  return resolveVoiceLanguageConfig(input).locale;
}

/**
 * Detects if a transcript contains Indic Unicode script characters and returns the detected language code.
 */
export function detectScriptLanguage(text: string): RegisterVoiceLanguageCode | null {
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  return null;
}

/**
 * Converts Devanagari (०-९), Tamil (௦-௯), and Telugu (౦-౯) digits to standard ASCII digits (0-9).
 */
export function normalizeIndicDigits(input: string): string {
  return input
    .replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/[\u0BE6-\u0BEF]/g, (d) => String(d.charCodeAt(0) - 0x0be6))
    .replace(/[\u0C66-\u0C6F]/g, (d) => String(d.charCodeAt(0) - 0x0c66));
}

const MULTILINGUAL_NUMBER_WORDS: Array<{ patterns: string[]; value: number }> = [
  { patterns: ['एक', 'ek', 'ஒன்று', 'ondru', 'ఒకటి', 'okati', 'one'], value: 1 },
  { patterns: ['दो', 'do', 'இரண்டு', 'irandu', 'రెండు', 'rendu', 'two'], value: 2 },
  { patterns: ['तीन', 'teen', 'மூன்று', 'moondru', 'మూడు', 'moodu', 'three'], value: 3 },
  { patterns: ['चार', 'chaar', 'நான்கு', 'naangu', 'నాలుగు', 'naalugu', 'four'], value: 4 },
  { patterns: ['पांच', 'पाँच', 'paanch', 'ஐந்து', 'aindhu', 'ఐదు', 'aidu', 'five'], value: 5 },
  { patterns: ['छह', 'chhah', 'ஆறு', 'aaru', 'ఆరు', 'aaru', 'six'], value: 6 },
  { patterns: ['सात', 'saat', 'ஏழு', 'ezhu', 'ఏడు', 'edu', 'seven'], value: 7 },
  { patterns: ['आठ', 'aath', 'எட்டு', 'ettu', 'ఎనిమిది', 'enimidi', 'eight'], value: 8 },
  { patterns: ['नौ', 'nau', 'ஒன்பது', 'onbadhu', 'తొమ్మిది', 'tommidi', 'nine'], value: 9 },
  { patterns: ['दस', 'das', 'பத்து', 'pathu', 'pattu', 'పది', 'padi', 'ten'], value: 10 },
  { patterns: ['पंद्रह', 'पन्द्रह', 'pandrah', 'பதினைந்து', 'padhinaindhu', 'పదిహేను', 'padihenu', 'fifteen'], value: 15 },
  { patterns: ['बीस', 'bees', 'இருபது', 'irubadhu', 'iruvadi', 'ఇరవై', 'iravai', 'twenty'], value: 20 },
  { patterns: ['पच्चीस', 'pachees', 'pachis', 'இருபத்தைந்து', 'irubathaindhu', 'ఇరవై ఐదు', 'iravai aidu', 'twenty five'], value: 25 },
  { patterns: ['तीस', 'tees', 'முப்பது', 'muppadhu', 'ముప్పై', 'muppai', 'thirty'], value: 30 },
  { patterns: ['पैंतीस', 'paintees', 'pentees', 'முப்பத்தைந்து', 'ముప్పై ఐదు', 'thirty five'], value: 35 },
  { patterns: ['चालीस', 'chalis', 'chaalees', 'நாற்பது', 'naarpadhu', 'నలభై', 'nalabhai', 'forty'], value: 40 },
  { patterns: ['पचास', 'pachas', 'pachaas', 'ஐம்பது', 'aimbadhu', 'యాభై', 'yabhai', 'fifty'], value: 50 },
  { patterns: ['साठ', 'saath', 'அறுபது', 'arubadhu', 'అరవై', 'aravai', 'sixty'], value: 60 },
  { patterns: ['सत्तर', 'sattar', 'எழுபது', 'ezhubadhu', 'డెబ్బై', 'debbai', 'seventy'], value: 70 },
  { patterns: ['अस्सी', 'assi', 'எண்பது', 'enbadhu', 'ఎనభై', 'enabhai', 'eighty'], value: 80 },
  { patterns: ['नब्बे', 'nabbe', 'தொண்ணூறு', 'thonnooru', 'తొంభై', 'tombhai', 'ninety'], value: 90 },
  { patterns: ['सौ', 'एक सौ', 'sau', 'நூறு', 'nooru', 'వంద', 'నూరు', 'vanda', 'hundred'], value: 100 },
  { patterns: ['दो सौ', 'do sau', 'இருநூறு', 'irunooru', 'రెండు వందలు', 'rendu vandalu', 'two hundred'], value: 200 },
  { patterns: ['पांच सौ', 'paanch sau', 'ஐந்நூறு', 'ainnooru', 'ఐదు వందలు', 'aidu vandalu', 'five hundred'], value: 500 }
];

/**
 * Multilingual medicine dictionary mapping English, Hindi, Tamil, and Telugu terms
 * to canonical PHC NLEM medicine names.
 */
const MULTILINGUAL_MEDICINE_ALIASES: Array<{
  canonicalName: string;
  defaultUnit: string;
  keywords: string[];
}> = [
  {
    canonicalName: 'Paracetamol Tablets IP 500mg',
    defaultUnit: 'Tablets',
    keywords: [
      'paracetamol',
      'pcm',
      'acetaminophen',
      'dolo',
      'calpol',
      'crocin',
      'पैरासिटामोल',
      'पेरासिटामोल',
      'पॅरासिटामॉल',
      'पीसीएम',
      'பாராசிட்டமால்',
      'पारासिटामोल',
      'பாராசிடமால்',
      'பారాसिटமால்',
      'పారాసిటమాల్',
      'పారాసెటమాల్',
      'పారాసిటమోల్'
    ]
  },
  {
    canonicalName: 'Oral Rehydration Salts (ORS) Sachets 20.5g',
    defaultUnit: 'Sachets',
    keywords: [
      'ors',
      'o.r.s',
      'o r s',
      'oral rehydration',
      'rehydration salt',
      'ओआरएस',
      'ओ आर एस',
      'ओ.आर.एस',
      'जीवन रक्षक घोल',
      'ओआरएस पैकेट',
      'ஓஆர்எஸ்',
      'ஓ.ஆர்.எஸ்',
      'ஓ ஆர் எஸ்',
      'உப்பு சர்க்கரை கரைசல்',
      'ఓఆర్ఎస్',
      'ఓ.ఆర్.ఎస్',
      'ఓ ఆర్ ఎస్',
      'ఓఆర్ఎస్ ప్యాకెట్లు'
    ]
  },
  {
    canonicalName: 'Amoxicillin Capsules IP 500mg',
    defaultUnit: 'Capsules',
    keywords: [
      'amoxicillin',
      'amoxycillin',
      'amox',
      'novamox',
      'mox',
      'अमोक्सिसिलिन',
      'एमोक्सिसिलिन',
      'अमॉक्सिसिलिन',
      'एमॉक्सिसिलिन',
      'அமாக்சிசிலின்',
      'அமோக்சிசிலின்',
      'அமாக்ஸிசிலின்',
      'అమాక్సిసిలిన్',
      'అమోక్సిసిలిన్',
      'అమాక్సిసిల్లిన్'
    ]
  },
  {
    canonicalName: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
    defaultUnit: 'Bottles',
    keywords: [
      'normal saline',
      'saline',
      '0.9% nacl',
      'ns iv',
      'ns bottle',
      'नॉर्मल सलाइन',
      'सलाइन',
      'एनएस बोतल',
      'நார்மல் சலைன்',
      'சலைன்',
      'குளுக்கோஸ் பாட்டில்',
      'నార్మల్ సెలైన్',
      'సెలైన్',
      'సెలైన్ బాటిల్'
    ]
  },
  {
    canonicalName: 'Ringer Lactate (RL) IV Infusion 500ml',
    defaultUnit: 'Bottles',
    keywords: [
      'ringer lactate',
      'ringer',
      'rl iv',
      'rl bottle',
      'रिंगर लैक्टेट',
      'रिंगर',
      'आरएल',
      'ரிங்கர் லாக்டேட்',
      'ரிங்கர்',
      'రింగర్ లాక్టేట్',
      'రింగర్'
    ]
  },
  {
    canonicalName: 'Zinc Sulfate Dispersible Tablets 20mg',
    defaultUnit: 'Tablets',
    keywords: [
      'zinc sulfate',
      'zinc sulphate',
      'zinc',
      'जिंक सल्फेट',
      'जिंक',
      'ஜிங்க் சல்பேட்',
      'ஜிங்க்',
      'జింక్ సల్ఫేట్',
      'జింక్'
    ]
  },
  {
    canonicalName: 'Polyvalent Anti-Snake Venom (ASV)',
    defaultUnit: 'Vials',
    keywords: [
      'anti-snake venom',
      'anti snake venom',
      'snake venom',
      'antivenom',
      'asv',
      'एंटी-स्नेक वेनम',
      'एंटी स्नेक वेनम',
      'एएसवी',
      'सर्पदंश इंजेक्शन',
      'பாம்பு விஷ முறிவு',
      'ஏஎஸ்வி',
      'యాంటీ స్నేక్ వీనమ్',
      'పాము కాటు మందు',
      'ఏఎస్వీ'
    ]
  },
  {
    canonicalName: 'Anti-Rabies Vaccine (ARV) 2.5 IU/ml',
    defaultUnit: 'Vials',
    keywords: [
      'anti-rabies',
      'anti rabies',
      'rabies vaccine',
      'arv',
      'एंटी-रेबीज',
      'रेबीज वैक्सीन',
      'एआरवी',
      'ரேபிஸ் தடுப்பூசி',
      'ஏஆர்வி',
      'యాంటీ రేబిస్',
      'రేబిస్ వ్యాక్సిన్'
    ]
  },
  {
    canonicalName: 'Azithromycin Tablets IP 500mg',
    defaultUnit: 'Tablets',
    keywords: [
      'azithromycin',
      'azee',
      'azithral',
      'एज़िथ्रोमाइसिन',
      'एजिथ्रोमाइसिन',
      'அசித்ரோமைசின்',
      'అజిత్రోమైసిన్'
    ]
  },
  {
    canonicalName: 'Metformin Hydrochloride Tablets IP 500mg',
    defaultUnit: 'Tablets',
    keywords: [
      'metformin',
      'glycomet',
      'मेटफॉर्मिन',
      'மெட்பார்மின்',
      'మెట్‌ఫార్మిన్',
      'మెట్ఫార్మిన్'
    ]
  },
  {
    canonicalName: 'Amlodipine Tablets IP 5mg',
    defaultUnit: 'Tablets',
    keywords: [
      'amlodipine',
      'amlong',
      'अम्लोडिपिन',
      'एम्लोडिपिन',
      'அம்லோடிபின்',
      'అమ్లోడిపిన్'
    ]
  },
  {
    canonicalName: 'Omeprazole Capsules IP 20mg',
    defaultUnit: 'Capsules',
    keywords: [
      'omeprazole',
      'omez',
      'ओमेप्राज़ोल',
      'ओमेप्राजोल',
      'ஒमेப்ரசோல்',
      'ஓமெப்ரசோல்',
      'ఒమెప్రజోల్'
    ]
  },
  {
    canonicalName: 'Iron and Folic Acid (IFA) Tablets',
    defaultUnit: 'Tablets',
    keywords: [
      'iron and folic acid',
      'folic acid',
      'ifa',
      'iron tablet',
      'आयरन फोलिक एसिड',
      'आयरन की गोली',
      'आईएफए',
      'இரும்பு சத்து மாத்திரை',
      'ஃபோலிக் அமிலம்',
      'ఐరన్ ఫోలిక్ యాసిడ్',
      'ఐరన్ మాత్రలు'
    ]
  },
  {
    canonicalName: 'Oxytocin Injection IP 5 IU/ml',
    defaultUnit: 'Ampoules',
    keywords: [
      'oxytocin',
      'ऑक्सीटोसिन',
      'ஆக்சிடோசின்',
      'ఆక్సిటోసిన్'
    ]
  },
  {
    canonicalName: 'Salbutamol Respirator Solution / Inhaler',
    defaultUnit: 'Units',
    keywords: [
      'salbutamol',
      'asthalin',
      'साल्बुटामोल',
      'अस्थालिन',
      'சால்புடமால்',
      'సాల్బుటామాల్'
    ]
  },
  {
    canonicalName: 'Metronidazole Tablets IP 400mg',
    defaultUnit: 'Tablets',
    keywords: [
      'metronidazole',
      'flagyl',
      'मेट्रोनिडाजोल',
      'மெட்ரோனிடசோல்',
      'మెట్రోనిడాజోల్'
    ]
  },
  {
    canonicalName: 'Ciprofloxacin Hydrochloride Tablets IP 500mg',
    defaultUnit: 'Tablets',
    keywords: [
      'ciprofloxacin',
      'ciplox',
      'सिप्रोफ्लोक्सासिन',
      'சிப்ரோஃப்ளோக்சாசின்',
      'సిప్రోఫ్లోక్సాసిన్'
    ]
  },
  {
    canonicalName: 'Ibuprofen Tablets IP 400mg',
    defaultUnit: 'Tablets',
    keywords: [
      'ibuprofen',
      'brufen',
      'इबुप्रोफेन',
      'आईबुप्रोफेन',
      'இபுப்ரோஃபென்',
      'ఇబుప్రోఫెన్'
    ]
  }
];

/**
 * Extracts medicine name and resolves against facility inventory if available.
 */
export function matchMultilingualMedicine(
  rawText: string,
  facilityMeds: MedicineItem[]
): {
  medicineName: string | null;
  matchedMedicineId: string | null;
  unit: string | null;
  batch: string | null;
} {
  const lower = normalizeIndicDigits(rawText).toLowerCase();

  // 1. Check multilingual alias table first (longest keyword match wins to prevent partial collisions)
  let bestAlias: { canonicalName: string; defaultUnit: string; matchedLen: number } | null = null;
  for (const entry of MULTILINGUAL_MEDICINE_ALIASES) {
    for (const kw of entry.keywords) {
      const kwLower = kw.toLowerCase();
      if (lower.includes(kwLower)) {
        if (!bestAlias || kwLower.length > bestAlias.matchedLen) {
          bestAlias = {
            canonicalName: entry.canonicalName,
            defaultUnit: entry.defaultUnit,
            matchedLen: kwLower.length
          };
        }
      }
    }
  }

  if (bestAlias) {
    const resolved = resolveMedicineMatch(facilityMeds, bestAlias.canonicalName);
    if (resolved.status === 'MATCHED') {
      return {
        medicineName: resolved.medicine.name,
        matchedMedicineId: resolved.medicine.id,
        unit: resolved.medicine.unit,
        batch: resolved.medicine.batchNumber
      };
    }
    return {
      medicineName: bestAlias.canonicalName,
      matchedMedicineId: null,
      unit: bestAlias.defaultUnit,
      batch: null
    };
  }

  // 2. Fallback: Check direct token match against facilityMeds
  for (const med of facilityMeds) {
    const medLower = med.name.toLowerCase();
    const firstWord = medLower.split(/[\s(]+/)[0];
    if (firstWord && firstWord.length >= 3 && lower.includes(firstWord)) {
      return {
        medicineName: med.name,
        matchedMedicineId: med.id,
        unit: med.unit,
        batch: med.batchNumber
      };
    }
  }

  return {
    medicineName: null,
    matchedMedicineId: null,
    unit: null,
    batch: null
  };
}

/**
 * Extracts quantity from speech in English, Hindi, Tamil, or Telugu (digits or number words),
 * avoiding dosage numbers like 500mg, 20mg, 20.5g, 500ml.
 */
export function extractMultilingualQuantity(rawText: string): number | null {
  const normalized = normalizeIndicDigits(rawText);

  // Strip known dosage strengths so "Paracetamol 500mg 20" or "पैरासिटामोल 500mg 20 जोड़ो" extracts 20, not 500
  const strippedDosage = normalized
    .replace(/\b(?:500|250|400|200|100|650|20\.5|0\.9|2\.5)\s*(?:mg|ml|mcg|g|%|iu)\b/gi, ' ')
    .replace(/\b(?:batch|बैच|பேட்ச்|బ్యాచ్)\s*[a-z0-9\-_]+/gi, ' ');

  // Find standalone numbers
  const numberMatches = strippedDosage.match(/\b(\d{1,5})\b/g);
  if (numberMatches && numberMatches.length > 0) {
    // If multiple numbers exist and one is 500 (from "Paracetamol 500"), prefer the non-500 number if another exists
    if (numberMatches.length > 1) {
      const nonDosage = numberMatches.find((n) => n !== '500' && n !== '250' && n !== '400');
      if (nonDosage) {
        return parseInt(nonDosage, 10);
      }
    }
    return parseInt(numberMatches[0], 10);
  }

  // Check multilingual number words (longest match first)
  const lower = strippedDosage.toLowerCase();
  const sortedWords = [...MULTILINGUAL_NUMBER_WORDS].sort(
    (a, b) => b.patterns[0].length - a.patterns[0].length
  );
  for (const item of sortedWords) {
    for (const pat of item.patterns) {
      const patLower = pat.toLowerCase();
      // Match whole word for ASCII or substring for Indic scripts
      if (/^[a-z\s]+$/.test(patLower)) {
        if (new RegExp(`\\b${patLower}\\b`, 'i').test(lower)) {
          return item.value;
        }
      } else if (lower.includes(patLower)) {
        return item.value;
      }
    }
  }

  return null;
}

/**
 * Extracts action intent across English (en-IN), Hindi (hi-IN), Tamil (ta-IN), and Telugu (te-IN).
 */
export function detectMultilingualAction(rawText: string): RegisterVoiceActionType {
  const text = normalizeIndicDigits(rawText).toLowerCase().trim();
  if (!text) return 'UNKNOWN';

  // 1. SAVE REGISTER
  const savePatterns = [
    /\bsave\s*register\b/,
    /\bcommit\s*register\b/,
    /\bsave\s*all\b/,
    /\bsave\s*entries\b/,
    /रजिस्टर\s*सेव/,
    /सेव\s*करो/,
    /सेव\s*करें/,
    /सुरक्षित\s*करो/,
    /\bregister\s*save\s*karo\b/,
    /பதிவேட்டை\s*சேமி/,
    /பதிவை\s*சேமி/,
    /சேமிக்கவும்/,
    /சேமி/,
    /\bregister\s*semi\b/,
    /రిజిస్టర్\s*సేవ్/,
    /సేవ్\s*చేయి/,
    /సేవ్\s*చేయండి/,
    /భద్రపరచు/,
    /\bregister\s*save\s*cheyi\b/
  ];
  if (savePatterns.some((re) => re.test(text))) {
    return 'SAVE';
  }

  // 2. VERIFY ENTRY
  const verifyPatterns = [
    /\bverify\s*entry\b/,
    /\bverify\s*record\b/,
    /\bverify\s*all\b/,
    /\bapprove\s*entry\b/,
    /\bverify\b/,
    /वेरीफाई\s*करो/,
    /वेरिफाई\s*करो/,
    /सत्यापित\s*करो/,
    /सत्यापित\s*करें/,
    /एंट्री\s*वेरीफाई/,
    /\bentry\s*verify\s*karo\b/,
    /சரிபார்/,
    /உறுதி\s*செய்/,
    /பதிவை\s*சரிபார்/,
    /\bsaripaar\b/,
    /ధృవీకరించు/,
    /వెరిఫై\s*చేయి/,
    /ఎంట్రీ\s*ధృవీకరించు/,
    /\bverify\s*cheyi\b/
  ];
  if (verifyPatterns.some((re) => re.test(text))) {
    return 'VERIFY';
  }

  // 3. SEARCH REGISTER
  const searchPatterns = [
    /\bsearch\b/,
    /\bfind\b/,
    /\bfilter\b/,
    /\blookup\b/,
    /खोजो/,
    /खोजें/,
    /ढूंढो/,
    /सर्च\s*करो/,
    /\bkhojo\b/,
    /\bdhundho\b/,
    /தேடு/,
    /தேடுக/,
    /கண்டுபிடி/,
    /\bthedu\b/,
    /వెతుకు/,
    /వెతకండి/,
    /శోధించు/,
    /\bvethuku\b/
  ];
  if (searchPatterns.some((re) => re.test(text))) {
    return 'SEARCH';
  }

  // 4. ADD PHC DATA (OPD Footfall / Beds)
  if (
    /\bphc\s*data\b/.test(text) ||
    /\bopd\s*(?:patients|footfall)\b/.test(text) ||
    /\boccupied\s*beds\b/.test(text) ||
    /पीएचसी\s*डेटा/.test(text) ||
    /ओपीडी\s*मरीज/.test(text) ||
    /புறநோயாளிகள்/.test(text) ||
    /ఓపీడీ\s*రోగులు/.test(text)
  ) {
    return 'ADD_PHC_DATA';
  }

  // 5. UPDATE STOCK / QUANTITY
  const updatePatterns = [
    /\bupdate\b/,
    /\bset\s*stock\b/,
    /\bmodify\b/,
    /\bchange\s*quantity\b/,
    /अपडेट\s*करो/,
    /अपडेट\s*करें/,
    /अपडेट/,
    /बदलो/,
    /संशोधित\s*करो/,
    /\bupdate\s*karo\b/,
    /புதுப்பி/,
    /புதுப்பிக்கவும்/,
    /மாற்று/,
    /அப்டேட்/,
    /\bpudhuppi\b/,
    /\bmaatru\b/,
    /అప్డేట్\s*చేయి/,
    /అప్‌డేట్\s*చేయి/,
    /అప్డేట్/,
    /మార్చు/,
    /సవరించు/,
    /\bupdate\s*cheyi\b/,
    /\bmarchu\b/
  ];
  if (updatePatterns.some((re) => re.test(text))) {
    return 'UPDATE';
  }

  // 6. DISPENSE / DEDUCT / ISSUE
  const dispensePatterns = [
    /\bdispense\b/,
    /\bdispensed\b/,
    /\bdeduct\b/,
    /\breduce\b/,
    /\bissue\b/,
    /\bissued\b/,
    /\bconsume\b/,
    /\bused\b/,
    /\bgive\b/,
    /कम\s*करो/,
    /कम\s*करें/,
    /घटाओ/,
    /घटाएं/,
    /वितरण\s*करो/,
    /वितरित/,
    /दिया\s*गया/,
    /दी\s*गईं/,
    /खर्च/,
    /निकासी/,
    /\bkam\s*karo\b/,
    /\bghatao\b/,
    /\buse\s*hue\b/,
    /குறை/,
    /குறைக்கவும்/,
    /வழங்கு/,
    /வழங்கப்பட்டது/,
    /விநியோகம்/,
    /எடு/,
    /\bkurai\b/,
    /\bvazhangu\b/,
    /తగ్గించు/,
    /తగ్గించండి/,
    /ఇవ్వు/,
    /ఇవ్వబడింది/,
    /పంపిణీ/,
    /వాడారు/,
    /\btagginchu\b/,
    /\bivvu\b/
  ];
  if (dispensePatterns.some((re) => re.test(text))) {
    return 'DISPENSE';
  }

  // 7. ADD / RECEIVE / REGISTER ENTRY
  const addPatterns = [
    /\badd\b/,
    /\breceive\b/,
    /\breceived\b/,
    /\binward\b/,
    /\bplus\b/,
    /\bregister\b/,
    /\binsert\b/,
    /जोड़ो/,
    /जोड़ें/,
    /जोड़ना/,
    /प्राप्त/,
    /आया/,
    /आए/,
    /मिला/,
    /मिली/,
    /दर्ज\s*करो/,
    /दर्ज\s*करें/,
    /\bjodo\b/,
    /\baaya\b/,
    /\bdarj\s*karo\b/,
    /சேர்/,
    /சேர்க்கவும்/,
    /சேர்க்க/,
    /வந்தது/,
    /பெறப்பட்டது/,
    /வரவு/,
    /\bser\b/,
    /\bserkkavum\b/,
    /\bvandhadhu\b/,
    /జోడించు/,
    /జోడించండి/,
    /చేర్చు/,
    /చేర్చండి/,
    /వచ్చాయి/,
    /వచ్చింది/,
    /స్వీకరించబడింది/,
    /\bjodinchu\b/,
    /\bcherchu\b/,
    /\bvachayi\b/
  ];
  if (addPatterns.some((re) => re.test(text))) {
    return 'ADD';
  }

  return 'UNKNOWN';
}

/**
 * Formats localized confirmation text in the user's selected language (en, hi, ta, te).
 */
export function buildLocalizedConfirmation(
  action: RegisterVoiceActionType,
  medicineName: string | null,
  quantity: number | null,
  unit: string | null,
  language: RegisterVoiceLanguageCode
): { nativeConfirmation: string; englishSummary: string } {
  const medLabel = medicineName || 'Medicine';
  const qtyLabel = quantity ?? 0;
  const unitLabel = unit || 'units';

  switch (action) {
    case 'ADD': {
      const englishSummary = `ADD +${qtyLabel} ${unitLabel} of ${medLabel} (Received / Inward Register Entry)`;
      const nativeMap: Record<RegisterVoiceLanguageCode, string> = {
        en: englishSummary,
        hi: `रजिस्टर में ${medLabel} की +${qtyLabel} ${unitLabel} जोड़ी गईं (प्राप्ति प्रविष्टि)।`,
        ta: `பதிவேட்டில் ${medLabel} +${qtyLabel} ${unitLabel} சேர்க்கப்பட்டது (வரவு பதிவு).`,
        te: `రిజిస్టర్‌లో ${medLabel} +${qtyLabel} ${unitLabel} జోడించబడింది (స్వీకరణ ఎంట్రీ).`
      };
      return { nativeConfirmation: nativeMap[language], englishSummary };
    }
    case 'DISPENSE': {
      const englishSummary = `DISPENSE -${qtyLabel} ${unitLabel} of ${medLabel} (OPD Dispensing Register Entry)`;
      const nativeMap: Record<RegisterVoiceLanguageCode, string> = {
        en: englishSummary,
        hi: `रजिस्टर से ${medLabel} की -${qtyLabel} ${unitLabel} घटाई/वितरित की गईं (OPD निकासी)।`,
        ta: `பதிவேட்டில் ${medLabel} -${qtyLabel} ${unitLabel} குறைக்கப்பட்டது / வழங்கப்பட்டது (OPD விநியோகம்).`,
        te: `రిజిస్టర్ నుండి ${medLabel} -${qtyLabel} ${unitLabel} తగ్గించబడింది / పంపిణీ చేయబడింది (OPD).`
      };
      return { nativeConfirmation: nativeMap[language], englishSummary };
    }
    case 'UPDATE': {
      const englishSummary = `UPDATE ${medLabel} register quantity to ${qtyLabel} ${unitLabel}`;
      const nativeMap: Record<RegisterVoiceLanguageCode, string> = {
        en: englishSummary,
        hi: `रजिस्टर में ${medLabel} की मात्रा ${qtyLabel} ${unitLabel} पर अपडेट की गई।`,
        ta: `பதிவேட்டில் ${medLabel} அளவு ${qtyLabel} ${unitLabel} ஆக புதுப்பிக்கப்பட்டது.`,
        te: `రిజిస్టర్‌లో ${medLabel} పరిమాణం ${qtyLabel} ${unitLabel} కు అప్‌డేట్ చేయబడింది.`
      };
      return { nativeConfirmation: nativeMap[language], englishSummary };
    }
    case 'SEARCH': {
      const englishSummary = `SEARCH physical register for "${medLabel}"`;
      const nativeMap: Record<RegisterVoiceLanguageCode, string> = {
        en: englishSummary,
        hi: `रजिस्टर में "${medLabel}" खोजा जा रहा है।`,
        ta: `பதிவேட்டில் "${medLabel}" தேடப்படுகிறது.`,
        te: `రిజిస్టర్‌లో "${medLabel}" కోసం వెతుకుతోంది.`
      };
      return { nativeConfirmation: nativeMap[language], englishSummary };
    }
    case 'VERIFY': {
      const englishSummary = medicineName
        ? `VERIFY physical register entry for ${medLabel}`
        : 'VERIFY pending physical register entry';
      const nativeMap: Record<RegisterVoiceLanguageCode, string> = {
        en: englishSummary,
        hi: `रजिस्टर प्रविष्टि सत्यापित (Verify) की जा रही है।`,
        ta: `பதிவேட்டு பதிவு சரிபார்க்கப்படுகிறது (Verify).`,
        te: `రిజిస్టర్ ఎంట్రీ ధృవీకరించబడుతోంది (Verify).`
      };
      return { nativeConfirmation: nativeMap[language], englishSummary };
    }
    case 'SAVE': {
      const englishSummary = 'SAVE & COMMIT physical register entries to facility stock ledger';
      const nativeMap: Record<RegisterVoiceLanguageCode, string> = {
        en: englishSummary,
        hi: `भौतिक रजिस्टर की प्रविष्टियां मुख्य स्टॉक लेजर में सेव की जा रही हैं।`,
        ta: `பதிவேட்டு பதிவுகள் முதன்மை இருப்பு கணக்கில் சேமிக்கப்படுகின்றன.`,
        te: `రిజిస్టర్ ఎంట్రీలు ప్రధాన స్టాక్ లెడ్జర్‌లో సేవ్ చేయబడుతున్నాయి.`
      };
      return { nativeConfirmation: nativeMap[language], englishSummary };
    }
    case 'ADD_PHC_DATA': {
      const englishSummary = `ADD PHC Daily Telemetry & Register Data (${medLabel}: ${qtyLabel} ${unitLabel})`;
      const nativeMap: Record<RegisterVoiceLanguageCode, string> = {
        en: englishSummary,
        hi: `पीएचसी दैनिक डेटा और रजिस्टर प्रविष्टि दर्ज की गई।`,
        ta: `ஆரம்ப சுகாதார நிலைய தினசரி தரவு பதிவு செய்யப்பட்டது.`,
        te: `పిహెచ్‌సి రోజువారీ డేటా మరియు రిజిస్టర్ ఎంట్రీ నమోదు చేయబడింది.`
      };
      return { nativeConfirmation: nativeMap[language], englishSummary };
    }
    default: {
      const englishSummary =
        'Could not understand command in selected language. Please try again or edit manually.';
      const nativeMap: Record<RegisterVoiceLanguageCode, string> = {
        en: 'Could not understand command in English (en-IN). Please try again or edit manually.',
        hi: 'चयनित भाषा (हिन्दी hi-IN) में कमांड समझ नहीं आया। कृपया पुनः प्रयास करें या मैन्युअल रूप से संपादित करें।',
        ta: 'தேர்ந்தெடுக்கப்பட்ட மொழியில் (தமிழ் ta-IN) கட்டளையைப் புரிந்துகொள்ள முடியவில்லை. மீண்டும் முயலவும் அல்லது கைமுறையாகத் திருத்தவும்.',
        te: 'ఎంచుకున్న భాషలో (తెలుగు te-IN) కమాండ్ అర్థం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి లేదా మాన్యువల్‌గా సవరించండి.'
      };
      return { nativeConfirmation: nativeMap[language], englishSummary };
    }
  }
}

/**
 * Primary deterministic + AI-assisted multilingual parser for Physical Register voice commands.
 * Supports English (en-IN), Hindi (hi-IN), Tamil (ta-IN), and Telugu (te-IN).
 */
export function parsePhysicalRegisterVoiceCommand(
  rawTranscript: string,
  selectedLangInput: string,
  facilityMeds: MedicineItem[],
  aiHint?: {
    parsedAction?: string;
    parsedMedicine?: string;
    parsedQuantity?: number | null;
    parsedBatch?: string;
    parsedTransaction?: string;
    parsedOpdFootfall?: number | null;
    parsedOccupiedBeds?: number | null;
    parsedEmergencyCases?: number | null;
    confidence?: number;
  }
): NormalizedRegisterVoiceCommand {
  const langConfig = resolveVoiceLanguageConfig(selectedLangInput);
  const cleanTranscript = String(rawTranscript || '').trim();

  if (!cleanTranscript) {
    const { nativeConfirmation, englishSummary } = buildLocalizedConfirmation(
      'UNKNOWN',
      null,
      null,
      null,
      langConfig.code
    );
    return {
      action: 'UNKNOWN',
      medicineName: null,
      matchedMedicineId: null,
      quantity: null,
      unit: null,
      batch: null,
      transactionType: null,
      language: langConfig.code,
      locale: langConfig.locale,
      rawTranscript: '',
      normalizedCommandText: 'UNKNOWN_COMMAND',
      nativeConfirmation,
      englishSummary,
      confidence: 0,
      requiresConfirmation: true,
      validationError: nativeConfirmation
    };
  }

  // 1. Extract medicine from transcript (or fallback to AI hint if transcript medicine was transliterated uniquely)
  let medMatch = matchMultilingualMedicine(cleanTranscript, facilityMeds);
  if (!medMatch.medicineName && aiHint?.parsedMedicine) {
    const aiMedMatch = matchMultilingualMedicine(aiHint.parsedMedicine, facilityMeds);
    if (aiMedMatch.medicineName) {
      medMatch = aiMedMatch;
    } else {
      const directMatch = resolveMedicineMatch(facilityMeds, aiHint.parsedMedicine);
      if (directMatch.status === 'MATCHED') {
        medMatch = {
          medicineName: directMatch.medicine.name,
          matchedMedicineId: directMatch.medicine.id,
          unit: directMatch.medicine.unit,
          batch: directMatch.medicine.batchNumber
        };
      }
    }
  }

  // 2. Extract quantity from transcript (or fallback to AI hint)
  let quantity = extractMultilingualQuantity(cleanTranscript);
  if (
    (quantity === null || quantity <= 0) &&
    typeof aiHint?.parsedQuantity === 'number' &&
    aiHint.parsedQuantity > 0
  ) {
    quantity = aiHint.parsedQuantity;
  }

  // 3. Extract explicit batch code if spoken
  const batchRegex = /\b(?:batch|बैच|பேட்ச்|బ్యాచ్)\s*[:\-]?\s*([A-Za-z0-9\-_]{2,14})\b/i;
  const batchMatch = cleanTranscript.match(batchRegex);
  const explicitBatch = batchMatch
    ? batchMatch[1].toUpperCase()
    : aiHint?.parsedBatch || medMatch.batch || null;

  // 4. Determine Action Intent
  let action = detectMultilingualAction(cleanTranscript);

  // If deterministic rules returned UNKNOWN, check AI hint or infer from medicine + quantity
  if (action === 'UNKNOWN' && aiHint) {
    const hintAction = String(aiHint.parsedAction || aiHint.parsedTransaction || '').toUpperCase();
    if (hintAction.includes('SAVE')) action = 'SAVE';
    else if (hintAction.includes('VERIFY')) action = 'VERIFY';
    else if (hintAction.includes('SEARCH') || hintAction.includes('CHECK')) action = 'SEARCH';
    else if (hintAction.includes('UPDATE')) action = 'UPDATE';
    else if (hintAction.includes('ADD_PHC') || hintAction.includes('PHC DATA')) action = 'ADD_PHC_DATA';
    else if (hintAction.includes('RECEIV') || hintAction.includes('RECEIPT') || hintAction === 'ADD')
      action = 'ADD';
    else if (
      hintAction.includes('DISPENS') ||
      hintAction.includes('CONSUM') ||
      hintAction.includes('EMERG')
    )
      action = 'DISPENSE';
  }

  // If user spoke a medicine name + quantity without an explicit verb (e.g., "Paracetamol 20"), treat as ADD or require confirmation
  let requiresConfirmation = false;
  let confidence = aiHint?.confidence ?? 0.96;

  if (action === 'UNKNOWN' && medMatch.medicineName && quantity !== null && quantity > 0) {
    action = 'ADD';
    confidence = 0.78;
    requiresConfirmation = true;
  } else if (action === 'UNKNOWN' && medMatch.medicineName && quantity === null) {
    action = 'SEARCH';
    confidence = 0.85;
  }

  // Validate required fields per action
  let validationError: string | null = null;
  if (action === 'ADD' || action === 'DISPENSE' || action === 'UPDATE') {
    if (!medMatch.medicineName) {
      validationError = buildLocalizedConfirmation('UNKNOWN', null, null, null, langConfig.code)
        .nativeConfirmation;
      requiresConfirmation = true;
      confidence = 0.45;
    } else if (quantity === null || quantity <= 0) {
      // Default quantity to 10 but require confirmation so user can verify/edit before modifying inventory
      quantity = 10;
      requiresConfirmation = true;
      confidence = 0.72;
    }
  } else if (action === 'SEARCH' && !medMatch.medicineName) {
    // Allow searching raw query token if no NLEM medicine matched directly
    const cleanedSearchQuery = cleanTranscript
      .replace(/\b(?:search|find|filter|khojo|thedu|vethuku)\b/gi, '')
      .replace(/खोजो|खोजें|ढूंढो|தேடு|தேடுக|వెతుకు|వెతకండి/g, '')
      .trim();
    if (cleanedSearchQuery.length >= 2) {
      medMatch.medicineName = cleanedSearchQuery;
    } else {
      validationError = buildLocalizedConfirmation('UNKNOWN', null, null, null, langConfig.code)
        .nativeConfirmation;
      requiresConfirmation = true;
    }
  } else if (action === 'UNKNOWN') {
    validationError = buildLocalizedConfirmation('UNKNOWN', null, null, null, langConfig.code)
      .nativeConfirmation;
    requiresConfirmation = true;
    confidence = 0.2;
  }

  const transactionType: NormalizedRegisterVoiceCommand['transactionType'] =
    action === 'ADD' || action === 'ADD_PHC_DATA'
      ? 'Received (Warehouse)'
      : action === 'DISPENSE'
      ? 'Dispensed (OPD)'
      : action === 'UPDATE'
      ? 'Stock Update'
      : null;

  const { nativeConfirmation, englishSummary } = buildLocalizedConfirmation(
    action,
    medMatch.medicineName,
    quantity,
    medMatch.unit,
    langConfig.code
  );

  const normalizedCommandText =
    action === 'ADD' || action === 'DISPENSE' || action === 'UPDATE'
      ? `${action} | ${medMatch.medicineName || 'UNSPECIFIED'} | Qty: ${quantity ?? 0} ${medMatch.unit || 'Units'}${
          explicitBatch ? ` | Batch: ${explicitBatch}` : ''
        }`
      : action === 'SEARCH'
      ? `SEARCH | Query: "${medMatch.medicineName || cleanTranscript}"`
      : action === 'VERIFY'
      ? `VERIFY_ENTRY${medMatch.medicineName ? ` | ${medMatch.medicineName}` : ''}`
      : action === 'SAVE'
      ? 'SAVE_REGISTER'
      : 'UNKNOWN_COMMAND';

  return {
    action,
    medicineName: medMatch.medicineName,
    matchedMedicineId: medMatch.matchedMedicineId,
    quantity,
    unit: medMatch.unit,
    batch: explicitBatch,
    transactionType,
    language: langConfig.code,
    locale: langConfig.locale,
    rawTranscript: cleanTranscript,
    normalizedCommandText,
    nativeConfirmation,
    englishSummary,
    confidence,
    opdFootfall: aiHint?.parsedOpdFootfall ?? null,
    occupiedBeds: aiHint?.parsedOccupiedBeds ?? null,
    emergencyCases: aiHint?.parsedEmergencyCases ?? null,
    requiresConfirmation,
    validationError
  };
}
