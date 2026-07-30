import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { pool } from "../db.js";
import { signToken } from "../auth.js";

export const galimoWebhookRouter = Router();

const payloadSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
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

galimoWebhookRouter.post("/", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: "Invalid or missing signature" });
  }

  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { id: externalId, email, name, phone } = parsed.data;

  const existing = await pool.query("SELECT * FROM users WHERE external_id = $1", [externalId]);
  let user = existing.rows[0];

  if (!user) {
    const result = await pool.query(
      `INSERT INTO users (external_id, email, display_name, phone, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING *`,
      [externalId, email ?? `${externalId}@galimo.tech`, name ?? null, phone ?? null]
    );
    user = result.rows[0];
  } else if (email || name || phone) {
    const result = await pool.query(
      `UPDATE users SET
         email = COALESCE($1, email),
         display_name = COALESCE($2, display_name),
         phone = COALESCE($3, phone),
         updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [email ?? null, name ?? null, phone ?? null, user.id]
    );
    user = result.rows[0];
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, display_name: user.display_name, phone: user.phone, role: user.role },
  });
});
