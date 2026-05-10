import { calculateAll } from "./calculations.js";

function hasAny(list = [], values = []) {
  const active = activeList(list);
  return values.some((value) => active.includes(value));
}

function activeList(list = []) {
  return (list || []).filter((value) => value && value !== "ninguno");
}

function number(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberedOrderText(text) {
  return String(text || "")
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => `${index + 1}. ${part}`)
    .join("\n");
}

const CLINICAL_PROTOCOL_VERSION = "ionomed-electrolytes-2026.05";

function makeOrder({ disorder, severity, priority, text, alerts = [], justification = "", safety = null, missingData = [], controls = [] }) {
  const normalizedMissing = [...new Set(missingData.filter(Boolean))];
  const normalizedControls = [...new Set(controls.filter(Boolean))];
  const dataCompleteness = normalizedMissing.length ? "incompleta" : "suficiente";
  const safetyPayload = safety
    ? { protocolVersion: CLINICAL_PROTOCOL_VERSION, dataCompleteness, ...safety }
    : { protocolVersion: CLINICAL_PROTOCOL_VERSION, dataCompleteness };
  const dataAlert = normalizedMissing.length
    ? [`Datos faltantes: ${normalizedMissing.join(", ")}. La orden se genera con informacion parcial y debe ajustarse al completar datos.`]
    : [];
  return {
    disorder,
    severity,
    priority,
    suggestedText: numberedOrderText(text),
    alerts: [...dataAlert, ...alerts],
    justification,
    safety: safetyPayload,
    missingData: normalizedMissing,
    controls: normalizedControls
  };
}

function sodiumHighRisk(patient) {
  return hasAny(patient.comorbidities || [], ["alcoholismo", "desnutricion", "cirrosis"]) || number(patient.weightKg) < 45;
}

function sodiumMissingData(patient, lab) {
  const missing = [];
  if (number(lab.glucose) === null) missing.push("glucosa");
  if (!patient.volumeStatus || patient.volumeStatus === "incierto") missing.push("volemia");
  if (number(patient.urineOutputMlKgH) === null) missing.push("diuresis");
  if (number(lab.creatinine) === null) missing.push("creatinina");
  return missing;
}

function sodiumCorrectionLimits(dailyLimit = 8) {
  const max24h = Math.min(Number(dailyLimit) || 8, 8);
  const max12h = 5;
  const max8h = 3;
  const max4h = 1.5;
  return {
    max24h,
    max12h,
    max8h,
    max4h,
    maxHourly: Math.min(max24h / 24, max12h / 12, max8h / 8, max4h / 4)
  };
}

function hypertonicRateForLimit(calculations, dailyLimit) {
  const deltaPerLiter = number(calculations.sodium3ChangePerLiter);
  if (!deltaPerLiter) return null;
  const limits = sodiumCorrectionLimits(dailyLimit);
  return Math.round((limits.maxHourly / deltaPerLiter) * 1000);
}

const sodiumInfusates = [
  { key: "d5w", name: "Dextrosa al 5%", sodium: 0 },
  { key: "saline045", name: "Solucion salina 0.45%", sodium: 77 },
  { key: "ringer", name: "Ringer lactato", sodium: 130 },
  { key: "saline09", name: "Solucion salina 0.9%", sodium: 154 },
  { key: "saline3", name: "Solucion salina 3%", sodium: 513 },
  { key: "saline75", name: "Solucion salina 7.5%", sodium: 1283 }
];

const solutionPreparation = {
  saline045: "Preparacion SSN 0.45%: mezclar 2 ampollas de Natrol con 480 cc de agua destilada.",
  saline3: "Preparacion SSN 3%: mezclar 400 cc de solucion salina 0.9% con 10 ampollas de Natrol.",
  potassiumPeripheral: "Preparacion KCl periferico: mezclar 25 mL de Katrol con 475 cc de solucion salina 0.9%. Usar por via periferica con bomba; no superar 8 mEq/h por via periferica.",
  potassiumCentral: "Preparacion KCl central: mezclar 40 mL de Katrol con 460 mL de solucion salina 0.9%. Usar solo por via central; no pasar por periferica. No superar 20 mEq/h por via central."
};

function sodiumInfusatePlan(sodium, totalBodyWater, dailyLimit, preferredKey = "saline3") {
  const limits = sodiumCorrectionLimits(dailyLimit);
  if (!sodium || !totalBodyWater) {
    return { selected: null, plans: [] };
  }

  const plans = sodiumInfusates.map((infusate) => {
    const changePerLiter = Math.round(((infusate.sodium - Number(sodium)) / (Number(totalBodyWater) + 1)) * 100) / 100;
    const maxRateMlH = changePerLiter > 0
      ? Math.round((limits.maxHourly / changePerLiter) * 1000)
      : null;
    const volume12hMl = changePerLiter > 0
      ? Math.round((limits.max12h / changePerLiter) * 1000)
      : null;
    const volume24hMl = changePerLiter > 0
      ? Math.round((limits.max24h / changePerLiter) * 1000)
      : null;
    return {
      ...infusate,
      changePerLiter,
      maxRateMlH,
      volume12hMl,
      volume24hMl
    };
  });

  return {
    selected: plans.find((plan) => plan.key === preferredKey) || plans.find((plan) => plan.key === "saline3"),
    plans
  };
}

function waterNeededForSodiumTarget(currentSodium, targetSodium, totalBodyWater) {
  if (!currentSodium || !targetSodium || !totalBodyWater || Number(currentSodium) <= Number(targetSodium)) return null;
  return Math.round((Number(totalBodyWater) * ((Number(currentSodium) / Number(targetSodium)) - 1)) * 10) / 10;
}

function hypernatremiaRatePlan(sodium, totalBodyWater) {
  const limits = sodiumCorrectionLimits(8);
  if (!sodium || !totalBodyWater || Number(sodium) <= 145) {
    return {
      rateMlH: null,
      target24h: null,
      target12h: null,
      water24hLiters: null,
      water12hLiters: null,
      maxDecrease24h: limits.max24h,
      maxDecrease12h: limits.max12h,
      maxDecrease8h: limits.max8h,
      maxDecrease4h: limits.max4h
    };
  }
  const target24h = Math.max(145, Number(sodium) - limits.max24h);
  const target12h = Math.max(145, Number(sodium) - limits.max12h);
  const water24hLiters = waterNeededForSodiumTarget(sodium, target24h, totalBodyWater);
  const water12hLiters = waterNeededForSodiumTarget(sodium, target12h, totalBodyWater);
  const rate24 = water24hLiters ? (water24hLiters * 1000) / 24 : null;
  const rate12 = water12hLiters ? (water12hLiters * 1000) / 12 : null;
  const rateMlH = Math.round(Math.min(...[rate24, rate12].filter((value) => value !== null)));
  return {
    rateMlH: Number.isFinite(rateMlH) ? rateMlH : null,
    target24h,
    target12h,
    water24hLiters,
    water12hLiters,
    maxDecrease24h: limits.max24h,
    maxDecrease12h: limits.max12h,
    maxDecrease8h: limits.max8h,
    maxDecrease4h: limits.max4h
  };
}

function hypernatremiaBestSolution(patient) {
  if (patient.volumeStatus === "hipovolemico") {
    return {
      name: "Solucion salina 0.45%",
      sodiumContent: 77,
      note: "usar despues de estabilizar perfusion si habia hipovolemia marcada"
    };
  }
  if (patient.oralRouteAvailable) {
    return {
      name: "Agua libre por via oral o sonda enteral",
      sodiumContent: 0,
      note: "preferir si el paciente esta alerta y tolera via enteral/oral"
    };
  }
  return {
    name: "Dextrosa al 5%",
    sodiumContent: 0,
    note: "opcion IV como agua libre cuando no hay via enteral/oral segura"
  };
}

function solutionVolumeForFreeWater(freeWaterLiters, sodium, solution) {
  if (!freeWaterLiters || !sodium || !solution) return null;
  const electrolyteFreeFraction = Math.max(0.05, 1 - (Number(solution.sodiumContent || 0) / Number(sodium)));
  return Math.round((Number(freeWaterLiters) * 1000) / electrolyteFreeFraction);
}

