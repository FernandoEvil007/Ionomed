import mongoose from "mongoose";

const LabSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    collectedAt: { type: Date, default: Date.now },
    sodium: Number,
    potassium: Number,
    chloride: Number,
    magnesium: Number,
    phosphorus: Number,
    calciumTotal: Number,
    calciumIonized: Number,
    albumin: Number,
    glucose: Number,
    creatinine: Number,
    urea: Number,
    bun: Number,
    ph: Number,
    bicarbonate: Number,
    serumOsmolality: Number,
    urineOsmolality: Number,
    urineSodium: Number,
    urinePotassium: Number,
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model("Lab", LabSchema);
