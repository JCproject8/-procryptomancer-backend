// server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// --- Vérification basique ---
app.get("/", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "up" });
});

// --- "Mini base de données" en mémoire ---
const users = new Map();

// --- Inscription ---
app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email et password requis" });
  }

  if (users.has(email)) {
    return res.status(400).json({ error: "utilisateur déjà existant" });
  }

  users.set(email, password);
  return res.json({ message: "Inscription réussie" });
});

// --- Connexion ---
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email et password requis" });
  }

  if (!users.has(email) || users.get(email) !== password) {
    return res.status(401).json({ error: "identifiants invalides" });
  }

  return res.json({ message: "Connexion réussie" });
});

// --- Lancement du serveur ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
});
