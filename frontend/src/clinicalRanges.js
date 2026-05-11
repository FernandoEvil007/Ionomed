export const clinicalRanges = [
  {
    electrolyte: "Sodio",
    unit: "mmol/L",
    note: "Usar sodio corregido por glucosa cuando aplique.",
    rows: [
      { disorder: "Hiponatremia leve", range: "130-134", severity: "leve" },
      { disorder: "Hiponatremia moderada", range: "120-129", severity: "moderada" },
      { disorder: "Hiponatremia profunda/severa", range: "<120 o sintomatica", severity: "severa" },
      { disorder: "Hipernatremia", range: ">145", severity: "moderada" },
      { disorder: "Hipernatremia severa", range: ">155", severity: "severa" }
    ]
  },
  {
    electrolyte: "Potasio",
    unit: "mmol/L",
    rows: [
      { disorder: "Hipokalemia leve", range: "3.0-3.49", severity: "leve" },
      { disorder: "Hipokalemia moderada", range: "2.5-2.99", severity: "moderada" },
      { disorder: "Hipokalemia severa", range: "<2.5 o <3.0 con sintomas/ECG", severity: "severa" },
      { disorder: "Hiperkalemia leve", range: "5.1-5.5", severity: "leve" },
      { disorder: "Hiperkalemia moderada", range: ">5.5-6.0", severity: "moderada" },
      { disorder: "Hiperkalemia severa", range: ">6.0, ECG o ERC avanzada", severity: "severa" }
    ]
  },
  {
    electrolyte: "Calcio total corregido",
    unit: "mg/dL",
    note: "Preferir calcio ionico en paciente critico, UCI, hipoalbuminemia o trastorno acido-base.",
    rows: [
      { disorder: "Hipercalcemia leve", range: "10.5-11.9", severity: "leve" },
      { disorder: "Hipercalcemia moderada", range: "12.0-13.9", severity: "moderada" },
      { disorder: "Hipercalcemia severa", range: ">=14", severity: "severa" },
      { disorder: "Hipocalcemia leve", range: "8.0-8.4", severity: "leve" },
      { disorder: "Hipocalcemia moderada", range: "7.5-7.9", severity: "moderada" },
      { disorder: "Hipocalcemia severa", range: "<7.5 o sintomatica", severity: "severa" }
    ]
  },
  {
    electrolyte: "Magnesio",
    unit: "mg/dL",
    rows: [
      { disorder: "Hipomagnesemia leve", range: "1.25-1.79", severity: "leve" },
      { disorder: "Hipomagnesemia moderada", range: "1.0-1.24", severity: "moderada" },
      { disorder: "Hipomagnesemia severa", range: "<1.0 o sintomatica", severity: "severa" },
      { disorder: "Hipermagnesemia leve", range: ">2.6-<7.0", severity: "leve" },
      { disorder: "Hipermagnesemia moderada", range: "7.0-12.0", severity: "moderada" },
      { disorder: "Hipermagnesemia severa", range: ">12.0", severity: "severa" }
    ]
  },
  {
    electrolyte: "Fosforo",
    unit: "mg/dL",
    rows: [
      { disorder: "Hipofosfatemia leve", range: "2.0-2.5", severity: "leve" },
      { disorder: "Hipofosfatemia moderada", range: "1.0-2.0", severity: "moderada" },
      { disorder: "Hipofosfatemia severa", range: "<1.0", severity: "severa" },
      { disorder: "Hiperfosfatemia leve", range: ">4.5-5.5", severity: "leve" },
      { disorder: "Hiperfosfatemia moderada", range: "5.6-7.0", severity: "moderada" },
      { disorder: "Hiperfosfatemia severa", range: ">7.0", severity: "severa" }
    ]
  }
];
