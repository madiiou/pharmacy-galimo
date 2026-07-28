import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const pharmaciesRouter = Router();

// Liste de toutes les pharmacies (le filtrage client/actives sera géré côté
// consommateur une fois le catalogue client branché sur la vraie API).
pharmaciesRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT id, name, owner_id, logo_url, address, neighborhood, city, phone, whatsapp,
            delivery_fee_gnf, delivery_zones, delivery_cities, opening_hours,
            is_active, is_verified, rating, total_orders, description
     FROM pharmacies ORDER BY name`
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
  const result = await pool.query("SELECT * FROM pharmacies WHERE id = $1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

const pharmacySchema = z.object({
  name: z.string().min(1),
  ownerId: z.string().uuid().nullable().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  deliveryFeeGnf: z.number().int().nonnegative().default(0),
  deliveryCities: z.array(z.string()).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

// Admin only: création d'une pharmacie
pharmaciesRouter.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = pharmacySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const p = parsed.data;

  const result = await pool.query(
    `INSERT INTO pharmacies (name, owner_id, address, neighborhood, city, phone, whatsapp, email,
                              delivery_fee_gnf, delivery_cities, description, is_active, is_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [p.name, p.ownerId ?? null, p.address ?? null, p.neighborhood ?? null, p.city ?? null,
     p.phone ?? null, p.whatsapp ?? null, p.email ?? null, p.deliveryFeeGnf,
     p.deliveryCities ?? [], p.description ?? null, p.isActive ?? true, p.isVerified ?? false]
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
       owner_id = COALESCE($2, owner_id),
       address = COALESCE($3, address),
       neighborhood = COALESCE($4, neighborhood),
       city = COALESCE($5, city),
       phone = COALESCE($6, phone),
       whatsapp = COALESCE($7, whatsapp),
       email = COALESCE($8, email),
       delivery_fee_gnf = COALESCE($9, delivery_fee_gnf),
       delivery_cities = COALESCE($10, delivery_cities),
       description = COALESCE($11, description),
       is_active = COALESCE($12, is_active),
       is_verified = COALESCE($13, is_verified),
       updated_at = now()
     WHERE id = $14
     RETURNING *`,
    [p.name ?? null, p.ownerId ?? null, p.address ?? null, p.neighborhood ?? null, p.city ?? null,
     p.phone ?? null, p.whatsapp ?? null, p.email ?? null, p.deliveryFeeGnf ?? null,
     p.deliveryCities ?? null, p.description ?? null, p.isActive ?? null, p.isVerified ?? null,
     req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});
