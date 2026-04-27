import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import clinicalRoutes from "./routes/clinical.js";
import orderRoutes from "./routes/orders.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "IonoMed", version: "0.1.0" });
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/clinical", clinicalRoutes);
app.use("/api/orders", orderRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor"
  });
});

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`🚀 IonoMed backend en puerto ${port}`));
  })
  .catch((error) => {
    console.error("❌ Error conectando a base de datos", error);
    process.exit(1);
  });
