import type { MedicineItem } from '../types.ts';

/**
 * National List of Essential Medicines (NLEM) - Primary Healthcare Level (P)
 * Grounded in MoHFW & National Health Systems Resource Centre (NHSRC) Essential Medicines List
 * for Primary Health Centres & Health and Wellness Centres (HWCs) in India.
 */
export interface NLEMDefinition {
  code: string;
  name: string;
  category: MedicineItem['category'];
  dosageForm: string;
  strength: string;
  unit: string;
  therapeuticClass: string;
  level: 'P' | 'P,S' | 'P,S,T'; // Primary, Secondary, Tertiary
  isColdChainRequired: boolean;
  standardMinStock: number;
  standardMaxStock: number;
  standardDailyBurn: number;
  defaultWarehouse: string;
}

export const NATIONAL_ESSENTIAL_MEDICINES_LIST: NLEMDefinition[] = [
  // ==========================================
  // 1. ANALGESICS, ANTIPYRETICS & NSAIDS
  // ==========================================
  {
    code: 'NLEM-ANA-01',
    name: 'Paracetamol Tablets IP 500mg',
    category: 'Analgesics',
    dosageForm: 'Tablets',
    strength: '500mg',
    unit: 'Tablets',
    therapeuticClass: 'Non-Opioid Analgesic / Antipyretic',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 2000,
    standardMaxStock: 10000,
    standardDailyBurn: 190,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ANA-02',
    name: 'Ibuprofen Tablets IP 400mg',
    category: 'Analgesics',
    dosageForm: 'Tablets',
    strength: '400mg',
    unit: 'Tablets',
    therapeuticClass: 'NSAID / Anti-inflammatory',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 1000,
    standardMaxStock: 5000,
    standardDailyBurn: 65,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ANA-03',
    name: 'Diclofenac Sodium Injection IP 25mg/ml (3ml)',
    category: 'Analgesics',
    dosageForm: 'Injection Ampoule',
    strength: '75mg/3ml',
    unit: 'Ampoules',
    therapeuticClass: 'Injectable NSAID',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 150,
    standardMaxStock: 800,
    standardDailyBurn: 14,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ANA-04',
    name: 'Paracetamol Pediatric Oral Suspension 120mg/5ml (60ml)',
    category: 'Analgesics',
    dosageForm: 'Oral Suspension',
    strength: '120mg/5ml',
    unit: 'Bottles',
    therapeuticClass: 'Pediatric Antipyretic',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 200,
    standardMaxStock: 1000,
    standardDailyBurn: 18,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },

  // ==========================================
  // 2. ESSENTIAL ORS & INTRAVENOUS FLUIDS
  // ==========================================
  {
    code: 'NLEM-FL-01',
    name: 'Oral Rehydration Salts (ORS) Sachets IP 20.5g',
    category: 'Essential ORS/Fluids',
    dosageForm: 'Dry Powder for Solution',
    strength: '20.5g / 1 Litre Formula (WHO)',
    unit: 'Sachets',
    therapeuticClass: 'Oral Electrolyte Replacement',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 500,
    standardMaxStock: 3000,
    standardDailyBurn: 60,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-FL-02',
    name: 'Normal Saline (0.9% NaCl) IV Infusion 500ml',
    category: 'Essential ORS/Fluids',
    dosageForm: 'IV Infusion Poly Bottle',
    strength: '0.9% w/v Isotonic',
    unit: 'Bottles',
    therapeuticClass: 'Isotonic Crystalloid Fluid',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 100,
    standardMaxStock: 600,
    standardDailyBurn: 16,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-FL-03',
    name: 'Ringer Lactate (RL) IV Infusion 500ml',
    category: 'Essential ORS/Fluids',
    dosageForm: 'IV Infusion Poly Bottle',
    strength: 'Balanced Salt Solution',
    unit: 'Bottles',
    therapeuticClass: 'Resuscitation Crystalloid Fluid',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 80,
    standardMaxStock: 500,
    standardDailyBurn: 12,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-FL-04',
    name: 'Dextrose 5% (D5W) IV Infusion 500ml',
    category: 'Essential ORS/Fluids',
    dosageForm: 'IV Infusion Poly Bottle',
    strength: '5% w/v Dextrose',
    unit: 'Bottles',
    therapeuticClass: 'Caloric Fluid Infusion',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 50,
    standardMaxStock: 300,
    standardDailyBurn: 8,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-FL-05',
    name: 'Dextrose 25% Hypertonic Injection (100ml)',
    category: 'Essential ORS/Fluids',
    dosageForm: 'IV Injection Bottle',
    strength: '25% w/v Dextrose',
    unit: 'Bottles',
    therapeuticClass: 'Emergency Hypoglycemia Reversal',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 30,
    standardMaxStock: 150,
    standardDailyBurn: 4,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-FL-06',
    name: 'Dextrose Normal Saline (DNS) IV Infusion 500ml',
    category: 'Essential ORS/Fluids',
    dosageForm: 'IV Infusion Poly Bottle',
    strength: '5% Dextrose + 0.9% NaCl',
    unit: 'Bottles',
    therapeuticClass: 'Maintenance Electrolyte & Calorie Fluid',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 60,
    standardMaxStock: 350,
    standardDailyBurn: 9,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },

  // ==========================================
  // 3. ANTIDOTES & SPECIFIC ANTIVENOMS
  // ==========================================
  {
    code: 'NLEM-ANT-01',
    name: 'Polyvalent Anti-Snake Venom (ASV) Lyophilized / Liquid 10ml',
    category: 'Vaccines & Antidotes',
    dosageForm: 'Injection Vial',
    strength: 'Neutralizes Cobra, Krait, Russell Viper & Saw-scaled Viper',
    unit: 'Vials',
    therapeuticClass: 'Specific Antivenom Immunoglobulin',
    level: 'P',
    isColdChainRequired: true,
    standardMinStock: 20,
    standardMaxStock: 80,
    standardDailyBurn: 4,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ANT-02',
    name: 'Atropine Sulphate Injection IP 0.6mg/ml (1ml)',
    category: 'Vaccines & Antidotes',
    dosageForm: 'Injection Ampoule',
    strength: '0.6mg/ml',
    unit: 'Ampoules',
    therapeuticClass: 'Anticholinergic / Organophosphate Antidote',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 60,
    standardMaxStock: 300,
    standardDailyBurn: 6,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ANT-03',
    name: 'Pralidoxime (PAM) Chloride Injection 500mg/20ml',
    category: 'Vaccines & Antidotes',
    dosageForm: 'Injection Vial',
    strength: '500mg/20ml',
    unit: 'Vials',
    therapeuticClass: 'Cholinesterase Reactivator',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 15,
    standardMaxStock: 60,
    standardDailyBurn: 2,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ANT-04',
    name: 'Activated Charcoal Powder IP (50g)',
    category: 'Vaccines & Antidotes',
    dosageForm: 'Oral Powder',
    strength: '50g Bottle',
    unit: 'Bottles',
    therapeuticClass: 'Emergency Ingested Poison Adsorbent',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 10,
    standardMaxStock: 40,
    standardDailyBurn: 1,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },

  // ==========================================
  // 4. ANTI-INFECTIVES & ANTIBIOTICS
  // ==========================================
  {
    code: 'NLEM-ABX-01',
    name: 'Amoxicillin Capsules IP 500mg',
    category: 'Antibiotics',
    dosageForm: 'Capsules',
    strength: '500mg',
    unit: 'Capsules',
    therapeuticClass: 'Broad-Spectrum Penicillin',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 600,
    standardMaxStock: 3000,
    standardDailyBurn: 65,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ABX-02',
    name: 'Amoxicillin + Clavulanic Acid Tablets 625mg',
    category: 'Antibiotics',
    dosageForm: 'Tablets',
    strength: '500mg Amox + 125mg Clav',
    unit: 'Tablets',
    therapeuticClass: 'Beta-Lactamase Inhibitor Combination',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 400,
    standardMaxStock: 2000,
    standardDailyBurn: 40,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ABX-03',
    name: 'Ciprofloxacin Tablets IP 500mg',
    category: 'Antibiotics',
    dosageForm: 'Tablets',
    strength: '500mg',
    unit: 'Tablets',
    therapeuticClass: 'Fluoroquinolone',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 500,
    standardMaxStock: 2500,
    standardDailyBurn: 45,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ABX-04',
    name: 'Azithromycin Tablets IP 500mg',
    category: 'Antibiotics',
    dosageForm: 'Tablets',
    strength: '500mg',
    unit: 'Tablets',
    therapeuticClass: 'Macrolide Antibiotic',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 300,
    standardMaxStock: 1500,
    standardDailyBurn: 30,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ABX-05',
    name: 'Ceftriaxone Injection IP 1g Vial',
    category: 'Antibiotics',
    dosageForm: 'Injection Powder Vial',
    strength: '1000mg with Sterile Water',
    unit: 'Vials',
    therapeuticClass: '3rd Gen Cephalosporin',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 100,
    standardMaxStock: 500,
    standardDailyBurn: 15,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ABX-06',
    name: 'Gentamicin Injection IP 80mg/2ml',
    category: 'Antibiotics',
    dosageForm: 'Injection Vial',
    strength: '40mg/ml',
    unit: 'Vials',
    therapeuticClass: 'Aminoglycoside Antibiotic',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 80,
    standardMaxStock: 400,
    standardDailyBurn: 10,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ABX-07',
    name: 'Doxycycline Capsules IP 100mg',
    category: 'Antibiotics',
    dosageForm: 'Capsules',
    strength: '100mg',
    unit: 'Capsules',
    therapeuticClass: 'Tetracycline Class (Scrub Typhus/Cholera)',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 400,
    standardMaxStock: 2000,
    standardDailyBurn: 25,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ABX-08',
    name: 'Metronidazole Tablets IP 400mg',
    category: 'Antibiotics',
    dosageForm: 'Tablets',
    strength: '400mg',
    unit: 'Tablets',
    therapeuticClass: 'Antiprotozoal / Anaerobic Antibacterial',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 600,
    standardMaxStock: 3000,
    standardDailyBurn: 50,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },

  // ==========================================
  // 5. MATERNAL, REPRODUCTIVE & CHILD HEALTH
  // ==========================================
  {
    code: 'NLEM-MCH-01',
    name: 'Oxytocin Injection IP 10 IU/ml (1ml)',
    category: 'Maternal & Child',
    dosageForm: 'Injection Ampoule',
    strength: '10 IU/ml',
    unit: 'Ampoules',
    therapeuticClass: 'Uterotonic (Prevention of PPH)',
    level: 'P',
    isColdChainRequired: true, // 2-8°C ILR cold chain
    standardMinStock: 40,
    standardMaxStock: 200,
    standardDailyBurn: 6,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-MCH-02',
    name: 'Misoprostol Tablets IP 200mcg',
    category: 'Maternal & Child',
    dosageForm: 'Tablets',
    strength: '200mcg',
    unit: 'Tablets',
    therapeuticClass: 'Prostaglandin E1 Analogue (PPH Triage)',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 50,
    standardMaxStock: 250,
    standardDailyBurn: 5,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-MCH-03',
    name: 'Methylergometrine Injection IP 0.2mg/ml',
    category: 'Maternal & Child',
    dosageForm: 'Injection Ampoule',
    strength: '0.2mg/ml',
    unit: 'Ampoules',
    therapeuticClass: 'Ergot Alkaloid Uterotonic',
    level: 'P',
    isColdChainRequired: true,
    standardMinStock: 30,
    standardMaxStock: 150,
    standardDailyBurn: 3,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-MCH-04',
    name: 'Magnesium Sulphate Injection 50% w/v (2ml)',
    category: 'Maternal & Child',
    dosageForm: 'Injection Ampoule',
    strength: '50% (1g/2ml)',
    unit: 'Ampoules',
    therapeuticClass: 'Anticonvulsant for Severe Pre-Eclampsia / Eclampsia',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 40,
    standardMaxStock: 200,
    standardDailyBurn: 4,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-MCH-05',
    name: 'Zinc Sulfate Dispersible Tablets IP 20mg',
    category: 'Maternal & Child',
    dosageForm: 'Dispersible Tablets',
    strength: '20mg Elemental Zinc',
    unit: 'Tablets',
    therapeuticClass: 'Pediatric Diarrhea Adjunct (WHO)',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 400,
    standardMaxStock: 2000,
    standardDailyBurn: 42,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-MCH-06',
    name: 'Iron & Folic Acid (IFA) Tablets Adult (100mg Iron + 0.5mg FA)',
    category: 'Maternal & Child',
    dosageForm: 'Sugar Coated Tablets',
    strength: '100mg Fe + 500mcg FA',
    unit: 'Tablets',
    therapeuticClass: 'Antianemic / Anemia Mukt Bharat',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 3000,
    standardMaxStock: 15000,
    standardDailyBurn: 220,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-MCH-07',
    name: 'Calcium + Vitamin D3 Tablets (500mg Ca + 250 IU D3)',
    category: 'Maternal & Child',
    dosageForm: 'Tablets',
    strength: '500mg Ca + 250 IU D3',
    unit: 'Tablets',
    therapeuticClass: 'Maternal Mineral Supplementation',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 2000,
    standardMaxStock: 10000,
    standardDailyBurn: 140,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },

  // ==========================================
  // 6. CHRONIC CARE & CARDIOVASCULAR
  // ==========================================
  {
    code: 'NLEM-CVD-01',
    name: 'Amlodipine Tablets IP 5mg',
    category: 'Chronic Care',
    dosageForm: 'Tablets',
    strength: '5mg',
    unit: 'Tablets',
    therapeuticClass: 'Calcium Channel Blocker / Antihypertensive',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 1500,
    standardMaxStock: 8000,
    standardDailyBurn: 110,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-CVD-02',
    name: 'Telmisartan Tablets IP 40mg',
    category: 'Chronic Care',
    dosageForm: 'Tablets',
    strength: '40mg',
    unit: 'Tablets',
    therapeuticClass: 'Angiotensin II Receptor Blocker (ARB)',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 1200,
    standardMaxStock: 6000,
    standardDailyBurn: 85,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-CVD-03',
    name: 'Aspirin Gastro-Resistant Tablets IP 75mg',
    category: 'Chronic Care',
    dosageForm: 'Enteric Coated Tablets',
    strength: '75mg',
    unit: 'Tablets',
    therapeuticClass: 'Antiplatelet / Cardioprotective',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 1000,
    standardMaxStock: 5000,
    standardDailyBurn: 70,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-CVD-04',
    name: 'Isosorbide Dinitrate Sublingual Tablets IP 5mg',
    category: 'Chronic Care',
    dosageForm: 'Sublingual Tablets',
    strength: '5mg',
    unit: 'Tablets',
    therapeuticClass: 'Vasodilator / Acute Angina Triage',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 200,
    standardMaxStock: 1000,
    standardDailyBurn: 12,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-CVD-05',
    name: 'Furosemide Injection IP 10mg/ml (2ml)',
    category: 'Chronic Care',
    dosageForm: 'Injection Ampoule',
    strength: '20mg/2ml',
    unit: 'Ampoules',
    therapeuticClass: 'Loop Diuretic / Acute Pulmonary Edema',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 60,
    standardMaxStock: 300,
    standardDailyBurn: 6,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-DM-01',
    name: 'Metformin Hydrochloride Tablets IP 500mg',
    category: 'Chronic Care',
    dosageForm: 'Tablets',
    strength: '500mg',
    unit: 'Tablets',
    therapeuticClass: 'Biguanide Antidiabetic',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 2000,
    standardMaxStock: 10000,
    standardDailyBurn: 130,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-DM-02',
    name: 'Glimepiride Tablets IP 1mg',
    category: 'Chronic Care',
    dosageForm: 'Tablets',
    strength: '1mg',
    unit: 'Tablets',
    therapeuticClass: 'Sulfonylurea Antidiabetic',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 1000,
    standardMaxStock: 5000,
    standardDailyBurn: 55,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },

  // ==========================================
  // 7. RESPIRATORY & ANTI-ALLERGICS
  // ==========================================
  {
    code: 'NLEM-RESP-01',
    name: 'Salbutamol Respirator Solution / Respules 2.5mg/2.5ml',
    category: 'Respiratory' as any,
    dosageForm: 'Respules for Nebulization',
    strength: '2.5mg/2.5ml',
    unit: 'Respules',
    therapeuticClass: 'Short-Acting Beta-2 Agonist (Bronchodilator)',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 120,
    standardMaxStock: 600,
    standardDailyBurn: 20,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-RESP-02',
    name: 'Budesonide Respules 0.5mg/2ml',
    category: 'Respiratory' as any,
    dosageForm: 'Respules for Nebulization',
    strength: '0.5mg/2ml',
    unit: 'Respules',
    therapeuticClass: 'Inhaled Corticosteroid for Severe Asthma',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 80,
    standardMaxStock: 400,
    standardDailyBurn: 12,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ALL-01',
    name: 'Cetirizine Hydrochloride Tablets IP 10mg',
    category: 'Analgesics',
    dosageForm: 'Tablets',
    strength: '10mg',
    unit: 'Tablets',
    therapeuticClass: 'Second-Generation Antihistaminic',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 800,
    standardMaxStock: 4000,
    standardDailyBurn: 35,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ALL-02',
    name: 'Adrenaline (Epinephrine) Injection 1:1000 (1mg/ml)',
    category: 'Vaccines & Antidotes',
    dosageForm: 'Injection Ampoule',
    strength: '1mg/ml (1:1000)',
    unit: 'Ampoules',
    therapeuticClass: 'Anaphylaxis & Cardiac Arrest Resuscitation',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 30,
    standardMaxStock: 150,
    standardDailyBurn: 3,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-ALL-03',
    name: 'Hydrocortisone Sodium Succinate Injection IP 100mg',
    category: 'Vaccines & Antidotes',
    dosageForm: 'Injection Powder Vial',
    strength: '100mg',
    unit: 'Vials',
    therapeuticClass: 'Emergency Corticosteroid for Anaphylaxis / Severe Shock',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 40,
    standardMaxStock: 200,
    standardDailyBurn: 5,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },

  // ==========================================
  // 8. GASTROINTESTINAL & ANTHELMINTICS
  // ==========================================
  {
    code: 'NLEM-GI-01',
    name: 'Pantoprazole Gastro-Resistant Tablets IP 40mg',
    category: 'Essential ORS/Fluids',
    dosageForm: 'Enteric Coated Tablets',
    strength: '40mg',
    unit: 'Tablets',
    therapeuticClass: 'Proton Pump Inhibitor (PPI)',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 1000,
    standardMaxStock: 5000,
    standardDailyBurn: 80,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-GI-02',
    name: 'Ondansetron Tablets IP 4mg',
    category: 'Essential ORS/Fluids',
    dosageForm: 'Tablets',
    strength: '4mg',
    unit: 'Tablets',
    therapeuticClass: '5-HT3 Receptor Antagonist Antiemetic',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 300,
    standardMaxStock: 1500,
    standardDailyBurn: 25,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-GI-03',
    name: 'Albendazole Chewable Tablets IP 400mg',
    category: 'Antibiotics',
    dosageForm: 'Chewable Tablets',
    strength: '400mg',
    unit: 'Tablets',
    therapeuticClass: 'Broad-Spectrum Anthelmintic (Deworming)',
    level: 'P',
    isColdChainRequired: false,
    standardMinStock: 800,
    standardMaxStock: 4000,
    standardDailyBurn: 50,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },

  // ==========================================
  // 9. VACCINES & IMMUNOLOGICALS
  // ==========================================
  {
    code: 'NLEM-VAC-01',
    name: 'Tetanus and adult Diphtheria (Td) Vaccine (0.5ml)',
    category: 'Vaccines & Antidotes',
    dosageForm: 'Injection Vial',
    strength: 'Td Vaccine Adsorbed',
    unit: 'Vials',
    therapeuticClass: 'Tetanus & Diphtheria Immunization',
    level: 'P',
    isColdChainRequired: true,
    standardMinStock: 80,
    standardMaxStock: 400,
    standardDailyBurn: 12,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  },
  {
    code: 'NLEM-VAC-02',
    name: 'Anti-Rabies Vaccine (ARV) Human IP (1ml/dose)',
    category: 'Vaccines & Antidotes',
    dosageForm: 'Injection Vial',
    strength: 'PCECV / Purified Vero Cell Rabies Vaccine',
    unit: 'Vials',
    therapeuticClass: 'Post-Exposure Rabies Prophylaxis',
    level: 'P',
    isColdChainRequired: true,
    standardMinStock: 25,
    standardMaxStock: 100,
    standardDailyBurn: 4,
    defaultWarehouse: 'District Drug Warehouse (RMSCL)'
  }
];

