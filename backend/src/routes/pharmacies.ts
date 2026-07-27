import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const pharmaciesRouter = Router();

// Public: liste des pharmacies actives (utilisé par le Flutter)
pharmaciesRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT id, name, logo_url, address, neighborhood, city, phone, whatsapp,
            delivery_fee_gnf, delivery_zones, delivery_cities, opening_hours,
            is_verified, rating, total_orders, description
     FROM pharmacies WHERE is_active = true ORDER BY name`
  );
  res.json(result.rows);
});

// Le partenaire: ses propres pharmacies
pharmaciesRouter.get("/mine", requireAuth, requireRole("pharmacy_partner"), async (req, res) => {
  const result = await pool.query("SELECT * FROM pharmacies WHERE owner_id = $1", [req.user!.sub]);
  res.json(result.rows);
});

// Public: détail d'une pharmacie
pharmaciesRouter.get("/:id", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM pharmacies WHERE id = $1 AND is_active = true",
    [req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

const pharmacySchema = z.object({
  name: z.string().min(1),
  ownerId: z.string().uuid().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  deliveryFeeGnf: z.number().int().nonnegative().default(0),
  description: z.string().optional(),
});

// Admin only: création d'une pharmacie
pharmaciesRouter.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = pharmacySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const p = parsed.data;

  const result = await pool.query(
    `INSERT INTO pharmacies (name, owner_id, address, neighborhood, city, phone, whatsapp, email, delivery_fee_gnf, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [p.name, p.ownerId ?? null, p.address ?? null, p.neighborhood ?? null, p.city ?? null,
     p.phone ?? null, p.whatsapp ?? null, p.email ?? null, p.deliveryFeeGnf, p.description ?? null]
  );
  res.status(201).json(result.rows[0]);
});

export async function canManagePharmacy(userId: string, role: string, pharmacyId: string) {
  if (role === "admin") return true;
  if (role !== "pharmacy_partner") return false;
  const result = await pool.query(
    "SELECT 1 FROM pharmacies WHERE id = $1 AND owner_id = $2",
    [pharmacyId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Admin ou le partenaire propriétaire: mise à jour d'une pharmacie
pharmaciesRouter.patch("/:id", requireAuth, requireRole("admin", "pharmacy_partner"), async (req, res) => {
  const allowed = await canManagePharmacy(req.user!.sub, req.user!.role, req.params.id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const parsed = pharmacySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const p = parsed.data;

  const result = await pool.query(
    `UPDATE pharmacies SET
       name = COALESCE($1, name),
       address = COALESCE($2, address),
       neighborhood = COALESCE($3, neighborhood),
       city = COALESCE($4, city),
       phone = COALESCE($5, phone),
       whatsapp = COALESCE($6, whatsapp),
       email = COALESCE($7, email),
       delivery_fee_gnf = COALESCE($8, delivery_fee_gnf),
       description = COALESCE($9, description),
       updated_at = now()
     WHERE id = $10
     RETURNING *`,
    [p.name ?? null, p.address ?? null, p.neighborhood ?? null, p.city ?? null, p.phone ?? null,
     p.whatsapp ?? null, p.email ?? null, p.deliveryFeeGnf ?? null, p.description ?? null, req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});
