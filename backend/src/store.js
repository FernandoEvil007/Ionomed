import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import sqlite3 from "sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, "..", process.env.DB_PATH)
  : path.join(__dirname, "..", "ionomed.sqlite");

const db = new sqlite3.Database(DB_PATH, (error) => {
  if (error) {
    console.error("Error abriendo SQLite:", error.message);
  } else {
    console.log(`IonoMed SQLite conectado: ${DB_PATH}`);
  }
});

db.serialize(() => {
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA foreign_keys = ON");
});

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows || [])));
  });
}

function text(value) {
  return String(value ?? "").trim();
}

function json(value, fallback) {
  if (value === undefined) return JSON.stringify(fallback);
  return JSON.stringify(value ?? fallback);
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function bool(value) {
  return value ? 1 : 0;
}

function publicId(row) {
  return row ? { ...row, _id: String(row.id) } : null;
}

export function normalizeInstitution(row) {
  if (!row) return null;
  return {
    ...publicId(row),
    settings: parseJson(row.settings, defaultSettings())
  };
}

export function normalizeUser(row) {
  if (!row) return null;
  return {
    ...publicId(row),
    institutionId: String(row.institutionId),
    acceptedClinicalTerms: Boolean(row.acceptedClinicalTerms),
    isActive: Boolean(row.isActive)
  };
}

export function normalizePatient(row) {
  if (!row) return null;
  return {
    ...publicId(row),
    institutionId: String(row.institutionId),
    createdBy: String(row.createdBy),
    oralRouteAvailable: Boolean(row.oralRouteAvailable),
    isActive: Boolean(row.isActive),
    comorbidities: parseJson(row.comorbidities, []),
    medications: parseJson(row.medications, []),
    neurologicSymptoms: parseJson(row.neurologicSymptoms, []),
    cardiovascularSymptoms: parseJson(row.cardiovascularSymptoms, [])
  };
}

export function normalizeLab(row) {
  if (!row) return null;
  return {
    ...publicId(row),
    institutionId: String(row.institutionId),
    patientId: String(row.patientId),
    createdBy: String(row.createdBy)
  };
}

export function normalizeOrder(row) {
  if (!row) return null;
  return {
    ...publicId(row),
    institutionId: String(row.institutionId),
    patientId: String(row.patientId),
    labId: row.labId ? String(row.labId) : null,
    createdBy: String(row.createdBy),
    alerts: parseJson(row.alerts, []),
    auditEvents: parseJson(row.auditEvents, []),
    safety: parseJson(row.safety, null),
    missingData: parseJson(row.missingData, []),
    controls: parseJson(row.controls, [])
  };
}

export function defaultSettings() {
  return {
    sodiumGlucoseCorrectionFactor: 1.6,
    maxSodiumCorrection24hStandard: 10,
    maxSodiumCorrection24hHighRisk: 8,
    defaultHypercalcemiaHydrationRate: 150,
    defaultOverloadHydrationRate: 75,
    customSolutions: []
  };
}

export async function initStore() {
  await run("PRAGMA foreign_keys = ON");
  await run(`
    CREATE TABLE IF NOT EXISTS institutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      identifier TEXT,
      city TEXT,
      isActive INTEGER DEFAULT 1,
      settings TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institutionId INTEGER NOT NULL,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      documentId TEXT,
      serviceArea TEXT,
      accessRole TEXT DEFAULT 'clinico',
      professionalRole TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      securityQuestion TEXT,
      securityAnswerHash TEXT,
      acceptedClinicalTerms INTEGER DEFAULT 1,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT,
      FOREIGN KEY(institutionId) REFERENCES institutions(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institutionId INTEGER NOT NULL,
      createdBy INTEGER NOT NULL,
      localIdentifier TEXT,
      nameOrCode TEXT NOT NULL,
      age REAL,
      sex TEXT NOT NULL,
      weightKg REAL,
      heightCm REAL,
      clinicalArea TEXT DEFAULT 'hospitalizacion',
      location TEXT,
      volumeStatus TEXT DEFAULT 'incierto',
      oralRouteAvailable INTEGER DEFAULT 1,
      venousAccess TEXT DEFAULT 'desconocido',
      urineOutputMlKgH REAL,
      comorbidities TEXT DEFAULT '[]',
      medications TEXT DEFAULT '[]',
      neurologicSymptoms TEXT DEFAULT '[]',
      cardiovascularSymptoms TEXT DEFAULT '[]',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT,
      FOREIGN KEY(institutionId) REFERENCES institutions(id),
      FOREIGN KEY(createdBy) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS labs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institutionId INTEGER NOT NULL,
      patientId INTEGER NOT NULL,
      createdBy INTEGER NOT NULL,
      collectedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      sodium REAL,
      potassium REAL,
      chloride REAL,
      magnesium REAL,
      phosphorus REAL,
      calciumTotal REAL,
      calciumIonized REAL,
      albumin REAL,
      glucose REAL,
      creatinine REAL,
      urea REAL,
      bun REAL,
      ph REAL,
      bicarbonate REAL,
      serumOsmolality REAL,
      urineOsmolality REAL,
      urineSodium REAL,
      urinePotassium REAL,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT,
      FOREIGN KEY(institutionId) REFERENCES institutions(id),
      FOREIGN KEY(patientId) REFERENCES patients(id),
      FOREIGN KEY(createdBy) REFERENCES users(id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institutionId INTEGER NOT NULL,
      patientId INTEGER NOT NULL,
      labId INTEGER,
      createdBy INTEGER NOT NULL,
      disorder TEXT NOT NULL,
      severity TEXT,
      priority TEXT,
      suggestedText TEXT NOT NULL,
      editedText TEXT,
      alerts TEXT DEFAULT '[]',
      status TEXT DEFAULT 'suggested',
      comment TEXT,
      copiedAt TEXT,
      markedDoneAt TEXT,
      markedNotDoneAt TEXT,
      auditEvents TEXT DEFAULT '[]',
      safety TEXT,
      missingData TEXT DEFAULT '[]',
      controls TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT,
      FOREIGN KEY(institutionId) REFERENCES institutions(id),
      FOREIGN KEY(patientId) REFERENCES patients(id),
      FOREIGN KEY(labId) REFERENCES labs(id),
      FOREIGN KEY(createdBy) REFERENCES users(id)
    )
  `);
  await ensurePatientOptionalFields();
  await ensureOrderClinicalColumns();
  await ensureUserRecoveryColumns();
}

async function ensurePatientOptionalFields() {
  const columns = await all("PRAGMA table_info(patients)");
  const ageColumn = columns.find((column) => column.name === "age");
  const weightColumn = columns.find((column) => column.name === "weightKg");
  if (!ageColumn?.notnull && !weightColumn?.notnull) return;

  await run("PRAGMA foreign_keys = OFF");
  await run("BEGIN TRANSACTION");
  try {
    await run(`
      CREATE TABLE patients_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        institutionId INTEGER NOT NULL,
        createdBy INTEGER NOT NULL,
        localIdentifier TEXT,
        nameOrCode TEXT NOT NULL,
        age REAL,
        sex TEXT NOT NULL,
        weightKg REAL,
        heightCm REAL,
        clinicalArea TEXT DEFAULT 'hospitalizacion',
        location TEXT,
        volumeStatus TEXT DEFAULT 'incierto',
        oralRouteAvailable INTEGER DEFAULT 1,
        venousAccess TEXT DEFAULT 'desconocido',
        urineOutputMlKgH REAL,
        comorbidities TEXT DEFAULT '[]',
        medications TEXT DEFAULT '[]',
        neurologicSymptoms TEXT DEFAULT '[]',
        cardiovascularSymptoms TEXT DEFAULT '[]',
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT,
        FOREIGN KEY(institutionId) REFERENCES institutions(id),
        FOREIGN KEY(createdBy) REFERENCES users(id)
      )
    `);
    await run(`
      INSERT INTO patients_new (
        id, institutionId, createdBy, localIdentifier, nameOrCode, age, sex, weightKg,
        heightCm, clinicalArea, location, volumeStatus, oralRouteAvailable, venousAccess,
        urineOutputMlKgH, comorbidities, medications, neurologicSymptoms,
        cardiovascularSymptoms, isActive, createdAt, updatedAt
      )
      SELECT
        id, institutionId, createdBy, localIdentifier, nameOrCode, age, sex, weightKg,
        heightCm, clinicalArea, location, volumeStatus, oralRouteAvailable, venousAccess,
        urineOutputMlKgH, comorbidities, medications, neurologicSymptoms,
        cardiovascularSymptoms, isActive, createdAt, updatedAt
      FROM patients
    `);
    await run("DROP TABLE patients");
    await run("ALTER TABLE patients_new RENAME TO patients");
    await run("COMMIT");
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  } finally {
    await run("PRAGMA foreign_keys = ON");
  }
}

async function ensureOrderClinicalColumns() {
  const columns = new Set((await all("PRAGMA table_info(orders)")).map((column) => column.name));
  if (!columns.has("safety")) await run("ALTER TABLE orders ADD COLUMN safety TEXT");
  if (!columns.has("missingData")) await run("ALTER TABLE orders ADD COLUMN missingData TEXT DEFAULT '[]'");
  if (!columns.has("controls")) await run("ALTER TABLE orders ADD COLUMN controls TEXT DEFAULT '[]'");
}

async function ensureUserRecoveryColumns() {
  const columns = new Set((await all("PRAGMA table_info(users)")).map((column) => column.name));
  if (!columns.has("securityQuestion")) await run("ALTER TABLE users ADD COLUMN securityQuestion TEXT");
  if (!columns.has("securityAnswerHash")) await run("ALTER TABLE users ADD COLUMN securityAnswerHash TEXT");
}

export async function findInstitutionByName(name) {
  return normalizeInstitution(await get("SELECT * FROM institutions WHERE name = ?", [text(name)]));
}

export async function findInstitutionById(id) {
  return normalizeInstitution(await get("SELECT * FROM institutions WHERE id = ?", [id]));
}

export async function createInstitution(data) {
  const result = await run(
    `INSERT INTO institutions (name, identifier, city, settings) VALUES (?, ?, ?, ?)`,
    [text(data.name), text(data.identifier), text(data.city), JSON.stringify(defaultSettings())]
  );
  return findInstitutionById(result.id);
}

export async function findUserByEmail(email) {
  return normalizeUser(await get("SELECT * FROM users WHERE lower(email) = lower(?)", [text(email)]));
}

export async function findUserById(id) {
  return normalizeUser(await get("SELECT * FROM users WHERE id = ?", [id]));
}

export async function createUser(data) {
  const result = await run(
    `INSERT INTO users (
      institutionId, fullName, email, documentId, serviceArea, accessRole,
      professionalRole, passwordHash, securityQuestion, securityAnswerHash,
      acceptedClinicalTerms, isActive
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.institutionId,
      text(data.fullName),
      text(data.email).toLowerCase(),
      text(data.documentId),
      text(data.serviceArea),
      data.accessRole || "clinico",
      data.professionalRole,
      data.passwordHash,
      text(data.securityQuestion),
      data.securityAnswerHash || null,
      bool(data.acceptedClinicalTerms ?? true),
      bool(data.isActive ?? true)
    ]
  );
  return findUserById(result.id);
}

export async function updateUserPassword(userId, passwordHash) {
  await run("UPDATE users SET passwordHash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?", [passwordHash, userId]);
  return findUserById(userId);
}

export async function listPatients(institutionId) {
  const rows = await all(
    "SELECT * FROM patients WHERE institutionId = ? AND isActive = 1 ORDER BY datetime(COALESCE(updatedAt, createdAt)) DESC, id DESC",
    [institutionId]
  );
  return rows.map(normalizePatient);
}

export async function findPatientById(id, institutionId) {
  return normalizePatient(await get("SELECT * FROM patients WHERE id = ? AND institutionId = ?", [id, institutionId]));
}

export async function createPatient(data) {
  const result = await run(
    `INSERT INTO patients (
      institutionId, createdBy, localIdentifier, nameOrCode, age, sex, weightKg,
      heightCm, clinicalArea, location, volumeStatus, oralRouteAvailable,
      venousAccess, urineOutputMlKgH, comorbidities, medications,
      neurologicSymptoms, cardiovascularSymptoms, isActive
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      data.institutionId,
      data.createdBy,
      text(data.localIdentifier),
      text(data.nameOrCode),
      data.age ?? null,
      data.sex,
      data.weightKg ?? null,
      data.heightCm ?? null,
      data.clinicalArea,
      text(data.location),
      data.volumeStatus,
      bool(data.oralRouteAvailable),
      data.venousAccess,
      data.urineOutputMlKgH ?? null,
      json(data.comorbidities, []),
      json(data.medications, []),
      json(data.neurologicSymptoms, []),
      json(data.cardiovascularSymptoms, [])
    ]
  );
  return findPatientById(result.id, data.institutionId);
}

export async function updatePatient(id, institutionId, data) {
  const current = await findPatientById(id, institutionId);
  if (!current) return null;
  const next = { ...current, ...data };
  await run(
    `UPDATE patients SET
      localIdentifier = ?, nameOrCode = ?, age = ?, sex = ?, weightKg = ?,
      heightCm = ?, clinicalArea = ?, location = ?, volumeStatus = ?,
      oralRouteAvailable = ?, venousAccess = ?, urineOutputMlKgH = ?,
      comorbidities = ?, medications = ?, neurologicSymptoms = ?,
      cardiovascularSymptoms = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ? AND institutionId = ?`,
    [
      text(next.localIdentifier),
      text(next.nameOrCode),
      next.age ?? null,
      next.sex,
      next.weightKg ?? null,
      next.heightCm ?? null,
      next.clinicalArea,
      text(next.location),
      next.volumeStatus,
      bool(next.oralRouteAvailable),
      next.venousAccess,
      next.urineOutputMlKgH ?? null,
      json(next.comorbidities, []),
      json(next.medications, []),
      json(next.neurologicSymptoms, []),
      json(next.cardiovascularSymptoms, []),
      id,
      institutionId
    ]
  );
  return findPatientById(id, institutionId);
}

export async function closePatient(id, institutionId) {
  await run(
    "UPDATE patients SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND institutionId = ?",
    [id, institutionId]
  );
  await run(
    `UPDATE orders SET
      status = 'not_done',
      comment = COALESCE(NULLIF(comment, ''), 'Paciente eliminado de la lista activa.'),
      updatedAt = CURRENT_TIMESTAMP
    WHERE patientId = ?
      AND institutionId = ?
      AND status NOT IN ('done', 'not_done')`,
    [id, institutionId]
  );
  return findPatientById(id, institutionId);
}

export async function createLab(data) {
  const result = await run(
    `INSERT INTO labs (
      institutionId, patientId, createdBy, collectedAt, sodium, potassium,
      chloride, magnesium, phosphorus, calciumTotal, calciumIonized, albumin,
      glucose, creatinine, urea, bun, ph, bicarbonate, serumOsmolality,
      urineOsmolality, urineSodium, urinePotassium, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.institutionId,
      data.patientId,
      data.createdBy,
      data.collectedAt ? new Date(data.collectedAt).toISOString() : new Date().toISOString(),
      data.sodium ?? null,
      data.potassium ?? null,
      data.chloride ?? null,
      data.magnesium ?? null,
      data.phosphorus ?? null,
      data.calciumTotal ?? null,
      data.calciumIonized ?? null,
      data.albumin ?? null,
      data.glucose ?? null,
      data.creatinine ?? null,
      data.urea ?? null,
      data.bun ?? null,
      data.ph ?? null,
      data.bicarbonate ?? null,
      data.serumOsmolality ?? null,
      data.urineOsmolality ?? null,
      data.urineSodium ?? null,
      data.urinePotassium ?? null,
      text(data.notes)
    ]
  );
  return normalizeLab(await get("SELECT * FROM labs WHERE id = ?", [result.id]));
}

export async function listLabs(patientId, institutionId) {
  const rows = await all(
    "SELECT * FROM labs WHERE patientId = ? AND institutionId = ? ORDER BY datetime(collectedAt) DESC, id DESC",
    [patientId, institutionId]
  );
  return rows.map(normalizeLab);
}

export async function latestLabBefore(patientId, institutionId, labId) {
  return normalizeLab(await get(
    `SELECT * FROM labs
     WHERE patientId = ? AND institutionId = ? AND id != ?
     ORDER BY datetime(collectedAt) DESC, id DESC
     LIMIT 1`,
    [patientId, institutionId, labId]
  ));
}

export async function findLabById(id, patientId, institutionId) {
  return normalizeLab(await get(
    "SELECT * FROM labs WHERE id = ? AND patientId = ? AND institutionId = ?",
    [id, patientId, institutionId]
  ));
}

export async function deleteLab(id, patientId, institutionId) {
  const lab = await findLabById(id, patientId, institutionId);
  if (!lab) return null;
  await run(
    "DELETE FROM orders WHERE labId = ? AND patientId = ? AND institutionId = ?",
    [id, patientId, institutionId]
  );
  await run(
    "DELETE FROM labs WHERE id = ? AND patientId = ? AND institutionId = ?",
    [id, patientId, institutionId]
  );
  return lab;
}

export function makeAuditEvent(user, type, note = "") {
  return {
    type,
    userId: String(user.id),
    professionalRole: user.professionalRole,
    at: new Date().toISOString(),
    note
  };
}

export async function createOrders(orders, context) {
  const created = [];
  for (const order of orders) {
    const result = await run(
      `INSERT INTO orders (
        institutionId, patientId, labId, createdBy, disorder, severity,
        priority, suggestedText, alerts, auditEvents, safety, missingData, controls
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        context.institutionId,
        context.patientId,
        context.labId ?? null,
        context.createdBy,
        order.disorder,
        order.severity,
        order.priority,
        order.suggestedText,
        json(order.alerts, []),
        json(context.auditEvents, []),
        json(order.safety, null),
        json(order.missingData, []),
        json(order.controls, [])
      ]
    );
    created.push(normalizeOrder(await get("SELECT * FROM orders WHERE id = ?", [result.id])));
  }
  return created;
}

