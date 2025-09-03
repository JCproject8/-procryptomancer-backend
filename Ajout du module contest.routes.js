// contest.model.js — Modèle Mongoose pour les soumissions
import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true, required: true, maxlength: 80 },
    wallet:   { type: String, trim: true, maxlength: 120 },
    pnl:      { type: Number, default: 0 },     // profit & loss
    score:    { type: Number, default: 0 },     // autre métrique si tu veux
    txHash:   { type: String, trim: true, maxlength: 120 },
    note:     { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

export const Submission = mongoose.models.Submission || mongoose.model("Submission", SubmissionSchema);
