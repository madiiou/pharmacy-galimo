import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { pushEnabled, vapidPublicKey } from "../push.js";

export const pushRouter = Router();

// Clé publique nécessaire au navigateur pour s'abonner (elle n'est pas secrète).
pushRouter.get("/public-key", (_req, res) => {
  res.json({ enabled: pushEnabled, publicKey: pushEnabled ? vapidPublicKey : null });
});

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

// Enregistre (ou met à jour) l'appareil du pharmacien. Un même appareil qui
// change de compte est réattribué au nouveau compte.
pushRouter.post("/subscribe", requireAuth, requireRole("admin", "pharmacy_partner"), async (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: "Push notifications are not configured" });
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { endpoint, keys } = parsed.data;

  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent, last_seen_at = now()`,
    [req.user!.sub, endpoint, keys.p256dh, keys.auth, (req.headers["user-agent"] ?? "").toString().slice(0, 300)]
  );
  res.status(204).end();
});

// Désabonne un appareil (déconnexion) : il ne recevra plus les alertes de ce compte.
pushRouter.post("/unsubscribe", requireAuth, async (req, res) => {
  const parsed = z.object({ endpoint: z.string().url() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2", [parsed.data.endpoint, req.user!.sub]);
  res.status(204).end();
});