export async function listOrders(patientId, institutionId) {
  const rows = await all(
    "SELECT * FROM orders WHERE patientId = ? AND institutionId = ? ORDER BY datetime(createdAt) DESC, id DESC",
    [patientId, institutionId]
  );
  return rows.map(normalizeOrder);
}

export async function findOrderById(id, institutionId) {
  return normalizeOrder(await get("SELECT * FROM orders WHERE id = ? AND institutionId = ?", [id, institutionId]));
}

export async function updateOrder(id, institutionId, patch, auditEvent) {
  const current = await findOrderById(id, institutionId);
  if (!current) return null;
  const nextAudit = [...(current.auditEvents || []), auditEvent].filter(Boolean);
  await run(
    `UPDATE orders SET
      editedText = ?, status = ?, comment = ?, copiedAt = ?, markedDoneAt = ?,
      markedNotDoneAt = ?, auditEvents = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ? AND institutionId = ?`,
    [
      patch.editedText ?? current.editedText ?? null,
      patch.status ?? current.status,
      patch.comment ?? current.comment ?? null,
      patch.copiedAt ?? current.copiedAt ?? null,
      patch.markedDoneAt ?? current.markedDoneAt ?? null,
      patch.markedNotDoneAt ?? current.markedNotDoneAt ?? null,
      json(nextAudit, []),
      id,
      institutionId
    ]
  );
  return findOrderById(id, institutionId);
}

