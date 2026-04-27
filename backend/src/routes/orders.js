import express from "express";
import Order from "../models/Order.js";
import Patient from "../models/Patient.js";
import Lab from "../models/Lab.js";
import Institution from "../models/Institution.js";
import { authRequired } from "../middleware/auth.js";
import { evaluateClinicalCase } from "../clinical/engine.js";

const router = express.Router();
router.use(authRequired);

router.get("/patient/:patientId", async (req, res) => {
  const orders = await Order.find({ patientId: req.params.patientId, institutionId: req.user.institutionId }).sort({ createdAt: -1 }).lean();
  res.json(orders);
});

router.post("/generate", async (req, res, next) => {
  try {
    const { patientId, labId } = req.body;
    const patient = await Patient.findOne({ _id: patientId, institutionId: req.user.institutionId });
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    const lab = await Lab.findOne({ _id: labId, patientId, institutionId: req.user.institutionId });
    if (!lab) return res.status(404).json({ message: "Laboratorio no encontrado" });
    const institution = await Institution.findById(req.user.institutionId).lean();
    const evaluation = evaluateClinicalCase({ patient: patient.toObject(), lab: lab.toObject(), settings: institution?.settings || {} });
    const created = await Order.insertMany(
      evaluation.orders.map((order) => ({
        institutionId: req.user.institutionId,
        patientId,
        labId,
        createdBy: req.user._id,
        disorder: order.disorder,
        severity: order.severity,
        priority: order.priority,
        suggestedText: order.suggestedText,
        alerts: order.alerts || []
      }))
    );
    res.status(201).json({ orders: created, evaluation });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/edit", async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, institutionId: req.user.institutionId },
    { editedText: req.body.editedText },
    { new: true }
  );
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

router.post("/:id/copy", async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, institutionId: req.user.institutionId },
    { copiedAt: new Date() },
    { new: true }
  );
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

router.post("/:id/mark-done", async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, institutionId: req.user.institutionId },
    { markedDoneAt: new Date() },
    { new: true }
  );
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  res.json(order);
});

export default router;
