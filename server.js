import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import { GREETING, SYSTEM_PROMPT } from "./src/nicu.js";

const PORT = Number(process.env.PORT ?? 3000);
const MODEL = process.env.NICU_MODEL ?? "claude-opus-5-5";
const EFFORT = process.env.NICU_EFFORT ?? "low";
const MAX_MESSAGE_CHARS = 4000;
const MAX_TURNS = 100;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const here = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic();

// Conversațiile stau în memorie, pe server. Istoricul e păstrat exact cum vine
// de la API (inclusiv blocurile de thinking) și doar i se adaugă mesaje la
// coadă, niciodată nu se editează.
/** @type {Map<string, {messages: Anthropic.Beta.BetaMessageParam[], busy: boolean, touchedAt: number}>} */
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
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: EFFORT },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: session.messages,
      cache_control: { type: "ephemeral" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    stream.on("text", (delta) => send("delta", { text: delta }));
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      // Mesajul refuzat nu rămâne în istoric, ca să se poată continua normal.
      session.messages.pop();
      send("delta", { text: "Lasă, despre asta nu discut. Altceva?" });
    } else {
      session.messages.push({ role: "assistant", content: message.content });
    }
    send("done", {});
  } catch (err) {
    session.messages.pop();
    console.error(err);
    const msg =
      err instanceof Anthropic.AuthenticationError
        ? "Lipsește cheia API. Pune ANTHROPIC_API_KEY în fișierul .env."
        : err instanceof Anthropic.RateLimitError
          ? "E coadă mare la Nicu acum. Mai încearcă un pic mai târziu."
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

app.listen(PORT, () => {
  console.log(`Nicu AI ascultă pe http://localhost:${PORT}`);
});
