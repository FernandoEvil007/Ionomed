function activeList(list = []) {
  return (list || []).filter((value) => value && value !== "ninguno");
}

function hasAny(list = [], values = []) {
  const active = activeList(list);
  return values.some((value) => active.includes(value));
}

function number(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const clinicalRanges = [
  {
    electrolyte: "Sodio",
    unit: "mmol/L",
    rows: [
      { disorder: "Hiponatremia leve", range: "130-134", severity: "leve" },
      { disorder: "Hiponatremia moderada", range: "120-129", severity: "moderada" },
      { disorder: "Hiponatremia profunda/severa", range: "<120 o sintomatica", severity: "severa" },
      { disorder: "Hipernatremia leve", range: "146-150", severity: "leve" },
      { disorder: "Hipernatremia moderada", range: "151-159", severity: "moderada" },
      { disorder: "Hipernatremia severa", range: ">=160", severity: "severa" }
    ]
  },
  {
    electrolyte: "Potasio",
    unit: "mmol/L",
    rows: [
      { disorder: "Hipokalemia leve", range: "3.0-3.49", severity: "leve" },
      { disorder: "Hipokalemia moderada", range: "2.5-2.99", severity: "moderada" },
      { disorder: "Hipokalemia severa", range: "<2.5 o <3.0 con sintomas/ECG", severity: "severa" },
      { disorder: "Hiperkalemia leve", range: "5.1-5.5", severity: "leve" },
      { disorder: "Hiperkalemia moderada", range: ">5.5-6.0", severity: "moderada" },
      { disorder: "Hiperkalemia severa", range: ">6.0, ECG o ERC avanzada", severity: "severa" }
    ]
  },
  {
    electrolyte: "Calcio total corregido",
    unit: "mg/dL",
    note: "Interpretar con calcio corregido por albumina o calcio ionico si el paciente es critico.",
    rows: [
      { disorder: "Hipercalcemia leve", range: "10.5-11.9", severity: "leve" },
      { disorder: "Hipercalcemia moderada", range: "12.0-13.9", severity: "moderada" },
      { disorder: "Hipercalcemia severa", range: ">=14", severity: "severa" },
      { disorder: "Hipocalcemia leve", range: "8.0-8.4", severity: "leve" },
      { disorder: "Hipocalcemia moderada", range: "7.5-7.9", severity: "moderada" },
      { disorder: "Hipocalcemia severa", range: "<7.5 o sintomatica", severity: "severa" }
    ]
  },
  {
    electrolyte: "Magnesio",
    unit: "mg/dL",
    rows: [
      { disorder: "Hipomagnesemia leve", range: "1.25-1.79", severity: "leve" },
      { disorder: "Hipomagnesemia moderada", range: "1.0-1.24", severity: "moderada" },
      { disorder: "Hipomagnesemia severa", range: "<1.0 o sintomatica", severity: "severa" },
      { disorder: "Hipermagnesemia leve", range: ">2.6-<7.0", severity: "leve" },
      { disorder: "Hipermagnesemia moderada", range: "7.0-12.0", severity: "moderada" },
      { disorder: "Hipermagnesemia severa", range: ">12.0", severity: "severa" }
    ]
  },
  {
    electrolyte: "Fosforo",
    unit: "mg/dL",
    rows: [
      { disorder: "Hipofosfatemia leve", range: "2.0-2.5", severity: "leve" },
      { disorder: "Hipofosfatemia moderada", range: "1.0-2.0", severity: "moderada" },
      { disorder: "Hipofosfatemia severa", range: "<1.0", severity: "severa" },
      { disorder: "Hiperfosfatemia leve", range: ">4.5-5.5", severity: "leve" },
      { disorder: "Hiperfosfatemia moderada", range: "5.6-7.0", severity: "moderada" },
      { disorder: "Hiperfosfatemia severa", range: ">7.0", severity: "severa" }
    ]
  }
];

export function classifySodium(patient, lab, calculations) {
  const sodium = number(calculations.sodiumCorrected) ?? number(lab.sodium);
  const neuro = activeList(patient.neurologicSymptoms || []).length > 0;
  if (sodium === null) return null;
  if (sodium < 120 && neuro) return { disorder: "Hiponatremia severa sintomatica", severity: "severa", priority: "critica" };
  if (sodium < 120) return { disorder: "Hiponatremia profunda sin signos neurologicos", severity: "profunda", priority: "alta" };
  if (sodium < 130) return { disorder: "Hiponatremia moderada", severity: "moderada", priority: "alta" };
  if (sodium < 135) return { disorder: "Hiponatremia leve", severity: "leve", priority: "moderada" };
  if (sodium >= 160) return { disorder: "Hipernatremia severa", severity: "severa", priority: "alta" };
  if (sodium >= 151) return { disorder: "Hipernatremia moderada", severity: "moderada", priority: "alta" };
  if (sodium >= 146) return { disorder: "Hipernatremia leve", severity: "leve", priority: "moderada" };
  return null;
}

export function classifyPotassium(patient, lab, calculations) {
  const k = number(lab.potassium);
  if (k === null) return null;
  const ecgRisk = hasAny(patient.cardiovascularSymptoms || [], ["arritmia", "cambios_ecg", "bradicardia"]);
  const weakness = hasAny(patient.cardiovascularSymptoms || [], ["debilidad_muscular"]);
  const renalAdvanced = calculations.egfr !== null && calculations.egfr < 30;
  if (k < 2.5 || (k < 3.0 && (ecgRisk || weakness))) return { disorder: "Hipokalemia severa", severity: "severa", priority: "critica" };
  if (k < 3.0) return { disorder: "Hipokalemia moderada", severity: "moderada", priority: "alta" };
  if (k < 3.5) return { disorder: "Hipokalemia leve", severity: "leve", priority: "moderada" };
  if (k > 6.0 || (k > 5.5 && ecgRisk) || (k > 5.6 && renalAdvanced)) return { disorder: "Hiperkalemia severa", severity: "severa", priority: "critica" };
  if (k > 5.5) return { disorder: "Hiperkalemia moderada", severity: "moderada", priority: "alta" };
  if (k > 5.0) return { disorder: "Hiperkalemia leve", severity: "leve", priority: "moderada" };
  return null;
}

export function classifyMagnesium(patient, lab) {
  const mg = number(lab.magnesium);
  if (mg === null) return null;
  const risk = hasAny(patient.cardiovascularSymptoms || [], ["arritmia", "qt_prolongado"]) || hasAny(patient.neurologicSymptoms || [], ["convulsion"]);
  if (mg < 1.0 || (mg < 1.25 && risk)) return { disorder: "Hipomagnesemia severa o sintomatica", severity: "severa", priority: "alta" };
  if (mg < 1.25) return { disorder: "Hipomagnesemia moderada", severity: "moderada", priority: "moderada" };
  if (mg < 1.8) return { disorder: "Hipomagnesemia leve", severity: "leve", priority: "moderada" };
  if (mg > 12) return { disorder: "Hipermagnesemia severa", severity: "severa", priority: "alta" };
  if (mg >= 7) return { disorder: "Hipermagnesemia moderada", severity: "moderada", priority: "alta" };
  if (mg > 2.6) return { disorder: "Hipermagnesemia leve", severity: "leve", priority: "moderada" };
  return null;
}

export function classifyPhosphorus(patient, lab) {
  const p = number(lab.phosphorus);
  if (p === null) return null;
  const severeContext = patient.clinicalArea === "uci" || hasAny(patient.comorbidities || [], ["sindrome_realimentacion", "rabdomiolisis"]);
  if (p < 1 || (severeContext && p < 1.5)) return { disorder: "Hipofosfatemia severa", severity: "severa", priority: "alta" };
  if (p < 2.0) return { disorder: "Hipofosfatemia moderada", severity: "moderada", priority: "moderada" };
  if (p < 2.5) return { disorder: "Hipofosfatemia leve", severity: "leve", priority: "moderada" };
  if (p > 7.0) return { disorder: "Hiperfosfatemia severa", severity: "severa", priority: "alta" };
  if (p > 5.5) return { disorder: "Hiperfosfatemia moderada", severity: "moderada", priority: "alta" };
  if (p > 4.5) return { disorder: "Hiperfosfatemia leve", severity: "leve", priority: "moderada" };
  return null;
}

export function classifyCalcium(patient, lab, calculations) {
  const ca = number(lab.calciumIonized) || calculations.calciumCorrected || number(lab.calciumTotal);
  if (ca === null) return null;
  const isIonized = Boolean(number(lab.calciumIonized));
  const value = Number(ca);
  const malignantContext = hasAny(patient.comorbidities || [], ["cancer_activo", "cancer_metastasico", "mieloma_multiple", "linfoma", "leucemia", "metastasis_oseas", "hipercalcemia_maligna_previa"]);
  if (!isIonized && malignantContext && value >= 14) return { disorder: "Hipercalcemia maligna severa", severity: "severa", priority: "critica" };
  if (!isIonized && malignantContext && value >= 12) return { disorder: "Hipercalcemia maligna probable", severity: "moderada", priority: "alta" };
  if (!isIonized && value >= 14) return { disorder: "Hipercalcemia severa", severity: "severa", priority: "critica" };
  if (!isIonized && value >= 12) return { disorder: "Hipercalcemia moderada", severity: "moderada", priority: "alta" };
  if (!isIonized && value >= 10.5) return { disorder: "Hipercalcemia leve", severity: "leve", priority: "moderada" };
  if (!isIonized && value < 7.5) return { disorder: "Hipocalcemia severa", severity: "severa", priority: "alta" };
  if (!isIonized && value < 8.0) return { disorder: "Hipocalcemia moderada", severity: "moderada", priority: "moderada" };
  if (!isIonized && value < 8.5) return { disorder: "Hipocalcemia leve", severity: "leve", priority: "moderada" };
  return null;
}

export function classifyAll(patient, lab, calculations) {
  return [
    classifyPotassium(patient, lab, calculations),
    classifySodium(patient, lab, calculations),
    classifyCalcium(patient, lab, calculations),
    classifyMagnesium(patient, lab, calculations),
    classifyPhosphorus(patient, lab, calculations)
  ].filter(Boolean);
}
