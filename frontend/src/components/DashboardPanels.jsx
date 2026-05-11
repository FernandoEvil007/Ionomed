export function DashboardPanels({ dashboard, onSelectPatient, formatShortDate }) {
  if (!dashboard) return null;
  const alerts = dashboard.criticalAlerts || [];
  const controls = dashboard.controls || [];
  const visibleAlerts = alerts.slice(0, 3);
  const hiddenAlerts = alerts.slice(3);
  const visibleControls = controls.slice(0, 4);
  const hiddenControls = controls.slice(4, 10);

  return (
    <section className="dashboard-grid compact">
      <div className="card dashboard-panel">
        <div className="dashboard-panel-title">
          <h2>Alertas activas</h2>
          <span className="badge">{alerts.length}</span>
        </div>
        {alerts.length === 0 && <p>No hay alertas criticas activas.</p>}
        {visibleAlerts.map((alert) => (
          <button className="dashboard-row" key={alert.orderId} onClick={() => onSelectPatient({ patientId: alert.patientId })}>
            <span>
              <strong>{alert.patientName}</strong>
              <small>{alert.disorder} · {alert.severity}</small>
            </span>
            <span className={`badge ${alert.priority}`}>{alert.controlValue || alert.priority}</span>
          </button>
        ))}
        {hiddenAlerts.length > 0 && (
          <details className="dashboard-more">
            <summary>Ver {hiddenAlerts.length} alerta(s) mas</summary>
            <div className="controls-list tight">
              {hiddenAlerts.map((alert) => (
                <button className="dashboard-row" key={alert.orderId} onClick={() => onSelectPatient({ patientId: alert.patientId })}>
                  <span>
                    <strong>{alert.patientName}</strong>
                    <small>{alert.disorder} · {alert.severity}</small>
                  </span>
                  <span className={`badge ${alert.priority}`}>{alert.controlValue || alert.priority}</span>
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="card dashboard-panel">
        <div className="dashboard-panel-title">
          <h2>Controles</h2>
          <span className="badge">{controls.length}</span>
        </div>
        {controls.length === 0 && <p>No hay controles pendientes calculados.</p>}
          <div className="controls-list tight">
            {visibleControls.map((control) => (
              <button className={`dashboard-row compact-row ${control.overdue ? "overdue" : ""}`} key={control.orderId} onClick={() => onSelectPatient({ patientId: control.patientId })}>
                <span>
                  <strong>{control.patientName}</strong>
                  <small>{control.disorder}</small>
                </span>
                <span>{control.controlValue ? `${control.controlValue} - ` : ""}{formatShortDate(control.dueAt)}</span>
              </button>
            ))}
          </div>
        {hiddenControls.length > 0 && (
          <details className="dashboard-more">
            <summary>Ver {hiddenControls.length} control(es) mas</summary>
            <div className="controls-list tight">
              {hiddenControls.map((control) => (
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
        )}
      </div>
    </section>
  );
}

export function MobileDashboardPanels({ dashboard, onSelectPatient, formatShortDate }) {
  if (!dashboard) return null;
  const alerts = dashboard.criticalAlerts || [];
  const controls = dashboard.controls || [];
  const nextAlert = alerts[0];
  const nextControl = controls[0];

  return (
    <section className="mobile-dashboard">
      <div className="mobile-dashboard-strip">
        <button type="button" className="mobile-stat danger" onClick={() => nextAlert && onSelectPatient({ patientId: nextAlert.patientId })}>
          <strong>{alerts.length}</strong>
          <span>Alertas</span>
        </button>
        <button type="button" className="mobile-stat" onClick={() => nextControl && onSelectPatient({ patientId: nextControl.patientId })}>
          <strong>{controls.length}</strong>
          <span>Controles</span>
        </button>
        <div className="mobile-stat">
          <strong>{dashboard.counts?.activePatients ?? 0}</strong>
          <span>Activos</span>
        </div>
      </div>
      {(nextAlert || nextControl) && (
        <details className="mobile-dashboard-details">
          <summary>Ver prioridad clínica</summary>
          <div>
            {nextAlert && (
              <button type="button" className="mobile-priority-row" onClick={() => onSelectPatient({ patientId: nextAlert.patientId })}>
                <span><strong>{nextAlert.patientName}</strong><small>{nextAlert.disorder}</small></span>
                <b className={`badge ${nextAlert.priority}`}>{nextAlert.controlValue || nextAlert.priority}</b>
              </button>
            )}
            {nextControl && (
              <button type="button" className="mobile-priority-row" onClick={() => onSelectPatient({ patientId: nextControl.patientId })}>
                <span><strong>{nextControl.patientName}</strong><small>{nextControl.disorder}</small></span>
                <b>{formatShortDate(nextControl.dueAt)}</b>
              </button>
            )}
          </div>
        </details>
      )}
    </section>
  );
}

export function SelectedPatientTreatmentPanel({ patient, orderHistory, orderCurrentSolution, orderSolutionOptions }) {
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
