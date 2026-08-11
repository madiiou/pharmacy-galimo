import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { canManagePharmacy } from "./pharmacies.js";

export const medicinesRouter = Router();

// Public: liste des médicaments, filtrable par pharmacie ou catégorie
medicinesRouter.get("/", async (req, res) => {
  const { pharmacyId, category } = req.query;
  const conditions = ["is_active = true"];
  const params: unknown[] = [];

  if (pharmacyId) {
    params.push(pharmacyId);
    conditions.push(`pharmacy_id = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT * FROM medicines WHERE ${conditions.join(" AND ")} ORDER BY name`,
    params
  );
  res.json(result.rows);
});

// Public: détail d'un médicament
medicinesRouter.get("/:id", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM medicines WHERE id = $1 AND is_active = true",
    [req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

const medicineSchema = z.object({
  pharmacyId: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  originalPrice: z.number().int().nonnegative().optional(),
  category: z.string().optional(),
  form: z.string().optional(),
  laboratory: z.string().optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  indication: z.string().optional(),
  activeSubstance: z.string().optional(),
  inStock: z.boolean().default(true),
  requiresPrescription: z.boolean().default(false),
  isActive: z.boolean().optional(),
});

// pharmacy_partner (sa propre pharmacie) ou admin: ajout d'un médicament
medicinesRouter.post("/", requireAuth, requireRole("admin", "pharmacy_partner"), async (req, res) => {
  const parsed = medicineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const m = parsed.data;

  const allowed = await canManagePharmacy(req.user!.sub, req.user!.role, m.pharmacyId);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const result = await pool.query(
    `INSERT INTO medicines (pharmacy_id, created_by, name, price, original_price, category, form,
                             laboratory, image_url, description, indication, active_substance,
                             in_stock, requires_prescription)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [m.pharmacyId, req.user!.sub, m.name, m.price, m.originalPrice ?? null, m.category ?? null,
     m.form ?? null, m.laboratory ?? null, m.imageUrl ?? null, m.description ?? null,
     m.indication ?? null, m.activeSubstance ?? null, m.inStock, m.requiresPrescription]
  );
  res.status(201).json(result.rows[0]);
});

// pharmacy_partner (sa propre pharmacie) ou admin: modification d'un médicament
medicinesRouter.patch("/:id", requireAuth, requireRole("admin", "pharmacy_partner"), async (req, res) => {
  const existing = await pool.query("SELECT pharmacy_id FROM medicines WHERE id = $1", [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: "Not found" });

  const allowed = await canManagePharmacy(req.user!.sub, req.user!.role, existing.rows[0].pharmacy_id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const parsed = medicineSchema.omit({ pharmacyId: true }).partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const m = parsed.data;

  const result = await pool.query(
    `UPDATE medicines SET
       name = COALESCE($1, name),
       price = COALESCE($2, price),
       original_price = COALESCE($3, original_price),
       category = COALESCE($4, category),
       form = COALESCE($5, form),
       laboratory = COALESCE($6, laboratory),
       image_url = COALESCE($7, image_url),
       description = COALESCE($8, description),
       indication = COALESCE($9, indication),
       active_substance = COALESCE($10, active_substance),
       in_stock = COALESCE($11, in_stock),
       requires_prescription = COALESCE($12, requires_prescription),
       is_active = COALESCE($13, is_active),
       updated_at = now()
     WHERE id = $14
     RETURNING *`,
    [m.name ?? null, m.price ?? null, m.originalPrice ?? null, m.category ?? null, m.form ?? null,
     m.laboratory ?? null, m.imageUrl ?? null, m.description ?? null, m.indication ?? null,
     m.activeSubstance ?? null, m.inStock ?? null, m.requiresPrescription ?? null, m.isActive ?? null,
     req.params.id]
  );
  res.json(result.rows[0]);
});
