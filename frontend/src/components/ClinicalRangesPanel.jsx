import { useState } from "react";
import { clinicalRanges } from "../clinicalRanges";

export function ClinicalRangesPanel() {
  const [mobileElectrolyte, setMobileElectrolyte] = useState(clinicalRanges[0]?.electrolyte || "");
  const shortLabels = {
    Sodio: "Na",
    Potasio: "K",
    "Calcio total corregido": "Ca",
    Magnesio: "Mg",
    Fosforo: "P"
  };

  return (
    <div className="ranges-panel">
      <section className="result-header ranges-header">
        <div>
          <h2>Rangos clinicos</h2>
          <p>Referencia visible para interpretar la clasificacion automatica del motor.</p>
        </div>
      </section>
      <div className="range-filter" aria-label="Filtro movil de electrolitos">
        {clinicalRanges.map((group) => (
          <button
            key={group.electrolyte}
            type="button"
            className={mobileElectrolyte === group.electrolyte ? "active" : ""}
            onClick={() => setMobileElectrolyte(group.electrolyte)}
          >
            {shortLabels[group.electrolyte] || group.electrolyte}
          </button>
        ))}
      </div>
      <div className="ranges-grid">
        {clinicalRanges.map((group) => (
          <article className={`range-card ${mobileElectrolyte !== group.electrolyte ? "range-card-mobile-hidden" : ""}`} key={group.electrolyte}>
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
