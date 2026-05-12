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

function within(value, min, max) {
  return value !== null && value >= min && value <= max;
}

function anionGapLabel(correctedAnionGap) {
  if (correctedAnionGap === null) return "con anion gap no calculable";
  return correctedAnionGap > 12 ? "con anion gap elevado" : "con anion gap normal";
}

function addProcess(processes, associatedProcesses, associatedLabel) {
  associatedProcesses.push(associatedLabel);
  if (associatedLabel.includes("acidosis metabolica")) processes.add("acidosis metabolica");
  if (associatedLabel.includes("alcalosis metabolica")) processes.add("alcalosis metabolica");
  if (associatedLabel.includes("acidosis respiratoria")) processes.add("acidosis respiratoria");
  if (associatedLabel.includes("alcalosis respiratoria")) processes.add("alcalosis respiratoria");
}

function respiratoryCompensation(hco3, acuteExpected, chronicExpected) {
  if (within(hco3, acuteExpected - 2, acuteExpected + 2)) {
    return { status: "compensada", phase: "aguda", associated: null };
  }
  if (within(hco3, chronicExpected - 3, chronicExpected + 3)) {
    return { status: "compensada", phase: "cronica", associated: null };
  }
  if (hco3 < acuteExpected - 2) {
    return { status: "no compensada", phase: null, associated: "acidosis metabolica asociada" };
  }
  if (hco3 > chronicExpected + 3) {
    return { status: "no compensada", phase: null, associated: "alcalosis metabolica asociada" };
  }
  return { status: "compensacion parcial", phase: "intermedia", associated: null };
}

function inferPrimaryProcess({ ph, metabolicAcidosis, metabolicAlkalosis, respiratoryAcidosis, respiratoryAlkalosis }) {
  if (ph !== null && ph < 7.35) {
    if (metabolicAcidosis) return "acidosis metabolica";
    if (respiratoryAcidosis) return "acidosis respiratoria";
  }
  if (ph !== null && ph > 7.45) {
    if (metabolicAlkalosis) return "alcalosis metabolica";
    if (respiratoryAlkalosis) return "alcalosis respiratoria";
  }
  if (ph !== null && ph >= 7.35 && ph <= 7.45) {
    if (metabolicAcidosis && respiratoryAlkalosis) return ph >= 7.4 ? "alcalosis respiratoria" : "acidosis metabolica";
    if (metabolicAlkalosis && respiratoryAcidosis) return ph <= 7.4 ? "acidosis respiratoria" : "alcalosis metabolica";
    if (metabolicAcidosis && respiratoryAcidosis) return "trastorno mixto acidotico";
    if (metabolicAlkalosis && respiratoryAlkalosis) return "trastorno mixto alcalotico";
    if (metabolicAcidosis) return "acidosis metabolica";
    if (metabolicAlkalosis) return "alcalosis metabolica";
    if (respiratoryAcidosis) return "acidosis respiratoria";
    if (respiratoryAlkalosis) return "alcalosis respiratoria";
  }
  if (metabolicAcidosis) return "acidosis metabolica";
  if (metabolicAlkalosis) return "alcalosis metabolica";
  if (respiratoryAcidosis) return "acidosis respiratoria";
  if (respiratoryAlkalosis) return "alcalosis respiratoria";
  return null;
}

function barometricPressure(altitudeMeters) {
  if (altitudeMeters === null) return 760;
  return 760 * ((1 - (0.0065 * altitudeMeters) / 288.15) ** 5.255);
}

function respiratoryQuotientFor(patient = {}) {
  if ((patient.comorbidities || []).includes("cancer_activo")) return 0.85;
  return 0.8;
}

function deltaRatioInterpretation(deltaRatio) {
  if (deltaRatio === null) return "no calculable";
  if (deltaRatio < 0.8) return "sugiere acidosis metabolica con anion gap normal adicional";
  if (deltaRatio <= 2) return "compatible con acidosis metabolica de anion gap elevado predominante";
  return "sugiere alcalosis metabolica o retencion cronica de bicarbonato asociada";
}

