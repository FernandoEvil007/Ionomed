export function ClinicalResultSummary({ labText, disorderCount, electrolyteCount, orderCount }) {
  return (
    <section className="clinical-result-summary">
      <div>
        <small>Laboratorio usado</small>
        <strong>{labText}</strong>
      </div>
      <div>
        <small>Trastornos detectados</small>
        <strong>{disorderCount || 0}</strong>
      </div>
      <div>
        <small>Electrolitos activos</small>
        <strong>{electrolyteCount || 0}</strong>
      </div>
      <div>
        <small>Reposiciones sugeridas</small>
        <strong>{orderCount || 0}</strong>
      </div>
    </section>
  );
}
