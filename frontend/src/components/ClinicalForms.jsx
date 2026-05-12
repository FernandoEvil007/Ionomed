import { Activity, ChevronDown, Save, Stethoscope } from "lucide-react";
import { cardioSymptoms, comorbidities, medications, neuroSymptoms } from "../clinicalFormData";

export function PatientForm({ form, setForm, onSubmit, onEvaluate }) {
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggle = (field, value) => setForm((prev) => ({
    ...prev,
    [field]: value === "ninguno"
      ? (prev[field].includes("ninguno") ? [] : ["ninguno"])
      : (prev[field].includes(value)
        ? prev[field].filter((x) => x !== value)
        : [...prev[field].filter((x) => x !== "ninguno"), value])
  }));

  return (
    <form className="grid" onSubmit={onSubmit}>
      <FormSection title="1. Identificación" summary="Datos mínimos para ubicar al paciente" open>
      <div className="grid patient-identity-grid">
        <label className="patient-name-field">Nombre o código<input value={form.nameOrCode || ""} onChange={(e) => update("nameOrCode", e.target.value)} required /></label>
        <label>Identificación<input value={form.localIdentifier || ""} onChange={(e) => update("localIdentifier", e.target.value)} /></label>
        <label>Edad<input type="number" value={form.age || ""} onChange={(e) => update("age", e.target.value)} /></label>
        <label>Sexo
          <select value={form.sex} onChange={(e) => update("sex", e.target.value)}>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </label>
        <label>Peso kg<input type="number" step="0.1" value={form.weightKg || ""} onChange={(e) => update("weightKg", e.target.value)} /></label>
      </div>
      </FormSection>

      <FormSection title="2. Contexto clínico" summary="Área, volemia, acceso y diuresis" open>
      <div className="grid three clinical-context-grid">
        <label>Área clínica
          <select value={form.clinicalArea} onChange={(e) => update("clinicalArea", e.target.value)}>
            <option value="urgencias">Urgencias</option>
            <option value="hospitalizacion">Hospitalización</option>
            <option value="uci">UCI</option>
            <option value="ambulatorio">Ambulatorio</option>
          </select>
        </label>
        <label>Volemia
          <select value={form.volumeStatus} onChange={(e) => update("volumeStatus", e.target.value)}>
            <option value="incierto">Incierto</option>
            <option value="hipovolemico">Hipovolémico</option>
            <option value="euvolemico">Euvolémico</option>
            <option value="hipervolemico">Hipervolémico</option>
          </select>
        </label>
        <label>Acceso venoso
          <select value={form.venousAccess} onChange={(e) => update("venousAccess", e.target.value)}>
            <option value="desconocido">Desconocido</option>
            <option value="periferico">Periférico</option>
            <option value="linea_media">Línea media</option>
            <option value="picc">PICC</option>
            <option value="central">Central</option>
            <option value="ninguno">Ninguno</option>
          </select>
        </label>
      </div>
      <div className="grid three clinical-context-extra">
        <label>Ubicación<input value={form.location || ""} onChange={(e) => update("location", e.target.value)} placeholder="UCI, piso, urgencias..." /></label>
        <label>Diuresis mL/kg/h<input type="number" step="0.01" value={form.urineOutputMlKgH || ""} onChange={(e) => update("urineOutputMlKgH", e.target.value)} /></label>
        <label className="check-item inline-check"><input type="checkbox" checked={form.oralRouteAvailable} onChange={(e) => update("oralRouteAvailable", e.target.checked)} /> Vía oral disponible</label>
      </div>
      </FormSection>

      <FormSection title="3. Riesgos clínicos" summary="Toca cada grupo solo si aplica">
      <div className="risk-checklist-grid">
        <Checklist title="Comorbilidades" items={comorbidities} selected={form.comorbidities || []} onToggle={(value) => toggle("comorbidities", value)} />
        <Checklist title="Medicamentos relevantes" items={medications} selected={form.medications || []} onToggle={(value) => toggle("medications", value)} />
        <Checklist title="Signos neurológicos" items={neuroSymptoms} selected={form.neurologicSymptoms || []} onToggle={(value) => toggle("neurologicSymptoms", value)} />
        <Checklist title="Síntomas cardiovasculares / ECG" items={cardioSymptoms} selected={form.cardiovascularSymptoms || []} onToggle={(value) => toggle("cardiovascularSymptoms", value)} />
      </div>
      </FormSection>

      <div className="form-actions">
        <button className="btn primary" type="submit"><Save size={18} /> Crear paciente</button>
        <button className="btn secondary" type="button" onClick={onEvaluate}><Stethoscope size={18} /> Evaluar sin guardar</button>
      </div>
    </form>
  );
}

