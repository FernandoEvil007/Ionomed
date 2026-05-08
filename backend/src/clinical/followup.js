const ELECTROLYTES = [
  { key: "sodium", label: "Sodio", unit: "mmol/L" },
  { key: "potassium", label: "Potasio", unit: "mmol/L" },
  { key: "magnesium", label: "Magnesio", unit: "mg/dL" },
  { key: "phosphorus", label: "Fosforo", unit: "mg/dL" },
  { key: "calciumTotal", label: "Calcio total", unit: "mg/dL" },
  { key: "calciumIonized", label: "Calcio ionizado", unit: "mmol/L" }
];

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hoursBetween(currentDate, previousDate) {
  const current = new Date(currentDate).getTime();
  const previous = new Date(previousDate).getTime();
  if (!Number.isFinite(current) || !Number.isFinite(previous) || current <= previous) return null;
  return (current - previous) / 36e5;
}

function sodiumCorrectionStatus(delta, elapsedHours, settings, patient) {
  if (elapsedHours === null || elapsedHours <= 0) return null;
  const projected24h = Math.abs(delta) * (24 / elapsedHours);
  const highRisk = (patient.comorbidities || []).some((item) =>
    ["alcoholismo", "desnutricion", "cirrosis"].includes(item)
  );
  const limit = highRisk
    ? settings.maxSodiumCorrection24hHighRisk || 8
    : settings.maxSodiumCorrection24hStandard || 10;

  if (delta > 0 && projected24h >= limit) {
    return {
      status: "excesiva",
      priority: "critica",
      message: `El sodio aumento ${delta.toFixed(1)} mmol/L en ${elapsedHours.toFixed(1)} horas. Proyeccion 24 h: ${projected24h.toFixed(1)} mmol/L, limite ${limit}. Riesgo de sobrecorreccion: suspender o ajustar correccion activa y solicitar nuevo sodio temprano.`
    };
  }

  if (delta > 0 && projected24h >= limit * 0.75) {
    return {
      status: "rapida",
      priority: "alta",
      message: `El sodio esta corrigiendo rapido: ${delta.toFixed(1)} mmol/L en ${elapsedHours.toFixed(1)} horas. Repetir control en 2 a 4 horas y ajustar si se aproxima al limite diario.`
    };
  }

  return {
    status: "adecuada",
    priority: "moderada",
    message: `Velocidad de correccion de sodio sin senal de sobrecorreccion con los datos actuales. Mantener control seriado segun severidad y terapia activa.`
  };
}

function potassiumCorrectionStatus(current, delta) {
  if (current > 6) {
    return {
      status: "persistente",
      priority: "critica",
      message: "Hiperkalemia persistente mayor de 6 mmol/L: repetir ECG, mantener monitorizacion cardiaca y considerar medidas de eliminacion o terapia de reemplazo renal segun funcion renal y diuresis."
    };
  }
  if (current < 2.5) {
    return {
      status: "persistente",
      priority: "critica",
      message: "Hipokalemia persistente menor de 2.5 mmol/L: verificar via de reposicion, corregir magnesio si esta bajo y controlar potasio en 4 a 6 horas o antes si hay sintomas/ECG."
    };
  }
  if (Math.abs(delta) >= 1) {
    return {
      status: "cambio_relevante",
      priority: "alta",
      message: `Cambio relevante de potasio (${delta.toFixed(1)} mmol/L). Ajustar reposicion o medidas de reduccion segun valor actual, ECG, funcion renal y diuresis.`
    };
  }
  return null;
}

export function buildFollowUp({ currentLab, previousLab, patient = {}, settings = {} }) {
  if (!previousLab) {
    return {
      hasPreviousLab: false,
      summary: "Primer laboratorio registrado para este paciente. El siguiente control permitira calcular velocidad de correccion y tendencia.",
      changes: [],
      alerts: []
    };
  }

  const elapsedHours = hoursBetween(currentLab.collectedAt || currentLab.createdAt, previousLab.collectedAt || previousLab.createdAt);
  const changes = [];
  const alerts = [];

  for (const electrolyte of ELECTROLYTES) {
    const current = toNumber(currentLab[electrolyte.key]);
    const previous = toNumber(previousLab[electrolyte.key]);
    if (current === null || previous === null) continue;

    const delta = current - previous;
    const ratePerHour = elapsedHours ? delta / elapsedHours : null;
    const change = {
      key: electrolyte.key,
      label: electrolyte.label,
      unit: electrolyte.unit,
      previous,
      current,
      delta: Number(delta.toFixed(2)),
      elapsedHours: elapsedHours === null ? null : Number(elapsedHours.toFixed(2)),
      ratePerHour: ratePerHour === null ? null : Number(ratePerHour.toFixed(3))
    };

    if (electrolyte.key === "sodium") {
      change.interpretation = sodiumCorrectionStatus(delta, elapsedHours, settings, patient);
    }

    if (electrolyte.key === "potassium") {
      change.interpretation = potassiumCorrectionStatus(current, delta);
    }

    if (change.interpretation?.priority === "critica" || change.interpretation?.priority === "alta") {
      alerts.push(change.interpretation.message);
    }

    changes.push(change);
  }

  return {
    hasPreviousLab: true,
    previousLabId: previousLab._id,
    elapsedHours: elapsedHours === null ? null : Number(elapsedHours.toFixed(2)),
    summary: elapsedHours
      ? `Comparacion contra laboratorio previo de hace ${elapsedHours.toFixed(1)} horas.`
      : "Comparacion contra laboratorio previo sin intervalo temporal confiable.",
    changes,
    alerts
  };
}
