import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    localIdentifier: { type: String, trim: true },
    nameOrCode: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 120 },
    sex: { type: String, enum: ["male", "female"], required: true },
    weightKg: { type: Number, required: true, min: 1 },
    heightCm: { type: Number, min: 30 },
    clinicalArea: { type: String, enum: ["urgencias", "hospitalizacion", "uci", "ambulatorio"], default: "hospitalizacion" },
    location: { type: String, trim: true },
    volumeStatus: { type: String, enum: ["hipovolemico", "euvolemico", "hipervolemico", "incierto"], default: "incierto" },
    oralRouteAvailable: { type: Boolean, default: true },
    venousAccess: { type: String, enum: ["periferico", "central", "ninguno", "desconocido"], default: "desconocido" },
    urineOutputMlKgH: { type: Number, min: 0 },
    comorbidities: [{ type: String }],
    medications: [{ type: String }],
    neurologicSymptoms: [{ type: String }],
    cardiovascularSymptoms: [{ type: String }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Patient", PatientSchema);
