import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No autorizado" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) return res.status(401).json({ message: "Usuario no autorizado" });

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Sesión inválida o vencida" });
  }
}

export function adminRequired(req, res, next) {
  if (req.user?.accessRole !== "admin") {
    return res.status(403).json({ message: "Requiere rol administrador" });
  }
  next();
}