async function tableColumns(table) {
  const rows = await all(`PRAGMA table_info(${table})`);
  return rows.map((row) => row.name);
}

const BACKUP_TABLES = ["institutions", "users", "patients", "labs", "orders"];

export async function createBackup() {
  const tables = {};
  for (const table of BACKUP_TABLES) {
    tables[table] = await all(`SELECT * FROM ${table} ORDER BY id ASC`);
  }

  return {
    app: "IonoMed",
    version: 1,
    createdAt: new Date().toISOString(),
    database: "sqlite",
    tables
  };
}

export async function restoreBackup(backup) {
  if (!backup?.tables || typeof backup.tables !== "object") {
    throw new Error("Backup invalido");
  }

  const snapshotDir = path.join(path.dirname(DB_PATH), "backups");
  await fs.promises.mkdir(snapshotDir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const snapshot = path.join(snapshotDir, `pre-restore-${Date.now()}.sqlite`);
    await fs.promises.copyFile(DB_PATH, snapshot);
  }

  await run("PRAGMA foreign_keys = OFF");
  await run("BEGIN TRANSACTION");

  try {
    for (const table of [...BACKUP_TABLES].reverse()) {
      await run(`DELETE FROM ${table}`);
    }

    for (const table of BACKUP_TABLES) {
      const rows = Array.isArray(backup.tables[table]) ? backup.tables[table] : [];
      const allowed = new Set(await tableColumns(table));

      for (const row of rows) {
        const columns = Object.keys(row).filter((column) => allowed.has(column));
        if (!columns.length) continue;
        const placeholders = columns.map(() => "?").join(", ");
        await run(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
          columns.map((column) => row[column])
        );
      }
    }

    await run("COMMIT");
    await run("PRAGMA foreign_keys = ON");
    return { ok: true };
  } catch (error) {
    await run("ROLLBACK");
    await run("PRAGMA foreign_keys = ON");
    throw error;
  }
}

