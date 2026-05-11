import express from "express";
import { authRequired } from "../middleware/auth.js";
import { evaluateClinicalCase } from "../clinical/engine.js";
import { buildFollowUp, buildPersistentClassifications } from "../clinical/followup.js";
import { labSchema, patientSchema } from "../clinical/inputSchemas.js";
import {
  closePatient,
  createLab,
  createOrders,
  createPatient,
  deleteLab,
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

router.delete("/:id/labs/:labId", async (req, res) => {
  const patient = await findPatientById(req.params.id, req.user.institutionId);
  if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
  const lab = await deleteLab(req.params.labId, patient.id, req.user.institutionId);
  if (!lab) return res.status(404).json({ message: "Control no encontrado" });
  res.json({ ok: true, lab });
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
