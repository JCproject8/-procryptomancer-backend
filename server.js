// server.js (ESM)

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// --- App & middlewares ---
const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// --- Limite anti-abus ---
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 requêtes / minute
});
app.use(limiter);

// --- Routes de vérification ---
app.get("/", (_req, res) => {
  return res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  return res.json({ status: "up" });
});

// --- "Mini base de données" en mémoire ---
// ⚠️ Démo seulement : à remplacer par MongoDB/Postgres pour la prod
const users = new Map(); // key: email, value: { email, password }

// Helpers simples
const isValidEmail = (email = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

const isStrongPassword = (pwd = "") =>
  String(pwd).trim().length >= 6;

// --- Auth: Signup ---
app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email et password requis" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "email invalide" });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: "mot de passe trop court (min 6 caractères)" });
  }
  if (users.has(email)) {
    return res.status(409).json({ error: "utilisateur déjà existant" });
  }

  // Démo: stockage en clair ⚠️ à remplacer par hash (bcrypt) en prod
  users.set(email, { email, password });

  return res.status(201).json({
    message: "Inscription réussie",
    user: { email },
  });
});

// --- Auth: Login ---
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email et password requis" });
  }

  const user = users.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "identifiants invalides" });
  }

  // Token démo (base64 de l’email) → en prod: JWT signé
  const token = Buffer.from(email).toString("base64");

  return res.json({
    message: "Connexion réussie",
    token,
    user: { email },
  });
});

// --- Gestion 404 ---
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Gestion erreurs serveur ---
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Erreur serveur" });
});

// --- Démarrage ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API démarrée sur le port ${PORT}`);
});
