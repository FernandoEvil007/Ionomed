import express from "express";
import { z } from "zod";
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

const idSchema = z.union([z.string().min(1).max(64), z.number().int().positive()]);
const generateSchema = z.object({
  patientId: idSchema,
  labId: idSchema
});
const editSchema = z.object({
  editedText: z.string().trim().min(1).max(8000)
});
const commentSchema = z.object({
  comment: z.string().trim().max(1000).optional().default("")
});
const recalculateSchema = editSchema.extend({
  metadata: z.object({
    solution: z.string().trim().max(160).optional(),
    dailyChange: z.union([z.string().max(40), z.number()]).optional(),
    rate: z.union([z.string().max(40), z.number()]).optional()
  }).optional().default({})
});

router.get("/patient/:patientId", async (req, res) => {
  res.json(await listOrders(req.params.patientId, req.user.institutionId));
});

router.post("/generate", async (req, res, next) => {
  try {
    const { patientId, labId } = generateSchema.parse(req.body);
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

router.put("/:id/edit", async (req, res, next) => {
  try {
    const data = editSchema.parse(req.body);
    const order = await updateOrder(
      req.params.id,
      req.user.institutionId,
      { editedText: data.editedText, status: "edited" },
      makeAuditEvent(req.user, "edited", "Orden editada por el usuario.")
    );
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });
    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/recalculate", async (req, res, next) => {
  try {
    const data = recalculateSchema.parse(req.body);
    const metadata = data.metadata || {};
    const note = [
      "Orden recalculada desde selector de solucion.",
      metadata.solution ? `Solucion: ${metadata.solution}.` : "",
      metadata.dailyChange ? `Cambio objetivo: ${metadata.dailyChange} mEq/L/24h.` : "",
      metadata.rate ? `Velocidad: ${metadata.rate} mL/h.` : ""
    ].filter(Boolean).join(" ");
    const order = await updateOrder(
      req.params.id,
      req.user.institutionId,
      { editedText: data.editedText, status: "edited" },
      makeAuditEvent(req.user, "recalculated", note)
    );
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });
    res.json(order);
  } catch (error) {
    next(error);
  }
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

router.post("/:id/mark-done", async (req, res, next) => {
  try {
    const data = commentSchema.parse(req.body || {});
    const order = await updateOrder(
      req.params.id,
      req.user.institutionId,
      { markedDoneAt: new Date().toISOString(), status: "done", comment: data.comment },
      makeAuditEvent(req.user, "marked_done", data.comment || "Orden marcada como realizada.")
    );
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });
    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/mark-not-done", async (req, res, next) => {
  try {
    const data = commentSchema.parse(req.body || {});
    const order = await updateOrder(
      req.params.id,
      req.user.institutionId,
      { markedNotDoneAt: new Date().toISOString(), status: "not_done", comment: data.comment },
      makeAuditEvent(req.user, "marked_not_done", data.comment || "Orden marcada como no realizada.")
    );
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });
    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/comment", async (req, res, next) => {
  try {
    const data = commentSchema.parse(req.body || {});
    const order = await updateOrder(
      req.params.id,
      req.user.institutionId,
      { comment: data.comment },
      makeAuditEvent(req.user, "commented", data.comment || "Comentario medico agregado.")
    );
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });
    res.json(order);
  } catch (error) {
    next(error);
  }
});

export default router;
