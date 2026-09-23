import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { notifyOrderChange } from "../chat.js";
import { refundDebit } from "../galimoPartner.js";
import { pushOrderPaid, pushAutoRefunded, pushPaymentFailed } from "../push.js";

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

    // La commande a pu être annulée pendant que ce débit était encore en
    // vol (payment_status 'processing' au moment de l'annulation, donc pas
    // de remboursement déclenché alors — voir PATCH /:id/status). Si le
    // débit finit par réussir malgré tout, l'argent vient d'être capté pour
    // une commande qu'on n'honorera pas : on rembourse immédiatement au lieu
    // de laisser payment_status passer à 'paid' sans que rien ne le détecte.
    if (payload.event === "debit.completed" && order.status === "cancelled") {
      try {
        await refundDebit(payload.reference);
        const result = await pool.query(
          "UPDATE orders SET payment_status = 'refunded', updated_at = now() WHERE id = $1 RETURNING *",
          [order.id]
        );
        notifyOrderChange(result.rows[0]);
        void pushAutoRefunded(result.rows[0], order.total_amount);
      } catch (err: any) {
        console.error(`[galimo-payment-webhook] auto-refund failed for cancelled order ${order.id}`, err);
        // On marque quand même 'paid' pour que ça reste visible et
        // traitable à la main côté admin plutôt que de disparaître.
        const result = await pool.query(
          "UPDATE orders SET payment_status = 'paid', updated_at = now() WHERE id = $1 RETURNING *",
          [order.id]
        );
        notifyOrderChange(result.rows[0]);
      }
      return res.status(200).end();
    }

    const newPaymentStatus = payload.event === "debit.completed" ? "paid" : "unpaid";
    const result = await pool.query(
      "UPDATE orders SET payment_status = $1, updated_at = now() WHERE id = $2 RETURNING *",
      [newPaymentStatus, order.id]
    );
    notifyOrderChange(result.rows[0]);
    // Le webhook peut être rejoué : on n'alerte que pour le vrai changement d'état.
    if (newPaymentStatus === "paid" && order.payment_status !== "paid") void pushOrderPaid(result.rows[0]);
    if (newPaymentStatus === "unpaid" && order.payment_status !== "unpaid") void pushPaymentFailed(result.rows[0]);
    res.status(200).end();
  } catch (err: any) {
    console.error("[galimo-payment-webhook] ERROR", err);
    res.status(500).json({ error: "Internal error" });
  }
});
