import type { PHCFacility, MedicineItem, WeatherPreparedness } from '../types.ts';

export type EpidemicSeasonKey =
  | 'SUMMER_HEATWAVE'
  | 'MONSOON_VECTOR_FLOOD'
  | 'POST_MONSOON_SCRUB_TYPHUS'
  | 'WINTER_COLD_RESPIRATORY';

export type AgroClimaticZoneKey =
  | 'THAR_HYPER_ARID_DESERT'
  | 'SEMI_ARID_MARWAR_SHEKHAWATI'
  | 'ARAVALLI_TRIBAL_FOREST_HILLS'
  | 'CHAMBAL_HADOTI_RIVERINE_BASIN'
  | 'EASTERN_FLOOD_NCR_PLAINS'
  | 'CANAL_IRRIGATED_GHAGGAR_PLAINS'
  | 'GANGETIC_TERAI_PLAINS'
  | 'COASTAL_TROPICAL_BELT'
  | 'HIMALAYAN_MONTANE_HILLS'
  | 'DECCAN_CENTRAL_PLATEAU';

export interface RegionalSeasonScenarioPreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  temp: number;
  humidity: number;
  rainfallMm: number;
  aqi: number;
  footfall: number;
  leadTimeDays: number;
  description: string;
}

export interface RegionalTargetSupplyConfig {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  category: string;
  historicalBaseBurn: number;
  surgeMultiplier: number;
  criticalBufferMin: number;
  linkedRedistId: string | null;
  clinicalDriverNote: string;
}

export interface RegionalGeographySeasonProfile {
  zoneKey: AgroClimaticZoneKey;
  zoneName: string;
  zoneBadge: string;
  geographicalCharacteristics: string;
  topographyAndWaterNote: string;
  defaultLeadTimeDays: number;
  warehouseHubName: string;
  seasonKey: EpidemicSeasonKey;
  seasonLabel: string;
  seasonMonths: string;
  advisoryTitle: string;
  advisoryLevel: 'NORMAL' | 'YELLOW' | 'ORANGE' | 'RED';
  advisorySummary: string;
  baselineTempC: number;
  baselineHumidityPct: number;
  baselineFootfall: number;
  activeDefaultTempC: number;
  activeDefaultHumidityPct: number;
  activeDefaultRainfallMm: number;
  activeDefaultAqi: number;
  activeDefaultFootfall: number;
  primarySyndromicClusters: Array<{
    condition: string;
    projectedIncrease: string;
    rationale: string;
  }>;
  scenarios: RegionalSeasonScenarioPreset[];
  targetSupplies: RegionalTargetSupplyConfig[];
  thirtyDaySurgeCurve: number[];
  recommendedActions: Array<{
    action: string;
    priority: 'CRITICAL' | 'HIGH' | 'ROUTINE';
    category: string;
  }>;
}

const THAR_DESERT_DISTRICTS = ['Jodhpur', 'Phalodi', 'Jaisalmer', 'Barmer', 'Bikaner'];
const SEMI_ARID_SHEKHAWATI_MARWAR_DISTRICTS = ['Nagaur', 'Churu', 'Sikar', 'Jhunjhunu', 'Pali', 'Jalore'];
const ARAVALLI_TRIBAL_DISTRICTS = ['Udaipur', 'Dungarpur', 'Banswara', 'Pratapgarh', 'Sirohi', 'Rajsamand'];
const CHAMBAL_HADOTI_DISTRICTS = ['Kota', 'Bundi', 'Baran', 'Jhalawar', 'Sawai Madhopur', 'Karauli', 'Dholpur'];
const EASTERN_NCR_PLAINS_DISTRICTS = ['Jaipur', 'Alwar', 'Bharatpur', 'Dausa', 'Tonk', 'Ajmer', 'Bhilwara', 'Chittorgarh'];
const CANAL_GHAGGAR_DISTRICTS = ['Sri Ganganagar', 'Hanumangarh'];

export function resolveAgroClimaticZone(phc: PHCFacility): AgroClimaticZoneKey {
  const d = phc.district.trim();
  const s = phc.state.trim();

  if (s === 'Rajasthan') {
    if (THAR_DESERT_DISTRICTS.includes(d)) return 'THAR_HYPER_ARID_DESERT';
    if (SEMI_ARID_SHEKHAWATI_MARWAR_DISTRICTS.includes(d)) return 'SEMI_ARID_MARWAR_SHEKHAWATI';
    if (ARAVALLI_TRIBAL_DISTRICTS.includes(d)) return 'ARAVALLI_TRIBAL_FOREST_HILLS';
    if (CHAMBAL_HADOTI_DISTRICTS.includes(d)) return 'CHAMBAL_HADOTI_RIVERINE_BASIN';
    if (CANAL_GHAGGAR_DISTRICTS.includes(d)) return 'CANAL_IRRIGATED_GHAGGAR_PLAINS';
    if (EASTERN_NCR_PLAINS_DISTRICTS.includes(d)) return 'EASTERN_FLOOD_NCR_PLAINS';
    return 'SEMI_ARID_MARWAR_SHEKHAWATI';
  }

  if (['Himachal Pradesh', 'Uttarakhand'].includes(s) || d === 'Darjeeling' || d === 'Alluri Sitharama Raju') {
    return 'HIMALAYAN_MONTANE_HILLS';
  }
  if (['Kerala', 'Odisha', 'Tamil Nadu', 'West Bengal', 'Andhra Pradesh', 'Gujarat'].includes(s)) {
    return 'COASTAL_TROPICAL_BELT';
  }
  if (['Uttar Pradesh', 'Bihar', 'Punjab', 'Haryana', 'Assam'].includes(s)) {
    return 'GANGETIC_TERAI_PLAINS';
  }
  return 'DECCAN_CENTRAL_PLATEAU';
}

export function getDefaultSeasonForZone(zone: AgroClimaticZoneKey): EpidemicSeasonKey {
  switch (zone) {
    case 'THAR_HYPER_ARID_DESERT':
    case 'SEMI_ARID_MARWAR_SHEKHAWATI':
      return 'SUMMER_HEATWAVE';
    case 'ARAVALLI_TRIBAL_FOREST_HILLS':
      return 'POST_MONSOON_SCRUB_TYPHUS';
    case 'CHAMBAL_HADOTI_RIVERINE_BASIN':
    case 'COASTAL_TROPICAL_BELT':
    case 'GANGETIC_TERAI_PLAINS':
      return 'MONSOON_VECTOR_FLOOD';
    case 'CANAL_IRRIGATED_GHAGGAR_PLAINS':
    case 'HIMALAYAN_MONTANE_HILLS':
      return 'WINTER_COLD_RESPIRATORY';
    case 'EASTERN_FLOOD_NCR_PLAINS':
    case 'DECCAN_CENTRAL_PLATEAU':
    default:
      return 'MONSOON_VECTOR_FLOOD';
  }
}

