import express from "express";
import { authRequired } from "../middleware/auth.js";
import Institution from "../models/Institution.js";
import { evaluateClinicalCase } from "../clinical/engine.js";

const router = express.Router();
router.use(authRequired);

router.post("/evaluate", async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.user.institutionId).lean();
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
