import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

// route test
app.get("/", (req, res) => {
  res.send("✅ ProCryptomancer backend en ligne !");
});

// exemple route API (CoinGecko)
app.get("/api/prices", async (req, res) => {
  try {
    const { data } = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 10,
        page: 1,
        sparkline: false
      }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Erreur API CoinGecko" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur le port ${PORT}`);
});
