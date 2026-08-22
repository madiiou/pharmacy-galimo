import { Router, type Response } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { canManagePharmacy } from "./pharmacies.js";
import { notifyOrderChange } from "../chat.js";
import { requestDebit } from "../galimoPartner.js";
import crypto from "node:crypto";

export const ordersRouter = Router();

// Les trois routes de création de commande partagent la même mécanique :
// transaction, rollback + réponse d'erreur homogène en cas d'échec, commit
// puis notification temps réel une fois la commande créée. Seul ce qui se
// passe dans la transaction et la forme de la réponse diffère entre elles.
async function createOrderInTransaction(
  res: Response,
  handler: (client: import("pg").PoolClient) => Promise<{ order: any; payload: unknown }>
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { order, payload } = await handler(client);
    await client.query("COMMIT");
    notifyOrderChange(order);
    res.status(201).json(payload);
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(err.status ?? 500).json({ error: err.message ?? "Internal error" });
  } finally {
    client.release();
  }
}

const ORDER_STATUSES = [
  "awaiting_pharmacist", "awaiting_customer", "pending", "confirmed", "preparing", "delivering", "delivered", "cancelled",
] as const;

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

  await createOrderInTransaction(res, async (client) => {
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

    return { order, payload: { ...order, items: itemRows } };
  });
});

const requestOrderSchema = z.object({
  pharmacyId: z.string().uuid(),
  items: z.array(z.object({
    medicineId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  deliveryMode: z.enum(["retrait", "livraison"]),
  city: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

// Demande du client : il choisit des articles sans connaître le prix, le
// pharmacien fixera les prix réels ensuite (esprit du module d'origine).
ordersRouter.post("/request", requireAuth, async (req, res) => {
  const parsed = requestOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { pharmacyId, items, deliveryMode, city, deliveryAddress, notes } = parsed.data;

  await createOrderInTransaction(res, async (client) => {
    const pharmacy = await client.query(
      "SELECT delivery_fee_gnf FROM pharmacies WHERE id = $1 AND is_active = true",
      [pharmacyId]
    );
    if (!pharmacy.rowCount) throw { status: 404, message: "Pharmacy not found" };

    const medicineIds = items.map((i) => i.medicineId);
    const medicines = await client.query(
      "SELECT id FROM medicines WHERE id = ANY($1) AND pharmacy_id = $2 AND is_active = true",
      [medicineIds, pharmacyId]
    );
    if (medicines.rowCount !== medicineIds.length) {
      throw { status: 400, message: "One or more medicines are invalid for this pharmacy" };
    }

    const deliveryFee = pharmacy.rows[0].delivery_fee_gnf as number;

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, pharmacy_id, status, total_amount, delivery_fee, delivery_mode, city, delivery_address, notes)
       VALUES ($1,$2,'awaiting_pharmacist',0,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user!.sub, pharmacyId, deliveryFee, deliveryMode, city ?? null, deliveryAddress ?? null, notes ?? null]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, medicine_id, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,0,0)`,
        [order.id, item.medicineId, item.quantity]
      );
    }

    return { order, payload: order };
  });
});

const manualOrderSchema = z.object({
  pharmacyId: z.string().uuid(),
  customerPhone: z.string().min(1),
  customerName: z.string().optional(),
  deliveryFee: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    medicineId: z.string().uuid().optional(),
    itemName: z.string().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().int().nonnegative(),
  }).refine((i) => i.medicineId || i.itemName, {
    message: "medicineId or itemName is required",
  })).min(1),
});

// Devis composé par le pharmacien pour un client au téléphone : rattaché à
// son compte via son numéro, en attente de confirmation de sa part.
ordersRouter.post("/manual", requireAuth, requireRole("admin", "pharmacy_partner"), async (req, res) => {
  const parsed = manualOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { pharmacyId, customerPhone, customerName, deliveryFee, notes, items } = parsed.data;

  const allowedPharmacy = await canManagePharmacy(req.user!.sub, req.user!.role, pharmacyId);
  if (!allowedPharmacy) return res.status(403).json({ error: "Forbidden" });

  await createOrderInTransaction(res, async (client) => {
    let customer = (await client.query("SELECT * FROM users WHERE phone = $1", [customerPhone])).rows[0];
    if (!customer) {
      const placeholderEmail = `guest-${customerPhone.replace(/[^0-9]/g, "")}@pharmacy-galimo.local`;
      const created = await client.query(
        `INSERT INTO users (email, display_name, phone, role)
         VALUES ($1, $2, $3, 'user') RETURNING *`,
        [placeholderEmail, customerName ?? null, customerPhone]
      );
      customer = created.rows[0];
    } else if (customerName && !customer.display_name) {
      await client.query("UPDATE users SET display_name = $1 WHERE id = $2", [customerName, customer.id]);
    }

    const totalAmount = deliveryFee + items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, pharmacy_id, status, total_amount, delivery_fee, notes)
       VALUES ($1,$2,'awaiting_customer',$3,$4,$5) RETURNING *`,
      [customer.id, pharmacyId, totalAmount, deliveryFee, notes ?? null]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, medicine_id, item_name, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.medicineId ?? null, item.itemName ?? null, item.quantity, item.unitPrice, item.unitPrice * item.quantity]
      );
    }

    return {
      order,
      payload: { ...order, customer: { id: customer.id, phone: customer.phone, display_name: customer.display_name } },
    };
  });
});