function severeHyponatremiaContinuousPlan(patient, calculations, dailyLimit) {
  const volume = patient.volumeStatus || "incierto";
  const limits = sodiumCorrectionLimits(dailyLimit);
  const infusatePlan = sodiumInfusatePlan(calculations.sodiumCorrected, calculations.totalBodyWater, dailyLimit, "saline3");
  const selectedInfusate = infusatePlan.selected;
  const hypertonicRate = selectedInfusate?.maxRateMlH ?? hypertonicRateForLimit(calculations, dailyLimit);
  const formulaSummary = selectedInfusate
    ? `${selectedInfusate.name}: Na ${selectedInfusate.sodium} mEq/L; cambio esperado ${selectedInfusate.changePerLiter} mEq/L por cada litro; maximo ${selectedInfusate.volume12hMl} cc en 12 horas y ${selectedInfusate.volume24hMl} cc en 24 horas.`
    : "No calculable sin sodio y agua corporal total.";
  const hypertonicOptions = "solucion salina hipertonica al 7.5% o al 3% segun disponibilidad/protocolo; solucion salina 0.9% si hipovolemia";
  const hypertonicText = hypertonicRate
    ? `Formula aplicada: cambio Na por litro = (Na infusion - Na serico) / (ACT + 1). ${formulaSummary} ${solutionPreparation.saline3} Dejar solucion salina hipertonica al 3% en infusion continua a maximo ${hypertonicRate} mL/h por bomba. Esta velocidad esta limitada para no superar ${limits.max24h} mmol/L en 24 horas ni ${limits.max12h} mmol/L en 12 horas; revalorar con sodio en 2 horas y suspender/ajustar al alcanzar aumento de 4 a 6 mmol/L o mejoria neurologica.`
    : `${solutionPreparation.saline3} Dejar solucion salina hipertonica al 3% en infusion continua por bomba segun calculo/protocolo institucional, con sodio en 2 horas y ajuste inmediato segun respuesta. No superar ${limits.max24h} mmol/L en 24 horas ni ${limits.max12h} mmol/L en 12 horas.`;

  if (volume === "hipovolemico") {
    return {
      continuousFluid: "Solucion salina 0.9%",
      continuousRate: 100,
      availableInfusions: hypertonicOptions,
      selectedInfusion: "Solucion salina 0.9% para hipovolemia; NaCl 3% si correccion neurologica activa",
      sodiumInfusateNa: selectedInfusate?.sodium,
      sodiumInfusateChangePerLiter: selectedInfusate?.changePerLiter,
      sodiumInfusateMaxRateMlH: hypertonicRate,
      sodiumInfusateVolume12hMl: selectedInfusate?.volume12hMl,
      sodiumInfusateVolume24hMl: selectedInfusate?.volume24hMl,
      text: `Como liquido continuo, iniciar solucion salina 0.9% a 100 cc/h por bomba por hipovolemia, ajustando segun presion arterial, diuresis, congestion y correccion de sodio. Reducir o suspender la infusion si el ascenso proyecta superar ${limits.max12h} mmol/L en 12 horas o ${limits.max24h} mmol/L en 24 horas. Para bolos/correccion neurologica usar la solucion hipertonica indicada por protocolo. Suspender soluciones hipotonicas.`,
      controls: ["Reevaluar volemia, presion arterial y diuresis cada 2 a 4 horas", `No superar ${limits.max12h} mmol/L en 12 horas ni ${limits.max24h} mmol/L en 24 horas`]
    };
  }

  if (volume === "hipervolemico") {
    return {
      continuousFluid: "Evitar cristaloides continuos de rutina",
      continuousRate: null,
      availableInfusions: hypertonicOptions,
      selectedInfusion: "Solucion salina 3% si requiere correccion activa",
      sodiumInfusateNa: selectedInfusate?.sodium,
      sodiumInfusateChangePerLiter: selectedInfusate?.changePerLiter,
      sodiumInfusateMaxRateMlH: hypertonicRate,
      sodiumInfusateVolume12hMl: selectedInfusate?.volume12hMl,
      sodiumInfusateVolume24hMl: selectedInfusate?.volume24hMl,
      text: "No dejar cristaloides continuos de rutina por contexto hipervolemico. Suspender soluciones hipotonicas y restringir agua libre; usar solucion hipertonica solo si persisten sintomas neurologicos o requiere correccion activa estrechamente monitorizada. " + hypertonicText,
      controls: ["Balance hidrico estricto y signos de congestion", `No superar ${limits.max12h} mmol/L en 12 horas ni ${limits.max24h} mmol/L en 24 horas`]
    };
  }

  return {
    continuousFluid: "Solucion salina 3% si requiere correccion activa",
    continuousRate: hypertonicRate,
    selectedInfusion: "Solucion salina 3%",
    sodiumInfusateNa: selectedInfusate?.sodium,
    sodiumInfusateChangePerLiter: selectedInfusate?.changePerLiter,
    sodiumInfusateMaxRateMlH: hypertonicRate,
    sodiumInfusateVolume12hMl: selectedInfusate?.volume12hMl,
    sodiumInfusateVolume24hMl: selectedInfusate?.volume24hMl,
    availableInfusions: hypertonicOptions,
    text: `Suspender soluciones hipotonicas. ${hypertonicText}`,
    controls: ["Confirmar volemia y tonicidad", "Evitar aportes de agua libre durante fase activa", `No superar ${limits.max12h} mmol/L en 12 horas ni ${limits.max24h} mmol/L en 24 horas`]
  };
}

function hypernatremiaFluidPlan(patient, sodium, totalBodyWater, freeWaterDeficit) {
  const options = "solucion salina 0.45%, dextrosa al 5%, agua libre por sonda enteral o via oral";
  const bestSolution = hypernatremiaBestSolution(patient);
  const initialFluid = bestSolution.name;
  const ratePlan = hypernatremiaRatePlan(sodium, totalBodyWater);
  const selectedSolutionVolumeMl = solutionVolumeForFreeWater(freeWaterDeficit, sodium, bestSolution);
  const solutionVolume12hMl = solutionVolumeForFreeWater(ratePlan.water12hLiters, sodium, bestSolution);
  const solutionVolume24hMl = solutionVolumeForFreeWater(ratePlan.water24hLiters, sodium, bestSolution);
  const rateText = ratePlan.rateMlH
    ? `Tasa maxima inicial sugerida de agua libre: ${ratePlan.rateMlH} mL/h por la via elegida, calculada para no superar descenso de ${ratePlan.maxDecrease24h} mmol/L en 24 horas, ${ratePlan.maxDecrease12h} mmol/L en 12 horas, ${ratePlan.maxDecrease8h} mmol/L en 8 horas ni ${ratePlan.maxDecrease4h} mmol/L en 4 horas. Con ${bestSolution.name}, volumen aproximado: ${solutionVolume12hMl ?? "no calculable"} cc en 12 horas y ${solutionVolume24hMl ?? "no calculable"} cc en 24 horas. Meta aproximada: Na ${ratePlan.target24h} mmol/L a 24 horas y Na ${ratePlan.target12h} mmol/L a 12 horas, ajustando segun control real.`
    : "Si no hay peso/ACT o los datos son incompletos, calcular manualmente la tasa inicial y ajustar con sodio seriado; no superar cambio de 8 mmol/L en 24 horas, 5 mmol/L en 12 horas, 3 mmol/L en 8 horas ni 1.5 mmol/L en 4 horas.";
  const preparationText = bestSolution.name.includes("0.45%") ? `${solutionPreparation.saline045} ` : "";
  return {
    continuousFluid: initialFluid,
    continuousRate: ratePlan.rateMlH,
    selectedInfusion: initialFluid,
    infusionRateMlH: ratePlan.rateMlH,
    availableInfusions: options,
    selectedSolutionVolumeMl,
    solutionVolume12hMl,
    solutionVolume24hMl,
    maxDecrease24h: ratePlan.maxDecrease24h,
    maxDecrease12h: ratePlan.maxDecrease12h,
    maxDecrease8h: ratePlan.maxDecrease8h,
    maxDecrease4h: ratePlan.maxDecrease4h,
    target24h: ratePlan.target24h,
    target12h: ratePlan.target12h,
    water24hLiters: ratePlan.water24hLiters,
    water12hLiters: ratePlan.water12hLiters,
    text: `Deficit estimado de agua libre hasta Na 140: ${freeWaterDeficit ?? "no calculable"} L. Mejor solucion sugerida: ${bestSolution.name}; ${bestSolution.note}. ${preparationText}Volumen total aproximado para corregir deficit hasta Na 140: ${selectedSolutionVolumeMl ?? "no calculable"} cc. ${rateText} Elegir via de reposicion segun estado neurologico, tolerancia enteral, volemia, glicemia y funcion renal. Si hay choque o hipovolemia marcada, estabilizar perfusion inicialmente con solucion salina 0.9% y luego pasar a reposicion de agua libre/solucion 0.45%. ${solutionPreparation.saline045}`,
    controls: ["Sodio cada 4 a 6 horas durante fase activa", "Balance hidrico y diuresis", "Ajustar tasa segun descenso real", "No superar cambio de 1.5 mmol/L en 4 horas, 3 mmol/L en 8 horas, 5 mmol/L en 12 horas ni 8 mmol/L en 24 horas"]
  };
}

