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
import { galimoPaymentWebhookRouter } from "./routes/galimoPaymentWebhook.js";
import { galimoBalanceRouter } from "./routes/galimoBalance.js";
import { attachChat } from "./chat.js";

// Filet de sécurité : une erreur non attrapée dans une route (ex: contrainte
// SQL violée) ne doit plus jamais faire tomber tout le serveur et provoquer
// des 502 pour tout le monde le temps du redémarrage du conteneur.
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

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
app.use("/api/payments/galimo-webhook", galimoPaymentWebhookRouter);
app.use("/api/galimo-partner", galimoBalanceRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[express error handler]", err);
  res.status(500).json({ error: "Internal error" });
});

const httpServer = createServer(app);
attachChat(httpServer);

const port = Number(process.env.PORT) || 4000;
httpServer.listen(port, () => {
  console.log(`pharmacy-galimo-api listening on port ${port}`);
});
