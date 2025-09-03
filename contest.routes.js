// contest.routes.js — Routes API (ESM)
import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import { Submission } from "./contest.model.js";

const router = Router();

// Schémas de validation
const submitSchema = Joi.object({
  username: Joi.string().max(80).required(),
  wallet:   Joi.string().max(120).allow("", null),
  pnl:      Joi.number().default(0),
  score:    Joi.number().default(0),
  txHash:   Joi.string().max(120).allow("", null),
  note:     Joi.string().max(500).allow("", null)
});

// Health dédié API
router.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({
    status: "healthy",
    db: ["disconnected","connected","connecting","disconnecting"][dbState] || "unknown",
    ts: Date.now()
  });
});

// Infos de concours (exemple statique)
router.get("/contest", (_req, res) => {
  res.json({
    name: "Crypto Contest #1",
    status: "open",
    rules: "Poste ta performance (PnL/score). Top classement gagne.",
    endpoints: {
      list: "/api/contest/submissions",
      submit: "/api/contest/submit"
    }
  });
});

// Créer une soumission
router.post("/contest/submit", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ ok: false, error: "Database not connected" });
  }
  const { value, error } = submitSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ ok: false, error: error.details[0].message });

  const doc = await Submission.create(value);
  res.status(201).json({ ok: true, submission: doc });
});

// Lister les soumissions (avec pagination simple)
router.get("/contest/submissions", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
  const page  = Math.max(parseInt(req.query.page  || "1", 10), 1);
  const skip  = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Submission.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Submission.countDocuments()
  ]);

  res.json({ ok: true, page, limit, total, items });
});

// (Optionnel) Supprimer une soumission — protégé par token admin
router.delete("/contest/submissions/:id", async (req, res) => {
  const token = req.header("X-Admin-Token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  const { id } = req.params;
  const removed = await Submission.findByIdAndDelete(id);
  if (!removed) return res.status(404).json({ ok: false, error: "Not found" });
  res.json({ ok: true, removedId: id });
});

export default router;
