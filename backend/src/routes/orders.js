import express from "express";
import { authRequired } from "../middleware/auth.js";
import { evaluateClinicalCase } from "../clinical/engine.js";
import {
  createOrders,
  findInstitutionById,
  findLabById,
  findPatientById,
  listOrders,
  makeAuditEvent,
  updateOrder
} from "../store.js";

const router = express.Router();
router.use(authRequired);

router.get("/patient/:patientId", async (req, res) => {
  res.json(await listOrders(req.params.patientId, req.user.institutionId));
});

router.post("/generate", async (req, res, next) => {
  try {
    const { patientId, labId } = req.body;
    const patient = await findPatientById(patientId, req.user.institutionId);
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    const lab = await findLabById(labId, patient.id, req.user.institutionId);
    if (!lab) return res.status(404).json({ message: "Laboratorio no encontrado" });

    const institution = await findInstitutionById(req.user.institutionId);
    const evaluation = evaluateClinicalCase({ patient, lab, settings: institution?.settings || {} });
    const created = await createOrders(evaluation.orders, {
      institutionId: req.user.institutionId,
      patientId: patient.id,
      labId: lab.id,
      createdBy: req.user.id,
      auditEvents: [makeAuditEvent(req.user, "generated", "Orden sugerida generada manualmente.")]
    });

    res.status(201).json({ orders: created, evaluation: { ...evaluation, orders: created } });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/edit", async (req, res) => {
  const order = await updateOrder(
    req.params.id,
    req.user.institutionId,
    { editedText: req.body.editedText, status: "edited" },
    makeAuditEvent(req.user, "edited", "Orden editada por el usuario.")
  );
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

router.post("/:id/copy", async (req, res) => {
  const order = await updateOrder(
    req.params.id,
    req.user.institutionId,
    { copiedAt: new Date().toISOString(), status: "copied" },
    makeAuditEvent(req.user, "copied", "Orden copiada al portapapeles.")
  );
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

router.post("/:id/mark-done", async (req, res) => {
  const order = await updateOrder(
    req.params.id,
    req.user.institutionId,
    { markedDoneAt: new Date().toISOString(), status: "done", comment: req.body.comment },
    makeAuditEvent(req.user, "marked_done", req.body.comment || "Orden marcada como realizada.")
  );
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

router.post("/:id/mark-not-done", async (req, res) => {
  const order = await updateOrder(
    req.params.id,
    req.user.institutionId,
    { markedNotDoneAt: new Date().toISOString(), status: "not_done", comment: req.body.comment },
    makeAuditEvent(req.user, "marked_not_done", req.body.comment || "Orden marcada como no realizada.")
  );
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

router.post("/:id/comment", async (req, res) => {
  const order = await updateOrder(
    req.params.id,
    req.user.institutionId,
    { comment: req.body.comment },
    makeAuditEvent(req.user, "commented", req.body.comment || "Comentario medico agregado.")
  );
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

export default router;
