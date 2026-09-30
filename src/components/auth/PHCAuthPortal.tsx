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
  initialTab = 'signin',
  onAuthenticated,
  onCloseModal,
  onLogout,
  activeSession
}) => {
  const defaultOfficerId = getPHCInchargeCredential(targetPHCToUnlock || selectedPHC).officerId;

  // Support two login modes: 'DEMO_ACCESS' (no ID/password required) and 'OFFICER_LOGIN' (Officer ID + Password)
  const [loginMode, setLoginMode] = useState<'DEMO_ACCESS' | 'OFFICER_LOGIN'>(() =>
    initialTab === 'demo' ? 'DEMO_ACCESS' : 'OFFICER_LOGIN'
  );
  // Allow user with an active session to switch to the login mode switcher directly inside the modal
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
    if (initialTab === 'demo') {
      setLoginMode('DEMO_ACCESS');
    } else if (initialTab === 'officer' || initialTab === 'signin') {
      setLoginMode('OFFICER_LOGIN');
    }
  }, [initialTab]);

  useEffect(() => {
    const nextOfficerId = getPHCInchargeCredential(targetPHCToUnlock || selectedPHC).officerId;
    setEnteredOfficerId(nextOfficerId);
  }, [selectedPHC, targetPHCToUnlock]);

  // Handler 1: DEMO ACCESS — No Officer ID or password required
  const handleContinueAsDemo = async () => {
    setAuthError(null);
    setAuthSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.ok && data?.session && data?.assignedPHC) {
        const session: AuthenticatedInchargeSession = {
          ...data.session,
          loginMode: 'DEMO_ACCESS',
          isDemoAccount: true
        };
        const assignedPHC: PHCFacility =
          facilities.find((f) => f.id === data.assignedPHC.id) || data.assignedPHC;

        saveInchargeSession(session, false);
        setIsSwitchingModeFromSession(false);
        setAuthSuccessMsg(
          `Demo Access activated for ${session.officerName} (${assignedPHC.name}). Opening dashboard...`
        );
        onAuthenticated(session, assignedPHC);
        return;
      }
    } catch {
      // Offline / fallback: create bound Demo Medical Officer session locally using existing structure
    } finally {
      setIsSubmitting(false);
    }

    const { session, assignedPHC } = createDemoOfficerSession(facilities);
    saveInchargeSession(session, false);
    setIsSwitchingModeFromSession(false);
    setAuthSuccessMsg(
      `Demo Access activated for ${session.officerName} (${assignedPHC.name}). Opening dashboard...`
    );
    onAuthenticated(session, assignedPHC);
  };

  // Handler 2: OFFICER LOGIN — Existing Officer ID + Password authentication
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

  // When an Officer Session or Demo Session is already active (and user hasn't clicked "Switch Mode")
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 font-bold">
                    MEDRESQ AI · PHC OPERATIONS PORTAL
                  </span>
                  {isDemoSession && (
                    <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-mono font-bold">
                      DEMO ACCOUNT · SYNTHETIC DATA
                    </span>
                  )}
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
            {isDemoSession ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">Demo Access Session Active</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold">
                      DEMO ACCOUNT · SYNTHETIC DATA
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                    Signed in as <strong>Demo Medical Officer</strong> for{' '}
                    <strong>PHC Osian</strong> (Jodhpur, Rajasthan). This session uses synthetic
                    demonstration data for prototype evaluation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Authorized Officer Session Active</div>
                  <p className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
                    Your session is authenticated via Officer Login for{' '}
                    <strong>{activeSession.assignedPhcName || selectedPHC.name}</strong>. Protected
                    supply-chain actions are unlocked for this session.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Officer ID
                </span>
                <strong className="font-mono text-sm text-slate-900">
                  {activeSession.officerId}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Designation
                </span>
                <strong className="text-slate-900">
                  {activeSession.designation || 'Medical Officer In-Charge'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Assigned PHC
                </span>
                <strong className="text-teal-900">
                  {activeSession.assignedPhcName || selectedPHC.name}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Login Mode
                </span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800">
                  {isDemoSession ? 'DEMO ACCESS (SYNTHETIC)' : 'OFFICER LOGIN'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  District &amp; State
                </span>
                <strong className="text-slate-900">
                  {activeSession.district || selectedPHC.district},{' '}
                  {activeSession.state || selectedPHC.state}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Authentication Status
                </span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{activeSession.authenticationStatus || 'AUTHENTICATED'}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {onCloseModal && (
                  <button
                    type="button"
                    onClick={onCloseModal}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                  >
                    Continue Working
                  </button>
                )}
                <button
                  type="button"
                  id="session-switch-login-mode-btn"
                  onClick={() => {
                    setLoginMode(isDemoSession ? 'OFFICER_LOGIN' : 'DEMO_ACCESS');
                    setIsSwitchingModeFromSession(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-teal-700" />
                  <span>
                    {isDemoSession ? 'Switch to Officer Login' : 'Switch to Demo Access'}
                  </span>
                </button>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Session</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PHC Login Screen / Protected Action Modal supporting TWO login modes:
  // 1. DEMO ACCESS — no ID/password required
  // 2. OFFICER LOGIN — existing Officer ID + Password authentication
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
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300 font-extrabold">
                  MEDRESQ AI · PHC OPERATIONS PORTAL
                </span>
              </div>
              <h2
                id="authorized-access-modal-title"
                className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5"
              >
                Authorized access required
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                This action modifies supply-chain data. Please authenticate to continue.
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
                {selectedPHC.name}
              </span>
            </div>
          )}

          {/* TWO-MODE SELECTOR: [ DEMO ACCESS ] or [ OFFICER LOGIN ] */}
          <div className="space-y-1.5">
            <div
              role="tablist"
              aria-label="Select PHC Login Mode"
              className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200"
            >
              <button
                id="mode-tab-demo-access"
                type="button"
                role="tab"
                aria-selected={loginMode === 'DEMO_ACCESS'}
                onClick={() => {
                  setLoginMode('DEMO_ACCESS');
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  loginMode === 'DEMO_ACCESS'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>DEMO ACCESS</span>
              </button>

              <button
                id="mode-tab-officer-login"
                type="button"
                role="tab"
                aria-selected={loginMode === 'OFFICER_LOGIN'}
                onClick={() => {
                  setLoginMode('OFFICER_LOGIN');
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  loginMode === 'OFFICER_LOGIN'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span>OFFICER LOGIN</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              {loginMode === 'DEMO_ACCESS'
                ? 'Prototype evaluation mode — no Officer ID or password required.'
                : 'Assigned PHC Medical Officer In-Charge authentication.'}
            </p>
          </div>

          {loginMode === 'DEMO_ACCESS' ? (
            /* ==================================================
               MODE 1: DEMO ACCESS (No Officer ID / Password Required)
               ================================================== */
            <div id="demo-access-panel" className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-700 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                    DEMO ACCOUNT
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                    SYNTHETIC DATA
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-teal-800 font-bold">
                      Demo Medical Officer
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      Dr. Suresh Chandra Bishnoi
                    </div>
                    <div className="text-xs text-slate-700 font-medium">
                      PHC Osian · Jodhpur, Rajasthan
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-teal-200/80 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Name
                    </span>
                    <strong className="text-slate-900">Dr. Suresh Chandra Bishnoi</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Designation
                    </span>
                    <strong className="text-slate-900">Medical Officer In-Charge</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      PHC
                    </span>
                    <strong className="text-teal-900">PHC Osian</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      District &amp; State
                    </span>
                    <strong className="text-slate-900">Jodhpur, Rajasthan</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>For Demonstration &amp; Prototype Evaluation:</strong> No Officer ID or
                password is required. Continuing assigns the synthetic Demo Medical Officer session
                for <strong>PHC Osian</strong> and unlocks interactive features.
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
                  onClick={handleContinueAsDemo}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Starting Demo...' : 'CONTINUE AS DEMO'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('OFFICER_LOGIN');
                    setAuthError(null);
                  }}
                  className="text-[11px] font-semibold text-teal-800 hover:text-teal-950 underline cursor-pointer"
                >
                  Have an Officer ID &amp; Password? Switch to OFFICER LOGIN
                </button>
              </div>
            </div>
          ) : (
            /* ==================================================
               MODE 2: OFFICER LOGIN (Officer ID + Password)
               ================================================== */
            <div id="officer-login-panel" className="space-y-4">
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
                      autoFocus
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

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('DEMO_ACCESS');
                    setAuthError(null);
                  }}
                  className="text-[11px] font-semibold text-teal-800 hover:text-teal-950 underline cursor-pointer"
                >
                  No password? Switch to DEMO ACCESS
                </button>

                <button
                  type="button"
                  onClick={() => setShowDemoReference((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Officer ID Directory</span>
                  {showDemoReference ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>

              {showDemoReference && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-2">
                  <p className="leading-relaxed">
                    Select an assigned Officer ID below. Credentials are validated server-side only;
                    once authenticated, your session remains unlocked for protected actions.
                  </p>
                  <div className="space-y-1.5">
                    {DEMO_OFFICER_DIRECTORY_PREVIEW.map((item) => (
                      <button
                        key={item.officerId}
                        type="button"
                        onClick={() => {
                          setEnteredOfficerId(item.officerId);
                          setAuthError(null);
                        }}
                        className="w-full text-left font-mono text-[11px] text-slate-700 bg-white hover:bg-teal-50/60 p-2 rounded-lg border border-slate-200 hover:border-teal-300 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>
                          <strong className="text-teal-800">{item.officerId}</strong> →{' '}
                          {item.assignedPhcName}
                        </span>
                        <span className="text-[10px] font-sans text-slate-500">
                          {item.officerName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
