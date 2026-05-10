# IonoMed Clinical Modules

Este directorio define la arquitectura objetivo del motor clinico.

El motor historico vive en `../engine.js` para conservar estabilidad, pero la evolucion profesional debe separar responsabilidades asi:

- `sodium.js`: hiponatremia, hipernatremia, formula de Adrogue-Madias, limites 12/24 h y agua libre.
- `potassium.js`: hipokalemia, hiperkalemia, via central/periferica, ECG, UCI y velocidades.
- `magnesium.js`: hipo/hipermagnesemia, toxicidad, funcion renal y co-reposicion K/Ca.
- `phosphorus.js`: hipo/hiperfosfatemia, realimentacion, producto calcio-fosforo y aporte de potasio.
- `calcium.js`: calcio corregido/ionizado, hipocalcemia, hipercalcemia e hipercalcemia maligna.
- `safety.js`: datos faltantes, limites, monitorizacion, alertas y version de protocolo.
- `solutions.js`: concentraciones institucionales, compatibilidad por trastorno y preparacion.

Regla de seguridad: cada modulo debe devolver la misma forma de orden:

```js
{
  disorder,
  severity,
  priority,
  suggestedText,
  alerts,
  justification,
  safety,
  missingData,
  controls
}
```

Toda nueva regla clinica debe agregarse tambien a `../validate-cases.js`.

