import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { getBalance, getHistory } from "../galimoPartner.js";

export const galimoBalanceRouter = Router();

galimoBalanceRouter.get("/balance", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    res.json(await getBalance());
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Failed to fetch balance" });
  }
});

galimoBalanceRouter.get("/history", requireAuth, requireRole("admin"), async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 30;
  try {
    res.json(await getHistory(page, limit));
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Failed to fetch history" });
  }
});
