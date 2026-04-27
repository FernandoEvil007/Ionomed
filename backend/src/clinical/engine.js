import { calculateAll } from "./calculations.js";

function hasAny(list = [], values = []) {
  return values.some((v) => list.includes(v));
}

function number(v) {
  return v === undefined || v === null || v === "" ? null : Number(v);
}

function makeOrder({ disorder, severity, priority, text, alerts = [], justification = "" }) {
  return { disorder, severity, priority, suggestedText: text, alerts, justification };
}

function classifySodium(patient, lab) {
  const sodium = number(lab.sodium);
  const neuro = (patient.neurologicSymptoms || []).length > 0;
  if (sodium === null) return null;
  if (sodium < 120 && neuro) return { disorder: "Hiponatremia severa sintomática", severity: "severa", priority: "critica" };
  if (sodium < 120) return { disorder: "Hiponatremia profunda sin signos neurológicos", severity: "profunda", priority: "alta" };
  if (sodium < 130) return { disorder: "Hiponatremia moderada", severity: "moderada", priority: "alta" };
  if (sodium < 135) return { disorder: "Hiponatremia leve", severity: "leve", priority: "moderada" };
  if (sodium > 155) return { disorder: "Hipernatremia severa", severity: "severa", priority: "alta" };
  if (sodium > 145) return { disorder: "Hipernatremia", severity: "moderada", priority: "alta" };
  return null;
}

function classifyPotassium(patient, lab, calculations) {
  const k = number(lab.potassium);
  if (k === null) return null;
  const ecgRisk = hasAny(patient.cardiovascularSymptoms || [], ["arritmia", "cambios_ecg", "debilidad_muscular"]);
  const renalAdvanced = calculations.egfr !== null && calculations.egfr < 30;
  if (k < 2.5 || ecgRisk) return { disorder: "Hipokalemia severa", severity: "severa", priority: "critica" };
  if (k < 3.0) return { disorder: "Hipokalemia moderada", severity: "moderada", priority: "alta" };
  if (k < 3.5) return { disorder: "Hipokalemia leve", severity: "leve", priority: "moderada" };
  if (k > 6.0 || ecgRisk || (k > 5.6 && renalAdvanced)) return { disorder: "Hiperkalemia severa", severity: "severa", priority: "critica" };
  if (k > 5.5) return { disorder: "Hiperkalemia moderada", severity: "moderada", priority: "alta" };
  if (k > 5.0) return { disorder: "Hiperkalemia leve", severity: "leve", priority: "moderada" };
  return null;
}

function classifyMagnesium(patient, lab) {
  const mg = number(lab.magnesium);
  if (mg === null) return null;
  const risk = hasAny(patient.cardiovascularSymptoms || [], ["arritmia", "qt_prolongado"]) || hasAny(patient.neurologicSymptoms || [], ["convulsion"]);
  if (mg < 1.2 || risk) return { disorder: "Hipomagnesemia severa o sintomática", severity: "severa", priority: "alta" };
  if (mg < 1.6) return { disorder: "Hipomagnesemia", severity: "moderada", priority: "moderada" };
  if (mg > 4) return { disorder: "Hipermagnesemia severa", severity: "severa", priority: "alta" };
  if (mg > 2.6) return { disorder: "Hipermagnesemia", severity: "moderada", priority: "moderada" };
  return null;
}

