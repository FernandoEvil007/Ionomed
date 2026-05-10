import { useEffect, useState } from "react";
import { Activity, ChevronDown, ClipboardCopy, Download, Droplets, LogOut, Moon, Plus, Search, Save, ShieldAlert, Stethoscope, Sun, Trash2, Upload } from "lucide-react";
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
  const [notice, setNotice] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    newPassword: "",
    securityQuestion: "",
    securityAnswer: "",
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
    setNotice("");
    setLoading(true);
    try {
      if (mode === "recover") {
        if (!recoveryQuestion) {
          const data = await api("/auth/recovery-question", {
            method: "POST",
            body: JSON.stringify({ email: form.email })
          });
          setRecoveryQuestion(data.question);
          setNotice("Responde la pregunta para crear una contraseña nueva.");
          return;
        }

        const data = await api("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            securityAnswer: form.securityAnswer,
            newPassword: form.newPassword
          })
        });
        setNotice(data.message || "Contraseña actualizada. Ya puedes ingresar.");
        update("password", "");
        update("newPassword", "");
        update("securityAnswer", "");
        setRecoveryQuestion("");
        setMode("login");
        return;
      }

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

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
    setRecoveryQuestion("");
  };
  const authTitle = mode === "login" ? "Ingresar" : mode === "register" ? "Registro médico" : "Recuperar contraseña";
  const authSubtitle = mode === "login"
    ? "Accede a tu institución."
    : mode === "register"
      ? "Todo usuario debe especificar su rol profesional antes de usar la aplicación."
      : "Usa tu pregunta de seguridad para crear una contraseña nueva.";

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
            <h2>{authTitle}</h2>
            <p>{authSubtitle}</p>
          </div>
          {error && <div className="error">{error}</div>}
          {notice && <div className="success">{notice}</div>}
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
              <label>Pregunta de recuperación<input value={form.securityQuestion} onChange={(e) => update("securityQuestion", e.target.value)} placeholder="Ej. ¿Cuál fue tu primer hospital?" required minLength={6} /></label>
              <label>Respuesta de seguridad<input value={form.securityAnswer} onChange={(e) => update("securityAnswer", e.target.value)} required minLength={2} /></label>
            </>
          )}
          <label>Correo electrónico<input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
          {mode === "recover" ? (
            <>
              {recoveryQuestion && (
                <>
                  <div className="security-question"><strong>Pregunta:</strong><span>{recoveryQuestion}</span></div>
                  <label>Respuesta<input value={form.securityAnswer} onChange={(e) => update("securityAnswer", e.target.value)} required minLength={2} /></label>
                  <label>Nueva contraseña<input type="password" value={form.newPassword} onChange={(e) => update("newPassword", e.target.value)} required minLength={6} /></label>
                </>
              )}
              <button className="btn primary full" disabled={loading}>{loading ? "Procesando..." : recoveryQuestion ? "Actualizar contraseña" : "Ver pregunta"}</button>
              <button type="button" className="btn ghost full" onClick={() => switchMode("login")}>Volver al ingreso</button>
            </>
          ) : (
            <>
              <label>Contraseña<input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} /></label>
              <button className="btn primary full" disabled={loading}>{loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}</button>
              {mode === "login" && <button type="button" className="btn ghost full" onClick={() => switchMode("recover")}>Olvidé mi contraseña</button>}
              <button type="button" className="btn ghost full" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
              </button>
            </>
          )}
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
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState("todos");
  const [patientPanelOpen, setPatientPanelOpen] = useState(false);

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
    setPatientPanelOpen(false);
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

  const dashboardPatientsById = new Map((dashboard?.patients || []).map((patient) => [String(patient._id || patient.id), patient]));
  const patientCards = patients.map((patient) => {
    const summary = dashboardPatientsById.get(String(patient._id)) || {};
    return {
      ...patient,
      latestLab: summary.latestLab || null,
      topOrder: summary.topOrder || null,
      activeOrderCount: summary.activeOrderCount || 0,
      riskPriority: summary.riskPriority || "baja"
    };
  });
  const filteredPatients = patientCards.filter((patient) => {
    const search = patientSearch.trim().toLowerCase();
    const matchesSearch = !search || [
      patient.nameOrCode,
      patient.localIdentifier,
      patient.location,
      patient.clinicalArea,
      patient.topOrder?.disorder
    ].some((value) => String(value || "").toLowerCase().includes(search));
    const matchesFilter =
      patientFilter === "todos" ||
      (patientFilter === "criticos" && ["critica", "alta"].includes(patient.riskPriority)) ||
      (patientFilter === "controles" && patient.activeOrderCount > 0) ||
      (patientFilter === "uci" && patient.clinicalArea === "uci");
    return matchesSearch && matchesFilter;
  });

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
        </section>

        <DashboardPanels
          dashboard={dashboard}
          onSelectPatient={(patient) => {
            const fullPatient = patients.find((item) => String(item._id) === String(patient._id || patient.patientId));
            if (fullPatient) selectPatient(fullPatient);
          }}
        />

        <section className="workbench">
          <aside className={`card patient-sidebar ${patientPanelOpen ? "open" : "collapsed"}`}>
            <button className="patient-panel-toggle" type="button" onClick={() => setPatientPanelOpen((value) => !value)}>
              <span>
                <strong>Pacientes activos</strong>
                <small>{filteredPatients.length} de {patients.length}</small>
              </span>
              <ChevronDown size={18} />
            </button>
            <div className="patient-panel-body">
              <label className="patient-search">
                <Search size={16} />
                <input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Buscar paciente, cama o trastorno" />
              </label>
              <div className="patient-filters" aria-label="Filtros de pacientes">
                {[
                  ["todos", "Todos"],
                  ["criticos", "Criticos"],
                  ["controles", "Controles"],
                  ["uci", "UCI"]
                ].map(([value, label]) => (
                  <button key={value} type="button" className={patientFilter === value ? "active" : ""} onClick={() => setPatientFilter(value)}>
                    {label}
                  </button>
                ))}
              </div>
            <div className="patient-list">
              {patients.length === 0 && <p>No hay pacientes creados todavía.</p>}
              {patients.length > 0 && filteredPatients.length === 0 && <p>No hay pacientes para ese filtro.</p>}
              {filteredPatients.map((patient) => (
                <div key={patient._id} className={`patient-row priority-${patient.riskPriority}`}>
                  <button className="patient-select" type="button" onClick={() => selectPatient(patient)}>
                    <span><strong>{patient.nameOrCode}</strong><small>{patient.age ? `${patient.age} años · ` : ""}{patient.clinicalArea}</small></span>
                    <span className="patient-clinical-meta">
                      <small>{patient.topOrder?.disorder || "Sin alerta activa"}</small>
                      <b>{patientControlSummary(patient)}</b>
                    </span>
                    {patient.topOrder && (
                      <span className="patient-solution-line">
                        <small>Actual: {patientCurrentSolution(patient)}</small>
                      </span>
                    )}
                  </button>
                  <button className="icon-button danger" type="button" title="Eliminar paciente" onClick={() => deletePatient(patient)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            </div>
          </aside>

          <section className="card workspace-card">
            <SelectedPatientTreatmentPanel patient={selectedPatient} orderHistory={orderHistory} />
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

  return (
    <section className="dashboard-grid compact">
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
        <details className="controls-dropdown" open>
          <summary>
            <h2>Controles</h2>
            <span className="badge">{controls.length}</span>
          </summary>
        {controls.length === 0 && <p>No hay controles pendientes calculados.</p>}
          <div className="controls-list">
            {controls.slice(0, 10).map((control) => (
              <button className={`dashboard-row compact-row ${control.overdue ? "overdue" : ""}`} key={control.orderId} onClick={() => onSelectPatient({ patientId: control.patientId })}>
                <span>
                  <strong>{control.patientName}</strong>
                  <small>{control.disorder}</small>
                </span>
                <span>{control.controlValue ? `${control.controlValue} - ` : ""}{formatShortDate(control.dueAt)}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}

function SelectedPatientTreatmentPanel({ patient, orderHistory }) {
  if (!patient) return null;
  const activeOrder = (orderHistory || []).find((order) => !["done", "not_done"].includes(order.status)) || orderHistory?.[0];
  if (!activeOrder) {
    return (
      <section className="patient-treatment-panel">
        <div>
          <strong>{patient.nameOrCode}</strong>
          <small>Sin orden activa guardada. Ingresa laboratorio para generar plan.</small>
        </div>
      </section>
    );
  }
  const current = orderCurrentSolution(activeOrder);
  const options = orderSolutionOptions(activeOrder);
  return (
    <section className="patient-treatment-panel">
      <div>
        <strong>{patient.nameOrCode}</strong>
        <small>{activeOrder.disorder} · {activeOrder.severity} · {activeOrder.priority}</small>
      </div>
      <div className="treatment-current">
        <span>Solución actual</span>
        <strong>{current.solution}</strong>
        {current.rate && <small>{current.rate}</small>}
      </div>
      <div className="treatment-options">
        <span>Soluciones compatibles</span>
        <div>
          {options.map((option) => <small key={option}>{option}</small>)}
        </div>
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
        name: "Reposicion de magnesio IV",
        match: ["hipomagnesemia"],
        route: "IV",
        preparation: "Magnesio 4000 mg endovenosos para 24 horas",
        content: "4000 mg/24 h",
        use: "Administrar por bomba; ajustar o suspender segun funcion renal, reflejos, respiracion y control de magnesio."
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
        <label>Edad <small>opcional</small><input type="number" value={form.age || ""} onChange={(e) => update("age", e.target.value)} /></label>
        <label>Sexo
          <select value={form.sex} onChange={(e) => update("sex", e.target.value)}>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </label>
        <label>Peso kg <small>opcional, habilita ACT y deficits</small><input type="number" step="0.1" value={form.weightKg || ""} onChange={(e) => update("weightKg", e.target.value)} /></label>
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
  const classifications = evaluation.classifications || [];
  const orders = evaluation.orders || [];
  function downloadSummary() {
    const text = buildClinicalSummary(evaluation, patientDetails);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ionomed-resumen-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function printSummary() {
    window.print();
  }
  return (
    <div className="result-panel">
      {(evaluation.globalAlerts || []).map((alert, idx) => <div className="alert red" key={idx}>{alert}</div>)}
      <FollowUpPanel followUp={evaluation.followUp} />
      <section className="result-header">
        <div>
          <h2>Resultado clínico</h2>
          <p>{classifications.length ? `${classifications.length} trastorno(s) detectado(s) con los datos disponibles.` : "No se detectaron trastornos con los datos ingresados."}</p>
        </div>
        <div className="result-actions">
          <button className="btn ghost" type="button" onClick={downloadSummary}><Download size={18} /> Exportar resumen</button>
          <button className="btn secondary" type="button" onClick={printSummary}>Imprimir / PDF</button>
        </div>
      </section>

      <ClinicalWorkflow classifications={classifications} orders={orders} labs={patientDetails?.labs || []} />

      <section className="clinical-section">
        <div>
          <h2>Cálculos automáticos</h2>
          <p>Los cálculos aparecen solo cuando los datos necesarios están disponibles.</p>
        </div>
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
      </section>

      <section className="clinical-section">
        <h2>Trastornos detectados</h2>
        {classifications.length === 0 && <p>No se detectaron trastornos con los datos ingresados.</p>}
        <div className="classification-grid">
          {classifications.map((item, idx) => (
            <div className="classification-card" key={idx}>
              <span className={`badge ${item.priority}`}>{item.priority}</span>
              <strong>{item.disorder}</strong>
              <small>Severidad: {item.severity || "no definida"}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="clinical-section">
        <div>
          <h2>Órdenes médicas sugeridas</h2>
          <p>Cada orden conserva auditoría de copia, edición, recálculo y estado final.</p>
        </div>
        {orders.map((order, idx) => (
          <OrderCard
            order={order}
            calculations={calc}
            key={order._id || idx}
            onOrderUpdated={onOrderUpdated}
          />
        ))}
      </section>

      <ClinicalValidationPanel />

      <section className="clinical-section">
        <h2>Historial del paciente</h2>
        <LabTrendTable labs={patientDetails?.labs || []} />
        <Timeline labs={patientDetails?.labs || []} orders={orderHistory || []} />
      </section>
    </div>
  );
}

function ClinicalWorkflow({ classifications, orders, labs }) {
  const steps = [
    ["Paciente", labs.length ? "Paciente con laboratorios guardados" : "Datos clínicos disponibles"],
    ["Laboratorio", labs[0] ? formatDate(labs[0].collectedAt || labs[0].createdAt) : "Pendiente de guardar"],
    ["Diagnóstico", classifications.length ? `${classifications.length} trastorno(s)` : "Sin trastorno detectado"],
    ["Plan", orders.length ? `${orders.length} orden(es) sugeridas` : "Sin orden activa"],
    ["Seguimiento", "Controles por severidad y fecha/hora"]
  ];
  return (
    <section className="workflow-strip">
      {steps.map(([title, detail], index) => (
        <div className="workflow-step" key={title}>
          <span>{index + 1}</span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </div>
      ))}
    </section>
  );
}

function ClinicalValidationPanel() {
  const cases = [
    ["Na 110 + síntomas neurológicos", "Bolo hipertónico, control estrecho y límite de corrección."],
    ["Na 122 hipovolémico", "Corrección con solución compatible, volemia y límite 12/24 h."],
    ["Na 156", "Déficit de agua libre, solución compatible y sodio cada 6 h."],
    ["K 1.8", "Potasio central, UCI, ECG y control a 6 h."],
    ["K 2.4", "Potasio central a 50 cc/h y control seriado."],
    ["K 6.8", "Monitorización electrocardiográfica, UCI y medidas de reducción."],
    ["Mg bajo + ERC", "Reposición 4000 mg IV/24 h con vigilancia renal/toxicidad."],
    ["P bajo + realimentación", "Reposición compatible y control P/Mg/K/Ca."],
    ["Ca severo", "ECG, calcio corregido/ionizado y vigilancia renal/volémica."],
    ["Hipercalcemia maligna", "Hidratación, antirresortivo según función renal y oncología."]
  ];
  return (
    <section className="clinical-section validation-panel">
      <div>
        <h2>Validación clínica interna</h2>
        <p>Escenarios críticos que deben seguir funcionando en cada ajuste del motor.</p>
      </div>
      <div className="validation-grid">
        {cases.map(([title, detail]) => (
          <div className="validation-item" key={title}>
            <strong>{title}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
    </section>
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

const electrolyteSolutionOptions = {
  potassiumPeripheral: [
    { key: "k002", label: "KCl 0.02 mEq/mL en DAD 5% x 500 mL", concentration: 0.02 },
    { key: "k004", label: "KCl 0.04 mEq/mL en SSN 0.9% x 250 o 500 mL", concentration: 0.04 }
  ],
  potassiumCentral: [
    { key: "k02ssn", label: "KCl 0.2 mEq/mL x 100 mL en SSN 0.9%", concentration: 0.2 },
    { key: "k02agua", label: "KCl 0.2 mEq/mL x 100 mL en agua destilada", concentration: 0.2 }
  ],
  magnesium: [
    { key: "mg4000", label: "Magnesio 4000 mg endovenosos para 24 horas", totalDoseMg: 4000, hours: 24 }
  ],
  phosphorusCentral: [
    { key: "pcentral", label: "Fosfato de potasio central 0.13 mmol/mL x 100 mL", concentration: 0.13, potassium: 0.19 }
  ],
  phosphorusPeripheral: [
    { key: "pperipheral", label: "Fosfato de potasio periferico 0.026 mmol/mL en SSN 0.9% x 250 mL", concentration: 0.026, potassium: 0.038 }
  ],
  hypocalcemia: [
    { key: "gluconate", label: "Gluconato de calcio al 10% IV lento" }
  ],
  hypercalcemia: [
    { key: "ssn09", label: "Solucion salina 0.9%" }
  ]
};

function ElectrolyteSolutionSelector({ order, calculations, onTextCalculated }) {
  const disorder = String(order.disorder || "").toLowerCase();
  if (disorder.includes("natremia")) {
    return <SodiumSolutionSelector order={order} calculations={calculations} onTextCalculated={onTextCalculated} />;
  }
  return <NonSodiumSolutionSelector order={order} onTextCalculated={onTextCalculated} />;
}

function SodiumSolutionSelector({ order, calculations, onTextCalculated }) {
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState(null);
  const disorder = String(order.disorder || "").toLowerCase();
  const isSodiumOrder = /natremia/i.test(order.disorder || "");
  const isHypernatremia = disorder.includes("hipernatremia");
  const compatibleSolutions = sodiumSolutionOptions.filter((solution) => {
    if (isHypernatremia) return ["d5w", "saline045"].includes(solution.key);
    return ["saline09", "saline3", "saline75"].includes(solution.key);
  });
  const defaultKey = isHypernatremia ? "d5w" : "saline3";
  const [selectedKey, setSelectedKey] = useState(defaultKey);
  const defaultDailyChange = Number(order.safety?.maxCorrection24h ?? order.safety?.maxDecrease24h ?? 10);
  const [dailyChange, setDailyChange] = useState(Math.min(defaultDailyChange || 8, 8));
  const safety = order.safety || {};
  const textSource = `${order.editedText || ""} ${order.suggestedText || ""}`;
  const sodiumFromText = textSource.match(/(?:Na|sodio)\s*(?:serico\s*)?(\d+(?:\.\d+)?)/i)?.[1];
  const tbwFromText = textSource.match(/ACT(?:\s+estimada)?:\s*(\d+(?:\.\d+)?)/i)?.[1];
  const sodium = Number(safety.sodiumCorrected ?? safety.sodiumMeasured ?? calculations?.sodiumCorrected ?? sodiumFromText);
  const totalBodyWater = Number(safety.totalBodyWater ?? calculations?.totalBodyWater ?? tbwFromText);
  const canCalculate = Number.isFinite(sodium) && Number.isFinite(totalBodyWater) && totalBodyWater > 0;

  function calculateModel(value) {
    const solution = compatibleSolutions.find((item) => item.key === value);
    if (!solution || !canCalculate) return null;
    const max4h = Number(safety.maxCorrection4h ?? safety.maxDecrease4h ?? 1.5);
    const max8h = Number(safety.maxCorrection8h ?? safety.maxDecrease8h ?? 3);
    const max12h = Number(safety.maxCorrection12h ?? safety.maxDecrease12h ?? 5);
    const max24h = Number(safety.maxCorrection24h ?? safety.maxDecrease24h ?? 8);
    const desired24h = Math.min(Math.max(Number(dailyChange) || max24h, 0.5), max24h);
    const changePerLiter = Math.round(((solution.sodium - sodium) / (totalBodyWater + 1)) * 100) / 100;
    const absoluteChange = Math.abs(changePerLiter);
    const volume12h = absoluteChange > 0 ? Math.round((max12h / absoluteChange) * 1000) : null;
    const volume24h = absoluteChange > 0 ? Math.round((desired24h / absoluteChange) * 1000) : null;
    const maxRate = absoluteChange > 0 ? Math.round((Math.min(max4h / 4, max8h / 8, max12h / 12, desired24h / 24) / absoluteChange) * 1000) : null;
    const direction = changePerLiter >= 0 ? "aumento" : "descenso";
    const slowSaline09Hyponatremia = !isHypernatremia && solution.key === "saline09";
    const volume72h = slowSaline09Hyponatremia && absoluteChange > 0 ? Math.round((desired24h / absoluteChange) * 1000) : null;
    const rate72h = volume72h ? Math.round(volume72h / 72) : null;
    if (slowSaline09Hyponatremia) {
      const text = [
        `Paciente con ${String(order.disorder || "hiponatremia").toLowerCase()} (Na ${sodium} mmol/L).`,
        "Formula aplicada: cambio Na por litro = (Na infusion - Na serico) / (ACT + 1).",
        `Solucion escogida: ${solution.label} (Na ${solution.sodium} mEq/L). ACT estimada: ${totalBodyWater} L.`,
        `Cambio esperado: ${absoluteChange} mEq/L de ${direction} por cada 1000 cc.`,
        `Cambio objetivo elegido: ${desired24h} mEq/L.`,
        `Volumen calculado para ese cambio: ${volume72h ?? "no calculable"} cc, administrado en 72 horas para correccion lenta.`,
        `Velocidad sugerida: ${rate72h ?? "no calculable"} mL/h por bomba.`,
        `No superar ${max4h} mEq/L en 4 horas, ${max8h} mEq/L en 8 horas, ${max12h} mEq/L en 12 horas ni ${max24h} mEq/L en 24 horas; ajustar segun sodio real.`,
        "Solicitar sodio de control cada 6 horas durante fase activa y ajustar segun resultado real."
      ].map((line, index) => `${index + 1}. ${line}`).join("\n");
      return { solution, changePerLiter, absoluteChange, volume12h: null, volume24h: null, volume72h, maxRate: rate72h, direction, desired24h, text };
    }
    const text = [
      `Paciente con ${String(order.disorder || "trastorno del sodio").toLowerCase()} (Na ${sodium} mmol/L).`,
      "Formula aplicada: cambio Na por litro = (Na infusion - Na serico) / (ACT + 1).",
      `Solucion escogida: ${solution.label} (Na ${solution.sodium} mEq/L). ACT estimada: ${totalBodyWater} L.`,
      `Cambio esperado: ${absoluteChange} mEq/L de ${direction} por cada 1000 cc.`,
      `Cambio objetivo elegido: ${desired24h} mEq/L en 24 horas.`,
      `Volumen calculado: ${volume12h ?? "no calculable"} cc como limite de 12 horas y ${volume24h ?? "no calculable"} cc para el objetivo de 24 horas.`,
      `Velocidad maxima sugerida: ${maxRate ?? "no calculable"} mL/h por bomba.`,
      `No superar ${max4h} mEq/L en 4 horas, ${max8h} mEq/L en 8 horas, ${max12h} mEq/L en 12 horas ni ${max24h} mEq/L en 24 horas.`,
      "Solicitar sodio de control cada 6 horas durante fase activa y ajustar segun resultado real."
    ].map((line, index) => `${index + 1}. ${line}`).join("\n");
    return { solution, changePerLiter, absoluteChange, volume12h, volume24h, maxRate, direction, desired24h, text };
  }

  useEffect(() => {
    if (!isSodiumOrder) return;
    const model = calculateModel(selectedKey);
    if (model) {
      setPreview(model);
      onTextCalculated(model.text);
    }
  }, [isSodiumOrder, selectedKey, sodium, totalBodyWater, order.disorder, dailyChange]);

  if (!isSodiumOrder) return null;

  function calculate(value) {
    setSelectedKey(value);
    const model = calculateModel(value);
    if (!model) {
      setStatus("No se pudo recalcular: falta sodio o ACT/peso.");
      return;
    }
    setPreview(model);
    onTextCalculated(model.text, {
      recalculated: true,
      solution: model.solution.label,
      dailyChange: model.desired24h,
      rate: model.maxRate
    });
    setStatus(`Orden recalculada con ${model.solution.label}.`);
  }

  return (
    <div className="safety-box solution-picker">
      <strong>Solucion para correccion</strong>
      <label>Escoger solucion
        <select value={selectedKey} onChange={(event) => calculate(event.target.value)}>
          {compatibleSolutions.map((solution) => (
            <option key={solution.key} value={solution.key}>{solution.label} - Na {solution.sodium} mEq/L</option>
          ))}
        </select>
      </label>
      <label>Cambio objetivo en 24 horas (mEq/L)
        <input
          type="number"
          min="0.5"
          max={defaultDailyChange || 10}
          step="0.5"
          value={dailyChange}
          onChange={(event) => setDailyChange(event.target.value)}
        />
      </label>
      {!canCalculate && <small>Para recalcular automaticamente se requiere sodio y peso/ACT estimada.</small>}
      {preview && <small>{preview.solution.label}: {preview.absoluteChange} mEq/L por litro, max {preview.maxRate} mL/h.</small>}
      {status && <small>{status}</small>}
      <button className="btn secondary" type="button" onClick={() => calculate(selectedKey)}>
        Recalcular y generar orden
      </button>
    </div>
  );
}

function NonSodiumSolutionSelector({ order, onTextCalculated }) {
  const disorder = String(order.disorder || "").toLowerCase();
  const safety = order.safety || {};
  const potassium = Number(safety.potassium);
  const severity = String(order.severity || "").toLowerCase();

  let title = "Solucion para reposicion";
  let options = [];
  let defaultRate = Number(safety.infusionRateMlH ?? safety.continuousRate);
  let calculator = null;

  if (disorder.includes("hipokalemia")) {
    const central = (Number.isFinite(potassium) && potassium < 3 && severity !== "leve") || String(safety.selectedInfusion || "").includes("central");
    options = central ? electrolyteSolutionOptions.potassiumCentral : electrolyteSolutionOptions.potassiumPeripheral;
    defaultRate = central ? (potassium < 2 ? 100 : 50) : (defaultRate || 50);
    calculator = (solution) => {
      const potassiumRate = Math.round(defaultRate * solution.concentration * 10) / 10;
      return [
        `Paciente con ${String(order.disorder || "hipokalemia").toLowerCase()} (K ${Number.isFinite(potassium) ? potassium : "no disponible"} mmol/L).`,
        `Solucion escogida: ${solution.label}.`,
        `Pasar a ${defaultRate} mL/h por bomba (${potassiumRate} mEq/h de potasio).`,
        central ? "Usar por via central." : "Usar por via periferica si la vena y el protocolo institucional lo permiten.",
        "Solicitar potasio y magnesio de control segun intervalo indicado y ajustar segun resultado."
      ];
    };
  } else if (disorder.includes("hipomagnesemia")) {
    options = electrolyteSolutionOptions.magnesium;
    calculator = (solution) => {
      const magnesiumRate = Math.round(solution.totalDoseMg / solution.hours);
      return [
        `Paciente con ${String(order.disorder || "hipomagnesemia").toLowerCase()} (Mg ${safety.magnesium ?? "no disponible"} mg/dL).`,
        `Solucion escogida: ${solution.label}.`,
        `Administrar ${solution.totalDoseMg} mg endovenosos para ${solution.hours} horas por bomba (${magnesiumRate} mg/h en promedio).`,
        "Ajustar o suspender si hay deterioro renal, arreflexia, depresion respiratoria, hipotension o signos de toxicidad.",
        "Solicitar magnesio, potasio, calcio y creatinina de control segun severidad y funcion renal."
      ];
    };
  } else if (disorder.includes("hipofosfatemia")) {
    const central = severity === "severa" || String(safety.selectedInfusion || "").includes("central");
    options = central ? electrolyteSolutionOptions.phosphorusCentral : electrolyteSolutionOptions.phosphorusPeripheral;
    defaultRate = defaultRate || (central ? 100 : 50);
    calculator = (solution) => {
      const phosphorusRate = Math.round(defaultRate * solution.concentration * 10) / 10;
      const potassiumRate = solution.potassium ? Math.round(defaultRate * solution.potassium * 10) / 10 : null;
      return [
        `Paciente con ${String(order.disorder || "hipofosfatemia").toLowerCase()} (P ${safety.phosphorus ?? "no disponible"} mg/dL).`,
        `Solucion escogida: ${solution.label}.`,
        `Pasar a ${defaultRate} mL/h por bomba (${phosphorusRate} mmol/h de fosforo${potassiumRate ? `; aporte aproximado de K ${potassiumRate} mEq/h` : ""}).`,
        central ? "Usar por via central." : "Usar por via periferica.",
        "Vigilar calcio, potasio, producto calcio-fosforo y funcion renal."
      ];
    };
  } else if (disorder.includes("hipocalcemia")) {
    options = electrolyteSolutionOptions.hypocalcemia;
    calculator = (solution) => [
      `Paciente con ${String(order.disorder || "hipocalcemia").toLowerCase()} (Ca ${safety.calcium ?? safety.calciumCorrected ?? safety.calciumTotal ?? "no disponible"} mg/dL).`,
      `Solucion escogida: ${solution.label}.`,
      "Administrar IV lento bajo monitorizacion si hay sintomas importantes, QT prolongado o hipocalcemia severa.",
      "Solicitar calcio ionizado o corregido, magnesio, fosforo y creatinina de control."
    ];
  } else if (disorder.includes("hipercalcemia")) {
    options = electrolyteSolutionOptions.hypercalcemia;
    defaultRate = Number(safety.hydrationRate ?? safety.continuousRate ?? 150);
    calculator = (solution) => [
      `Paciente con ${String(order.disorder || "hipercalcemia").toLowerCase()} (Ca ${safety.calcium ?? safety.calciumCorrected ?? safety.calciumTotal ?? "no disponible"} mg/dL).`,
      `Solucion escogida: ${solution.label}.`,
      `Pasar a ${defaultRate} cc/h por bomba si el estado clinico lo permite.`,
      "Ajustar por volemia, diuresis, creatinina y signos de congestion. Suspender aportes de calcio/vitamina D si aplica."
    ];
  }

  const [selectedKey, setSelectedKey] = useState(options[0]?.key || "");
  const [status, setStatus] = useState("");
  if (!options.length || !calculator) return null;

  function generate(value) {
    const solution = options.find((item) => item.key === value) || options[0];
    setSelectedKey(solution.key);
    const text = calculator(solution).map((line, index) => `${index + 1}. ${line}`).join("\n");
    onTextCalculated(text, {
      recalculated: true,
      solution: solution.label,
      rate: defaultRate || null
    });
    setStatus(`Orden recalculada con ${solution.label}.`);
  }

  return (
    <div className="safety-box solution-picker">
      <strong>{title}</strong>
      <label>Escoger solucion
        <select value={selectedKey} onChange={(event) => generate(event.target.value)}>
          {options.map((solution) => (
            <option key={solution.key} value={solution.key}>{solution.label}</option>
          ))}
        </select>
      </label>
      {status && <small>{status}</small>}
      <button className="btn secondary" type="button" onClick={() => generate(selectedKey || options[0].key)}>
        Recalcular y generar orden
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

  async function handleCalculatedText(nextText, metadata = {}) {
    setText(nextText);
    if (!metadata.recalculated || !order._id) return;
    const updated = await update(`/orders/${order._id}/recalculate`, {
      method: "POST",
      body: JSON.stringify({ editedText: nextText, metadata })
    });
    if (updated?.editedText) setText(updated.editedText);
  }

  return (
    <article className="card order-card">
      <div className="order-card-header">
        <div>
          <h3>{order.disorder}</h3>
          {order.status && <span className="badge">{statusLabel(order.status)}</span>}
          <span className={`badge ${order.priority}`}>{order.severity} · {order.priority}</span>
        </div>
        <button className="btn secondary" onClick={copy} disabled={!order._id || saving}><ClipboardCopy size={18} /> {copied ? "Copiada" : "Copiar orden"}</button>
      </div>
      <OrderAlerts order={order} />
      <OrderClinicalBrief order={order} />
      <SafetyChecklist order={order} />
      <ElectrolyteSolutionSelector order={order} calculations={calculations} onTextCalculated={handleCalculatedText} />
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

function OrderAlerts({ order }) {
  const hiddenPatterns = [
    /no se activa solucion hipertonica/i,
    /no se activa solución hipertónica/i,
    /datos faltantes para mayor precision/i,
    /datos faltantes para mayor precisión/i
  ];
  const alerts = [...new Set((order.alerts || []).filter((alert) =>
    alert && !hiddenPatterns.some((pattern) => pattern.test(alert))
  ))];
  if (!alerts.length) return null;
  const missingAlerts = alerts.filter((alert) => /datos faltantes/i.test(alert));
  const limitAlerts = alerts.filter((alert) => /limite|límite|no superar/i.test(alert));
  const criticalAlerts = alerts.filter((alert) => !missingAlerts.includes(alert) && !limitAlerts.includes(alert));
  const headline = criticalAlerts[0] || limitAlerts[0] || missingAlerts[0];
  const extraAlerts = alerts.filter((alert) => alert !== headline);
  return (
    <div className="order-alert-summary">
      <div>
        <strong>Seguridad clínica</strong>
        <span>{headline}</span>
      </div>
      {extraAlerts.length > 0 && (
        <details>
          <summary>Ver {extraAlerts.length} alerta(s) adicional(es)</summary>
          <div>
            {extraAlerts.map((alert) => <small key={alert}>{alert}</small>)}
          </div>
        </details>
      )}
    </div>
  );
}

function OrderClinicalBrief({ order }) {
  const safety = order.safety || {};
  const speedValue = safety.infusionRateMlH || safety.continuousRate || safety.sodiumInfusateMaxRateMlH || safety.hydrationRate;
  const items = [
    ["Diagnóstico", order.disorder],
    ["Severidad", order.severity],
    ["Prioridad", order.priority],
    ["Solución", safety.selectedInfusion || safety.continuousFluid || "según selector"],
    ["Velocidad", speedValue ? `${speedValue} mL/h` : "No definida"],
    ["Protocolo", safety.protocolVersion || "no registrado"]
  ];
  return (
    <div className="order-brief">
      {items.map(([label, value]) => (
        <div key={label}>
          <small>{label}</small>
          <strong>{value || "No disponible"}</strong>
        </div>
      ))}
    </div>
  );
}

function SafetyChecklist({ order }) {
  const safety = order.safety || {};
  const missing = order.missingData || [];
  const checks = [
    ["Datos faltantes", missing.length ? missing.join(", ") : "Completo para seguridad básica", missing.length ? "warn" : "ok"],
    ["Límites máximos", safety.maxCorrection24h || safety.maxDecrease24h ? `24 h: ${safety.maxCorrection24h ?? safety.maxDecrease24h}; 12 h: ${safety.maxCorrection12h ?? safety.maxDecrease12h}; 8 h: ${safety.maxCorrection8h ?? safety.maxDecrease8h ?? 3}; 4 h: ${safety.maxCorrection4h ?? safety.maxDecrease4h ?? 1.5}` : "No aplica", "ok"],
    ["Vía requerida", safety.selectedInfusion || safety.continuousFluid || "Confirmar según solución", safety.selectedInfusion || safety.continuousFluid ? "ok" : "warn"],
    ["ECG", safety.requiresEcg ? "Requerido" : "Según criterio clínico", safety.requiresEcg ? "warn" : "ok"],
    ["Monitorización", safety.requiresCardiacMonitoring ? "Cardiaca continua" : "Según evolución", safety.requiresCardiacMonitoring ? "warn" : "ok"],
    ["UCI / Nefrología", order.suggestedText?.match(/UCI|cuidados intensivos|nefrolog/i) ? "Considerar según orden" : "No aplica de rutina", order.suggestedText?.match(/UCI|cuidados intensivos|nefrolog/i) ? "warn" : "ok"],
    ["Riesgo renal/sobrecarga", safety.renalSevere || safety.overloadRisk || safety.oliguria || safety.anuria ? "Presente" : "Sin alerta activa", safety.renalSevere || safety.overloadRisk || safety.oliguria || safety.anuria ? "warn" : "ok"]
  ];
  return (
    <div className="safety-checklist">
      <strong>Checklist antes de copiar</strong>
      <div>
        {checks.map(([label, detail, state]) => (
          <span className={`safety-check ${state}`} key={label}>
            <b>{label}</b>
            <small>{detail}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function OrderSafety({ order }) {
  const hasSafety = Boolean(order.safety);
  const controls = order.controls || [];
  const missing = order.missingData || [];
  if (!hasSafety && controls.length === 0 && missing.length === 0) return null;

  const safetyItems = hasSafety ? [
    ["protocolVersion", "Version protocolo", ""],
    ["dataCompleteness", "Datos", ""],
    ["sodiumMeasured", "Sodio medido", "mmol/L"],
    ["sodiumCorrected", "Sodio corregido", "mmol/L"],
    ["maxCorrection12h", "Max correccion 12 h", "mmol/L"],
    ["maxCorrection8h", "Max correccion 8 h", "mmol/L"],
    ["maxCorrection4h", "Max correccion 4 h", "mmol/L"],
    ["maxCorrection24h", "Max 24 h", "mmol/L"],
    ["maxDecrease12h", "Descenso max 12 h", "mmol/L"],
    ["maxDecrease8h", "Descenso max 8 h", "mmol/L"],
    ["maxDecrease4h", "Descenso max 4 h", "mmol/L"],
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

function LabTrendTable({ labs }) {
  const rows = [...labs].sort((a, b) => new Date(b.collectedAt || b.createdAt || 0) - new Date(a.collectedAt || a.createdAt || 0)).slice(0, 6);
  if (!rows.length) return <p>No hay laboratorios guardados para mostrar tendencia.</p>;
  return (
    <div className="lab-table-wrap">
      <table className="lab-table">
        <thead>
          <tr>
            <th>Fecha/hora</th>
            <th>Na</th>
            <th>K</th>
            <th>Mg</th>
            <th>P</th>
            <th>Ca</th>
            <th>Cr</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((lab) => (
            <tr key={lab._id}>
              <td>{formatDate(lab.collectedAt || lab.createdAt)}</td>
              <td>{display(lab.sodium)}</td>
              <td>{display(lab.potassium)}</td>
              <td>{display(lab.magnesium)}</td>
              <td>{display(lab.phosphorus)}</td>
              <td>{display(lab.calciumIonized ?? lab.calciumTotal)}</td>
              <td>{display(lab.creatinine)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function truncateText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function buildClinicalSummary(evaluation, patientDetails) {
  const patient = patientDetails?.patient;
  const calc = evaluation?.calculations || {};
  const lines = [
    "IonoMed - Resumen clínico",
    `Fecha: ${formatDate(new Date().toISOString())}`,
    patient ? `Paciente: ${patient.nameOrCode}` : "Paciente: evaluación preliminar no guardada",
    "",
    "Cálculos",
    `TFG CKD-EPI: ${display(calc.egfr, "mL/min/1.73m2")}`,
    `Cockcroft-Gault: ${display(calc.cockcroftGault, "mL/min")}`,
    `ACT estimada: ${display(calc.totalBodyWater, "L")}`,
    `Na corregido: ${display(calc.sodiumCorrected, "mmol/L")}`,
    `Ca corregido: ${display(calc.calciumCorrected, "mg/dL")}`,
    `Déficit Na: ${display(calc.sodiumDeficitMeq, "mEq")}`,
    `Déficit K: ${display(calc.potassiumDeficitMeq, "mEq")}`,
    "",
    "Trastornos detectados",
    ...((evaluation?.classifications || []).map((item) => `- ${item.disorder} (${item.severity}, ${item.priority})`) || ["- Ninguno"]),
    "",
    "Órdenes sugeridas",
    ...((evaluation?.orders || []).flatMap((order, index) => [
      `${index + 1}. ${order.disorder}`,
      order.editedText || order.suggestedText || "",
      ""
    ]))
  ];
  return lines.join("\n");
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

function priorityShortLabel(priority) {
  return {
    critica: "Critico",
    alta: "Alto",
    moderada: "Medio",
    leve: "Leve",
    baja: "Bajo"
  }[priority] || "Bajo";
}

function patientControlSummary(patient) {
  const lab = patient.latestLab || {};
  const disorder = String(patient.topOrder?.disorder || "").toLowerCase();
  if (disorder.includes("natremia") && lab.sodium !== undefined && lab.sodium !== null) return `Na ${lab.sodium}`;
  if (disorder.includes("kalemia") && lab.potassium !== undefined && lab.potassium !== null) return `K ${lab.potassium}`;
  if (disorder.includes("magnes") && lab.magnesium !== undefined && lab.magnesium !== null) return `Mg ${lab.magnesium}`;
  if (disorder.includes("fosf") && lab.phosphorus !== undefined && lab.phosphorus !== null) return `P ${lab.phosphorus}`;
  if (disorder.includes("calcemia") && (lab.calciumIonized !== undefined || lab.calciumTotal !== undefined)) return `Ca ${lab.calciumIonized ?? lab.calciumTotal}`;
  return patient.activeOrderCount ? `${patient.activeOrderCount} orden(es)` : "Sin control";
}

function patientCurrentSolution(patient) {
  const current = orderCurrentSolution(patient.topOrder || {});
  return current.rate ? `${current.solution} · ${current.rate}` : current.solution;
}

function orderCurrentSolution(order) {
  const safety = order.safety || {};
  const solution = safety.selectedInfusion || safety.continuousFluid || safety.currentSolution || "No definida";
  const rateValue = safety.infusionRateMlH ?? safety.continuousRate ?? safety.sodiumInfusateMaxRateMlH ?? safety.hydrationRate;
  const rate = rateValue ? `${rateValue} mL/h` : "";
  return { solution, rate };
}

function orderSolutionOptions(order) {
  const safety = order.safety || {};
  if (safety.availableInfusions) {
    return String(safety.availableInfusions)
      .split(/;|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);
  }
  const disorder = String(order.disorder || "").toLowerCase();
  if (disorder.includes("hiponatremia")) return ["Solucion salina 3%", "Solucion salina 7.5%", "Solucion salina 0.9%"];
  if (disorder.includes("hipernatremia")) return ["Dextrosa al 5%", "Solucion salina 0.45%", "Agua libre oral/enteral"];
  if (disorder.includes("hipokalemia")) return ["KCl periferico 0.02 mEq/mL", "KCl periferico 0.04 mEq/mL", "KCl central 0.2 mEq/mL"];
  if (disorder.includes("hipomagnesemia")) return ["Magnesio 4000 mg IV para 24 horas"];
  if (disorder.includes("hipofosfatemia")) return ["Fosfato de potasio central", "Fosfato de potasio periferico"];
  if (disorder.includes("hipocalcemia")) return ["Gluconato de calcio al 10%"];
  if (disorder.includes("hipercalcemia")) return ["Solucion salina 0.9%"];
  return ["No hay soluciones especificas registradas"];
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
