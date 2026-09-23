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

function fmtGNF(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " GNF";
}

// Résumé d'une commande pour un message adressé au CLIENT (pas au pharmacien).
async function describeOrderForClient(order: { id: string; pharmacy_id: string }) {
  const pharmacy = await pool.query("SELECT name FROM pharmacies WHERE id = $1", [order.pharmacy_id]);
  return {
    ref: order.id.slice(0, 8).toUpperCase(),
    pharmacyName: (pharmacy.rows[0]?.name || "la pharmacie") as string,
  };
}

// La pharmacie a fixé les prix : le client doit confirmer et payer.
export async function pushQuoteReadyToClient(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrderForClient(order);
    await sendPushToUsers([order.user_id], {
      title: "Votre commande est prête",
      body: `#${d.ref} · ${d.pharmacyName} a fixé les prix : à confirmer et payer`,
      url: "/",
      tag: `quote-ready-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushQuoteReadyToClient:", err?.message);
  }
}

// La pharmacie a annulé la commande (rupture de stock, etc.), sans paiement à rembourser.
export async function pushOrderCancelledByPharmacyToClient(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrderForClient(order);
    await sendPushToUsers([order.user_id], {
      title: "Commande annulée",
      body: `#${d.ref} · ${d.pharmacyName} n'a pas pu honorer votre commande`,
      url: "/",
      tag: `cancelled-by-pharmacy-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushOrderCancelledByPharmacyToClient:", err?.message);
  }
}

// Le paiement du client a abouti.
export async function pushPaymentAcceptedToClient(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrderForClient(order);
    await sendPushToUsers([order.user_id], {
      title: "Paiement accepté ✓",
      body: `#${d.ref} · Commande confirmée, en préparation`,
      url: "/",
      tag: `paid-client-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushPaymentAcceptedToClient:", err?.message);
  }
}

// Le débit du client a échoué, a été refusé ou a expiré.
export async function pushPaymentFailedToClient(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrderForClient(order);
    await sendPushToUsers([order.user_id], {
      title: "Paiement refusé",
      body: `#${d.ref} · Le paiement n'a pas abouti, vous pouvez réessayer`,
      url: "/",
      tag: `payment-failed-client-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushPaymentFailedToClient:", err?.message);
  }
}

// Le client est remboursé (annulation par la pharmacie après paiement, ou
// rattrapage automatique) : couvre tous les cas, manuel ou automatique — à
// la différence du pharmacien, le client doit toujours être prévenu, c'est
// son argent.
export async function pushRefundedToClient(order: { id: string; user_id: string; pharmacy_id: string }, amount: number) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrderForClient(order);
    await sendPushToUsers([order.user_id], {
      title: "Remboursement effectué",
      body: `#${d.ref} · ${fmtGNF(amount)} recrédités sur votre compte Galimo`,
      url: "/",
      tag: `refunded-client-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushRefundedToClient:", err?.message);
  }
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

// Le client a annulé sa propre commande (avant paiement, ou paiement raté).
export async function pushOrderCancelledByClient(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrder(order);
    if (!d.ownerId) return;
    await sendPushToUsers([d.ownerId], {
      title: "Commande annulée",
      body: `#${d.ref} · ${d.who} a annulé sa commande`,
      url: "/pharmacien",
      tag: `cancelled-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushOrderCancelledByClient:", err?.message);
  }
}

// Le débit a échoué, a été refusé ou a expiré chez Galimo — le client devra réessayer.
export async function pushPaymentFailed(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrder(order);
    if (!d.ownerId) return;
    await sendPushToUsers([d.ownerId], {
      title: "Paiement refusé",
      body: `#${d.ref} · ${d.who} : le paiement n'a pas abouti`,
      url: "/pharmacien",
      tag: `payment-failed-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushPaymentFailed:", err?.message);
  }
}

// Remboursement déclenché automatiquement par le système (webhook ou
// rattrapage), sans action directe du pharmacien : à la différence d'un
// remboursement qu'il déclenche lui-même depuis l'appli, il ne le sait pas.
export async function pushAutoRefunded(order: { id: string; user_id: string; pharmacy_id: string }, amount: number) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrder(order);
    if (!d.ownerId) return;
    await sendPushToUsers([d.ownerId], {
      title: "Remboursement automatique",
      body: `#${d.ref} · ${d.who} : ${fmtGNF(amount)} recrédités (commande déjà annulée)`,
      url: "/pharmacien",
      tag: `refunded-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushAutoRefunded:", err?.message);
  }
}

// Le client a confirmé un devis composé par la pharmacie au téléphone :
// elle sait déjà que la commande existe, mais pas encore que le client a dit oui.
export async function pushQuoteConfirmed(order: { id: string; user_id: string; pharmacy_id: string }) {
  if (!pushEnabled) return;
  try {
    const d = await describeOrder(order);
    if (!d.ownerId) return;
    await sendPushToUsers([d.ownerId], {
      title: "Devis confirmé",
      body: `#${d.ref} · ${d.who} a confirmé la commande par téléphone`,
      url: "/pharmacien",
      tag: `confirmed-${order.id}`,
    });
  } catch (err: any) {
    console.error("[push] pushQuoteConfirmed:", err?.message);
  }
}
