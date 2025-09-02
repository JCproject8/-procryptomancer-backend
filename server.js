// server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// --- Vérif basique / health ---
app.get("/", (req, res) => res.json({ ok: true }));
app.get("/api/health", (req, res) => res.json({ status: "up" }));

// --- "Mini base de données" en mémoire ---
const users = new Map();

// --- Inscription ---
app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  if (users.has(email)) {
    return res.status(409).json({ error: "Utilisateur déjà existant" });
  }
  users.set(email, password);
  return res.status(201).json({ success: true, email });
});

// --- Connexion ---
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  const stored = users.get(email);
  if (!stored) {
    return res.status(404).json({ error: "Utilisateur non trouvé" });
  }
  if (stored !== password) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  return res.json({ success: true, message: "Connexion réussie", email });
});

// 404 par défaut
app.use((req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
