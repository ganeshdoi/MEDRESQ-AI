import type { PHCFacility, Role } from '../types.ts';
import { INDIA_PHC_DIRECTORY } from '../data/indiaPHCDirectory.ts';

export interface PHCInchargeAccount {
  officerId: string;
  officerName: string;
  designation: string;
  assignedPhcId: string;
  assignedPhcName: string;
  phcId: string;
  phcName: string;
  phcCode: string;
  district: string;
  block: string;
  state: string;
  inchargeName: string;
  inchargeEmail: string;
  contactNumber: string;
  role: Role;
  authenticationStatus: 'AUTHENTICATED' | 'UNAUTHENTICATED';
  maskedCredential: string;
  credentialHint: string;
  isCustomRegistered?: boolean;
  authMode: 'DEMO_ONLY_SIMULATED';
  registeredAt?: string;
}

export interface AuthenticatedInchargeSession {
  officerId: string;
  officerName: string;
  designation: string;
  assignedPhcId: string;
  assignedPhcName: string;
  phcId: string;
  phcName: string;
  phcCode: string;
  district: string;
  block?: string;
  state: string;
  inchargeName: string;
  inchargeEmail: string;
  role: Role;
  authenticationStatus: 'AUTHENTICATED';
  maskedCredentialUsed: string;
  unlockedPhcIds: string[];
  loginTimestamp: string;
  sessionToken?: string;
  rememberDevice?: boolean;
  loginMode?: 'DEMO_ACCESS' | 'OFFICER_LOGIN';
  isDemoAccount?: boolean;
  isSimulatedDemoSession: true;
}

export type ActivePHCSession = AuthenticatedInchargeSession;

const STORAGE_KEY_ACTIVE_AUTH = 'medresq_phc_officer_session_v4';

/**
 * Canonical 1-to-1 Officer ID mapping for PHC In-Charge accounts based on INDIA_PHC_DIRECTORY.
 */
const CANONICAL_OFFICER_IDS: Record<string, string> = {
  'phc-osian': 'OSN001',
  'phc-mandore': 'MND001',
  'phc-balesar': 'BLS001',
  'phc-bilara': 'BLR001',
  'phc-luni': 'LUN001',
  'phc-tinwari': 'TNW001',
  'phc-bap': 'BAP001',
  'phc-shergarh': 'SHG001',
  'phc-bhopalgarh': 'BPG001',
  'phc-pipar': 'PPR001',
  'phc-phalodi-rural': 'PHL001',
  'phc-lohawat': 'LHW001',
  'phc-dechu': 'DCH001',
  'phc-pokhran': 'PKR001'
};

/**
 * Generates a deterministic 1-to-1 Officer ID for any PHC in INDIA_PHC_DIRECTORY.
 */
export function getOfficerIdForPHC(phc: PHCFacility): string {
  if (CANONICAL_OFFICER_IDS[phc.id]) {
    return CANONICAL_OFFICER_IDS[phc.id];
  }
  const blockLetters = phc.block
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .padEnd(3, 'X')
    .slice(0, 3);
  const codeDigits = phc.code.replace(/[^0-9]/g, '').padStart(3, '0').slice(-3);
  return `${blockLetters}${codeDigits}`;
}

/**
 * Returns a masked placeholder for UI display. Never returns a password.
 */
export function getMaskedPHCCredential(): string {
  return '••••••••••••';
}

/**
 * Generates a clean institutional demo email handle for the PHC In-Charge
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
 * Gets the resolved PHC In-Charge account metadata for a specific PHC (no passwords or secrets).
 */
export function getPHCInchargeAccount(phc: PHCFacility): PHCInchargeAccount {
  const officerId = getOfficerIdForPHC(phc);
  const officerName = phc.medicalOfficerInCharge;
  const designation = 'Medical Officer In-Charge (MOIC)';

  return {
    officerId,
    officerName,
    designation,
    assignedPhcId: phc.id,
    assignedPhcName: phc.name,
    phcId: phc.id,
    phcName: phc.name,
    phcCode: phc.code,
    district: phc.district,
    block: phc.block,
    state: phc.state,
    inchargeName: officerName,
    inchargeEmail: getDefaultInchargeEmail(phc),
    contactNumber: phc.contactNumber,
    role: 'medical_officer',
    authenticationStatus: 'UNAUTHENTICATED',
    maskedCredential: '••••••••••••',
    credentialHint: 'Server-Verified PHC Officer Credential',
    isCustomRegistered: false,
    authMode: 'DEMO_ONLY_SIMULATED'
  };
}