export function getRegionalGeographySeasonProfile(
  phc: PHCFacility,
  seasonOverride?: EpidemicSeasonKey
): RegionalGeographySeasonProfile {
  const zoneKey = resolveAgroClimaticZone(phc);
  const seasonKey = seasonOverride || getDefaultSeasonForZone(zoneKey);
  const basePop = phc.populationServed || 38000;
  const baselineFootfall = Math.max(120, Math.round(basePop / 210));
  const distKm = phc.distanceKmFromDistrictHQ || 45;
  const defaultLeadTimeDays = Number(Math.min(5.5, Math.max(2.0, 2.0 + distKm / 42)).toFixed(1));
  const warehouseHubName =
    phc.state === 'Rajasthan'
      ? `RMSCL District Drug Warehouse ${phc.district}`
      : `NHM District Drug Store ${phc.district} (${phc.state})`;

  // Zone metadata
  const zoneMeta: Record<
    AgroClimaticZoneKey,
    {
      zoneName: string;
      zoneBadge: string;
      geographicalCharacteristics: string;
      topographyAndWaterNote: string;
    }
  > = {
    THAR_HYPER_ARID_DESERT: {
      zoneName: 'Western Hyper-Arid Thar Desert Belt (Marwar Frontier)',
      zoneBadge: 'Zone I-A/I-C • Arid Thar Desert',
      geographicalCharacteristics:
        'Aeolian sand dunes, extreme diurnal thermal swings (up to 48.5°C summer highs), convective dust storms (Andhi), and scattered Dhani settlements.',
      topographyAndWaterNote:
        'Acute surface water scarcity, deep saline aquifers, and high Saw-scaled Viper (Echis carinatus) & desert scorpion burrow activity.'
    },
    SEMI_ARID_MARWAR_SHEKHAWATI: {
      zoneName: 'Transitional Semi-Arid Shekhawati & Luni Basin',
      zoneBadge: 'Zone II-A/II-B • Semi-Arid Inland Steppe',
      geographicalCharacteristics:
        'Inland drainage basin with high fluoride/salinity groundwater, intense summer Loo winds, and severe winter radiation frost (Churu/Sikar cold pockets).',
      topographyAndWaterNote:
        'Both extreme summer heatwaves (46°C+) and sub-zero winter night inversions (2°C–4°C) triggering dual dehydration and COPD/bronchospasm peaks.'
    },
    ARAVALLI_TRIBAL_FOREST_HILLS: {
      zoneName: 'Southern Aravalli Hills & Vagad-Mewar Tribal Belt',
      zoneBadge: 'Zone IV-A/IV-B • Aravalli Forest & Tribal Sub-Plan',
      geographicalCharacteristics:
        'Undulating Aravalli hill ranges, dense deciduous scrub forest, Mahi/Som river valleys, and dispersed tribal hamlets (Udaipur, Dungarpur, Banswara, Pratapgarh, Sirohi).',
      topographyAndWaterNote:
        'Endemic vector breeding in forest streams, chigger mite (Orientia tsutsugamushi) scrub vegetation, high P. falciparum malaria, snakebite, and maternal anemia burden.'
    },
    CHAMBAL_HADOTI_RIVERINE_BASIN: {
      zoneName: 'South-Eastern Hadoti & Chambal Ravine Alluvial Basin',
      zoneBadge: 'Zone V • Humid Hadoti & Chambal Command',
      geographicalCharacteristics:
        'Perennial Chambal, Kali Sindh & Parbati river network, black cotton soil (Vertisols) with high moisture retention, canal command waterlogging, and deep ravines.',
      topographyAndWaterNote:
        'Rajasthan’s highest rainfall zone (800–1000mm); hyper-endemic for Dengue, Chikungunya, post-monsoon Scrub Typhus, and waterborne Acute Diarrhoeal Disease (ADD).'
    },
    EASTERN_FLOOD_NCR_PLAINS: {
      zoneName: 'Eastern Flood-Prone Plains & Semi-Arid Dhundhar-Brij Corridor',
      zoneBadge: 'Zone III-A/III-B • Eastern Alluvial Plains',
      geographicalCharacteristics:
        'Banas & Banganga alluvial plains, high population density, peri-urban highway corridors, and seasonal water stagnation in low-lying Bharatpur/Alwar depressions.',
      topographyAndWaterNote:
        'Prone to monsoon urban/rural waterlogging, acute viral fevers, dengue surges, and winter particulate smog respiratory exacerbations.'
    },
    CANAL_IRRIGATED_GHAGGAR_PLAINS: {
      zoneName: 'Northern Indira Gandhi Canal (IGNP) & Ghaggar Irrigated Plains',
      zoneBadge: 'Zone I-B • Irrigated North-Western Plain',
      geographicalCharacteristics:
        'Extensive IGNP canal network, intensive pesticide/agro-chemical farming, summer dust-heat anomalies, and dense winter canal fog.',
      topographyAndWaterNote:
        'High incidence of organophosphate agricultural poisoning (requiring Atropine/PAM), canal-side vector breeding, and winter acute respiratory infections.'
    },
    GANGETIC_TERAI_PLAINS: {
      zoneName: 'Indo-Gangetic & Terai Alluvial Plains',
      zoneBadge: 'NHM Gangetic-Terai Zone',
      geographicalCharacteristics:
        'High-water-table alluvial floodplains with dense agrarian settlements, humid monsoon heat index, and winter inversion fog.',
      topographyAndWaterNote:
        'Endemic for Acute Encephalitis / AFI, monsoon waterborne diarrhea, vector-borne dengue/malaria, and winter pneumonia.'
    },
    COASTAL_TROPICAL_BELT: {
      zoneName: 'Coastal & Tropical Humid Monsoon Belt',
      zoneBadge: 'NHM Coastal-Tropical Zone',
      geographicalCharacteristics:
        'High relative humidity (70–90%), cyclonic monsoon downpours, estuarine/backwater ecosystems, and warm tropical temperatures year-round.',
      topographyAndWaterNote:
        'High vulnerability to leptospirosis/cholera/ADD after coastal flooding, perennial dengue/malaria transmission, and humid heat-index exhaustion.'
    },
    HIMALAYAN_MONTANE_HILLS: {
      zoneName: 'Sub-Himalayan & Montane Hill Terrain',
      zoneBadge: 'NHM Hilly & High-Altitude Zone',
      geographicalCharacteristics:
        'Steep mountain gradients, landslide-prone monsoon road corridors, cold winter temperatures, and dispersed high-altitude sub-centres.',
      topographyAndWaterNote:
        'Extended warehouse transit lead times during monsoon/winter, high acute respiratory/COPD burden, and scrub typhus in terraced foothills.'
    },
    DECCAN_CENTRAL_PLATEAU: {
      zoneName: 'Central & Deccan Semi-Arid Plateau',
      zoneBadge: 'NHM Central Plateau Zone',
      geographicalCharacteristics:
        'Basaltic plateau terrain with hot dry summers, monsoon convective rainfall, and agrarian cotton/soybean belts.',
      topographyAndWaterNote:
        'Seasonal summer heat stress, monsoon vector-borne dengue/malaria waves, and agricultural snakebite envenomation.'
    }
  };

  const z = zoneMeta[zoneKey];

  // Season-specific calibration modulated by the geography (zoneKey)
  if (seasonKey === 'SUMMER_HEATWAVE') {
    const isExtremeDesert =
      zoneKey === 'THAR_HYPER_ARID_DESERT' || zoneKey === 'SEMI_ARID_MARWAR_SHEKHAWATI';
    const isCanalNorth = zoneKey === 'CANAL_IRRIGATED_GHAGGAR_PLAINS';
    const isHills = zoneKey === 'ARAVALLI_TRIBAL_FOREST_HILLS' || zoneKey === 'HIMALAYAN_MONTANE_HILLS';

    const baseTemp = isExtremeDesert ? 40.8 : isCanalNorth ? 40.2 : isHills ? 34.5 : 38.8;
    const activeTemp = isExtremeDesert ? 45.4 : isCanalNorth ? 44.6 : isHills ? 38.2 : 42.6;
    const activeHumidity = isExtremeDesert ? 15 : isHills ? 34 : 24;
    const activeAqi = isExtremeDesert ? 185 : 142;
    const surgeFootfall = Math.round(
      baselineFootfall * (isExtremeDesert ? 1.62 : isCanalNorth ? 1.48 : isHills ? 1.25 : 1.42)
    );

    return {
      zoneKey,
      ...z,
      defaultLeadTimeDays,
      warehouseHubName,
      seasonKey,
      seasonLabel: 'Summer Loo & Heatwave (Apr–Jun)',
      seasonMonths: 'April – June',
      advisoryTitle: isExtremeDesert
        ? `IMD Level-3 Severe Heatwave & Dust Storm (Andhi) Alert — ${phc.district} (${z.zoneBadge})`
        : isHills
        ? `Summer Dry Spell & Water-Scarcity Health Advisory — ${phc.district} Hill Belt`
        : `IMD Summer Heatwave & Dehydration Advisory — ${phc.district} Block`,
      advisoryLevel: isExtremeDesert ? 'RED' : isHills ? 'YELLOW' : 'ORANGE',
      advisorySummary: isExtremeDesert
        ? `Severe desert thermal anomaly (${activeTemp}°C, ${activeHumidity}% RH) across ${phc.block}, ${phc.district}. High insensible fluid loss and convective sandstorms drive a +68% surge in acute dehydration, heat exhaustion, and viper/scorpion envenomation.`
        : isHills
        ? `Elevated summer temperatures (${activeTemp}°C) and drying hill streams in ${phc.block}, ${phc.district} increase waterborne gastroenteritis (+38%) and outdoor agricultural heat fatigue.`
        : `High ambient heat (${activeTemp}°C) across ${phc.block}, ${phc.district} drives increased OPD presentations for acute dehydration (+52%), pediatric diarrhea, and heat hyperpyrexia.`,
      baselineTempC: baseTemp,
      baselineHumidityPct: isExtremeDesert ? 32 : 42,
      baselineFootfall,
      activeDefaultTempC: activeTemp,
      activeDefaultHumidityPct: activeHumidity,
      activeDefaultRainfallMm: 0,
      activeDefaultAqi: activeAqi,
      activeDefaultFootfall: surgeFootfall,
      primarySyndromicClusters: isExtremeDesert
        ? [
            {
              condition: 'Exertional Heatstroke & Severe Dehydration',
              projectedIncrease: '+68% surge',
              rationale: `Outdoor workers and rural Dhani residents in ${phc.district} exposed to ${activeTemp}°C dry Loo winds.`
            },
            {
              condition: 'Acute Gastroenteritis & Pediatric Diarrhea',
              projectedIncrease: '+48% surge',
              rationale: 'Summer water scarcity and high TDS/salinity in desert tankers accelerating electrolyte depletion.'
            },
            {
              condition: 'Dust-Storm (Andhi) Bronchospasm & Viper Bites',
              projectedIncrease: '+32% surge',
              rationale: `Suspended desert silica particulates (AQI ${activeAqi}) and nocturnal Echis carinatus snakebite exposure.`
            }
          ]
        : [
            {
              condition: 'Heat Exhaustion & Electrolyte Imbalance',
              projectedIncrease: '+45% surge',
              rationale: `Daytime thermal stress (${activeTemp}°C) in ${phc.district} agrarian blocks.`
            },
            {
              condition: 'Summer Waterborne Gastroenteritis (ADD)',
              projectedIncrease: '+42% surge',
              rationale: 'Depleting groundwater tables and microbial contamination of rural water sources.'
            },
            {
              condition: 'Pediatric Hyperpyrexia & Vomiting',
              projectedIncrease: '+28% surge',
              rationale: 'Increased pediatric OPD presentations requiring oral rehydration and antiemetics.'
            }
          ],
      scenarios: [
        {
          id: 'current-orange',
          name: isExtremeDesert
            ? `Active: ${phc.district} Severe Desert Heatwave`
            : `Active: ${phc.district} Summer Heat Advisory`,
          badge: isExtremeDesert ? 'ORANGE / RED ALERT' : 'ORANGE ALERT',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
          temp: activeTemp,
          humidity: activeHumidity,
          rainfallMm: 0,
          aqi: activeAqi,
          footfall: surgeFootfall,
          leadTimeDays: defaultLeadTimeDays,
          description: `Current ${phc.district} summer profile (${activeTemp}°C, ${activeHumidity}% RH): sharp rise in ORS, IV crystalloids, and antipyretic dispensing.`
        },
        {
          id: 'peak-red',
          name: `Extreme Thermal Peak (+2.5°C Anomaly)`,
          badge: 'RED ALERT',
          badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
          temp: Number((activeTemp + 2.4).toFixed(1)),
          humidity: Math.max(9, activeHumidity - 5),
          rainfallMm: 0,
          aqi: activeAqi + 35,
          footfall: Math.round(surgeFootfall * 1.22),
          leadTimeDays: Number((defaultLeadTimeDays + 0.5).toFixed(1)),
          description: `Catastrophic thermal spike (${(activeTemp + 2.4).toFixed(1)}°C) with severe dust storms and peak casualty admissions for IV fluid resuscitation.`
        },
        {
          id: 'baseline-relief',
          name: `Pre-Monsoon Cloud Moderation (Baseline)`,
          badge: 'NORMAL BASELINE',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          temp: baseTemp,
          humidity: 40,
          rainfallMm: 4,
          aqi: 95,
          footfall: baselineFootfall,
          leadTimeDays: Math.max(2.0, Number((defaultLeadTimeDays - 0.5).toFixed(1))),
          description: `Temperatures moderate to ${baseTemp}°C with scattered pre-monsoon showers; OPD returns to baseline volume.`
        }
      ],
      targetSupplies: [
        {
          id: `med-nlem-fl-01-${phc.id}`,
          name: 'Oral Rehydration Salts (ORS) Sachets IP 20.5g',
          shortName: 'ORS Sachets',
          unit: 'Sachets',
          category: 'Essential ORS/Fluids',
          historicalBaseBurn: isExtremeDesert ? 52 : 40,
          surgeMultiplier: isExtremeDesert ? 2.45 : 1.95,
          criticalBufferMin: 500,
          linkedRedistId: 'REDIST-2026-01',
          clinicalDriverNote: 'First-line WHO oral electrolyte replacement for heat dehydration & summer ADD'
        },
        {
          id: `med-nlem-fl-02-${phc.id}`,
          name: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
          shortName: 'Normal Saline (0.9%)',
          unit: 'Bottles',
          category: 'Essential ORS/Fluids',
          historicalBaseBurn: isExtremeDesert ? 14 : 10,
          surgeMultiplier: isExtremeDesert ? 2.85 : 2.15,
          criticalBufferMin: 100,
          linkedRedistId: 'REDIST-2026-02',
          clinicalDriverNote: 'Rapid IV isotonic resuscitation for heat exhaustion, syncope & hypotension'
        },
        {
          id: `med-nlem-fl-03-${phc.id}`,
          name: 'Ringer Lactate (RL) IV Infusion 500ml',
          shortName: 'Ringer Lactate (RL)',
          unit: 'Bottles',
          category: 'Essential ORS/Fluids',
          historicalBaseBurn: isExtremeDesert ? 10 : 8,
          surgeMultiplier: isExtremeDesert ? 2.65 : 2.0,
          criticalBufferMin: 80,
          linkedRedistId: null,
          clinicalDriverNote: 'Balanced crystalloid for severe hypovolemic dehydration & gastroenteritis'
        },
        {
          id: `med-nlem-mch-05-${phc.id}`,
          name: 'Zinc Sulfate Dispersible Tablets IP 20mg',
          shortName: 'Zinc Sulfate 20mg',
          unit: 'Tablets',
          category: 'Maternal & Child',
          historicalBaseBurn: 35,
          surgeMultiplier: isExtremeDesert ? 1.85 : 1.65,
          criticalBufferMin: 400,
          linkedRedistId: null,
          clinicalDriverNote: 'Pediatric summer diarrhea co-therapy (14-day WHO regimen with ORS)'
        },
        {
          id: `med-nlem-gi-02-${phc.id}`,
          name: 'Ondansetron Tablets IP 4mg',
          shortName: 'Ondansetron 4mg',
          unit: 'Tablets',
          category: 'Essential ORS/Fluids',
          historicalBaseBurn: 22,
          surgeMultiplier: 1.9,
          criticalBufferMin: 300,
          linkedRedistId: null,
          clinicalDriverNote: 'Antiemetic to halt heat-induced vomiting and enable oral rehydration'
        },
        ...(isExtremeDesert
          ? [
              {
                id: `med-nlem-ant-01-${phc.id}`,
                name: 'Polyvalent Anti-Snake Venom (ASV) Lyophilized / Liquid 10ml',
                shortName: 'Anti-Snake Venom (ASV)',
                unit: 'Vials',
                category: 'Vaccines & Antidotes',
                historicalBaseBurn: 3,
                surgeMultiplier: 2.1,
                criticalBufferMin: 20,
                linkedRedistId: null,
                clinicalDriverNote: 'Nocturnal Thar desert Saw-scaled Viper (Echis carinatus) envenomation surge'
              }
            ]
          : [
              {
                id: `med-nlem-ana-01-${phc.id}`,
                name: 'Paracetamol Tablets IP 500mg',
                shortName: 'Paracetamol 500mg',
                unit: 'Tablets',
                category: 'Analgesics',
                historicalBaseBurn: 160,
                surgeMultiplier: 1.45,
                criticalBufferMin: 2000,
                linkedRedistId: null,
                clinicalDriverNote: 'Management of heat hyperpyrexia and summer viral febrile presentations'
              }
            ])
      ],
      thirtyDaySurgeCurve: [
        1.0, 1.1, 1.22, 1.36, 1.52, 1.72, 1.9, 2.04, 2.15, 2.18,
        2.14, 2.06, 1.96, 1.88, 1.8, 1.72, 1.65, 1.58, 1.52, 1.46,
        1.4, 1.35, 1.3, 1.26, 1.22, 1.18, 1.15, 1.12, 1.1, 1.08
      ],
      recommendedActions: [
        {
          action: `Maintain minimum 1,500 ORS sachets & 250 IV crystalloid bottles (NS/RL) at ${phc.name}`,
          priority: 'CRITICAL',
          category: 'Pharmacy / Drug Store'
        },
        {
          action: 'Operate dedicated Cool Ward / Oral Rehydration Corner with ice-packs & desert coolers',
          priority: 'CRITICAL',
          category: 'Casualty & OPD Triage'
        },
        {
          action: 'Verify ILR (+2°C to +8°C) solar/inverter backup for heat-labile Oxytocin & ASV vials',
          priority: 'HIGH',
          category: 'Cold Chain Logistics'
        },
        {
          action: `Alert ${phc.subCentresCovered} Sub-Centre ANMs/ASHAs for midday outdoor labor heatstroke surveillance`,
          priority: 'HIGH',
          category: 'Community Extension'
        }
      ]
    };
  }

  if (seasonKey === 'MONSOON_VECTOR_FLOOD') {
    const isRiverineOrHumid =
      zoneKey === 'CHAMBAL_HADOTI_RIVERINE_BASIN' ||
      zoneKey === 'COASTAL_TROPICAL_BELT' ||
      zoneKey === 'GANGETIC_TERAI_PLAINS';
    const isTribalForest = zoneKey === 'ARAVALLI_TRIBAL_FOREST_HILLS';
    const isDesertFlash = zoneKey === 'THAR_HYPER_ARID_DESERT' || zoneKey === 'SEMI_ARID_MARWAR_SHEKHAWATI';

    const baseTemp = isRiverineOrHumid ? 30.5 : isDesertFlash ? 34.0 : 31.5;
    const activeTemp = isRiverineOrHumid ? 31.8 : isDesertFlash ? 35.2 : 32.4;
    const activeHumidity = isRiverineOrHumid ? 86 : isTribalForest ? 82 : isDesertFlash ? 68 : 78;
    const activeRainfall = isRiverineOrHumid ? 145 : isTribalForest ? 120 : isDesertFlash ? 55 : 95;
    const surgeFootfall = Math.round(
      baselineFootfall * (isRiverineOrHumid ? 1.68 : isTribalForest ? 1.58 : 1.45)
    );

    return {
      zoneKey,
      ...z,
      defaultLeadTimeDays: Number((defaultLeadTimeDays + (isTribalForest || isRiverineOrHumid ? 1.0 : 0.5)).toFixed(1)),
      warehouseHubName,
      seasonKey,
      seasonLabel: 'Monsoon Vector & Waterborne Surge (Jul–Sep)',
      seasonMonths: 'July – September',
      advisoryTitle: isRiverineOrHumid
        ? `IDSP Monsoon Dengue, Malaria & Flood Waterlogging Alert — ${phc.district} Basin`
        : isTribalForest
        ? `IDSP Monsoon Vector-Borne & Forest Stream Contamination Alert — ${phc.district} Tribal Belt`
        : `Monsoon Acute Diarrhoeal Disease (ADD), Snakebite & Vector Surge — ${phc.district}`,
      advisoryLevel: isRiverineOrHumid || isTribalForest ? 'RED' : 'ORANGE',
      advisorySummary: isRiverineOrHumid
        ? `Heavy monsoon spell (${activeRainfall}mm rainfall, ${activeHumidity}% RH) across ${phc.block}, ${phc.district} has caused riverine/canal waterlogging. High Aedes & Anopheles breeding and water contamination project a +75% surge in Dengue/AFI, Cholera/ADD, and snakebite admissions.`
        : isTribalForest
        ? `Sustained hill monsoon (${activeRainfall}mm, ${activeHumidity}% RH) in ${phc.block}, ${phc.district} triggers P. falciparum malaria transmission, contaminated handpump dysentery, and flooded-burrow viper/krait snakebites.`
        : `Unseasonal monsoon downpours (${activeRainfall}mm, ${activeHumidity}% RH) over impermeable gypsum/hardpan layers in ${phc.block}, ${phc.district} drive stagnant vector pools, acute gastroenteritis, and rodent/snake displacement into rural homes.`,
      baselineTempC: baseTemp,
      baselineHumidityPct: 55,
      baselineFootfall,
      activeDefaultTempC: activeTemp,
      activeDefaultHumidityPct: activeHumidity,
      activeDefaultRainfallMm: activeRainfall,
      activeDefaultAqi: 72,
      activeDefaultFootfall: surgeFootfall,
      primarySyndromicClusters: [
        {
          condition: 'Acute Febrile Illness (Dengue / Malaria Vector Surge)',
          projectedIncrease: isRiverineOrHumid ? '+78% surge' : '+58% surge',
          rationale: `High relative humidity (${activeHumidity}%) and stagnant rainwater pools in ${phc.district} accelerating mosquito vector density.`
        },
        {
          condition: 'Waterborne Acute Diarrhoeal Disease (ADD) & Dysentery',
          projectedIncrease: '+62% surge',
          rationale: 'Monsoon runoff contaminating rural wells, handpumps, and distribution pipelines.'
        },
        {
          condition: 'Monsoon Burrow-Flooding Snakebite Envenomation',
          projectedIncrease: '+85% surge',
          rationale: 'Inundation of agricultural fields and rodent burrows driving Russell’s Viper, Krait, and Cobra encounters.'
        }
      ],
      scenarios: [
        {
          id: 'current-orange',
          name: `Active: ${phc.district} Monsoon Vector & Waterborne Wave`,
          badge: 'MONSOON ORANGE ALERT',
          badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
          temp: activeTemp,
          humidity: activeHumidity,
          rainfallMm: activeRainfall,
          aqi: 72,
          footfall: surgeFootfall,
          leadTimeDays: Number((defaultLeadTimeDays + 0.5).toFixed(1)),
          description: `Active monsoon conditions (${activeRainfall}mm rain, ${activeHumidity}% RH): high demand for Paracetamol, ORS, Metronidazole, Ciprofloxacin, and ASV.`
        },
        {
          id: 'peak-red',
          name: `Escalated: Heavy Flood & Outbreak Cluster`,
          badge: 'FLOOD RED ALERT',
          badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
          temp: Number((activeTemp - 1.5).toFixed(1)),
          humidity: Math.min(96, activeHumidity + 8),
          rainfallMm: activeRainfall + 95,
          aqi: 55,
          footfall: Math.round(surgeFootfall * 1.25),
          leadTimeDays: Number((defaultLeadTimeDays + 2.0).toFixed(1)),
          description: `Severe waterlogging and rural culvert submergence delay warehouse trucks (+2d lead time) while AFI, ADD, and snakebite cases peak.`
        },
        {
          id: 'baseline-relief',
          name: `Dry Inter-Spell (Monsoon Break Baseline)`,
          badge: 'MODERATE MONSOON',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          temp: baseTemp,
          humidity: 62,
          rainfallMm: 12,
          aqi: 80,
          footfall: baselineFootfall,
          leadTimeDays: defaultLeadTimeDays,
          description: `Rainfall subsides; road connectivity and vector control operations stabilize daily OPD footfall.`
        }
      ],
      targetSupplies: [
        {
          id: `med-nlem-ana-01-${phc.id}`,
          name: 'Paracetamol Tablets IP 500mg',
          shortName: 'Paracetamol 500mg',
          unit: 'Tablets',
          category: 'Analgesics',
          historicalBaseBurn: 175,
          surgeMultiplier: 2.35,
          criticalBufferMin: 2000,
          linkedRedistId: null,
          clinicalDriverNote: 'Safe antipyretic for Dengue/Malaria AFI (NSAIDs contraindicated due to thrombocytopenia risk)'
        },
        {
          id: `med-nlem-fl-01-${phc.id}`,
          name: 'Oral Rehydration Salts (ORS) Sachets IP 20.5g',
          shortName: 'ORS Sachets',
          unit: 'Sachets',
          category: 'Essential ORS/Fluids',
          historicalBaseBurn: 48,
          surgeMultiplier: 2.25,
          criticalBufferMin: 500,
          linkedRedistId: 'REDIST-2026-01',
          clinicalDriverNote: 'Waterborne monsoon diarrhea (ADD) and dengue oral fluid therapy'
        },
        {
          id: `med-nlem-ant-01-${phc.id}`,
          name: 'Polyvalent Anti-Snake Venom (ASV) Lyophilized / Liquid 10ml',
          shortName: 'Anti-Snake Venom (ASV)',
          unit: 'Vials',
          category: 'Vaccines & Antidotes',
          historicalBaseBurn: 4,
          surgeMultiplier: 2.8,
          criticalBufferMin: 20,
          linkedRedistId: null,
          clinicalDriverNote: 'Peak agricultural & burrow-flooding snakebite envenomation antidote (10 vials/patient initial dose)'
        },
        {
          id: `med-nlem-abx-08-${phc.id}`,
          name: 'Metronidazole Tablets IP 400mg',
          shortName: 'Metronidazole 400mg',
          unit: 'Tablets',
          category: 'Antibiotics',
          historicalBaseBurn: 45,
          surgeMultiplier: 2.15,
          criticalBufferMin: 600,
          linkedRedistId: null,
          clinicalDriverNote: 'Waterborne amoebic dysentery & giardiasis from monsoon well contamination'
        },
        {
          id: `med-nlem-abx-03-${phc.id}`,
          name: 'Ciprofloxacin Tablets IP 500mg',
          shortName: 'Ciprofloxacin 500mg',
          unit: 'Tablets',
          category: 'Antibiotics',
          historicalBaseBurn: 42,
          surgeMultiplier: 2.0,
          criticalBufferMin: 500,
          linkedRedistId: null,
          clinicalDriverNote: 'Empirical therapy for acute bacterial gastroenteritis & enteric fever'
        },
        {
          id: `med-nlem-fl-03-${phc.id}`,
          name: 'Ringer Lactate (RL) IV Infusion 500ml',
          shortName: 'Ringer Lactate (RL)',
          unit: 'Bottles',
          category: 'Essential ORS/Fluids',
          historicalBaseBurn: 10,
          surgeMultiplier: 2.5,
          criticalBufferMin: 80,
          linkedRedistId: 'REDIST-2026-02',
          clinicalDriverNote: 'Dengue capillary leak resuscitation & severe cholera/ADD dehydration'
        }
      ],
      thirtyDaySurgeCurve: [
        1.0, 1.12, 1.25, 1.4, 1.58, 1.75, 1.92, 2.08, 2.2, 2.25,
        2.22, 2.16, 2.08, 1.98, 1.9, 1.82, 1.75, 1.68, 1.6, 1.54,
        1.48, 1.42, 1.36, 1.32, 1.28, 1.24, 1.2, 1.16, 1.14, 1.1
      ],
      recommendedActions: [
        {
          action: `Pre-position monsoon buffer of Paracetamol, ORS, RL & minimum 30 vials of Polyvalent ASV at ${phc.name}`,
          priority: 'CRITICAL',
          category: 'Pharmacy / Drug Store'
        },
        {
          action: 'Enforce strict NSAID (Ibuprofen/Diclofenac) avoidance protocol in suspected Dengue fever triage',
          priority: 'CRITICAL',
          category: 'Clinical OPD Protocol'
        },
        {
          action: 'Distribute Chlorine / Halogen water purification tablets & ORS packets via Sub-Centre ANMs',
          priority: 'HIGH',
          category: 'Water & Sanitation (WASH)'
        },
        {
          action: 'Audit 24x7 emergency snakebite resuscitation kit (ASV, Adrenaline, Hydrocortisone, Ambu bag)',
          priority: 'CRITICAL',
          category: 'Emergency Casualty'
        }
      ]
    };
  }

  if (seasonKey === 'POST_MONSOON_SCRUB_TYPHUS') {
    const isScrubEndemic =
      zoneKey === 'ARAVALLI_TRIBAL_FOREST_HILLS' ||
      zoneKey === 'CHAMBAL_HADOTI_RIVERINE_BASIN' ||
      zoneKey === 'EASTERN_FLOOD_NCR_PLAINS' ||
      zoneKey === 'HIMALAYAN_MONTANE_HILLS';

    const baseTemp = 28.5;
    const activeTemp = isScrubEndemic ? 30.2 : 33.4;
    const activeHumidity = isScrubEndemic ? 68 : 48;
    const surgeFootfall = Math.round(
      baselineFootfall * (isScrubEndemic ? 1.65 : 1.42)
    );

    return {
      zoneKey,
      ...z,
      defaultLeadTimeDays,
      warehouseHubName,
      seasonKey,
      seasonLabel: 'Post-Monsoon Scrub Typhus, Dengue & Harvest Envenomation (Oct–Nov)',
      seasonMonths: 'October – November',
      advisoryTitle: isScrubEndemic
        ? `IDSP Post-Monsoon Scrub Typhus, Dengue & Malaria Alert — ${phc.district} (${z.zoneBadge})`
        : `Post-Monsoon Kharif Harvest Envenomation & Viral AFI Wave — ${phc.district}`,
      advisoryLevel: isScrubEndemic ? 'RED' : 'ORANGE',
      advisorySummary: isScrubEndemic
        ? `Post-monsoon dense scrub vegetation and chigger mite (Leptotrombidium) proliferation across ${phc.block}, ${phc.district} trigger an acute surge in Scrub Typhus (requiring immediate Doxycycline/Azithromycin), late-season Dengue/Malaria, and Kharif harvest snakebites.`
        : `Post-monsoon Kharif harvesting and diurnal temperature shifts across ${phc.block}, ${phc.district} drive a spike in agricultural snakebite/scorpion envenomation, post-monsoon vector fevers, and acute febrile illness.`,
      baselineTempC: baseTemp,
      baselineHumidityPct: 50,
      baselineFootfall,
      activeDefaultTempC: activeTemp,
      activeDefaultHumidityPct: activeHumidity,
      activeDefaultRainfallMm: 18,
      activeDefaultAqi: 135,
      activeDefaultFootfall: surgeFootfall,
      primarySyndromicClusters: [
        {
          condition: 'Scrub Typhus & Rickettsial Acute Febrile Illness',
          projectedIncrease: isScrubEndemic ? '+95% surge' : '+45% surge',
          rationale: `Post-monsoon scrub grass & agricultural harvesting in ${phc.district} exposing rural workers to chigger mites.`
        },
        {
          condition: 'Late-Monsoon Dengue & P. falciparum Malaria',
          projectedIncrease: '+60% surge',
          rationale: 'Receding post-monsoon water pools and artificial storage containers sustaining vector breeding.'
        },
        {
          condition: 'Kharif Harvest Snakebite & Agro-Chemical Exposure',
          projectedIncrease: '+55% surge',
          rationale: 'Manual crop harvesting in fields increasing Viper/Cobra bites and insecticide exposure.'
        }
      ],
      scenarios: [
        {
          id: 'current-orange',
          name: `Active: ${phc.district} Post-Monsoon Scrub Typhus & AFI Wave`,
          badge: 'IDSP EPIDEMIC ALERT',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
          temp: activeTemp,
          humidity: activeHumidity,
          rainfallMm: 18,
          aqi: 135,
          footfall: surgeFootfall,
          leadTimeDays: defaultLeadTimeDays,
          description: `Post-monsoon chigger mite & vector peak in ${phc.district}: critical demand surge for Doxycycline 100mg, Azithromycin 500mg, Paracetamol, Ceftriaxone, and ASV.`
        },
        {
          id: 'peak-red',
          name: `Escalated: Multi-Block Scrub Typhus & Dengue Outbreak`,
          badge: 'OUTBREAK RED ALERT',
          badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
          temp: Number((activeTemp + 1.2).toFixed(1)),
          humidity: activeHumidity + 10,
          rainfallMm: 35,
          aqi: 150,
          footfall: Math.round(surgeFootfall * 1.24),
          leadTimeDays: Number((defaultLeadTimeDays + 1.0).toFixed(1)),
          description: `Simultaneous Scrub Typhus and Dengue hemorrhagic cluster requiring 2.8x Doxycycline/Azithromycin and IV Ceftriaxone/RL buffers.`
        },
        {
          id: 'baseline-relief',
          name: `Late-November Cooling Stabilization`,
          badge: 'MODERATE BASELINE',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          temp: 25.5,
          humidity: 42,
          rainfallMm: 0,
          aqi: 115,
          footfall: baselineFootfall,
          leadTimeDays: defaultLeadTimeDays,
          description: `Night temperatures cool below vector transmission thresholds; AFI footfall returns toward baseline.`
        }
      ],
      targetSupplies: [
        {
          id: `med-nlem-abx-07-${phc.id}`,
          name: 'Doxycycline Capsules IP 100mg',
          shortName: 'Doxycycline 100mg',
          unit: 'Capsules',
          category: 'Antibiotics',
          historicalBaseBurn: 25,
          surgeMultiplier: isScrubEndemic ? 3.1 : 2.2,
          criticalBufferMin: 400,
          linkedRedistId: null,
          clinicalDriverNote: 'First-line life-saving therapy (100mg BD × 7d) for post-monsoon Scrub Typhus'
        },
        {
          id: `med-nlem-abx-04-${phc.id}`,
          name: 'Azithromycin Tablets IP 500mg',
          shortName: 'Azithromycin 500mg',
          unit: 'Tablets',
          category: 'Antibiotics',
          historicalBaseBurn: 30,
          surgeMultiplier: isScrubEndemic ? 2.5 : 1.9,
          criticalBufferMin: 300,
          linkedRedistId: null,
          clinicalDriverNote: 'Drug of choice for Scrub Typhus in pregnancy & pediatric patients + enteric fever'
        },
        {
          id: `med-nlem-ana-01-${phc.id}`,
          name: 'Paracetamol Tablets IP 500mg',
          shortName: 'Paracetamol 500mg',
          unit: 'Tablets',
          category: 'Analgesics',
          historicalBaseBurn: 170,
          surgeMultiplier: 2.2,
          criticalBufferMin: 2000,
          linkedRedistId: null,
          clinicalDriverNote: 'High-volume antipyretic for post-monsoon AFI, Dengue & Scrub Typhus fever spikes'
        },
        {
          id: `med-nlem-abx-05-${phc.id}`,
          name: 'Ceftriaxone Injection IP 1g Vial',
          shortName: 'Ceftriaxone 1g Vial',
          unit: 'Vials',
          category: 'Antibiotics',
          historicalBaseBurn: 14,
          surgeMultiplier: 2.35,
          criticalBufferMin: 100,
          linkedRedistId: null,
          clinicalDriverNote: 'Parenteral antibiotic for complicated typhoid, severe AFI & inpatient sepsis'
        },
        {
          id: `med-nlem-ant-01-${phc.id}`,
          name: 'Polyvalent Anti-Snake Venom (ASV) Lyophilized / Liquid 10ml',
          shortName: 'Anti-Snake Venom (ASV)',
          unit: 'Vials',
          category: 'Vaccines & Antidotes',
          historicalBaseBurn: 4,
          surgeMultiplier: 2.4,
          criticalBufferMin: 20,
          linkedRedistId: null,
          clinicalDriverNote: 'Kharif crop harvesting snakebite surge across rural fields'
        }
      ],
      thirtyDaySurgeCurve: [
        1.0, 1.15, 1.32, 1.5, 1.7, 1.88, 2.05, 2.18, 2.28, 2.32,
        2.28, 2.2, 2.12, 2.02, 1.92, 1.84, 1.76, 1.68, 1.6, 1.52,
        1.45, 1.38, 1.32, 1.26, 1.22, 1.18, 1.14, 1.12, 1.1, 1.08
      ],
      recommendedActions: [
        {
          action: `Stock minimum 1,200 Doxycycline 100mg capsules & 600 Azithromycin 500mg tablets at ${phc.name} for empirical Scrub Typhus therapy`,
          priority: 'CRITICAL',
          category: 'Pharmacy / Drug Store'
        },
        {
          action: 'Screen all Acute Febrile Illness (AFI > 5 days) patients for pathognomonic Scrub Typhus eschar',
          priority: 'CRITICAL',
          category: 'Clinical OPD Triage'
        },
        {
          action: 'Maintain Rapid Diagnostic Test (RDT) kits for Dengue NS1/IgM, Malaria Pf/Pv & Scrub Typhus IgM',
          priority: 'HIGH',
          category: 'Clinical Diagnostics Lab'
        },
        {
          action: 'Advise agricultural workers via ASHA outreach to wear protective footwear during Kharif harvest',
          priority: 'HIGH',
          category: 'Community Extension'
        }
      ]
    };
  }

  // WINTER_COLD_RESPIRATORY (Dec - Feb)
  const isSevereColdPocket =
    zoneKey === 'SEMI_ARID_MARWAR_SHEKHAWATI' ||
    zoneKey === 'CANAL_IRRIGATED_GHAGGAR_PLAINS' ||
    zoneKey === 'HIMALAYAN_MONTANE_HILLS' ||
    zoneKey === 'THAR_HYPER_ARID_DESERT';
  const isSmogCorridor =
    zoneKey === 'EASTERN_FLOOD_NCR_PLAINS' || zoneKey === 'GANGETIC_TERAI_PLAINS';

  const baseTemp = isSevereColdPocket ? 14.5 : 17.5;
  const activeTemp = isSevereColdPocket ? 5.8 : isSmogCorridor ? 8.4 : 11.2;
  const activeHumidity = isSmogCorridor || zoneKey === 'CANAL_IRRIGATED_GHAGGAR_PLAINS' ? 76 : 44;
  const activeAqi = isSmogCorridor ? 295 : 210;
  const surgeFootfall = Math.round(baselineFootfall * 1.46);

  return {
    zoneKey,
    ...z,
    defaultLeadTimeDays,
    warehouseHubName,
    seasonKey,
    seasonLabel: 'Winter Cold Wave, Smog & Respiratory Surge (Dec–Feb)',
    seasonMonths: 'December – February',
    advisoryTitle: isSevereColdPocket
      ? `IMD Severe Cold Wave & Night Inversion Advisory — ${phc.district} (${activeTemp}°C)`
      : `Winter Smog, COPD Bronchospasm & Pediatric Pneumonia Alert — ${phc.district}`,
    advisoryLevel: isSevereColdPocket || isSmogCorridor ? 'ORANGE' : 'YELLOW',
    advisorySummary: `Winter thermal inversion (${activeTemp}°C, AQI ${activeAqi}) and biomass heating smoke across ${phc.block}, ${phc.district} trigger an acute surge in COPD/Asthma nebulization demand (Salbutamol/Budesonide), pediatric bacterial pneumonia (Amoxicillin), and cold-induced hypertensive crises.`,
    baselineTempC: baseTemp,
    baselineHumidityPct: 48,
    baselineFootfall,
    activeDefaultTempC: activeTemp,
    activeDefaultHumidityPct: activeHumidity,
    activeDefaultRainfallMm: 0,
    activeDefaultAqi: activeAqi,
    activeDefaultFootfall: surgeFootfall,
    primarySyndromicClusters: [
      {
        condition: 'Acute Asthma & COPD Bronchospasm Exacerbations',
        projectedIncrease: '+82% surge',
        rationale: `Cold air bronchoconstriction (${activeTemp}°C) and winter inversion particulate smog (AQI ${activeAqi}).`
      },
      {
        condition: 'Pediatric Acute Lower Respiratory Infection (ALRI / Pneumonia)',
        projectedIncrease: '+65% surge',
        rationale: 'Winter viral-bacterial respiratory transmission in rural households using indoor biomass heating.'
      },
      {
        condition: 'Cold-Induced Hypertension & Angina Spikes',
        projectedIncrease: '+38% surge',
        rationale: 'Peripheral vasoconstriction in elderly NCD patients during early morning frost.'
      }
    ],
    scenarios: [
      {
        id: 'current-orange',
        name: `Active: ${phc.district} Winter Cold Wave & Smog Inversion`,
        badge: 'COLD WAVE ALERT',
        badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        temp: activeTemp,
        humidity: activeHumidity,
        rainfallMm: 0,
        aqi: activeAqi,
        footfall: surgeFootfall,
        leadTimeDays: defaultLeadTimeDays,
        description: `Winter inversion (${activeTemp}°C, AQI ${activeAqi}): high nebulization demand for Salbutamol & Budesonide respules and pediatric Amoxicillin.`
      },
      {
        id: 'peak-red',
        name: `Escalated: Severe Frost / Dense Fog Wave`,
        badge: 'SEVERE COLD RED ALERT',
        badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
        temp: Math.max(1.5, Number((activeTemp - 3.5).toFixed(1))),
        humidity: Math.min(92, activeHumidity + 12),
        rainfallMm: 5,
        aqi: activeAqi + 65,
        footfall: Math.round(surgeFootfall * 1.2),
        leadTimeDays: Number((defaultLeadTimeDays + 1.0).toFixed(1)),
        description: `Severe frost and highway fog delay logistics (+1d) while emergency nebulization and oxygen bed demand peaks.`
      },
      {
        id: 'baseline-relief',
        name: `Clear Daytime Sunshine (Winter Baseline)`,
        badge: 'NORMAL WINTER',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        temp: baseTemp,
        humidity: 45,
        rainfallMm: 0,
        aqi: 115,
        footfall: baselineFootfall,
        leadTimeDays: defaultLeadTimeDays,
        description: `Clear skies disperse surface inversion smog; respiratory OPD presentations stabilize.`
      }
    ],
    targetSupplies: [
      {
        id: `med-nlem-resp-01-${phc.id}`,
        name: 'Salbutamol Respirator Solution / Respules 2.5mg/2.5ml',
        shortName: 'Salbutamol Respules',
        unit: 'Respules',
        category: 'Respiratory',
        historicalBaseBurn: 20,
        surgeMultiplier: 2.75,
        criticalBufferMin: 120,
        linkedRedistId: null,
        clinicalDriverNote: 'Emergency bronchodilator nebulization for acute winter asthma & COPD flare-ups'
      },
      {
        id: `med-nlem-resp-02-${phc.id}`,
        name: 'Budesonide Respules 0.5mg/2ml',
        shortName: 'Budesonide Respules',
        unit: 'Respules',
        category: 'Respiratory',
        historicalBaseBurn: 12,
        surgeMultiplier: 2.6,
        criticalBufferMin: 80,
        linkedRedistId: null,
        clinicalDriverNote: 'Inhaled corticosteroid nebulization for severe airway inflammation & croup'
      },
      {
        id: `med-nlem-abx-01-${phc.id}`,
        name: 'Amoxicillin Capsules IP 500mg',
        shortName: 'Amoxicillin 500mg',
        unit: 'Capsules',
        category: 'Antibiotics',
        historicalBaseBurn: 65,
        surgeMultiplier: 2.15,
        criticalBufferMin: 600,
        linkedRedistId: null,
        clinicalDriverNote: 'First-line antibiotic for community-acquired pneumonia & bacterial ARI'
      },
      {
        id: `med-nlem-abx-04-${phc.id}`,
        name: 'Azithromycin Tablets IP 500mg',
        shortName: 'Azithromycin 500mg',
        unit: 'Tablets',
        category: 'Antibiotics',
        historicalBaseBurn: 30,
        surgeMultiplier: 2.05,
        criticalBufferMin: 300,
        linkedRedistId: null,
        clinicalDriverNote: 'Macrolide coverage for atypical respiratory infections & severe pharyngitis'
      },
      {
        id: `med-nlem-cvd-01-${phc.id}`,
        name: 'Amlodipine Tablets IP 5mg',
        shortName: 'Amlodipine 5mg',
        unit: 'Tablets',
        category: 'Chronic Care',
        historicalBaseBurn: 110,
        surgeMultiplier: 1.45,
        criticalBufferMin: 1500,
        linkedRedistId: null,
        clinicalDriverNote: 'Antihypertensive buffer for winter cold-induced blood pressure surges'
      }
    ],
    thirtyDaySurgeCurve: [
      1.0, 1.08, 1.18, 1.32, 1.48, 1.65, 1.82, 1.96, 2.08, 2.12,
      2.1, 2.04, 1.96, 1.88, 1.82, 1.76, 1.7, 1.64, 1.58, 1.52,
      1.46, 1.4, 1.35, 1.3, 1.25, 1.22, 1.18, 1.15, 1.12, 1.1
    ],
    recommendedActions: [
      {
        action: `Ensure 24x7 functional electric nebulizers and minimum 300 Salbutamol & Budesonide respules at ${phc.name}`,
        priority: 'CRITICAL',
        category: 'Emergency Casualty & Respiratory Triage'
      },
      {
        action: 'Verify radiant warmers in Labor Room & Newborn Care Corner (NBCC) against neonatal hypothermia',
        priority: 'CRITICAL',
        category: 'Maternal & Newborn Ward'
      },
      {
        action: 'Inspect oxygen concentrators and B-type/D-type cylinder manifold pressure for severe ALRI/COPD beds',
        priority: 'HIGH',
        category: 'Oxygen & Ward Infrastructure'
      },
      {
        action: 'Pre-position pediatric Amoxicillin & Paracetamol suspension buffers with Sub-Centre ANMs',
        priority: 'HIGH',
        category: 'Pharmacy / Drug Store'
      }
    ]
  };
}

