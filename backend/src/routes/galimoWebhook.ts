import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { pool } from "../db.js";
import { signToken } from "../auth.js";

export const galimoWebhookRouter = Router();

const payloadSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

function verifySignature(req: import("express").Request): boolean {
  const secret = process.env.GALIMO_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = req.header("x-galimo-signature");
  if (!signature) return false;

  const raw = (req as any).rawBody as Buffer | undefined;
  if (!raw) return false;

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Le téléphone est l'identifiant unique côté galimo.tech. C'est la même clé
// que celle déjà utilisée pour rattacher les devis composés par téléphone
// (POST /orders/manual), donc un compte "invité" créé avant la première
// connexion réelle est retrouvé ici directement, sans doublon.
galimoWebhookRouter.post("/", async (req, res) => {
  console.log(`[galimo-webhook] request from ${req.ip}, has-signature=${!!req.header("x-galimo-signature")}, body=${JSON.stringify(req.body)}`);

  if (!verifySignature(req)) {
    console.log("[galimo-webhook] REJECTED: invalid or missing signature");
    return res.status(401).json({ error: "Invalid or missing signature" });
  }

  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    console.log(`[galimo-webhook] REJECTED: invalid payload ${JSON.stringify(parsed.error.flatten())}`);
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { phone, email, name } = parsed.data;

  try {
    let user = (await pool.query("SELECT * FROM users WHERE phone = $1", [phone])).rows[0];

    // Le même compte peut déjà exister sous un autre téléphone si l'email
    // envoyé correspond à un utilisateur existant (email est unique chez
    // nous) : on le retrouve par email plutôt que de tenter une création
    // qui violerait la contrainte d'unicité.
    if (!user && email) {
      user = (await pool.query("SELECT * FROM users WHERE email = $1", [email])).rows[0];
    }

    if (!user) {
      const placeholderEmail = email ?? `guest-${phone.replace(/[^0-9]/g, "")}@galimo.tech`;
      const result = await pool.query(
        `INSERT INTO users (external_id, email, display_name, phone, role)
         VALUES ($1, $2, $3, $4, 'user')
         RETURNING *`,
        [phone, placeholderEmail, name ?? null, phone]
      );
      user = result.rows[0];
    } else if (user.role === "user") {
      // Un compte pharmacien/admin ne doit jamais être modifié par ce webhook
      // (voir plus bas) : ce "else if" ne s'applique qu'aux comptes clients,
      // les seuls pour qui une synchronisation automatique de profil a du sens.
      const result = await pool.query(
        `UPDATE users SET
           email = COALESCE($1, email),
           display_name = COALESCE($2, display_name),
           phone = COALESCE(phone, $3),
           external_id = COALESCE(external_id, $3),
           updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [email ?? null, name ?? null, phone, user.id]
      );
      user = result.rows[0];
    } else {
      // Compte pharmacien/admin : on ne touche à rien (email, mot de passe,
      // téléphone...). Ce webhook vient de galimo.tech et synchronise des
      // profils clients ; un compte "staff" a un identifiant de connexion
      // géré par nous et ne doit jamais être écrasé silencieusement — c'est
      // exactement ce qui est arrivé une fois avant ce correctif.
      console.log(`[galimo-webhook] SKIP update: user ${user.id} has role ${user.role}, profile left untouched`);
    }

    console.log(`[galimo-webhook] OK: user ${user.id} (phone ${phone})`);
    const token = signToken({ sub: user.id, role: user.role });
    res.json({
      token,
      url: `https://pharmacy.galimo.tech/shop?token=${token}`,
      user: { id: user.id, email: user.email, display_name: user.display_name, phone: user.phone, role: user.role },
    });
  } catch (err: any) {
    console.error(`[galimo-webhook] ERROR: ${err?.message ?? err}`);
    res.status(500).json({ error: "Internal error" });
  }
});
