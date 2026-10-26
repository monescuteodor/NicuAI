const chat = document.getElementById("chat");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const sendButton = document.getElementById("send");
const resetButton = document.getElementById("reset");

const SESSION_KEY = "nicu-session";

function loadSessionId() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function saveSessionId(id) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // stocarea poate fi blocată; conversația merge și fără ea
  }
}

let sessionId = loadSessionId();

function addMessage(role, text = "") {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  chat.append(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

async function greet() {
  chat.replaceChildren();
  try {
    const res = await fetch("/api/greeting");
    const { greeting } = await res.json();
    addMessage("nicu", greeting);
  } catch {
    addMessage("nicu", "Alo! Nicu aici. Zi.");
  }
}

function setBusy(busy) {
  sendButton.disabled = busy;
  input.disabled = busy;
  if (!busy) input.focus();
}

async function send(text) {
  addMessage("user", text);
  const reply = addMessage("nicu");
  reply.classList.add("typing");
  setBusy(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId }),
    });

    if (!res.ok || !res.body) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error ?? "Mi-a picat semnalul. Mai zi o dată.");
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let split;
      while ((split = buffer.indexOf("\n\n")) !== -1) {
        handleEvent(buffer.slice(0, split), reply);
        buffer = buffer.slice(split + 2);
      }
    }
  } catch (err) {
    reply.classList.add("error");
    reply.textContent = err.message;
  } finally {
    reply.classList.remove("typing");
    setBusy(false);
  }
}

function handleEvent(raw, reply) {
  let event = "message";
  let data = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7);
    else if (line.startsWith("data: ")) data += line.slice(6);
  }
  const payload = data ? JSON.parse(data) : {};

  if (event === "session") {
    sessionId = payload.sessionId;
    saveSessionId(sessionId);
  } else if (event === "delta") {
    reply.textContent += payload.text;
    chat.scrollTop = chat.scrollHeight;
  } else if (event === "error") {
    throw new Error(payload.error);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  input.style.height = "";
  send(text);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", () => {
  input.style.height = "";
  input.style.height = `${input.scrollHeight}px`;
});

resetButton.addEventListener("click", async () => {
  if (sessionId) {
    fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
  }
  sessionId = null;
  saveSessionId(null);
  await greet();
  input.focus();
});

greet();
