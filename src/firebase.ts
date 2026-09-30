import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  type Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function initFirestoreSafe(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db: Firestore = initFirestoreSafe();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signOut };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = false
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  const serialized = JSON.stringify(errInfo);
  if (rethrow) {
    console.error('Firestore Error: ', serialized);
    throw new Error(serialized);
  }
  console.warn('Firestore Notice: ', serialized);
  return errInfo;
}

/**
 * Sanitizes a document ID so it strictly matches ^[a-zA-Z0-9_\-]+$ and maxLength <= 128.
 */
export function sanitizeFirestoreId(rawId: string, maxLength = 64): string {
  const cleaned = String(rawId || 'doc')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, maxLength);
  return cleaned || `doc-${Date.now()}`;
}

/**
 * Recursively strips undefined keys and normalizes NaN/Infinity values before writing to Firestore.
 */
export function sanitizeFirestorePayload<T>(payload: T): T {
  if (payload === null || payload === undefined) {
    return payload;
  }
  if (typeof payload === 'number') {
    return (Number.isFinite(payload) ? payload : 0) as unknown as T;
  }
  if (Array.isArray(payload)) {
    return payload
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestorePayload(item)) as unknown as T;
  }
  if (typeof payload === 'object' && !(payload instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (value !== undefined) {
        out[key] = sanitizeFirestorePayload(value);
      }
    }
    return out as T;
  }
  return payload;
}

/**
 * Validates connection to Firestore on boot as specified by the Firebase integration skill.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}