function accessFluidRate(patient, fallback = 20) {
  if (patient.volumeStatus === "hipovolemico") return 75;
  if (hasAny(patient.comorbidities || [], ["falla_cardiaca", "alto_riesgo_sobrecarga", "erc", "anuria", "oliguria"])) return fallback;
  return 30;
}

function noElectrolyteFluidPlan(patient, reason) {
  const rate = accessFluidRate(patient);
  return {
    continuousFluid: "Solucion salina 0.9% solo para via/medicamentos",
    continuousRate: rate,
    text: `Liquidos continuos: no usar soluciones con electrolito problema. Dejar solucion salina 0.9% a ${rate} cc/h solo para permeabilizar via o administrar medicamentos si no hay otra indicacion de hidratacion. ${reason}`,
    controls: ["Balance hidrico y diuresis", "Revisar compatibilidad de diluyentes y aportes ocultos"]
  };
}

function infusionSafety(plan) {
  return {
    continuousFluid: plan.continuousFluid,
    continuousRate: plan.continuousRate,
    selectedInfusion: plan.selectedInfusion,
    infusionRateMlH: plan.infusionRateMlH,
    maxInfusionRateMlH: plan.maxInfusionRateMlH,
    sodiumInfusateNa: plan.sodiumInfusateNa,
    sodiumInfusateChangePerLiter: plan.sodiumInfusateChangePerLiter,
    sodiumInfusateMaxRateMlH: plan.sodiumInfusateMaxRateMlH,
    sodiumInfusateVolume12hMl: plan.sodiumInfusateVolume12hMl,
    sodiumInfusateVolume24hMl: plan.sodiumInfusateVolume24hMl,
    maxDecrease12h: plan.maxDecrease12h,
    maxDecrease24h: plan.maxDecrease24h,
    target12h: plan.target12h,
    target24h: plan.target24h,
    selectedSolutionVolumeMl: plan.selectedSolutionVolumeMl,
    solutionVolume12hMl: plan.solutionVolume12hMl,
    solutionVolume24hMl: plan.solutionVolume24hMl,
    water12hLiters: plan.water12hLiters,
    water24hLiters: plan.water24hLiters,
    potassiumRateMeqH: plan.potassiumRateMeqH,
    phosphateRateMmolH: plan.phosphateRateMmolH,
    magnesiumRateMgH: plan.magnesiumRateMgH,
    availableInfusions: plan.availableInfusions
  };
}

function ecgRecommendation(disorder) {
  const value = String(disorder || "").toLowerCase();
  if (value.includes("hiperkalemia")) {
    return "Ordenar electrocardiograma inmediato. Buscar ondas T picudas/simetricas, PR prolongado, QRS ancho, perdida de onda P, patron sinusoidal, bradiarritmias, bloqueos o taquiarritmias ventriculares.";
  }
  if (value.includes("hipomagnesemia")) {
    return "Ordenar electrocardiograma. Buscar QT prolongado, extrasistolia, arritmias ventriculares, torsades de pointes o cambios asociados a hipokalemia/hipocalcemia.";
  }
  if (value.includes("hipercalcemia")) {
    return "Ordenar electrocardiograma. Buscar QT corto, PR prolongado, ensanchamiento de QRS, bradicardia, bloqueos o arritmias.";
  }
  if (value.includes("hipocalcemia")) {
    return "Ordenar electrocardiograma. Buscar QT prolongado, arritmias ventriculares, torsades de pointes o signos de irritabilidad neuromuscular correlacionados.";
  }
  return "Ordenar electrocardiograma y correlacionar con el trastorno electrolitico.";
}

function potassiumFluidPlan(patient, classification, safety) {
  if (classification.disorder.includes("Hipokalemia")) {
    const availableInfusions = "KCl periferico: 25 mL de Katrol + 475 cc de SSN 0.9%; KCl central: 40 mL de Katrol + 460 mL de SSN 0.9%";
    const centralForModerateSevere = safety.potassium >= 2 && safety.potassium < 3;
    const central = centralForModerateSevere || ((safety.centralAccess || safety.potassium < 2) && classification.severity === "severa");
    const midline = patient.venousAccess === "linea_media";
    const concentrationMeqMl = central ? 0.16 : 0.1;
    const maxInfusionRateMlH = central ? 100 : (midline ? 70 : 50);
    const infusionRateMlH = centralForModerateSevere ? 50 : maxInfusionRateMlH;
    const potassiumRateMeqH = Math.round(infusionRateMlH * concentrationMeqMl * 10) / 10;
    const potassiumInfusionType = central ? "infusion de potasio central" : "infusion de potasio periferica";
    const selectedInfusion = central
      ? "KCl central: 40 mL de Katrol + 460 mL de SSN 0.9%"
      : "KCl periferico: 25 mL de Katrol + 475 cc de SSN 0.9%";
    const preparationText = central ? solutionPreparation.potassiumCentral : solutionPreparation.potassiumPeripheral;
    return {
      continuousFluid: potassiumInfusionType,
      continuousRate: infusionRateMlH,
      selectedInfusion: `${potassiumInfusionType}: ${selectedInfusion}`,
      potassiumRateMeqH,
      infusionRateMlH,
      maxInfusionRateMlH,
      availableInfusions,
      text: `Liquidos continuos: usar ${potassiumInfusionType}. ${preparationText} Pasar a ${infusionRateMlH} mL/h (${potassiumRateMeqH} mEq/h) por bomba. No superar 8 mEq/h por via periferica ni 20 mEq/h por via central. Ajustar o suspender al recibir control de potasio.`,
      controls: [
        ...(centralForModerateSevere ? ["Solicitar o confirmar via central para potasio entre 2.0 y 2.9 mmol/L"] : []),
        "Verificar concentracion final de KCl y via venosa",
        "Confirmar velocidad en mL/h y mEq/h antes de iniciar",
        "No mezclar con bolos rapidos de potasio"
      ]
    };
  }

  return {
    continuousFluid: "Solucion sin potasio",
    continuousRate: accessFluidRate(patient),
    text: `Liquidos continuos: suspender toda solucion con potasio agregado y evitar Ringer lactato/soluciones balanceadas con potasio durante fase activa. Usar solucion salina 0.9% sin K a ${accessFluidRate(patient)} cc/h solo si requiere via o hidratacion; si hay sobrecarga, oliguria o anuria, restringir cristaloides y priorizar eliminacion/nefrologia.`,
    controls: ["Revisar nutricion, mantenimiento y medicamentos con potasio", "Balance estricto si hay falla renal"]
  };
}

function hypokalemiaControlText(k) {
  if (k !== null && k > 2.5) return "Potasio y magnesio de control cada 12 horas";
  return "Potasio y magnesio de control cada 6 horas";
}

function magnesiumFluidPlan(patient, classification) {
  if (classification.disorder.includes("Hipomagnesemia")) {
    const availableInfusions = "Magnesio 4000 mg endovenosos para 24 horas";
    const renalRisk = hasAny(patient.comorbidities || [], ["erc", "anuria", "oliguria"]);
    const infusionRateMlH = null;
    const magnesiumRateMgH = Math.round(4000 / 24);
    return {
      continuousFluid: "Reposicion de magnesio IV 4000 mg/24 h",
      continuousRate: null,
      selectedInfusion: "Magnesio 4000 mg endovenosos para 24 horas",
      infusionRateMlH,
      magnesiumRateMgH,
      availableInfusions,
      text: `Reposicion de magnesio: administrar magnesio 4000 mg endovenosos para 24 horas por bomba. Velocidad promedio de aporte: ${magnesiumRateMgH} mg/h. Ajustar o suspender si hay deterioro renal, arreflexia, depresion respiratoria, hipotension o signos de toxicidad.`,
      controls: ["Suspender reposicion si arreflexia, depresion respiratoria o deterioro renal", ...(renalRisk ? ["Funcion renal reducida: considerar ajuste y vigilancia mas estrecha"] : [])]
    };
  }
  return noElectrolyteFluidPlan(patient, "Suspender soluciones, nutricion o medicamentos que aporten magnesio.");
}

