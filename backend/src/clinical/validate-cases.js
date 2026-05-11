import { evaluateClinicalCase } from "./engine.js";
import { evaluationPatientSchema, labSchema } from "./inputSchemas.js";

const basePatient = {
  nameOrCode: "Caso prueba",
  age: 60,
  sex: "male",
  weightKg: 70,
  volumeStatus: "euvolemico",
  oralRouteAvailable: true,
  venousAccess: "central",
  urineOutputMlKgH: 0.8,
  comorbidities: [],
  medications: [],
  neurologicSymptoms: [],
  cardiovascularSymptoms: []
};

const cases = [
  {
    name: "Hiponatremia severa sintomatica",
    patient: { ...basePatient, neurologicSymptoms: ["confusion"] },
    lab: { sodium: 110, glucose: 100, creatinine: 0.8 },
    expect: "Hiponatremia"
  },
  {
    name: "Hiponatremia hipovolemica con SSN 0.9",
    patient: { ...basePatient, volumeStatus: "hipovolemico" },
    lab: { sodium: 122, glucose: 95, creatinine: 1 },
    expect: "Hiponatremia"
  },
  {
    name: "Hipernatremia con deficit de agua libre",
    patient: basePatient,
    lab: { sodium: 156, glucose: 100, creatinine: 0.9 },
    expect: "Hipernatremia moderada"
  },
  {
    name: "Hipernatremia leve",
    patient: basePatient,
    lab: { sodium: 148, glucose: 100, creatinine: 0.9 },
    expect: "Hipernatremia leve"
  },
  {
    name: "Hipernatremia severa desde 160",
    patient: basePatient,
    lab: { sodium: 160, glucose: 100, creatinine: 0.9 },
    expect: "Hipernatremia severa"
  },
  {
    name: "Hipokalemia menor de 2",
    patient: basePatient,
    lab: { potassium: 1.8, magnesium: 1.8, creatinine: 0.9 },
    expect: "Hipokalemia",
    expectSafety: { potassiumBasalMeq: 140, potassiumDeficitMeq: 21, potassiumTotalReplacementMeq: 161 }
  },
  {
    name: "Hipokalemia moderada central",
    patient: basePatient,
    lab: { potassium: 2.4, magnesium: 1.9, creatinine: 0.9 },
    expect: "Hipokalemia",
    expectSafety: { potassiumBasalMeq: 140, potassiumDeficitMeq: 21, potassiumTotalReplacementMeq: 161 }
  },
  {
    name: "Hipokalemia leve con calculo basal",
    patient: basePatient,
    lab: { potassium: 3.3, magnesium: 1.9, creatinine: 0.9 },
    expect: "Hipokalemia",
    expectSafety: { potassiumBasalMeq: 70, potassiumDeficitMeq: 4, potassiumTotalReplacementMeq: 74 }
  },
  {
    name: "Hipokalemia con hipernatremia usa dextrosa",
    patient: { ...basePatient, venousAccess: "periferico" },
    lab: { sodium: 152, potassium: 2.8, magnesium: 1.9, creatinine: 0.9 },
    expect: "Hipokalemia",
    expectText: "DAD 5%"
  },
  {
    name: "Hiperkalemia mayor de 6.5",
    patient: basePatient,
    lab: { potassium: 6.8, creatinine: 1.1 },
    expect: "Hiperkalemia"
  },
  {
    name: "Hipomagnesemia",
    patient: basePatient,
    lab: { magnesium: 1.1, potassium: 3.1, calciumTotal: 8.2, creatinine: 0.9 },
    expect: "Hipomagnesemia"
  },
  {
    name: "Hipomagnesemia leve",
    patient: basePatient,
    lab: { magnesium: 1.6, creatinine: 0.9 },
    expect: "Hipomagnesemia leve"
  },
  {
    name: "Hipermagnesemia severa",
    patient: basePatient,
    lab: { magnesium: 12.5, creatinine: 2.2 },
    expect: "Hipermagnesemia severa"
  },
  {
    name: "Hipofosfatemia con riesgo de realimentacion",
    patient: { ...basePatient, comorbidities: ["sindrome_realimentacion"] },
    lab: { phosphorus: 1.1, potassium: 3.4, magnesium: 1.7, calciumTotal: 8.5, creatinine: 0.9 },
    expect: "Hipofosfatemia"
  },
  {
    name: "Hipofosfatemia leve",
    patient: basePatient,
    lab: { phosphorus: 2.3, creatinine: 0.9 },
    expect: "Hipofosfatemia leve"
  },
  {
    name: "Hiperfosfatemia severa",
    patient: basePatient,
    lab: { phosphorus: 7.2, creatinine: 2.1 },
    expect: "Hiperfosfatemia severa"
  },
  {
    name: "Hipocalcemia severa",
    patient: basePatient,
    lab: { calciumTotal: 6.8, albumin: 4, magnesium: 1.9, phosphorus: 3.5, creatinine: 0.9 },
    expect: "Hipocalcemia"
  },
  {
    name: "Hipocalcemia leve",
    patient: basePatient,
    lab: { calciumTotal: 8.3, albumin: 4, creatinine: 0.9 },
    expect: "Hipocalcemia leve"
  },
  {
    name: "Hipercalcemia severa desde 14",
    patient: basePatient,
    lab: { calciumTotal: 14, albumin: 4, phosphorus: 3.2, magnesium: 2, creatinine: 1 },
    expect: "Hipercalcemia severa"
  },
  {
    name: "Hipercalcemia maligna",
    patient: { ...basePatient, comorbidities: ["cancer_metastasico"] },
    lab: { calciumTotal: 14.8, albumin: 4, phosphorus: 3.2, magnesium: 2, creatinine: 1 },
    expect: "Hipercalcemia"
  }
];