/**
 * Generates fully-populated MedicineItem records for a specific PHC using NLEM definitions
 */
export function generateEssentialMedicinesForPHC(
  phcId: string,
  warehouseName: string = 'District Drug Warehouse Mandore (RMSCL)'
): MedicineItem[] {
  return NATIONAL_ESSENTIAL_MEDICINES_LIST.map((def, idx) => {
    // Calibrate stock levels by facility role (Osian shortage vs Mandore/peer donor surplus)
    let currentStock = Math.round(def.standardMinStock * (0.6 + (idx % 5) * 0.3));
    let dailyBurn = def.standardDailyBurn;

    if (phcId === 'phc-osian') {
      // Primary PHC experiencing heatwave dehydration & snakebite surge shortages
      if (def.name.includes('Anti-Snake Venom')) {
        currentStock = 9;
        dailyBurn = 5;
      } else if (def.name.includes('Oral Rehydration Salts')) {
        currentStock = 210;
        dailyBurn = 58;
      } else if (def.name.includes('Normal Saline')) {
        currentStock = 64;
        dailyBurn = 16;
      } else if (def.name.includes('Ringer Lactate')) {
        currentStock = 48;
        dailyBurn = 12;
      } else if (def.name.includes('Oxytocin')) {
        currentStock = 18;
        dailyBurn = 5;
      }
    } else if (phcId === 'phc-mandore') {
      // Donor hub (PHC Mandore) holding documented surplus stocks for lateral transfer
      if (def.name.includes('Oral Rehydration Salts')) {
        currentStock = 2150;
        dailyBurn = 25;
      } else if (def.name.includes('Normal Saline')) {
        currentStock = 520;
        dailyBurn = 10;
      } else if (def.name.includes('Ringer Lactate')) {
        currentStock = 340;
        dailyBurn = 8;
      } else if (def.name.includes('Anti-Snake Venom')) {
        currentStock = 42;
        dailyBurn = 2;
      } else if (def.name.includes('Oxytocin')) {
        currentStock = 95;
        dailyBurn = 3;
      }
    } else if (phcId === 'phc-tinwari' || phcId === 'phc-bhopalgarh' || phcId === 'phc-shergarh') {
      // Surplus / well-buffered Rajasthan PHCs
      currentStock = Math.round(def.standardMinStock * 2.1);
      if (def.name.includes('Oral Rehydration Salts')) {
        currentStock = phcId === 'phc-tinwari' ? 1800 : phcId === 'phc-bhopalgarh' ? 1600 : 2100;
        dailyBurn = 28;
      } else if (def.name.includes('Normal Saline')) {
        currentStock = phcId === 'phc-tinwari' ? 450 : phcId === 'phc-bhopalgarh' ? 420 : 480;
        dailyBurn = 9;
      } else if (def.name.includes('Ringer Lactate')) {
        currentStock = 310;
        dailyBurn = 6;
      } else if (def.name.includes('Anti-Snake Venom')) {
        currentStock = 48;
        dailyBurn = 1;
      } else if (def.name.includes('Oxytocin')) {
        currentStock = 85;
        dailyBurn = 1.5;
      }
    } else if (phcId === 'phc-luni' || phcId === 'phc-bap' || phcId === 'phc-dhorimanna' || phcId === 'phc-nokha') {
      // Normal / adequate coverage PHCs (above minStockLevel & ROP, below 45d surplus ceiling)
      currentStock = Math.round(def.standardMinStock * 1.65);
      if (def.name.includes('Oral Rehydration Salts')) {
        currentStock = 960;
        dailyBurn = 48;
      } else if (def.name.includes('Normal Saline')) {
        currentStock = 240;
        dailyBurn = 12;
      } else if (def.name.includes('Ringer Lactate')) {
        currentStock = 180;
        dailyBurn = 10;
      } else if (def.name.includes('Anti-Snake Venom')) {
        currentStock = 36;
        dailyBurn = 2;
      } else if (def.name.includes('Oxytocin')) {
        currentStock = 60;
        dailyBurn = 3;
      }
    } else if (phcId === 'phc-pokhran' || phcId === 'phc-sam-dunes' || phcId === 'phc-chohtan-border') {
      // Frontier Thar desert PHCs with critical heatwave & viper envenomation stock deficit
      if (def.name.includes('Oral Rehydration Salts')) {
        currentStock = 120;
        dailyBurn = 60;
      } else if (def.name.includes('Normal Saline')) {
        currentStock = 32;
        dailyBurn = 16;
      } else if (def.name.includes('Anti-Snake Venom')) {
        currentStock = 6;
        dailyBurn = 3;
      }
    } else if (
      ['phc-gogunda', 'phc-kotra-tribal', 'phc-jhadol', 'phc-bichhiwara', 'phc-talwara-mahi', 'phc-arnod', 'phc-delwara-abu'].includes(phcId)
    ) {
      // Southern Aravalli & Tribal Sub-Plan (TSP) Belt: High Scrub Typhus, Malaria & Snakebite demand
      if (def.name.includes('Doxycycline')) {
        currentStock = 140;
        dailyBurn = 46;
      } else if (def.name.includes('Azithromycin')) {
        currentStock = 110;
        dailyBurn = 38;
      } else if (def.name.includes('Anti-Snake Venom')) {
        currentStock = 8;
        dailyBurn = 4;
      } else if (def.name.includes('Iron & Folic Acid')) {
        currentStock = 1250;
        dailyBurn = 290;
      } else if (def.name.includes('Paracetamol Tablets')) {
        currentStock = 980;
        dailyBurn = 225;
      }
    } else if (
      ['phc-kaithoon', 'phc-sangod', 'phc-talera', 'phc-jhalrapatan-rural', 'phc-shahbad-sahariya', 'phc-bari-chambal', 'phc-sapotra', 'phc-kumher'].includes(phcId)
    ) {
      // Chambal & Hadoti Riverine / Eastern Flood Basin: High Dengue, Waterborne ADD/Dysentery & Scrub Typhus demand
      if (def.name.includes('Paracetamol Tablets')) {
        currentStock = 820;
        dailyBurn = 240;
      } else if (def.name.includes('Metronidazole')) {
        currentStock = 230;
        dailyBurn = 68;
      } else if (def.name.includes('Ciprofloxacin')) {
        currentStock = 210;
        dailyBurn = 62;
      } else if (def.name.includes('Ringer Lactate')) {
        currentStock = 38;
        dailyBurn = 15;
      } else if (def.name.includes('Doxycycline')) {
        currentStock = 165;
        dailyBurn = 42;
      }
    } else if (
      ['phc-salasar', 'phc-baggar', 'phc-palsana', 'phc-khatushyamji', 'phc-chunawadh', 'phc-pilibanga-rural'].includes(phcId)
    ) {
      // Shekhawati Extreme Thermal/Frost & Northern Canal Belt: High Respiratory (Salbutamol/Budesonide) & Agro-chemical Antidote demand
      if (def.name.includes('Salbutamol')) {
        currentStock = 48;
        dailyBurn = 26;
      } else if (def.name.includes('Budesonide')) {
        currentStock = 34;
        dailyBurn = 16;
      } else if (def.name.includes('Amoxicillin Capsules')) {
        currentStock = 280;
        dailyBurn = 82;
      } else if (def.name.includes('Atropine') || def.name.includes('Pralidoxime')) {
        currentStock = 12;
        dailyBurn = 4;
      }
    }

    const fefoPriority: MedicineItem['fefoPriority'] =
      def.code === 'NLEM-ANA-01' ? 'EXPIRING_SOON' : 'NORMAL';

    const batchSuffix = 2600 + (idx % 80);
    const expireYear = idx % 4 === 0 ? '2026' : '2027';
    const expireMonthNum = idx % 4 === 0 ? 10 + (idx % 3) : (idx % 12) + 1;
    const expireMonth = String(expireMonthNum).padStart(2, '0');
    const primaryBatchNumber = `${def.code.split('-')[1]}-RJ-${batchSuffix}`;
    const primaryExpiryDate = `${expireYear}-${expireMonth}-28`;

    // Build batch breakdown (including an explicit expired sub-batch on Ibuprofen to demonstrate expired stock exclusion)
    const batches =
      def.code === 'NLEM-ANA-02' && currentStock > 120
        ? [
            {
              batchNumber: primaryBatchNumber,
              quantity: currentStock - 120,
              expiryDate: primaryExpiryDate,
              status: 'ACTIVE' as const
            },
            {
              batchNumber: `${def.code.split('-')[1]}-RJ-2508-EXP`,
              quantity: 120,
              expiryDate: '2026-08-15',
              status: 'EXPIRED' as const
            }
          ]
        : def.code === 'NLEM-ANA-01' && currentStock > 200
        ? [
            {
              batchNumber: primaryBatchNumber,
              quantity: currentStock - 200,
              expiryDate: '2026-11-28',
              status: 'EXPIRING_SOON' as const
            },
            {
              batchNumber: `${def.code.split('-')[1]}-RJ-${batchSuffix + 10}`,
              quantity: 200,
              expiryDate: '2027-06-28',
              status: 'ACTIVE' as const
            }
          ]
        : [
            {
              batchNumber: primaryBatchNumber,
              quantity: currentStock,
              expiryDate: primaryExpiryDate,
              status: (fefoPriority === 'EXPIRING_SOON' ? 'EXPIRING_SOON' : 'ACTIVE') as 'ACTIVE' | 'EXPIRING_SOON'
            }
          ];

    const usableStock = batches
      .filter((b) => b.status !== 'EXPIRED' && b.expiryDate >= '2026-09-22')
      .reduce((sum, b) => sum + b.quantity, 0);
    const effectiveProjectedDays = dailyBurn > 0 ? parseFloat((usableStock / dailyBurn).toFixed(1)) : 99;

    const criticalFloor = Math.max(1, Math.round(def.standardMinStock * 0.5));
    const dynamicRop = Math.max(def.standardMinStock, Math.ceil(dailyBurn * 3.5) + Math.ceil(dailyBurn * 3.0));

    let stockoutRisk: MedicineItem['stockoutRisk'] = 'NORMAL';
    if (usableStock <= 0 || usableStock <= criticalFloor || effectiveProjectedDays <= 3.5) {
      stockoutRisk = 'CRITICAL';
    } else if (usableStock <= def.standardMinStock || usableStock <= dynamicRop || effectiveProjectedDays <= 6.5) {
      stockoutRisk = 'WARNING';
    } else if (usableStock >= def.standardMaxStock || usableStock >= def.standardMinStock * 2.5 || effectiveProjectedDays >= 45) {
      stockoutRisk = 'SURPLUS';
    }

    // Match initial pendingOrders strictly to actual active orders in INITIAL_ORDERS for phc-osian
    let initialPendingOrders = 0;
    let initialExpectedDelivery: string | undefined = undefined;
    if (phcId === 'phc-osian') {
      if (def.code === 'NLEM-FL-01') {
        initialPendingOrders = 500;
        initialExpectedDelivery = '2026-09-23';
      } else if (def.code === 'NLEM-FL-02') {
        initialPendingOrders = 200;
        initialExpectedDelivery = '2026-09-24';
      } else if (def.code === 'NLEM-FL-03') {
        initialPendingOrders = 150;
        initialExpectedDelivery = '2026-09-26';
      }
    }

    return {
      id: `med-${def.code.toLowerCase()}-${phcId}`,
      phcId,
      name: def.name,
      category: def.category,
      unit: def.unit,
      currentStock,
      dailyConsumption: dailyBurn,
      weeklyConsumption: dailyBurn * 7,
      minStockLevel: def.standardMinStock,
      maxStockLevel: def.standardMaxStock,
      batchNumber: primaryBatchNumber,
      expiryDate: primaryExpiryDate,
      batches,
      pendingOrders: initialPendingOrders,
      expectedDeliveryDate: initialExpectedDelivery,
      sourceWarehouse: warehouseName,
      projectedStockoutDays: effectiveProjectedDays,
      stockoutRisk,
      predictedSurplus: stockoutRisk === 'SURPLUS' ? Math.max(0, usableStock - def.standardMinStock * 2) : 0,
      forecast7Day: dailyBurn * 7,
      forecast30Day: dailyBurn * 30,
      fefoPriority
    };
  });
}
