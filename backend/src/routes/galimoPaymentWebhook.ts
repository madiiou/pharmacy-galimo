import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { notifyOrderChange } from "../chat.js";

export const galimoPaymentWebhookRouter = Router();

interface PaymentWebhookPayload {
  event: "debit.completed" | "debit.refused" | "debit.failed";
  idrequest: string;
  statut: "SUCCESS" | "REFUSED" | "FAILED" | "EXPIRED";
  reference: string;
  montant: number;
  devise: string;
  reason?: string;
}

// Galimo POST ici quand une demande de débit atteint un état terminal.
// Le body est { jwt: "<HS256_TOKEN>" } signé avec notre clé secrète partenaire.
galimoPaymentWebhookRouter.post("/", async (req, res) => {
  const secret = process.env.GALIMO_PARTNER_API_SECRET;
  const token = req.body?.jwt;

  if (!secret || !token) {
    console.log("[galimo-payment-webhook] REJECTED: missing secret or token");
    return res.status(401).json({ error: "invalid_signature" });
  }

  let payload: PaymentWebhookPayload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as PaymentWebhookPayload;
  } catch (err: any) {
    console.log(`[galimo-payment-webhook] REJECTED: ${err.message}`);
    return res.status(401).json({ error: "invalid_signature" });
  }

  console.log(`[galimo-payment-webhook] ${payload.event} for ${payload.reference}: ${payload.statut}`);

  try {
    const orderResult = await pool.query("SELECT * FROM orders WHERE payment_reference = $1", [payload.reference]);
    if (!orderResult.rowCount) {
      console.log(`[galimo-payment-webhook] no order found for reference ${payload.reference}`);
      return res.status(200).end();
    }
    const order = orderResult.rows[0];

    const newPaymentStatus = payload.event === "debit.completed" ? "paid" : "unpaid";
    const result = await pool.query(
      "UPDATE orders SET payment_status = $1, updated_at = now() WHERE id = $2 RETURNING *",
      [newPaymentStatus, order.id]
    );
    notifyOrderChange(result.rows[0]);
    res.status(200).end();
  } catch (err: any) {
    console.error("[galimo-payment-webhook] ERROR", err);
    res.status(500).json({ error: "Internal error" });
  }
});
