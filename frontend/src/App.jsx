import { useEffect, useRef, useState } from "react";
import { Activity, ChevronDown, ClipboardCopy, Download, Droplets, FileText, FlaskConical, LogOut, Moon, MoreHorizontal, Plus, Search, Save, ShieldAlert, Stethoscope, Sun, Trash2, Upload, UserRound } from "lucide-react";
import { api, apiDownload, clearSession, readSession, setSession } from "./api";
import { AuthScreen } from "./components/AuthScreen";
import { FormSection, LabForm, Num, PatientForm } from "./components/ClinicalForms";
import { DashboardPanels, MobileDashboardPanels, SelectedPatientTreatmentPanel } from "./components/DashboardPanels";
import { ResultPanel } from "./components/ResultPanel";
import { emptySolutionForm, initialLab, initialPatient, professionalRoles } from "./clinicalFormData";
import { ClinicalResultSummary } from "./components/ClinicalResultSummary";
import { ClinicalRangesPanel } from "./components/ClinicalRangesPanel";

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
  const [institutionSettings, setInstitutionSettings] = useState(session.institution?.settings || {});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("nuevo");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState("todos");
  const [patientPanelOpen, setPatientPanelOpen] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState(null);

  const isTraining = ["estudiante_medicina", "interno", "residente", "fellow"].includes(session.user?.professionalRole);
  const isAdmin = session.user?.accessRole === "admin";
  const moreTabs = [
    ["seguimiento", "Seguimiento"],
    ["soluciones", "Soluciones"],
    ["rangos", "Rangos"],
    ...(isAdmin ? [["admin", "Admin"]] : [])
  ];
  const moreTabActive = moreTabs.some(([value]) => value === tab);
  function selectTab(nextTab) {
    setTab(nextTab);
    setMoreMenuOpen(false);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    loadPatients();
    loadDashboard();
    loadInstitutionSettings();
  }, []);

  useEffect(() => {
    if (!moreMenuOpen) return undefined;
    const closeMenu = (event) => {
      if (!moreMenuRef.current?.contains(event.target)) setMoreMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [moreMenuOpen]);

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

  async function loadInstitutionSettings() {
    try {
      const data = await api("/admin/settings");
      setInstitutionSettings(data.settings || {});
    } catch {
      setInstitutionSettings(session.institution?.settings || {});
    }
  }

  async function loadPatientDetails(patientId) {
    const [details, orders] = await Promise.all([
      api(`/patients/${patientId}`),
      api(`/orders/patient/${patientId}`)
    ]);
    setPatientDetails(details);
    setOrderHistory(orders);
    return { details, orders };
  }

  async function evaluateLatestPatientLab(details) {
    const latestLab = latestPatientLab(details?.labs || []);
    if (!details?.patient || !latestLab) return null;
    return api("/clinical/evaluate", {
      method: "POST",
      body: JSON.stringify({ patient: cleanPayload(details.patient), lab: cleanPayload(latestLab) })
    });
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

  function requestConfirm({ title, message, confirmLabel = "Confirmar" }) {
    return new Promise((resolve) => {
      setConfirmRequest({ title, message, confirmLabel, resolve });
    });
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

  async function deleteLab(lab) {
    if (!selectedPatient?._id || !lab?._id) return;
    const ok = await requestConfirm({
      title: "Borrar laboratorio",
      message: "Tambien se eliminaran las ordenes generadas con ese dato. Esta accion no se puede deshacer.",
      confirmLabel: "Borrar laboratorio"
    });
    if (!ok) return;
    setError("");
    setMessage("");
    try {
      await api(`/patients/${selectedPatient._id}/labs/${lab._id}`, { method: "DELETE" });
      const data = await loadPatientDetails(selectedPatient._id);
      const latestEvaluation = await evaluateLatestPatientLab(data.details);
      setEvaluation(latestEvaluation);
      await loadPatients();
      await loadDashboard();
      setMessage(latestEvaluation ? "Control borrado. Resultado actualizado con el ultimo laboratorio disponible." : "Control borrado. Ingresa nuevamente el valor correcto para recalcular.");
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
    setError("");
    setSelectedPatient(patient);
    setPatientForm({ ...initialPatient, ...patient });
    setEvaluation(null);
    try {
      const data = await loadPatientDetails(patient._id);
      const latestEvaluation = await evaluateLatestPatientLab(data.details);
      setEvaluation(latestEvaluation);
      setTab(data.details?.labs?.length ? "resultado" : "laboratorio");
      setPatientPanelOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deletePatient(patient) {
    const ok = await requestConfirm({
      title: "Eliminar paciente activo",
      message: `Se retirara a ${patient.nameOrCode} de la lista activa y se cerraran ordenes pendientes.`,
      confirmLabel: "Eliminar paciente"
    });
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
    const activeOrders = summary.activeOrders || (summary.topOrder ? [summary.topOrder] : []);
    const activeElectrolyteCount = uniqueActiveElectrolyteCount(activeOrders);
    return {
      ...patient,
      latestLab: summary.latestLab || null,
      latestElectrolytes: summary.latestElectrolytes || {},
      topOrder: summary.topOrder || null,
      activeOrders,
      activeOrderCount: activeElectrolyteCount,
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
      patient.topOrder?.disorder,
      ...(patient.activeOrders || []).map((order) => order.disorder)
    ].some((value) => String(value || "").toLowerCase().includes(search));
    const electrolyteFilter = ["sodio", "potasio", "calcio", "magnesio", "fosforo"].includes(patientFilter);
    const matchesFilter =
      electrolyteFilter
        ? (patient.activeOrders || []).some((order) => disorderKey(order.disorder) === patientFilter)
        : patientFilter === "todos" ||
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
          <button className="btn danger" onClick={onLogout}><LogOut size={18} /> Salir</button>
        </div>
      </header>

      <main className="container grid">
        {confirmRequest && (
          <ConfirmDialog
            title={confirmRequest.title}
            message={confirmRequest.message}
            confirmLabel={confirmRequest.confirmLabel}
            onCancel={() => {
              confirmRequest.resolve(false);
              setConfirmRequest(null);
            }}
            onConfirm={() => {
              confirmRequest.resolve(true);
              setConfirmRequest(null);
            }}
          />
        )}
        {isTraining && (
          <div className="alert red">
            <strong>Usuario en formación:</strong> toda orden médica sugerida debe ser revisada y validada por el médico responsable o especialista tratante antes de su aplicación clínica.
          </div>
        )}
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <section className="dashboard-summary">
          <div className="summary-card dashboard-hero clinical-command-center">
            <div>
              <h1>Centro clínico IonoMed</h1>
              <p>Prioriza pacientes, interpreta electrolitos y gases arteriales, y consolida órdenes sugeridas con controles de seguridad.</p>
            </div>
            <div className="metrics">
              <div className="metric metric-command"><strong>{dashboard?.counts?.activePatients ?? patients.length}</strong><small>Pacientes activos</small></div>
              <div className="metric metric-danger"><strong>{dashboard?.counts?.highAlerts ?? 0}</strong><small>Alertas críticas</small></div>
              <div className="metric metric-warning"><strong>{dashboard?.counts?.overdueControls ?? 0}</strong><small>Controles vencidos</small></div>
              <div className="metric metric-command"><strong>6</strong><small>Módulos clínicos</small></div>
            </div>
          </div>
        </section>

        <DashboardPanels
          dashboard={dashboard}
          formatShortDate={formatShortDate}
          onSelectPatient={(patient) => {
            const fullPatient = patients.find((item) => String(item._id) === String(patient._id || patient.patientId));
            if (fullPatient) selectPatient(fullPatient);
          }}
        />
        <MobileDashboardPanels dashboard={dashboard} onSelectPatient={(patient) => {
          const fullPatient = patients.find((item) => String(item._id) === String(patient._id || patient.patientId));
          if (fullPatient) selectPatient(fullPatient);
        }} formatShortDate={formatShortDate} />

        <section className={`workbench ${tab === "soluciones" ? "solutions-workbench" : ""}`}>
          {tab !== "soluciones" && (
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
                  ["uci", "UCI"],
                  ["sodio", "Na"],
                  ["potasio", "K"],
                  ["calcio", "Ca"],
                  ["magnesio", "Mg"],
                  ["fosforo", "P"]
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
                    <PatientDisorderList orders={patient.activeOrders || []} lab={patient.latestElectrolytes || patient.latestLab} />
                    <span className="patient-clinical-meta">
                      <small>{patient.activeOrderCount ? `${patient.activeOrderCount} electrolito(s) alterado(s)` : "Sin alerta activa"}</small>
                      <b>{patientControlSummary(patient)}</b>
                    </span>
                    {patient.topOrder && (
                      <span className="patient-solution-line" title={patientCurrentSolutions(patient, { compact: false })}>
                        <small>{patientCurrentSolutions(patient)}</small>
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
          )}

          <section className="card workspace-card">
            {tab !== "soluciones" && (
              <SelectedPatientTreatmentPanel
                patient={selectedPatient}
                orderHistory={orderHistory}
                orderCurrentSolution={orderCurrentSolution}
                orderSolutionOptions={orderSolutionOptions}
              />
            )}
            <div className="tabs app-tabs">
              <button className={`tab ${tab === "nuevo" ? "active" : ""}`} onClick={() => selectTab("nuevo")} type="button">
                <UserRound size={16} />
                <span>Paciente</span>
              </button>
              <button className={`tab ${tab === "laboratorio" ? "active" : ""}`} onClick={() => selectTab("laboratorio")} type="button">
                <FlaskConical size={16} />
                <span>Labs</span>
              </button>
              <button className={`tab ${tab === "resultado" ? "active" : ""}`} onClick={() => selectTab("resultado")} type="button">
                <FileText size={16} />
                <span>Interpretación</span>
              </button>
              <button className={`tab ${tab === "ordenes" ? "active" : ""}`} onClick={() => selectTab("ordenes")} type="button">
                <ClipboardCopy size={16} />
                <span>Órdenes</span>
              </button>
              <div className="more-tab" ref={moreMenuRef}>
                <button
                  className={`tab ${moreTabActive ? "active" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMoreMenuOpen((value) => !value);
                  }}
                  type="button"
                  aria-expanded={moreMenuOpen}
                >
                  <MoreHorizontal size={16} />
                  <span>Más</span>
                </button>
                {moreMenuOpen && (
                  <div className="more-menu">
                    {moreTabs.map(([value, label]) => (
                      <button key={value} type="button" className={tab === value ? "active" : ""} onClick={() => selectTab(value)}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {tab === "nuevo" && <PatientForm form={patientForm} setForm={setPatientForm} onSubmit={createPatient} onEvaluate={evaluateWithoutSaving} />}
            {tab === "laboratorio" && <LabForm form={labForm} setForm={setLabForm} onSubmit={submitLab} selectedPatient={selectedPatient} />}
            {tab === "resultado" && (
              <ResultPanel
                evaluation={evaluation}
                patientDetails={patientDetails}
                orderHistory={orderHistory}
                onOrderUpdated={updateOrder}
                onDeleteLab={deleteLab}
                settings={institutionSettings}
                helpers={{
                  activeClinicalOrders,
                  buildClinicalSummary,
                  disorderKey,
                  display,
                  formatShortDate
                }}
                components={{
                  ArterialGasPanel,
                  ClinicalValidationPanel,
                  FollowUpPanel,
                  Metric,
                  MobileQuickResult,
                  OrderCard,
                  PatientHistorySection,
                  RepositionSummary
                }}
              />
            )}
            {tab === "ordenes" && (
              <OrdersWorkspace
                orders={allClinicalOrders(evaluation?.orders || [], orderHistory || [])}
                evaluation={evaluation}
                settings={institutionSettings}
                onOrderUpdated={updateOrder}
              />
            )}
            {tab === "seguimiento" && (
              <FollowUpWorkspace
                patient={selectedPatient}
                patientDetails={patientDetails}
                evaluation={evaluation}
                orders={allClinicalOrders(evaluation?.orders || [], orderHistory || [])}
                onSelectTab={selectTab}
              />
            )}
            {tab === "soluciones" && <SolutionsGuide evaluation={evaluation} settings={institutionSettings} isAdmin={isAdmin} onSettingsSaved={setInstitutionSettings} />}
            {tab === "rangos" && <ClinicalRangesPanel />}
            {tab === "admin" && isAdmin && <AdminPanel initialSettings={institutionSettings} onSettingsSaved={setInstitutionSettings} />}
          </section>
        </section>
      </main>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="form-actions">
          <button className="btn ghost" type="button" onClick={onCancel}>Cancelar</button>
          <button className="btn danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

function FollowUpWorkspace({ patient, patientDetails, evaluation, orders = [], onSelectTab }) {
  const labs = patientDetails?.labs || [];
  const activeOrders = orders.filter((order) => !["done", "not_done"].includes(order.status));
  const nextControls = activeOrders.flatMap((order) => order.controls || []).slice(0, 8);
  const lastLab = labs[0];
  const summary = evaluation ? buildClinicalSummary(evaluation, 220) : "Selecciona un paciente y registra laboratorio para iniciar seguimiento.";

  return (
    <section className="follow-workspace">
      <div className="section-heading-row">
        <div>
          <h2>Seguimiento clínico</h2>
          <p>{patient ? `${patient.name || "Paciente seleccionado"} · ${patient.location || "sin ubicación"}` : "Sin paciente seleccionado"}</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => onSelectTab("laboratorio")}>
          <FlaskConical size={18} /> Nuevo control
        </button>
      </div>
      <div className="follow-grid">
        <article className="follow-card-compact">
          <small>Resumen actual</small>
          <strong>{evaluation?.diagnosis?.[0]?.title || "Sin interpretación activa"}</strong>
          <p>{summary}</p>
        </article>
        <article className="follow-card-compact">
          <small>Órdenes activas</small>
          <strong>{activeOrders.length}</strong>
          <p>{activeOrders.length ? activeOrders.map((order) => order.disorder).filter(Boolean).slice(0, 3).join(", ") : "No hay órdenes pendientes."}</p>
          <button className="btn ghost" type="button" onClick={() => onSelectTab("ordenes")}>Ver órdenes</button>
        </article>
        <article className="follow-card-compact">
          <small>Último laboratorio</small>
          <strong>{lastLab ? formatDate(lastLab.createdAt) : "Sin datos"}</strong>
          <p>{lastLab ? `Na ${display(lastLab.sodium)} · K ${display(lastLab.potassium)} · Cr ${display(lastLab.creatinine)}` : "Agrega un laboratorio para activar tendencias."}</p>
        </article>
      </div>
      {nextControls.length > 0 && (
        <div className="control-stack">
          <strong>Próximos controles sugeridos</strong>
          {nextControls.map((control, index) => <span key={`${control}-${index}`}>{control}</span>)}
        </div>
      )}
      {labs.length > 1 && <LabTrendSparklines labs={labs} />}
      <Timeline labs={labs} orders={orders} />
    </section>
  );
}

function OrdersWorkspace({ orders = [], evaluation, settings, onOrderUpdated }) {
  const [statusFilter, setStatusFilter] = useState("activas");
  const [query, setQuery] = useState("");
  const filtered = orders.filter((order) => {
    const status = order.status || "suggested";
    const statusOk = statusFilter === "todas"
      || (statusFilter === "activas" && !["done", "not_done"].includes(status))
      || status === statusFilter;
    const text = [
      order.disorder,
      order.severity,
      order.priority,
      order.status,
      order.suggestedText,
      order.editedText,
      order.controls?.join(" ")
    ].join(" ").toLowerCase();
    return statusOk && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });
  const counts = {
    activas: orders.filter((order) => !["done", "not_done"].includes(order.status)).length,
    copied: orders.filter((order) => order.status === "copied").length,
    edited: orders.filter((order) => order.status === "edited").length,
    done: orders.filter((order) => order.status === "done").length,
    not_done: orders.filter((order) => order.status === "not_done").length
  };

  return (
    <section className="orders-workspace">
      <div className="section-heading-row">
        <div>
          <h2>Órdenes clínicas</h2>
          <p>Seguimiento operativo de órdenes sugeridas, copiadas, editadas y realizadas.</p>
        </div>
        <span className="badge">{filtered.length} visible(s)</span>
      </div>
      <div className="orders-toolbar">
        <label className="patient-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por trastorno, estado, control o texto de orden" />
        </label>
        <div className="range-filter">
          {[
            ["activas", `Activas ${counts.activas}`],
            ["copied", `Copiadas ${counts.copied}`],
            ["edited", `Editadas ${counts.edited}`],
            ["done", `Realizadas ${counts.done}`],
            ["not_done", `No realizadas ${counts.not_done}`],
            ["todas", `Todas ${orders.length}`]
          ].map(([value, label]) => (
            <button key={value} type="button" className={statusFilter === value ? "active" : ""} onClick={() => setStatusFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 && (
        <div className="alert">No hay órdenes para este filtro. Genera una interpretación o selecciona otro paciente.</div>
      )}
      <div className="orders-list">
        {filtered.map((order, index) => (
          <OrderCard
            order={order}
            calculations={evaluation?.calculations || {}}
            key={order._id || `${order.disorder}-${index}`}
            index={index}
            total={filtered.length}
            onOrderUpdated={onOrderUpdated}
            settings={settings}
          />
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
        name: "KCl periferico 0.02 mEq/mL",
        match: ["hipokalemia"],
        route: "Periferico",
        preparation: "KCl en DAD 5% x 500 mL",
        content: "0.02 mEq/mL",
        use: "Reposicion periferica lenta; calcular velocidad final en mEq/h y vigilar tolerancia venosa."
      },
      {
        name: "KCl periferico 0.04 mEq/mL",
        match: ["hipokalemia"],
        route: "Periferico",
        preparation: "KCl en solucion salina 0.9% x 250 o 500 mL",
        content: "0.04 mEq/mL",
        use: "Opcion periferica si se quiere evitar carga de dextrosa; no superar limite periferico institucional."
      },
      {
        name: "Cloruro de potasio periferico",
        match: ["hipokalemia"],
        route: "Periferico",
        preparation: "25 mL de Katrol + 475 cc de solucion salina 0.9%",
        content: "Aproximado 0.1 mEq/mL si Katrol aporta 2 mEq/mL",
        use: "Usar por via periferica con bomba. No superar 8 mEq/h por via periferica."
      },
      {
        name: "KCl central 0.2 mEq/mL en agua destilada",
        match: ["hipokalemia"],
        route: "Central",
        preparation: "KCl 0.2 mEq/mL x 100 mL en agua destilada",
        content: "0.2 mEq/mL",
        use: "Via central; requiere bomba y monitorizacion segun severidad/protocolo."
      },
      {
        name: "KCl central 0.2 mEq/mL en SSN",
        match: ["hipokalemia"],
        route: "Central",
        preparation: "KCl 0.2 mEq/mL x 100 mL en solucion salina 0.9%",
        content: "0.2 mEq/mL",
        use: "Via central; alternativa en SSN 0.9%, no pasar por periferica."
      },
      {
        name: "Cloruro de potasio central",
        match: ["hipokalemia"],
        route: "Central",
        preparation: "40 mL de Katrol + 460 mL de solucion salina 0.9%",
        content: "Aproximado 0.16 mEq/mL si Katrol aporta 2 mEq/mL",
        use: "Solo via central. No pasar por periferica. No superar 20 mEq/h por via central."
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
        preparation: "Magnesio 4000 mg en 100 cc de solucion salina 0.9%",
        content: "4000 mg/24 h a 5 cc/h",
        use: "Administrar por bomba a 5 cc/h por 24 horas; ajustar o suspender segun funcion renal, reflejos, respiracion y control de magnesio."
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
        name: "Solucion salina 3%",
        match: ["hiponatremia"],
        route: "Segun acceso",
        preparation: "SSN 3%: 400 cc de SSN 0.9% + 10 ampollas de Natrol.",
        content: "Na 513 mEq/L",
        use: "Correccion activa de hiponatremia segun calculo, limite de correccion y monitorizacion."
      },
      {
        name: "Solucion salina 7.5%",
        match: ["hiponatremia"],
        route: "Central / protocolo",
        preparation: "Solucion hipertonica 7.5% segun disponibilidad y protocolo institucional.",
        content: "Na 1283 mEq/L",
        use: "Correccion activa cuando el protocolo institucional la permite; requiere vigilancia estrecha."
      },
      {
        name: "Solucion salina 0.9%",
        match: ["hiponatremia", "hipercalcemia"],
        route: "IV",
        preparation: "Solucion salina 0.9% lista para infusion.",
        content: "Na 154 mEq/L",
        use: "Hiponatremia hipovolemica o hidratacion en hipercalcemia si el estado clinico lo permite."
      },
      {
        name: "Solucion salina 0.45%",
        match: ["hipernatremia"],
        route: "IV",
        preparation: "SSN 0.45%: 2 ampollas de Natrol + 480 cc de agua destilada.",
        content: "Na 77 mEq/L",
        use: "Reposicion de agua libre con electrolito; ajustar tasa para evitar descenso rapido de sodio."
      },
      {
        name: "Dextrosa al 5%",
        match: ["hipernatremia"],
        route: "IV",
        preparation: "DAD 5% lista para infusion.",
        content: "Agua libre IV; Na 0 mEq/L",
        use: "Reposicion de agua libre cuando no hay via enteral/oral segura; vigilar glucemia."
      },
      {
        name: "Agua libre oral/enteral",
        match: ["hipernatremia"],
        route: "Oral / enteral",
        preparation: "Agua libre por via oral o sonda enteral si es seguro.",
        content: "Agua libre; Na 0 mEq/L",
        use: "Preferir si el paciente esta alerta y tolera via enteral/oral."
      },
      {
        name: "Ringer lactato",
        match: ["hipernatremia"],
        route: "IV",
        preparation: "Ringer lactato listo para infusion.",
        content: "Na 130 mEq/L",
        use: "Cristaloide balanceado; confirmar indicacion, volemia y compatibilidad con la estrategia de sodio."
      }
    ]
  },
  {
    title: "Calcio e hipercalcemia",
    rows: [
      {
        name: "Gluconato de calcio 10%",
        match: ["hipocalcemia"],
        route: "IV lento",
        preparation: "Gluconato de calcio al 10% IV lento.",
        content: "Presentacion al 10%",
        use: "Usar si hay sintomas importantes, QT prolongado o hipocalcemia severa; monitorizar ECG segun riesgo."
      },
      {
        name: "Solucion salina 0.9% para hipercalcemia",
        match: ["hipercalcemia"],
        route: "IV",
        preparation: "Solucion salina 0.9% lista para infusion.",
        content: "Cristaloide isotónico",
        use: "Hidratacion en hipercalcemia si no hay sobrecarga, anuria o falla renal avanzada."
      }
    ]
  }
];

function customSolutionRows(settings = {}) {
  return (settings.customSolutions || [])
    .filter((solution) => solution?.active !== false && solution?.name)
    .map((solution) => ({
      name: solution.name,
      match: [solution.disorder || solution.electrolyte || ""].filter(Boolean),
      route: solution.route || "Segun acceso",
      preparation: solution.preparation || "Preparacion institucional",
      content: solution.content || concentrationText(solution),
      use: solution.use || `Solucion institucional para ${solution.disorder || solution.electrolyte || "trastorno electrolitico"}.`
    }));
}

function catalogGroups(settings = {}) {
  const customRows = customSolutionRows(settings);
  if (!customRows.length) return solutionGroups;
  return [...solutionGroups, { title: "Soluciones institucionales", rows: customRows }];
}

const solutionDisordersByElectrolyte = {
  sodio: ["hiponatremia", "hipernatremia"],
  potasio: ["hipokalemia", "hiperkalemia"],
  magnesio: ["hipomagnesemia"],
  fosforo: ["hipofosfatemia", "hiperfosfatemia"],
  calcio: ["hipocalcemia", "hipercalcemia"]
};

const disorderLabels = {
  hiponatremia: "Hiponatremia",
  hipernatremia: "Hipernatremia",
  hipokalemia: "Hipokalemia",
  hiperkalemia: "Hiperkalemia",
  hipomagnesemia: "Hipomagnesemia",
  hipofosfatemia: "Hipofosfatemia",
  hiperfosfatemia: "Hiperfosfatemia",
  hipocalcemia: "Hipocalcemia",
  hipercalcemia: "Hipercalcemia"
};

const baseFluidOptions = [
  ["agua_destilada", "Agua destilada"],
  ["ssn09", "Solucion salina 0.9%"],
  ["hartmann", "Solucion Hartmann"],
  ["dad5", "DAD al 5%"],
  ["dad10", "DAD al 10%"]
];

const ampouleDefaultsByElectrolyte = {
  sodio: 17,
  potasio: 20,
  magnesio: 8,
  fosforo: 15,
  calcio: 4.65
};

function baseFluidLabel(value) {
  return baseFluidOptions.find(([key]) => key === value)?.[1] || value || "Liquido base";
}

function roundDose(value, decimals = 3) {
  if (!Number.isFinite(value)) return "";
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calculatedSolution(solution) {
  const ampoules = Number(solution.ampoules) || 0;
  const ampouleMeq = Number(solution.ampouleMeq) || 0;
  const finalVolumeMl = Number(solution.finalVolumeMl) || 0;
  const totalMeq = ampoules * ampouleMeq;
  const concentration = finalVolumeMl > 0 ? roundDose(totalMeq / finalVolumeMl, 4) : "";
  const mEqPerLiter = finalVolumeMl > 0 ? roundDose((totalMeq / finalVolumeMl) * 1000, 1) : "";
  const electrolyteLabel = solution.electrolyte || "electrolito";
  const base = baseFluidLabel(solution.baseFluid);
  const preparation = `${ampoules} ampolla(s) de ${electrolyteLabel} (${ampouleMeq} mEq/ampolla) en ${base} hasta volumen final ${finalVolumeMl || "no definido"} mL.`;
  const content = `${totalMeq || 0} mEq totales; ${concentration || "no calculable"} mEq/mL; ${mEqPerLiter || "no calculable"} mEq/L.`;
  return {
    ...solution,
    preparation: solution.preparation?.trim() || preparation,
    content: solution.content?.trim() || content,
    concentration,
    mEqPerLiter,
    sodium: solution.electrolyte === "sodio" ? mEqPerLiter : solution.sodium,
    potassium: solution.electrolyte === "potasio" ? concentration : solution.potassium
  };
}

function InstitutionalSolutionsPanel({ initialSettings = {}, onSettingsSaved }) {
  const [settings, setSettings] = useState(initialSettings || {});
  const [solutionForm, setSolutionForm] = useState(emptySolutionForm);
  const [solutionSearch, setSolutionSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const filteredDisorders = solutionDisordersByElectrolyte[solutionForm.electrolyte] || [];
  const calculated = calculatedSolution(solutionForm);

  useEffect(() => {
    setSettings(initialSettings || {});
  }, [initialSettings]);

  function updateSolution(field, value) {
    setSolutionForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "electrolyte") {
        const disorders = solutionDisordersByElectrolyte[value] || [];
        next.disorder = disorders.includes(prev.disorder) ? prev.disorder : (disorders[0] || prev.disorder);
        next.ampouleMeq = ampouleDefaultsByElectrolyte[value] ?? prev.ampouleMeq;
      }
      return next;
    });
  }

  function solutionPayload(solution) {
    const numericFields = ["concentration", "mEqPerLiter", "sodium", "potassium", "totalDoseMg", "hours", "rateMlH", "ampoules", "ampouleMeq", "finalVolumeMl"];
    const payload = { ...solution, id: solution.id || `sol-${Date.now()}`, active: solution.active !== false };
    for (const field of numericFields) {
      payload[field] = solution[field] === "" || solution[field] === undefined ? "" : Number(solution[field]);
    }
    return payload;
  }

  function addSolution() {
    if (!solutionForm.name.trim()) return setError("La solucion necesita un nombre.");
    if (!Number(calculated.finalVolumeMl) || !Number(calculated.ampoules) || !Number(calculated.ampouleMeq)) {
      return setError("Define ampollas, mEq por ampolla y volumen final para calcular la concentracion.");
    }
    setSettings((prev) => ({
      ...(prev || {}),
      customSolutions: [...(prev?.customSolutions || []), solutionPayload(calculated)]
    }));
    setSolutionForm({ ...emptySolutionForm, electrolyte: solutionForm.electrolyte, disorder: filteredDisorders[0] || solutionForm.disorder });
    setMessage("Solucion agregada. Recuerda guardar la configuracion.");
  }

  function removeSolution(id) {
    setSettings((prev) => ({
      ...(prev || {}),
      customSolutions: (prev?.customSolutions || []).filter((solution) => solution.id !== id)
    }));
  }

  function duplicateSolution(solution) {
    setSolutionForm({
      ...emptySolutionForm,
      ...solution,
      id: undefined,
      name: `${solution.name || "Solucion"} copia`,
      active: true
    });
    setMessage("Solucion cargada para duplicar. Ajusta los datos y agrega la nueva version.");
  }

  async function saveSettings(event) {
    event?.preventDefault?.();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await api("/admin/settings", { method: "PUT", body: JSON.stringify({ settings }) });
      setSettings(data.settings || {});
      onSettingsSaved?.(data.settings || {});
      setMessage("Catalogo institucional guardado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card grid">
      <h2>Soluciones institucionales</h2>
      <p>Calcula la concentracion antes de agregarla al catalogo institucional.</p>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      <div className="grid three">
        <label>Electrolito
          <select value={solutionForm.electrolyte} onChange={(e) => updateSolution("electrolyte", e.target.value)}>
            <option value="sodio">Sodio</option>
            <option value="potasio">Potasio</option>
            <option value="magnesio">Magnesio</option>
            <option value="fosforo">Fosforo</option>
            <option value="calcio">Calcio</option>
          </select>
        </label>
        <label>Trastorno
          <select value={solutionForm.disorder} onChange={(e) => updateSolution("disorder", e.target.value)}>
            {filteredDisorders.map((disorder) => <option value={disorder} key={disorder}>{disorderLabels[disorder] || disorder}</option>)}
          </select>
        </label>
        <label>Via
          <select value={solutionForm.route} onChange={(e) => updateSolution("route", e.target.value)}>
            <option value="periferico">Periferica</option>
            <option value="linea_media">Linea media</option>
            <option value="picc">PICC</option>
            <option value="central">Central</option>
            <option value="oral">Oral/enteral</option>
          </select>
        </label>
      </div>

      <div className="grid three">
        <label>Nombre<input value={solutionForm.name} onChange={(e) => updateSolution("name", e.target.value)} placeholder="KCl central institucional" /></label>
        <label>Liquido base
          <select value={solutionForm.baseFluid} onChange={(e) => updateSolution("baseFluid", e.target.value)}>
            {baseFluidOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>Numero de ampollas
          <select value={solutionForm.ampoules} onChange={(e) => updateSolution("ampoules", e.target.value)}>
            {Array.from({ length: 30 }, (_, idx) => idx + 1).map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>
        <Num label="mEq por ampolla" value={solutionForm.ampouleMeq} onChange={(v) => updateSolution("ampouleMeq", v)} />
        <Num label="Volumen final mL" value={solutionForm.finalVolumeMl} onChange={(v) => updateSolution("finalVolumeMl", v)} />
        <Num label="Velocidad mL/h" value={solutionForm.rateMlH} onChange={(v) => updateSolution("rateMlH", v)} />
      </div>
      <div className="metrics">
        <Metric label="mEq/mL" value={calculated.concentration || "No calculable"} />
        <Metric label="mEq/L" value={calculated.mEqPerLiter || "No calculable"} />
        <Metric label="mEq totales" value={(Number(solutionForm.ampoules) || 0) * (Number(solutionForm.ampouleMeq) || 0)} />
      </div>
      <div className="alert">
        <strong>Preparacion calculada:</strong> {calculated.preparation}<br />
        <strong>Contenido:</strong> {calculated.content}
      </div>
      <div className="grid three">
        <Num label="Na mEq/L si aplica" value={calculated.sodium} onChange={(v) => updateSolution("sodium", v)} />
        <Num label="Concentracion mEq/mL" value={calculated.concentration} onChange={(v) => updateSolution("concentration", v)} />
        <Num label="Aporte K mEq/mL" value={calculated.potassium} onChange={(v) => updateSolution("potassium", v)} />
        <Num label="Dosis total mg" value={solutionForm.totalDoseMg} onChange={(v) => updateSolution("totalDoseMg", v)} />
      </div>
      <label>Preparacion<textarea value={solutionForm.preparation} onChange={(e) => updateSolution("preparation", e.target.value)} placeholder="Ej: 40 mL de Katrol + 460 mL de SSN 0.9%" /></label>
      <label>Uso / advertencia<textarea value={solutionForm.use} onChange={(e) => updateSolution("use", e.target.value)} placeholder="Ej: Solo via central, no pasar por periferica" /></label>
      <div className="form-actions">
        <button className="btn secondary" type="button" onClick={addSolution}><Plus size={18} /> Agregar solucion</button>
        <button className="btn primary" disabled={loading} type="button" onClick={saveSettings}><Save size={18} /> Guardar catalogo</button>
      </div>
      <label>Buscar solucion institucional
        <input value={solutionSearch} onChange={(event) => setSolutionSearch(event.target.value)} placeholder="Nombre, trastorno, via o preparacion" />
      </label>
      <div className="solution-admin-list">
        {(settings.customSolutions || []).length === 0 && <p>No hay soluciones institucionales creadas.</p>}
        {(settings.customSolutions || [])
          .filter((solution) => {
            const query = solutionSearch.trim().toLowerCase();
            if (!query) return true;
            return [solution.name, solution.disorder, solution.route, solution.baseFluid, solution.preparation, solution.use]
              .some((value) => String(value || "").toLowerCase().includes(query));
          })
          .map((solution) => (
          <article className="solution-admin-row" key={solution.id}>
            <span>
              <strong>{solution.name}</strong>
              <small>{solution.disorder} · {routeLabel(solution.route)} · {solution.preparation}</small>
            </span>
            <span className="solution-admin-actions">
              <button className="btn ghost" type="button" onClick={() => duplicateSolution(solution)}>Duplicar</button>
              <button className="icon-button danger" type="button" onClick={() => removeSolution(solution.id)}><Trash2 size={16} /></button>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function SolutionsGuide({ evaluation, settings, isAdmin = false, onSettingsSaved }) {
  const disorders = (evaluation?.classifications || []).map((item) => (item.disorder || "").toLowerCase());
  const matchingGroups = catalogGroups(settings)
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.match?.some((key) => disorders.some((disorder) => disorder.includes(key))))
    }))
    .filter((group) => group.rows.length > 0);

  if (!evaluation) {
    const groups = catalogGroups(settings);
    return (
      <section className="solutions-guide">
        <div>
          <h2>Catalogo de soluciones</h2>
          <p>Soluciones base e institucionales disponibles. Al generar una evaluacion se filtraran segun los trastornos detectados.</p>
        </div>
        {groups.map((group) => (
          <details className="solution-group" key={group.title}>
            <summary>
              <strong>{group.title}</strong>
              <span className="badge">{group.rows.length} opcion(es)</span>
            </summary>
            <div className="solution-table">
              {group.rows.map((row, idx) => (
                <article className="solution-row" key={`${group.title}-${idx}`}>
                  <div>
                    <strong>{row.name}</strong>
                    <span className="badge">{routeLabel(row.route)}</span>
                  </div>
                  <small><b>Preparacion:</b> {row.preparation}</small>
                  <small><b>Contenido:</b> {row.content}</small>
                  <small><b>Uso:</b> {row.use}</small>
                </article>
              ))}
            </div>
          </details>
        ))}
        {isAdmin && <InstitutionalSolutionsPanel initialSettings={settings} onSettingsSaved={onSettingsSaved} />}
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
        <details className="solution-group" key={group.title} open={matchingGroups.length === 1}>
          <summary>
            <strong>{group.title}</strong>
            <span className="badge">{group.rows.length} opcion(es)</span>
          </summary>
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
        </details>
      ))}
      {isAdmin && <InstitutionalSolutionsPanel initialSettings={settings} onSettingsSaved={onSettingsSaved} />}
    </section>
  );
}

function AdminPanel({ initialSettings = {}, onSettingsSaved }) {
  const [settings, setSettings] = useState(initialSettings || null);
  const [solutionForm, setSolutionForm] = useState(emptySolutionForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadSettings();
    loadUsers();
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

  function updateSolution(field, value) {
    setSolutionForm((prev) => ({ ...prev, [field]: value }));
  }

  function solutionPayload(solution) {
    const numericFields = ["concentration", "sodium", "potassium", "totalDoseMg", "hours", "rateMlH"];
    const payload = { ...solution, id: solution.id || `sol-${Date.now()}`, active: solution.active !== false };
    for (const field of numericFields) {
      payload[field] = solution[field] === "" || solution[field] === undefined ? "" : Number(solution[field]);
    }
    return payload;
  }

  function addSolution() {
    if (!solutionForm.name.trim()) return setError("La solucion necesita un nombre.");
    setSettings((prev) => ({
      ...(prev || {}),
      customSolutions: [...(prev?.customSolutions || []), solutionPayload(solutionForm)]
    }));
    setSolutionForm(emptySolutionForm);
    setMessage("Solucion agregada. Recuerda guardar la configuracion.");
  }

  function removeSolution(id) {
    setSettings((prev) => ({
      ...(prev || {}),
      customSolutions: (prev?.customSolutions || []).filter((solution) => solution.id !== id)
    }));
  }

  async function saveSettings(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await api("/admin/settings", { method: "PUT", body: JSON.stringify({ settings }) });
      setSettings(data.settings || {});
      onSettingsSaved?.(data.settings || {});
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
      const data = await api("/admin/backup/preview", { method: "POST", body: JSON.stringify({ backup }) });
      setPendingBackup(backup);
      setBackupPreview(data.preview);
      setMessage("Backup cargado para revision. Confirma la restauracion solo si el resumen corresponde.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function loadUsers() {
    try {
      const data = await api("/admin/users");
      setUsers(data);
    } catch {
      setUsers([]);
    }
  }

  async function updateUser(user, patch) {
    setError("");
    setMessage("");
    try {
      const updated = await api(`/admin/users/${user._id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      setUsers((prev) => prev.map((item) => item._id === updated._id ? updated : item));
      setMessage("Usuario actualizado.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmRestoreBackup() {
    if (!pendingBackup) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await api("/admin/backup/restore", {
        method: "POST",
        body: JSON.stringify({ backup: pendingBackup, confirmRestore: true })
      });
      setPendingBackup(null);
      setBackupPreview(null);
      setMessage("Backup restaurado. Vuelve a iniciar sesion si los usuarios restaurados cambiaron.");
      await loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!settings) return <div className="alert">Cargando configuracion institucional...</div>;

  return (
    <div className="admin-panel grid">
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <section className="admin-overview">
        {[
          ["Institución", "Límites de corrección y parámetros clínicos."],
          ["Protocolos", "Soluciones, velocidades y controles institucionales."],
          ["Usuarios", "Roles clínicos y permisos administrativos."],
          ["Backups", "Exportación y restauración segura de la base local."]
        ].map(([title, detail]) => (
          <article key={title}>
            <strong>{title}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

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
        {backupPreview && (
          <div className="alert">
            <strong>Backup pendiente de restaurar</strong>
            <p>
              {backupPreview.app} {backupPreview.version ? `v${backupPreview.version}` : ""} - {formatDate(backupPreview.createdAt)}
            </p>
            <p>
              Instituciones: {backupPreview.counts.institutions} | Usuarios: {backupPreview.counts.users} | Pacientes: {backupPreview.counts.patients} | Labs: {backupPreview.counts.labs} | Ordenes: {backupPreview.counts.orders}
            </p>
            {backupPreview.institutions?.length > 0 && <p>Incluye: {backupPreview.institutions.join(", ")}</p>}
            <div className="form-actions">
              <button className="btn danger" type="button" onClick={confirmRestoreBackup} disabled={loading}>Confirmar restauracion</button>
              <button className="btn ghost" type="button" onClick={() => { setPendingBackup(null); setBackupPreview(null); }} disabled={loading}>Cancelar</button>
            </div>
          </div>
        )}
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

      <section className="card grid">
        <h2>Usuarios y roles</h2>
        <p>Administra acceso institucional sin modificar credenciales.</p>
        <div className="admin-user-list">
          {users.length === 0 && <p>No hay usuarios para mostrar o tu sesión no tiene permisos de administrador.</p>}
          {users.map((user) => (
            <article className="admin-user-row" key={user._id}>
              <span>
                <strong>{user.fullName}</strong>
                <small>{user.email} · {roleLabel(user.professionalRole)} · {user.serviceArea || "Sin servicio"}</small>
              </span>
              <select value={user.accessRole} onChange={(event) => updateUser(user, { accessRole: event.target.value })}>
                <option value="clinico">Clínico</option>
                <option value="admin">Admin</option>
              </select>
              <button
                className={`btn ${user.isActive ? "danger" : "secondary"}`}
                type="button"
                onClick={() => updateUser(user, { isActive: !user.isActive })}
              >
                {user.isActive ? "Desactivar" : "Activar"}
              </button>
            </article>
          ))}
        </div>
      </section>

      {false && (
      <section className="card grid">
        <h2>Soluciones institucionales</h2>
        <p>Agrega preparaciones propias del servicio. Se suman al catalogo base y aparecen en Soluciones y en el selector de ordenes.</p>
        <div className="grid three">
          <label>Nombre<input value={solutionForm.name} onChange={(e) => updateSolution("name", e.target.value)} placeholder="KCl central institucional" /></label>
          <label>Trastorno
            <select value={solutionForm.disorder} onChange={(e) => updateSolution("disorder", e.target.value)}>
              <option value="hiponatremia">Hiponatremia</option>
              <option value="hipernatremia">Hipernatremia</option>
              <option value="hipokalemia">Hipokalemia</option>
              <option value="hiperkalemia">Hiperkalemia</option>
              <option value="hipomagnesemia">Hipomagnesemia</option>
              <option value="hipofosfatemia">Hipofosfatemia</option>
              <option value="hipocalcemia">Hipocalcemia</option>
              <option value="hipercalcemia">Hipercalcemia</option>
            </select>
          </label>
          <label>Electrolito
            <select value={solutionForm.electrolyte} onChange={(e) => updateSolution("electrolyte", e.target.value)}>
              <option value="sodio">Sodio</option>
              <option value="potasio">Potasio</option>
              <option value="magnesio">Magnesio</option>
              <option value="fosforo">Fosforo</option>
              <option value="calcio">Calcio</option>
            </select>
          </label>
          <label>Via
            <select value={solutionForm.route} onChange={(e) => updateSolution("route", e.target.value)}>
              <option value="periferico">Periferica</option>
              <option value="linea_media">Linea media</option>
              <option value="picc">PICC</option>
              <option value="central">Central</option>
              <option value="oral">Oral/enteral</option>
            </select>
          </label>
          <Num label="Na mEq/L si aplica" value={solutionForm.sodium} onChange={(v) => updateSolution("sodium", v)} />
          <Num label="Concentracion por mL" value={solutionForm.concentration} onChange={(v) => updateSolution("concentration", v)} />
          <Num label="Aporte K por mL" value={solutionForm.potassium} onChange={(v) => updateSolution("potassium", v)} />
          <Num label="Dosis total mg" value={solutionForm.totalDoseMg} onChange={(v) => updateSolution("totalDoseMg", v)} />
          <Num label="Velocidad mL/h" value={solutionForm.rateMlH} onChange={(v) => updateSolution("rateMlH", v)} />
        </div>
        <label>Preparacion<textarea value={solutionForm.preparation} onChange={(e) => updateSolution("preparation", e.target.value)} placeholder="Ej: 40 mL de Katrol + 460 mL de SSN 0.9%" /></label>
        <label>Uso / advertencia<textarea value={solutionForm.use} onChange={(e) => updateSolution("use", e.target.value)} placeholder="Ej: Solo via central, no pasar por periferica" /></label>
        <div className="form-actions">
          <button className="btn secondary" type="button" onClick={addSolution}><Plus size={18} /> Agregar solucion</button>
          <button className="btn primary" disabled={loading} type="button" onClick={saveSettings}><Save size={18} /> Guardar catalogo</button>
        </div>
        <div className="solution-admin-list">
          {(settings.customSolutions || []).length === 0 && <p>No hay soluciones institucionales creadas.</p>}
          {(settings.customSolutions || []).map((solution) => (
            <article className="solution-admin-row" key={solution.id}>
              <span>
                <strong>{solution.name}</strong>
                <small>{solution.disorder} · {routeLabel(solution.route)} · {solution.preparation}</small>
              </span>
              <button className="icon-button danger" type="button" onClick={() => removeSolution(solution.id)}><Trash2 size={16} /></button>
            </article>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}

function activeClinicalOrders(evaluationOrders = [], orderHistory = []) {
  const activeHistory = (orderHistory || []).filter((order) => order && !["done", "not_done"].includes(order.status));
  const merged = [...(evaluationOrders || []), ...activeHistory];
  const seen = new Set();
  return merged.filter((order) => {
    if (!order) return false;
    const key = disorderKey(order.disorder || order.electrolyte || order._id || "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function allClinicalOrders(evaluationOrders = [], orderHistory = []) {
  const merged = [...(orderHistory || []), ...(evaluationOrders || [])];
  const seen = new Set();
  return merged.filter((order) => {
    if (!order) return false;
    const key = order._id || `${disorderKey(order.disorder || order.electrolyte || "")}-${order.createdAt || ""}-${order.status || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function PatientHistorySection({ labs, orders, onDeleteLab, open = false }) {
  return (
    <FormSection title="Historial del paciente" summary="Laboratorios previos y auditoría" open={open}>
      <LabTrendTable labs={labs} onDeleteLab={onDeleteLab} />
      <Timeline labs={labs} orders={orders} />
    </FormSection>
  );
}

function ArterialGasPanel({ gas }) {
  if (!gas) return null;
  const expected = gas.expectedCompensation || {};
  const expectedText = expected.type
    ? expected.expectedPco2Min !== undefined
      ? `${expected.type}: pCO2 ${expected.expectedPco2Min}-${expected.expectedPco2Max} mmHg`
      : `${expected.type}: HCO3 agudo ${expected.acuteHco3}, cronico ${expected.chronicHco3} mmol/L`
    : "No calculable";

  return (
    <FormSection title="Interpretación gasométrica" summary={gas.primaryDisorder || "Sin gasometría completa"} open>
      <div className="gas-hero gas-report-header">
        <span>
          <small>Diagnóstico gasométrico principal</small>
          <strong>{gas.primaryDisorder}</strong>
        </span>
        <b className={`badge ${gas.acidBaseState === "acidemia" || gas.acidBaseState === "alcalemia" ? "alta" : "leve"}`}>{gas.acidBaseState}</b>
      </div>
      <div className="gas-grid">
        <section className="gas-section gas-section-primary">
          <strong>Ácido-base</strong>
          <div className="metrics">
            <Metric label="pH" value={display(gas.ph)} />
            <Metric label="pCO2" value={display(gas.pco2, "mmHg")} />
            <Metric label="HCO3" value={display(gas.hco3, "mmol/L")} />
            <Metric label="BE" value={display(gas.baseExcess, "mmol/L")} />
            <Metric label="Lactato" value={display(gas.lactate, "mmol/L")} />
            <Metric label="Compensación" value={gas.compensationStatus || "no calculable"} />
          </div>
        </section>
        <section className="gas-section gas-section-primary">
          <strong>Brechas y mezcla</strong>
          <div className="metrics">
            <Metric label="Anion gap" value={display(gas.anionGap, "mEq/L")} />
            <Metric label="AG corregido" value={display(gas.correctedAnionGap, "mEq/L")} />
            <Metric label="Estado AG" value={gas.anionGapStatus || "no calculable"} />
            <Metric label="Delta ratio" value={display(gas.deltaRatio)} />
            <Metric label="Lectura delta" value={gas.deltaRatioStatus || "no calculable"} />
          </div>
          {gas.associatedProcesses?.length > 0 && (
            <p><strong>Asociado:</strong> {gas.associatedProcesses.join(" + ")}</p>
          )}
        </section>
        <section className="gas-section gas-section-primary">
          <strong>Oxigenación</strong>
          <div className="metrics">
            <Metric label="pO2" value={display(gas.po2, "mmHg")} />
            <Metric label="FiO2" value={gas.fio2 ? `${Math.round(gas.fio2 * 100)}%` : "—"} />
            <Metric label="SatO2" value={display(gas.oxygenSaturation, "%")} />
            <Metric label="P/F" value={display(gas.pfRatio)} />
            <Metric label="A-a" value={display(gas.aaGradient, "mmHg")} />
            <Metric label="A-a esperado" value={display(gas.expectedAaGradient, "mmHg")} />
            <Metric label="Grado" value={gas.oxygenation?.pfRatio || "no disponible"} />
            <Metric label="Mecanismo" value={gas.oxygenMechanism || "no clasificable"} />
          </div>
        </section>
        <section className="gas-section gas-section-secondary">
          <strong>Contexto respiratorio</strong>
          <div className="metrics">
            <Metric label="Muestra" value={gas.sampleType || "arterial"} />
            <Metric label="Soporte O2" value={gas.oxygenDevice || "no especificado"} />
            <Metric label="Modo" value={gas.ventilatoryMode || "no especificado"} />
            <Metric label="PEEP" value={display(gas.peep, "cmH2O")} />
            <Metric label="FR" value={display(gas.respiratoryRate, "rpm")} />
            <Metric label="Altitud" value={display(gas.altitudeMeters, "msnm")} />
          </div>
        </section>
        <section className="gas-section highlight gas-section-secondary">
          <strong>Compensación esperada</strong>
          <p>{expectedText}</p>
          <p>{gas.compensationAssessment}</p>
        </section>
        <section className="gas-section highlight gas-rationale">
          <strong>Razonamiento</strong>
          <p>{gas.diagnosticExplanation}</p>
          {gas.etiologyHints?.length > 0 && (
            <div className="safety-pill-list">
              {gas.etiologyHints.map((hint, idx) => <span className="safety-pill" key={idx}>{hint}</span>)}
            </div>
          )}
        </section>
        {gas.missingData?.length > 0 && (
          <section className="gas-section">
            <strong>Datos que aumentan precisión</strong>
            <p>{gas.missingData.join(", ")}</p>
          </section>
        )}
        {gas.urgentFlags?.length > 0 && (
          <section className="gas-section warning">
            <strong>Criterios de severidad</strong>
            <div className="safety-pill-list">
              {gas.urgentFlags.map((flag, idx) => <span className="safety-pill warn" key={idx}>{flag}</span>)}
            </div>
          </section>
        )}
        {gas.alerts?.length > 0 && (
          <section className="gas-section warning">
            <strong>Alertas gasométricas</strong>
            <div className="safety-pill-list">
              {gas.alerts.map((alert, idx) => <span className="safety-pill warn" key={idx}>{alert}</span>)}
            </div>
          </section>
        )}
      </div>
    </FormSection>
  );
}

function MobileQuickResult({ orders }) {
  if (!orders?.length) return null;
  return (
    <section className="mobile-quick-result" aria-label="Resumen rápido de reposiciones">
      {orders.map((order, idx) => {
        const current = orderCurrentSolution(order);
        const safety = order.safety || {};
        const route = safety.recommendedAccess || safety.access || safety.route || safety.selectedRoute || "Vía por definir";
        const control = order.controls?.[0] || "Control según evolución";
        const value = orderDisplayValue(order);
        return (
          <article className="mobile-quick-card" key={order._id || `${order.disorder}-${idx}`}>
            <span>
              <small>{order.disorder}</small>
              <strong>{value}</strong>
            </span>
            <div>
              <b>{current.solution}</b>
              <small>{current.rate || "Velocidad por definir"} · {route} · {control}</small>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function orderDisplayValue(order) {
  const safety = order?.safety || {};
  const key = disorderKey(order?.disorder);
  const valueByKey = {
    sodio: safety.sodiumCorrected ?? safety.sodiumMeasured ?? safety.sodium,
    potasio: safety.potassium,
    calcio: safety.calciumCorrected ?? safety.calcium ?? safety.calciumTotal,
    magnesio: safety.magnesium,
    fosforo: safety.phosphorus
  };
  const unitByKey = {
    sodio: "mmol/L",
    potasio: "mmol/L",
    calcio: "mg/dL",
    magnesio: "mg/dL",
    fosforo: "mg/dL"
  };
  const value = valueByKey[key];
  if (value === undefined || value === null || value === "") return "Activo";
  return `${value} ${unitByKey[key] || ""}`.trim();
}

function RepositionSummary({ orders }) {
  if (!orders?.length) return null;
  return (
    <section className="reposition-summary">
      <div className="section-heading-row">
        <div>
          <h2>Reposiciones sugeridas</h2>
          <p>{orders.length} reposición(es) activa(s) para los trastornos hidroelectrolíticos actuales.</p>
        </div>
        <span className="badge">{orders.length}</span>
      </div>
      <div className="reposition-grid">
        {orders.map((order, idx) => {
          const current = orderCurrentSolution(order);
          const safety = order.safety || {};
          const route = safety.recommendedAccess || safety.access || safety.route || safety.selectedRoute || "Confirmar via";
          const control = order.controls?.[0] || "Control segun evolucion";
          return (
            <article className="reposition-card" key={order._id || `${order.disorder}-${idx}`}>
              <div className="reposition-card-head">
                <span>Reposicion {idx + 1}</span>
                <b className={`badge ${order.priority || ""}`}>{order.priority || "prioridad"}</b>
              </div>
              <strong>{order.disorder}</strong>
              <div className="reposition-details">
                <small><b>Solucion</b>{current.solution}</small>
                <small><b>Velocidad</b>{current.rate || "Definir con selector"}</small>
                <small><b>Via</b>{route}</small>
                <small><b>Control</b>{control}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
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

function ClinicalValidationPanel({ embedded = false }) {
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
  const content = (
    <div className="validation-grid">
        {cases.map(([title, detail]) => (
          <div className="validation-item" key={title}>
            <strong>{title}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
  );
  if (embedded) return content;
  return (
    <FormSection title="Validación clínica interna" summary="Escenarios críticos del motor">
      {content}
    </FormSection>
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
  { key: "saline045", label: "Solucion salina 0.45%", sodium: 77, preparation: "Preparacion SSN 0.45%: 2 ampollas de Natrol + 480 cc de agua destilada." },
  { key: "ringer", label: "Ringer lactato", sodium: 130 },
  { key: "saline09", label: "Solucion salina 0.9%", sodium: 154 },
  { key: "saline3", label: "Solucion salina 3%", sodium: 513, preparation: "Preparacion SSN 3%: 400 cc de SSN 0.9% + 10 ampollas de Natrol." },
  { key: "saline75", label: "Solucion salina 7.5%", sodium: 1283 }
];

const electrolyteSolutionOptions = {
  potassiumPeripheral: [
    { key: "kperipheral-dad5", label: "KCl periferico en DAD 5%: 25 mL Katrol + 475 cc", concentration: 0.1, baseFluid: "dad5", preparation: "Preparacion KCl periferico en DAD 5%: mezclar 25 mL de Katrol con 475 cc de DAD 5%. No superar 8 mEq/h por via periferica." },
    { key: "kperipheral-dad5-low", label: "KCl periferico bajo en DAD 5% 0.02 mEq/mL", concentration: 0.02, baseFluid: "dad5", preparation: "Preparacion KCl periferico bajo: agregar KCl a DAD 5% x 500 mL hasta concentracion final 0.02 mEq/mL. Calcular velocidad final en mEq/h." },
    { key: "kperipheral", label: "KCl periferico: 25 mL Katrol + 475 cc SSN 0.9%", concentration: 0.1, baseFluid: "ssn09", preparation: "Preparacion KCl periferico: mezclar 25 mL de Katrol con 475 cc de solucion salina 0.9%. No superar 8 mEq/h por via periferica." }
  ],
  potassiumCentral: [
    { key: "kcentral-dad5", label: "KCl central en DAD 5%: 40 mL Katrol + 460 mL", concentration: 0.16, baseFluid: "dad5", preparation: "Preparacion KCl central en DAD 5%: mezclar 40 mL de Katrol con 460 mL de DAD 5%. Solo via central; no pasar por periferica. No superar 20 mEq/h por via central." },
    { key: "kcentral", label: "KCl central: 40 mL Katrol + 460 mL SSN 0.9%", concentration: 0.16, baseFluid: "ssn09", preparation: "Preparacion KCl central: mezclar 40 mL de Katrol con 460 mL de solucion salina 0.9%. Solo via central; no pasar por periferica. No superar 20 mEq/h por via central." }
  ],
  magnesium: [
    { key: "mg4000", label: "Magnesio 4000 mg en 100 cc SSN 0.9%", totalDoseMg: 4000, hours: 24, rateMlH: 5, preparation: "Preparacion magnesio: mezclar 4000 mg de magnesio en 100 cc de solucion salina 0.9%. Pasar a 5 cc/h por bomba durante 24 horas." }
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

function routeLabel(route) {
  return {
    periferico: "Periferica",
    linea_media: "Linea media",
    picc: "PICC",
    central: "Central",
    oral: "Oral/enteral",
    iv: "IV"
  }[route] || route || "Segun acceso";
}

function concentrationText(solution) {
  const parts = [];
  if (solution.sodium !== "" && solution.sodium !== undefined) parts.push(`Na ${solution.sodium} mEq/L`);
  if (solution.concentration !== "" && solution.concentration !== undefined) parts.push(`${solution.concentration}/mL`);
  if (solution.potassium !== "" && solution.potassium !== undefined) parts.push(`K ${solution.potassium}/mL`);
  if (solution.totalDoseMg) parts.push(`${solution.totalDoseMg} mg`);
  return parts.join(" · ") || "Segun preparacion";
}

function optionalNumber(value) {
  if (value === "" || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function institutionalOptions(settings = {}, disorder = "", route = "") {
  const normalizedDisorder = String(disorder || "").toLowerCase();
  return (settings.customSolutions || [])
    .filter((solution) => solution?.active !== false && solution?.name)
    .filter((solution) => {
      const matchesDisorder = normalizedDisorder.includes(String(solution.disorder || "").toLowerCase());
      const matchesRoute = !route
        || !solution.route
        || solution.route === route
        || (route === "picc" && solution.route === "central")
        || (route === "linea_media" && solution.route === "periferico");
      return matchesDisorder && matchesRoute;
    })
    .map((solution) => ({
      key: solution.id,
      label: solution.name,
      route: solution.route,
      sodium: optionalNumber(solution.sodium),
      concentration: optionalNumber(solution.concentration),
      potassium: optionalNumber(solution.potassium),
      totalDoseMg: optionalNumber(solution.totalDoseMg),
      hours: optionalNumber(solution.hours) || 24,
      rateMlH: optionalNumber(solution.rateMlH),
      preparation: solution.preparation,
      use: solution.use,
      baseFluid: solution.baseFluid
    }));
}

function isDextroseBasedSolution(solution = {}) {
  const text = `${solution.baseFluid || ""} ${solution.label || ""} ${solution.preparation || ""}`.toLowerCase();
  return text.includes("dad") || text.includes("dextrosa");
}

function ElectrolyteSolutionSelector({ order, calculations, onTextCalculated, settings }) {
  const disorder = String(order.disorder || "").toLowerCase();
  if (disorder.includes("natremia")) {
    return <SodiumSolutionSelector order={order} calculations={calculations} onTextCalculated={onTextCalculated} settings={settings} />;
  }
  return <NonSodiumSolutionSelector order={order} onTextCalculated={onTextCalculated} settings={settings} />;
}

function SodiumSolutionSelector({ order, calculations, onTextCalculated, settings }) {
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState(null);
  const disorder = String(order.disorder || "").toLowerCase();
  const isSodiumOrder = /natremia/i.test(order.disorder || "");
  const isHypernatremia = disorder.includes("hipernatremia");
  const compatibleSolutions = [
    ...sodiumSolutionOptions.filter((solution) => {
    if (isHypernatremia) return ["d5w", "saline045"].includes(solution.key);
    return ["saline09", "saline3", "saline75"].includes(solution.key);
    }),
    ...institutionalOptions(settings, disorder).filter((solution) => Number.isFinite(solution.sodium))
  ];
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
        ...(solution.preparation ? [solution.preparation] : []),
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
      ...(solution.preparation ? [solution.preparation] : []),
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

function NonSodiumSolutionSelector({ order, onTextCalculated, settings }) {
  const disorder = String(order.disorder || "").toLowerCase();
  const safety = order.safety || {};
  const potassium = Number(safety.potassium);
  const severity = String(order.severity || "").toLowerCase();
  const defaultRoute = String(safety.selectedInfusion || "").includes("central") || (Number.isFinite(potassium) && potassium < 2.5)
    ? "central"
    : "periferico";
  const [selectedRoute, setSelectedRoute] = useState(defaultRoute);

  let title = "Solucion para reposicion";
  let options = [];
  let defaultRate = Number(safety.infusionRateMlH ?? safety.continuousRate);
  let calculator = null;

  if (disorder.includes("hipokalemia")) {
    const central = ["central", "picc"].includes(selectedRoute);
    const baseOptions = central ? electrolyteSolutionOptions.potassiumCentral : electrolyteSolutionOptions.potassiumPeripheral;
    const sodium = Number(safety.sodiumCorrected ?? safety.sodiumMeasured);
    const hasHypernatremia = Number.isFinite(sodium) && sodium > 145;
    const institutionalPotassiumOptions = institutionalOptions(settings, disorder, selectedRoute)
      .filter((solution) => Number.isFinite(solution.concentration));
    const routeOptions = [...baseOptions, ...institutionalPotassiumOptions];
    options = hasHypernatremia ? routeOptions.filter(isDextroseBasedSolution) : routeOptions;
    calculator = (solution) => {
      const maxPotassiumRate = central ? 20 : 8;
      const routeRateLimit = central ? 100 : (selectedRoute === "linea_media" ? 70 : 50);
      const maxRateByConcentration = solution.concentration ? Math.floor((maxPotassiumRate / solution.concentration) * 10) / 10 : routeRateLimit;
      const targetRate = central ? (severity === "severa" ? 100 : 50) : (defaultRate || routeRateLimit);
      const safeRate = Math.min(routeRateLimit, maxRateByConcentration, targetRate);
      const potassiumRate = Math.round(safeRate * solution.concentration * 10) / 10;
      const maxMeqByRoute = Math.round(Math.min(routeRateLimit, maxRateByConcentration) * solution.concentration * 10) / 10;
      const totalReplacement = safety.potassiumTotalReplacementMeq;
      const durationHours = totalReplacement && potassiumRate ? Math.round((totalReplacement / potassiumRate) * 10) / 10 : null;
      const replacementText = totalReplacement
        ? `Calculo de dosis: basal ${safety.potassiumBasalMeq} mEq (peso x ${safety.potassiumBasalFactor} mEq) + ${safety.potassiumReplacementPercent}% (${safety.potassiumDeficitMeq} mEq) = ${totalReplacement} mEq totales a reponer.`
        : "Calculo de dosis: falta peso para estimar basal y total de potasio a reponer.";
      return [
        `Paciente con ${String(order.disorder || "hipokalemia").toLowerCase()} (K ${Number.isFinite(potassium) ? potassium : "no disponible"} mmol/L).`,
        hasHypernatremia ? `Hipernatremia concomitante (Na ${sodium} mmol/L): se muestran soluciones de potasio con dextrosa como base para evitar carga adicional de sodio.` : "",
        replacementText,
        `Solucion escogida: ${solution.label}.`,
        solution.preparation,
        `Concentracion final calculada: ${solution.concentration} mEq/mL.`,
        `Pasar a ${safeRate} mL/h por bomba: ${safeRate} mL/h x ${solution.concentration} mEq/mL = ${potassiumRate} mEq/h de potasio${durationHours ? ` durante aproximadamente ${durationHours} horas para la dosis total calculada` : ""}.`,
        `Velocidad maxima calculada para esta via y solucion: ${Math.min(routeRateLimit, maxRateByConcentration)} mL/h, equivalente a ${maxMeqByRoute} mEq/h; limite absoluto ${maxPotassiumRate} mEq/h.`,
        central ? "Usar solo por via central/PICC; no pasar preparacion central por periferica. No superar 20 mEq/h por via central." : "Usar por via periferica si la vena y el protocolo institucional lo permiten. No superar 8 mEq/h por via periferica.",
        "Solicitar potasio y magnesio de control segun intervalo indicado y ajustar segun resultado."
      ].filter(Boolean);
    };
  } else if (disorder.includes("hipomagnesemia")) {
    options = [...electrolyteSolutionOptions.magnesium, ...institutionalOptions(settings, disorder, selectedRoute)];
    calculator = (solution) => {
      const magnesiumRate = Math.round(solution.totalDoseMg / solution.hours);
      return [
        `Paciente con ${String(order.disorder || "hipomagnesemia").toLowerCase()} (Mg ${safety.magnesium ?? "no disponible"} mg/dL).`,
        `Solucion escogida: ${solution.label}.`,
        solution.preparation,
        `Administrar ${solution.totalDoseMg} mg endovenosos para ${solution.hours} horas por bomba a ${solution.rateMlH || 5} cc/h (${magnesiumRate} mg/h en promedio).`,
        "Ajustar o suspender si hay deterioro renal, arreflexia, depresion respiratoria, hipotension o signos de toxicidad.",
        "Solicitar magnesio, potasio, calcio y creatinina de control segun severidad y funcion renal."
      ];
    };
  } else if (disorder.includes("hipofosfatemia")) {
    const central = ["central", "picc"].includes(selectedRoute) || severity === "severa";
    const baseOptions = central ? electrolyteSolutionOptions.phosphorusCentral : electrolyteSolutionOptions.phosphorusPeripheral;
    options = [...baseOptions, ...institutionalOptions(settings, disorder, selectedRoute)];
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
    options = [...electrolyteSolutionOptions.hypocalcemia, ...institutionalOptions(settings, disorder, selectedRoute)];
    const severeHypocalcemia = disorder.includes("severa");
    calculator = (solution) => [
      `Paciente con ${String(order.disorder || "hipocalcemia").toLowerCase()} (Ca ${safety.calcium ?? safety.calciumCorrected ?? safety.calciumTotal ?? "no disponible"} mg/dL).`,
      `Solucion escogida: ${solution.label}.`,
      severeHypocalcemia ? "Monitorizacion cardiaca continua. EKG inicial y control segun evolucion clinica/QTc." : "Administrar IV lento bajo monitorizacion si hay sintomas importantes, QT prolongado o hipocalcemia severa.",
      severeHypocalcemia ? "Solicitar calcio ionico urgente, calcio total, albumina, magnesio, fosforo, potasio, sodio, creatinina, BUN, PTH intacta y 25 OH vitamina D." : "Solicitar calcio ionizado o corregido, magnesio, fosforo y creatinina de control.",
      severeHypocalcemia ? "Gluconato de calcio 10% 20 mL IV diluido en 100 mL de DAD 5% o SSN 0.9%, pasar en 10 minutos con monitorizacion cardiaca. Repetir si persisten sintomas, QT prolongado o calcio ionico criticamente bajo." : "",
      severeHypocalcemia ? "Luego gluconato de calcio 10% 100 mL en 1000 mL de SSN 0.9%, iniciar a 50 mL/h IV y titular hasta 100 mL/h segun calcio ionico, QTc y sintomas." : "",
      severeHypocalcemia ? "Control de calcio ionico cada 4-6 horas inicialmente; en paciente critico cada 2-4 horas." : "",
      severeHypocalcemia ? "Si magnesio bajo: sulfato de magnesio 2 g IV en 100 mL SSN 0.9% en 1 hora. Si deficit severo o persistente, continuar 4-8 g IV en 12-24 horas, ajustado a funcion renal." : "",
      severeHypocalcemia ? "Cuando tolere via oral: carbonato de calcio 1250 mg VO cada 8 horas con comidas. Calcitriol 0.25 mcg VO cada 12 horas, ajustar segun calcio, fosforo y funcion renal. Si deficit de vitamina D: colecalciferol 50.000 UI VO semanal por 6-8 semanas, luego mantenimiento." : "",
      severeHypocalcemia ? "No administrar calcio por la misma linea con bicarbonato o fosfato. Vigilar hipercalcemia de rebote, especialmente si se usa calcitriol, altas dosis de calcio oral o si mejora la funcion renal." : ""
    ].filter(Boolean);
  } else if (disorder.includes("hipercalcemia")) {
    options = [...electrolyteSolutionOptions.hypercalcemia, ...institutionalOptions(settings, disorder, selectedRoute)];
    defaultRate = Number(safety.hydrationRate ?? safety.continuousRate ?? 150);
    const severeHypercalcemia = disorder.includes("severa") || disorder.includes("maligna");
    const bolusText = safety.salineBolusMinMl && safety.salineBolusMaxMl
      ? `Bolo si hipovolemia/deshidratacion: ${safety.salineBolusMinMl}-${safety.salineBolusMaxMl} cc IV.`
      : "Bolo si hipovolemia/deshidratacion: 10-20 cc/kg IV.";
    const rateRange = safety.salineRateMinMlH && safety.salineRateMaxMlH
      ? `${safety.salineRateMinMlH}-${safety.salineRateMaxMlH} cc/h`
      : "2-4 cc/kg/h";
    calculator = (solution) => [
      `Paciente con ${String(order.disorder || "hipercalcemia").toLowerCase()} (Ca ${safety.calcium ?? safety.calciumCorrected ?? safety.calciumTotal ?? "no disponible"} mg/dL).`,
      `Solucion escogida: ${solution.label}.`,
      severeHypercalcemia ? "Monitorizacion: telemetria, EKG inicial, signos vitales, vigilancia neurologica, balance hidrico estricto, diuresis horaria y signos de sobrecarga." : "Monitorizar signos vitales, balance hidrico y funcion renal.",
      `${bolusText} Luego pasar SSN 0.9% a ${rateRange}, sugerido ${defaultRate} cc/h, ajustar cada 4-6 horas. Meta de diuresis 100-150 cc/hora.`,
      severeHypercalcemia ? "Antiresortivo: acido zoledronico 4 mg IV dosis unica en 15-30 minutos si funcion renal lo permite; alternativa pamidronato 60-90 mg IV en 2-4 horas; si malignidad, recurrencia, refractariedad o limitacion renal, denosumab 120 mg SC dias 1, 8, 15 y 29, luego cada 4 semanas." : "Definir antiresortivo segun severidad, etiologia y funcion renal.",
      "Furosemida no rutinaria: usar solo si sobrecarga posterior a hidratacion, 10-20 mg IV y titular segun respuesta.",
      "Control: calcio corregido o ionico, creatinina, BUN, sodio, potasio, magnesio, fosforo y albumina cada 12-24 horas segun severidad.",
      "Estudio etiologico: PTH intacta; si PTH suprimida solicitar PTHrP, 25 OH vitamina D, 1,25 OH vitamina D, electroforesis/inmunofijacion y busqueda dirigida de malignidad. Suspender calcio, vitamina D y tiazidas si aplica."
    ];
  }

  const [selectedKey, setSelectedKey] = useState(options[0]?.key || "");
  const [status, setStatus] = useState("");
  if (!options.length || !calculator) return null;
  const selectedValue = options.some((item) => item.key === selectedKey) ? selectedKey : options[0].key;

  function generate(value) {
    const solution = options.find((item) => item.key === value) || options[0];
    setSelectedKey(solution.key);
    const text = calculator(solution).map((line, index) => `${index + 1}. ${line}`).join("\n");
    onTextCalculated(text, {
      recalculated: true,
      solution: solution.label,
      route: selectedRoute,
      rate: defaultRate || null
    });
    setStatus(`Orden recalculada con ${solution.label}.`);
  }

  return (
    <div className="safety-box solution-picker">
      <strong>{title}</strong>
      <label>Via de reposicion
        <select value={selectedRoute} onChange={(event) => setSelectedRoute(event.target.value)}>
          <option value="periferico">Periferica</option>
          <option value="linea_media">Linea media</option>
          <option value="picc">PICC</option>
          <option value="central">Central</option>
          <option value="oral">Oral/enteral</option>
        </select>
      </label>
      <label>Escoger solucion
        <select value={selectedValue} onChange={(event) => generate(event.target.value)}>
          {options.map((solution) => (
            <option key={solution.key} value={solution.key}>{solution.label}</option>
          ))}
        </select>
      </label>
      {status && <small>{status}</small>}
      <button className="btn secondary" type="button" onClick={() => generate(selectedValue)}>
        Recalcular y generar orden
      </button>
    </div>
  );
}

function OrderCard({ order, calculations, onOrderUpdated, settings, index = 0, total = 1 }) {
  const [text, setText] = useState(cleanAppliedOrderText(order.editedText || order.suggestedText || ""));
  const [comment, setComment] = useState(order.comment || "");
  const [copied, setCopied] = useState(false);
  const [copiedPreparation, setCopiedPreparation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [safetyReviewOpen, setSafetyReviewOpen] = useState(false);
  const orderSections = orderFinalSections(text);
  const copyWarnings = copySafetyWarnings(order);

  useEffect(() => {
    setText(cleanAppliedOrderText(order.editedText || order.suggestedText || ""));
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

  async function copyConfirmed() {
    await navigator.clipboard.writeText(text);
    await update(`/orders/${order._id}/copy`, { method: "POST" });
    setCopied(true);
    setSafetyReviewOpen(false);
    setTimeout(() => setCopied(false), 1800);
  }

  async function copyPreparation() {
    const preparation = orderSections.preparation.length
      ? orderSections.preparation.join("\n")
      : text;
    await navigator.clipboard.writeText(preparation);
    setCopiedPreparation(true);
    setTimeout(() => setCopiedPreparation(false), 1800);
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
    const cleanedText = cleanAppliedOrderText(nextText);
    setText(cleanedText);
    if (!metadata.recalculated || !order._id) return;
    const updated = await update(`/orders/${order._id}/recalculate`, {
      method: "POST",
      body: JSON.stringify({ editedText: cleanedText, metadata })
    });
    if (updated?.editedText) setText(cleanAppliedOrderText(updated.editedText));
  }

  return (
    <article className="card order-card">
      <div className="order-card-header">
        <div>
          <small className="order-index">{total > 1 ? `Reposición ${index + 1} de ${total}` : "Reposición sugerida"}</small>
          {order.status && <span className="badge">{statusLabel(order.status)}</span>}
          <span className={`badge ${order.priority}`}>{order.severity} · {order.priority}</span>
        </div>
        <div className="order-copy-actions">
          <button className="btn secondary" onClick={() => setSafetyReviewOpen(true)} disabled={saving}><ClipboardCopy size={18} /> {copied ? "Copiada" : "Copiar orden"}</button>
          <button className="btn ghost" type="button" onClick={copyPreparation}><ClipboardCopy size={18} /> {copiedPreparation ? "Copiada" : "Solo preparacion"}</button>
        </div>
      </div>
      {safetyReviewOpen && (
        <div className="copy-review-panel">
          <div>
            <strong>Revisión de seguridad antes de copiar</strong>
            <small>Confirma vía, velocidad, función renal, ECG, incompatibilidades y control antes de usar la orden.</small>
          </div>
          <SafetyChecklist order={order} />
          {copyWarnings.length > 0 && (
            <div className="copy-warning-list" role="alert">
              <strong>Copiado con advertencias</strong>
              {copyWarnings.map((warning) => <span key={warning}>{warning}</span>)}
            </div>
          )}
          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={() => setSafetyReviewOpen(false)}>Volver a revisar</button>
            <button className="btn primary" type="button" onClick={copyConfirmed} disabled={saving}>
              <ClipboardCopy size={18} /> {copyWarnings.length ? "Copiar con advertencias" : "Confirmar y copiar"}
            </button>
          </div>
        </div>
      )}
      <OrderAlerts order={order} />
      <OrderClinicalBrief order={order} />
      <OrderFinalBlocks sections={orderSections} />
      <ElectrolyteSolutionSelector order={order} calculations={calculations} onTextCalculated={handleCalculatedText} settings={settings} />
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

function orderFinalSections(text = "") {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  const sections = {
    preparation: [],
    dose: [],
    controls: [],
    alerts: []
  };
  for (const line of lines) {
    if (/preparaci|solucion escogida|concentracion final|mezclar|diluid/i.test(line)) {
      sections.preparation.push(line);
    } else if (/pasar|administrar|bolo|velocidad|maxima|mEq\/h|mL\/h|cc\/h|duracion/i.test(line)) {
      sections.dose.push(line);
    } else if (/control|solicitar|laboratorio|monitor|vigil/i.test(line)) {
      sections.controls.push(line);
    } else if (/no superar|evitar|no pasar|alert|riesgo|uci|nefrolog/i.test(line)) {
      sections.alerts.push(line);
    }
  }
  return sections;
}

function OrderFinalBlocks({ sections }) {
  const blocks = [
    ["Preparacion", sections.preparation],
    ["Dosis y velocidad", sections.dose],
    ["Controles", sections.controls],
    ["Alertas", sections.alerts]
  ].filter(([, lines]) => lines.length);
  if (!blocks.length) return null;
  return (
    <div className="order-final-blocks">
      {blocks.map(([title, lines]) => (
        <section key={title}>
          <strong>{title}</strong>
          {lines.slice(0, 3).map((line) => <small key={line}>{line}</small>)}
        </section>
      ))}
    </div>
  );
}

function OrderClinicalBrief({ order }) {
  const safety = order.safety || {};
  const current = orderCurrentSolution(order);
  const route = safety.recommendedAccess || safety.access || safety.route || safety.selectedRoute || "Confirmar via";
  const firstControl = order.controls?.[0] || "Control segun evolucion clinica";
  const items = [
    ["Solucion", current.solution],
    ["Velocidad", current.rate || "Definir con selector"],
    ["Via", route],
    ["Control inicial", firstControl]
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

function copySafetyWarnings(order) {
  const safety = order.safety || {};
  const missing = order.missingData || [];
  return [
    ...missing.map((item) => `Dato pendiente: ${item}`),
    !safety.selectedInfusion && !safety.continuousFluid ? "Confirmar solución, vía y compatibilidad antes de transcribir." : null,
    safety.requiresEcg ? "ECG requerido antes o durante la reposición según severidad." : null,
    safety.requiresCardiacMonitoring ? "Monitorización cardiaca continua recomendada." : null,
    safety.renalSevere || safety.oliguria || safety.anuria ? "Riesgo renal: validar diuresis, creatinina y necesidad de nefrología." : null,
    safety.overloadRisk ? "Riesgo de sobrecarga: ajustar volumen y velocidad al estado clínico." : null
  ].filter(Boolean);
}

function OrderSafety({ order }) {
  const hasSafety = Boolean(order.safety);
  const controls = order.controls || [];
  const missing = order.missingData || [];
  if (!hasSafety && controls.length === 0 && missing.length === 0) return null;

  const safety = order.safety || {};
  const groups = [
    {
      title: "Limites de correccion",
      items: safetyFields(safety, [
        ["maxCorrection24h", "Max 24 h", "mmol/L"],
        ["maxCorrection12h", "Max 12 h", "mmol/L"],
        ["maxCorrection8h", "Max 8 h", "mmol/L"],
        ["maxCorrection4h", "Max 4 h", "mmol/L"],
        ["maxDecrease24h", "Descenso 24 h", "mmol/L"],
        ["maxDecrease12h", "Descenso 12 h", "mmol/L"],
        ["target24h", "Meta 24 h", "mmol/L"],
        ["target12h", "Meta 12 h", "mmol/L"]
      ])
    },
    {
      title: "Velocidades y volumenes",
      items: safetyFields(safety, [
        ["continuousRate", "Infusion", "mL/h"],
        ["infusionRateMlH", "Infusion", "mL/h"],
        ["maxInfusionRateMlH", "Max infusion", "mL/h"],
        ["sodiumInfusateMaxRateMlH", "Max Na", "mL/h"],
        ["potassiumConcentrationMeqMl", "K conc.", "mEq/mL"],
        ["potassiumRateMeqH", "Potasio", "mEq/h"],
        ["maxPotassiumRateMeqH", "Max K via", "mEq/h"],
        ["maxPotassiumRateBySelectedRouteMeqH", "Max K real", "mEq/h"],
        ["phosphateRateMmolH", "Fosforo", "mmol/h"],
        ["magnesiumRateMgH", "Magnesio", "mg/h"],
        ["hydrationRate", "Hidratacion", "cc/h"],
        ["solutionVolume24hMl", "Volumen 24 h", "cc"]
      ])
    },
    {
      title: "Reposicion de potasio",
      items: safetyFields(safety, [
        ["potassiumBasalMeq", "Basal", "mEq"],
        ["potassiumBasalFactor", "Factor", "mEq/kg"],
        ["potassiumReplacementPercent", "Porcentaje", "%"],
        ["potassiumDeficitMeq", "Deficit", "mEq"],
        ["potassiumTotalReplacementMeq", "Total", "mEq"],
        ["estimatedInfusionHours", "Duracion", "h"]
      ])
    },
    {
      title: "Datos clave",
      items: safetyFields(safety, [
        ["sodiumMeasured", "Na medido", "mmol/L"],
        ["sodiumCorrected", "Na corregido", "mmol/L"],
        ["potassium", "K", "mmol/L"],
        ["magnesium", "Mg", "mg/dL"],
        ["phosphorus", "P", "mg/dL"],
        ["calciumCorrected", "Ca corregido", "mg/dL"],
        ["calciumIonized", "Ca ionico", "mmol/L"],
        ["egfr", "TFG", "mL/min/1.73m2"]
      ])
    }
  ].filter((group) => group.items.length);

  const activeWarnings = [
    safety.requiresEcg && "ECG requerido",
    safety.requiresCardiacMonitoring && "Monitorizacion cardiaca",
    safety.highRiskOds && "Alto riesgo de desmielinizacion",
    safety.renalSevere && "Funcion renal severamente reducida",
    safety.oliguria && "Oliguria",
    safety.anuria && "Anuria",
    safety.refeedingRisk && "Riesgo de realimentacion",
    safety.overloadRisk && "Riesgo de sobrecarga hidrica",
    safety.malignantContext && "Contexto maligno probable"
  ].filter(Boolean);

  return (
    <details className="safety-details">
      <summary>
        <span>
          <strong>Seguridad y seguimiento</strong>
          <small>{controls.length} control(es) · {missing.length} dato(s) faltante(s)</small>
        </span>
        {activeWarnings.length > 0 && <b className="badge alta">{activeWarnings.length} alerta(s)</b>}
      </summary>
      <div className="safety-compact">
        {activeWarnings.length > 0 && (
          <section className="safety-compact-group warning">
            <strong>Alertas activas</strong>
            <div className="safety-pill-list">
              {activeWarnings.map((warning) => <span className="safety-pill warn" key={warning}>{warning}</span>)}
            </div>
          </section>
        )}
        {controls.length > 0 && (
          <section className="safety-compact-group">
            <strong>Controles</strong>
            <div className="safety-pill-list">
              {controls.map((control, idx) => <span className="safety-pill" key={idx}>{control}</span>)}
            </div>
          </section>
        )}
        {missing.length > 0 && (
          <section className="safety-compact-group missing">
            <strong>Datos faltantes</strong>
            <p>Completar cuando esten disponibles y recalcular si cambian la conducta.</p>
            <div className="safety-pill-list">
              {missing.map((item, idx) => <span className="safety-pill warn" key={idx}>{item}</span>)}
            </div>
          </section>
        )}
        {groups.map((group) => (
          <section className="safety-compact-group" key={group.title}>
            <strong>{group.title}</strong>
            <div className="safety-pill-list">
              {group.items.map((item) => <span className="safety-pill" key={item.key}><b>{item.label}</b>{item.value}</span>)}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}

function safetyFields(safety, definitions) {
  return definitions
    .map(([key, label, unit]) => {
      const rawValue = safety[key];
      if (rawValue === undefined || rawValue === null || rawValue === "") return null;
      return { key, label, value: `${rawValue}${unit ? ` ${unit}` : ""}` };
    })
    .filter(Boolean);
}

function cleanAppliedOrderText(value) {
  const rawLines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const cleanedLines = rawLines
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .map((line) => line.replace(/^Paciente con [^.]+?\.\s*/i, "").trim())
    .filter((line) => !/^Formula aplicada\b/i.test(line))
    .filter((line) => !/^Fórmula aplicada\b/i.test(line))
    .filter((line) => !/^Esta velocidad esta limitada\b/i.test(line))
    .filter((line) => !/^Esta velocidad está limitada\b/i.test(line))
    .filter(Boolean);
  return cleanedLines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

function Timeline({ labs, orders }) {
  const events = [
    ...labs.map((lab) => ({
      id: `lab-${lab._id}`,
      type: "Laboratorio",
      at: lab.collectedAt || lab.createdAt,
      title: "Laboratorio registrado",
      detail: `Na ${display(lab.sodium)} - K ${display(lab.potassium)} - Mg ${display(lab.magnesium)} - P ${display(lab.phosphorus)} - Ca ${display(lab.calciumTotal)} - Cr ${display(lab.creatinine)} - pH ${display(lab.ph)} - Lact ${display(lab.lactate)}`
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

function LabTrendTable({ labs, onDeleteLab }) {
  const rows = [...labs].sort((a, b) => new Date(b.collectedAt || b.createdAt || 0) - new Date(a.collectedAt || a.createdAt || 0)).slice(0, 6);
  if (!rows.length) return <p>No hay laboratorios guardados para mostrar tendencia.</p>;
  return (
    <div className="lab-trend-panel">
      <LabTrendSparklines labs={rows} />
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
              <th>pH</th>
              <th>pCO2</th>
              <th>HCO3</th>
              <th>Lact</th>
              <th>P/F</th>
              {onDeleteLab && <th></th>}
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
                <td>{display(lab.ph)}</td>
                <td>{display(lab.pco2)}</td>
                <td>{display(lab.bicarbonate)}</td>
                <td>{display(lab.lactate)}</td>
                <td>{display(labPfRatio(lab))}</td>
                {onDeleteLab && (
                  <td>
                    <button className="icon-button danger compact-icon" type="button" title="Borrar control" onClick={() => onDeleteLab(lab)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LabTrendSparklines({ labs }) {
  const chronological = [...labs].reverse();
  const series = [
    ["Na", "sodium", "mmol/L"],
    ["K", "potassium", "mmol/L"],
    ["pH", "ph", ""],
    ["HCO3", "bicarbonate", "mmol/L"],
    ["Lact", "lactate", "mmol/L"],
    ["P/F", "pfRatio", ""]
  ];
  return (
    <div className="trend-grid">
      {series.map(([label, key, unit]) => {
        const points = chronological
          .map((lab) => key === "pfRatio" ? labPfRatio(lab) : lab[key])
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        const latest = points.at(-1);
        return (
          <article className="trend-card" key={key}>
            <span><small>{label}</small><strong>{latest === undefined ? "—" : latest}{unit ? ` ${unit}` : ""}</strong></span>
            <Sparkline values={points} />
          </article>
        );
      })}
    </div>
  );
}

function Sparkline({ values }) {
  if (!values.length) return <div className="sparkline empty">Sin datos</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 34 - ((value - min) / range) * 28;
    return `${roundForSvg(x)},${roundForSvg(y)}`;
  }).join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 38" role="img" aria-label="Tendencia">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((value, index) => {
        const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
        const y = 34 - ((value - min) / range) * 28;
        return <circle key={`${value}-${index}`} cx={roundForSvg(x)} cy={roundForSvg(y)} r="2.8" />;
      })}
    </svg>
  );
}

function roundForSvg(value) {
  return Math.round(value * 10) / 10;
}

function truncateText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function buildClinicalSummary(evaluation, patientDetails) {
  const patient = patientDetails?.patient;
  const calc = evaluation?.calculations || {};
  const gas = calc.arterialGas;
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
    `Basal K: ${display(calc.potassiumBasalMeq, "mEq")}`,
    `Déficit K: ${display(calc.potassiumDeficitMeq, "mEq")}`,
    `Total K a reponer: ${display(calc.potassiumTotalReplacementMeq, "mEq")}`,
    ...(gas ? [
      "",
      "Gasometria arterial",
      `Estado pH: ${gas.acidBaseState}`,
      `Trastorno principal: ${gas.primaryDisorder}`,
      `Compensacion: ${gas.compensationAssessment}`,
      `Anion gap corregido: ${display(gas.correctedAnionGap, "mEq/L")}`,
      `Delta ratio: ${display(gas.deltaRatio)} (${gas.deltaRatioStatus || "no calculable"})`,
      `P/F: ${display(gas.pfRatio)}`,
      `Gradiente A-a: ${display(gas.aaGradient, "mmHg")}`,
      `Mecanismo de oxigenacion: ${gas.oxygenMechanism || "no clasificable"}`,
      `Razonamiento: ${gas.diagnosticExplanation || "no disponible"}`,
      ...((gas.etiologyHints || []).map((hint) => `- ${hint}`)),
      ...((gas.alerts || []).map((alert) => `- ${alert}`))
    ] : []),
    "",
    "Trastornos detectados",
    ...((evaluation?.classifications || []).map((item) => `- ${item.disorder} (${item.severity}, ${item.priority})`) || ["- Ninguno"]),
    "",
    "Órdenes sugeridas",
    ...((evaluation?.orders || []).flatMap((order, index) => [
      `${index + 1}. ${order.disorder}`,
      cleanAppliedOrderText(order.editedText || order.suggestedText || ""),
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

function labPfRatio(lab = {}) {
  const po2 = Number(lab.po2);
  const fio2Raw = Number(lab.fio2);
  if (!Number.isFinite(po2) || !Number.isFinite(fio2Raw) || fio2Raw <= 0) return "";
  const fio2 = fio2Raw > 1 ? fio2Raw / 100 : fio2Raw;
  if (fio2 <= 0) return "";
  return Math.round(po2 / fio2);
}

function latestPatientLab(labs = []) {
  return [...labs].sort((a, b) => new Date(b.collectedAt || b.createdAt || 0) - new Date(a.collectedAt || a.createdAt || 0))[0] || null;
}

function electrolyteState(item) {
  const numericValue = Number(item.value);
  if (!Number.isFinite(numericValue)) return "normal";
  return numericValue < item.low || numericValue > item.high ? "altered" : "normal";
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

function uniqueActiveElectrolyteCount(orders = []) {
  return new Set((orders || []).filter(Boolean).map((order) => disorderKey(order.disorder))).size;
}

function patientControlSummary(patient) {
  const lab = patient.latestLab || {};
  const disorder = String(patient.topOrder?.disorder || "").toLowerCase();
  if (disorder.includes("natremia") && lab.sodium !== undefined && lab.sodium !== null) return `Na ${lab.sodium}`;
  if (disorder.includes("kalemia") && lab.potassium !== undefined && lab.potassium !== null) return `K ${lab.potassium}`;
  if (disorder.includes("magnes") && lab.magnesium !== undefined && lab.magnesium !== null) return `Mg ${lab.magnesium}`;
  if (disorder.includes("fosf") && lab.phosphorus !== undefined && lab.phosphorus !== null) return `P ${lab.phosphorus}`;
  if (disorder.includes("calcemia") && (lab.calciumIonized !== undefined || lab.calciumTotal !== undefined)) return `Ca ${lab.calciumIonized ?? lab.calciumTotal}`;
  return patient.activeOrderCount ? `${patient.activeOrderCount} electrolito(s)` : "Sin control";
}

function PatientElectrolyteStrip({ lab }) {
  const items = [
    { label: "Na", value: lab?.sodium, low: 135, high: 145 },
    { label: "K", value: lab?.potassium, low: 3.5, high: 5.0 },
    { label: "Cl", value: lab?.chloride, low: 98, high: 106 },
    { label: "Mg", value: lab?.magnesium, low: 1.8, high: 2.6 },
    { label: "Ca", value: lab?.calciumIonized ?? lab?.calciumTotal, low: lab?.calciumIonized ? 1.12 : 8.5, high: lab?.calciumIonized ? 1.32 : 10.5 },
    { label: "P", value: lab?.phosphorus, low: 2.5, high: 4.5 }
  ]
    .filter((item) => item.value !== undefined && item.value !== null && item.value !== "")
    .filter((item) => electrolyteState(item) === "altered");

  if (!items.length) return null;

  return (
    <span className="patient-electrolytes">
      {items.map((item) => {
        const state = electrolyteState(item);
        return (
          <span className={`patient-electrolyte ${state}`} key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </span>
        );
      })}
    </span>
  );
}

function PatientDisorderList({ orders, lab }) {
  const seen = new Set();
  const visibleOrders = (orders || [])
    .filter(Boolean)
    .filter((order) => {
      const key = disorderKey(order.disorder);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
  if (!visibleOrders.length) return null;
  return (
    <span className="patient-disorders">
      {visibleOrders.map((order) => {
        const metric = disorderMetric(order.disorder, lab);
        return (
          <span className={`patient-disorder ${order.priority || ""}`} key={disorderKey(order.disorder)}>
            <small>{order.disorder}</small>
            <strong>{metric}</strong>
          </span>
        );
      })}
    </span>
  );
}

function disorderKey(disorder = "") {
  const value = String(disorder).toLowerCase();
  if (value.includes("natremia")) return "sodio";
  if (value.includes("kalemia")) return "potasio";
  if (value.includes("magnes")) return "magnesio";
  if (value.includes("fosf")) return "fosforo";
  if (value.includes("calcemia")) return "calcio";
  return value.replace(/\s+/g, "-") || "trastorno";
}

function disorderMetric(disorder = "", lab = {}) {
  const value = String(disorder).toLowerCase();
  if (value.includes("natremia")) return `Na ${displayCompact(lab?.sodium)}`;
  if (value.includes("kalemia")) return `K ${displayCompact(lab?.potassium)}`;
  if (value.includes("magnes")) return `Mg ${displayCompact(lab?.magnesium)}`;
  if (value.includes("fosf")) return `P ${displayCompact(lab?.phosphorus)}`;
  if (value.includes("calcemia")) return `Ca ${displayCompact(lab?.calciumIonized ?? lab?.calciumTotal)}`;
  return displayCompact("");
}

function displayCompact(value) {
  if (value === undefined || value === null || value === "") return "—";
  return value;
}

function compactSolutionName(value) {
  return String(value || "No definida")
    .replace(/^infusion de [^:]+:\s*/i, "")
    .replace(/\bsolucion salina\b/gi, "SSN")
    .replace(/\bsolución salina\b/gi, "SSN")
    .replace(/\bsolucion\b/gi, "Sol.")
    .replace(/\bSolucion\b/g, "Sol.")
    .replace(/\bSSN 0\.9%\b/gi, "SSN 0.9%")
    .replace(/\bde Katrol\b/gi, "Katrol")
    .replace(/\s+/g, " ")
    .trim();
}

function patientCurrentSolution(patient, { compact = true } = {}) {
  const current = orderCurrentSolution(patient.topOrder || {});
  const solution = compact ? compactSolutionName(current.solution) : current.solution;
  return current.rate ? `${solution} · ${current.rate}` : solution;
}

function patientCurrentSolutions(patient, { compact = true } = {}) {
  const orders = patient.activeOrders?.length ? patient.activeOrders : (patient.topOrder ? [patient.topOrder] : []);
  const seen = new Set();
  const solutions = orders
    .filter((order) => {
      const key = disorderKey(order?.disorder);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((order) => {
      const current = orderCurrentSolution(order || {});
      const solution = compact ? compactSolutionName(current.solution) : current.solution;
      return current.rate ? `${solution} ${current.rate}` : solution;
    })
    .filter(Boolean);
  if (!solutions.length) return patientCurrentSolution(patient, { compact });
  if (!compact) return solutions.join(" | ");
  const visible = solutions.slice(0, 2);
  const remaining = solutions.length - visible.length;
  return remaining > 0 ? `${visible.join(" | ")} +${remaining}` : visible.join(" | ");
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
  if (disorder.includes("hiponatremia")) return ["SSN 3%: 400 cc SSN 0.9% + 10 ampollas Natrol", "Solucion salina 0.9% si hipovolemia"];
  if (disorder.includes("hipernatremia")) return ["SSN 0.45%: 2 ampollas Natrol + 480 cc agua destilada", "Dextrosa al 5%", "Agua libre oral/enteral"];
  if (disorder.includes("hipokalemia")) return ["KCl periferico: 25 mL Katrol + 475 cc SSN 0.9%", "KCl central: 40 mL Katrol + 460 mL SSN 0.9%"];
  if (disorder.includes("hipomagnesemia")) return ["Magnesio 4000 mg en 100 cc SSN 0.9% a 5 cc/h"];
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