function classifyPhosphorus(patient, lab) {
  const p = number(lab.phosphorus);
  if (p === null) return null;
  const severeContext = patient.clinicalArea === "uci" || hasAny(patient.comorbidities || [], ["sindrome_realimentacion", "rabdomiolisis"]);
  if (p < 1 || severeContext && p < 1.5) return { disorder: "Hipofosfatemia severa", severity: "severa", priority: "alta" };
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
  if (classification.disorder === "Hiponatremia severa sintomática") {
    alerts.push("Riesgo de edema cerebral y sobrecorrección. Control estricto de sodio durante fase activa.");
    return makeOrder({
      ...classification,
      alerts,
      text: `Paciente con sodio sérico ${sodium} mmol/L y signos neurológicos. Administrar solución salina hipertónica al 3% 150 cc IV en 20 minutos bajo monitorización clínica y neurológica estricta. Solicitar sodio sérico de control al finalizar el bolo o en 20 a 30 minutos. Repetir bolo si persisten signos neurológicos severos o no se alcanza ascenso inicial esperado, evitando sobrecorrección. Continuar control de sodio cada 2 a 4 horas durante fase activa, vigilancia de diuresis, balance hídrico y estado neurológico.`,
      justification: "Se activa regla interna de IonoMed: sodio menor de 120 mmol/L asociado a signos neurológicos."
    });
  }

  if (classification.disorder.includes("Hiponatremia")) {
    return makeOrder({
      ...classification,
      alerts: ["No se activa solución hipertónica automática porque no cumple sodio menor de 120 con signos neurológicos."],
      text: `Paciente con ${classification.disorder.toLowerCase()}. No se genera orden automática de solución salina hipertónica al 3%. Evaluar volemia, osmolaridad sérica, osmolaridad urinaria, sodio urinario, medicamentos asociados y etiología probable. Si el contexto es hipovolémico, considerar solución salina 0.9% a 100 a 150 cc/hora por bomba de infusión, ajustando según volemia, diuresis, presión arterial, función renal y riesgo de sobrecarga. Solicitar sodio de control en 6 a 8 horas si se inicia corrección activa, o antes si hay deterioro clínico.`,
      justification: "Hiponatremia sin criterio interno de emergencia neurológica por IonoMed."
    });
  }

  return makeOrder({
    ...classification,
    alerts: ["Corregir hipernatremia de forma gradual y según tiempo de evolución."],
    text: `Paciente con ${classification.disorder.toLowerCase()}. Calcular déficit de agua libre y definir reposición con agua libre enteral o dextrosa al 5% IV según estado clínico, volemia, vía oral y función renal. Iniciar corrección controlada evitando descensos rápidos del sodio. Solicitar sodio de control cada 6 a 8 horas durante fase activa y vigilar diuresis, balance hídrico y estado neurológico.`,
    justification: "Hipernatremia requiere reposición de agua libre con vigilancia seriada."
  });
}

function potassiumOrder(patient, lab, calculations, classification) {
  const renalSevere = calculations.egfr !== null && calculations.egfr < 30;
  if (classification.disorder === "Hipokalemia severa") {
    return makeOrder({
      ...classification,
      alerts: renalSevere ? ["Función renal reducida: aumentar vigilancia y evitar reposición agresiva sin monitorización."] : [],
      text: `Paciente con hipokalemia severa. Administrar cloruro de potasio 20 mEq IV diluidos en 100 cc de solución salina 0.9%, pasar por bomba de infusión a 10 mEq/hora por vía periférica. Si existe acceso central y monitorización cardíaca, ajustar velocidad según protocolo institucional. Solicitar potasio y magnesio sérico de control en 4 a 6 horas. Corregir magnesio si está bajo. Vigilar diuresis, función renal y ECG si hay síntomas o arritmia.`,
      justification: "Hipokalemia severa requiere reposición IV y control temprano."
    });
  }
  if (classification.disorder.includes("Hipokalemia")) {
    return makeOrder({
      ...classification,
      text: `Paciente con ${classification.disorder.toLowerCase()}. Si tolera vía oral, administrar cloruro de potasio 40 mEq VO ahora y ajustar según control. Si no tolera vía oral o requiere corrección más rápida, usar reposición IV con bomba. Solicitar potasio y magnesio de control en 6 a 12 horas, vigilar función renal y diuresis.`,
      justification: "La reposición puede ser oral o IV según tolerancia, severidad y contexto clínico."
    });
  }
  if (classification.disorder === "Hiperkalemia severa") {
    return makeOrder({
      ...classification,
      alerts: ["Emergencia arrítmica potencial. Requiere ECG y monitorización."],
      text: `Paciente con hiperkalemia severa. Tomar ECG inmediato e iniciar monitorización cardíaca continua. Suspender aportes de potasio y medicamentos hiperkalemiantes. Si hay cambios electrocardiográficos o potasio críticamente elevado, administrar gluconato de calcio al 10% 10 cc IV lento en 5 a 10 minutos, repetir según ECG y criterio médico. Administrar insulina cristalina 10 unidades IV con dextrosa según glucemia y protocolo institucional. Solicitar glucometrías seriadas y potasio de control en 1 hora. Considerar beta agonista nebulizado, bicarbonato si acidosis metabólica significativa, diurético si hay diuresis y valoración por nefrología para terapia de reemplazo renal si hay falla renal avanzada, anuria, recurrencia o ausencia de respuesta.`,
      justification: "Hiperkalemia severa requiere estabilización de membrana, redistribución y eliminación de potasio."
    });
  }
  return makeOrder({
    ...classification,
    text: `Paciente con ${classification.disorder.toLowerCase()}. Suspender aportes de potasio y medicamentos hiperkalemiantes si aplica. Tomar ECG. Considerar medidas de redistribución o eliminación según nivel de potasio, función renal, diuresis y contexto clínico. Solicitar potasio de control en 2 a 4 horas si se interviene activamente.`,
    justification: "Hiperkalemia no severa requiere ECG, retiro de factores agravantes y control seriado."
  });
}