/**
 * Alias for compatibility — returns public officer metadata with masked credential placeholder only.
 */
export function getPHCInchargeCredential(phc: PHCFacility): PHCInchargeAccount {
  return getPHCInchargeAccount(phc);
}

/**
 * Builds the directory of all PHC In-Charge accounts (metadata only, no passwords).
 */
export function getAllPHCInchargeAccounts(): PHCInchargeAccount[] {
  return INDIA_PHC_DIRECTORY.map((phc) => getPHCInchargeAccount(phc));
}

/**
 * Resolves a PHC facility and its assigned Officer Account from an entered Officer ID
 * (supports Officer ID e.g. OSN001, MND001, BLS001, BLR001, or PHC Code e.g. RJ-JDP-PHC-021, or MOIC email).
 */
export function resolvePHCByOfficerId(
  rawOfficerId: string,
  facilities: PHCFacility[] = INDIA_PHC_DIRECTORY
): { phc: PHCFacility; account: PHCInchargeAccount } | null {
  const cleaned = rawOfficerId.trim().toUpperCase();
  if (!cleaned) return null;

  for (const phc of facilities) {
    const account = getPHCInchargeAccount(phc);
    if (
      account.officerId.toUpperCase() === cleaned ||
      phc.code.toUpperCase() === cleaned ||
      phc.id.toUpperCase() === cleaned ||
      account.inchargeEmail.toUpperCase() === cleaned
    ) {
      return { phc, account };
    }
  }
  return null;
}

/**
 * Creates a sanitized AuthenticatedInchargeSession bound strictly to the officer's assigned PHC.
 */
export function createBoundInchargeSession(
  phc: PHCFacility,
  account: PHCInchargeAccount,
  options?: {
    sessionToken?: string;
    rememberDevice?: boolean;
    loginTimestamp?: string;
    loginMode?: 'DEMO_ACCESS' | 'OFFICER_LOGIN';
    isDemoAccount?: boolean;
  }
): AuthenticatedInchargeSession {
  const loginMode = options?.loginMode || 'OFFICER_LOGIN';
  const isDemoAccount = options?.isDemoAccount ?? loginMode === 'DEMO_ACCESS';
  return {
    officerId: account.officerId,
    officerName: account.officerName,
    designation: isDemoAccount ? 'Medical Officer In-Charge' : account.designation,
    assignedPhcId: phc.id,
    assignedPhcName: phc.name,
    phcId: phc.id,
    phcName: phc.name,
    phcCode: phc.code,
    district: phc.district,
    block: phc.block,
    state: phc.state,
    inchargeName: account.officerName,
    inchargeEmail: account.inchargeEmail,
    role: account.role,
    authenticationStatus: 'AUTHENTICATED',
    maskedCredentialUsed: isDemoAccount ? 'DEMO ACCESS (NO PASSWORD)' : '••••••••••••',
    unlockedPhcIds: [phc.id],
    loginTimestamp:
      options?.loginTimestamp ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sessionToken: options?.sessionToken,
    rememberDevice: Boolean(options?.rememberDevice),
    loginMode,
    isDemoAccount,
    isSimulatedDemoSession: true
  };
}

/**
 * Creates the canonical synthetic Demo Medical Officer session for any selected demo PHC (defaults to PHC Osian).
 * Uses the existing AuthenticatedInchargeSession structure without creating a second auth system.
 */