const ORDERS_WITH_ITEMS_SELECT = `
  SELECT o.*, COALESCE(
    (SELECT json_agg(json_build_object(
       'id', oi.id, 'medicine_id', oi.medicine_id, 'quantity', oi.quantity,
       'unit_price', oi.unit_price, 'subtotal', oi.subtotal, 'is_available', oi.is_available,
       'medicine_name', COALESCE(m.name, oi.item_name)
     ) ORDER BY oi.created_at)
     FROM order_items oi LEFT JOIN medicines m ON m.id = oi.medicine_id
     WHERE oi.order_id = o.id), '[]'::json
  ) AS items
  FROM orders o
`;

// Liste des commandes visibles par l'utilisateur courant
ordersRouter.get("/", requireAuth, async (req, res) => {
  const { sub, role } = req.user!;

  if (role === "admin") {
    const result = await pool.query(`${ORDERS_WITH_ITEMS_SELECT} ORDER BY o.created_at DESC`);
    return res.json(result.rows);
  }
  if (role === "pharmacy_partner") {
    const pharmacyIds = await getAccessiblePharmacyIds(sub);
    const result = await pool.query(
      `${ORDERS_WITH_ITEMS_SELECT} WHERE o.pharmacy_id = ANY($1) ORDER BY o.created_at DESC`,
      [pharmacyIds]
    );
    return res.json(result.rows);
  }
  const result = await pool.query(
    `${ORDERS_WITH_ITEMS_SELECT} WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
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
    `SELECT oi.*, COALESCE(m.name, oi.item_name) AS medicine_name
     FROM order_items oi LEFT JOIN medicines m ON m.id = oi.medicine_id
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

// Le client confirme son devis reçu par téléphone
ordersRouter.patch("/:id/confirm", requireAuth, async (req, res) => {
  const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!orderResult.rowCount) return res.status(404).json({ error: "Not found" });
  const order = orderResult.rows[0];

  if (order.user_id !== req.user!.sub) return res.status(403).json({ error: "Forbidden" });
  if (order.status !== "awaiting_customer") {
    return res.status(400).json({ error: "Order is not awaiting confirmation" });
  }

  const result = await pool.query(
    "UPDATE orders SET status = 'pending', updated_at = now() WHERE id = $1 RETURNING *",
    [order.id]
  );
  notifyOrderChange(result.rows[0]);
  res.json(result.rows[0]);
});

// Le client paie sa commande confirmée via son wallet Galimo (API Partenaire)
ordersRouter.post("/:id/pay", requireAuth, async (req, res) => {
  const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!orderResult.rowCount) return res.status(404).json({ error: "Not found" });
  const order = orderResult.rows[0];

  if (order.user_id !== req.user!.sub) return res.status(403).json({ error: "Forbidden" });
  if (order.status !== "pending" || order.payment_status === "paid") {
    return res.status(400).json({ error: "Order is not payable" });
  }
  if (order.payment_status === "processing") {
    return res.status(400).json({ error: "Payment already in progress" });
  }

  const userResult = await pool.query("SELECT phone FROM users WHERE id = $1", [order.user_id]);
  const phone = userResult.rows[0]?.phone;
  if (!phone) return res.status(400).json({ error: "No phone number on file for this account" });

  const reference = `PHARM-${order.id.slice(0, 8)}-${crypto.randomBytes(3).toString("hex")}`;

  // Commission Galimo (10%) sur le prix des médicaments uniquement, ajoutée
  // par-dessus ce que paie le client — le transport n'est pas commissionné
  // et la pharmacie reçoit son montant plein.
  const medicinesSubtotal = order.total_amount - order.delivery_fee;
  const debitAmount = Math.round(medicinesSubtotal * 1.10) + order.delivery_fee;

  try {
    const debit = await requestDebit({
      phone,
      amount: debitAmount,
      reference,
      description: `Pharmacie - commande #${order.id.slice(0, 8)}`,
    });

    const result = await pool.query(
      `UPDATE orders SET payment_status = 'processing', payment_reference = $1, payment_idrequest = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [reference, debit.idrequest, order.id]
    );
    notifyOrderChange(result.rows[0]);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Payment request failed" });
  }
});

// Le client annule sa propre commande (avant confirmation ou paiement)
ordersRouter.patch("/:id/cancel", requireAuth, async (req, res) => {
  const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!orderResult.rowCount) return res.status(404).json({ error: "Not found" });
  const order = orderResult.rows[0];

  if (order.user_id !== req.user!.sub) return res.status(403).json({ error: "Forbidden" });
  if (!["awaiting_pharmacist", "awaiting_customer"].includes(order.status)) {
    return res.status(400).json({ error: "Order can no longer be cancelled" });
  }

  const result = await pool.query(
    "UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *",
    [order.id]
  );
  notifyOrderChange(result.rows[0]);
  res.json(result.rows[0]);
});

const priceItemsSchema = z.object({
  deliveryFee: z.number().int().nonnegative().optional(),
  items: z.array(z.object({
    id: z.string().uuid(),
    available: z.boolean(),
    unitPrice: z.number().int().nonnegative().optional(),
  })).min(1),
});

// Le pharmacien fixe les prix réels (et la disponibilité) d'une demande
// client, ce qui la transforme en devis prêt à être confirmé.
ordersRouter.patch("/:id/price", requireAuth, requireRole("admin", "pharmacy_partner"), async (req, res) => {
  const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
  if (!orderResult.rowCount) return res.status(404).json({ error: "Not found" });
  const order = orderResult.rows[0];

  const allowed = await canManagePharmacy(req.user!.sub, req.user!.role, order.pharmacy_id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  if (order.status !== "awaiting_pharmacist") {
    return res.status(400).json({ error: "Order is not awaiting pharmacist pricing" });
  }

  const parsed = priceItemsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { deliveryFee, items } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let anyAvailable = false;
    for (const item of items) {
      if (item.available) {
        anyAvailable = true;
        await client.query(
          `UPDATE order_items SET is_available = true, unit_price = $1, subtotal = $1 * quantity
           WHERE id = $2 AND order_id = $3`,
          [item.unitPrice ?? 0, item.id, order.id]
        );
      } else {
        await client.query(
          `UPDATE order_items SET is_available = false, unit_price = 0, subtotal = 0
           WHERE id = $1 AND order_id = $2`,
          [item.id, order.id]
        );
      }
    }

    const totals = await client.query(
      "SELECT COALESCE(SUM(subtotal), 0) AS sum FROM order_items WHERE order_id = $1",
      [order.id]
    );
    const finalDeliveryFee = deliveryFee ?? order.delivery_fee;
    const totalAmount = Number(totals.rows[0].sum) + finalDeliveryFee;
    const newStatus = anyAvailable ? "awaiting_customer" : "cancelled";

    const result = await client.query(
      `UPDATE orders SET status = $1, total_amount = $2, delivery_fee = $3, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [newStatus, totalAmount, finalDeliveryFee, order.id]
    );

    await client.query("COMMIT");
    notifyOrderChange(result.rows[0]);
    res.json(result.rows[0]);
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(err.status ?? 500).json({ error: err.message ?? "Internal error" });
  } finally {
    client.release();
  }
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
  notifyOrderChange(result.rows[0]);
  res.json(result.rows[0]);
});