export async function updateInstitutionSettings(institutionId, settings) {
  const institution = await findInstitutionById(institutionId);
  if (!institution) return null;
  const nextSettings = { ...defaultSettings(), ...(institution.settings || {}), ...(settings || {}) };
  await run(
    "UPDATE institutions SET settings = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
    [JSON.stringify(nextSettings), institutionId]
  );
  return findInstitutionById(institutionId);
}

function priorityWeight(priority) {
  return { critica: 1, alta: 2, moderada: 3, leve: 4, baja: 5 }[priority] || 6;
}

function addHours(dateValue, hours) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function suggestedControlHours(order) {
  const textValue = `${order.disorder || ""} ${order.suggestedText || ""}`.toLowerCase();
  const disorder = String(order.disorder || "").toLowerCase();
  const potassium = Number(order.safety?.potassium);
  const sodium = Number(order.safety?.sodiumCorrected ?? order.safety?.sodiumMeasured);

  if (disorder.includes("hipokalemia") && Number.isFinite(potassium)) {
    return potassium > 2.5 ? 12 : 6;
  }
  if (disorder.includes("hiponatremia") && Number.isFinite(sodium) && sodium < 129) return 6;
  if (disorder.includes("hipernatremia")) return 6;

  if (textValue.includes("potasio de control en 1 hora")) return 1;
  if (textValue.includes("2 a 4 horas")) return 4;
  if (textValue.includes("cada 6 horas") || textValue.includes("4 a 6 horas")) return 6;
  if (textValue.includes("cada 12 horas")) return 12;
  if (textValue.includes("6 a 12 horas")) return 12;
  if (textValue.includes("24 horas")) return 24;
  if (order.priority === "critica") return 2;
  if (order.priority === "alta") return 6;
  return 24;
}

