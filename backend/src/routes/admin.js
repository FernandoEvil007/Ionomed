import express from "express";
import { adminRequired, authRequired } from "../middleware/auth.js";
import {
  createBackup,
  findInstitutionById,
  restoreBackup,
  updateInstitutionSettings
} from "../store.js";

const router = express.Router();
router.use(authRequired);

router.get("/settings", async (req, res) => {
  const institution = await findInstitutionById(req.user.institutionId);
  res.json({ settings: institution?.settings || {}, institution });
});

router.put("/settings", adminRequired, async (req, res, next) => {
  try {
    const institution = await updateInstitutionSettings(req.user.institutionId, req.body.settings || req.body);
    if (!institution) return res.status(404).json({ message: "Institucion no encontrada" });
    res.json({ settings: institution.settings, institution });
  } catch (error) {
    next(error);
  }
});

router.get("/backup", adminRequired, async (_req, res, next) => {
  try {
    const backup = await createBackup();
    const filename = `ionomed-backup-${backup.createdAt.slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    next(error);
  }
});

router.post("/backup/restore", adminRequired, async (req, res, next) => {
  try {
    const backup = req.body?.tables ? req.body : req.body?.backup;
    await restoreBackup(backup);
    res.json({ ok: true, message: "Backup restaurado correctamente" });
  } catch (error) {
    next(error);
  }
});

export default router;
