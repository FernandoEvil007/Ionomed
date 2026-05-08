import { useEffect, useState } from "react";
import { Activity, ClipboardCopy, Download, Droplets, LogOut, Moon, Plus, Save, ShieldAlert, Stethoscope, Sun, Trash2, Upload } from "lucide-react";
import { api, apiDownload, clearSession, readSession, setSession } from "./api";

const professionalRoles = [
  ["estudiante_medicina", "Estudiante de medicina"],
  ["interno", "Interno"],
  ["residente", "Residente"],
  ["fellow", "Fellow"],
  ["especialista", "Especialista"],
  ["subespecialista", "Subespecialista"]
];

const comorbidities = [
  ["ninguno", "Ninguno"],
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

const neuroSymptoms = [
  ["ninguno", "Ninguno"],
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
  ["ninguno", "Ninguno"],
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

const themeStorageKey = "ionomed-theme";

function getStoredTheme() {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(themeStorageKey) || "light";
}

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
  const [theme, setTheme] = useState(getStoredTheme);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientForm, setPatientForm] = useState(initialPatient);
  const [labForm, setLabForm] = useState(initialLab);
  const [evaluation, setEvaluation] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("nuevo");

  const isTraining = ["estudiante_medicina", "interno", "residente", "fellow"].includes(session.user?.professionalRole);
  const isAdmin = session.user?.accessRole === "admin";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    loadPatients();
    loadDashboard();
  }, []);

  async function loadPatients() {
    try {
      const data = await api("/patients");
      setPatients(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadDashboard() {
    try {
      const data = await api("/dashboard");
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadPatientDetails(patientId) {
    const [details, orders] = await Promise.all([
      api(`/patients/${patientId}`),
      api(`/orders/patient/${patientId}`)
    ]);
    setPatientDetails(details);
    setOrderHistory(orders);
  }

  function resetForms() {
    setPatientForm(initialPatient);
    setLabForm(initialLab);
    setEvaluation(null);
    setSelectedPatient(null);
    setPatientDetails(null);
    setOrderHistory([]);
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
      await loadDashboard();
      await loadPatientDetails(patient._id);
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
      await loadPatientDetails(selectedPatient._id);
      await loadDashboard();
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
    await loadPatientDetails(patient._id);
    setTab("laboratorio");
  }

  async function deletePatient(patient) {
    const ok = window.confirm(`Eliminar de pacientes activos a ${patient.nameOrCode}?`);
    if (!ok) return;
    setError("");
    setMessage("");
    try {
      await api(`/patients/${patient._id}`, { method: "DELETE" });
      if (String(selectedPatient?._id) === String(patient._id)) resetForms();
      await loadPatients();
      await loadDashboard();
      setMessage("Paciente eliminado de la lista activa.");
    } catch (err) {
      setError(err.message);
    }
  }

  function updateOrder(order) {
    setOrderHistory((prev) => prev.map((item) => item._id === order._id ? order : item));
    loadDashboard();
    setEvaluation((prev) => prev ? {
      ...prev,
      orders: (prev.orders || []).map((item) => item._id === order._id ? order : item)
    } : prev);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">
          <div className="logo-mark"><Droplets size={22} /></div>
          <div>IonoMed<small>{session.institution?.name || "Institución"}</small></div>
        </div>
        <div className="topbar-actions">
          <span className="badge">{roleLabel(session.user?.professionalRole)}</span>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Cambiar a interfaz clara" : "Cambiar a interfaz oscura"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Claro" : "Oscuro"}
          </button>
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

        <section className="dashboard-summary">
          <div className="summary-card">
            <h1>Dashboard clinico</h1>
            <p>Motor inicial para clasificación de trastornos hidroelectrolíticos, cálculo renal y generación de órdenes médicas sugeridas, específicas, editables y copiables.</p>
            <div className="metrics">
              <div className="metric"><strong>{dashboard?.counts?.activePatients ?? patients.length}</strong><small>Pacientes activos</small></div>
              <div className="metric"><strong>6</strong><small>Módulos clínicos</small></div>
              <div className="metric"><strong>PWA</strong><small>Preparado para instalación</small></div>
            </div>
          </div>
          <div className="summary-card clinical-note">
            <h3>Principio clínico</h3>
            <p>La app no reemplaza al médico. La orden debe ser revisada, editada y validada según contexto clínico, protocolos institucionales y criterio profesional.</p>
            <div className="alert"><ShieldAlert size={18} /> Hiponatremia severa automática: sodio menor de 120 mmol/L + signos neurológicos.</div>
          </div>
        </section>

        <DashboardPanels
          dashboard={dashboard}
          onSelectPatient={(patient) => {
            const fullPatient = patients.find((item) => String(item._id) === String(patient._id || patient.patientId));
            if (fullPatient) selectPatient(fullPatient);
          }}
        />

        <section className="workbench">
          <aside className="card patient-sidebar">
            <h3>Pacientes activos</h3>
            <div className="patient-list">
              {patients.length === 0 && <p>No hay pacientes creados todavía.</p>}
              {patients.map((patient) => (
                <div key={patient._id} className="patient-row">
                  <button className="patient-select" type="button" onClick={() => selectPatient(patient)}>
                    <span><strong>{patient.nameOrCode}</strong><small>{patient.age} años · {patient.clinicalArea}</small></span>
                    <Activity size={18} />
                  </button>
                  <button className="icon-button danger" type="button" title="Eliminar paciente" onClick={() => deletePatient(patient)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          <section className="card workspace-card">
            <div className="tabs">
              <button className={`tab ${tab === "nuevo" ? "active" : ""}`} onClick={() => setTab("nuevo")}>Paciente</button>
              <button className={`tab ${tab === "laboratorio" ? "active" : ""}`} onClick={() => setTab("laboratorio")}>Laboratorios</button>
              <button className={`tab ${tab === "resultado" ? "active" : ""}`} onClick={() => setTab("resultado")}>Resultado</button>
              <button className={`tab ${tab === "soluciones" ? "active" : ""}`} onClick={() => setTab("soluciones")}>Soluciones</button>
              {isAdmin && <button className={`tab ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>Admin</button>}
            </div>
            {tab === "nuevo" && <PatientForm form={patientForm} setForm={setPatientForm} onSubmit={createPatient} onEvaluate={evaluateWithoutSaving} />}
            {tab === "laboratorio" && <LabForm form={labForm} setForm={setLabForm} onSubmit={submitLab} selectedPatient={selectedPatient} />}
            {tab === "resultado" && (
              <ResultPanel
                evaluation={evaluation}
                patientDetails={patientDetails}
                orderHistory={orderHistory}
                onOrderUpdated={updateOrder}
              />
            )}
            {tab === "soluciones" && <SolutionsGuide evaluation={evaluation} />}
            {tab === "admin" && isAdmin && <AdminPanel />}
          </section>
        </section>
      </main>
    </div>
  );
}

function DashboardPanels({ dashboard, onSelectPatient }) {
  if (!dashboard) return null;
  const alerts = dashboard.criticalAlerts || [];
  const controls = dashboard.controls || [];
  const patients = dashboard.patients || [];

  return (
    <section className="dashboard-grid">
      <div className="card dashboard-panel">
        <h2>Alertas activas</h2>
        {alerts.length === 0 && <p>No hay alertas criticas activas.</p>}
        {alerts.map((alert) => (
          <button className="dashboard-row" key={alert.orderId} onClick={() => onSelectPatient({ patientId: alert.patientId })}>
            <span>
              <strong>{alert.patientName}</strong>
              <small>{alert.disorder} · {alert.severity}</small>
            </span>
            <span className={`badge ${alert.priority}`}>{alert.controlValue || alert.priority}</span>
          </button>
        ))}
      </div>

      <div className="card dashboard-panel">
        <h2>Controles</h2>
        {controls.length === 0 && <p>No hay controles pendientes calculados.</p>}
        {controls.slice(0, 6).map((control) => (
          <button className={`dashboard-row ${control.overdue ? "overdue" : ""}`} key={control.orderId} onClick={() => onSelectPatient({ patientId: control.patientId })}>
            <span>
              <strong>{control.patientName}</strong>
              <small>{control.disorder}</small>
            </span>
            <span>{control.controlValue ? `${control.controlValue} - ` : ""}{formatShortDate(control.dueAt)}</span>
          </button>
        ))}
      </div>

      <div className="card dashboard-panel">
        <h2>Pacientes priorizados</h2>
        {patients.length === 0 && <p>No hay pacientes activos para priorizar.</p>}
        {patients.slice(0, 6).map((patient) => (
          <button className="dashboard-row" key={patient._id} onClick={() => onSelectPatient(patient)}>
            <span>
              <strong>{patient.nameOrCode}</strong>
              <small>{patient.topOrder?.disorder || "Sin orden activa"}</small>
            </span>
            <span className={`badge ${patient.riskPriority}`}>{patient.riskPriority}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const solutionGroups = [
  {
    title: "Reposicion de potasio",
    rows: [
      {
        name: "Cloruro de potasio 0.02 mEq/mL",
        match: ["hipokalemia"],
        route: "Periferico",
        preparation: "En DAD al 5% x 500 mL",
        content: "0.02 mEq/mL",
        use: "Reposicion periferica lenta; calcular velocidad final en mEq/h."
      },
      {
        name: "Cloruro de potasio 0.04 mEq/mL",
        match: ["hipokalemia"],
        route: "Periferico",
        preparation: "En solucion salina 0.9% x 250 o 500 mL",
        content: "0.04 mEq/mL",
        use: "Opcion periferica preferida si se quiere evitar carga de dextrosa."
      },
      {
        name: "Cloruro de potasio 0.2 mEq/mL",
        match: ["hipokalemia"],
        route: "Central",
        preparation: "x 100 mL en agua destilada",
        content: "0.2 mEq/mL",
        use: "Via central; requiere bomba y monitorizacion segun severidad/protocolo."
      },
      {
        name: "Cloruro de potasio 0.2 mEq/mL",
        match: ["hipokalemia"],
        route: "Central",
        preparation: "x 100 mL en SSN 0.9%",
        content: "0.2 mEq/mL",
        use: "Via central; alternativa en SSN 0.9%."
      }
    ]
  },
  {
    title: "Reposicion de magnesio",
    rows: [
      {
        name: "Magnesio 40 mg/100 mL",
        match: ["hipomagnesemia"],
        route: "IV",
        preparation: "40 mg en 100 mL de solucion salina 0.9%",
        content: "40 mg/100 mL",
        use: "Administrar por bomba; ajustar numero de dosis segun magnesio, funcion renal y respuesta."
      }
    ]
  },
  {
    title: "Reposicion de fosforo",
    rows: [
      {
        name: "Fosfato de potasio central",
        match: ["hipofosfatemia"],
        route: "Central",
        preparation: "0.13 mmol/mL x 100 mL",
        content: "P 0.26 mEq/mL + K 0.19 mEq/mL",
        use: "Considerar aporte de potasio; ajustar por funcion renal y K serico."
      },
      {
        name: "Fosfato de potasio periferico",
        match: ["hipofosfatemia"],
        route: "Periferico",
        preparation: "0.026 mmol/mL en SSN 0.9% x 250 mL",
        content: "P 0.052 mEq/mL + K 0.038 mEq/mL",
        use: "Opcion periferica; vigilar calcio, potasio y producto Ca x P."
      }
    ]
  },
  {
    title: "Disnatremias",
    rows: [
      {
        name: "Hiponatremia",
        match: ["hiponatremia"],
        route: "Segun acceso",
        preparation: "Solucion hipertónica 7.5%, solucion hipertónica 3%, solucion salina 0.9%",
        content: "Elegir segun severidad, volemia y protocolo",
        use: "3% o 7.5% para correccion activa; SSN 0.9% si hipovolemia."
      },
      {
        name: "Hipernatremia",
        match: ["hipernatremia"],
        route: "IV / enteral / oral",
        preparation: "SSN 0.45%, DAD 5%, agua libre por sonda enteral o via oral",
        content: "Reposicion de agua libre",
        use: "Ajustar tasa para evitar descenso rapido de sodio."
      }
    ]
  }
];

function SolutionsGuide({ evaluation }) {
  const disorders = (evaluation?.classifications || []).map((item) => (item.disorder || "").toLowerCase());
  const matchingGroups = solutionGroups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.match?.some((key) => disorders.some((disorder) => disorder.includes(key))))
    }))
    .filter((group) => group.rows.length > 0);

  if (!evaluation) {
    return (
      <section className="solutions-guide">
        <div className="alert">Genera una evaluacion primero. Esta pestaña mostrara solo las soluciones que aplican a los trastornos detectados del paciente.</div>
      </section>
    );
  }

  return (
    <section className="solutions-guide">
      <div>
        <h2>Preparacion de soluciones aplicables</h2>
        <p>Solo se muestran las soluciones relacionadas con los trastornos detectados. Confirmar compatibilidad, velocidad y protocolo institucional antes de administrar.</p>
      </div>
      {matchingGroups.length === 0 && <div className="alert">No hay preparaciones especificas configuradas para los trastornos detectados en este caso.</div>}
      {matchingGroups.map((group) => (
        <div className="solution-group" key={group.title}>
          <h3>{group.title}</h3>
          <div className="solution-table">
            {group.rows.map((row, idx) => (
              <article className="solution-row" key={`${group.title}-${idx}`}>
                <div>
                  <strong>{row.name}</strong>
                  <span className="badge">{row.route}</span>
                </div>
                <small><b>Preparacion:</b> {row.preparation}</small>
                <small><b>Contenido:</b> {row.content}</small>
                <small><b>Uso:</b> {row.use}</small>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function AdminPanel() {
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await api("/admin/settings");
      setSettings(data.settings || {});
    } catch (err) {
      setError(err.message);
    }
  }

  function updateSetting(field, value) {
    setSettings((prev) => ({ ...(prev || {}), [field]: Number(value) }));
  }

  async function saveSettings(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await api("/admin/settings", { method: "PUT", body: JSON.stringify({ settings }) });
      setSettings(data.settings || {});
      setMessage("Configuracion institucional guardada.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadBackup() {
    setError("");
    setMessage("");
    try {
      const blob = await apiDownload("/admin/backup");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ionomed-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Backup descargado.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function restoreBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await api("/admin/backup/restore", { method: "POST", body: JSON.stringify(backup) });
      setMessage("Backup restaurado. Vuelve a iniciar sesion si los usuarios restaurados cambiaron.");
      await loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  if (!settings) return <div className="alert">Cargando configuracion institucional...</div>;

  return (
    <div className="admin-panel grid">
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <section className="card admin-actions">
        <h2>Backup local</h2>
        <p>Exporta y restaura la base SQLite completa de IonoMed. Antes de restaurar, el backend guarda una copia de seguridad previa en la carpeta de backups.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn secondary" type="button" onClick={downloadBackup} disabled={loading}>
            <Download size={18} /> Descargar backup
          </button>
          <label className="btn ghost file-button">
            <Upload size={18} /> Restaurar backup
            <input type="file" accept="application/json,.json" onChange={restoreBackup} disabled={loading} />
          </label>
        </div>
      </section>

      <form className="card grid" onSubmit={saveSettings}>
        <h2>Configuracion institucional</h2>
        <div className="grid two">
          <Num label="Factor correccion Na por glucosa" value={settings.sodiumGlucoseCorrectionFactor} onChange={(v) => updateSetting("sodiumGlucoseCorrectionFactor", v)} />
          <Num label="Max Na 24h estandar" value={settings.maxSodiumCorrection24hStandard} onChange={(v) => updateSetting("maxSodiumCorrection24hStandard", v)} />
          <Num label="Max Na 24h alto riesgo" value={settings.maxSodiumCorrection24hHighRisk} onChange={(v) => updateSetting("maxSodiumCorrection24hHighRisk", v)} />
          <Num label="Hidratacion hipercalcemia cc/h" value={settings.defaultHypercalcemiaHydrationRate} onChange={(v) => updateSetting("defaultHypercalcemiaHydrationRate", v)} />
          <Num label="Hidratacion con sobrecarga cc/h" value={settings.defaultOverloadHydrationRate} onChange={(v) => updateSetting("defaultOverloadHydrationRate", v)} />
        </div>
        <button className="btn primary" disabled={loading} type="submit"><Save size={18} /> Guardar configuracion</button>
      </form>
    </div>
  );
}

function PatientForm({ form, setForm, onSubmit, onEvaluate }) {
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
            <option value="linea_media">Línea media</option>
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

function ResultPanel({ evaluation, patientDetails, orderHistory, onOrderUpdated }) {
  if (!evaluation) return <div className="alert">Aún no hay evaluación generada.</div>;
  const calc = evaluation.calculations || {};
  return (
    <div className="result-panel">
      {(evaluation.globalAlerts || []).map((alert, idx) => <div className="alert red" key={idx}>{alert}</div>)}
      <FollowUpPanel followUp={evaluation.followUp} />
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
          <Metric label="Deficit Na estimado" value={display(calc.sodiumDeficitMeq, "mEq")} />
          <Metric label="Deficit K estimado" value={display(calc.potassiumDeficitMeq, "mEq")} />
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
        {(evaluation.orders || []).map((order, idx) => (
          <OrderCard
            order={order}
            calculations={calc}
            key={order._id || idx}
            onOrderUpdated={onOrderUpdated}
          />
        ))}
      </div>

      <div>
        <h2>Historial del paciente</h2>
        <Timeline labs={patientDetails?.labs || []} orders={orderHistory || []} />
      </div>
    </div>
  );
}

function FollowUpPanel({ followUp }) {
  if (!followUp) return null;
  return (
    <section className="card follow-card">
      <h2>Seguimiento y ajuste</h2>
      <p>{followUp.summary}</p>
      {(followUp.changes || []).length === 0 && <p>No hay electrolitos comparables contra el laboratorio previo.</p>}
      {(followUp.changes || []).length > 0 && (
        <div className="follow-grid">
          {followUp.changes.map((change) => (
            <div className="follow-item" key={change.key}>
              <strong>{change.label}</strong>
              <span>{change.previous} -&gt; {change.current} {change.unit}</span>
              <small>Delta {change.delta > 0 ? "+" : ""}{change.delta}{change.elapsedHours ? ` en ${change.elapsedHours} h` : ""}</small>
              {change.interpretation?.message && <em>{change.interpretation.message}</em>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }) {
  return <div className="metric"><strong>{value || "—"}</strong><small>{label}</small></div>;
}

const sodiumSolutionOptions = [
  { key: "d5w", label: "Dextrosa al 5%", sodium: 0 },
  { key: "saline045", label: "Solucion salina 0.45%", sodium: 77 },
  { key: "ringer", label: "Ringer lactato", sodium: 130 },
  { key: "saline09", label: "Solucion salina 0.9%", sodium: 154 },
  { key: "saline3", label: "Solucion salina 3%", sodium: 513 },
  { key: "saline75", label: "Solucion salina 7.5%", sodium: 1283 }
];

function SodiumSolutionSelector({ order, calculations, onTextCalculated }) {
  const [selectedKey, setSelectedKey] = useState("saline3");
  const isSodiumOrder = /natremia/i.test(order.disorder || "");
  if (!isSodiumOrder) return null;

  const safety = order.safety || {};
  const sodium = Number(safety.sodiumCorrected ?? safety.sodiumMeasured);
  const totalBodyWater = Number(safety.totalBodyWater ?? calculations?.totalBodyWater);
  const canCalculate = Number.isFinite(sodium) && Number.isFinite(totalBodyWater) && totalBodyWater > 0;

  function calculate(value) {
    setSelectedKey(value);
    const solution = sodiumSolutionOptions.find((item) => item.key === value);
    if (!solution || !canCalculate) return;
    const max12h = Number(safety.maxCorrection12h ?? safety.maxDecrease12h ?? 6);
    const max24h = Number(safety.maxCorrection24h ?? safety.maxDecrease24h ?? 10);
    const changePerLiter = Math.round(((solution.sodium - sodium) / (totalBodyWater + 1)) * 100) / 100;
    const absoluteChange = Math.abs(changePerLiter);
    const volume12h = absoluteChange > 0 ? Math.round((max12h / absoluteChange) * 1000) : null;
    const volume24h = absoluteChange > 0 ? Math.round((max24h / absoluteChange) * 1000) : null;
    const maxRate = absoluteChange > 0 ? Math.round((Math.min(max12h / 12, max24h / 24) / absoluteChange) * 1000) : null;
    const direction = changePerLiter >= 0 ? "aumento" : "descenso";
    const nextText = [
      `Paciente con ${String(order.disorder || "trastorno del sodio").toLowerCase()} (Na ${sodium} mmol/L).`,
      "Formula aplicada: cambio Na por litro = (Na infusion - Na serico) / (ACT + 1).",
      `Solucion escogida: ${solution.label} (Na ${solution.sodium} mEq/L). ACT estimada: ${totalBodyWater} L.`,
      `Cambio esperado: ${absoluteChange} mEq/L de ${direction} por cada 1000 cc.`,
      `Volumen maximo calculado: ${volume12h ?? "no calculable"} cc en 12 horas y ${volume24h ?? "no calculable"} cc en 24 horas.`,
      `Velocidad maxima sugerida: ${maxRate ?? "no calculable"} mL/h por bomba.`,
      `No superar ${max12h} mEq/L en 12 horas ni ${max24h} mEq/L en 24 horas.`,
      "Solicitar sodio de control cada 6 horas durante fase activa y ajustar segun resultado real."
    ].map((line, index) => `${index + 1}. ${line}`).join("\n");
    onTextCalculated(nextText);
  }

  return (
    <div className="safety-box solution-picker">
      <strong>Solucion para correccion</strong>
      <label>Escoger solucion
        <select value={selectedKey} onChange={(event) => calculate(event.target.value)}>
          {sodiumSolutionOptions.map((solution) => (
            <option key={solution.key} value={solution.key}>{solution.label} - Na {solution.sodium} mEq/L</option>
          ))}
        </select>
      </label>
      {!canCalculate && <small>Para recalcular automaticamente se requiere sodio y peso/ACT estimada.</small>}
      <button className="btn secondary" type="button" onClick={() => calculate(selectedKey)} disabled={!canCalculate}>
        Recalcular orden
      </button>
    </div>
  );
}

function OrderCard({ order, calculations, onOrderUpdated }) {
  const [text, setText] = useState(order.editedText || order.suggestedText || "");
  const [comment, setComment] = useState(order.comment || "");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(order.editedText || order.suggestedText || "");
    setComment(order.comment || "");
  }, [order]);

  async function update(path, options = {}) {
    if (!order._id) return null;
    setSaving(true);
    try {
      const updated = await api(path, options);
      onOrderUpdated?.(updated);
      return updated;
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    await update(`/orders/${order._id}/copy`, { method: "POST" });
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function saveEdit() {
    await update(`/orders/${order._id}/edit`, { method: "PUT", body: JSON.stringify({ editedText: text }) });
  }

  async function markDone() {
    await update(`/orders/${order._id}/mark-done`, { method: "POST", body: JSON.stringify({ comment }) });
  }

  async function markNotDone() {
    await update(`/orders/${order._id}/mark-not-done`, { method: "POST", body: JSON.stringify({ comment }) });
  }

  async function saveComment() {
    await update(`/orders/${order._id}/comment`, { method: "POST", body: JSON.stringify({ comment }) });
  }

  return (
    <article className="card order-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3>{order.disorder}</h3>
          {order.status && <span className="badge">{statusLabel(order.status)}</span>}
          <span className={`badge ${order.priority}`}>{order.severity} · {order.priority}</span>
        </div>
        <button className="btn secondary" onClick={copy} disabled={!order._id || saving}><ClipboardCopy size={18} /> {copied ? "Copiada" : "Copiar orden"}</button>
      </div>
      {(order.alerts || []).map((alert, idx) => <div className="alert red" key={idx}>{alert}</div>)}
      <SodiumSolutionSelector order={order} calculations={calculations} onTextCalculated={setText} />
      <OrderSafety order={order} />
      <label>Orden médica sugerida editable
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn secondary" onClick={saveEdit} disabled={!order._id || saving}>Guardar edicion</button>
        <button className="btn primary" onClick={markDone} disabled={!order._id || saving}>Marcar realizada</button>
        <button className="btn danger" onClick={markNotDone} disabled={!order._id || saving}>No realizada</button>
      </div>
      <label>Comentario medico
        <textarea className="comment-box" value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <button className="btn ghost" onClick={saveComment} disabled={!order._id || saving}>Guardar comentario</button>
      <div className="order-text">{text}</div>
      {(order.auditEvents || []).length > 0 && (
        <div className="audit-log">
          <strong>Auditoria</strong>
          {order.auditEvents.slice(-4).map((event, idx) => (
            <small key={idx}>{event.type} - {event.professionalRole || "rol no registrado"} - {formatDate(event.at)}</small>
          ))}
        </div>
      )}
      {order.justification && <p><strong>Justificación:</strong> {order.justification}</p>}
    </article>
  );
}

function OrderSafety({ order }) {
  const hasSafety = Boolean(order.safety);
  const controls = order.controls || [];
  const missing = order.missingData || [];
  if (!hasSafety && controls.length === 0 && missing.length === 0) return null;

  const safetyItems = hasSafety ? [
    ["sodiumMeasured", "Sodio medido", "mmol/L"],
    ["sodiumCorrected", "Sodio corregido", "mmol/L"],
    ["maxCorrection12h", "Max correccion 12 h", "mmol/L"],
    ["maxCorrection24h", "Max 24 h", "mmol/L"],
    ["maxDecrease12h", "Descenso max 12 h", "mmol/L"],
    ["maxDecrease24h", "Descenso max 24 h", "mmol/L"],
    ["target12h", "Meta Na 12 h", "mmol/L"],
    ["target24h", "Meta Na 24 h", "mmol/L"],
    ["targetInitialRise", "Meta inicial", ""],
    ["availableInfusions", "Infusiones disponibles", ""],
    ["selectedInfusion", "Mejor opcion sugerida", ""],
    ["continuousFluid", "Liquido continuo", ""],
    ["continuousRate", "Velocidad de infusion", "mL/h"],
    ["sodiumInfusateNa", "Na de infusion", "mEq/L"],
    ["sodiumInfusateChangePerLiter", "Cambio Na por litro", "mEq/L"],
    ["sodiumInfusateMaxRateMlH", "Velocidad max Na", "mL/h"],
    ["sodiumInfusateVolume12hMl", "Volumen max 12 h", "cc"],
    ["sodiumInfusateVolume24hMl", "Volumen max 24 h", "cc"],
    ["maxInfusionRateMlH", "Maximo permitido", "mL/h"],
    ["potassiumRateMeqH", "Velocidad de potasio", "mEq/h"],
    ["phosphateRateMmolH", "Velocidad de fosforo", "mmol/h"],
    ["magnesiumRateMgH", "Velocidad de magnesio", "mg/h"],
    ["estimated3PercentChangePerLiter", "NaCl 3% estimado", "mmol/L por litro"],
    ["estimated3PercentRateFor05", "NaCl 3% para 0.5 mmol/L/h", "mL/h"],
    ["freeWaterDeficitLiters", "Deficit agua libre", "L"],
    ["selectedSolutionVolumeMl", "Volumen solucion a Na 140", "cc"],
    ["solutionVolume12hMl", "Volumen solucion 12 h", "cc"],
    ["solutionVolume24hMl", "Volumen solucion 24 h", "cc"],
    ["water12hLiters", "Agua libre 12 h", "L"],
    ["water24hLiters", "Agua libre 24 h", "L"],
    ["potassium", "Potasio", "mmol/L"],
    ["magnesium", "Magnesio", "mg/dL"],
    ["phosphorus", "Fosforo", "mg/dL"],
    ["calcium", "Calcio usado", "mg/dL"],
    ["calciumTotal", "Calcio total", "mg/dL"],
    ["calciumCorrected", "Calcio corregido", "mg/dL"],
    ["calciumIonized", "Calcio ionizado", "mmol/L"],
    ["calciumPhosphorusProduct", "Producto Ca x P", ""],
    ["hydrationRate", "Hidratacion sugerida", "cc/h"],
    ["egfr", "TFG estimada", "mL/min/1.73m2"],
    ["peripheralMaxKclRate", "KCl periferico max", "mEq/h"],
    ["centralMaxKclRate", "KCl central max", "mEq/h"],
    ["peripheralMaxInfusionRateMlH", "Max periferico", "mL/h"],
    ["centralMaxInfusionRateMlH", "Max central", "mL/h"]
  ].filter(([key]) => order.safety[key] !== undefined && order.safety[key] !== null && order.safety[key] !== "") : [];

  return (
    <div className="safety-grid">
      {hasSafety && (
        <div className="safety-box">
          <strong>Seguridad</strong>
          {safetyItems.map(([key, label, unit]) => (
            <small key={key}>{label}: {order.safety[key]}{unit ? ` ${unit}` : ""}</small>
          ))}
          {order.safety.requiresEcg && <small>ECG requerido</small>}
          {order.safety.requiresCardiacMonitoring && <small>Monitorizacion cardiaca requerida</small>}
          {order.safety.highRiskOds && <small>Alto riesgo de desmielinizacion osmotica</small>}
          {order.safety.renalSevere && <small>Funcion renal severamente reducida</small>}
          {order.safety.oliguria && <small>Oliguria</small>}
          {order.safety.anuria && <small>Anuria</small>}
          {order.safety.refeedingRisk && <small>Riesgo de realimentacion</small>}
          {order.safety.overloadRisk && <small>Riesgo de sobrecarga hidrica</small>}
          {order.safety.malignantContext && <small>Contexto maligno probable</small>}
        </div>
      )}
      {controls.length > 0 && (
        <div className="safety-box">
          <strong>Controles</strong>
          {controls.map((control, idx) => <small key={idx}>{control}</small>)}
        </div>
      )}
      {missing.length > 0 && (
        <div className="safety-box">
          <strong>Datos no disponibles</strong>
          <small>La orden se genera con los datos actuales y se debe ajustar cuando haya nuevos resultados.</small>
          {missing.map((item, idx) => <small key={idx}>{item}</small>)}
        </div>
      )}
    </div>
  );
}

function Timeline({ labs, orders }) {
  const events = [
    ...labs.map((lab) => ({
      id: `lab-${lab._id}`,
      type: "Laboratorio",
      at: lab.collectedAt || lab.createdAt,
      title: "Laboratorio registrado",
      detail: `Na ${display(lab.sodium)} - K ${display(lab.potassium)} - Mg ${display(lab.magnesium)} - P ${display(lab.phosphorus)} - Ca ${display(lab.calciumTotal)} - Cr ${display(lab.creatinine)}`
    })),
    ...orders.map((order) => ({
      id: `order-${order._id}`,
      type: "Orden",
      at: order.createdAt,
      title: order.disorder,
      detail: `${statusLabel(order.status)} - ${order.severity || "sin severidad"} - ${order.priority || "sin prioridad"}`,
      text: order.editedText || order.suggestedText || ""
    }))
  ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  return (
    <div className="timeline">
      {events.length === 0 && <p>No hay historial guardado para este paciente.</p>}
      {events.slice(0, 12).map((event) => (
        <div className={`timeline-item ${event.type === "Orden" ? "order-event" : "lab-event"}`} key={event.id}>
          <strong>{formatDate(event.at)}<small>{event.type}</small></strong>
          <span>
            <b>{event.title}</b>
            <small>{event.detail}</small>
            {event.text && <em>{truncateText(event.text, 240)}</em>}
          </span>
        </div>
      ))}
    </div>
  );
}

function truncateText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function statusLabel(status) {
  return {
    suggested: "Sugerida",
    copied: "Copiada",
    edited: "Editada",
    done: "Realizada",
    not_done: "No realizada"
  }[status] || status;
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString();
}

function formatShortDate(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
