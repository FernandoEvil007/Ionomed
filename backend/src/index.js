import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { DB_PATH, initStore } from "./store.js";
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import clinicalRoutes from "./routes/clinical.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();
const apiRouter = express.Router();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, app: "IonoMed", version: "0.1.0", database: "sqlite" });
});

apiRouter.use("/auth", authRoutes);
apiRouter.use("/patients", patientRoutes);
apiRouter.use("/clinical", clinicalRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/dashboard", dashboardRoutes);

app.use("/api", apiRouter);
app.use("/", apiRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor"
  });
});

initStore()
  .then(() => {
    app.listen(port, () => console.log(`IonoMed backend en puerto ${port}. DB local: ${DB_PATH}`));
  })
  .catch((error) => {
    console.error("Error iniciando base de datos local", error);
    process.exit(1);
  });