function Checklist({ title, items, selected, onToggle }) {
  const selectedLabels = items
    .filter(([value]) => selected.includes(value))
    .map(([, label]) => label);
  const summary = selectedLabels.length ? selectedLabels.slice(0, 3).join(", ") : "Sin selección";
  const extraCount = Math.max(selectedLabels.length - 3, 0);

  return (
    <details className="check-section">
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{summary}{extraCount ? ` +${extraCount}` : ""}</small>
        </span>
        <b>{selectedLabels.length}</b>
      </summary>
      <div className="check-grid compact">
        {items.map(([value, label]) => (
          <label className="check-item" key={value}>
            <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
            {label}
          </label>
        ))}
      </div>
    </details>
  );
}

export function FormSection({ title, summary, children, open = false }) {
  return (
    <details className="form-section" open={open}>
      <summary>
        <span>
          <strong>{title}</strong>
          {summary && <small>{summary}</small>}
        </span>
        <ChevronDown size={16} />
      </summary>
      <div className="form-section-body">{children}</div>
    </details>
  );
}

export function LabForm({ form, setForm, onSubmit, selectedPatient }) {
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const gasWarnings = gasFieldWarnings(form);
  return (
    <form className="grid" onSubmit={onSubmit}>
      <div className="alert">
        {selectedPatient ? `Paciente seleccionado: ${selectedPatient.nameOrCode}` : "Puedes ingresar laboratorios luego de crear o seleccionar un paciente."}
      </div>
      <FormSection title="1. Electrolitos básicos" summary="Valores principales para clasificar y ordenar" open>
        <label>Fecha y hora del laboratorio<input type="datetime-local" value={form.collectedAt} onChange={(e) => update("collectedAt", e.target.value)} /></label>
        <div className="grid quick-labs lab-basic-grid">
          <Num label="Sodio mmol/L" value={form.sodium} onChange={(v) => update("sodium", v)} />
          <Num label="Potasio mmol/L" value={form.potassium} onChange={(v) => update("potassium", v)} />
          <Num label="Cloro mmol/L" value={form.chloride} onChange={(v) => update("chloride", v)} />
          <Num label="Magnesio mg/dL" value={form.magnesium} onChange={(v) => update("magnesium", v)} />
          <Num label="Fósforo mg/dL" value={form.phosphorus} onChange={(v) => update("phosphorus", v)} />
          <Num label="Calcio total mg/dL" value={form.calciumTotal} onChange={(v) => update("calciumTotal", v)} />
        </div>
      </FormSection>
      <FormSection title="2. Datos complementarios" summary="Renal, osmolaridad y orina">
        <div className="grid quick-labs lab-complement-grid">
          <Num label="Calcio ionizado" value={form.calciumIonized} onChange={(v) => update("calciumIonized", v)} />
          <Num label="Albúmina g/dL" value={form.albumin} onChange={(v) => update("albumin", v)} />
          <Num label="Glucosa mg/dL" value={form.glucose} onChange={(v) => update("glucose", v)} />
          <Num label="Creatinina mg/dL" value={form.creatinine} onChange={(v) => update("creatinine", v)} />
          <Num label="BUN mg/dL" value={form.bun} onChange={(v) => update("bun", v)} />
          <Num label="Osmolaridad sérica" value={form.serumOsmolality} onChange={(v) => update("serumOsmolality", v)} />
          <Num label="Osmolaridad urinaria" value={form.urineOsmolality} onChange={(v) => update("urineOsmolality", v)} />
          <Num label="Sodio urinario" value={form.urineSodium} onChange={(v) => update("urineSodium", v)} />
          <Num label="Potasio urinario" value={form.urinePotassium} onChange={(v) => update("urinePotassium", v)} />
        </div>
      </FormSection>
      <FormSection title="3. Gases arteriales" summary="pH, ventilación, oxigenación y perfusión">
        <div className="gas-form-intro">
          <strong>Gasometría arterial</strong>
          <span>Completa pH, pCO2 y HCO3 para clasificar el trastorno ácido-base; agrega pO2, FiO2 y contexto ventilatorio para precisar oxigenación.</span>
        </div>
        <div className="grid quick-labs lab-complement-grid">
          <Num label="pH" value={form.ph} min={6.8} max={7.8} onChange={(v) => update("ph", v)} />
          <Num label="pCO2 mmHg" value={form.pco2} min={10} max={120} onChange={(v) => update("pco2", v)} />
          <Num label="pO2 mmHg" value={form.po2} min={20} max={700} onChange={(v) => update("po2", v)} />
          <Num label="BE mmol/L" value={form.baseExcess} min={-40} max={40} onChange={(v) => update("baseExcess", v)} />
          <Num label="HCO3 mmol/L" value={form.bicarbonate} min={2} max={60} onChange={(v) => update("bicarbonate", v)} />
          <Num label="Lactato mmol/L" value={form.lactate} min={0} max={30} onChange={(v) => update("lactate", v)} />
          <Num label="FiO2 %" value={form.fio2} min={21} max={100} onChange={(v) => update("fio2", v)} />
          <Num label="SatO2 %" value={form.oxygenSaturation} min={40} max={100} onChange={(v) => update("oxygenSaturation", v)} />
          <Num label="Temperatura C" value={form.temperatureC} min={25} max={45} onChange={(v) => update("temperatureC", v)} />
          <Num label="Altitud msnm" value={form.altitudeMeters} min={0} max={6000} onChange={(v) => update("altitudeMeters", v)} />
          <Num label="PEEP cmH2O" value={form.peep} min={0} max={30} onChange={(v) => update("peep", v)} />
          <Num label="FR rpm" value={form.respiratoryRate} min={0} max={80} onChange={(v) => update("respiratoryRate", v)} />
          <Num label="Vol corriente mL" value={form.tidalVolumeMl} min={0} max={1500} onChange={(v) => update("tidalVolumeMl", v)} />
          <label>Tipo de muestra
            <select value={form.sampleType || "arterial"} onChange={(e) => update("sampleType", e.target.value)}>
              <option value="arterial">Arterial</option>
              <option value="venosa">Venosa</option>
              <option value="capilar">Capilar</option>
            </select>
          </label>
          <label>Soporte de oxigeno
            <select value={form.oxygenDevice || "aire_ambiente"} onChange={(e) => update("oxygenDevice", e.target.value)}>
              <option value="aire_ambiente">Aire ambiente</option>
              <option value="canula">Canula nasal</option>
              <option value="mascara">Mascara simple</option>
              <option value="reservorio">Mascara con reservorio</option>
              <option value="alto_flujo">Alto flujo</option>
              <option value="ventilacion_no_invasiva">Ventilacion no invasiva</option>
              <option value="ventilacion_mecanica">Ventilacion mecanica</option>
              <option value="no_especificado">No especificado</option>
            </select>
          </label>
          <label>Modo ventilatorio
            <select value={form.ventilatoryMode || "espontanea"} onChange={(e) => update("ventilatoryMode", e.target.value)}>
              <option value="espontanea">Espontanea</option>
              <option value="vni">VNI</option>
              <option value="mecanica_controlada">Mecanica controlada</option>
              <option value="mecanica_asistida">Mecanica asistida</option>
              <option value="no_especificado">No especificado</option>
            </select>
          </label>
        </div>
        {gasWarnings.length > 0 && (
          <div className="error">
            {gasWarnings.map((warning) => <div key={warning}>{warning}</div>)}
          </div>
        )}
        <div className="alert">
          FiO2 puede ingresarse como porcentaje: aire ambiente 21. Con pO2 y FiO2 se calcula P/F; con pCO2 se estima gradiente A-a.
        </div>
        <label>Notas<textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} /></label>
      </FormSection>
      <div className="form-actions">
        <button className="btn primary" type="submit"><Activity size={18} /> Guardar y evaluar</button>
      </div>
    </form>
  );
}

