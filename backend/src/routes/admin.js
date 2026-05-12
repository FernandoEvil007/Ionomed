import express from "express";
import { adminRequired, authRequired } from "../middleware/auth.js";
import {
  createBackup,
  findInstitutionById,
  listInstitutionUsers,
  restoreBackup,
  updateInstitutionUser,
  updateInstitutionSettings
} from "../store.js";

const router = express.Router();
router.use(authRequired);

function backupPreview(backup) {
  if (!backup?.tables || typeof backup.tables !== "object") {
    throw new Error("Backup invalido");
  }
  const tables = backup.tables;
  const count = (table) => Array.isArray(tables[table]) ? tables[table].length : 0;
  const institutions = Array.isArray(tables.institutions)
    ? tables.institutions.slice(0, 5).map((item) => item.name).filter(Boolean)
    : [];
  return {
    app: backup.app || "Desconocida",
    version: backup.version ?? null,
    database: backup.database || "desconocida",
    createdAt: backup.createdAt || null,
    institutions,
    counts: {
      institutions: count("institutions"),
      users: count("users"),
      patients: count("patients"),
      labs: count("labs"),
      orders: count("orders")
    }
  };
}

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

router.get("/users", adminRequired, async (req, res, next) => {
  try {
    res.json(await listInstitutionUsers(req.user.institutionId));
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id", adminRequired, async (req, res, next) => {
  try {
    const accessRole = ["admin", "clinico"].includes(req.body?.accessRole) ? req.body.accessRole : undefined;
    const isActive = typeof req.body?.isActive === "boolean" ? req.body.isActive : undefined;
    const user = await updateInstitutionUser(req.params.id, req.user.institutionId, { accessRole, isActive });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
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

router.post("/backup/preview", adminRequired, async (req, res, next) => {
  try {
    const backup = req.body?.tables ? req.body : req.body?.backup;
    res.json({ preview: backupPreview(backup) });
  } catch (error) {
    next(error);
  }
});

router.post("/backup/restore", adminRequired, async (req, res, next) => {
  try {
    const backup = req.body?.tables ? req.body : req.body?.backup;
    if (req.body?.confirmRestore !== true) {
      return res.status(400).json({ message: "Debes confirmar la restauracion del backup antes de continuar." });
    }
    await restoreBackup(backup);
    res.json({ ok: true, message: "Backup restaurado correctamente" });
  } catch (error) {
    next(error);
  }
});

export default router;
