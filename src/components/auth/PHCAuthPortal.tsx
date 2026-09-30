import React, { useState, useEffect } from 'react';
import {
  Lock,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  CheckCircle2,
  KeyRound,
  LogOut,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2,
  ArrowRightLeft
} from 'lucide-react';
import type { PHCFacility } from '../../types.ts';
import { INDIA_PHC_DIRECTORY } from '../../data/indiaPHCDirectory.ts';
import {
  getPHCInchargeCredential,
  saveInchargeSession,
  createDemoOfficerSession,
  type AuthenticatedInchargeSession
} from '../../utils/phcAuthDirectory.ts';

interface PHCAuthPortalProps {
  facilities?: PHCFacility[];
  selectedPHC: PHCFacility;
  targetPHCToUnlock?: PHCFacility | null;
  pendingActionLabel?: string | null;
  isModalMode?: boolean;
  initialTab?: 'demo' | 'officer' | 'signin' | 'signup' | 'directory';
  onAuthenticated: (session: AuthenticatedInchargeSession, chosenPHC: PHCFacility) => void;
  onCloseModal?: () => void;
  onGoogleSignIn?: () => void;
  onLogout?: () => void;
  isAuthLoading?: boolean;
  activeSession?: AuthenticatedInchargeSession | null;
}

const DEMO_OFFICER_DIRECTORY_PREVIEW = [
  {
    officerId: 'OSN001',
    officerName: 'Dr. Suresh Chandra Bishnoi',
    assignedPhcName: 'PHC Osian (24x7)',
    district: 'Jodhpur, Rajasthan'
  },
  {
    officerId: 'MND001',
    officerName: 'Dr. Anita Choudhary',
    assignedPhcName: 'PHC Mandore',
    district: 'Jodhpur, Rajasthan'
  },
  {
    officerId: 'BLS001',
    officerName: 'Dr. Vikram Rathore',
    assignedPhcName: 'PHC Balesar',
    district: 'Jodhpur, Rajasthan'
  },
  {
    officerId: 'BLR001',
    officerName: 'Dr. Priya Sharma',
    assignedPhcName: 'PHC Bilara',
    district: 'Jodhpur, Rajasthan'
  }
];

