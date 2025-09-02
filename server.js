// server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// --- Vérification basique ---
app.get("/", (req, res) => res.send("✅ Backend ProCryptomancer actif"));
app.get("/api/health", (req, res) => res.json({ ok: true }));

// --- "Mini base de données" en mémoire (juste pour tester) ---
const users = new Map();

// Inscription
app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email et password requis" });
  }
  if (users.has(email)) {
    return res.status(409).json({ error: "utilisateur déjà existant" });
  }

  users.set(email, { email, password });
  const token = "demo-" + Buffer.from(email).toString("base64");
  return res.status(201).json({ message: "utilisateur créé", email, token });
});

// Connexion
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = users.get(email);
  if (!u || u.password !== password) {
    return res.status(401).json({ error: "identifiants invalides" });
  }

  const token = "demo-" + Buffer.from(email).toString("base64");
  return res.json({ message: "connecté", email, token });
});

// Profil utilisateur
app.get("/api/me", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token.startsWith("demo-")) {
    return res.status(401).json({ error: "token manquant ou invalide" });
  }

  const email = Buffer.from(token.replace("demo-", ""), "base64").toString("utf8");
  if (!users.has(email)) {
    return res.status(401).json({ error: "utilisateur introuvable" });
  }

  res.json({ user: { email } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Serveur lancé sur le port " + PORT));