export function Num({ label, value, onChange, min, max }) {
  return <label>{label}<input type="number" step="0.01" min={min} max={max} value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function gasFieldWarnings(form) {
  const definitions = [
    ["ph", "pH", 6.8, 7.8],
    ["pco2", "pCO2", 10, 120],
    ["po2", "pO2", 20, 700],
    ["baseExcess", "BE", -40, 40],
    ["bicarbonate", "HCO3", 2, 60],
    ["lactate", "Lactato", 0, 30],
    ["fio2", "FiO2", 21, 100],
    ["oxygenSaturation", "SatO2", 40, 100],
    ["temperatureC", "Temperatura", 25, 45],
    ["altitudeMeters", "Altitud", 0, 6000],
    ["peep", "PEEP", 0, 30],
    ["respiratoryRate", "FR", 0, 80],
    ["tidalVolumeMl", "Volumen corriente", 0, 1500]
  ];
  return definitions.flatMap(([field, label, min, max]) => {
    const raw = form[field];
    if (raw === "" || raw === undefined || raw === null) return [];
    const value = Number(raw);
    if (!Number.isFinite(value)) return [`${label}: ingresa un numero valido.`];
    if (value < min || value > max) return [`${label}: rango admitido ${min}-${max}.`];
    return [];
  });
}
