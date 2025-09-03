// server.js — prêt pour Render (ESM)
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import contestRoutes from "./contest.routes.js"; // ne pas changer le nom ni l'extension

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares de base (ordre safe)
app.use(express.json());
app.use(cors());
app.use(helmet());

// Limiteur très simple (évite des 429 trop agressifs)
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 120,            // 120 req/min/IP
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Route racine (utile pour tests & health checks)
app.get("/", (_req, res) => {
  res.status(200).send("OK - Contest API up");
});

// Routes de l'API
app.use("/api", contestRoutes);

// 1 seul listen, rien d'autre
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
});
