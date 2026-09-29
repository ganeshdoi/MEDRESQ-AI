import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Pill,
  Search,
  MapPin,
  CheckCircle2,
  Phone,
  ThermometerSnowflake,
  ShieldCheck,
  Download,
  Activity,
  Database,
  Globe,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { PHCFacility } from '../../types.ts';
import {
  INDIA_PHC_DIRECTORY,
  DATA_GOV_IN_PHC_STATS,
  RAJASTHAN_WHO_AND_DATAGOV_STATS,
  getWHOSaraAndDataGovDetails,
  PHC_GEO_COORDINATES
} from '../../data/indiaPHCDirectory.ts';
import {
  NATIONAL_ESSENTIAL_MEDICINES_LIST
} from '../../data/nationalEssentialMedicines.ts';
import { matchesSearchKeywords } from '../../utils/globalSearch.ts';

export const NationalPHCDirectory: React.FC = () => {
  const { selectedPHC, setSelectedPHC, setActiveModule, showNotification } = useApp();

  const [activeTab, setActiveTab] = useState<'rajasthan' | 'phc' | 'nlem'>('rajasthan');
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');

  // PHC Directory Filters
  const [phcSearch, setPhcSearch] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedRajasthanDistrict, setSelectedRajasthanDistrict] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // NLEM Filters
  const [nlemSearch, setNlemSearch] = useState<string>('');
  const [nlemCategory, setNlemCategory] = useState<string>('ALL');
  const [nlemColdChainOnly, setNlemColdChainOnly] = useState<boolean>(false);

  // Listen for global search navigation events targeting PHC & NLEM Directory
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.category === 'NLEM_CATALOGUE') {
        setActiveTab('nlem');
        if (detail.query) setNlemSearch(detail.query);
      } else if (detail?.query) {
        setActiveTab('phc');
        setPhcSearch(detail.query);
      }
    };
    window.addEventListener('medresq:global-search', handleGlobalSearch);
    return () => window.removeEventListener('medresq:global-search', handleGlobalSearch);
  }, []);

  // All Rajasthan PHCs
  const rajasthanPHCs = useMemo(() => {
    return INDIA_PHC_DIRECTORY.filter((p) => p.state === 'Rajasthan');
  }, []);

  // Unique Rajasthan Districts
  const rajasthanDistricts = useMemo(() => {
    const set = new Set(rajasthanPHCs.map((p) => p.district));
    return Array.from(set).sort();
  }, [rajasthanPHCs]);

  // Filtered PHC List
  const filteredPHCs = useMemo(() => {
    const sourceList = activeTab === 'rajasthan' ? rajasthanPHCs : INDIA_PHC_DIRECTORY;

    return sourceList.filter((phc) => {
      if (activeTab === 'phc' && selectedState !== 'ALL' && phc.state !== selectedState) return false;
      if (activeTab === 'rajasthan' && selectedRajasthanDistrict !== 'ALL' && phc.district !== selectedRajasthanDistrict) {
        return false;
      }
      if (selectedType !== 'ALL' && phc.type !== selectedType) return false;

      if (phcSearch.trim()) {
        const details = getWHOSaraAndDataGovDetails(phc);
        const matches = matchesSearchKeywords(
          phcSearch,
          phc.name,
          phc.code,
          details.ninHfrId,
          phc.district,
          phc.block,
          phc.state,
          phc.type,
          phc.medicalOfficerInCharge,
          details.agroClimaticZone,
          details.rmsclWarehouseNode,
          details.idspEndemicSyndromes.join(' ')
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [activeTab, rajasthanPHCs, selectedState, selectedRajasthanDistrict, selectedType, phcSearch]);

  // Unique States in PHC Directory
  const availableStates = useMemo(() => {
    const set = new Set(INDIA_PHC_DIRECTORY.map((p) => p.state));
    return Array.from(set).sort();
  }, []);

  // Filtered NLEM List
  const filteredNLEM = useMemo(() => {
    return NATIONAL_ESSENTIAL_MEDICINES_LIST.filter((med) => {
      if (nlemCategory !== 'ALL' && med.category !== nlemCategory) return false;
      if (nlemColdChainOnly && !med.isColdChainRequired) return false;

      if (nlemSearch.trim()) {
        const matches = matchesSearchKeywords(
          nlemSearch,
          med.name,
          med.code,
          med.category,
          med.therapeuticClass,
          med.strength,
          med.dosageForm
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [nlemCategory, nlemColdChainOnly, nlemSearch]);

  // Unique NLEM Categories
  const nlemCategories = useMemo(() => {
    const set = new Set(NATIONAL_ESSENTIAL_MEDICINES_LIST.map((m) => m.category));
    return Array.from(set);
  }, []);

  const handleSelectActivePHC = (phc: PHCFacility) => {
    setSelectedPHC(phc);
    showNotification(
      `Active Primary Health Centre set to ${phc.name} (${phc.code}). Inventory, cases, and WHO/data.gov.in benchmarks synced.`
    );
  };

  const handleExportRajasthanPhcCsv = () => {
    const disclaimer =
      '"MEDRESQ AI PROTOTYPE — SYNTHETIC DEMO PHC PROFILES (NOT AN OFFICIAL GOVERNMENT / NHM / DATA.GOV.IN RECORD)"\n';
    const headers =
      'PHC Name,Facility Code,Simulated NIN HFR ID (Demo),Block,District,State,Facility Tier,Sanctioned Beds,Occupied Beds,Sub-Centres (HWCs),Population Served,Medical Officer In-Charge (Simulated),Contact,Modeled Readiness Score (%),Modeled Essential Medicines Tracer (%),Simulated Cold Chain Status,Maternal BEmONC Status,Linked Warehouse Node,Agro-Climatic Zone,Modeled Endemic Syndromes,Latitude,Longitude\n';
    const rows = filteredPHCs
      .map((phc) => {
        const details = getWHOSaraAndDataGovDetails(phc);
        const coords = PHC_GEO_COORDINATES[phc.id] || { lat: 26.5, lng: 73.8 };
        return `"${phc.name}","${phc.code}","${details.ninHfrId}","${phc.block}","${phc.district}","${phc.state}","${phc.type}",${phc.sanctionedBeds},${phc.occupiedBeds},${phc.subCentresCovered},${phc.populationServed},"${phc.medicalOfficerInCharge}","${phc.contactNumber}",${details.whoSaraReadinessScore},${details.whoEssentialMedicinesTracerPct},"${details.ilrColdChainStatus}","${details.maternalBemoncStatus}","${details.rmsclWarehouseNode}","${details.agroClimaticZone}","${details.idspEndemicSyndromes.join('; ')}",${coords.lat},${coords.lng}`;
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + disclaimer + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rajasthan_PHC_Demo_Profiles_2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Sample Rajasthan PHC Profiles (Synthetic Demo Dataset) exported to CSV.');
  };

  const handleExportNlemCsv = () => {
    const disclaimer =
      '"MEDRESQ AI PROTOTYPE — NLEM ESSENTIAL MEDICINES REFERENCE CATALOGUE (DEMO EXPORT)"\n';
    const headers =
      'Code,Medicine Name,Category,Dosage Form,Strength,Unit,Therapeutic Class,Level,Cold Chain Required\n';
    const rows = NATIONAL_ESSENTIAL_MEDICINES_LIST.map(
      (m) =>
        `"${m.code}","${m.name}","${m.category}","${m.dosageForm}","${m.strength}","${m.unit}","${m.therapeuticClass}","${m.level}","${
          m.isColdChainRequired ? 'Yes (2-8°C)' : 'No'
        }"`
    ).join('\n');

    const blob = new Blob(['\uFEFF' + disclaimer + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NLEM_Essential_Medicines_Reference_Demo_2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('NLEM Primary Healthcare Essential Medicines reference catalogue exported (CSV).');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono">
              <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-amber-700" />
                <span>Synthetic / Demo PHC Profiles ({INDIA_PHC_DIRECTORY.length} Sample Facilities)</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-bold text-emerald-800 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-emerald-700" />
                <span>NLEM 2022 Essential Medicine Formulary Reference (51 Items)</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-sky-600" />
              <span>Sample PHC Profiles &amp; NLEM Essential Medicines Catalogue</span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Browse <strong>{rajasthanPHCs.length} sample Rajasthan PHCs</strong> and <strong>{INDIA_PHC_DIRECTORY.length} total demo PHC profiles</strong> alongside <strong>{NATIONAL_ESSENTIAL_MEDICINES_LIST.length} NLEM essential medicines</strong> with cold-chain and buffer parameters. (All facility IDs and readiness metrics are synthetic demo data).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('rajasthan')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'rajasthan'
                    ? 'bg-white text-sky-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Rajasthan PHCs ({rajasthanPHCs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('phc')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'phc'
                    ? 'bg-white text-sky-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>All-India PHCs ({INDIA_PHC_DIRECTORY.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('nlem')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'nlem'
                    ? 'bg-white text-sky-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Pill className="w-3.5 h-3.5 text-emerald-600" />
                <span>Essential Medicines ({NATIONAL_ESSENTIAL_MEDICINES_LIST.length})</span>
              </button>
            </div>

            {activeTab !== 'nlem' ? (
              <button
                type="button"
                onClick={handleExportRajasthanPhcCsv}
                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PHC CSV</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportNlemCsv}
                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Medicines CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Rajasthan WHO & data.gov.in Official Statistics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Rajasthan Total PHCs</span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {RAJASTHAN_WHO_AND_DATAGOV_STATS.totalRajasthanPhcs.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              Rural: {RAJASTHAN_WHO_AND_DATAGOV_STATS.ruralPhcs.toLocaleString()} · Urban: {RAJASTHAN_WHO_AND_DATAGOV_STATS.urbanPhcsJanArogya}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Rajasthan Sub-Centres</span>
            <div className="text-lg font-bold font-mono text-sky-700 mt-0.5">
              {RAJASTHAN_WHO_AND_DATAGOV_STATS.subCentresAndHwcs.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              CHCs: {RAJASTHAN_WHO_AND_DATAGOV_STATS.communityHealthCentres} · DDWs: {RAJASTHAN_WHO_AND_DATAGOV_STATS.rmsclDistrictDrugWarehouses}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">WHO SARA Readiness</span>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              {RAJASTHAN_WHO_AND_DATAGOV_STATS.whoSaraMeanReadinessScore}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              WHO 4-Domain PHC Score
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">MNDY Free Medicines</span>
            <div className="text-lg font-bold font-mono text-indigo-700 mt-0.5">
              {RAJASTHAN_WHO_AND_DATAGOV_STATS.mndyFreeMedicineSchemeItems} Drugs
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              e-Aushadhi RMSCL Supply
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">WHO PQS Cold Chain</span>
            <div className="text-lg font-bold font-mono text-blue-700 mt-0.5">
              {RAJASTHAN_WHO_AND_DATAGOV_STATS.whoColdChainPqsCompliancePct}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              eVIN ILR 2°C–8°C Monitored
            </div>
          </div>

          <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-200">
            <span className="text-[10px] uppercase font-bold text-sky-800 font-mono">Active PHC in Session</span>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {selectedPHC.name}
            </div>
            <div className="text-[10px] text-slate-600 font-mono truncate">
              {selectedPHC.code} · {selectedPHC.district}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TAB 1 & 2: RAJASTHAN & ALL-INDIA PHC REGISTRY */}
      {(activeTab === 'rajasthan' || activeTab === 'phc') && (
        <div className="space-y-3">
          {/* Controls Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search PHC name, RJ code, NIN HFR ID, district, block, Medical Officer, or climate zone..."
                value={phcSearch}
                onChange={(e) => setPhcSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'rajasthan' ? (
                <select
                  value={selectedRajasthanDistrict}
                  onChange={(e) => setSelectedRajasthanDistrict(e.target.value)}
                  className="p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white cursor-pointer"
                >
                  <option value="ALL">All Rajasthan Districts ({rajasthanDistricts.length})</option>
                  {rajasthanDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist} District
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white cursor-pointer"
                >
                  <option value="ALL">All States of India ({availableStates.length})</option>
                  {availableStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white cursor-pointer"
              >
                <option value="ALL">All Facility Tiers ({filteredPHCs.length})</option>
                <option value="24x7 PHC">24x7 PHCs (BEmONC)</option>
                <option value="PHC">Standard PHCs</option>
              </select>

              {/* Table vs Cards View Toggle */}
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setDisplayMode('table')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    displayMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Master Table View (WHO + data.gov.in)"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Master Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('cards')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    displayMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Detailed Cards View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* MASTER TABLE VIEW (WHO SARA + data.gov.in HFR) */}
          {displayMode === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-600" />
                  <span>
                    Showing {filteredPHCs.length} Sample Primary Health Centres · Synthetic / Demo Facility Profiles
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Click &quot;Select PHC&quot; to switch active facility inventory or &quot;Map&quot; to locate on Network Stock Map
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-mono text-[10px] uppercase">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">PHC Name &amp; Tier</th>
                      <th className="py-2.5 px-3">Demo Code &amp; Ref ID</th>
                      <th className="py-2.5 px-3">Block &amp; District</th>
                      <th className="py-2.5 px-3">Sub-Centres Covered</th>
                      <th className="py-2.5 px-3">Pop. Served (Demo)</th>
                      <th className="py-2.5 px-3">Medical Officer (Demo)</th>
                      <th className="py-2.5 px-3">Simulated Cold Chain &amp; Buffer</th>
                      <th className="py-2.5 px-3">Warehouse Hub &amp; Seasonal Demand</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPHCs.map((phc, idx) => {
                      const isCurrent = phc.id === selectedPHC.id;
                      const occupancy =
                        phc.sanctionedBeds > 0 ? Math.round((phc.occupiedBeds / phc.sanctionedBeds) * 100) : 0;
                      const whoDetails = getWHOSaraAndDataGovDetails(phc);
                      const coords = PHC_GEO_COORDINATES[phc.id];

                      return (
                        <tr
                          key={phc.id}
                          className={`transition-colors ${
                            isCurrent ? 'bg-sky-50/90 font-medium' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{phc.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {phc.type} · {phc.distanceKmFromDistrictHQ} km from HQ
                              {coords ? ` · ${coords.lat.toFixed(2)}°N, ${coords.lng.toFixed(2)}°E` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="font-bold text-slate-800">{phc.code}</div>
                            <div className="text-[10px] text-sky-700">{whoDetails.ninHfrId}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{phc.district}</div>
                            <div className="text-[11px] text-slate-500">
                              Block: {phc.block} · {phc.state}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="text-slate-900 font-bold">
                              {phc.occupiedBeds}/{phc.sanctionedBeds} Beds ({occupancy}%)
                            </div>
                            <div className="text-[10px] text-slate-500">{phc.subCentresCovered} Sub-Centres (HWCs)</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {phc.populationServed.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{phc.medicalOfficerInCharge}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{phc.contactNumber}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-emerald-700">
                              SARA: {whoDetails.whoSaraReadinessScore}% · NLEM: {whoDetails.whoEssentialMedicinesTracerPct}%
                            </div>
                            <div className="text-[10px] text-slate-600">{whoDetails.ilrColdChainStatus}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{whoDetails.rmsclWarehouseNode}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[210px]" title={whoDetails.idspEndemicSyndromes.join(', ')}>
                              {whoDetails.idspEndemicSyndromes.slice(0, 2).join(' · ')}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isCurrent ? (
                                <button
                                  type="button"
                                  onClick={() => handleSelectActivePHC(phc)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded-md font-bold text-[11px] cursor-pointer transition-colors"
                                >
                                  Select PHC
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-md font-bold text-[11px]">
                                  Active
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPHC(phc);
                                  setActiveModule('map');
                                }}
                                className="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>Map</span>
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

          {/* CARDS GRID VIEW */}
          {displayMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPHCs.map((phc) => {
                const isCurrent = phc.id === selectedPHC.id;
                const occupancy =
                  phc.sanctionedBeds > 0 ? Math.round((phc.occupiedBeds / phc.sanctionedBeds) * 100) : 0;
                const whoDetails = getWHOSaraAndDataGovDetails(phc);

                return (
                  <div
                    key={phc.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      isCurrent
                        ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                            <span className="font-bold text-slate-800">{phc.type}</span>
                            <span aria-hidden="true">·</span>
                            <span>{phc.code}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-sky-700 font-semibold">{whoDetails.ninHfrId}</span>
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">{phc.name}</h3>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Block: <strong>{phc.block}</strong> · {phc.district}, {phc.state}
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Operational & WHO SARA Stats */}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-500 text-[10px] block">Inpatient Beds</span>
                          <strong className="text-slate-900 font-bold">
                            {phc.occupiedBeds}/{phc.sanctionedBeds} ({occupancy}%)
                          </strong>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-500 text-[10px] block">WHO SARA Score</span>
                          <strong className="text-emerald-700 font-bold">{whoDetails.whoSaraReadinessScore}% Ready</strong>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-500 text-[10px] block">Population</span>
                          <strong className="text-slate-900 font-bold">{phc.populationServed.toLocaleString()}</strong>
                        </div>
                      </div>

                      {/* Administrative & WHO/data.gov.in Info */}
                      <div className="mt-2.5 space-y-1 text-[11px] text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>MOIC:</span>
                          <strong className="text-slate-800 truncate max-w-[190px]">{phc.medicalOfficerInCharge}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Sub-Centres &amp; Warehouse:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {phc.subCentresCovered} HWCs · {whoDetails.rmsclWarehouseNode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>WHO Cold Chain:</span>
                          <span className="font-mono text-slate-700">{whoDetails.ilrColdChainStatus}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>IDSP Endemic Focus:</span>
                          <span className="text-slate-700 truncate max-w-[195px]">
                            {whoDetails.idspEndemicSyndromes[0]}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      {!isCurrent ? (
                        <button
                          type="button"
                          onClick={() => handleSelectActivePHC(phc)}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer text-[11px]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Set as Active PHC</span>
                        </button>
                      ) : (
                        <span className="flex-1 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold flex items-center justify-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Active Session Facility</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPHC(phc);
                          setActiveModule('map');
                        }}
                        className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                        title="View on Interactive GIS Map"
                      >
                        <MapPin className="w-3 h-3 text-sky-700" />
                        <span>Map View</span>
                      </button>

                      <a
                        href={`tel:${phc.contactNumber}`}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title={`Call ${phc.contactNumber}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 3: NATIONAL ESSENTIAL MEDICINES LIST (NLEM 2022 / WHO Model List) */}
      {activeTab === 'nlem' && (
        <div className="space-y-3">
          {/* Controls Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search generic medicine name, strength, category, or therapeutic class..."
                value={nlemSearch}
                onChange={(e) => setNlemSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={nlemCategory}
                onChange={(e) => setNlemCategory(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white cursor-pointer"
              >
                <option value="ALL">All NLEM Therapeutic Categories ({nlemCategories.length})</option>
                {nlemCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setNlemColdChainOnly(!nlemColdChainOnly)}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  nlemColdChainOnly
                    ? 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-200 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-600" />
                <span>Cold Chain (2–8°C ILR) Only</span>
              </button>
            </div>
          </div>

          {/* Medicines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredNLEM.map((med) => (
              <div
                key={med.code}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                        <span className="font-bold text-sky-800">{med.code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-emerald-800">Primary Level ({med.level})</span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">{med.name}</h3>
                      <div className="text-[11px] text-slate-500 mt-0.5">{med.therapeuticClass}</div>
                    </div>

                    {med.isColdChainRequired && (
                      <span
                        className="p-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0"
                        title="Cold Chain 2-8°C Required"
                      >
                        <ThermometerSnowflake className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  {/* Standard Dosage & Stock Parameters */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-500 text-[10px]">Dosage Form:</span>
                      <strong className="text-slate-900 font-bold">
                        {med.dosageForm} ({med.strength})
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-500 text-[10px]">Standard PHC Buffer:</span>
                      <strong className="text-slate-900 font-bold">
                        {med.standardMinStock} – {med.standardMaxStock} {med.unit}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 text-[10px]">Est. Daily Consumption:</span>
                      <span className="font-bold text-sky-800">
                        ~{med.standardDailyBurn} {med.unit}/day
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[10px] font-mono text-slate-500 truncate">{med.defaultWarehouse}</span>

                  <button
                    type="button"
                    onClick={() => {
                      const keyword = med.name.split(' ')[0];
                      setActiveModule('medicine');
                      setTimeout(() => {
                        window.dispatchEvent(
                          new CustomEvent('medresq:global-search', {
                            detail: {
                              query: keyword,
                              category: 'NLEM_CATALOGUE'
                            }
                          })
                        );
                      }, 60);
                      showNotification(`Inspecting inventory tracking for ${med.name}`);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px] shrink-0"
                  >
                    <Pill className="w-3 h-3 text-emerald-400" />
                    <span>View Stock</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
