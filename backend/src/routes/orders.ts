import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { canManagePharmacy } from "./pharmacies.js";

export const ordersRouter = Router();

const ORDER_STATUSES = ["pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"] as const;

async function getAccessiblePharmacyIds(userId: string) {
  const result = await pool.query("SELECT id FROM pharmacies WHERE owner_id = $1", [userId]);
  return result.rows.map((r) => r.id as string);
}

async function canAccessOrder(userId: string, role: string, order: { user_id: string; pharmacy_id: string }) {
  if (role === "admin") return true;
  if (role === "user") return order.user_id === userId;
  if (role === "pharmacy_partner") return canManagePharmacy(userId, role, order.pharmacy_id);
  return false;
}

const createOrderSchema = z.object({
  pharmacyId: z.string().uuid(),
  items: z.array(z.object({
    medicineId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  notes: z.string().optional(),
});

// Création d'une commande (côté client, Flutter)
ordersRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { pharmacyId, items, notes } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pharmacy = await client.query(
      "SELECT delivery_fee_gnf FROM pharmacies WHERE id = $1 AND is_active = true",
      [pharmacyId]
    );
    if (!pharmacy.rowCount) throw { status: 404, message: "Pharmacy not found" };

    const medicineIds = items.map((i) => i.medicineId);
    const medicines = await client.query(
      "SELECT id, price FROM medicines WHERE id = ANY($1) AND pharmacy_id = $2 AND is_active = true",
      [medicineIds, pharmacyId]
    );
    if (medicines.rowCount !== medicineIds.length) {
      throw { status: 400, message: "One or more medicines are invalid for this pharmacy" };
    }
    const priceById = new Map(medicines.rows.map((m) => [m.id as string, m.price as number]));

    const deliveryFee = pharmacy.rows[0].delivery_fee_gnf as number;
    let totalAmount = deliveryFee;
    const itemRows = items.map((i) => {
      const unitPrice = priceById.get(i.medicineId)!;
      const subtotal = unitPrice * i.quantity;
      totalAmount += subtotal;
      return { ...i, unitPrice, subtotal };
    });

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, pharmacy_id, total_amount, delivery_fee, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user!.sub, pharmacyId, totalAmount, deliveryFee, notes ?? null]
    );
    const order = orderResult.rows[0];

    for (const item of itemRows) {
      await client.query(
        `INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.medicineId, item.quantity, item.unitPrice, item.subtotal]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ ...order, items: itemRows });
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(err.status ?? 500).json({ error: err.message ?? "Internal error" });
  } finally {
    client.release();
  }
});

// Liste des commandes visibles par l'utilisateur courant
ordersRouter.get("/", requireAuth, async (req, res) => {
  const { sub, role } = req.user!;

  if (role === "admin") {
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    return res.json(result.rows);
  }
  if (role === "pharmacy_partner") {
    const pharmacyIds = await getAccessiblePharmacyIds(sub);
    const result = await pool.query(
      "SELECT * FROM orders WHERE pharmacy_id = ANY($1) ORDER BY created_at DESC",
      [pharmacyIds]
    );
    return res.json(result.rows);
  }
  const result = await pool.query(
    "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
    [sub]
  );
  res.json(result.rows);
});

// Détail d'une commande + ses articles
ordersRouter.get("/:id", requireAuth, async (req, res) => {
  const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!orderResult.rowCount) return res.status(404).json({ error: "Not found" });
  const order = orderResult.rows[0];

  const allowed = await canAccessOrder(req.user!.sub, req.user!.role, order);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const items = await pool.query(
    `SELECT oi.*, m.name AS medicine_name
     FROM order_items oi JOIN medicines m ON m.id = oi.medicine_id
     WHERE oi.order_id = $1`,
    [order.id]
  );
  res.json({ ...order, items: items.rows });
});

// Historique des messages du chat de commande
ordersRouter.get("/:id/messages", requireAuth, async (req, res) => {
  const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!orderResult.rowCount) return res.status(404).json({ error: "Not found" });

  const allowed = await canAccessOrder(req.user!.sub, req.user!.role, orderResult.rows[0]);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const messages = await pool.query(
    "SELECT * FROM order_messages WHERE order_id = $1 ORDER BY created_at ASC",
    [req.params.id]
  );
  res.json(messages.rows);
});

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(["unpaid", "paid"]).optional(),
});

// Mise à jour du statut (partenaire de la pharmacie ou admin)
ordersRouter.patch("/:id/status", requireAuth, requireRole("admin", "pharmacy_partner"), async (req, res) => {
  const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!orderResult.rowCount) return res.status(404).json({ error: "Not found" });
  const order = orderResult.rows[0];

  const allowed = await canManagePharmacy(req.user!.sub, req.user!.role, order.pharmacy_id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { status, paymentStatus } = parsed.data;

  const result = await pool.query(
    `UPDATE orders SET
       status = COALESCE($1, status),
       payment_status = COALESCE($2, payment_status),
       updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [status ?? null, paymentStatus ?? null, order.id]
  );
  res.json(result.rows[0]);
});
