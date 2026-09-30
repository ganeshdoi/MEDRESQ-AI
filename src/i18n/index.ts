import { en, type TranslationDictionary } from './en.ts';
import { hi } from './hi.ts';
import { ta } from './ta.ts';
import { te } from './te.ts';

/**
 * Supported initial languages for MedResQ AI:
 * 1. English — en
 * 2. Hindi — hi
 * 3. Tamil — ta
 * 4. Telugu — te
 *
 * Architecture is extensible so additional Indian languages (e.g. kn, ml, mr, bn, gu)
 * can be registered in SUPPORTED_LANGUAGES and TRANSLATIONS without structural changes.
 */
export type SupportedLanguageCode = 'en' | 'hi' | 'ta' | 'te';

export interface LanguageMetadata {
  code: SupportedLanguageCode;
  name: string;
  nativeLabel: string;
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageMetadata[] = [
  { code: 'en', name: 'English', nativeLabel: 'English', bcp47: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeLabel: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeLabel: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeLabel: 'తెలుగు', bcp47: 'te-IN' }
] as const;

export const TRANSLATIONS: Record<SupportedLanguageCode, TranslationDictionary> = {
  en,
  hi,
  ta,
  te
};

export const DEFAULT_LANGUAGE: SupportedLanguageCode = 'en';
export const LANGUAGE_STORAGE_KEY = 'medresq_ui_language';

export function isValidLanguageCode(code: unknown): code is SupportedLanguageCode {
  return typeof code === 'string' && (code === 'en' || code === 'hi' || code === 'ta' || code === 'te');
}

export function getSavedLanguage(): SupportedLanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isValidLanguageCode(saved)) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_LANGUAGE;
}

export function saveLanguagePreference(lang: SupportedLanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  } catch {
    // ignore storage errors
  }
}

export function getTranslation(lang: SupportedLanguageCode): TranslationDictionary {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}

export type AttendanceStatusEnum = 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'NOT_MARKED';

export function formatAttendanceStatusLabel(
  status: AttendanceStatusEnum | string,
  lang: SupportedLanguageCode
): string {
  const dict = getTranslation(lang);
  switch (status) {
    case 'PRESENT':
      return dict.attendance.present;
    case 'ABSENT':
      return dict.attendance.absent;
    case 'ON_LEAVE':
      return dict.attendance.onLeave;
    case 'NOT_MARKED':
    default:
      return dict.attendance.notMarked;
  }
}

export function formatDesignationLabel(
  designation: string,
  lang: SupportedLanguageCode
): string {
  const dict = getTranslation(lang);
  const norm = designation.trim().toLowerCase();
  if (norm.includes('medical officer') || norm === 'moic') return dict.attendance.designations.medicalOfficer;
  if (norm.includes('staff nurse') || norm.includes('nurse')) return dict.attendance.designations.staffNurse;
  if (norm.includes('pharmacist')) return dict.attendance.designations.pharmacist;
  if (norm.includes('lab technician') || norm.includes('dmlt')) return dict.attendance.designations.labTechnician;
  if (norm.includes('anm') || norm.includes('health worker')) return dict.attendance.designations.anm;
  if (norm.includes('cho') || norm.includes('community health officer')) return dict.attendance.designations.cho;
  if (norm.includes('data entry')) return dict.attendance.designations.dataEntryOperator;
  return dict.attendance.designations.other;
}

export { en, hi, ta, te, type TranslationDictionary };
