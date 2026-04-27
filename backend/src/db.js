import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI no está configurado en .env");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("✅ MongoDB conectado");
}