function phosphorusFluidPlan(patient, classification, safety) {
  if (classification.disorder.includes("Hipofosfatemia")) {
    const availableInfusions = "Fosfato de potasio central 0.13 mmol/mL x 100 mL (P 0.26 mEq/mL + K 0.19 mEq/mL); fosfato de potasio periferico 0.026 mmol/mL en SSN 0.9% x 250 mL (P 0.052 mEq/mL + K 0.038 mEq/mL)";
    const central = patient.venousAccess === "central" && classification.severity === "severa";
    const concentrationMmolMl = central ? 0.13 : 0.026;
    const midline = patient.venousAccess === "linea_media";
    const maxInfusionRateMlH = central ? 100 : (midline ? 70 : 50);
    const desiredRate = safety.renalSevere ? (central ? 50 : 50) : (central ? 100 : 70);
    const infusionRateMlH = Math.min(desiredRate, maxInfusionRateMlH);
    const phosphateRateMmolH = Math.round(infusionRateMlH * concentrationMmolMl * 10) / 10;
    const selectedInfusion = central
      ? "Fosfato de potasio central 0.13 mmol/mL x 100 mL"
      : "Fosfato de potasio periferico 0.026 mmol/mL en SSN 0.9% x 250 mL";
    return {
      continuousFluid: selectedInfusion,
      continuousRate: infusionRateMlH,
      selectedInfusion,
      infusionRateMlH,
      phosphateRateMmolH,
      maxInfusionRateMlH,
      availableInfusions,
      text: `Liquidos continuos: mejor opcion sugerida segun acceso/severidad: ${selectedInfusion} a ${infusionRateMlH} mL/h (${phosphateRateMmolH} mmol/h de fosforo) por bomba. No superar 70 mL/h por via periferica con cateter de linea media. No superar 100 mL/h por via central. Tener en cuenta el aporte asociado de potasio y ajustar segun potasio serico y funcion renal. No dejar fosfato continuo luego de la dosis sin control. Si riesgo de realimentacion, iniciar/continuar nutricion de forma gradual con control estrecho de P, Mg y K.`,
      controls: ["Verificar producto calcio-fosforo antes de fosfato IV", "Ajustar por potasio serico y funcion renal", "Confirmar via central o periferica antes de preparar"]
    };
  }
  return {
    continuousFluid: "Evitar aportes de fosforo",
    continuousRate: accessFluidRate(patient),
    text: `Liquidos continuos: suspender nutricion, suplementos o soluciones con fosforo. Mantener hidratacion solo si esta indicada clinicamente; si hay ERC, oliguria o producto Ca x P elevado (${safety.calciumPhosphorusProduct ?? "no calculado"}), restringir cargas y valorar quelante/nefrologia.`,
    controls: ["Revisar nutricion enteral/parenteral y suplementos", "Balance y funcion renal"]
  };
}

function calciumFluidPlan(patient, classification, safety) {
  if (classification.disorder.includes("Hipercalcemia")) {
    return {
      continuousFluid: "Solucion salina 0.9%",
      continuousRate: safety.hydrationRate,
      text: `Liquidos continuos: dejar solucion salina 0.9% a ${safety.hydrationRate} cc/h por bomba si el estado clinico lo permite, ajustando por volemia, diuresis, creatinina y congestion. Suspender calcio, vitamina D, tiazidas y soluciones con calcio. Si hay sobrecarga, anuria o falla renal avanzada, no forzar hidratacion y valorar nefrologia.`,
      controls: ["Balance hidrico horario durante fase activa", "Reevaluar tasa de SSN en 6 horas"]
    };
  }

  return {
    continuousFluid: "Gluconato de calcio IV si sintomatica; calcio oral/infusion segun control",
    continuousRate: null,
    text: "Liquidos continuos: si hay sintomas importantes, administrar gluconato de calcio IV lento y considerar infusion de calcio segun protocolo si recurren sintomas o persiste calcio bajo. Usar dextrosa al 5% o solucion salina 0.9% como diluyente segun protocolo local y compatibilidad; corregir magnesio en paralelo.",
    controls: ["Vigilar extravasacion si calcio IV", "Repetir calcio ionizado/corregido antes de continuar infusion"]
  };
}

function classifySodium(patient, lab, calculations) {
  const sodium = number(calculations.sodiumCorrected) ?? number(lab.sodium);
  const neuro = activeList(patient.neurologicSymptoms || []).length > 0;
  if (sodium === null) return null;
  if (sodium < 120 && neuro) return { disorder: "Hiponatremia severa sintomatica", severity: "severa", priority: "critica" };
  if (sodium < 120) return { disorder: "Hiponatremia profunda sin signos neurologicos", severity: "profunda", priority: "alta" };
  if (sodium < 130) return { disorder: "Hiponatremia moderada", severity: "moderada", priority: "alta" };
  if (sodium < 135) return { disorder: "Hiponatremia leve", severity: "leve", priority: "moderada" };
  if (sodium > 155) return { disorder: "Hipernatremia severa", severity: "severa", priority: "alta" };
  if (sodium > 145) return { disorder: "Hipernatremia", severity: "moderada", priority: "alta" };
  return null;
}

