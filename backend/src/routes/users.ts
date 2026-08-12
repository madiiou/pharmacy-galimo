import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const usersRouter = Router();

// Admin only: derniers comptes créés, pour vérifier les intégrations externes
// (ex: webhook galimo.tech) sans avoir besoin des logs serveur.
usersRouter.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const result = await pool.query(
    `SELECT id, email, display_name, phone, role, external_id, created_at
     FROM users ORDER BY created_at DESC LIMIT 100`
  );
  res.json(result.rows);
});
