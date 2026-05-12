import { z } from "zod";

function optionalText() {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().optional()
  );
}

function optionalClinicalNumber(label, min, max) {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number({ invalid_type_error: `${label} debe ser numerico` })
      .finite(`${label} debe ser finito`)
      .min(min, `${label} esta por debajo del rango clinico admitido`)
      .max(max, `${label} esta por encima del rango clinico admitido`)
      .optional()
  );
}

export const patientSchema = z.object({
  localIdentifier: optionalText(),
  nameOrCode: z.string().trim().min(1),
  age: optionalClinicalNumber("Edad", 0, 120),
  sex: z.enum(["male", "female"]).default("male"),
  weightKg: optionalClinicalNumber("Peso", 1, 350),
  heightCm: optionalClinicalNumber("Talla", 30, 250),
  clinicalArea: z.enum(["urgencias", "hospitalizacion", "uci", "ambulatorio"]).default("hospitalizacion"),
  location: optionalText(),
  volumeStatus: z.enum(["hipovolemico", "euvolemico", "hipervolemico", "incierto"]).default("incierto"),
  oralRouteAvailable: z.boolean().default(true),
  venousAccess: z.enum(["periferico", "linea_media", "picc", "central", "ninguno", "desconocido"]).default("desconocido"),
  urineOutputMlKgH: optionalClinicalNumber("Gasto urinario", 0, 20),
  comorbidities: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  neurologicSymptoms: z.array(z.string()).default([]),
  cardiovascularSymptoms: z.array(z.string()).default([])
});

export const evaluationPatientSchema = patientSchema.partial().extend({
  sex: z.enum(["male", "female"]).optional(),
  clinicalArea: z.enum(["urgencias", "hospitalizacion", "uci", "ambulatorio"]).optional(),
  volumeStatus: z.enum(["hipovolemico", "euvolemico", "hipervolemico", "incierto"]).optional(),
  oralRouteAvailable: z.boolean().optional(),
  venousAccess: z.enum(["periferico", "linea_media", "picc", "central", "ninguno", "desconocido"]).optional()
});

export const labSchema = z.object({
  collectedAt: z.coerce.date().optional(),
  sodium: optionalClinicalNumber("Sodio", 80, 200),
  potassium: optionalClinicalNumber("Potasio", 1, 10),
  chloride: optionalClinicalNumber("Cloro", 50, 140),
  magnesium: optionalClinicalNumber("Magnesio", 0.2, 15),
  phosphorus: optionalClinicalNumber("Fosforo", 0.2, 15),
  calciumTotal: optionalClinicalNumber("Calcio total", 4, 20),
  calciumIonized: optionalClinicalNumber("Calcio ionico", 0.4, 2.5),
  albumin: optionalClinicalNumber("Albumina", 0.5, 8),
  glucose: optionalClinicalNumber("Glucosa", 20, 1200),
  creatinine: optionalClinicalNumber("Creatinina", 0.1, 25),
  urea: optionalClinicalNumber("Urea", 1, 400),
  bun: optionalClinicalNumber("BUN", 1, 200),
  ph: optionalClinicalNumber("pH", 6.8, 7.8),
  pco2: optionalClinicalNumber("pCO2", 10, 120),
  po2: optionalClinicalNumber("pO2", 20, 700),
  baseExcess: optionalClinicalNumber("Exceso de base", -40, 40),
  bicarbonate: optionalClinicalNumber("Bicarbonato", 2, 60),
  lactate: optionalClinicalNumber("Lactato", 0, 30),
  fio2: optionalClinicalNumber("FiO2", 21, 100),
  oxygenSaturation: optionalClinicalNumber("Saturacion arterial de oxigeno", 40, 100),
  temperatureC: optionalClinicalNumber("Temperatura", 25, 45),
  altitudeMeters: optionalClinicalNumber("Altitud", 0, 6000),
  sampleType: z.enum(["arterial", "venosa", "capilar"]).optional(),
  oxygenDevice: z.enum(["aire_ambiente", "canula", "mascara", "reservorio", "alto_flujo", "ventilacion_no_invasiva", "ventilacion_mecanica", "no_especificado"]).optional(),
  ventilatoryMode: z.enum(["espontanea", "vni", "mecanica_controlada", "mecanica_asistida", "no_especificado"]).optional(),
  peep: optionalClinicalNumber("PEEP", 0, 30),
  respiratoryRate: optionalClinicalNumber("Frecuencia respiratoria", 0, 80),
  tidalVolumeMl: optionalClinicalNumber("Volumen corriente", 0, 1500),
  serumOsmolality: optionalClinicalNumber("Osmolalidad serica", 180, 420),
  urineOsmolality: optionalClinicalNumber("Osmolalidad urinaria", 50, 1400),
  urineSodium: optionalClinicalNumber("Sodio urinario", 0, 300),
  urinePotassium: optionalClinicalNumber("Potasio urinario", 0, 300),
  notes: optionalText()
});
