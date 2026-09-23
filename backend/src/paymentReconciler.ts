import { pool } from "./db.js";
import { notifyOrderChange } from "./chat.js";
import { getTransactionStatus, refundDebit } from "./galimoPartner.js";
import { pushOrderPaid } from "./push.js";

// Filet de sécurité si le webhook Galimo n'arrive pas (ou arrive avant que
// notre propre écriture soit terminée) : une commande ne doit jamais rester
// "en cours" indéfiniment. On interroge Galimo sur les paiements en cours
// depuis plus d'une minute et on applique leur statut réel.
const MIN_AGE_SECONDS = 60;
const INTERVAL_MS = 60_000;

async function reconcileOnce() {
  const stuck = await pool.query(
    `SELECT * FROM orders
     WHERE payment_status = 'processing' AND payment_reference IS NOT NULL
       AND updated_at < now() - ($1 || ' seconds')::interval`,
    [String(MIN_AGE_SECONDS)]
  );

  for (const order of stuck.rows) {
    try {
      const st = await getTransactionStatus(order.payment_reference);
      let next: string | null = null;

      if (st.statut === "SUCCESS") {
        if (order.status === "cancelled") {
          await refundDebit(order.payment_reference);
          next = "refunded";
        } else {
          next = "paid";
        }
      } else if (["FAILED", "REFUSED", "EXPIRED"].includes(st.statut)) {
        next = "unpaid";
      }
      if (!next) continue;

      const updated = await pool.query(
        "UPDATE orders SET payment_status = $1, updated_at = now() WHERE id = $2 AND payment_status = 'processing' RETURNING *",
        [next, order.id]
      );
      if (updated.rowCount) {
        console.log(`[payment-reconciler] ${order.payment_reference}: ${st.statut} -> ${next}`);
        notifyOrderChange(updated.rows[0]);
        if (next === "paid") void pushOrderPaid(updated.rows[0]);
      }
    } catch (err: any) {
      console.error(`[payment-reconciler] ${order.payment_reference}: ${err.message}`);
    }
  }
}

export function startPaymentReconciler() {
  const run = () => reconcileOnce().catch((err) => console.error("[payment-reconciler]", err));
  setTimeout(run, 5_000);
  setInterval(run, INTERVAL_MS);
}