/**
 * Generates an accurate WeatherPreparedness object tailored to the facility's geography and active season.
 */
export function buildRegionalWeatherPreparedness(
  phc: PHCFacility,
  seasonOverride?: EpidemicSeasonKey
): WeatherPreparedness {
  const profile = getRegionalGeographySeasonProfile(phc, seasonOverride);

  const seasonalProfileLabel: WeatherPreparedness['seasonalProfile'] =
    profile.seasonKey === 'SUMMER_HEATWAVE'
      ? 'Summer/Heatwave'
      : profile.seasonKey === 'WINTER_COLD_RESPIRATORY'
      ? 'Winter'
      : 'Monsoon';

  const alertTypeLabel =
    profile.seasonKey === 'SUMMER_HEATWAVE'
      ? profile.zoneKey === 'THAR_HYPER_ARID_DESERT'
        ? 'Severe Heatwave & Dust Storm'
        : 'Heatwave Warning'
      : profile.seasonKey === 'MONSOON_VECTOR_FLOOD'
      ? 'Monsoon Vector & Flood Surge'
      : profile.seasonKey === 'POST_MONSOON_SCRUB_TYPHUS'
      ? 'Scrub Typhus & Dengue Surge'
      : 'Cold Wave & Smog Alert';

  return {
    phcId: phc.id,
    location: `${phc.block} Block (${profile.zoneName})`,
    district: `${phc.district}, ${phc.state}`,
    temperatureC: profile.activeDefaultTempC,
    feelsLikeC: Number(
      (
        profile.activeDefaultTempC +
        (profile.seasonKey === 'SUMMER_HEATWAVE'
          ? 2.4
          : profile.seasonKey === 'MONSOON_VECTOR_FLOOD'
          ? 3.8
          : -1.5)
      ).toFixed(1)
    ),
    humidityPercent: profile.activeDefaultHumidityPct,
    rainfallMm: profile.activeDefaultRainfallMm,
    rainfallForecastMm:
      profile.seasonKey === 'MONSOON_VECTOR_FLOOD'
        ? Math.round(profile.activeDefaultRainfallMm * 1.25)
        : profile.activeDefaultRainfallMm,
    airQualityIndex: profile.activeDefaultAqi,
    uvIndex:
      profile.seasonKey === 'SUMMER_HEATWAVE'
        ? 10.2
        : profile.seasonKey === 'WINTER_COLD_RESPIRATORY'
        ? 5.4
        : 7.6,
    alertType: alertTypeLabel,
    alertLevel: profile.advisoryLevel,
    seasonalProfile: seasonalProfileLabel,
    historicalCorrelationNote: profile.advisorySummary,
    likelyHealthImpacts: profile.primarySyndromicClusters,
    recommendedPreparatoryActions: profile.recommendedActions,
    vulnerableMedicines: profile.targetSupplies.slice(0, 4).map((s) => ({
      medicineName: s.name,
      demandSurgePercent: Math.round((s.surgeMultiplier - 1) * 100),
      reason: s.clinicalDriverNote,
      actionRequired: `Maintain buffer >= ${s.criticalBufferMin} ${s.unit}`
    }))
  };
}
