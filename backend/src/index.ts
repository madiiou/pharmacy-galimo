import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { pool } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { pharmaciesRouter } from "./routes/pharmacies.js";
import { medicinesRouter } from "./routes/medicines.js";
import { ordersRouter } from "./routes/orders.js";
import { scanMedicineRouter } from "./routes/scanMedicine.js";
import { galimoWebhookRouter } from "./routes/galimoWebhook.js";
import { usersRouter } from "./routes/users.js";
import { attachChat } from "./chat.js";

const app = express();
app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/pharmacies", pharmaciesRouter);
app.use("/api/medicines", medicinesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/scan-medicine", scanMedicineRouter);
app.use("/api/auth/galimo-webhook", galimoWebhookRouter);
app.use("/api/users", usersRouter);

const httpServer = createServer(app);
attachChat(httpServer);

const port = Number(process.env.PORT) || 4000;
httpServer.listen(port, () => {
  console.log(`pharmacy-galimo-api listening on port ${port}`);
});
