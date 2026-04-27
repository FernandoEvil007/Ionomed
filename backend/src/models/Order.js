import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    labId: { type: mongoose.Schema.Types.ObjectId, ref: "Lab" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    disorder: { type: String, required: true },
    severity: { type: String },
    priority: { type: String },
    suggestedText: { type: String, required: true },
    editedText: { type: String },
    alerts: [{ type: String }],
    copiedAt: Date,
    markedDoneAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
