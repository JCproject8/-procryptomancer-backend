// server.js — ultra simple, prêt pour Render (ESM)
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// 👇 AJOUT : import des routes concours
import contestRoutes from "./contest.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

// mini “base de données” en mémoire (démo)
const users = new Map();

// routes de test
app.get("/", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ status: "up" }));

// 👇 AJOUT : brancher le module concours
app.use("/api/contest", contestRoutes);

// signup (démo)
app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email et password requis" });
  if (users.has(email)) return res.status(409).json({ error: "utilisateur déjà existant" });
  if (String(password).trim().length < 6) return res.status(400).json({ error: "mot de passe trop court (min 6)" });
  users.set(email, { email, password });
  res.status(201).json({ message: "Inscription réussie", user: { email } });
});

// login (démo)
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email et password requis" });
  const u = users.get(email);
  if (!u || u.password !== password) return res.status(401).json({ error: "identifiants invalides" });
  const token = Buffer.from(email).toString("base64"); // démo (pas sécurisé)
  res.json({ message: "Connexion réussie", token, user: { email } });
});

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
// 500
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Erreur serveur" });
});

app.listen(PORT, () => {
  console.log(`✅ API démarrée sur le port ${PORT}`);
});
