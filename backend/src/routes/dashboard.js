import express from "express";
import { authRequired } from "../middleware/auth.js";
import { clinicalDashboard } from "../store.js";

const router = express.Router();
router.use(authRequired);

router.get("/", async (req, res, next) => {
  try {
    res.json(await clinicalDashboard(req.user.institutionId));
  } catch (error) {
    next(error);
  }
});

export default router;
