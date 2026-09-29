import { PHCFacility, Role } from '../types.ts';
import { INDIA_PHC_DIRECTORY } from '../data/indiaPHCDirectory.ts';

export interface PHCInchargeAccount {
  phcId: string;
  phcName: string;
  phcCode: string;
  district: string;
  block: string;
  state: string;
  inchargeName: string;
  inchargeEmail: string;
  contactNumber: string;
  designation: string;
  role: Role;
  maskedCredential: string;
  credentialHint: string;
  customPasscodeDigest?: string;
  isCustomRegistered?: boolean;
  authMode: 'DEMO_ONLY_SIMULATED';
  registeredAt?: string;
}

export interface AuthenticatedInchargeSession {
  phcId: string;
  phcName: string;
  phcCode: string;
  district: string;
  state: string;
  inchargeName: string;
  inchargeEmail: string;
  designation: string;
  role: Role;
  maskedCredentialUsed: string;
  unlockedPhcIds: string[];
  loginTimestamp: string;
  isSimulatedDemoSession: true;
}

export type ActivePHCSession = AuthenticatedInchargeSession;

const STORAGE_KEY_CUSTOM_ACCOUNTS = 'medresq_phc_incharge_custom_accounts_v2';
const STORAGE_KEY_ACTIVE_AUTH = 'medresq_phc_active_auth_session_v2';

/**
 * Computes a non-reversible deterministic digest for demo-only passcode checks
 * so no plaintext password is ever stored in localStorage or exposed in the UI.
 */
export function computeDemoPasscodeDigest(rawInput: string, salt = 'DEMO_PHC_SALT'): string {
  const normalized = `${salt}:${rawInput.trim().toUpperCase()}`;
  let h1 = 0xdeadbeef ^ normalized.length;
  let h2 = 0x41c6ce57 ^ normalized.length;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `DEMO-HASH-${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Returns a masked representation for UI display. Never returns a plaintext password.
 */
export function getMaskedPHCCredential(): string {
  return '••••••••••••';
}

/**
 * Generates a clean demo email handle for the PHC Incharge (Demo Only)
 */
export function getDefaultInchargeEmail(phc: PHCFacility): string {
  const cleanBlock = phc.block
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
  const stateCode = phc.state === 'Rajasthan' ? 'rj' : phc.code.slice(0, 2).toLowerCase();
  return `moic.${cleanBlock}.${stateCode}@demo-phc.example.org`;
}

/**
 * Loads custom registered / updated PHC Incharge accounts from localStorage (hashed digests only)
 */
export function loadCustomPHCAccounts(): Record<string, Partial<PHCInchargeAccount>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_ACCOUNTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Saves or updates a PHC Incharge account (Sign Up or Reset Demo Passcode) using a masked digest
 */
export function saveCustomPHCAccount(
  phcId: string,
  updates: {
    inchargeName?: string;
    inchargeEmail?: string;
    contactNumber?: string;
    designation?: string;
    role?: Role;
    newDemoPasscode?: string;
  }
): void {
  try {
    const existing = loadCustomPHCAccounts();
    const prev = existing[phcId] || {};
    const nextRecord: Partial<PHCInchargeAccount> = {
      ...prev,
      phcId,
      inchargeName: updates.inchargeName ?? prev.inchargeName,
      inchargeEmail: updates.inchargeEmail ?? prev.inchargeEmail,
      contactNumber: updates.contactNumber ?? prev.contactNumber,
      designation: updates.designation ?? prev.designation ?? 'Medical Officer In-Charge (MOIC)',
      role: updates.role ?? prev.role ?? 'medical_officer',
      maskedCredential: '••••••••••••',
      isCustomRegistered: true,
      authMode: 'DEMO_ONLY_SIMULATED',
      registeredAt: new Date().toISOString()
    };
    if (updates.newDemoPasscode && updates.newDemoPasscode.trim().length > 0) {
      nextRecord.customPasscodeDigest = computeDemoPasscodeDigest(updates.newDemoPasscode, phcId);
    }
    existing[phcId] = nextRecord;
    localStorage.setItem(STORAGE_KEY_CUSTOM_ACCOUNTS, JSON.stringify(existing));
  } catch {
    // Ignore storage errors in restricted environments
  }
}

/**
 * Gets the resolved PHC Incharge account for a specific PHC (masked credentials only)
 */
export function getPHCInchargeAccount(phc: PHCFacility): PHCInchargeAccount {
  const customMap = loadCustomPHCAccounts();
  const custom = customMap[phc.id];
  return {
    phcId: phc.id,
    phcName: phc.name,
    phcCode: phc.code,
    district: phc.district,
    block: phc.block,
    state: phc.state,
    inchargeName: custom?.inchargeName || phc.medicalOfficerInCharge,
    inchargeEmail: custom?.inchargeEmail || getDefaultInchargeEmail(phc),
    contactNumber: custom?.contactNumber || phc.contactNumber,
    designation: custom?.designation || 'Medical Officer In-Charge (MOIC)',
    role: custom?.role || 'medical_officer',
    maskedCredential: '••••••••••••',
    credentialHint: custom?.isCustomRegistered
      ? 'Custom Demo Passcode Configured (Masked)'
      : 'Demo Facility Passcode (Masked — Use Demo Mode Sign-In)',
    customPasscodeDigest: custom?.customPasscodeDigest,
    isCustomRegistered: Boolean(custom?.isCustomRegistered),
    authMode: 'DEMO_ONLY_SIMULATED',
    registeredAt: custom?.registeredAt
  };
}

/**
 * Alias for compatibility with TopBar and AppContext — returns masked credentials only
 */
export function getPHCInchargeCredential(phc: PHCFacility): PHCInchargeAccount {
  return getPHCInchargeAccount(phc);
}

/**
 * Builds the full directory of all 53 PHC Incharge accounts with masked credentials only.
 */
export function getAllPHCInchargeAccounts(): PHCInchargeAccount[] {
  return INDIA_PHC_DIRECTORY.map((phc) => getPHCInchargeAccount(phc));
}

/**
 * Verifies a simulated demo credential without exposing plaintext passwords in source or UI.
 */
export function verifyDemoPHCCredential(phc: PHCFacility, enteredPasscode: string): boolean {
  const trimmed = enteredPasscode.trim();
  if (!trimmed) return false;
  const account = getPHCInchargeAccount(phc);
  if (account.customPasscodeDigest) {
    const enteredDigest = computeDemoPasscodeDigest(trimmed, phc.id);
    if (enteredDigest === account.customPasscodeDigest) return true;
  }
  if (trimmed.toUpperCase() === 'DEMO' || trimmed.toUpperCase() === phc.code.toUpperCase()) {
    return true;
  }
  return trimmed.length >= 4;
}

/**
 * Active PHC Auth Session helpers
 */
export function loadSavedInchargeSession(): AuthenticatedInchargeSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthenticatedInchargeSession;
    return {
      ...parsed,
      maskedCredentialUsed: '••••••••••••',
      isSimulatedDemoSession: true
    };
  } catch {
    return null;
  }
}

export function saveInchargeSession(session: AuthenticatedInchargeSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_AUTH);
    } else {
      const sanitized: AuthenticatedInchargeSession = {
        ...session,
        maskedCredentialUsed: '••••••••••••',
        isSimulatedDemoSession: true
      };
      localStorage.setItem(STORAGE_KEY_ACTIVE_AUTH, JSON.stringify(sanitized));
    }
  } catch {
    // Ignore storage errors
  }
}

export const loadActivePHCSession = loadSavedInchargeSession;
export const saveActivePHCSession = saveInchargeSession;
