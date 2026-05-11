import express from "express";
import { authRequired } from "../middleware/auth.js";
import { evaluateClinicalCase } from "../clinical/engine.js";
import { evaluationPatientSchema, labSchema } from "../clinical/inputSchemas.js";
import { findInstitutionById } from "../store.js";

const router = express.Router();
router.use(authRequired);

router.post("/evaluate", async (req, res, next) => {
  try {
    const patient = evaluationPatientSchema.parse(req.body.patient || {});
    const lab = labSchema.parse(req.body.lab || {});
    const institution = await findInstitutionById(req.user.institutionId);
    const evaluation = evaluateClinicalCase({
      patient,
      lab,
      settings: institution?.settings || {}
    });
    res.json(evaluation);
  } catch (error) {
    next(error);
  }
});

export default router;
