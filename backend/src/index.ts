import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { pool } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { pharmaciesRouter } from "./routes/pharmacies.js";
import { medicinesRouter } from "./routes/medicines.js";
import { ordersRouter } from "./routes/orders.js";
import { scanMedicineRouter } from "./routes/scanMedicine.js";
import { attachChat } from "./chat.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/pharmacies", pharmaciesRouter);
app.use("/api/medicines", medicinesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/scan-medicine", scanMedicineRouter);

const httpServer = createServer(app);
attachChat(httpServer);

const port = Number(process.env.PORT) || 4000;
httpServer.listen(port, () => {
  console.log(`pharmacy-galimo-api listening on port ${port}`);
});
