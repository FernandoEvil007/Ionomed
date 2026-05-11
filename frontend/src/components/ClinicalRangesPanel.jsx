import { clinicalRanges } from "../clinicalRanges";

export function ClinicalRangesPanel() {
  return (
    <div className="ranges-panel">
      <section className="result-header ranges-header">
        <div>
          <h2>Rangos clinicos</h2>
          <p>Referencia visible para interpretar la clasificacion automatica del motor.</p>
        </div>
      </section>
      <div className="ranges-grid">
        {clinicalRanges.map((group) => (
          <article className="range-card" key={group.electrolyte}>
            <div className="range-card-head">
              <div>
                <h3>{group.electrolyte}</h3>
                <small>{group.unit}</small>
              </div>
              {group.note && <p>{group.note}</p>}
            </div>
            <div className="range-table">
              {group.rows.map((row) => (
                <div className="range-row" key={`${group.electrolyte}-${row.disorder}`}>
                  <span>
                    <strong>{row.disorder}</strong>
                    <small>{row.range}</small>
                  </span>
                  <b className={`badge ${row.severity}`}>{row.severity}</b>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