function magnesiumOrder(patient, lab, calculations, classification) {
  if (classification.disorder.includes("Hipomagnesemia")) {
    const renalAlert = calculations.egfr !== null && calculations.egfr < 30 ? " Ajustar dosis por función renal reducida y vigilar acumulación." : "";
    return makeOrder({
      ...classification,
      alerts: renalAlert ? [renalAlert.trim()] : [],
      text: `Paciente con ${classification.disorder.toLowerCase()}. Administrar sulfato de magnesio 2 gramos IV diluidos en 100 cc de solución salina 0.9%, pasar en 1 hora. Solicitar magnesio, potasio, calcio y creatinina de control en 6 a 12 horas si reposición IV. Corregir hipokalemia o hipocalcemia asociada según controles.${renalAlert}`,
      justification: "La hipomagnesemia puede perpetuar hipokalemia e incrementar riesgo arrítmico."
    });
  }
  return makeOrder({
    ...classification,
    alerts: ["Vigilar toxicidad neuromuscular y respiratoria, especialmente con falla renal."],
    text: `Paciente con hipermagnesemia. Suspender aportes de magnesio. Monitorizar reflejos, presión arterial, frecuencia respiratoria, ECG, creatinina y diuresis. Si hay toxicidad clínica, considerar gluconato de calcio IV como antagonista fisiológico y valoración por nefrología para diálisis si falla renal avanzada o hipermagnesemia severa.`,
    justification: "La hipermagnesemia puede causar bloqueo neuromuscular, hipotensión y trastornos de conducción."
  });
}

function phosphorusOrder(patient, lab, calculations, classification) {
  if (classification.disorder.includes("Hipofosfatemia")) {
    const severe = classification.severity === "severa";
    return makeOrder({
      ...classification,
      alerts: severe ? ["Vigilar hipocalcemia durante reposición IV de fósforo."] : [],
      text: severe
        ? `Paciente con hipofosfatemia severa. Considerar reposición intravenosa de fosfato según peso, severidad, función renal y protocolo institucional. Administrar bajo monitorización. Solicitar fósforo, calcio, potasio, magnesio y creatinina de control en 6 a 12 horas. Vigilar hipocalcemia y producto calcio-fósforo.`
        : `Paciente con hipofosfatemia leve/moderada. Si tolera vía oral, administrar reposición oral de fósforo según disponibilidad institucional. Solicitar fósforo, calcio, potasio, magnesio y creatinina de control en 24 horas. Evaluar riesgo de síndrome de realimentación.`,
      justification: "El fósforo severamente bajo puede asociarse a debilidad, falla respiratoria y rabdomiólisis."
    });
  }
  return makeOrder({
    ...classification,
    text: `Paciente con hiperfosfatemia. Suspender aportes de fósforo si aplica, ajustar nutrición, revisar función renal y considerar quelante de fósforo según protocolo institucional. Valorar nefrología si hay falla renal avanzada, hiperfosfatemia severa o producto calcio-fósforo elevado.`,
    justification: "La hiperfosfatemia se relaciona con función renal y riesgo de calcificación."
  });
}

