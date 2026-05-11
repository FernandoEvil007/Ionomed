function round(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function number(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rangeLabel(value, low, high) {
  if (value === null) return "no disponible";
  if (value < low) return "bajo";
  if (value > high) return "alto";
  return "normal";
}

export function interpretArterialBloodGas({ patient = {}, lab = {} }) {
  const ph = number(lab.ph);
  const pco2 = number(lab.pco2);
  const po2 = number(lab.po2);
  const hco3 = number(lab.bicarbonate);
  const baseExcess = number(lab.baseExcess);
  const lactate = number(lab.lactate);
  const sodium = number(lab.sodium);
  const chloride = number(lab.chloride);
  const albumin = number(lab.albumin);
  const fio2Input = number(lab.fio2);
  const fio2 = fio2Input ? (fio2Input > 1 ? fio2Input / 100 : fio2Input) : null;
  const oxygenSaturation = number(lab.oxygenSaturation);

  const hasGas = [ph, pco2, po2, hco3, baseExcess, lactate, fio2, oxygenSaturation].some((value) => value !== null);
  if (!hasGas) return null;

  const acidBaseState = ph === null
    ? "pH no disponible"
    : ph < 7.35 ? "acidemia" : ph > 7.45 ? "alcalemia" : "pH normal";
  const metabolicAcidosis = hco3 !== null ? hco3 < 22 : baseExcess !== null ? baseExcess < -2 : false;
  const metabolicAlkalosis = hco3 !== null ? hco3 > 26 : baseExcess !== null ? baseExcess > 2 : false;
  const respiratoryAcidosis = pco2 !== null && pco2 > 45;
  const respiratoryAlkalosis = pco2 !== null && pco2 < 35;
  const processes = [
    metabolicAcidosis && "acidosis metabolica",
    metabolicAlkalosis && "alcalosis metabolica",
    respiratoryAcidosis && "acidosis respiratoria",
    respiratoryAlkalosis && "alcalosis respiratoria"
  ].filter(Boolean);

  let primaryDisorder = "sin trastorno gasometrico primario evidente";
  if (processes.length === 1) primaryDisorder = processes[0];
  if (processes.length > 1) primaryDisorder = `trastorno mixto: ${processes.join(" + ")}`;
  if (ph !== null && ph >= 7.35 && ph <= 7.45 && processes.length > 0) {
    primaryDisorder = `pH compensado o trastorno mixto con ${processes.join(" + ")}`;
  }

  let expectedCompensation = null;
  let compensationAssessment = "no calculable";
  if (metabolicAcidosis && hco3 !== null) {
    const expected = round(1.5 * hco3 + 8, 1);
    expectedCompensation = { type: "Formula de Winter", expectedPco2Min: round(expected - 2, 1), expectedPco2Max: round(expected + 2, 1) };
    if (pco2 !== null) {
      if (pco2 < expected - 2) compensationAssessment = "pCO2 menor de lo esperado: alcalosis respiratoria asociada";
      else if (pco2 > expected + 2) compensationAssessment = "pCO2 mayor de lo esperado: acidosis respiratoria asociada";
      else compensationAssessment = "compensacion respiratoria apropiada para acidosis metabolica";
    }
  } else if (metabolicAlkalosis && hco3 !== null) {
    const expected = round(40 + 0.7 * (hco3 - 24), 1);
    expectedCompensation = { type: "Compensacion de alcalosis metabolica", expectedPco2Min: round(expected - 5, 1), expectedPco2Max: round(expected + 5, 1) };
    if (pco2 !== null) {
      if (pco2 < expected - 5) compensationAssessment = "pCO2 menor de lo esperado: alcalosis respiratoria asociada";
      else if (pco2 > expected + 5) compensationAssessment = "pCO2 mayor de lo esperado: acidosis respiratoria asociada";
      else compensationAssessment = "compensacion respiratoria apropiada para alcalosis metabolica";
    }
  } else if ((respiratoryAcidosis || respiratoryAlkalosis) && pco2 !== null && hco3 !== null) {
    const delta = Math.abs(pco2 - 40) / 10;
    const acuteExpected = respiratoryAcidosis ? 24 + delta : 24 - 2 * delta;
    const chronicExpected = respiratoryAcidosis ? 24 + 3.5 * delta : 24 - 5 * delta;
    expectedCompensation = {
      type: respiratoryAcidosis ? "Compensacion de acidosis respiratoria" : "Compensacion de alcalosis respiratoria",
      acuteHco3: round(acuteExpected, 1),
      chronicHco3: round(chronicExpected, 1)
    };
    compensationAssessment = `HCO3 esperado agudo ${round(acuteExpected, 1)} y cronico ${round(chronicExpected, 1)} mmol/L; comparar con contexto clinico.`;
  }

  const anionGap = sodium !== null && chloride !== null && hco3 !== null ? round(sodium - chloride - hco3, 1) : null;
  const correctedAnionGap = anionGap !== null && albumin !== null ? round(anionGap + 2.5 * (4 - albumin), 1) : anionGap;
  const deltaRatio = correctedAnionGap !== null && hco3 !== null && correctedAnionGap > 12 && hco3 < 24
    ? round((correctedAnionGap - 12) / (24 - hco3), 2)
    : null;
  const fio2Fraction = fio2 !== null ? round(fio2, 2) : null;
  const pfRatio = po2 !== null && fio2 !== null ? round(po2 / fio2, 0) : null;
  const alveolarPo2 = po2 !== null && pco2 !== null && fio2 !== null
    ? round(fio2 * (760 - 47) - (pco2 / 0.8), 1)
    : null;
  const aaGradient = alveolarPo2 !== null ? round(alveolarPo2 - po2, 1) : null;
  const expectedAaGradient = number(patient.age) !== null ? round((number(patient.age) / 4) + 4, 1) : null;

  const alerts = [];
  if (correctedAnionGap !== null && correctedAnionGap > 12) alerts.push("Anion gap elevado: buscar lactato, cetonas, falla renal, toxicos u otras causas.");
  if (deltaRatio !== null && deltaRatio < 0.8) alerts.push("Delta ratio bajo: sugiere acidosis metabolica normal gap adicional.");
  if (deltaRatio !== null && deltaRatio > 2) alerts.push("Delta ratio alto: sugiere alcalosis metabolica o retencion cronica de bicarbonato asociada.");
  if (lactate !== null && lactate >= 2) alerts.push(lactate >= 4 ? "Hiperlactatemia severa: correlacionar con hipoperfusion/sepsis/hipoxia." : "Lactato elevado: vigilar perfusion y tendencia.");
  if (pfRatio !== null && pfRatio < 300) alerts.push(`P/F ${pfRatio}: alteracion de oxigenacion.`);
  if (aaGradient !== null && expectedAaGradient !== null && aaGradient > expectedAaGradient + 10) alerts.push("Gradiente A-a elevado para la edad: sugiere V/Q, shunt o alteracion de difusion.");

  return {
    ph,
    pco2,
    po2,
    hco3,
    baseExcess,
    lactate,
    fio2: fio2Fraction,
    oxygenSaturation,
    acidBaseState,
    primaryDisorder,
    processes,
    compensationAssessment,
    expectedCompensation,
    anionGap,
    correctedAnionGap,
    deltaRatio,
    pfRatio,
    alveolarPo2,
    aaGradient,
    expectedAaGradient,
    oxygenation: {
      po2: rangeLabel(po2, 80, 100),
      pfRatio: pfRatio === null ? "no disponible" : pfRatio < 100 ? "severa" : pfRatio < 200 ? "moderada" : pfRatio < 300 ? "leve" : "normal",
      saturation: rangeLabel(oxygenSaturation, 92, 100)
    },
    alerts
  };
}
