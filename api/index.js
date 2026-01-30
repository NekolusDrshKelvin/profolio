import express from "express";
import cors from "cors";
import fs from "fs";
import crypto from "crypto";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// NOTE: /tmp is writable on Vercel, but resets sometimes
const DB_FILE = "/tmp/messages.json";

function readDb() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}
function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get("/api/health", (req, res) => res.json({ status: "OK" }));
app.get("/api/messages", (req, res) => res.json({ items: readDb() }));

app.post("/api/messages", (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || name.trim().length < 2) return res.status(400).json({ message: "Name min 2 chars" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return res.status(400).json({ message: "Invalid email" });
  if (!message || message.trim().length < 10) return res.status(400).json({ message: "Message min 10 chars" });

  const db = readDb();
  const item = { id: crypto.randomUUID(), name, email, message, createdAt: new Date().toISOString() };
  db.push(item);
  writeDb(db);
  res.status(201).json({ ok: true, item });
});

export default app;
