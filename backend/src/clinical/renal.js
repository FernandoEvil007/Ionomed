function round(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

export function calculateCkdEpi2021({ age, sex, creatinine }) {
  if (!age || !sex || !creatinine || creatinine <= 0) return null;
  const isFemale = sex === "female";
  const k = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const scrK = creatinine / k;
  const egfr =
    142 *
    Math.pow(Math.min(scrK, 1), alpha) *
    Math.pow(Math.max(scrK, 1), -1.2) *
    Math.pow(0.9938, age) *
    (isFemale ? 1.012 : 1);
  return round(egfr, 1);
}

export function calculateCockcroftGault({ age, sex, weightKg, creatinine }) {
  if (!age || !sex || !weightKg || !creatinine || creatinine <= 0) return null;
  const base = ((140 - age) * weightKg) / (72 * creatinine);
  return round(sex === "female" ? base * 0.85 : base, 1);
}

export function classifyRenalFunction(egfr) {
  if (egfr === null || egfr === undefined) return "No calculable";
  if (egfr >= 90) return "Función renal conservada";
  if (egfr >= 60) return "Reducción leve de TFG";
  if (egfr >= 30) return "Reducción moderada de TFG";
  if (egfr >= 15) return "Reducción severa de TFG";
  return "Falla renal avanzada";
}

export function calculateTotalBodyWater({ age, sex, weightKg }) {
  if (!age || !sex || !weightKg) return null;
  let factor = 0.6;
  if (sex === "female") factor = 0.5;
  if (age >= 65 && sex === "male") factor = 0.5;
  if (age >= 65 && sex === "female") factor = 0.45;
  return round(weightKg * factor, 1);
}
