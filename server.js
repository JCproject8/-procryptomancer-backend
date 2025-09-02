// server.js — ProCryptomancer API (Node 18+, ESM)
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import morgan from "morgan";
import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

/* ---------- Config ---------- */
const {
  PORT = 3000,
  MONGO_URI = "",
  JWT_SECRET = "",
  REFRESH_SECRET = "",
  JWT_EXPIRES_IN = "15m",
  REFRESH_EXPIRES = "7d",
  CLIENT_ORIGIN = "", // ex: "https://procryptomancer.com,https://www.procryptomancer.com"
} = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.warn("⚠️  MONGO_URI et JWT_SECRET sont requis (variables d'environnement).");
}

const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json());
app.use(morgan("tiny"));

/* CORS : si CLIENT_ORIGIN non défini → * (dev) */
const allowedOrigins = CLIENT_ORIGIN
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("CORS not allowed"), false);
      }
    },
    credentials: true,
  })
);

/* Rate limits */
const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use(globalLimiter);

/* ---------- DB & Models ---------- */
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    refreshHash: { type: String, default: null }, // hash du refresh token en base
    favorites: { type: [String], default: [] }, // coin IDs (ex: "bitcoin", "ethereum")
  },
  { timestamps: true }
);
UserSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", UserSchema);

/* ---------- Utils Auth ---------- */
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

const signAccess = (userId) =>
  jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const signRefresh = (userId, tokenId) =>
  jwt.sign({ sub: String(userId), tid: tokenId }, REFRESH_SECRET || JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });

const requireAuth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "non autorisé" });
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "token invalide/expiré" });
  }
};

/* ---------- Health & root ---------- */
app.get("/", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) =>
  res.json({
    status: "up",
    region: process.env.RENDER_REGION || "local",
    ts: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  })
);

/* ---------- Auth ---------- */
app.post("/api/auth/signup", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
    if (!isEmail || !password || String(password).trim().length < 6) {
      return res.status(400).json({ error: "email ou mot de passe invalide" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "utilisateur déjà existant" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), passwordHash });

    const tokenId = crypto.randomUUID();
    const accessToken = signAccess(user._id);
    const refreshToken = signRefresh(user._id, tokenId);
    user.refreshHash = sha256(refreshToken);
    await user.save();

    return res.status(201).json({
      message: "Inscription réussie",
      user: { id: user._id, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Signup error", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "email et password requis" });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ error: "identifiants invalides" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "identifiants invalides" });

    const tokenId = crypto.randomUUID();
    const accessToken = signAccess(user._id);
    const refreshToken = signRefresh(user._id, tokenId);
    user.refreshHash = sha256(refreshToken);
    await user.save();

    return res.json({
      message: "Connexion réussie",
      user: { id: user._id, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/auth/refresh", authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: "refreshToken requis" });

    const payload = jwt.verify(refreshToken, REFRESH_SECRET || JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.refreshHash) return res.status(401).json({ error: "invalide" });

    if (user.refreshHash !== sha256(refreshToken))
      return res.status(401).json({ error: "invalide" });

    // Rotation du refresh token
    const newTid = crypto.randomUUID();
    const accessToken = signAccess(user._id);
    const newRefresh = signRefresh(user._id, newTid);
    user.refreshHash = sha256(newRefresh);
    await user.save();

    return res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    console.error("Refresh error", err.message);
    return res.status(401).json({ error: "refresh invalide/expiré" });
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $set: { refreshHash: null } });
    return res.json({ message: "Déconnecté" });
  } catch {
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: "introuvable" });
  return res.json({ id: user._id, email: user.email, favorites: user.favorites || [] });
});

/* ---------- Favoris (routes protégées) ---------- */
app.get("/api/favorites", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).lean();
  return res.json({ favorites: user?.favorites || [] });
});

app.post("/api/favorites", requireAuth, async (req, res) => {
  const { coinId } = req.body || {};
  if (!coinId || typeof coinId !== "string")
    return res.status(400).json({ error: "coinId requis" });

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "introuvable" });

  if (!user.favorites.includes(coinId)) user.favorites.push(coinId);
  await user.save();
  return res.status(201).json({ favorites: user.favorites });
});

app.delete("/api/favorites/:coinId", requireAuth, async (req, res) => {
  const { coinId } = req.params;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "introuvable" });

  user.favorites = (user.favorites || []).filter((c) => c !== coinId);
  await user.save();
  return res.json({ favorites: user.favorites });
});

/* ---------- Marché (CoinGecko proxy + cache 60s) ---------- */
const cache = new Map();
const getCache = (key) => {
  const v = cache.get(key);
  if (!v || v.expires < Date.now()) return null;
  return v.data;
};
const setCache = (key, data, ttlMs = 60_000) =>
  cache.set(key, { data, expires: Date.now() + ttlMs });

app.get("/api/market/top", async (req, res) => {
  try {
    const vs = (req.query.vs || "usd").toString();
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const key = `top:${vs}:${limit}`;

    const cached = getCache(key);
    if (cached) return res.json({ cached: true, data: cached });

    const url = "https://api.coingecko.com/api/v3/coins/markets";
    const { data } = await axios.get(url, {
      params: {
        vs_currency: vs,
        order: "market_cap_desc",
        per_page: limit,
        page: 1,
        sparkline: false,
        price_change_percentage: "24h",
      },
      timeout: 10_000,
    });

    setCache(key, data, 60_000);
    return res.json({ cached: false, data });
  } catch (err) {
    console.error("Market error", err.message);
    return res.status(502).json({ error: "Market provider indisponible" });
  }
});

/* ---------- 404 & erreurs ---------- */
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Erreur serveur" });
});

/* ---------- Start ---------- */
async function start() {
  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGO_URI, { autoIndex: true });
      console.log("✅ MongoDB connecté");
    }
    app.listen(PORT, () => console.log(`✅ API démarrée sur le port ${PORT}`));
  } catch (err) {
    console.error("❌ Impossible de démarrer:", err);
    process.exit(1);
  }
}
start();

/* Graceful shutdown */
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
