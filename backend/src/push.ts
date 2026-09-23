import webpush from "web-push";
import { pool } from "./db.js";

// Clés VAPID : générées une fois (npx web-push generate-vapid-keys) et placées
// dans l'environnement du serveur. Sans elles, les notifications push sont
// simplement désactivées : le reste de l'application fonctionne normalement.
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT || "https://pharmacy.galimo.tech";

export const pushEnabled = Boolean(PUBLIC_KEY && PRIVATE_KEY);
export const vapidPublicKey = PUBLIC_KEY;

if (pushEnabled) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
} else {
  console.log("[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absentes : notifications push désactivées");
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

// Envoie une notification à tous les appareils abonnés de ces utilisateurs.
// Ne lève jamais d'erreur : une notification ratée ne doit pas casser une
// commande. Les abonnements expirés (404/410) sont supprimés au passage.
async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!pushEnabled || !userIds.length) return;
  try {
    const subs = await pool.query(
      "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1)",
      [userIds]
    );
    const body = JSON.stringify(payload);
    await Promise.allSettled(
      subs.rows.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 3600, urgency: "high" }
          );
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [s.id]);
          } else {
            console.error("[push] envoi échoué:", err?.statusCode ?? err?.message);
          }
        }
      })
    );
  } catch (err: any) {
    console.error("[push] erreur:", err?.message);
  }
}

// Résumé d'une commande pour le texte de la notification.
async function describeOrder(order: { id: string; user_id: string; pharmacy_id: string }) {
  const [owner, customer, items] = await Promise.all([
    pool.query("SELECT owner_id FROM pharmacies WHERE id = $1", [order.pharmacy_id]),
    pool.query("SELECT display_name, phone FROM users WHERE id = $1", [order.user_id]),
    pool.query("SELECT count(*)::int AS n FROM order_items WHERE order_id = $1", [order.id]),
  ]);
  return {
    ownerId: owner.rows[0]?.owner_id as string | undefined,
    ref: order.id.slice(0, 8).toUpperCase(),
    who: (customer.rows[0]?.display_name || customer.rows[0]?.phone || "Client") as string,
    n: (items.rows[0]?.n ?? 0) as number,
  };
}

// Un client vient d'envoyer une demande : la pharmacie doit la chiffrer.
export async function pushNewOrder(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrder(order);
    if (!d.ownerId) return;
    await sendPushToUsers([d.ownerId], {
      title: "Nouvelle commande",
      body: `#${d.ref} · ${d.who} · ${d.n} article${d.n > 1 ? "s" : ""} à chiffrer`,
      url: "/pharmacien",
      tag: `order-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushNewOrder:", err?.message);
  }
}

// Le paiement est confirmé : la pharmacie peut préparer la commande.
export async function pushOrderPaid(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrder(order);
    if (!d.ownerId) return;
    await sendPushToUsers([d.ownerId], {
      title: "Commande payée",
      body: `#${d.ref} · ${d.who} : à préparer`,
      url: "/pharmacien",
      tag: `paid-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushOrderPaid:", err?.message);
  }
}
