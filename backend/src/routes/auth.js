import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { authRequired } from "../middleware/auth.js";
import {
  createInstitution,
  createUser,
  findInstitutionById,
  findInstitutionByName,
  findUserByEmail
} from "../store.js";

export const PROFESSIONAL_ROLES = [
  "estudiante_medicina",
  "interno",
  "residente",
  "fellow",
  "especialista",
  "subespecialista"
];

const router = express.Router();

const registerSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  documentId: z.string().optional(),
  serviceArea: z.string().optional(),
  password: z.string().min(6),
  professionalRole: z.enum(PROFESSIONAL_ROLES),
  institutionName: z.string().min(2),
  institutionIdentifier: z.string().optional(),
  institutionCity: z.string().optional()
});

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), institutionId: String(user.institutionId), accessRole: user.accessRole },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await findUserByEmail(data.email);
    if (existing) return res.status(409).json({ message: "Este correo ya esta registrado" });

    let institution = await findInstitutionByName(data.institutionName);
    const isFirstInstitutionUser = !institution;
    if (!institution) {
      institution = await createInstitution({
        name: data.institutionName,
        identifier: data.institutionIdentifier,
        city: data.institutionCity
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await createUser({
      institutionId: institution.id,
      fullName: data.fullName,
      email: data.email,
      documentId: data.documentId,
      serviceArea: data.serviceArea,
      professionalRole: data.professionalRole,
      accessRole: isFirstInstitutionUser ? "admin" : "clinico",
      passwordHash,
      acceptedClinicalTerms: true
    });

    res.status(201).json({ token: signToken(user), user: sanitizeUser(user), institution });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Credenciales invalidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Credenciales invalidas" });
    if (!user.isActive) return res.status(403).json({ message: "Usuario inactivo" });

    const institution = await findInstitutionById(user.institutionId);
    res.json({ token: signToken(user), user: sanitizeUser(user), institution });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authRequired, async (req, res) => {
  const institution = await findInstitutionById(req.user.institutionId);
  res.json({ user: sanitizeUser(req.user), institution });
});

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    documentId: user.documentId,
    serviceArea: user.serviceArea,
    accessRole: user.accessRole,
    professionalRole: user.professionalRole,
    institutionId: user.institutionId,
    acceptedClinicalTerms: user.acceptedClinicalTerms
  };
}

export default router;