function calciumOrder(patient, lab, calculations, classification) {
  const overloadRisk = hasAny(patient.comorbidities || [], ["falla_cardiaca", "edema_pulmonar", "erc", "anuria", "oliguria", "alto_riesgo_sobrecarga"]);
  if (classification.disorder.includes("Hipercalcemia maligna")) {
    const rate = overloadRisk ? 75 : 150;
    return makeOrder({
      ...classification,
      alerts: overloadRisk ? ["Riesgo de sobrecarga hídrica: hidratación cautelosa y reevaluación frecuente."] : ["Hipercalcemia maligna: considerar antiresortivo y control estrecho."],
      text: `Paciente con ${classification.disorder.toLowerCase()}. Iniciar solución salina 0.9% a ${rate} cc/hora por bomba de infusión, reevaluando volemia, presión arterial, diuresis, balance hídrico, creatinina y signos de congestión en 6 horas. Suspender aportes de calcio, vitamina D y tiazidas si aplica. Solicitar calcio corregido o calcio ionizado, creatinina, fósforo, magnesio, potasio, sodio y ECG. Considerar denosumab o bisfosfonato IV según función renal, disponibilidad, exposición previa y protocolo institucional. Si calcio corregido mayor de 14 mg/dL o hay síntomas neurológicos, considerar calcitonina como terapia transitoria de inicio rápido. Valorar nefrología si hay falla renal avanzada, anuria, sobrecarga, hipercalcemia refractaria o necesidad de diálisis.`,
      justification: "La hipercalcemia maligna requiere hidratación, terapia antiresortiva y vigilancia renal/cardiovascular."
    });
  }
  if (classification.disorder.includes("Hipercalcemia")) {
    const rate = overloadRisk ? 75 : 150;
    return makeOrder({
      ...classification,
      alerts: overloadRisk ? ["Ajustar hidratación por riesgo de sobrecarga."] : [],
      text: `Paciente con ${classification.disorder.toLowerCase()}. Iniciar hidratación con solución salina 0.9% a ${rate} cc/hora por bomba de infusión, ajustar según volemia, función renal, diuresis y riesgo de sobrecarga. Suspender calcio, vitamina D y tiazidas si aplica. Solicitar calcio corregido o ionizado, creatinina, fósforo, magnesio, potasio, sodio y PTH según contexto.`,
      justification: "La hipercalcemia requiere confirmar calcio corregido/ionizado y tratar causa."
    });
  }
  return makeOrder({
    ...classification,
    text: `Paciente con ${classification.disorder.toLowerCase()}. Si hay tetania, convulsiones, QT prolongado, laringoespasmo o síntomas neuromusculares importantes, administrar gluconato de calcio al 10% 10 cc IV lento en 10 minutos bajo monitorización. Solicitar calcio ionizado, magnesio, fósforo, creatinina, PTH y vitamina D según contexto. Corregir magnesio si está bajo y definir reposición oral o infusión según respuesta clínica y control de calcio.`,
    justification: "La hipocalcemia sintomática puede requerir calcio IV inmediato y corrección de magnesio."
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

  const priorityWeight = { critica: 1, alta: 2, moderada: 3, baja: 4 };
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
  if ((patient.neurologicSymptoms || []).length > 0) globalAlerts.push("Signos neurológicos presentes: priorizar valoración clínica inmediata.");
  if ((patient.comorbidities || []).includes("alto_riesgo_sobrecarga") || (patient.comorbidities || []).includes("falla_cardiaca")) globalAlerts.push("Riesgo de sobrecarga hídrica: ajustar cristaloides y vigilar congestión.");

  return { calculations, classifications, orders, globalAlerts };
}
