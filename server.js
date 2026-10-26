import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Groq from "groq-sdk";
import express from "express";
import { GREETING, SYSTEM_PROMPT } from "./src/nicu.js";

const PORT = Number(process.env.PORT ?? 3000);
// 0.0.0.0 = accesibil din toată rețeaua locală. Pune HOST=127.0.0.1 ca să fie doar pe calculatorul tău.
const HOST = process.env.HOST ?? "0.0.0.0";
const MODEL = process.env.NICU_MODEL ?? "openai/gpt-oss-120b";
// Modelele care „gândesc” înainte să răspundă: nu vrem gândurile lor în chat.
const REASONING_MODEL = /gpt-oss|qwen3/.test(MODEL);
const REASONING_EFFORT = /gpt-oss/.test(MODEL) ? (process.env.NICU_REASONING ?? "low") : undefined;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TURNS = 100;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const here = path.dirname(fileURLToPath(import.meta.url));
// Fără cheie, serverul pornește oricum și Nicu le spune utilizatorilor ce lipsește.
const client = new Groq({ apiKey: process.env.GROQ_API_KEY || "lipseste" });

// Conversațiile stau în memorie, pe server.
/** @type {Map<string, {messages: Groq.Chat.ChatCompletionMessageParam[], busy: boolean, touchedAt: number}>} */
const sessions = new Map();

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of sessions) {
    if (session.touchedAt < cutoff) sessions.delete(id);
  }
}, 10 * 60 * 1000).unref();

function getSession(id) {
  let session = typeof id === "string" ? sessions.get(id) : undefined;
  if (!session) {
    id = randomUUID();
    session = { messages: [], busy: false, touchedAt: Date.now() };
    sessions.set(id, session);
  }
  session.touchedAt = Date.now();
  return { id, session };
}

const app = express();
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(here, "public")));

app.get("/api/greeting", (_req, res) => {
  res.json({ greeting: GREETING });
});

app.post("/api/chat", async (req, res) => {
  const text = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!text) return res.status(400).json({ error: "Zi ceva, nu sta așa." });
  if (text.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ error: "Prea lung, frate. Zi-o mai scurt." });
  }

  const { id, session } = getSession(req.body?.sessionId);
  if (session.busy) {
    return res.status(429).json({ error: "Stai, că încă vorbesc. Ai răbdare." });
  }
  if (session.messages.length >= MAX_TURNS * 2) {
    return res.status(409).json({ error: "Am vorbit destul azi. Începe o conversație nouă." });
  }

  session.busy = true;
  session.messages.push({ role: "user", content: text });

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send("session", { sessionId: id });

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...session.messages],
      max_completion_tokens: 4096,
      stream: true,
      ...(REASONING_MODEL && { include_reasoning: false }),
      ...(REASONING_EFFORT && { reasoning_effort: REASONING_EFFORT }),
    });

    let reply = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        reply += delta;
        send("delta", { text: delta });
      }
    }

    if (reply) {
      session.messages.push({ role: "assistant", content: reply });
    } else {
      session.messages.pop();
      send("delta", { text: "Lasă, despre asta nu discut. Altceva?" });
    }
    send("done", {});
  } catch (err) {
    session.messages.pop();
    console.error(err);
    const msg =
      err instanceof Groq.AuthenticationError
        ? "Lipsește cheia API sau e greșită. Verifică GROQ_API_KEY în fișierul .env."
        : err instanceof Groq.RateLimitError
          ? "E coadă mare la Nicu acum. Mai încearcă peste un minut."
          : "Mi-a picat semnalul. Mai zi o dată.";
    send("error", { error: msg });
  } finally {
    session.busy = false;
    res.end();
  }
});

app.post("/api/reset", (req, res) => {
  if (typeof req.body?.sessionId === "string") sessions.delete(req.body.sessionId);
  res.json({ ok: true });
});

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => net.address);
}

app.listen(PORT, HOST, () => {
  console.log("Nicu AI a pornit.");
  console.log(`  Pe calculatorul ăsta:  http://localhost:${PORT}`);
  if (HOST === "0.0.0.0") {
    for (const address of lanAddresses()) {
      console.log(`  Din rețeaua locală:    http://${address}:${PORT}`);
    }
  }
  if (!process.env.GROQ_API_KEY) {
    console.log("\n  Atenție: lipsește GROQ_API_KEY din .env, Nicu nu va putea răspunde.");
  }
});
