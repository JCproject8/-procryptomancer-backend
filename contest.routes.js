// contest.routes.js — routes de l'API (ESM)
import { Router } from "express";
const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "healthy", ts: Date.now() });
});

router.get("/contest", (_req, res) => {
  res.json({
    name: "Crypto Contest #1",
    status: "open",
    rules: "Submit your trades; highest PnL wins."
  });
});

router.post("/contest/submit", (req, res) => {
  const payload = req.body || {};
  res.status(201).json({ ok: true, received: payload });
});

export default router;
