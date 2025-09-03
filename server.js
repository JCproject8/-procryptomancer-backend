// server.js — API Express + MongoDB + Swagger (Render-ready)
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";

import contestRoutes from "./contest.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ----- CORS (whitelist via env CORS_ORIGINS, séparées par des virgules) -----
const allowed = (process.env.CORS_ORIGINS || "*")
  .split(",").map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // outils type curl/postman
    if (allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true
};

// ----- Middlewares -----
app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("tiny"));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));

// ----- Swagger minimal -----
const swaggerSpec = {
  openapi: "3.0.3",
  info: { title: "ProCryptomancer API", version: "1.1.0" },
  servers: [{ url: "/" }],
  paths: {
    "/": {
      get: {
        summary: "Ping",
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/health": {
      get: {
        summary: "Health API + DB",
        responses: { "200": { description: "Healthy" } }
      }
    },
    "/api/contest": {
      get: {
        summary: "Infos du concours",
        responses: { "200": { description: "Contest info" } }
      }
    },
    "/api/contest/submissions": {
      get: {
        summary: "Lister les soumissions",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "page",  in: "query", schema: { type: "integer" } }
        ],
        responses: { "200": { description: "List" } }
      },
      post: {
        summary: "Créer une soumission (alias /contest/submit)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  wallet:   { type: "string" },
                  pnl:      { type: "number" },
                  score:    { type: "number" },
                  txHash:   { type: "string" },
                  note:     { type: "string" }
                },
                required: ["username"]
              }
            }
          }
        },
        responses: { "201": { description: "Created" }, "400": { description: "Bad Request" } }
      }
    },
    "/api/contest/submit": {
      post: { summary: "Créer une soumission", responses: { "201": { description: "Created" } } }
    },
    "/api/contest/submissions/{id}": {
      delete: {
        summary: "Supprimer une soumission (X-Admin-Token)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Forbidden" } }
      }
    }
  }
};
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ----- Routes -----
app.get("/", (_req, res) => res.status(200).send("OK - ProCryptomancer API up"));
app.use("/api", contestRoutes);

// ----- MongoDB (optionnel mais recommandé) -----
const mongoUri = process.env.MONGODB_URI;

if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));
} else {
  console.warn("MONGODB_URI non défini — la DB est désactivée (les routes persistance renverront 503).");
}

// ----- Start -----
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
});
