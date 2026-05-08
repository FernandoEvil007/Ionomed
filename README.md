# IonoMed MVP Starter

IonoMed es una aplicacion medica de soporte clinico para trastornos hidroelectroliticos. Este starter incluye:

- Frontend React + Vite.
- Backend Node.js + Express + SQLite local.
- Registro obligatorio con rol profesional.
- Usuarios permitidos: estudiante de medicina, interno, residente, fellow, especialista y subespecialista.
- Calculo de funcion renal: CKD-EPI 2021 y Cockcroft-Gault.
- Motor clinico inicial para sodio, potasio, magnesio, fosforo, calcio e hipercalcemia maligna.
- Generacion de ordenes medicas sugeridas, especificas, editables y copiables.
- Seguimiento con laboratorios de control, alertas dinamicas y auditoria de ordenes.
- Aislamiento por institucion desde el modelo de datos.

## Estructura

```txt
IonoMed/
  backend/
  frontend/
```

## Instalacion local

1. Instala dependencias:

```bash
npm run install:all
```

2. Crea el archivo de ambiente del backend:

```bash
copy backend\.env.example backend\.env
```

3. Configura `JWT_SECRET` en `backend/.env`.

Opcionalmente puedes definir la ruta de la base SQLite:

```env
DB_PATH=./ionomed.sqlite
```

Si no defines `DB_PATH`, el backend crea `backend/ionomed.sqlite`.

4. Ejecuta frontend y backend:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000`

## Base de datos local

IonoMed ya no usa MongoDB. Los datos se guardan en SQLite local, siguiendo el mismo estilo de TurnosMed y TurnosMedUCI: un archivo `.sqlite` persistente, sin servicios externos obligatorios.

## Seguridad clinica

IonoMed es una herramienta de apoyo clinico para usuarios del area medica. Las recomendaciones son sugeridas, editables y deben interpretarse segun el contexto clinico, protocolos institucionales y criterio del medico tratante. No reemplaza la valoracion medica ni la responsabilidad profesional.

## Siguiente fase sugerida

1. Agregar panel administrativo institucional.
2. Ajustar protocolos institucionales desde la interfaz.
3. Refinar dosis exactas por disponibilidad local.
4. Agregar backup/restauracion SQLite como TurnosMed.
5. Completar PWA con iconos finales.
