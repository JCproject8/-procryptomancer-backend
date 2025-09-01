import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(cors());
app.use(helmet());
app.use(express.json());

// Limite des requêtes (anti-DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requêtes par IP
});
app.use(limiter);

// Route test
app.get("/", (req, res) => {
  res.json({ message: "✅ ProCryptomancer Backend fonctionne !" });
});

// Exemple d’API crypto (CoinGecko)
app.get("/price/:id", async (req, res) => {
  try {
    const { default: axios } = await import("axios");
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${req.params.id}&vs_currencies=usd`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du prix" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