let failures = 0;

const gasCases = [
  {
    name: "Gasometria detecta acidosis metabolica con compensacion apropiada",
    lab: { ph: 7.25, pco2: 26, bicarbonate: 12, sodium: 140, chloride: 105, lactate: 5, albumin: 4, po2: 80, fio2: 21 },
    expectPrimary: "acidosis metabolica",
    expectCompensation: "apropiada",
    expectOrder: "Acidosis metabolica gasometrica"
  },
  {
    name: "Gasometria detecta trastorno mixto metabolico y respiratorio",
    lab: { ph: 7.12, pco2: 55, bicarbonate: 17, sodium: 138, chloride: 100, albumin: 3, po2: 70, fio2: 40 },
    expectPrimary: "trastorno mixto",
    expectOrder: "Alteracion de oxigenacion gasometrica"
  }
];

const schemaCases = [
  {
    name: "Schema rechaza sodio incompatible con vida",
    ok: !labSchema.safeParse({ sodium: 15 }).success
  },
  {
    name: "Schema rechaza potasio extremo",
    ok: !labSchema.safeParse({ potassium: 42 }).success
  },
  {
    name: "Schema no convierte campos vacios en cero",
    ok: labSchema.safeParse({ sodium: "", potassium: "", creatinine: "" }).success
  },
  {
    name: "Schema permite evaluacion preliminar sin paciente guardado",
    ok: evaluationPatientSchema.safeParse({ age: "", weightKg: 70, sex: "male" }).success
  }
];

for (const schemaCase of schemaCases) {
  if (!schemaCase.ok) {
    failures += 1;
    console.error(`FALLO: ${schemaCase.name}`);
  } else {
    console.log(`OK: ${schemaCase.name}`);
  }
}

for (const gasCase of gasCases) {
  const evaluation = evaluateClinicalCase({
    patient: basePatient,
    lab: gasCase.lab,
    settings: {}
  });
  const gas = evaluation.calculations.arterialGas;
  const primaryOk = gas?.primaryDisorder?.includes(gasCase.expectPrimary);
  const compensationOk = !gasCase.expectCompensation || gas?.compensationAssessment?.includes(gasCase.expectCompensation);
  const orderOk = !gasCase.expectOrder || evaluation.orders.some((order) => order.disorder === gasCase.expectOrder);
  if (!primaryOk || !compensationOk || !orderOk) {
    failures += 1;
    console.error(`FALLO: ${gasCase.name}. Recibido: ${gas?.primaryDisorder || "sin gas"} / ${gas?.compensationAssessment || "sin compensacion"}`);
  } else {
    console.log(`OK: ${gasCase.name}`);
  }
}

for (const clinicalCase of cases) {
  const evaluation = evaluateClinicalCase({
    patient: clinicalCase.patient,
    lab: clinicalCase.lab,
    settings: {}
  });
  const matched = evaluation.orders.some((order) => order.disorder.includes(clinicalCase.expect));
  if (!matched) {
    failures += 1;
    console.error(`FALLO: ${clinicalCase.name}. Esperado: ${clinicalCase.expect}`);
    continue;
  }
  if (clinicalCase.expectSafety) {
    const order = evaluation.orders.find((item) => item.disorder.includes(clinicalCase.expect));
    const safety = order?.safety || {};
    const mismatches = Object.entries(clinicalCase.expectSafety).filter(([key, value]) => safety[key] !== value);
    if (mismatches.length) {
      failures += 1;
      console.error(`FALLO: ${clinicalCase.name}. Seguridad esperada no coincide: ${mismatches.map(([key, value]) => `${key}=${value}, recibido ${safety[key]}`).join("; ")}`);
      continue;
    }
    console.log(`OK: ${clinicalCase.name}`);
  } else if (clinicalCase.expectText) {
    const order = evaluation.orders.find((item) => item.disorder.includes(clinicalCase.expect));
    const text = `${order?.suggestedText || ""} ${order?.safety?.selectedInfusion || ""}`;
    if (!text.includes(clinicalCase.expectText)) {
      failures += 1;
      console.error(`FALLO: ${clinicalCase.name}. Texto esperado no encontrado: ${clinicalCase.expectText}`);
      continue;
    }
    console.log(`OK: ${clinicalCase.name}`);
  } else {
    console.log(`OK: ${clinicalCase.name}`);
  }
}

if (failures) {
  process.exit(1);
}
