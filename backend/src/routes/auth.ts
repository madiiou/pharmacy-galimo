import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { hashPassword, comparePassword, signToken } from "../auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
  phone: z.string().optional(),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, displayName, phone } = parsed.data;

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, display_name, phone, role`,
    [email, passwordHash, displayName ?? null, phone ?? null]
  );
  const user = result.rows[0];
  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const result = await pool.query(
    "SELECT id, email, password_hash, display_name, phone, role FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await comparePassword(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ sub: user.id, role: user.role });
  delete user.password_hash;
  res.json({ token, user });
});
