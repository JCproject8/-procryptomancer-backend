// server.js (ESM)

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// === Initialisation App & Middlewares ===
const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// Limite anti-abus (120 requêtes/minute)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
});
app.use(limiter);

// === Routes de test / monitoring ===
app.get("/", (_req, res) => {
  return res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  return res.json({ status: "up" });
});

// === "Mini base de données" en mémoire ===
// ⚠️ Pour la démo uniquement (les données disparaissent au redémarrage)
const users = new Map(); // clé: email, valeur: { email, password }

// Helpers de validation simples
const isValidEmail = (email = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
const isStrongPassword = (pwd = "") => String(pwd).trim().length >= 6;

// === Auth: Signup ===
app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email et password requis" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "email invalide" });
  }
  if (!isStrongPassword(password)) {
    return res
      .status(400)
      .json({ error: "mot de passe trop court (min 6 caractères)" });
  }
  if (users.has(email)) {
    return res.status(409).json({ error: "utilisateur déjà existant" });
  }

  // Démo: mot de passe stocké en clair (⚠️ NE PAS FAIRE en prod)
  users.set(email, { email, password });

  return res.status(201).json({
    message: "Inscription réussie",
    user: { email },
  });
});

// === Auth: Login ===
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "email et password requis" });
  }

  const user = users.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "identifiants invalides" });
  }

  // Démo: Token basique (base64 de l'email)
  // ⚠️ En prod: utiliser un vrai JWT signé
  const token = Buffer.from(email).toString("base64");

  return res.json({
    message: "Connexion réussie",
    token,
    user: { email },
  });
});

// === Gestion des erreurs ===
app.use((_req, res) =>
  res.status(404).json({ error: "Not found" })
);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Erreur serveur" });
});

// === Démarrage du serveur ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API démarrée sur le port ${PORT}`);
});