function classifyPotassium(patient, lab, calculations) {
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

function classifyMagnesium(patient, lab) {
  const mg = number(lab.magnesium);
  if (mg === null) return null;
  const risk = hasAny(patient.cardiovascularSymptoms || [], ["arritmia", "qt_prolongado"]) || hasAny(patient.neurologicSymptoms || [], ["convulsion"]);
  if (mg < 1.2 || (mg < 1.6 && risk)) return { disorder: "Hipomagnesemia severa o sintomatica", severity: "severa", priority: "alta" };
  if (mg < 1.6) return { disorder: "Hipomagnesemia", severity: "moderada", priority: "moderada" };
  if (mg > 4) return { disorder: "Hipermagnesemia severa", severity: "severa", priority: "alta" };
  if (mg > 2.6) return { disorder: "Hipermagnesemia", severity: "moderada", priority: "moderada" };
  return null;
}

function classifyPhosphorus(patient, lab) {
  const p = number(lab.phosphorus);
  if (p === null) return null;
  const severeContext = patient.clinicalArea === "uci" || hasAny(patient.comorbidities || [], ["sindrome_realimentacion", "rabdomiolisis"]);
  if (p < 1 || (severeContext && p < 1.5)) return { disorder: "Hipofosfatemia severa", severity: "severa", priority: "alta" };
  if (p < 2.0) return { disorder: "Hipofosfatemia", severity: "moderada", priority: "moderada" };
  if (p > 6) return { disorder: "Hiperfosfatemia severa", severity: "severa", priority: "alta" };
  if (p > 4.5) return { disorder: "Hiperfosfatemia", severity: "moderada", priority: "moderada" };
  return null;
}

function classifyCalcium(patient, lab, calculations) {
  const ca = number(lab.calciumIonized) || calculations.calciumCorrected || number(lab.calciumTotal);
  if (ca === null) return null;
  const isIonized = Boolean(number(lab.calciumIonized));
  const value = Number(ca);
  const malignantContext = hasAny(patient.comorbidities || [], ["cancer_activo", "cancer_metastasico", "mieloma_multiple", "linfoma", "leucemia", "metastasis_oseas", "hipercalcemia_maligna_previa"]);
  if (!isIonized && malignantContext && value > 14) return { disorder: "Hipercalcemia maligna severa", severity: "severa", priority: "critica" };
  if (!isIonized && malignantContext && value >= 12) return { disorder: "Hipercalcemia maligna probable", severity: "moderada", priority: "alta" };
  if (!isIonized && value > 14) return { disorder: "Hipercalcemia severa", severity: "severa", priority: "critica" };
  if (!isIonized && value >= 12) return { disorder: "Hipercalcemia moderada", severity: "moderada", priority: "alta" };
  if (!isIonized && value > 10.5) return { disorder: "Hipercalcemia leve", severity: "leve", priority: "moderada" };
  if (!isIonized && value < 7.5) return { disorder: "Hipocalcemia severa", severity: "severa", priority: "alta" };
  if (!isIonized && value < 8.5) return { disorder: "Hipocalcemia", severity: "moderada", priority: "moderada" };
  return null;
}

function sodiumOrder(patient, lab, calculations, classification) {
  const alerts = [];
  const sodium = calculations.sodiumCorrected || lab.sodium;
  const highRisk = sodiumHighRisk(patient);
  const dailyLimit = 8;
  const correctionLimits = sodiumCorrectionLimits(dailyLimit);
  const missingData = sodiumMissingData(patient, lab);
  const safety = {
    sodiumMeasured: number(lab.sodium),
    sodiumCorrected: calculations.sodiumCorrected,
    totalBodyWater: calculations.totalBodyWater,
    maxCorrection24h: correctionLimits.max24h,
    maxCorrection12h: correctionLimits.max12h,
    maxCorrection8h: correctionLimits.max8h,
    maxCorrection4h: correctionLimits.max4h,
    highRiskOds: highRisk,
    targetInitialRise: classification.disorder === "Hiponatremia severa sintomatica" ? "4 a 6 mmol/L o mejoria neurologica" : "correccion gradual segun etiologia",
    estimated3PercentChangePerLiter: calculations.sodium3ChangePerLiter,
    estimated3PercentRateFor05: calculations.sodium3RateFor05
  };

  if (calculations.sodiumCorrected && lab.sodium && Math.abs(calculations.sodiumCorrected - Number(lab.sodium)) >= 3) {
    alerts.push(`Sodio corregido por glucosa: ${calculations.sodiumCorrected} mmol/L.`);
  }
  alerts.push(`Limite de recambio de sodio: no superar ${correctionLimits.max4h} mmol/L en 4 horas, ${correctionLimits.max8h} mmol/L en 8 horas, ${correctionLimits.max12h} mmol/L en 12 horas ni ${correctionLimits.max24h} mmol/L en 24 horas.`);
  if (highRisk) alerts.push(`Alto riesgo de desmielinizacion osmotica: usar limite mas conservador de ${correctionLimits.max24h} mmol/L en 24 horas.`);
  if (missingData.length) alerts.push(`Datos faltantes para mayor precision: ${missingData.join(", ")}.`);

  if (classification.disorder === "Hiponatremia severa sintomatica") {
    const continuousPlan = severeHyponatremiaContinuousPlan(patient, calculations, dailyLimit);
    const sodiumControl = number(sodium) < 129 ? "Sodio de control cada 6 horas durante fase activa" : "Sodio de control segun severidad";
    return makeOrder({
      ...classification,
      alerts: [...alerts, "Riesgo de edema cerebral y sobrecorreccion. Control estricto de sodio durante fase activa."],
      safety: { ...safety, ...infusionSafety(continuousPlan) },
      missingData,
      controls: ["Sodio al finalizar bolo o en 20 a 30 minutos", sodiumControl, "Diuresis, balance hidrico y estado neurologico continuo", ...continuousPlan.controls],
      text: `Paciente con sodio ${sodium} mmol/L y signos neurologicos. Administrar solucion salina hipertonica al 3% 150 cc IV en 20 minutos bajo monitorizacion clinica y neurologica estricta. Solicitar sodio serico de control al finalizar el bolo o en 20 a 30 minutos. Repetir bolo solo si persisten signos neurologicos severos o no se alcanza ascenso inicial esperado, evitando superar ${correctionLimits.max12h} mmol/L en 12 horas ni ${correctionLimits.max24h} mmol/L en 24 horas. Meta inicial: aumento de 4 a 6 mmol/L o mejoria neurologica suficiente. Liquidos continuos: ${continuousPlan.text} Luego continuar sodio de control cada 6 horas durante fase activa. Continuar vigilancia de diuresis, balance hidrico y estado neurologico.`,
      justification: `Se activa regla interna: sodio corregido menor de 120 mmol/L asociado a signos neurologicos. Limite aplicado: ${correctionLimits.max12h} mmol/L en 12 horas y ${correctionLimits.max24h} mmol/L en 24 horas.`
    });
  }

  if (classification.disorder === "Hiponatremia profunda sin signos neurologicos") {
    const continuousPlan = severeHyponatremiaContinuousPlan(patient, calculations, dailyLimit);
    return makeOrder({
      ...classification,
      alerts: [...alerts, "No se activa bolo automatico de NaCl 3% porque no hay signos neurologicos severos marcados."],
      safety: { ...safety, ...infusionSafety(continuousPlan) },
      missingData,
      controls: ["Sodio de control cada 6 horas durante fase activa", "Diuresis y balance hidrico", ...continuousPlan.controls],
      text: `Paciente con hiponatremia profunda sin signos neurologicos severos registrados. No administrar bolo automatico de solucion salina hipertonica al 3%. Confirmar tonicidad, volemia, medicamentos asociados, glucosa, osmolaridad serica/urinaria y sodio urinario si estan disponibles. Si se decide correccion activa, usar estrategia controlada con limite maximo de ${correctionLimits.max12h} mmol/L en 12 horas y ${correctionLimits.max24h} mmol/L en 24 horas. Liquidos continuos: ${continuousPlan.text} Solicitar sodio de control cada 6 horas o antes si aparece deterioro neurologico.`,
      justification: "Hiponatremia profunda sin criterio interno para bolo automatico; requiere etiologia y correccion controlada."
    });
  }

  if (classification.disorder.includes("Hiponatremia")) {
    const hypovolemic = patient.volumeStatus === "hipovolemico";
    const continuousPlan = severeHyponatremiaContinuousPlan(patient, calculations, dailyLimit);
    return makeOrder({
      ...classification,
      alerts: [...alerts, "No se activa solucion hipertonica automatica porque no cumple sodio menor de 120 con signos neurologicos."],
      safety: { ...safety, ...infusionSafety(continuousPlan) },
      missingData,
      controls: [...(number(sodium) < 129 ? ["Sodio de control cada 6 horas durante fase activa"] : ["Sodio de control segun severidad"]), "Repetir antes si hay deterioro clinico", "Vigilar diuresis acuosa subita", ...continuousPlan.controls],
      text: hypovolemic
        ? `Paciente con ${classification.disorder.toLowerCase()} y volemia hipovolemica marcada. Liquidos continuos: considerar solucion salina 0.9% a 100 cc/hora por bomba, ajustando segun presion arterial, diuresis, funcion renal, riesgo de sobrecarga y velocidad real de correccion. Control de sodio cada 6 horas o antes si hay deterioro. Evitar superar ${correctionLimits.max12h} mmol/L en 12 horas ni ${correctionLimits.max24h} mmol/L en 24 horas; reducir o suspender infusion si el ascenso es rapido.`
        : `Paciente con ${classification.disorder.toLowerCase()}. Evaluar volemia, osmolaridad serica, osmolaridad urinaria, sodio urinario, medicamentos asociados y etiologia probable. Liquidos continuos: ${continuousPlan.text} Definir restriccion hidrica, suspension de medicamentos o manejo especifico segun causa. Solicitar sodio de control cada 6 horas si Na menor de 129 o si se inicia intervencion activa.`,
      justification: "Hiponatremia sin criterio interno de emergencia neurologica por IonoMed."
    });
  }

  const freeWaterDeficit = calculations.totalBodyWater && sodium ? Math.round((calculations.totalBodyWater * ((Number(sodium) / 140) - 1)) * 10) / 10 : null;
  const hypernatremiaPlan = hypernatremiaFluidPlan(patient, sodium, calculations.totalBodyWater, freeWaterDeficit);
  return makeOrder({
    ...classification,
    alerts: [...alerts, "Corregir hipernatremia de forma gradual y segun tiempo de evolucion."],
    safety: { ...safety, freeWaterDeficitLiters: freeWaterDeficit, maxDecrease24h: 8, maxDecrease12h: 5, maxDecrease8h: 3, maxDecrease4h: 1.5, ...infusionSafety(hypernatremiaPlan) },
    missingData,
    controls: ["Sodio de control cada 6 horas durante correccion de agua libre", ...hypernatremiaPlan.controls],
    text: `Paciente con ${classification.disorder.toLowerCase()}. ${hypernatremiaPlan.text} Solicitar sodio de control cada 6 horas durante correccion de agua libre.`,
    justification: "Hipernatremia requiere reposicion de agua libre con vigilancia seriada."
  });
}

function potassiumMissingData(patient, lab) {
  const missing = [];
  if (number(lab.creatinine) === null) missing.push("creatinina / funcion renal");
  if (number(patient.urineOutputMlKgH) === null) missing.push("diuresis");
  if (number(lab.magnesium) === null) missing.push("magnesio");
  if (number(lab.glucose) === null && number(lab.potassium) > 5.5) missing.push("glucosa para insulinoterapia segura");
  if ((patient.cardiovascularSymptoms || []).length === 0 && (number(lab.potassium) > 5.5 || number(lab.potassium) < 3.0)) missing.push("ECG / sintomas cardiovasculares");
  return missing;
}

function potassiumSafety(patient, lab, calculations, classification) {
  const k = number(lab.potassium);
  const renalSevere = calculations.egfr !== null && calculations.egfr < 30;
  const oliguria = number(patient.urineOutputMlKgH) !== null && number(patient.urineOutputMlKgH) < 0.5;
  const anuria = hasAny(patient.comorbidities || [], ["anuria"]);
  const centralAccess = patient.venousAccess === "central";
  const midlineAccess = patient.venousAccess === "linea_media";
  const monitor = classification.priority === "critica";
  return {
    potassium: k,
    egfr: calculations.egfr,
    renalSevere,
    oliguria,
    anuria,
    centralAccess,
    midlineAccess,
    preferCentralAccess: k < 2,
    criticalCareRequired: k < 2 || k > 6.5,
    requiresEcg: k > 5.5 || k < 3.0 || monitor,
    requiresCardiacMonitoring: monitor || k < 2 || k > 6.5,
    peripheralMaxInfusionRateMlH: midlineAccess ? 70 : 50,
    centralMaxInfusionRateMlH: 100,
    peripheralMaxKclRate: 8,
    centralMaxKclRate: 20
  };
}

function potassiumOrder(patient, lab, calculations, classification) {
  const renalSevere = calculations.egfr !== null && calculations.egfr < 30;
  const k = number(lab.potassium);
  const missingData = potassiumMissingData(patient, lab);
  const safety = potassiumSafety(patient, lab, calculations, classification);
  const alerts = [];
  if (missingData.length) alerts.push(`Datos faltantes para mayor seguridad: ${missingData.join(", ")}.`);
  if (renalSevere) alerts.push("Funcion renal reducida: ajustar reposicion/eliminacion y vigilar acumulacion o recurrencia.");
  if (safety.oliguria || safety.anuria) alerts.push("Oliguria/anuria: evitar reposicion agresiva de potasio y considerar nefrologia si hiperkalemia.");
  if (k < 2) alerts.push("Hipokalemia menor de 2 mmol/L: preferir reposicion por via central y solicitar traslado a unidad de cuidados intensivos.");
  if (k > 6.5) alerts.push("Hiperkalemia mayor de 6.5 mmol/L: solicitar traslado a unidad de cuidados intensivos y monitorizacion electrocardiografica continua.");

  if (classification.disorder === "Hipokalemia severa") {
    const fluidPlan = potassiumFluidPlan(patient, classification, safety);
    const criticalHypokalemia = k < 2;
    const ecg = ecgRecommendation(classification.disorder);
    const potassiumControl = hypokalemiaControlText(k);
    return makeOrder({
      ...classification,
      alerts: ["Trastorno severo de potasio: requiere electrocardiograma y vigilancia clinica estrecha.", ...alerts],
      safety: { ...safety, requiresEcg: true, ...infusionSafety(fluidPlan) },
      missingData,
      controls: [...(criticalHypokalemia ? ["Solicitar traslado a unidad de cuidados intensivos", "Preferir via central para reposicion de potasio"] : []), ecg, potassiumControl, "Diuresis y funcion renal", ...fluidPlan.controls],
      text: `Paciente con hipokalemia severa (K ${k} mmol/L). ${ecg} ${criticalHypokalemia ? "Por potasio menor de 2 mmol/L, solicitar traslado a unidad de cuidados intensivos y preferir reposicion por via central. " : ""}${fluidPlan.text} Solicitar ${potassiumControl.toLowerCase()}. Corregir magnesio si esta bajo. Evitar reposicion agresiva si hay anuria, oliguria marcada o falla renal avanzada sin monitorizacion estrecha.`,
      justification: "Hipokalemia severa requiere reposicion IV y control temprano."
    });
  }
  if (classification.disorder.includes("Hipokalemia")) {
    const fluidPlan = potassiumFluidPlan(patient, classification, safety);
    const needsEcg = classification.severity === "moderada" || classification.severity === "severa";
    const ecg = needsEcg ? ecgRecommendation(classification.disorder) : null;
    const potassiumControl = hypokalemiaControlText(k);
    const oralText = classification.severity === "leve"
      ? "Si tolera via oral, administrar cloruro de potasio 40 mEq VO ahora y ajustar segun control. Si no tolera via oral, usar reposicion IV con bomba."
      : "No formular reposicion oral de potasio en hipokalemia moderada; usar reposicion IV con bomba segun via disponible y concentracion institucional.";
    return makeOrder({
      ...classification,
      alerts,
      safety: { ...safety, requiresEcg: safety.requiresEcg || needsEcg, ...infusionSafety(fluidPlan) },
      missingData,
      controls: [...(ecg ? [ecg] : []), potassiumControl, "Control mas temprano si sintomas o ECG anormal", ...fluidPlan.controls],
      text: `Paciente con ${classification.disorder.toLowerCase()} (K ${k} mmol/L). ${ecg ? `${ecg} ` : ""}${oralText} ${fluidPlan.text} Solicitar ${potassiumControl.toLowerCase()}, vigilar funcion renal y diuresis.`,
      justification: "La reposicion puede ser oral o IV segun tolerancia, severidad y contexto clinico."
    });
  }
  if (classification.disorder === "Hiperkalemia severa") {
    const fluidPlan = potassiumFluidPlan(patient, classification, safety);
    const ecg = ecgRecommendation(classification.disorder);
    const criticalHyperkalemia = k > 6.5;
    return makeOrder({
      ...classification,
      alerts: ["Emergencia arritmica potencial. Requiere ECG y monitorizacion electrocardiografica continua.", ...alerts],
      safety: { ...safety, requiresEcg: true, ...infusionSafety(fluidPlan) },
      missingData,
      controls: [...(criticalHyperkalemia ? ["Solicitar traslado a unidad de cuidados intensivos"] : []), ecg, "Monitorizacion electrocardiografica continua", "Glucometrias seriadas si se usa insulina", "Potasio de control en 1 hora", "Nuevo potasio en 2 a 4 horas si persiste riesgo", ...fluidPlan.controls],
      text: `Paciente con hiperkalemia severa (K ${k} mmol/L). ${criticalHyperkalemia ? "Por potasio mayor de 6.5 mmol/L, solicitar traslado a unidad de cuidados intensivos. " : ""}${ecg} Iniciar monitorizacion electrocardiografica continua. Suspender aportes de potasio y medicamentos hiperkalemiantes. ${fluidPlan.text} Si hay cambios electrocardiograficos o potasio criticamente elevado, administrar gluconato de calcio al 10% 10 cc IV lento en 5 a 10 minutos, repetir segun ECG y criterio medico. Administrar insulina cristalina 10 unidades IV con dextrosa segun glucemia y protocolo institucional. Solicitar glucometrias seriadas y potasio de control en 1 hora. Considerar beta agonista nebulizado, bicarbonato si acidosis metabolica significativa, diuretico si hay diuresis y valoracion por nefrologia para terapia de reemplazo renal si hay falla renal avanzada, anuria, recurrencia o ausencia de respuesta.`,
      justification: "Hiperkalemia severa requiere estabilizacion de membrana, redistribucion y eliminacion de potasio."
    });
  }
  const fluidPlan = potassiumFluidPlan(patient, classification, safety);
  const ecg = ["moderada", "severa"].includes(classification.severity) ? ecgRecommendation(classification.disorder) : null;
  return makeOrder({
    ...classification,
    alerts,
    safety: { ...safety, requiresEcg: safety.requiresEcg || Boolean(ecg), ...infusionSafety(fluidPlan) },
    missingData,
    controls: [...(ecg ? [ecg] : ["ECG si K mayor de 5.5 o comorbilidad cardiaca"]), "Potasio en 2 a 4 horas si se interviene", "Funcion renal y diuresis", ...fluidPlan.controls],
    text: `Paciente con ${classification.disorder.toLowerCase()} (K ${k} mmol/L). Suspender aportes de potasio y medicamentos hiperkalemiantes si aplica. ${ecg ? `${ecg} ` : "Tomar ECG si K mayor de 5.5 o comorbilidad cardiaca. "}${fluidPlan.text} Considerar medidas de redistribucion o eliminacion segun nivel de potasio, funcion renal, diuresis y contexto clinico. Solicitar potasio de control en 2 a 4 horas si se interviene activamente.`,
    justification: "Hiperkalemia no severa requiere ECG, retiro de factores agravantes y control seriado."
  });
}

function renalAndUrineSafety(patient, calculations) {
  const egfr = calculations.egfr;
  const renalSevere = egfr !== null && egfr < 30;
  const urine = number(patient.urineOutputMlKgH);
  return {
    egfr,
    renalSevere,
    oliguria: urine !== null && urine < 0.5,
    anuria: hasAny(patient.comorbidities || [], ["anuria"])
  };
}

function magnesiumOrder(patient, lab, calculations, classification) {
  const mg = number(lab.magnesium);
  const safety = {
    magnesium: mg,
    potassium: number(lab.potassium),
    calciumTotal: number(lab.calciumTotal),
    calciumIonized: number(lab.calciumIonized),
    requiresEcg: classification.disorder.includes("Hipomagnesemia") || classification.priority === "alta" || hasAny(patient.cardiovascularSymptoms || [], ["arritmia", "qt_prolongado"]),
    ...renalAndUrineSafety(patient, calculations)
  };
  const missingData = [];
  if (number(lab.creatinine) === null) missingData.push("creatinina / funcion renal");
  if (number(patient.urineOutputMlKgH) === null) missingData.push("diuresis");
  if (number(lab.potassium) === null) missingData.push("potasio");
  if (number(lab.calciumTotal) === null && number(lab.calciumIonized) === null) missingData.push("calcio");
  const alerts = [];
  if (missingData.length) alerts.push(`Datos faltantes para mayor seguridad: ${missingData.join(", ")}.`);
  if (safety.renalSevere || safety.oliguria || safety.anuria) alerts.push("Riesgo de acumulacion de magnesio: ajustar dosis y vigilar toxicidad.");
  if (safety.potassium !== null && safety.potassium < 3.5) alerts.push("Hipokalemia asociada: la hipomagnesemia puede impedir correccion adecuada del potasio.");

  if (classification.disorder.includes("Hipomagnesemia")) {
    const severe = classification.severity === "severa";
    const fluidPlan = magnesiumFluidPlan(patient, classification);
    const ecg = ecgRecommendation(classification.disorder);
    return makeOrder({
      ...classification,
      alerts,
      safety: { ...safety, ...infusionSafety(fluidPlan) },
      missingData,
      controls: severe
        ? [ecg, "Magnesio, potasio, calcio y creatinina en 4 a 6 horas", "Reflejos y frecuencia respiratoria si dosis repetidas", ...fluidPlan.controls]
        : [ecg, "Magnesio, potasio, calcio y creatinina en 6 a 12 horas si IV", "Control en 24 horas si manejo oral", ...fluidPlan.controls],
      text: severe
        ? `Paciente con hipomagnesemia severa o sintomatica (Mg ${mg} mg/dL). ${ecg} ${fluidPlan.text} Solicitar magnesio, potasio, calcio y creatinina de control en 4 a 6 horas.`
        : `Paciente con ${classification.disorder.toLowerCase()} (Mg ${mg} mg/dL). ${ecg} ${fluidPlan.text} Solicitar magnesio, potasio, calcio y creatinina de control segun severidad.`,
      justification: "El magnesio bajo puede perpetuar hipokalemia, hipocalcemia y riesgo arritmico."
    });
  }

  const fluidPlan = magnesiumFluidPlan(patient, classification);
  return makeOrder({
    ...classification,
    alerts: ["Vigilar toxicidad neuromuscular, respiratoria y cardiaca.", ...alerts],
    safety: { ...safety, ...infusionSafety(fluidPlan) },
    missingData,
    controls: ["Reflejos osteotendinosos", "Frecuencia respiratoria y presion arterial", "ECG", "Magnesio, creatinina y diuresis seriadas", ...fluidPlan.controls],
    text: `Paciente con hipermagnesemia (Mg ${mg} mg/dL). Suspender aportes de magnesio. ${fluidPlan.text} Monitorizar reflejos, presion arterial, frecuencia respiratoria, ECG, creatinina y diuresis. Si hay toxicidad clinica, considerar gluconato de calcio IV como antagonista fisiologico y valoracion por nefrologia para dialisis si falla renal avanzada, anuria o hipermagnesemia severa.`,
    justification: "La hipermagnesemia puede causar bloqueo neuromuscular, hipotension y trastornos de conduccion."
  });
}

function phosphorusOrder(patient, lab, calculations, classification) {
  const p = number(lab.phosphorus);
  const calcium = calculations.calciumCorrected || number(lab.calciumTotal);
  const calciumPhosphorusProduct = calcium && p ? Math.round(calcium * p * 10) / 10 : null;
  const safety = {
    phosphorus: p,
    calcium,
    calciumPhosphorusProduct,
    potassium: number(lab.potassium),
    magnesium: number(lab.magnesium),
    refeedingRisk: hasAny(patient.comorbidities || [], ["sindrome_realimentacion", "alcoholismo", "desnutricion"]),
    ...renalAndUrineSafety(patient, calculations)
  };
  const missingData = [];
  if (number(lab.creatinine) === null) missingData.push("creatinina / funcion renal");
  if (number(lab.calciumTotal) === null && number(lab.calciumIonized) === null) missingData.push("calcio");
  if (number(lab.magnesium) === null) missingData.push("magnesio");
  if (number(lab.potassium) === null) missingData.push("potasio");
  const alerts = [];
  if (missingData.length) alerts.push(`Datos faltantes para mayor seguridad: ${missingData.join(", ")}.`);
  if (safety.refeedingRisk) alerts.push("Riesgo de sindrome de realimentacion: controlar fosforo, magnesio y potasio estrechamente.");
  if (calciumPhosphorusProduct && calciumPhosphorusProduct > 55) alerts.push("Producto calcio-fosforo elevado: riesgo de calcificacion, evitar reposicion IV agresiva de fosforo.");
  if (safety.renalSevere) alerts.push("Funcion renal reducida: ajustar fosfato y valorar quelantes/nefrologia segun contexto.");

  if (classification.disorder.includes("Hipofosfatemia")) {
    const severe = classification.severity === "severa";
    const fluidPlan = phosphorusFluidPlan(patient, classification, safety);
    return makeOrder({
      ...classification,
      alerts: severe ? ["Vigilar hipocalcemia durante reposicion IV de fosforo.", ...alerts] : alerts,
      safety: { ...safety, ...infusionSafety(fluidPlan) },
      missingData,
      controls: severe
        ? ["Fosforo, calcio, potasio, magnesio y creatinina en 6 a 12 horas", "Vigilar debilidad, ventilacion y rabdomiolisis", ...fluidPlan.controls]
        : ["Fosforo, calcio, potasio, magnesio y creatinina en 24 horas", ...fluidPlan.controls],
      text: severe
        ? `Paciente con hipofosfatemia severa (P ${p} mg/dL). Considerar reposicion intravenosa de fosfato segun peso, severidad, funcion renal y protocolo institucional. ${fluidPlan.text} Administrar bajo monitorizacion y solicitar fosforo, calcio, potasio, magnesio y creatinina de control en 6 a 12 horas. Vigilar hipocalcemia y producto calcio-fosforo.`
        : `Paciente con ${classification.disorder.toLowerCase()} (P ${p} mg/dL). Si tolera via oral, administrar reposicion oral de fosforo segun disponibilidad institucional. ${fluidPlan.text} Solicitar fosforo, calcio, potasio, magnesio y creatinina de control en 24 horas. Evaluar riesgo de sindrome de realimentacion.`,
      justification: "El fosforo bajo puede asociarse a debilidad, falla respiratoria, rabdomiolisis y sindrome de realimentacion."
    });
  }
  const fluidPlan = phosphorusFluidPlan(patient, classification, safety);
  return makeOrder({
    ...classification,
    alerts,
    safety: { ...safety, ...infusionSafety(fluidPlan) },
    missingData,
    controls: ["Fosforo, calcio y creatinina en 12 a 24 horas", "Producto calcio-fosforo", "Valorar nefrologia si severa o ERC avanzada", ...fluidPlan.controls],
    text: `Paciente con hiperfosfatemia (P ${p} mg/dL). Suspender aportes de fosforo si aplica, ajustar nutricion, revisar funcion renal y considerar quelante de fosforo segun protocolo institucional. ${fluidPlan.text} Valorar nefrologia si hay falla renal avanzada, hiperfosfatemia severa o producto calcio-fosforo elevado.`,
    justification: "La hiperfosfatemia se relaciona con funcion renal y riesgo de calcificacion."
  });
}

function calciumOrder(patient, lab, calculations, classification) {
  const overloadRisk = hasAny(patient.comorbidities || [], ["falla_cardiaca", "edema_pulmonar", "erc", "anuria", "oliguria", "alto_riesgo_sobrecarga"]);
  const malignantContext = hasAny(patient.comorbidities || [], ["cancer_activo", "cancer_metastasico", "mieloma_multiple", "linfoma", "leucemia", "metastasis_oseas", "hipercalcemia_maligna_previa"]);
  const calcium = number(lab.calciumIonized) || calculations.calciumCorrected || number(lab.calciumTotal);
  const p = number(lab.phosphorus);
  const safety = {
    calcium,
    calciumCorrected: calculations.calciumCorrected,
    calciumIonized: number(lab.calciumIonized),
    phosphorus: p,
    magnesium: number(lab.magnesium),
    calciumPhosphorusProduct: calcium && p ? Math.round(calcium * p * 10) / 10 : null,
    overloadRisk,
    malignantContext,
    requiresEcg: true,
    requiresCardiacMonitoring: classification.disorder.includes("Hipocalcemia") && classification.severity === "severa",
    hydrationRate: overloadRisk ? 75 : 150,
    ...renalAndUrineSafety(patient, calculations)
  };
  const missingData = [];
  if (number(lab.albumin) === null && number(lab.calciumIonized) === null) missingData.push("albumina o calcio ionizado");
  if (number(lab.creatinine) === null) missingData.push("creatinina / funcion renal");
  if (number(lab.magnesium) === null) missingData.push("magnesio");
  if (number(lab.phosphorus) === null) missingData.push("fosforo");
  const alerts = [];
  if (missingData.length) alerts.push(`Datos faltantes para mayor seguridad: ${missingData.join(", ")}.`);
  if (overloadRisk) alerts.push("Riesgo de sobrecarga hidrica: hidratacion cautelosa y reevaluacion frecuente.");
  if (safety.renalSevere || safety.anuria) alerts.push("Funcion renal reducida/anuria: ajustar hidratacion y considerar nefrologia.");
  if (safety.magnesium !== null && safety.magnesium < 1.6) alerts.push("Hipomagnesemia asociada: puede perpetuar hipocalcemia.");

  if (classification.disorder.includes("Hipercalcemia maligna")) {
    const rate = safety.hydrationRate;
    const fluidPlan = calciumFluidPlan(patient, classification, safety);
    const ecg = ecgRecommendation(classification.disorder);
    return makeOrder({
      ...classification,
      alerts: ["Hipercalcemia maligna: urgencia oncologica, considerar antiresortivo y calcitonina si severa/sintomatica.", ...alerts],
      safety: { ...safety, ...infusionSafety(fluidPlan) },
      missingData,
      controls: ["Calcio corregido o ionizado, creatinina, fosforo, magnesio, potasio y sodio en 6 horas", ecg, "Balance hidrico y signos de congestion", "Valorar nefrologia/oncologia", ...fluidPlan.controls],
      text: `Paciente con ${classification.disorder.toLowerCase()} (Ca ${calcium} mg/dL). ${ecg} ${fluidPlan.text} Suspender calcio, vitamina D y tiazidas si aplica. Solicitar calcio corregido o ionizado, creatinina, fosforo, magnesio, potasio y sodio. Considerar denosumab o bisfosfonato IV segun funcion renal, exposicion previa y protocolo institucional. Si calcio corregido mayor de 14 mg/dL o hay sintomas neurologicos, considerar calcitonina transitoria. Valorar nefrologia si falla renal avanzada, anuria, sobrecarga o hipercalcemia refractaria.`,
      justification: "La hipercalcemia maligna requiere hidratacion, terapia antiresortiva y vigilancia renal/cardiovascular."
    });
  }
  if (classification.disorder.includes("Hipercalcemia")) {
    const rate = safety.hydrationRate;
    const fluidPlan = calciumFluidPlan(patient, classification, safety);
    const ecg = ecgRecommendation(classification.disorder);
    return makeOrder({
      ...classification,
      alerts,
      safety: { ...safety, ...infusionSafety(fluidPlan) },
      missingData,
      controls: ["Calcio corregido o ionizado, creatinina, fosforo y magnesio en 6 a 12 horas", ecg, "Balance hidrico", ...fluidPlan.controls],
      text: `Paciente con ${classification.disorder.toLowerCase()} (Ca ${calcium} mg/dL). ${ecg} ${fluidPlan.text} Solicitar calcio corregido o ionizado, creatinina, fosforo, magnesio, potasio, sodio y PTH segun contexto.`,
      justification: "La hipercalcemia requiere confirmar calcio corregido/ionizado, tratar causa y vigilar funcion renal."
    });
  }
  const fluidPlan = calciumFluidPlan(patient, classification, safety);
  const ecg = ecgRecommendation(classification.disorder);
  const severeHypocalcemia = classification.disorder.includes("Hipocalcemia") && classification.severity === "severa";
  return makeOrder({
    ...classification,
    alerts,
    safety: { ...safety, ...infusionSafety(fluidPlan) },
    missingData,
    controls: ["Calcio ionizado o corregido en 4 a 6 horas si sintomatica", "Magnesio, fosforo, creatinina, PTH/vitamina D segun contexto", ecg, ...(severeHypocalcemia ? ["Monitorizacion electrocardiografica continua"] : []), ...fluidPlan.controls],
    text: `Paciente con ${classification.disorder.toLowerCase()} (Ca ${calcium} mg/dL). ${ecg} ${severeHypocalcemia ? "Iniciar monitorizacion electrocardiografica continua. " : ""}Si hay tetania, convulsiones, QT prolongado, laringoespasmo o sintomas neuromusculares importantes, administrar gluconato de calcio al 10% 10 cc IV lento en 10 minutos bajo monitorizacion. ${fluidPlan.text} Solicitar calcio ionizado, magnesio, fosforo, creatinina, PTH y vitamina D segun contexto. Corregir magnesio si esta bajo y definir reposicion oral o infusion segun respuesta clinica y control de calcio.`,
    justification: "La hipocalcemia sintomatica puede requerir calcio IV inmediato y correccion de magnesio."
  });
}

export function evaluateClinicalCase({ patient, lab, settings = {} }) {
  const calculations = calculateAll({ patient, lab, settings });
  const classifications = [
    classifyPotassium(patient, lab, calculations),
    classifySodium(patient, lab, calculations),
    classifyCalcium(patient, lab, calculations),
    classifyMagnesium(patient, lab, calculations),
    classifyPhosphorus(patient, lab, calculations)
  ].filter(Boolean);

  const priorityWeight = { critica: 1, alta: 2, moderada: 3, leve: 4, baja: 5 };
  classifications.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);

  const orders = classifications.map((classification) => {
    if (classification.disorder.includes("natremia")) return sodiumOrder(patient, lab, calculations, classification);
    if (classification.disorder.includes("kalemia")) return potassiumOrder(patient, lab, calculations, classification);
    if (classification.disorder.includes("magnes")) return magnesiumOrder(patient, lab, calculations, classification);
    if (classification.disorder.includes("fosf")) return phosphorusOrder(patient, lab, calculations, classification);
    return calciumOrder(patient, lab, calculations, classification);
  });

  const globalAlerts = [];
  if (calculations.egfr !== null && calculations.egfr < 30) globalAlerts.push("TFG menor de 30: ajustar reposiciones y evitar cargas agresivas sin vigilancia estrecha.");
  if (activeList(patient.neurologicSymptoms || []).length > 0) globalAlerts.push("Signos neurologicos presentes: priorizar valoracion clinica inmediata.");
  if ((patient.comorbidities || []).includes("alto_riesgo_sobrecarga") || (patient.comorbidities || []).includes("falla_cardiaca")) globalAlerts.push("Riesgo de sobrecarga hidrica: ajustar cristaloides y vigilar congestion.");

  return { calculations, classifications, orders, globalAlerts };
}