function oxygenationMechanism({ pco2, aaGradient, expectedAaGradient, pfRatio, oxygenDevice, ventilatoryMode }) {
  if (pfRatio === null && aaGradient === null) return "no clasificable";
  const aaHigh = aaGradient !== null && expectedAaGradient !== null && aaGradient > expectedAaGradient + 10;
  if (pco2 !== null && pco2 > 45 && aaGradient !== null && !aaHigh) return "hipoventilacion predominante probable";
  if (aaHigh && pfRatio !== null && pfRatio < 300) return "alteracion V/Q, shunt o difusion probable";
  if (String(ventilatoryMode || "").includes("mecanica") && pfRatio !== null && pfRatio < 300) return "hipoxemia en ventilacion mecanica; valorar SDRA segun imagen y PEEP";
  if (String(oxygenDevice || "").includes("alto_flujo") && pfRatio !== null && pfRatio < 200) return "hipoxemia moderada-severa pese a soporte de alto flujo";
  if (pfRatio !== null && pfRatio < 300) return "hipoxemia por P/F reducido";
  return "oxigenacion sin alteracion significativa con datos disponibles";
}

function severityFlags({ ph, lactate, pfRatio, pco2, hco3 }) {
  const flags = [];
  if (ph !== null && ph < 7.1) flags.push("pH menor de 7.10: acidemia critica");
  if (ph !== null && ph > 7.6) flags.push("pH mayor de 7.60: alcalemia critica");
  if (lactate !== null && lactate >= 4) flags.push("lactato igual o mayor de 4 mmol/L");
  if (pfRatio !== null && pfRatio < 150) flags.push("P/F menor de 150");
  if (pco2 !== null && pco2 >= 70) flags.push("hipercapnia severa");
  if (hco3 !== null && (hco3 < 8 || hco3 > 45)) flags.push("bicarbonato extremo");
  return flags;
}

function etiologyHints({ primaryProcess, correctedAnionGap, deltaRatio, lactate, chloride, hco3, pco2, oxygenMechanism }) {
  const hints = [];
  if (primaryProcess === "acidosis metabolica") {
    if (correctedAnionGap !== null && correctedAnionGap > 12) {
      hints.push("AG elevado: lactato, cetonas, falla renal, toxicos, hipoperfusion o sepsis");
    } else {
      hints.push("AG normal: diarrea/perdidas gastrointestinales de bicarbonato, acidosis tubular renal, cloro elevado o solucion salina");
    }
    if (lactate !== null && lactate >= 2) hints.push("lactato elevado: perfusion, sepsis, hipoxia, convulsiones o farmacos");
    if (deltaRatio !== null && deltaRatio < 0.8) hints.push("delta ratio bajo: componente hipercloremico adicional");
    if (deltaRatio !== null && deltaRatio > 2) hints.push("delta ratio alto: alcalosis metabolica o retencion cronica de bicarbonato asociada");
  }
  if (primaryProcess === "alcalosis metabolica") {
    hints.push("buscar vomito/sonda, diureticos, hipokalemia, hipocloremia, mineralocorticoides o carga alcalina");
  }
  if (primaryProcess === "acidosis respiratoria") {
    hints.push("evaluar EPOC/asma, depresion del sensorio, sedantes/opioides, fatiga muscular, neumonia o edema pulmonar");
  }
  if (primaryProcess === "alcalosis respiratoria") {
    hints.push("buscar hipoxemia, dolor/ansiedad, fiebre, sepsis, TEP, hepatopatia, embarazo o ventilacion excesiva");
  }
  if (oxygenMechanism !== "no clasificable") hints.push(oxygenMechanism);
  if (chloride !== null && hco3 !== null && chloride > 110 && hco3 < 22) hints.push("patron hipercloremico: revisar carga de cloro y perdidas de bicarbonato");
  if (pco2 !== null && pco2 > 45) hints.push("pCO2 alto: vigilar ventilacion alveolar y estado neurologico");
  return [...new Set(hints)];
}

