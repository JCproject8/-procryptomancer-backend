// contest.routes.js — version ESM
import express from "express";
const router = express.Router();

// Créer un concours
router.post("/create", (req, res) => {
  const { title, reward } = req.body || {};
  if (!title || !reward) {
    return res.status(400).json({ error: "Missing fields" });
  }
  res.json({ message: "Contest created", title, reward });
});

// Rejoindre un concours
router.post("/join", (req, res) => {
  const { user } = req.body || {};
  if (!user) {
    return res.status(400).json({ error: "Missing user" });
  }
  res.json({ message: `${user} joined the contest` });
});

export default router;
