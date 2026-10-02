import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { hashPassword, comparePassword, signToken, requireAuth } from "../auth.js";
import { authLimiter } from "../rateLimit.js";

export const authRouter = Router();

// Hash bcrypt d'un mot de passe qui n'existe pas : sert uniquement à occuper
// le même temps de calcul quand l'email n'est pas trouvé (voir /login).
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8vC8a8L8x8VUmS8fY8b8h8Z8X8Xa";

// Retrouve les infos utilisateur à partir d'un token existant (utilisé quand
// l'app galimo.tech ouvre une page pharmacie avec ?token=... dans l'URL).
authRouter.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, email, display_name, phone, role FROM users WHERE id = $1",
    [req.user!.sub]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
  phone: z.string().optional(),
});

authRouter.post("/register", authLimiter, async (req, res) => {
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

authRouter.post("/login", authLimiter, async (req, res) => {
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
  // On compare toujours contre un hash (le sien, ou un hash factice si
  // l'email n'existe pas) : sinon répondre nettement plus vite quand l'email
  // est inconnu permettrait de deviner quels emails sont enregistrés.
  const passwordOk = await comparePassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ sub: user.id, role: user.role });
  delete user.password_hash;
  res.json({ token, user });
});
