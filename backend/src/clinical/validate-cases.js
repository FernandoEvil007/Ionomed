import { evaluateClinicalCase } from "./engine.js";

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
    expect: "Hipernatremia"
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
    name: "Hipofosfatemia con riesgo de realimentacion",
    patient: { ...basePatient, comorbidities: ["sindrome_realimentacion"] },
    lab: { phosphorus: 1.1, potassium: 3.4, magnesium: 1.7, calciumTotal: 8.5, creatinine: 0.9 },
    expect: "Hipofosfatemia"
  },
  {
    name: "Hipocalcemia severa",
    patient: basePatient,
    lab: { calciumTotal: 6.8, albumin: 4, magnesium: 1.9, phosphorus: 3.5, creatinine: 0.9 },
    expect: "Hipocalcemia"
  },
  {
    name: "Hipercalcemia maligna",
    patient: { ...basePatient, comorbidities: ["cancer_metastasico"] },
    lab: { calciumTotal: 14.8, albumin: 4, phosphorus: 3.2, magnesium: 2, creatinine: 1 },
    expect: "Hipercalcemia"
  }
];

let failures = 0;

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
  } else {
    console.log(`OK: ${clinicalCase.name}`);
  }
}

if (failures) {
  process.exit(1);
}
