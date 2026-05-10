import { calculateCkdEpi2021, calculateCockcroftGault, classifyRenalFunction, calculateTotalBodyWater } from "./renal.js";

function round(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function hypokalemiaSeverityFromPotassium(potassium) {
  const k = Number(potassium);
  if (!Number.isFinite(k) || k >= 3.5) return null;
  if (k < 2.5) return "severa";
  if (k < 3.0) return "moderada";
  return "leve";
}

function hypokalemiaBasalFactor(severity) {
  return {
    leve: 1,
    moderada: 1.5,
    severa: 2
  }[severity] || null;
}

function hypokalemiaReplacementFraction(severity) {
  return {
    leve: 0.05,
    moderada: 0.10,
    severa: 0.15
  }[severity] || null;
}

export function calculateHypokalemiaReplacement({ weightKg, potassium, severity }) {
  const weight = Number(weightKg);
  const resolvedSeverity = severity || hypokalemiaSeverityFromPotassium(potassium);
  const basalFactor = hypokalemiaBasalFactor(resolvedSeverity);
  const fraction = hypokalemiaReplacementFraction(resolvedSeverity);
  if (!weight || weight <= 0 || !basalFactor || !fraction) {
    return {
      potassiumBasalMeq: null,
      potassiumDeficitMeq: null,
      potassiumTotalReplacementMeq: null,
      potassiumBasalFactor: basalFactor,
      potassiumReplacementPercent: fraction ? round(fraction * 100, 0) : null
    };
  }

  const potassiumBasalMeq = round(weight * basalFactor, 0);
  const potassiumDeficitMeq = round(potassiumBasalMeq * fraction, 0);
  return {
    potassiumBasalMeq,
    potassiumDeficitMeq,
    potassiumTotalReplacementMeq: round(potassiumBasalMeq + potassiumDeficitMeq, 0),
    potassiumBasalFactor: basalFactor,
    potassiumReplacementPercent: round(fraction * 100, 0)
  };
}

export function correctedSodium({ sodium, glucose, factor = 1.6 }) {
  if (sodium === undefined || sodium === null) return null;
  if (!glucose || glucose <= 100) return round(sodium, 1);
  return round(Number(sodium) + factor * ((Number(glucose) - 100) / 100), 1);
}

export function correctedCalcium({ calciumTotal, albumin }) {
  if (calciumTotal === undefined || calciumTotal === null) return null;
  if (!albumin) return round(calciumTotal, 2);
  return round(Number(calciumTotal) + 0.8 * (4 - Number(albumin)), 2);
}

export function calculatedSerumOsmolality({ sodium, glucose, bun }) {
  if (sodium === undefined || sodium === null) return null;
  if (glucose === undefined || glucose === null || bun === undefined || bun === null) return null;
  return round(2 * Number(sodium) + Number(glucose) / 18 + Number(bun) / 2.8, 1);
}

export function hypertonicSalineSodiumChangePerLiter({ sodium, totalBodyWater }) {
  if (!sodium || !totalBodyWater) return null;
  return round((513 - Number(sodium)) / (Number(totalBodyWater) + 1), 2);
}

export function hypertonicSalineRateMlHour({ targetRisePerHour, sodium, totalBodyWater }) {
  const deltaPerLiter = hypertonicSalineSodiumChangePerLiter({ sodium, totalBodyWater });
  if (!deltaPerLiter || !targetRisePerHour) return null;
  return round((Number(targetRisePerHour) / deltaPerLiter) * 1000, 0);
}

function electrolyteDeficits({ patient, lab, sodiumCorrected, totalBodyWater }) {
  const weightKg = Number(patient.weightKg);
  if (!weightKg || weightKg <= 0) {
    return {
      sodiumDeficitMeq: null,
      potassiumBasalMeq: null,
      potassiumDeficitMeq: null,
      potassiumTotalReplacementMeq: null,
      potassiumBasalFactor: null,
      potassiumReplacementPercent: null
    };
  }

  const sodium = sodiumCorrected ?? lab.sodium;
  const potassium = lab.potassium;
  const sodiumDeficitMeq = sodium !== undefined && sodium !== null && Number(sodium) < 135 && totalBodyWater
    ? round((135 - Number(sodium)) * Number(totalBodyWater), 0)
    : null;
  const potassiumReplacement = calculateHypokalemiaReplacement({ weightKg, potassium });

  return {
    sodiumDeficitMeq,
    ...potassiumReplacement
  };
}

export function calculateAll({ patient, lab, settings = {} }) {
  const egfr = calculateCkdEpi2021({ age: patient.age, sex: patient.sex, creatinine: lab.creatinine });
  const cockcroftGault = calculateCockcroftGault({ age: patient.age, sex: patient.sex, weightKg: patient.weightKg, creatinine: lab.creatinine });
  const totalBodyWater = calculateTotalBodyWater({ age: patient.age, sex: patient.sex, weightKg: patient.weightKg });
  const sodiumCorrected = correctedSodium({ sodium: lab.sodium, glucose: lab.glucose, factor: settings.sodiumGlucoseCorrectionFactor || 1.6 });
  const calciumCorrected = correctedCalcium({ calciumTotal: lab.calciumTotal, albumin: lab.albumin });
  const osmolality = calculatedSerumOsmolality({ sodium: lab.sodium, glucose: lab.glucose, bun: lab.bun });
  const sodium3ChangePerLiter = hypertonicSalineSodiumChangePerLiter({ sodium: sodiumCorrected || lab.sodium, totalBodyWater });
  const sodium3RateFor05 = hypertonicSalineRateMlHour({ targetRisePerHour: 0.5, sodium: sodiumCorrected || lab.sodium, totalBodyWater });
  const deficits = electrolyteDeficits({ patient, lab, sodiumCorrected, totalBodyWater });

  return {
    egfr,
    cockcroftGault,
    renalClass: classifyRenalFunction(egfr),
    totalBodyWater,
    sodiumCorrected,
    calciumCorrected,
    calculatedSerumOsmolality: osmolality,
    sodium3ChangePerLiter,
    sodium3RateFor05,
    ...deficits
  };
}
