import express from "express";
import { z } from "zod";
import Patient from "../models/Patient.js";
import Lab from "../models/Lab.js";
import { authRequired } from "../middleware/auth.js";
import { evaluateClinicalCase } from "../clinical/engine.js";
import Institution from "../models/Institution.js";

const router = express.Router();
router.use(authRequired);

const patientSchema = z.object({
  localIdentifier: z.string().optional(),
  nameOrCode: z.string().min(1),
  age: z.coerce.number().min(0).max(120),
  sex: z.enum(["male", "female"]),
  weightKg: z.coerce.number().min(1),
  heightCm: z.coerce.number().optional().nullable(),
  clinicalArea: z.enum(["urgencias", "hospitalizacion", "uci", "ambulatorio"]).default("hospitalizacion"),
  location: z.string().optional(),
  volumeStatus: z.enum(["hipovolemico", "euvolemico", "hipervolemico", "incierto"]).default("incierto"),
  oralRouteAvailable: z.boolean().default(true),
  venousAccess: z.enum(["periferico", "central", "ninguno", "desconocido"]).default("desconocido"),
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
  const patients = await Patient.find({ institutionId: req.user.institutionId, isActive: true }).sort({ updatedAt: -1 }).lean();
  res.json(patients);
});

router.post("/", async (req, res, next) => {
  try {
    const data = patientSchema.parse(req.body);
    const patient = await Patient.create({
      ...data,
      institutionId: req.user.institutionId,
      createdBy: req.user._id
    });
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, institutionId: req.user.institutionId }).lean();
  if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
  const labs = await Lab.find({ patientId: patient._id, institutionId: req.user.institutionId }).sort({ collectedAt: -1 }).lean();
  res.json({ patient, labs });
});

router.put("/:id", async (req, res, next) => {
  try {
    const data = patientSchema.partial().parse(req.body);
    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user.institutionId },
      data,
      { new: true }
    );
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    res.json(patient);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/labs", async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, institutionId: req.user.institutionId });
    if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
    const data = labSchema.parse(req.body);
    const lab = await Lab.create({
      ...data,
      institutionId: req.user.institutionId,
      patientId: patient._id,
      createdBy: req.user._id
    });
    const institution = await Institution.findById(req.user.institutionId).lean();
    const evaluation = evaluateClinicalCase({ patient: patient.toObject(), lab: lab.toObject(), settings: institution?.settings || {} });
    res.status(201).json({ lab, evaluation });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/close", async (req, res) => {
  const patient = await Patient.findOneAndUpdate(
    { _id: req.params.id, institutionId: req.user.institutionId },
    { isActive: false },
    { new: true }
  );
  if (!patient) return res.status(404).json({ message: "Paciente no encontrado" });
  res.json(patient);
});

export default router;
