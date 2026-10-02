import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { hashPassword, comparePassword, signToken, requireAuth } from "../auth.js";
import { authLimiter } from "../rateLimit.js";
import { pushLoginAlert } from "../push.js";

// Nombre d'échecs avant blocage temporaire du compte, et durée du blocage.
// En plus de la limite par IP (authLimiter) : celle-ci arrête un brute-force
// réparti sur plusieurs adresses, que la limite par IP ne voit pas venir.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION = "15 minutes";

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

// Inscription libre par email/mot de passe : fermée. Aucun écran de l'appli
// ne l'utilise — les clients arrivent par le webhook galimo.tech, les comptes
// pharmacien/admin sont créés par nous. Elle ne servait qu'à fabriquer des
// comptes en masse (intrusion du 1er octobre 2026).
authRouter.post("/register", (_req, res) => {
  res.status(410).json({ error: "Inscription désactivée. Utilisez l'application Galimo : https://galimo.tech/app" });
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
    "SELECT id, email, password_hash, display_name, phone, role, locked_until FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];

  // Compte bloqué : on ne tente même pas de comparer le mot de passe, pour
  // ne pas continuer à dépenser du calcul sur un compte déjà sous attaque.
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).json({
      error: "Compte temporairement bloqué après plusieurs échecs de connexion. Réessayez dans quelques minutes.",
    });
  }

  // On compare toujours contre un hash (le sien, ou un hash factice si
  // l'email n'existe pas) : sinon répondre nettement plus vite quand l'email
  // est inconnu permettrait de deviner quels emails sont enregistrés.
  const passwordOk = await comparePassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    if (user) {
      // Compte existant : on compte l'échec, et on bloque temporairement au
      // 5e échec consécutif (le compteur repart alors de zéro pour le blocage
      // suivant, une fois celui-ci expiré).
      await pool.query(
        `UPDATE users SET
           failed_login_attempts = CASE WHEN failed_login_attempts + 1 >= $2 THEN 0 ELSE failed_login_attempts + 1 END,
           locked_until = CASE WHEN failed_login_attempts + 1 >= $2 THEN now() + $3::interval ELSE locked_until END
         WHERE id = $1`,
        [user.id, MAX_FAILED_ATTEMPTS, LOCK_DURATION]
      );
    }
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await pool.query(
    "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1",
    [user.id]
  );

  // Jeton plus court pour un compte pharmacien/admin (voir signToken) ; et
  // une alerte lui est envoyée à chaque connexion, pour qu'il sache tout de
  // suite si ce n'est pas lui qui vient d'entrer.
  const expiresIn = user.role === "user" ? "30d" : "7d";
  const token = signToken({ sub: user.id, role: user.role }, expiresIn);
  if (user.role !== "user") {
    void pushLoginAlert(user.id, { ip: req.ip ?? "IP inconnue" });
  }
  delete user.password_hash;
  delete user.locked_until;
  res.json({ token, user });
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

// Permet à un compte de changer lui-même son mot de passe (jusqu'ici, seul
// un accès direct à la base le permettait — ce qui avait bloqué la
// pharmacienne hors de son propre compte en cas de doute).
authRouter.post("/change-password", requireAuth, authLimiter, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { currentPassword, newPassword } = parsed.data;

  const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user!.sub]);
  if (!result.rowCount) return res.status(404).json({ error: "Not found" });

  const ok = await comparePassword(currentPassword, result.rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "Mot de passe actuel incorrect." });

  const newHash = await hashPassword(newPassword);
  await pool.query(
    "UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2",
    [newHash, req.user!.sub]
  );
  res.status(204).end();
});
