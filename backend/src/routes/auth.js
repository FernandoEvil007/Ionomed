import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User, { PROFESSIONAL_ROLES } from "../models/User.js";
import Institution from "../models/Institution.js";
import { authRequired } from "../middleware/auth.js";

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
    { sub: user._id.toString(), institutionId: user.institutionId.toString(), accessRole: user.accessRole },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Este correo ya está registrado" });

    let institution = await Institution.findOne({ name: data.institutionName.trim() });
    const isFirstInstitutionUser = !institution;
    if (!institution) {
      institution = await Institution.create({
        name: data.institutionName.trim(),
        identifier: data.institutionIdentifier,
        city: data.institutionCity
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      institutionId: institution._id,
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      documentId: data.documentId,
      serviceArea: data.serviceArea,
      professionalRole: data.professionalRole,
      accessRole: isFirstInstitutionUser ? "admin" : "clinico",
      passwordHash,
      acceptedClinicalTerms: true
    });

    const token = signToken(user);
    res.status(201).json({ token, user: sanitizeUser(user), institution });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase() });
    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });
    if (!user.isActive) return res.status(403).json({ message: "Usuario inactivo" });

    const institution = await Institution.findById(user.institutionId).lean();
    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user), institution });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authRequired, async (req, res) => {
  const institution = await Institution.findById(req.user.institutionId).lean();
  res.json({ user: sanitizeUser(req.user), institution });
});

function sanitizeUser(user) {
  return {
    id: user._id,
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
