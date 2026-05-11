import { Download } from "lucide-react";
import { ClinicalResultSummary } from "./ClinicalResultSummary";
import { FormSection } from "./ClinicalForms";

export function ResultPanel({
  evaluation,
  patientDetails,
  orderHistory,
  onOrderUpdated,
  onDeleteLab,
  settings,
  helpers,
  components
}) {
  if (!evaluation) {
    return (
      <div className="grid">
        <div className="alert">Ingresa datos del paciente y laboratorios para generar una evaluacion.</div>
        <components.ClinicalValidationPanel />
      </div>
    );
  }

  const {
    activeClinicalOrders,
    buildClinicalSummary,
    disorderKey,
    display,
    formatShortDate
  } = helpers;
  const {
    ArterialGasPanel,
    ClinicalValidationPanel,
    FollowUpPanel,
    MobileQuickResult,
    OrderCard,
    PatientHistorySection,
    RepositionSummary
  } = components;

  const calc = evaluation.calculations || {};
  const orders = activeClinicalOrders(evaluation.orders || [], orderHistory || []);
  const evaluationWithActiveOrders = { ...evaluation, orders };
  const latestLab = patientDetails?.labs?.[0] || null;
  const labText = latestLab ? formatShortDate(latestLab.collectedAt || latestLab.createdAt) : "Evaluacion no guardada";
  const activeElectrolytes = new Set(orders.map((order) => disorderKey(order.disorder)));
  const outdatedOrders = latestLab?._id
    ? (orderHistory || []).filter((order) =>
      order?.labId &&
      String(order.labId) !== String(latestLab._id) &&
      !["done", "not_done"].includes(order.status)
    )
    : [];

  function downloadSummary() {
    const text = buildClinicalSummary(evaluationWithActiveOrders, patientDetails);
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
      {outdatedOrders.length > 0 && (
        <div className="alert">
          <strong>Ordenes activas previas:</strong> {outdatedOrders.length} reposicion(es) activa(s) fueron creadas con un laboratorio anterior. Recalcula o confirma antes de copiar.
        </div>
      )}
      <ClinicalResultSummary
        labText={labText}
        disorderCount={(evaluation.classifications || []).length}
        electrolyteCount={activeElectrolytes.size}
        orderCount={orders.length}
      />
      <MobileQuickResult orders={orders} />
      <FollowUpPanel followUp={evaluation.followUp} />
      <RepositionSummary orders={orders} />

      <FormSection title="Calculos automaticos" summary="Renal, correcciones y deficits">
        <div className="metrics">
          <components.Metric label="TFG CKD-EPI" value={display(calc.egfr, "mL/min/1.73m2")} />
          <components.Metric label="Cockcroft-Gault" value={display(calc.cockcroftGault, "mL/min")} />
          <components.Metric label="Clase renal" value={calc.renalClass || "—"} />
          <components.Metric label="ACT estimada" value={display(calc.totalBodyWater, "L")} />
          <components.Metric label="Na corregido" value={display(calc.sodiumCorrected, "mmol/L")} />
          <components.Metric label="Ca corregido" value={display(calc.calciumCorrected, "mg/dL")} />
          <components.Metric label="Osm calculada" value={display(calc.calculatedSerumOsmolality, "mOsm/kg")} />
          <components.Metric label="NaCl 3% Δ/L" value={display(calc.sodium3ChangePerLiter, "mmol/L")} />
          <components.Metric label="Deficit Na estimado" value={display(calc.sodiumDeficitMeq, "mEq")} />
          <components.Metric label="Basal K estimado" value={display(calc.potassiumBasalMeq, "mEq")} />
          <components.Metric label="Deficit K estimado" value={display(calc.potassiumDeficitMeq, "mEq")} />
          <components.Metric label="Total K a reponer" value={display(calc.potassiumTotalReplacementMeq, "mEq")} />
        </div>
      </FormSection>

      <ArterialGasPanel gas={calc.arterialGas} />

      <FormSection title="Ordenes medicas sugeridas" summary={`${orders.length} orden(es) lista(s) para revisar`} open>
        <div className="result-actions compact">
          <button className="btn ghost" type="button" onClick={downloadSummary}><Download size={18} /> Exportar resumen</button>
          <button className="btn secondary" type="button" onClick={printSummary}>Imprimir / PDF</button>
        </div>
        {orders.map((order, idx) => (
          <OrderCard
            order={order}
            calculations={calc}
            key={order._id || idx}
            index={idx}
            total={orders.length}
            onOrderUpdated={onOrderUpdated}
            settings={settings}
          />
        ))}
      </FormSection>

      <FormSection title="Validacion y seguridad" summary="Escenarios criticos del motor">
        <ClinicalValidationPanel embedded />
      </FormSection>

      <PatientHistorySection labs={patientDetails?.labs || []} orders={orderHistory || []} onDeleteLab={onDeleteLab} />
    </div>
  );
}
