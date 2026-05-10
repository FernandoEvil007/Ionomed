import express from "express";
import { z } from "zod";
import { authRequired } from "../middleware/auth.js";
import { evaluateClinicalCase } from "../clinical/engine.js";
import { buildFollowUp, buildPersistentClassifications } from "../clinical/followup.js";
import {
  closePatient,
  createLab,
  createOrders,
  createPatient,
  findInstitutionById,
  findPatientById,
  latestLabBefore,
  listLabs,
  listPatients,
  makeAuditEvent,
  updatePatient
} from "../store.js";

const router = express.Router();
router.use(authRequired);

const patientSchema = z.object({
  localIdentifier: z.string().optional(),
  nameOrCode: z.string().min(1),
  age: z.coerce.number().min(0).max(120).optional().nullable(),
  sex: z.enum(["male", "female"]).default("male"),
  weightKg: z.coerce.number().min(1).optional().nullable(),
  heightCm: z.coerce.number().optional().nullable(),
  clinicalArea: z.enum(["urgencias", "hospitalizacion", "uci", "ambulatorio"]).default("hospitalizacion"),
  location: z.string().optional(),
  volumeStatus: z.enum(["hipovolemico", "euvolemico", "hipervolemico", "incierto"]).default("incierto"),
  oralRouteAvailable: z.boolean().default(true),
  venousAccess: z.enum(["periferico", "linea_media", "central", "ninguno", "desconocido"]).default("desconocido"),
  urineOutputMlKgH: z.coerce.number().optional().nullable(),
  comorbidities: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  neurologicSymptoms: z.array(z.string()).default([]),
  cardiovascularSymptoms: z.array(z.string()).default([])
});

const labSchema = z.object({
  collectedAt: z.coerce.date().optional(),
  sodium: z.coerce.number().optional().nullable(),
  potassium: z.coerce.number().optional().nullable(),
  chloride: z.coerce.number().optional().nullable(),
  magnesium: z.coerce.number().optional().nullable(),
  phosphorus: z.coerce.number().optional().nullable(),
  calciumTotal: z.coerce.number().optional().nullable(),
  calciumIonized: z.coerce.number().optional().nullable(),
  albumin: z.coerce.number().optional().nullable(),
  glucose: z.coerce.number().optional().nullable(),
  creatinine: z.coerce.number().optional().nullable(),
  urea: z.coerce.number().optional().nullable(),
  bun: z.coerce.number().optional().nullable(),
  ph: z.coerce.number().optional().nullable(),
  bicarbonate: z.coerce.number().optional().nullable(),
  serumOsmolality: z.coerce.number().optional().nullable(),
  urineOsmolality: z.coerce.number().optional().nullable(),
  urineSodium: z.coerce.number().optional().nullable(),
  urinePotassium: z.coerce.number().optional().nullable(),
  notes: z.string().optional()
});

router.get("/", async (req, res) => {
  res.json(await listPatients(req.user.institutionId));
});

router.post("/", async (req, res, next) => {
  try {
    const data = patientSchema.parse(req.body);
    const patient = await createPatient({
      ...data,
      institutionId: req.user.institutionId,
      createdBy: req.user.id
    });
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res) => {
  const patient = await findPatientById(req.params.id, req.user.institutionId);
  if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
  const labs = await listLabs(patient.id, req.user.institutionId);
  res.json({ patient, labs });
});

router.put("/:id", async (req, res, next) => {
  try {
    const data = patientSchema.partial().parse(req.body);
    const patient = await updatePatient(req.params.id, req.user.institutionId, data);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    res.json(patient);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/labs", async (req, res, next) => {
  try {
    const patient = await findPatientById(req.params.id, req.user.institutionId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });

    const data = labSchema.parse(req.body);
    const lab = await createLab({
      ...data,
      institutionId: req.user.institutionId,
      patientId: patient.id,
      createdBy: req.user.id
    });
    const previousLab = await latestLabBefore(patient.id, req.user.institutionId, lab.id);
    const institution = await findInstitutionById(req.user.institutionId);
    const evaluation = evaluateClinicalCase({ patient, lab, settings: institution?.settings || {} });
    const followUp = buildFollowUp({
      currentLab: lab,
      previousLab,
      patient,
      settings: institution?.settings || {}
    });

    evaluation.followUp = followUp;
    const persistentClassifications = buildPersistentClassifications({ currentLab: lab, previousLab });
    const activeDisorders = new Set(evaluation.classifications.map((item) => String(item.disorder || "").split(" ")[0].toLowerCase()));
    const newPersistent = persistentClassifications.filter((item) => !activeDisorders.has(String(item.disorder || "").split(" ")[0].toLowerCase()));
    if (newPersistent.length) {
      evaluation.classifications = [...evaluation.classifications, ...newPersistent];
      evaluation.globalAlerts = [
        ...newPersistent.map((item) => item.note),
        ...(evaluation.globalAlerts || [])
      ];
    }
    evaluation.globalAlerts = [...(followUp.alerts || []), ...(evaluation.globalAlerts || [])];

    const orders = await createOrders(evaluation.orders, {
      institutionId: req.user.institutionId,
      patientId: patient.id,
      labId: lab.id,
      createdBy: req.user.id,
      auditEvents: [makeAuditEvent(req.user, "generated", "Orden sugerida generada al ingresar laboratorio.")]
    });
    evaluation.orders = orders;

    res.status(201).json({ lab, evaluation, orders });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/close", async (req, res) => {
  const patient = await closePatient(req.params.id, req.user.institutionId);
  if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
  res.json(patient);
});

router.delete("/:id", async (req, res) => {
  const patient = await closePatient(req.params.id, req.user.institutionId);
  if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
  res.json({ ok: true, patient });
});

export default router;
