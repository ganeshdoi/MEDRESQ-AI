import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Lock,
  Building2,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Search,
  KeyRound,
  UserPlus,
  LogIn,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  X
} from 'lucide-react';
import { PHCFacility } from '../../types.ts';
import { INDIA_PHC_DIRECTORY } from '../../data/indiaPHCDirectory.ts';
import {
  getAllPHCInchargeAccounts,
  getPHCInchargeAccount,
  saveCustomPHCAccount,
  saveInchargeSession,
  verifyDemoPHCCredential,
  PHCInchargeAccount,
  AuthenticatedInchargeSession
} from '../../utils/phcAuthDirectory.ts';

interface PHCAuthPortalProps {
  facilities?: PHCFacility[];
  selectedPHC: PHCFacility;
  targetPHCToUnlock?: PHCFacility | null;
  isModalMode?: boolean;
  initialTab?: 'signin' | 'signup' | 'directory';
  onAuthenticated: (session: AuthenticatedInchargeSession, chosenPHC: PHCFacility) => void;
  onCloseModal?: () => void;
  onGoogleSignIn?: () => void;
  isAuthLoading?: boolean;
  activeSession?: AuthenticatedInchargeSession | null;
}

export const PHCAuthPortal: React.FC<PHCAuthPortalProps> = ({
  facilities = INDIA_PHC_DIRECTORY,
  selectedPHC: initialPHC,
  targetPHCToUnlock,
  isModalMode = false,
  initialTab = 'signin',
  onAuthenticated,
  onCloseModal,
  onGoogleSignIn,
  activeSession
}) => {
  const effectiveInitialPHC = targetPHCToUnlock || initialPHC;
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'directory'>(initialTab);
  const [selectedPHCId, setSelectedPHCId] = useState<string>(effectiveInitialPHC.id);
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sign-In Form State (never pre-filled with plaintext password)
  const [enteredEmailOrId, setEnteredEmailOrId] = useState<string>('');
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Sign-Up / Configure Demo Passcode Form State
  const [signupPHCId, setSignupPHCId] = useState<string>(effectiveInitialPHC.id);
  const [signupInchargeName, setSignupInchargeName] = useState<string>(
    effectiveInitialPHC.medicalOfficerInCharge
  );
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupContact, setSignupContact] = useState<string>(effectiveInitialPHC.contactNumber);
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>('');

  const [refreshTick, setRefreshTick] = useState<number>(0);

  useEffect(() => {
    setAuthTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (targetPHCToUnlock) {
      setSelectedPHCId(targetPHCToUnlock.id);
      setSignupPHCId(targetPHCToUnlock.id);
    }
  }, [targetPHCToUnlock]);

  const allAccounts = useMemo(() => {
    void refreshTick;
    return getAllPHCInchargeAccounts();
  }, [refreshTick]);

  const selectedPHC = useMemo(
    () => facilities.find((p) => p.id === selectedPHCId) || effectiveInitialPHC,
    [facilities, selectedPHCId, effectiveInitialPHC]
  );

  const selectedAccount = useMemo(() => {
    void refreshTick;
    return getPHCInchargeAccount(selectedPHC);
  }, [selectedPHC, refreshTick]);

  const signupPHC = useMemo(
    () => facilities.find((p) => p.id === signupPHCId) || effectiveInitialPHC,
    [facilities, signupPHCId, effectiveInitialPHC]
  );

  // Sync Sign-In email handle when selected PHC changes (never pre-fill plaintext password)
  useEffect(() => {
    const acc = getPHCInchargeAccount(selectedPHC);
    setEnteredEmailOrId(acc.inchargeEmail);
    setEnteredPassword('');
    setAuthError(null);
  }, [selectedPHC]);

  // Sync Sign-Up form fields when signupPHC changes (never pre-fill plaintext password)
  useEffect(() => {
    const acc = getPHCInchargeAccount(signupPHC);
    setSignupInchargeName(acc.inchargeName);
    setSignupEmail(acc.inchargeEmail);
    setSignupContact(acc.contactNumber);
    setSignupPassword('');
    setSignupConfirmPassword('');
  }, [signupPHC]);

  const availableStates = useMemo<string[]>(() => {
    const states = Array.from(new Set<string>(facilities.map((p: PHCFacility) => p.state))).sort();
    return ['ALL', ...states];
  }, [facilities]);

  const filteredDirectoryAccounts = useMemo(() => {
    return allAccounts.filter((acc) => {
      if (stateFilter !== 'ALL' && acc.state !== stateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${acc.phcName} ${acc.phcCode} ${acc.district} ${acc.block} ${acc.state} ${acc.inchargeName} ${acc.inchargeEmail}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allAccounts, stateFilter, searchQuery]);

  // Complete Simulated Demo Authentication
  const completeAuthentication = (targetPHC: PHCFacility, account: PHCInchargeAccount) => {
    const prevUnlocked = activeSession?.unlockedPhcIds || [];
    const nextUnlocked = Array.from(new Set([...prevUnlocked, targetPHC.id]));
    const newSession: AuthenticatedInchargeSession = {
      phcId: targetPHC.id,
      phcCode: targetPHC.code,
      phcName: targetPHC.name,
      district: targetPHC.district,
      state: targetPHC.state,
      inchargeName: account.inchargeName,
      inchargeEmail: account.inchargeEmail,
      designation: account.designation,
      role: account.role,
      maskedCredentialUsed: '••••••••••••',
      unlockedPhcIds: nextUnlocked,
      loginTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSimulatedDemoSession: true
    };
    saveInchargeSession(newSession);
    onAuthenticated(newSession, targetPHC);
  };

  // Handle Sign In Submit
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const cleanPassword = enteredPassword.trim();
    if (!cleanPassword) {
      setAuthError(
        'Please enter a non-sensitive mock demo passcode (minimum 4 characters, e.g. DEMO) or click "Enter Demo Session (Simulated)" to preview this PHC.'
      );
      return;
    }

    if (verifyDemoPHCCredential(selectedPHC, cleanPassword)) {
      completeAuthentication(selectedPHC, selectedAccount);
      return;
    }

    setAuthError(
      `Invalid demo passcode for ${selectedPHC.name}. Enter your configured demo passcode or use the "Enter Demo Session (Simulated)" button.`
    );
  };

  // Handle Sign Up / Update Demo Account Submit
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!signupInchargeName.trim()) {
      setAuthError('Please enter the PHC Incharge / Medical Officer name.');
      return;
    }
    if (!signupPassword.trim() || signupPassword.trim().length < 4) {
      setAuthError(
        'Please enter a mock demo passcode (at least 4 characters). Do not use real personal passwords.'
      );
      return;
    }
    if (signupPassword.trim() !== signupConfirmPassword.trim()) {
      setAuthError('Passcode and Confirm Passcode do not match.');
      return;
    }

    saveCustomPHCAccount(signupPHC.id, {
      inchargeName: signupInchargeName.trim(),
      inchargeEmail: signupEmail.trim(),
      contactNumber: signupContact.trim(),
      newDemoPasscode: signupPassword.trim()
    });

    setRefreshTick((t) => t + 1);
    setSelectedPHCId(signupPHC.id);
    const updatedAcc = getPHCInchargeAccount(signupPHC);
    setSignupPassword('');
    setSignupConfirmPassword('');
    setAuthSuccessMsg(
      `Demo account updated for ${signupPHC.name}. Mock passcode stored as a non-reversible digest (masked). Signing you in...`
    );

    setTimeout(() => {
      completeAuthentication(signupPHC, updatedAcc);
    }, 450);
  };

  const featuredPHCs = useMemo(() => {
    return facilities.slice(0, 6);
  }, [facilities]);

  const outerWrapperClass = isModalMode
    ? 'fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto'
    : 'min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-slate-900 flex flex-col justify-between p-3 sm:p-6 lg:p-8 selection:bg-teal-500 selection:text-white';

  return (
    <div className={outerWrapperClass} role={isModalMode ? 'dialog' : undefined} aria-modal={isModalMode || undefined}>
      <div className={isModalMode ? 'max-w-6xl w-full bg-slate-900 rounded-3xl border border-white/15 shadow-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto' : 'w-full flex-1 flex flex-col justify-between'}>
        {/* Top Bar Branding + Demo Notice */}
        <header className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25 border border-white/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-white">MEDRESQ AI</span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 font-semibold">
                  DEMO ONLY • SIMULATED AUTHENTICATION
                </span>
              </div>
              <p className="text-xs text-teal-100/80">
                Primary Health Centre Supply Intelligence &amp; Seasonal Surge Prototype (Non-Sensitive Mock Environment)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAuthTab('signin');
                setAuthError(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                authTab === 'signin'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Demo Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setAuthError(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                authTab === 'signup'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Configure Demo Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthTab('directory');
                setAuthError(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                authTab === 'directory'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-white/10 text-amber-200 hover:bg-white/15 border border-amber-400/30'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PHC Incharge Directory ({allAccounts.length})</span>
            </button>

            {isModalMode && onCloseModal && (
              <button
                type="button"
                onClick={onCloseModal}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl w-full mx-auto my-5 flex-1 flex flex-col justify-center">
          {/* Explicit Demo Authentication Banner */}
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong className="text-white">SIMULATED AUTHENTICATION — DEMO ONLY:</strong> This prototype uses non-sensitive mock facility profiles to demonstrate role and PHC switching. Credentials are masked (<code className="font-mono">••••••••••••</code>); never enter real personal or institutional passwords.
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-200 border border-amber-300/30 shrink-0 font-bold">
              Mock Session Only
            </span>
          </div>

          {(authTab === 'signin' || authTab === 'signup') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Quick Facility Selection & Overview */}
              <div className="lg:col-span-5 bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 sm:p-7 text-white flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                    <span>53 Sample PHCs • Synthetic Inventory &amp; Surge Demo</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                    Select a Primary Health Centre to Preview
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Each sample Primary Health Centre maintains an isolated demo inventory ledger, cold-chain log, and seasonal outbreak forecast. Choose a facility below or use the sign-in form.
                  </p>

                  {/* Quick-Select Featured PHCs */}
                  <div className="pt-2 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300 font-bold">
                        Quick-Select Sample PHC (Demo Mode):
                      </span>
                      <button
                        type="button"
                        onClick={() => setAuthTab('directory')}
                        className="text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                      >
                        Browse All 53 PHCs →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {featuredPHCs.map((phc) => {
                        const isSelected = phc.id === selectedPHC.id;
                        const acc = getPHCInchargeAccount(phc);
                        return (
                          <div
                            key={phc.id}
                            onClick={() => {
                              setSelectedPHCId(phc.id);
                              setSignupPHCId(phc.id);
                              setAuthError(null);
                            }}
                            className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                              isSelected
                                ? 'bg-teal-500/25 border-teal-400 shadow-md shadow-teal-500/10 ring-1 ring-teal-400'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs text-white truncate">
                                  {phc.name.replace('Primary Health Centre', 'PHC')}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-teal-200 shrink-0">
                                  {phc.district}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300 mt-1 truncate">
                                Incharge: <strong className="text-white">{acc.inchargeName}</strong>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/10">
                              <span className="text-[10px] font-mono text-slate-300">
                                Passcode: <strong className="text-amber-300">{acc.maskedCredential}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  completeAuthentication(phc, acc);
                                }}
                                className="px-2 py-0.5 rounded-md bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-[10px] transition-colors cursor-pointer shrink-0"
                              >
                                Demo Enter →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Security & Data Provenance Footer Box */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-teal-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Credential Privacy &amp; Demo Scope</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Passcodes are masked (<code className="text-slate-300">••••••••••••</code>) and verified using non-sensitive mock digests. All inventory, alert, and order workflows in this portal operate on synthetic demonstration data.
                  </p>
                </div>
              </div>

              {/* Right Column: Sign In / Sign Up Card */}
              <div className="lg:col-span-7 bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-8 flex flex-col justify-between text-slate-900">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-4 mb-5">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('signin');
                          setAuthError(null);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          authTab === 'signin'
                            ? 'bg-white text-teal-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LogIn className="w-3.5 h-3.5 text-teal-600" />
                        <span>PHC Demo Sign In</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('signup');
                          setAuthError(null);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          authTab === 'signup'
                            ? 'bg-white text-teal-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                        <span>Configure Demo Passcode</span>
                      </button>
                    </div>

                    <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                      DEMO ONLY • NON-SENSITIVE
                    </span>
                  </div>

                  {/* SIGN IN FORM */}
                  {authTab === 'signin' && (
                    <form onSubmit={handleSignInSubmit} className="space-y-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Sign In to Primary Health Centre (Simulated Demo)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Select a PHC below and enter a mock demo passcode (or click <strong>Enter Demo Session (Simulated)</strong>).
                        </p>
                      </div>

                      {/* Step 1: Select PHC Dropdown */}
                      <div className="space-y-1.5">
                        <label htmlFor="signin-phc-select" className="block text-xs font-bold text-slate-700">
                          1. Select Primary Health Centre (PHC)
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            id="signin-phc-select"
                            value={selectedPHC.id}
                            onChange={(e) => setSelectedPHCId(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                          >
                            {facilities.map((phc) => (
                              <option key={phc.id} value={phc.id}>
                                {phc.name} — {phc.district}, {phc.state} ({phc.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Active PHC Incharge Info Card (Masked Credential) */}
                      <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-teal-800 font-bold">
                            Assigned PHC Medical Officer In-Charge (Demo Profile)
                          </div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-teal-600" />
                            <span>{selectedAccount.inchargeName}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            {selectedPHC.code} • Block: {selectedPHC.block}, {selectedPHC.district}
                          </div>
                        </div>

                        <div className="bg-white px-3.5 py-2 rounded-xl border border-teal-200 shadow-2xs flex flex-col items-start sm:items-end">
                          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                            Credential Status:
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <code className="font-mono font-bold text-xs text-slate-700 tracking-wider">
                              {selectedAccount.maskedCredential}
                            </code>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              Masked
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Incharge Email or Officer ID */}
                      <div className="space-y-1.5">
                        <label htmlFor="signin-email-input" className="block text-xs font-bold text-slate-700">
                          2. PHC Incharge Demo Email / Facility Code
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="signin-email-input"
                            type="text"
                            value={enteredEmailOrId}
                            onChange={(e) => setEnteredEmailOrId(e.target.value)}
                            placeholder="moic@demo-phc.example.org"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      {/* Step 3: Masked Demo Passcode Input */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor="signin-password-input" className="block text-xs font-bold text-slate-700">
                            3. Demo Passcode (Masked Input — Non-Sensitive)
                          </label>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Mock passcode (e.g. DEMO)
                          </span>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="signin-password-input"
                            type="password"
                            autoComplete="off"
                            value={enteredPassword}
                            onChange={(e) => {
                              setEnteredPassword(e.target.value);
                              setAuthError(null);
                            }}
                            placeholder="Enter mock demo passcode..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      {authError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                          {authError}
                        </div>
                      )}

                      {authSuccessMsg && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{authSuccessMsg}</span>
                        </div>
                      )}

                      <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <button
                          type="submit"
                          className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Verify Mock Passcode &amp; Enter</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => completeAuthentication(selectedPHC, selectedAccount)}
                          className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Enter Demo Session (Simulated)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* SIGN UP / CONFIGURE DEMO ACCOUNT FORM */}
                  {authTab === 'signup' && (
                    <form onSubmit={handleSignUpSubmit} className="space-y-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Configure PHC Incharge Demo Profile (Simulated)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Assign a Medical Officer In-Charge name and a non-sensitive mock passcode for any PHC in this browser session.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="signup-phc-select" className="block text-xs font-bold text-slate-700">
                          Select Primary Health Centre (PHC)
                        </label>
                        <select
                          id="signup-phc-select"
                          value={signupPHC.id}
                          onChange={(e) => setSignupPHCId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        >
                          {facilities.map((phc) => (
                            <option key={phc.id} value={phc.id}>
                              {phc.name} — {phc.district}, {phc.state} ({phc.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="signup-name-input" className="block text-xs font-bold text-slate-700">
                            PHC Incharge Name (MOIC)
                          </label>
                          <input
                            id="signup-name-input"
                            type="text"
                            value={signupInchargeName}
                            onChange={(e) => setSignupInchargeName(e.target.value)}
                            placeholder="Dr. Full Name"
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="signup-phone-input" className="block text-xs font-bold text-slate-700">
                            Demo Contact Number
                          </label>
                          <input
                            id="signup-phone-input"
                            type="text"
                            value={signupContact}
                            onChange={(e) => setSignupContact(e.target.value)}
                            placeholder="+91-291-2642000"
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup-email-input" className="block text-xs font-bold text-slate-700">
                          Demo Email Handle
                        </label>
                        <input
                          id="signup-email-input"
                          type="email"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          placeholder="moic.phc@demo-phc.example.org"
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="signup-pass-input" className="block text-xs font-bold text-slate-700">
                            New Mock Demo Passcode
                          </label>
                          <input
                            id="signup-pass-input"
                            type="password"
                            autoComplete="new-password"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            placeholder="Min 4 chars (Demo Only)"
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="signup-confirm-input" className="block text-xs font-bold text-slate-700">
                            Confirm Mock Passcode
                          </label>
                          <input
                            id="signup-confirm-input"
                            type="password"
                            autoComplete="new-password"
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            placeholder="Re-enter mock passcode"
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      {authError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                          {authError}
                        </div>
                      )}

                      {authSuccessMsg && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{authSuccessMsg}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Save Masked Demo Profile &amp; Enter {signupPHC.name.split(' ')[0]} PHC</span>
                      </button>
                    </form>
                  )}
                </div>

                {/* Optional Google Sign-In & Help Strip */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      Want to browse all 53 sample PHC profiles?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthTab('directory')}
                        className="font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Open PHC Incharge Directory
                      </button>
                    </span>
                  </div>

                  {onGoogleSignIn && (
                    <button
                      type="button"
                      onClick={onGoogleSignIn}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      Optional Cloud Sync Sign-In
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHC INCHARGE DIRECTORY (MASKED CREDENTIALS ONLY — NO BULK REVEAL) */}
          {authTab === 'directory' && (
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-slate-900">
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                      DEMO ONLY • CREDENTIALS MASKED
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {filteredDirectoryAccounts.length} of {allAccounts.length} Sample PHCs
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mt-1 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-400" />
                    <span>PHC Incharge Directory (Simulated Demo Accounts)</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    All facility credentials are masked (<code className="font-mono">••••••••••••</code>). Select any PHC below to open a simulated demo session or configure its demo profile.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthTab('signin')}
                    className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    ← Back to Demo Sign In
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search PHC name, district, block, state, code, or Medical Officer In-Charge..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {availableStates.map((st) => (
                      <option key={st} value={st}>
                        {st === 'ALL' ? `All States (${allAccounts.length})` : st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table of Masked PHC Incharge Accounts */}
              <div className="overflow-x-auto max-h-[55vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-mono text-[10px] uppercase sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Primary Health Centre (PHC)</th>
                      <th className="py-3 px-4">District &amp; State</th>
                      <th className="py-3 px-4">PHC Incharge (MOIC)</th>
                      <th className="py-3 px-4">Demo Email &amp; Contact</th>
                      <th className="py-3 px-4">Credential Status (Masked)</th>
                      <th className="py-3 px-4 text-right">Demo Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDirectoryAccounts.map((acc, idx) => {
                      const phcObj = facilities.find((p) => p.id === acc.phcId) || effectiveInitialPHC;

                      return (
                        <tr key={acc.phcId} className="hover:bg-teal-50/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{acc.phcName}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Code: <strong className="text-slate-700">{acc.phcCode}</strong> • Block: {acc.block}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                              <span>{acc.district}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">{acc.state}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{acc.inchargeName}</div>
                            {acc.isCustomRegistered ? (
                              <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                Custom Demo Passcode Set
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 text-[10px] font-mono text-slate-500">
                                Simulated Incharge Profile
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            <div>{acc.inchargeEmail}</div>
                            <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{acc.contactNumber}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg">
                              <Lock className="w-3 h-3 text-slate-500" />
                              <code className="font-mono font-bold text-xs text-slate-700">
                                {acc.maskedCredential}
                              </code>
                              <span className="text-[10px] font-mono text-slate-500">Masked</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => completeAuthentication(phcObj, acc)}
                                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>Demo Sign In</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSignupPHCId(acc.phcId);
                                  setAuthTab('signup');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                              >
                                Configure
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Subtle Footer */}
        <footer className="max-w-7xl w-full mx-auto pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>
            MEDRESQ AI • Primary Health Centre Supply &amp; Outbreak Readiness Prototype (Simulated Demo Environment)
          </div>
          <div className="font-mono text-teal-300/80">
            53 Sample PHCs • Masked Demo Credentials • FEFO &amp; Cold-Chain Simulation
          </div>
        </footer>
      </div>
    </div>
  );
};
