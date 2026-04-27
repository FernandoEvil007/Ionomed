import { useEffect, useMemo, useState } from "react";
import { Activity, ClipboardCopy, Droplets, LogOut, Plus, Save, ShieldAlert, Stethoscope, UserPlus } from "lucide-react";
import { api, clearSession, readSession, setSession } from "./api";

const professionalRoles = [
  ["estudiante_medicina", "Estudiante de medicina"],
  ["interno", "Interno"],
  ["residente", "Residente"],
  ["fellow", "Fellow"],
  ["especialista", "Especialista"],
  ["subespecialista", "Subespecialista"]
];

const comorbidities = [
  ["erc", "Enfermedad renal crónica"],
  ["lesion_renal_aguda", "Lesión renal aguda"],
  ["hemodialisis", "Hemodiálisis"],
  ["oliguria", "Oliguria"],
  ["anuria", "Anuria"],
  ["falla_cardiaca", "Falla cardiaca"],
  ["arritmias", "Arritmias"],
  ["qt_prolongado", "QT prolongado"],
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

const medications = [
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

const neuroSymptoms = [
  ["convulsion", "Convulsiones"],
  ["coma", "Coma"],
  ["alteracion_conciencia", "Alteración del estado de conciencia"],
  ["somnolencia", "Somnolencia marcada"],
  ["confusion", "Confusión aguda"],
  ["delirium", "Delirium"],
  ["cefalea_deterioro", "Cefalea con deterioro"],
  ["vomito_neurologico", "Vómito con compromiso neurológico"],
  ["edema_cerebral", "Sospecha de edema cerebral" ]
];

const cardioSymptoms = [
  ["arritmia", "Arritmia"],
  ["cambios_ecg", "Cambios en ECG"],
  ["qt_prolongado", "QT prolongado"],
  ["debilidad_muscular", "Debilidad muscular"],
  ["dolor_toracico", "Dolor torácico"],
  ["bradicardia", "Bradicardia" ]
];

const initialPatient = {
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

const initialLab = {
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
  bicarbonate: "",
  serumOsmolality: "",
  urineOsmolality: "",
  urineSodium: "",
  urinePotassium: "",
  notes: ""
};

function App() {
  const [session, setLocalSession] = useState(readSession());

  if (!session.token) return <AuthScreen onLogin={(data) => { setSession(data); setLocalSession(readSession()); }} />;

  return <MainApp session={session} onLogout={() => { clearSession(); setLocalSession(readSession()); }} />;
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    documentId: "",
    serviceArea: "",
    professionalRole: "especialista",
    institutionName: "",
    institutionIdentifier: "",
    institutionCity: ""
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login" ? { email: form.email, password: form.password } : form;
      const data = await api(path, { method: "POST", body: JSON.stringify(payload) });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page app-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <div>
            <div className="logo" style={{ color: "white" }}>
              <div className="logo-mark"><Droplets /></div>
              <div>IonoMed<small style={{ color: "rgba(255,255,255,.78)" }}>Soporte clínico electrolítico</small></div>
            </div>
            <h1>Órdenes médicas sugeridas, específicas y editables.</h1>
            <p>Diseñado para estudiantes de medicina, internos, residentes, fellows, especialistas y subespecialistas.</p>
          </div>
          <div className="alert" style={{ background: "rgba(255,255,255,.14)", color: "white", borderColor: "rgba(255,255,255,.28)" }}>
            IonoMed no reemplaza la valoración médica. Las recomendaciones deben interpretarse según el contexto clínico, protocolos institucionales y criterio del médico tratante.
          </div>
        </div>
        <form className="auth-panel grid" onSubmit={submit}>
          <div>
            <h2>{mode === "login" ? "Ingresar" : "Registro médico"}</h2>
            <p>{mode === "login" ? "Accede a tu institución." : "Todo usuario debe especificar su rol profesional antes de usar la aplicación."}</p>
          </div>
          {error && <div className="error">{error}</div>}
          {mode === "register" && (
            <>
              <label>Nombre completo<input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required /></label>
              <div className="grid two">
                <label>Documento<input value={form.documentId} onChange={(e) => update("documentId", e.target.value)} /></label>
                <label>Rol profesional
                  <select value={form.professionalRole} onChange={(e) => update("professionalRole", e.target.value)} required>
                    {professionalRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label>Servicio o área clínica<input value={form.serviceArea} onChange={(e) => update("serviceArea", e.target.value)} placeholder="Medicina interna, UCI, urgencias..." /></label>
              <div className="grid two">
                <label>Institución<input value={form.institutionName} onChange={(e) => update("institutionName", e.target.value)} required /></label>
                <label>Ciudad<input value={form.institutionCity} onChange={(e) => update("institutionCity", e.target.value)} /></label>
              </div>
            </>
          )}
          <label>Correo electrónico<input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
          <label>Contraseña<input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} /></label>
          <button className="btn primary full" disabled={loading}>{loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}</button>
          <button type="button" className="btn ghost full" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
          </button>
        </form>
      </section>
    </main>
  );
}

function MainApp({ session, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientForm, setPatientForm] = useState(initialPatient);
  const [labForm, setLabForm] = useState(initialLab);
  const [evaluation, setEvaluation] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("nuevo");

  const isTraining = ["estudiante_medicina", "interno", "residente", "fellow"].includes(session.user?.professionalRole);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      const data = await api("/patients");
      setPatients(data);
    } catch (err) {
      setError(err.message);
    }
  }

  function resetForms() {
    setPatientForm(initialPatient);
    setLabForm(initialLab);
    setEvaluation(null);
    setSelectedPatient(null);
    setTab("nuevo");
  }

  async function createPatient(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const patient = await api("/patients", { method: "POST", body: JSON.stringify(cleanPayload(patientForm)) });
      setSelectedPatient(patient);
      setMessage("Paciente creado. Ahora puedes ingresar laboratorios y generar la evaluación clínica.");
      await loadPatients();
      setTab("laboratorio");
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitLab(e) {
    e.preventDefault();
    if (!selectedPatient?._id) return setError("Primero crea o selecciona un paciente.");
    setError("");
    setMessage("");
    try {
      const data = await api(`/patients/${selectedPatient._id}/labs`, { method: "POST", body: JSON.stringify(cleanPayload(labForm)) });
      setEvaluation(data.evaluation);
      setMessage("Evaluación generada. Revisa, edita y copia las órdenes sugeridas según criterio clínico.");
      setTab("resultado");
    } catch (err) {
      setError(err.message);
    }
  }

  async function evaluateWithoutSaving() {
    setError("");
    try {
      const data = await api("/clinical/evaluate", { method: "POST", body: JSON.stringify({ patient: cleanPayload(patientForm), lab: cleanPayload(labForm) }) });
      setEvaluation(data);
      setMessage("Evaluación preliminar generada sin guardar paciente.");
      setTab("resultado");
    } catch (err) {
      setError(err.message);
    }
  }

  async function selectPatient(patient) {
    setSelectedPatient(patient);
    setPatientForm({ ...initialPatient, ...patient });
    setEvaluation(null);
    setTab("laboratorio");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">
          <div className="logo-mark"><Droplets size={22} /></div>
          <div>IonoMed<small>{session.institution?.name || "Institución"}</small></div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="badge">{roleLabel(session.user?.professionalRole)}</span>
          <button className="btn ghost" onClick={resetForms}><Plus size={18} /> Nuevo</button>
          <button className="btn danger" onClick={onLogout}><LogOut size={18} /> Salir</button>
        </div>
      </header>

      <main className="container grid">
        {isTraining && (
          <div className="alert red">
            <strong>Usuario en formación:</strong> toda orden médica sugerida debe ser revisada y validada por el médico responsable o especialista tratante antes de su aplicación clínica.
          </div>
        )}
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <section className="hero">
          <div className="card">
            <h1>IonoMed</h1>
            <p>Motor inicial para clasificación de trastornos hidroelectrolíticos, cálculo renal y generación de órdenes médicas sugeridas, específicas, editables y copiables.</p>
            <div className="metrics">
              <div className="metric"><strong>{patients.length}</strong><small>Pacientes activos</small></div>
              <div className="metric"><strong>6</strong><small>Módulos clínicos</small></div>
              <div className="metric"><strong>PWA</strong><small>Preparado para instalación</small></div>
            </div>
          </div>
          <div className="card">
            <h3>Principio clínico</h3>
            <p>La app no reemplaza al médico. La orden debe ser revisada, editada y validada según contexto clínico, protocolos institucionales y criterio profesional.</p>
            <div className="alert"><ShieldAlert size={18} /> Hiponatremia severa automática: sodio menor de 120 mmol/L + signos neurológicos.</div>
          </div>
        </section>

        <section className="grid" style={{ gridTemplateColumns: "320px 1fr", alignItems: "start" }}>
          <aside className="card">
            <h3>Pacientes activos</h3>
            <div className="patient-list">
              {patients.length === 0 && <p>No hay pacientes creados todavía.</p>}
              {patients.map((patient) => (
                <button key={patient._id} className="patient-row" onClick={() => selectPatient(patient)}>
                  <span><strong>{patient.nameOrCode}</strong><small>{patient.age} años · {patient.clinicalArea}</small></span>
                  <Activity size={18} />
                </button>
              ))}
            </div>
          </aside>

          <section className="card">
            <div className="tabs">
              <button className={`tab ${tab === "nuevo" ? "active" : ""}`} onClick={() => setTab("nuevo")}>Paciente</button>
              <button className={`tab ${tab === "laboratorio" ? "active" : ""}`} onClick={() => setTab("laboratorio")}>Laboratorios</button>
              <button className={`tab ${tab === "resultado" ? "active" : ""}`} onClick={() => setTab("resultado")}>Resultado</button>
            </div>
            {tab === "nuevo" && <PatientForm form={patientForm} setForm={setPatientForm} onSubmit={createPatient} onEvaluate={evaluateWithoutSaving} />}
            {tab === "laboratorio" && <LabForm form={labForm} setForm={setLabForm} onSubmit={submitLab} selectedPatient={selectedPatient} />}
            {tab === "resultado" && <ResultPanel evaluation={evaluation} />}
          </section>
        </section>
      </main>
    </div>
  );
}

function PatientForm({ form, setForm, onSubmit, onEvaluate }) {
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggle = (field, value) => setForm((prev) => ({
    ...prev,
    [field]: prev[field].includes(value) ? prev[field].filter((x) => x !== value) : [...prev[field], value]
  }));

  return (
    <form className="grid" onSubmit={onSubmit}>
      <div className="grid two">
        <label>Nombre o código del paciente<input value={form.nameOrCode || ""} onChange={(e) => update("nameOrCode", e.target.value)} required /></label>
        <label>Identificación local<input value={form.localIdentifier || ""} onChange={(e) => update("localIdentifier", e.target.value)} /></label>
      </div>
      <div className="grid three">
        <label>Edad<input type="number" value={form.age || ""} onChange={(e) => update("age", e.target.value)} required /></label>
        <label>Sexo
          <select value={form.sex} onChange={(e) => update("sex", e.target.value)}>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </label>
        <label>Peso kg<input type="number" step="0.1" value={form.weightKg || ""} onChange={(e) => update("weightKg", e.target.value)} required /></label>
      </div>
      <div className="grid three">
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
            <option value="central">Central</option>
            <option value="ninguno">Ninguno</option>
          </select>
        </label>
      </div>
      <label>Ubicación<input value={form.location || ""} onChange={(e) => update("location", e.target.value)} placeholder="UCI, piso, urgencias..." /></label>
      <label>Diuresis mL/kg/h<input type="number" step="0.01" value={form.urineOutputMlKgH || ""} onChange={(e) => update("urineOutputMlKgH", e.target.value)} /></label>
      <label className="check-item"><input type="checkbox" checked={form.oralRouteAvailable} onChange={(e) => update("oralRouteAvailable", e.target.checked)} /> Vía oral disponible</label>

      <Checklist title="Comorbilidades" items={comorbidities} selected={form.comorbidities || []} onToggle={(value) => toggle("comorbidities", value)} />
      <Checklist title="Medicamentos relevantes" items={medications} selected={form.medications || []} onToggle={(value) => toggle("medications", value)} />
      <Checklist title="Signos neurológicos" items={neuroSymptoms} selected={form.neurologicSymptoms || []} onToggle={(value) => toggle("neurologicSymptoms", value)} />
      <Checklist title="Síntomas cardiovasculares / ECG" items={cardioSymptoms} selected={form.cardiovascularSymptoms || []} onToggle={(value) => toggle("cardiovascularSymptoms", value)} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn primary" type="submit"><Save size={18} /> Crear paciente</button>
        <button className="btn secondary" type="button" onClick={onEvaluate}><Stethoscope size={18} /> Evaluar sin guardar</button>
      </div>
    </form>
  );
}

function Checklist({ title, items, selected, onToggle }) {
  return (
    <div className="grid">
      <h3>{title}</h3>
      <div className="check-grid">
        {items.map(([value, label]) => (
          <label className="check-item" key={value}>
            <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function LabForm({ form, setForm, onSubmit, selectedPatient }) {
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  return (
    <form className="grid" onSubmit={onSubmit}>
      <div className="alert">
        {selectedPatient ? `Paciente seleccionado: ${selectedPatient.nameOrCode}` : "Puedes ingresar laboratorios luego de crear o seleccionar un paciente."}
      </div>
      <label>Fecha y hora del laboratorio<input type="datetime-local" value={form.collectedAt} onChange={(e) => update("collectedAt", e.target.value)} /></label>
      <div className="grid three">
        <Num label="Sodio mmol/L" value={form.sodium} onChange={(v) => update("sodium", v)} />
        <Num label="Potasio mmol/L" value={form.potassium} onChange={(v) => update("potassium", v)} />
        <Num label="Cloro mmol/L" value={form.chloride} onChange={(v) => update("chloride", v)} />
        <Num label="Magnesio mg/dL" value={form.magnesium} onChange={(v) => update("magnesium", v)} />
        <Num label="Fósforo mg/dL" value={form.phosphorus} onChange={(v) => update("phosphorus", v)} />
        <Num label="Calcio total mg/dL" value={form.calciumTotal} onChange={(v) => update("calciumTotal", v)} />
        <Num label="Calcio ionizado" value={form.calciumIonized} onChange={(v) => update("calciumIonized", v)} />
        <Num label="Albúmina g/dL" value={form.albumin} onChange={(v) => update("albumin", v)} />
        <Num label="Glucosa mg/dL" value={form.glucose} onChange={(v) => update("glucose", v)} />
        <Num label="Creatinina mg/dL" value={form.creatinine} onChange={(v) => update("creatinine", v)} />
        <Num label="BUN mg/dL" value={form.bun} onChange={(v) => update("bun", v)} />
        <Num label="pH" value={form.ph} onChange={(v) => update("ph", v)} />
        <Num label="Bicarbonato mmol/L" value={form.bicarbonate} onChange={(v) => update("bicarbonate", v)} />
        <Num label="Osmolaridad sérica" value={form.serumOsmolality} onChange={(v) => update("serumOsmolality", v)} />
        <Num label="Osmolaridad urinaria" value={form.urineOsmolality} onChange={(v) => update("urineOsmolality", v)} />
        <Num label="Sodio urinario" value={form.urineSodium} onChange={(v) => update("urineSodium", v)} />
        <Num label="Potasio urinario" value={form.urinePotassium} onChange={(v) => update("urinePotassium", v)} />
      </div>
      <label>Notas<textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} /></label>
      <button className="btn primary" type="submit"><Activity size={18} /> Guardar laboratorio y evaluar</button>
    </form>
  );
}

function Num({ label, value, onChange }) {
  return <label>{label}<input type="number" step="0.01" value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function ResultPanel({ evaluation }) {
  if (!evaluation) return <div className="alert">Aún no hay evaluación generada.</div>;
  const calc = evaluation.calculations || {};
  return (
    <div className="result-panel">
      {(evaluation.globalAlerts || []).map((alert, idx) => <div className="alert red" key={idx}>{alert}</div>)}
      <div>
        <h2>Cálculos automáticos</h2>
        <div className="metrics">
          <Metric label="TFG CKD-EPI" value={display(calc.egfr, "mL/min/1.73m²")} />
          <Metric label="Cockcroft-Gault" value={display(calc.cockcroftGault, "mL/min")} />
          <Metric label="Clase renal" value={calc.renalClass || "—"} />
          <Metric label="ACT estimada" value={display(calc.totalBodyWater, "L")} />
          <Metric label="Na corregido" value={display(calc.sodiumCorrected, "mmol/L")} />
          <Metric label="Ca corregido" value={display(calc.calciumCorrected, "mg/dL")} />
          <Metric label="Osm calculada" value={display(calc.calculatedSerumOsmolality, "mOsm/kg")} />
          <Metric label="NaCl 3% Δ/L" value={display(calc.sodium3ChangePerLiter, "mmol/L")}/>
        </div>
      </div>

      <div>
        <h2>Trastornos detectados</h2>
        {(evaluation.classifications || []).length === 0 && <p>No se detectaron trastornos con los datos ingresados.</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(evaluation.classifications || []).map((item, idx) => <span key={idx} className={`badge ${item.priority}`}>{item.disorder} · {item.severity}</span>)}
        </div>
      </div>

      <div>
        <h2>Órdenes médicas sugeridas</h2>
        {(evaluation.orders || []).map((order, idx) => <OrderCard order={order} key={idx} />)}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="metric"><strong>{value || "—"}</strong><small>{label}</small></div>;
}

function OrderCard({ order }) {
  const [text, setText] = useState(order.suggestedText || "");
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="card order-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3>{order.disorder}</h3>
          <span className={`badge ${order.priority}`}>{order.severity} · {order.priority}</span>
        </div>
        <button className="btn secondary" onClick={copy}><ClipboardCopy size={18} /> {copied ? "Copiada" : "Copiar orden"}</button>
      </div>
      {(order.alerts || []).map((alert, idx) => <div className="alert red" key={idx}>{alert}</div>)}
      <label>Orden médica sugerida editable
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="order-text">{text}</div>
      {order.justification && <p><strong>Justificación:</strong> {order.justification}</p>}
    </article>
  );
}

function display(value, suffix) {
  if (value === null || value === undefined || value === "") return "—";
  return suffix ? `${value} ${suffix}` : value;
}

function roleLabel(role) {
  return professionalRoles.find(([value]) => value === role)?.[1] || role || "Usuario clínico";
}

function cleanPayload(obj) {
  const out = Array.isArray(obj) ? [] : {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value === "") return;
    if (Array.isArray(value)) out[key] = value;
    else out[key] = value;
  });
  return out;
}

export default App;