export const PHCAuthPortal: React.FC<PHCAuthPortalProps> = ({
  facilities = INDIA_PHC_DIRECTORY,
  selectedPHC,
  targetPHCToUnlock,
  pendingActionLabel,
  initialTab = 'demo',
  onAuthenticated,
  onCloseModal,
  onGoogleSignIn,
  onLogout,
  activeSession
}) => {
  const [chosenDemoPhcId, setChosenDemoPhcId] = useState<string>(
    (targetPHCToUnlock || selectedPHC).id
  );
  const chosenDemoPHC =
    facilities.find((f) => f.id === chosenDemoPhcId) || targetPHCToUnlock || selectedPHC;

  const defaultOfficerId = getPHCInchargeCredential(chosenDemoPHC).officerId;

  // Default to 'DEMO_ACCESS' so judges always see the single "MEDRESQ AI Demo Access" login
  const [loginMode, setLoginMode] = useState<'DEMO_ACCESS' | 'OFFICER_LOGIN'>(() =>
    initialTab === 'officer' ? 'OFFICER_LOGIN' : 'DEMO_ACCESS'
  );
  const [showExtensibleProductionAuth, setShowExtensibleProductionAuth] = useState<boolean>(
    initialTab === 'officer'
  );
  const [isSwitchingModeFromSession, setIsSwitchingModeFromSession] = useState<boolean>(false);

  const [enteredOfficerId, setEnteredOfficerId] = useState<string>(defaultOfficerId);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [showDemoReference, setShowDemoReference] = useState<boolean>(false);

  useEffect(() => {
    setChosenDemoPhcId((targetPHCToUnlock || selectedPHC).id);
    const nextOfficerId = getPHCInchargeCredential(targetPHCToUnlock || selectedPHC).officerId;
    setEnteredOfficerId(nextOfficerId);
  }, [selectedPHC, targetPHCToUnlock]);

  // Handler 1: MEDRESQ AI Demo Access — Single 1-click synthetic demo account login + PHC selection
  const handleContinueAsDemo = async (overridePhc?: PHCFacility) => {
    const targetFacility = overridePhc || chosenDemoPHC;
    setAuthError(null);
    setAuthSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phcId: targetFacility.id })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.ok && data?.session && data?.assignedPHC) {
        const assignedPHC: PHCFacility =
          facilities.find((f) => f.id === targetFacility.id) ||
          facilities.find((f) => f.id === data.assignedPHC.id) ||
          targetFacility;
        const session: AuthenticatedInchargeSession = {
          ...data.session,
          assignedPhcId: assignedPHC.id,
          assignedPhcName: assignedPHC.name,
          phcId: assignedPHC.id,
          phcName: assignedPHC.name,
          phcCode: assignedPHC.code,
          district: assignedPHC.district,
          block: assignedPHC.block,
          state: assignedPHC.state,
          unlockedPhcIds: facilities.map((f) => f.id),
          loginMode: 'DEMO_ACCESS',
          isDemoAccount: true
        };

        saveInchargeSession(session, false);
        setIsSwitchingModeFromSession(false);
        setAuthSuccessMsg(
          `MEDRESQ AI Demo Access activated for ${assignedPHC.name}. Opening dashboard...`
        );
        onAuthenticated(session, assignedPHC);
        return;
      }
    } catch {
      // Offline / fallback: create bound Demo Medical Officer session locally using existing structure
    } finally {
      setIsSubmitting(false);
    }

    const { session, assignedPHC } = createDemoOfficerSession(facilities, {
      targetPHC: targetFacility
    });
    saveInchargeSession(session, false);
    setIsSwitchingModeFromSession(false);
    setAuthSuccessMsg(
      `MEDRESQ AI Demo Access activated for ${assignedPHC.name}. Opening dashboard...`
    );
    onAuthenticated(session, assignedPHC);
  };

  // Handler 2: Extensible Production Officer Login (kept intact for future deployment)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const cleanOfficerId = (enteredOfficerId.trim() || defaultOfficerId).toUpperCase();
    const cleanPassword = enteredPassword.trim();

    if (!cleanPassword) {
      setAuthError('Incorrect password. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officerId: cleanOfficerId,
          phcId: (targetPHCToUnlock || selectedPHC).id,
          password: cleanPassword,
          rememberDevice
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok || !data?.session || !data?.assignedPHC) {
        setAuthError('Incorrect password. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const session: AuthenticatedInchargeSession = {
        ...data.session,
        loginMode: 'OFFICER_LOGIN',
        isDemoAccount: false
      };
      const assignedPHC: PHCFacility =
        facilities.find((f) => f.id === data.assignedPHC.id) || data.assignedPHC;

      setEnteredPassword('');
      saveInchargeSession(session, rememberDevice);
      setIsSwitchingModeFromSession(false);
      setAuthSuccessMsg(
        `Verified Officer ${session.officerId} (${session.officerName}). Continuing action...`
      );
      onAuthenticated(session, assignedPHC);
    } catch {
      setAuthError(
        'Unable to reach the authentication service. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // When an Officer Session or Demo Session is already active
  if (activeSession && !isSwitchingModeFromSession) {
    const isDemoSession =
      activeSession.loginMode === 'DEMO_ACCESS' || Boolean(activeSession.isDemoAccount);

    return (
      <div
        className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bound-session-modal-title"
      >
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 font-bold">
                    MEDRESQ AI Demo Access
                  </span>
                  <span className="px-2 py-0.5 rounded bg-teal-500/20 border border-teal-400/40 text-teal-200 text-[10px] font-mono font-bold">
                    Demo Mode
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-mono font-bold">
                    DEMO ACCOUNT
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-mono font-bold">
                    SYNTHETIC DATA
                  </span>
                </div>
                <h2 id="bound-session-modal-title" className="text-base font-bold text-white mt-0.5">
                  {activeSession.officerName || activeSession.inchargeName}
                </h2>
              </div>
            </div>
            {onCloseModal && (
              <button
                type="button"
                onClick={onCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close session modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold">MEDRESQ AI Demo Access Active</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-300 font-bold">
                    Demo Mode
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold">
                    DEMO ACCOUNT
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold">
                    SYNTHETIC DATA
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                  Signed in with the synthetic <strong>MEDRESQ AI Demo Access</strong> account. You can freely switch between any demo PHC facility below without requiring separate facility passwords.
                </p>
              </div>
            </div>

            {/* Facility / PHC Selector inside active Demo Session */}
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
              <label
                htmlFor="session-phc-facility-select"
                className="block text-[11px] font-mono uppercase tracking-wider text-teal-900 font-bold"
              >
                Select Active PHC / Facility (No Password Required in Demo Mode)
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="session-phc-facility-select"
                  value={chosenDemoPhcId}
                  onChange={(e) => {
                    const nextPhc = facilities.find((f) => f.id === e.target.value);
                    if (nextPhc) {
                      setChosenDemoPhcId(nextPhc.id);
                      void handleContinueAsDemo(nextPhc);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-teal-300 bg-white text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                >
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} ({fac.code}) — {fac.block}, {fac.district}, {fac.state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Active Facility / PHC
                </span>
                <strong className="text-teal-900">
                  {selectedPHC.name} ({selectedPHC.code})
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Synthetic Demo Account
                </span>
                <strong className="text-slate-900">
                  {activeSession.officerName || activeSession.inchargeName} ({activeSession.officerId})
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  District &amp; State
                </span>
                <strong className="text-slate-900">
                  {selectedPHC.district}, {selectedPHC.state}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Authentication Mode
                </span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isDemoSession ? 'DEMO MODE (SYNTHETIC)' : 'OFFICER LOGIN'}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {onCloseModal && (
                  <button
                    type="button"
                    onClick={onCloseModal}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"
                  >
                    Continue Working
                  </button>
                )}
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Demo Session</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single "MEDRESQ AI Demo Access" Login Modal (with extensible production auth option tucked cleanly below)
  return (
    <div
      id="authorized-access-modal"
      className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="authorized-access-modal-title"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 my-4">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-teal-500/25 border border-teal-400/40 text-teal-200 text-[10px] font-mono font-bold uppercase">
                  Demo Mode
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-mono font-bold uppercase">
                  DEMO ACCOUNT
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-mono font-bold uppercase">
                  SYNTHETIC DATA
                </span>
              </div>
              <h2
                id="authorized-access-modal-title"
                className="text-base sm:text-lg font-bold text-white tracking-tight mt-1"
              >
                MEDRESQ AI Demo Access
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Single synthetic demo account login — select any PHC facility with zero password friction.
              </p>
            </div>
          </div>

          {onCloseModal && (
            <button
              type="button"
              onClick={() => {
                setIsSwitchingModeFromSession(false);
                onCloseModal();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
              aria-label="Cancel authentication"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {pendingActionLabel && (
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
                  Requested Operation
                </span>
                <strong className="text-amber-950 truncate block">{pendingActionLabel}</strong>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                {chosenDemoPHC.name}
              </span>
            </div>
          )}

          {loginMode === 'DEMO_ACCESS' ? (
            <div id="demo-access-panel" className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-700 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                      DEMO ACCOUNT
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                      SYNTHETIC DATA
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-teal-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                    Demo Mode
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-teal-800 font-bold">
                      MEDRESQ AI Demo Access · Synthetic Officer Account
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {chosenDemoPHC.medicalOfficerInCharge || 'Dr. Suresh Chandra Bishnoi'}
                    </div>
                    <div className="text-xs text-slate-700 font-medium">
                      {chosenDemoPHC.name} ({chosenDemoPHC.code}) · {chosenDemoPHC.district}, {chosenDemoPHC.state}
                    </div>
                  </div>
                </div>

                {/* Select Facility / PHC directly in Demo Login */}
                <div className="pt-2 border-t border-teal-200/80 space-y-1.5">
                  <label
                    htmlFor="demo-login-phc-selector"
                    className="block text-[10px] font-mono uppercase tracking-wider text-teal-900 font-bold"
                  >
                    Select Facility / PHC (Switch Anytime Without Password)
                  </label>
                  <select
                    id="demo-login-phc-selector"
                    value={chosenDemoPhcId}
                    onChange={(e) => setChosenDemoPhcId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-teal-300 bg-white text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    {facilities.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name} ({fac.code}) — {fac.block}, {fac.district}, {fac.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-teal-200/80 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Demo Account Role
                    </span>
                    <strong className="text-slate-900">Medical Officer In-Charge</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Facility Identity
                    </span>
                    <strong className="text-teal-900 font-mono">
                      {chosenDemoPHC.code} ({defaultOfficerId})
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>Hackathon Demo Mode (Synthetic Data):</strong> Clicking below signs in with the single synthetic demo account. After login, you can switch between any PHC/BSC from the top facility selector without re-entering passwords.
              </div>

              {authSuccessMsg && (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                {onCloseModal && (
                  <button
                    id="demo-cancel-btn"
                    type="button"
                    onClick={() => {
                      setIsSwitchingModeFromSession(false);
                      onCloseModal();
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  id="continue-as-demo-btn"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleContinueAsDemo()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? 'Activating Demo Access...'
                      : 'MEDRESQ AI Demo Access (1-Click Login)'}
                  </span>
                </button>
              </div>

              {/* Extensible Production Authentication Hook (kept unobtrusive for future deployment) */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowExtensibleProductionAuth((prev) => !prev);
                    setLoginMode('OFFICER_LOGIN');
                    setAuthError(null);
                  }}
                  className="text-[10px] font-mono text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Production Deployment Extensibility: Officer Credential Login →
                </button>
              </div>
            </div>
          ) : (
            <div id="officer-login-panel" className="space-y-4">
              <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Officer Credential Login</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('DEMO_ACCESS');
                    setShowExtensibleProductionAuth(false);
                    setAuthError(null);
                  }}
                  className="text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                >
                  ← Back to MEDRESQ AI Demo Access
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="officer-id-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Officer ID
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="officer-id-input"
                      name="officerId"
                      type="text"
                      autoComplete="username"
                      value={enteredOfficerId}
                      onChange={(e) => {
                        setEnteredOfficerId(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder={`Officer ID (e.g. ${defaultOfficerId})`}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-sm font-mono font-semibold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="officer-password-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="officer-password-input"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={enteredPassword}
                      onChange={(e) => {
                        setEnteredPassword(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder="Enter password to authenticate"
                      className="w-full pl-10 pr-20 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-sm font-mono font-semibold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                    />
                    <button
                      id="toggle-password-visibility-btn"
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 flex items-center gap-1 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div
                    id="auth-error-banner"
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium flex items-start gap-2"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccessMsg && (
                  <div
                    role="status"
                    className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{authSuccessMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  {onCloseModal && (
                    <button
                      id="auth-cancel-btn"
                      type="button"
                      onClick={() => {
                        setIsSwitchingModeFromSession(false);
                        onCloseModal();
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    id="phc-login-submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Authenticating...' : 'LOGIN / Authenticate'}</span>
                  </button>
                </div>
              </form>

              {onGoogleSignIn && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 text-center">
                    Or Authenticate via Firebase Google SSO
                  </div>
                  <button
                    type="button"
                    onClick={() => void onGoogleSignIn()}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span>Sign in with Google (Firebase Auth)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
