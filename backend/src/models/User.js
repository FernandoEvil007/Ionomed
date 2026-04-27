import mongoose from "mongoose";

export const PROFESSIONAL_ROLES = [
  "estudiante_medicina",
  "interno",
  "residente",
  "fellow",
  "especialista",
  "subespecialista"
];

export const ACCESS_ROLES = ["admin", "clinico", "solo_lectura"];

const UserSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    documentId: { type: String, trim: true },
    serviceArea: { type: String, trim: true },
    accessRole: { type: String, enum: ACCESS_ROLES, default: "clinico" },
    professionalRole: { type: String, enum: PROFESSIONAL_ROLES, required: true },
    passwordHash: { type: String, required: true },
    acceptedClinicalTerms: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
