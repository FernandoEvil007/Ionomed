import express from "express";
import { authRequired } from "../middleware/auth.js";
import { evaluateClinicalCase } from "../clinical/engine.js";
import { findInstitutionById } from "../store.js";

const router = express.Router();
router.use(authRequired);

router.post("/evaluate", async (req, res, next) => {
  try {
    const institution = await findInstitutionById(req.user.institutionId);
    const evaluation = evaluateClinicalCase({
      patient: req.body.patient || {},
      lab: req.body.lab || {},
      settings: institution?.settings || {}
    });
    res.json(evaluation);
  } catch (error) {
    next(error);
  }
});

export default router;