function dashboardControlValue(order, latestLab = null) {
  const disorder = String(order.disorder || "").toLowerCase();
  const safety = order.safety || {};
  const value = (candidate) => candidate !== undefined && candidate !== null && candidate !== "" && Number.isFinite(Number(candidate));

  if (disorder.includes("natremia") && value(safety.sodiumCorrected ?? safety.sodiumMeasured)) {
    return `Na ${safety.sodiumCorrected ?? safety.sodiumMeasured}`;
  }
  if (disorder.includes("natremia") && value(latestLab?.sodium)) return `Na ${latestLab.sodium}`;
  if (disorder.includes("kalemia") && value(safety.potassium)) return `K ${safety.potassium}`;
  if (disorder.includes("kalemia") && value(latestLab?.potassium)) return `K ${latestLab.potassium}`;
  if (disorder.includes("magnes") && value(safety.magnesium)) return `Mg ${safety.magnesium}`;
  if (disorder.includes("magnes") && value(latestLab?.magnesium)) return `Mg ${latestLab.magnesium}`;
  if (disorder.includes("fosf") && value(safety.phosphorus)) return `P ${safety.phosphorus}`;
  if (disorder.includes("fosf") && value(latestLab?.phosphorus)) return `P ${latestLab.phosphorus}`;
  if (disorder.includes("calcemia") && value(safety.calcium ?? safety.calciumCorrected ?? safety.calciumTotal)) {
    return `Ca ${safety.calcium ?? safety.calciumCorrected ?? safety.calciumTotal}`;
  }
  if (disorder.includes("calcemia") && value(latestLab?.calciumIonized ?? latestLab?.calciumTotal)) return `Ca ${latestLab.calciumIonized ?? latestLab.calciumTotal}`;
  return "";
}

