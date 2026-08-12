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

  let user = (await pool.query("SELECT * FROM users WHERE phone = $1", [phone])).rows[0];

  if (!user) {
    const placeholderEmail = email ?? `guest-${phone.replace(/[^0-9]/g, "")}@galimo.tech`;
    const result = await pool.query(
      `INSERT INTO users (external_id, email, display_name, phone, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING *`,
      [phone, placeholderEmail, name ?? null, phone]
    );
    user = result.rows[0];
  } else if (email || name) {
    const result = await pool.query(
      `UPDATE users SET
         email = COALESCE($1, email),
         display_name = COALESCE($2, display_name),
         external_id = COALESCE(external_id, $3),
         updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [email ?? null, name ?? null, phone, user.id]
    );
    user = result.rows[0];
  }

  console.log(`[galimo-webhook] OK: user ${user.id} (phone ${phone})`);
  const token = signToken({ sub: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, display_name: user.display_name, phone: user.phone, role: user.role },
  });
});