function missingDataForGas({ ph, pco2, po2, hco3, sodium, chloride, albumin, fio2, lactate }) {
  const missing = [];
  if (ph === null) missing.push("pH");
  if (pco2 === null) missing.push("pCO2");
  if (hco3 === null) missing.push("HCO3");
  if (sodium === null || chloride === null) missing.push("sodio y cloro para anion gap");
  if (albumin === null) missing.push("albumina para corregir anion gap");
  if (po2 === null || fio2 === null) missing.push("pO2 y FiO2 para P/F y A-a");
  if (lactate === null) missing.push("lactato");
  return missing;
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
  const temperatureC = number(lab.temperatureC);
  const altitudeMeters = number(lab.altitudeMeters);
  const peep = number(lab.peep);
  const respiratoryRate = number(lab.respiratoryRate);
  const tidalVolumeMl = number(lab.tidalVolumeMl);
  const sampleType = lab.sampleType || "arterial";
  const oxygenDevice = lab.oxygenDevice || "no_especificado";
  const ventilatoryMode = lab.ventilatoryMode || "no_especificado";

  const hasGas = [ph, pco2, po2, hco3, baseExcess, lactate, fio2, oxygenSaturation].some((value) => value !== null);
  if (!hasGas) return null;

  const acidBaseState = ph === null
    ? "pH no disponible"
    : ph < 7.35 ? "acidemia" : ph > 7.45 ? "alcalemia" : "pH normal";
  const metabolicAcidosis = hco3 !== null ? hco3 < 22 : baseExcess !== null ? baseExcess < -2 : false;
  const metabolicAlkalosis = hco3 !== null ? hco3 > 26 : baseExcess !== null ? baseExcess > 2 : false;
  const respiratoryAcidosis = pco2 !== null && pco2 > 45;
  const respiratoryAlkalosis = pco2 !== null && pco2 < 35;
  const anionGap = sodium !== null && chloride !== null && hco3 !== null ? round(sodium - chloride - hco3, 1) : null;
  const correctedAnionGap = anionGap !== null && albumin !== null ? round(anionGap + 2.5 * (4 - albumin), 1) : anionGap;
  const anionGapStatus = anionGapLabel(correctedAnionGap);
  const primaryProcess = inferPrimaryProcess({ ph, metabolicAcidosis, metabolicAlkalosis, respiratoryAcidosis, respiratoryAlkalosis });

  const processSet = new Set();
  const associatedProcesses = [];
  let expectedCompensation = null;
  let compensationAssessment = "no calculable";
  let compensationStatus = "no calculable";
  let compensationPhase = null;

  if (primaryProcess === "trastorno mixto acidotico") {
    processSet.add("acidosis metabolica");
    processSet.add("acidosis respiratoria");
    compensationStatus = "no compensada";
    compensationAssessment = "pH normal con acidosis metabolica y acidosis respiratoria: trastorno mixto acidotico.";
  } else if (primaryProcess === "trastorno mixto alcalotico") {
    processSet.add("alcalosis metabolica");
    processSet.add("alcalosis respiratoria");
    compensationStatus = "no compensada";
    compensationAssessment = "pH normal con alcalosis metabolica y alcalosis respiratoria: trastorno mixto alcalotico.";
  } else if (primaryProcess === "acidosis metabolica" && hco3 !== null) {
    processSet.add("acidosis metabolica");
    const expected = round(1.5 * hco3 + 8, 1);
    const expectedPco2Min = round(expected - 2, 1);
    const expectedPco2Max = round(expected + 2, 1);
    expectedCompensation = { type: "Formula de Winter", expectedPco2Min, expectedPco2Max };
    if (pco2 !== null) {
      if (pco2 < expectedPco2Min) {
        compensationStatus = "no compensada";
        compensationAssessment = "pCO2 menor de lo esperado por Winter: alcalosis respiratoria asociada.";
        addProcess(processSet, associatedProcesses, "alcalosis respiratoria asociada");
      } else if (pco2 > expectedPco2Max) {
        compensationStatus = "no compensada";
        compensationAssessment = "pCO2 mayor de lo esperado por Winter: acidosis respiratoria asociada.";
        addProcess(processSet, associatedProcesses, "acidosis respiratoria asociada");
      } else {
        compensationStatus = "compensada";
        compensationAssessment = "compensacion respiratoria apropiada para acidosis metabolica.";
      }
    }
  } else if (primaryProcess === "alcalosis metabolica" && hco3 !== null) {
    processSet.add("alcalosis metabolica");
    const expected = round(40 + 0.7 * (hco3 - 24), 1);
    const expectedPco2Min = round(expected - 5, 1);
    const expectedPco2Max = round(expected + 5, 1);
    expectedCompensation = { type: "Compensacion de alcalosis metabolica", expectedPco2Min, expectedPco2Max };
    if (pco2 !== null) {
      if (pco2 < expectedPco2Min) {
        compensationStatus = "no compensada";
        compensationAssessment = "pCO2 menor de lo esperado: alcalosis respiratoria asociada.";
        addProcess(processSet, associatedProcesses, "alcalosis respiratoria asociada");
      } else if (pco2 > expectedPco2Max) {
        compensationStatus = "no compensada";
        compensationAssessment = "pCO2 mayor de lo esperado: acidosis respiratoria asociada.";
        addProcess(processSet, associatedProcesses, "acidosis respiratoria asociada");
      } else {
        compensationStatus = "compensada";
        compensationAssessment = "compensacion respiratoria apropiada para alcalosis metabolica.";
      }
    }
  } else if ((primaryProcess === "acidosis respiratoria" || primaryProcess === "alcalosis respiratoria") && pco2 !== null && hco3 !== null) {
    processSet.add(primaryProcess);
    const isRespiratoryAcidosis = primaryProcess === "acidosis respiratoria";
    const delta = Math.abs(pco2 - 40) / 10;
    const acuteExpected = isRespiratoryAcidosis ? 24 + delta : 24 - 2 * delta;
    const chronicExpected = isRespiratoryAcidosis ? 24 + 3.5 * delta : 24 - 5 * delta;
    const compensation = respiratoryCompensation(hco3, acuteExpected, chronicExpected);
    compensationStatus = compensation.status;
    compensationPhase = compensation.phase;
    if (compensation.associated) addProcess(processSet, associatedProcesses, compensation.associated);
    expectedCompensation = {
      type: isRespiratoryAcidosis ? "Compensacion de acidosis respiratoria" : "Compensacion de alcalosis respiratoria",
      acuteHco3: round(acuteExpected, 1),
      chronicHco3: round(chronicExpected, 1)
    };
    compensationAssessment = `${compensation.status}${compensation.phase ? ` (${compensation.phase})` : ""}. HCO3 esperado agudo ${round(acuteExpected, 1)} y cronico ${round(chronicExpected, 1)} mmol/L.`;
  } else if (primaryProcess) {
    processSet.add(primaryProcess);
  }

  const processes = [...processSet];
  let primaryDisorder = "sin trastorno gasometrico primario evidente";
  if (primaryProcess === "acidosis metabolica") {
    primaryDisorder = `acidosis metabolica ${compensationStatus} ${anionGapStatus}`;
  } else if (primaryProcess === "alcalosis metabolica") {
    primaryDisorder = `alcalosis metabolica ${compensationStatus}${correctedAnionGap !== null ? ` ${anionGapStatus}` : ""}`;
  } else if (primaryProcess === "acidosis respiratoria") {
    primaryDisorder = `acidosis respiratoria ${compensationStatus}${compensationPhase ? ` ${compensationPhase}` : ""}`;
  } else if (primaryProcess === "alcalosis respiratoria") {
    primaryDisorder = `alcalosis respiratoria ${compensationStatus}${compensationPhase ? ` ${compensationPhase}` : ""}`;
  } else if (primaryProcess) {
    primaryDisorder = primaryProcess;
  }
  if (associatedProcesses.length > 0) {
    primaryDisorder = `${primaryDisorder} con ${associatedProcesses.join(" y ")}`;
  }

  const deltaRatio = correctedAnionGap !== null && hco3 !== null && correctedAnionGap > 12 && hco3 < 24
    ? round((correctedAnionGap - 12) / (24 - hco3), 2)
    : null;
  const deltaRatioStatus = deltaRatioInterpretation(deltaRatio);
  const fio2Fraction = fio2 !== null ? round(fio2, 2) : null;
  const pfRatio = po2 !== null && fio2 !== null ? round(po2 / fio2, 0) : null;
  const pressure = barometricPressure(altitudeMeters);
  const respiratoryQuotient = respiratoryQuotientFor(patient);
  const alveolarPo2 = po2 !== null && pco2 !== null && fio2 !== null
    ? round(fio2 * (pressure - 47) - (pco2 / respiratoryQuotient), 1)
    : null;
  const aaGradient = alveolarPo2 !== null ? round(alveolarPo2 - po2, 1) : null;
  const expectedAaGradient = number(patient.age) !== null ? round((number(patient.age) / 4) + 4, 1) : null;
  const oxygenMechanism = oxygenationMechanism({ pco2, aaGradient, expectedAaGradient, pfRatio, oxygenDevice, ventilatoryMode });
  const urgentFlags = severityFlags({ ph, lactate, pfRatio, pco2, hco3 });
  const etiologyHintsList = etiologyHints({ primaryProcess, correctedAnionGap, deltaRatio, lactate, chloride, hco3, pco2, oxygenMechanism });
  const missingData = missingDataForGas({ ph, pco2, po2, hco3, sodium, chloride, albumin, fio2, lactate });

  const alerts = [];
  if (sampleType !== "arterial") alerts.push("Muestra no arterial: interpretar pO2, P/F y gradiente A-a con cautela.");
  if (correctedAnionGap !== null && correctedAnionGap > 12) alerts.push("Anion gap elevado: buscar lactato, cetonas, falla renal, toxicos u otras causas.");
  if (deltaRatio !== null && deltaRatio < 0.8) alerts.push("Delta ratio bajo: sugiere acidosis metabolica normal gap adicional.");
  if (deltaRatio !== null && deltaRatio > 2) alerts.push("Delta ratio alto: sugiere alcalosis metabolica o retencion cronica de bicarbonato asociada.");
  if (lactate !== null && lactate >= 2) alerts.push(lactate >= 4 ? "Hiperlactatemia severa: correlacionar con hipoperfusion/sepsis/hipoxia." : "Lactato elevado: vigilar perfusion y tendencia.");
  if (pfRatio !== null && pfRatio < 300) alerts.push(`P/F ${pfRatio}: alteracion de oxigenacion.`);
  if (aaGradient !== null && expectedAaGradient !== null && aaGradient > expectedAaGradient + 10) alerts.push("Gradiente A-a elevado para la edad: sugiere V/Q, shunt o alteracion de difusion.");
  if (peep !== null && peep >= 10 && pfRatio !== null && pfRatio < 200) alerts.push("P/F bajo con PEEP alta: valorar SDRA, reclutamiento y estrategia ventilatoria protectora.");
  alerts.push(...urgentFlags.map((flag) => `Alerta de severidad: ${flag}.`));

  const explanation = [
    ph !== null ? `pH ${ph} (${acidBaseState})` : "pH no disponible",
    hco3 !== null ? `HCO3 ${hco3} mmol/L` : "HCO3 no disponible",
    pco2 !== null ? `pCO2 ${pco2} mmHg` : "pCO2 no disponible",
    correctedAnionGap !== null ? `AG corregido ${correctedAnionGap} (${anionGapStatus})` : "AG no calculable",
    compensationAssessment
  ];

  return {
    ph,
    pco2,
    po2,
    hco3,
    baseExcess,
    lactate,
    fio2: fio2Fraction,
    oxygenSaturation,
    temperatureC,
    altitudeMeters,
    sampleType,
    oxygenDevice,
    ventilatoryMode,
    peep,
    respiratoryRate,
    tidalVolumeMl,
    acidBaseState,
    primaryDisorder,
    primaryProcess,
    processes,
    associatedProcesses,
    compensationStatus,
    compensationPhase,
    compensationAssessment,
    expectedCompensation,
    anionGap,
    correctedAnionGap,
    anionGapStatus,
    deltaRatio,
    deltaRatioStatus,
    pfRatio,
    alveolarPo2,
    aaGradient,
    expectedAaGradient,
    oxygenMechanism,
    respiratoryQuotient,
    barometricPressure: round(pressure, 1),
    oxygenation: {
      po2: rangeLabel(po2, 80, 100),
      pfRatio: pfRatio === null ? "no disponible" : pfRatio < 100 ? "severa" : pfRatio < 200 ? "moderada" : pfRatio < 300 ? "leve" : "normal",
      saturation: rangeLabel(oxygenSaturation, 92, 100)
    },
    severity: urgentFlags.length ? "critica" : pfRatio !== null && pfRatio < 200 ? "alta" : "no critica",
    urgentFlags,
    etiologyHints: etiologyHintsList,
    missingData,
    diagnosticExplanation: explanation.join(". "),
    alerts
  };
}