export async function clinicalDashboard(institutionId) {
  const [patients, orderRows, labRows] = await Promise.all([
    listPatients(institutionId),
    all("SELECT * FROM orders WHERE institutionId = ? ORDER BY datetime(createdAt) DESC, id DESC LIMIT 100", [institutionId]),
    all("SELECT * FROM labs WHERE institutionId = ? ORDER BY datetime(collectedAt) DESC, id DESC LIMIT 100", [institutionId])
  ]);

  const orders = orderRows.map(normalizeOrder);
  const labs = labRows.map(normalizeLab);
  const patientById = new Map(patients.map((patient) => [String(patient.id), patient]));
  const latestLabByPatient = new Map();

  for (const lab of labs) {
    if (!latestLabByPatient.has(String(lab.patientId))) {
      latestLabByPatient.set(String(lab.patientId), lab);
    }
  }

  const activeOrders = orders.filter((order) => {
    const patientIsActive = patientById.has(String(order.patientId));
    return patientIsActive && !["done", "not_done"].includes(order.status);
  });
  const criticalOrders = activeOrders.filter((order) => ["critica", "alta"].includes(order.priority));
  const criticalOrdersByPatient = [];
  const seenCriticalPatients = new Set();
  for (const order of [...criticalOrders].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))) {
    const patientKey = String(order.patientId);
    if (seenCriticalPatients.has(patientKey)) continue;
    seenCriticalPatients.add(patientKey);
    criticalOrdersByPatient.push(order);
  }
  const now = Date.now();
  const controls = activeOrders
    .map((order) => {
      const patient = patientById.get(String(order.patientId));
      const latestLab = latestLabByPatient.get(String(order.patientId));
      const baseDate = order.createdAt || order.updatedAt;
      const dueAt = addHours(baseDate, suggestedControlHours(order));
      return {
        orderId: order._id,
        patientId: order.patientId,
        patientName: patient?.nameOrCode || "Paciente",
        disorder: order.disorder,
        controlValue: dashboardControlValue(order, latestLab),
        priority: order.priority,
        status: order.status,
        dueAt,
        overdue: dueAt ? new Date(dueAt).getTime() < now : false
      };
    })
    .filter((item) => item.dueAt)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 12);

  const patientSummaries = patients
    .map((patient) => {
      const patientOrders = activeOrders.filter((order) => String(order.patientId) === String(patient.id));
      patientOrders.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
      return {
        ...patient,
        latestLab: latestLabByPatient.get(String(patient.id)) || null,
        topOrder: patientOrders[0] || null,
        activeOrderCount: patientOrders.length,
        riskPriority: patientOrders[0]?.priority || "baja"
      };
    })
    .sort((a, b) => priorityWeight(a.riskPriority) - priorityWeight(b.riskPriority))
    .slice(0, 20);

  return {
    counts: {
      activePatients: patients.length,
      criticalAlerts: criticalOrdersByPatient.filter((order) => order.priority === "critica").length,
      highAlerts: criticalOrdersByPatient.length,
      overdueControls: controls.filter((control) => control.overdue).length,
      pendingOrders: activeOrders.length
    },
    criticalAlerts: criticalOrdersByPatient.slice(0, 8).map((order) => ({
      orderId: order._id,
      patientId: order.patientId,
      patientName: patientById.get(String(order.patientId))?.nameOrCode || "Paciente",
      disorder: order.disorder,
      controlValue: dashboardControlValue(order, latestLabByPatient.get(String(order.patientId))),
      severity: order.severity,
      priority: order.priority,
      alerts: order.alerts || [],
      createdAt: order.createdAt
    })),
    controls,
    patients: patientSummaries
  };
}

export { DB_PATH };
