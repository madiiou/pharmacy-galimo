import rateLimit from "express-rate-limit";

// Appliqué après app.set("trust proxy", ...) dans index.ts : sans ça, toutes
// les requêtes passent par la même IP interne (celle de nginx) et une limite
// par IP ne limiterait personne en particulier, ou tout le monde à la fois.

// Connexion / inscription : cible la création de comptes en masse et le
// brute-force de mot de passe (la série "idorcheck1@, idorcheck2@, ..." du
// 2026-10-01 a créé 18 comptes en quelques heures sans aucune limite).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans quelques minutes." },
});

// Création de commande : cible le spam de commandes factices (38 commandes
// "En attente" créées par un seul script, encombrant le tableau de bord
// de la pharmacie).
export const orderCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de commandes créées. Réessayez dans quelques minutes." },
});

// Paiement : la route la plus sensible (déclenche un vrai débit chez Galimo
// à chaque appel) — limite la plus stricte, par IP.
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de paiement. Réessayez dans quelques minutes." },
});

// Scan de médicament : appelle une API payante (OpenAI Vision) à chaque
// requête — une limite plus stricte protège directement contre un coût réel.
export const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de scans. Réessayez dans quelques minutes." },
});
