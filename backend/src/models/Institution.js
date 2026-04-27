import mongoose from "mongoose";

const InstitutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    identifier: { type: String, trim: true },
    city: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    settings: {
      sodiumGlucoseCorrectionFactor: { type: Number, default: 1.6 },
      maxSodiumCorrection24hStandard: { type: Number, default: 10 },
      maxSodiumCorrection24hHighRisk: { type: Number, default: 8 },
      defaultHypercalcemiaHydrationRate: { type: Number, default: 150 },
      defaultOverloadHydrationRate: { type: Number, default: 75 }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Institution", InstitutionSchema);
