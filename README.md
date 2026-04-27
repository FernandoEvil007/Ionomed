# IonoMed MVP Starter

IonoMed es una aplicación médica de soporte clínico para trastornos hidroelectrolíticos. Este starter incluye:

- Frontend React + Vite.
- Backend Node.js + Express + MongoDB.
- Registro obligatorio con rol profesional.
- Usuarios permitidos: estudiante de medicina, interno, residente, fellow, especialista y subespecialista.
- Cálculo de función renal: CKD-EPI 2021 y Cockcroft-Gault.
- Motor clínico inicial para sodio, potasio, magnesio, fósforo, calcio e hipercalcemia maligna.
- Generación de órdenes médicas sugeridas, específicas, editables y copiables.
- Aislamiento por institución desde el modelo de datos.

## Estructura

```txt
ionomed_starter/
  backend/
  frontend/
```

## Instalación local

1. Instala dependencias:

```bash
npm run install:all
```

2. Crea el archivo de ambiente del backend:

```bash
copy backend\.env.example backend\.env
```

En Mac/Linux:

```bash
cp backend/.env.example backend/.env
```

3. Configura `MONGODB_URI` en `backend/.env`.

4. Ejecuta frontend y backend:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000`

## Seguridad clínica

IonoMed es una herramienta de apoyo clínico para usuarios del área médica. Las recomendaciones son sugeridas, editables y deben interpretarse según el contexto clínico, protocolos institucionales y criterio del médico tratante. No reemplaza la valoración médica ni la responsabilidad profesional.

## Siguiente fase sugerida

1. Conectar con MongoDB Atlas.
2. Ajustar protocolos institucionales.
3. Refinar dosis exactas por disponibilidad local.
4. Agregar PWA con íconos finales.
5. Agregar panel administrativo institucional.
