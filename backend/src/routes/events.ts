import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAuth, requireRole, type JwtPayload } from "../auth.js";

export const eventsRouter = Router();

const EVENT_TYPES = ["whatsapp_contact_click", "whatsapp_prescription_click"] as const;

const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  pharmacyId: z.string().uuid(),
});

// Public : le client n'est pas forcement connecte quand il clique sur un
// lien WhatsApp (simple visite du catalogue). On rattache l'utilisateur
// seulement si un token valide est present, sans jamais bloquer l'appel.
eventsRouter.post("/", async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { type, pharmacyId } = parsed.data;

  let userId: string | null = null;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET as string) as JwtPayload;
      userId = payload.sub;
    } catch {}
  }

  await pool.query(
    "INSERT INTO events (type, pharmacy_id, user_id) VALUES ($1, $2, $3)",
    [type, pharmacyId, userId]
  );
  res.status(201).json({ ok: true });
});

// Admin/pharmacien : liste brute pour calculer des stats cote client.
eventsRouter.get("/", requireAuth, requireRole("admin", "pharmacy_partner"), async (_req, res) => {
  const result = await pool.query(
    "SELECT id, type, pharmacy_id, user_id, created_at FROM events ORDER BY created_at DESC LIMIT 5000"
  );
  res.json(result.rows);
});
