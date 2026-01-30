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

// Vercel writable temp storage
const DB_FILE = "/tmp/messages.json";

function readDb() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

app.get("/api/messages", (req, res) => {
  const items = readDb()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ items });
});

app.post("/api/messages", (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || name.length < 2)
    return res.status(400).json({ message: "Name too short" });

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: "Invalid email" });

  if (!message || message.length < 10)
    return res.status(400).json({ message: "Message too short" });

  const db = readDb();
  const item = {
    id: crypto.randomUUID(),
    name,
    email,
    message,
    createdAt: new Date().toISOString()
  };

  db.push(item);
  writeDb(db);

  res.status(201).json({ ok: true, item });
});

export default app;
