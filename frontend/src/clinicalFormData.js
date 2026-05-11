export const professionalRoles = [
  ["estudiante_medicina", "Estudiante de medicina"],
  ["interno", "Interno"],
  ["residente", "Residente"],
  ["fellow", "Fellow"],
  ["especialista", "Especialista"],
  ["subespecialista", "Subespecialista"]
];

export const comorbidities = [
  ["ninguno", "Ninguno"],
  ["erc", "Enfermedad renal crónica"],
  ["lesion_renal_aguda", "Lesión renal aguda"],
  ["hemodialisis", "Hemodiálisis"],
  ["oliguria", "Oliguria"],
  ["anuria", "Anuria"],
  ["hipertension_arterial", "Hipertensión arterial"],
  ["falla_cardiaca", "Falla cardiaca"],
  ["arritmias", "Arritmias"],
  ["qt_prolongado", "QT prolongado"],
  ["hipotiroidismo", "Hipotiroidismo"],
  ["hipertiroidismo", "Hipertiroidismo"],
  ["alto_riesgo_sobrecarga", "Alto riesgo de sobrecarga"],
  ["cirrosis", "Cirrosis"],
  ["alcoholismo", "Alcoholismo"],
  ["desnutricion", "Desnutrición"],
  ["diabetes", "Diabetes mellitus"],
  ["sindrome_realimentacion", "Síndrome de realimentación"],
  ["cancer_activo", "Cáncer activo"],
  ["cancer_metastasico", "Cáncer metastásico"],
  ["mieloma_multiple", "Mieloma múltiple"],
  ["linfoma", "Linfoma"],
  ["leucemia", "Leucemia"],
  ["metastasis_oseas", "Metástasis óseas"],
  ["hipercalcemia_maligna_previa", "Hipercalcemia maligna previa"]
];

export const medications = [
  ["ninguno", "Ninguno"],
  ["diuretico_asa", "Diurético de asa"],
  ["tiazida", "Tiazida"],
  ["ieca", "IECA"],
  ["ara2", "ARA II"],
  ["espironolactona", "Espironolactona"],
  ["sglt2", "SGLT2"],
  ["litio", "Litio"],
  ["anfotericina", "Anfotericina B"],
  ["cisplatino", "Cisplatino"],
  ["insulina", "Insulina"],
  ["bicarbonato", "Bicarbonato"],
  ["suplemento_potasio", "Suplemento de potasio"],
  ["calcio", "Calcio"],
  ["vitamina_d", "Vitamina D"],
  ["denosumab", "Denosumab"],
  ["bisfosfonato", "Bisfosfonato"],
  ["digoxina", "Digoxina"],
  ["aines", "AINES"]
];

export const neuroSymptoms = [
  ["ninguno", "Ninguno"],
  ["convulsion", "Convulsiones"],
  ["coma", "Coma"],
  ["alteracion_conciencia", "Alteración del estado de conciencia"],
  ["somnolencia", "Somnolencia marcada"],
  ["confusion", "Confusión aguda"],
  ["delirium", "Delirium"],
  ["cefalea_deterioro", "Cefalea con deterioro"],
  ["vomito_neurologico", "Vómito con compromiso neurológico"],
  ["edema_cerebral", "Sospecha de edema cerebral"]
];

export const cardioSymptoms = [
  ["ninguno", "Ninguno"],
  ["arritmia", "Arritmia"],
  ["cambios_ecg", "Cambios en ECG"],
  ["qt_prolongado", "QT prolongado"],
  ["debilidad_muscular", "Debilidad muscular"],
  ["dolor_toracico", "Dolor torácico"],
  ["bradicardia", "Bradicardia"]
];

export const initialPatient = {
  nameOrCode: "",
  localIdentifier: "",
  age: "",
  sex: "male",
  weightKg: "",
  heightCm: "",
  clinicalArea: "hospitalizacion",
  location: "",
  volumeStatus: "incierto",
  oralRouteAvailable: true,
  venousAccess: "desconocido",
  urineOutputMlKgH: "",
  comorbidities: [],
  medications: [],
  neurologicSymptoms: [],
  cardiovascularSymptoms: []
};

export const initialLab = {
  collectedAt: new Date().toISOString().slice(0, 16),
  sodium: "",
  potassium: "",
  chloride: "",
  magnesium: "",
  phosphorus: "",
  calciumTotal: "",
  calciumIonized: "",
  albumin: "",
  glucose: "",
  creatinine: "",
  urea: "",
  bun: "",
  ph: "",
  pco2: "",
  po2: "",
  baseExcess: "",
  bicarbonate: "",
  lactate: "",
  fio2: "",
  oxygenSaturation: "",
  serumOsmolality: "",
  urineOsmolality: "",
  urineSodium: "",
  urinePotassium: "",
  notes: ""
};

export const emptySolutionForm = {
  name: "",
  disorder: "hipokalemia",
  electrolyte: "potasio",
  route: "periferico",
  baseFluid: "ssn09",
  finalVolumeMl: 500,
  ampoules: 1,
  ampouleMeq: 20,
  preparation: "",
  content: "",
  use: "",
  concentration: "",
  mEqPerLiter: "",
  sodium: "",
  potassium: "",
  totalDoseMg: "",
  hours: "",
  rateMlH: "",
  active: true
};
