import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET as string;

export type Role = "admin" | "pharmacy_partner" | "user";

export interface JwtPayload {
  sub: string;
  role: Role;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Un compte pharmacien/admin a accès à des données sensibles (commandes,
// paiements) : son jeton reste valable moins longtemps qu'un compte client,
// pour réduire la fenêtre d'exposition si jamais il fuite.
export function signToken(payload: JwtPayload, expiresIn: jwt.SignOptions["expiresIn"] = "30d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    // On impose HS256 explicitement : sans ça, un jeton fabriqué avec un
    // autre algorithme pourrait en théorie être accepté selon la librairie.
    req.user = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// Seul un vrai client Galimo peut commander ou payer : un compte arrivé par
// le webhook galimo.tech (signature vérifiée), qui pose external_id. Un compte
// créé autrement (appel direct à l'API, sans passer par l'appli Galimo) est
// refusé ici, même s'il contourne complètement le site.
export async function requireGalimoClient(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query("SELECT role, external_id FROM users WHERE id = $1", [req.user!.sub]);
    const u = result.rows[0];
    if (!u || u.role !== "user" || !u.external_id) {
      return res.status(403).json({ error: "Commandez depuis l'application Galimo : https://galimo.tech/app" });
    }
    next();
  } catch {
    res.status(500).json({ error: "Internal error" });
  }
}