export function createDemoOfficerSession(
  facilities: PHCFacility[] = INDIA_PHC_DIRECTORY,
  options?: { sessionToken?: string; loginTimestamp?: string; targetPHC?: PHCFacility | null; phcId?: string }
): { session: AuthenticatedInchargeSession; assignedPHC: PHCFacility } {
  const demoPhc =
    options?.targetPHC ||
    (options?.phcId ? facilities.find((f) => f.id === options.phcId || f.code === options.phcId) : undefined) ||
    facilities.find((f) => f.id === 'phc-osian' || f.code === 'RJ-JDP-PHC-021') ||
    facilities[0] ||
    INDIA_PHC_DIRECTORY[0];
  const account = getPHCInchargeAccount(demoPhc);
  const demoAccount: PHCInchargeAccount = {
    ...account,
    officerId: getOfficerIdForPHC(demoPhc),
    officerName: demoPhc.medicalOfficerInCharge || 'Dr. Suresh Chandra Bishnoi',
    inchargeName: demoPhc.medicalOfficerInCharge || 'Dr. Suresh Chandra Bishnoi',
    designation: 'Medical Officer In-Charge (Demo Account)',
    district: demoPhc.district,
    block: demoPhc.block,
    state: demoPhc.state
  };
  const session = createBoundInchargeSession(demoPhc, demoAccount, {
    sessionToken: options?.sessionToken,
    rememberDevice: false,
    loginTimestamp: options?.loginTimestamp,
    loginMode: 'DEMO_ACCESS',
    isDemoAccount: true
  });
  session.unlockedPhcIds = facilities.map((f) => f.id);
  return { session, assignedPHC: demoPhc };
}

/**
 * Active PHC Auth Session helpers (stores only non-sensitive session identity, never passwords).
 */
export function loadSavedInchargeSession(): AuthenticatedInchargeSession | null {
  try {
    localStorage.removeItem('medresq_phc_active_auth_session_v2');
    localStorage.removeItem('medresq_phc_incharge_custom_accounts_v2');
    const rawSession =
      sessionStorage.getItem(STORAGE_KEY_ACTIVE_AUTH) ||
      localStorage.getItem(STORAGE_KEY_ACTIVE_AUTH);
    if (!rawSession) return null;
    const parsed = JSON.parse(rawSession) as AuthenticatedInchargeSession;
    if (!parsed || !parsed.phcId || !parsed.officerId) return null;
    const isDemo = Boolean(parsed.isDemoAccount || parsed.loginMode === 'DEMO_ACCESS');
    return {
      ...parsed,
      assignedPhcId: parsed.assignedPhcId || parsed.phcId,
      assignedPhcName: parsed.assignedPhcName || parsed.phcName,
      officerName: parsed.officerName || parsed.inchargeName,
      authenticationStatus: 'AUTHENTICATED',
      unlockedPhcIds: isDemo
        ? INDIA_PHC_DIRECTORY.map((f) => f.id)
        : [parsed.assignedPhcId || parsed.phcId],
      maskedCredentialUsed: isDemo ? 'DEMO ACCESS (NO PASSWORD)' : '••••••••••••',
      loginMode: parsed.loginMode || 'DEMO_ACCESS',
      isDemoAccount: isDemo,
      isSimulatedDemoSession: true
    };
  } catch {
    return null;
  }
}

export function saveInchargeSession(
  session: AuthenticatedInchargeSession | null,
  rememberDevice?: boolean
): void {
  try {
    localStorage.removeItem('medresq_phc_active_auth_session_v2');
    localStorage.removeItem('medresq_phc_incharge_custom_accounts_v2');
    if (!session) {
      sessionStorage.removeItem(STORAGE_KEY_ACTIVE_AUTH);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_AUTH);
    } else {
      const boundPhcId = session.assignedPhcId || session.phcId;
      const shouldRemember = rememberDevice ?? session.rememberDevice ?? false;
      const isDemo = Boolean(session.isDemoAccount || session.loginMode === 'DEMO_ACCESS');
      const sanitized: AuthenticatedInchargeSession = {
        ...session,
        assignedPhcId: boundPhcId,
        assignedPhcName: session.assignedPhcName || session.phcName,
        officerName: session.officerName || session.inchargeName,
        authenticationStatus: 'AUTHENTICATED',
        unlockedPhcIds: isDemo ? INDIA_PHC_DIRECTORY.map((f) => f.id) : [boundPhcId],
        maskedCredentialUsed: isDemo ? 'DEMO ACCESS (NO PASSWORD)' : '••••••••••••',
        rememberDevice: shouldRemember,
        loginMode: session.loginMode || 'DEMO_ACCESS',
        isDemoAccount: isDemo,
        isSimulatedDemoSession: true
      };
      const serialized = JSON.stringify(sanitized);
      sessionStorage.setItem(STORAGE_KEY_ACTIVE_AUTH, serialized);
      if (shouldRemember) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_AUTH, serialized);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_AUTH);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export const loadActivePHCSession = loadSavedInchargeSession;
export const saveActivePHCSession = saveInchargeSession;
