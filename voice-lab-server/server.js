// MotoSafe Voice Lab — server for the helmet-simulator assistant (v2).
// Zero npm dependencies. Needs Node 18+ (built-in fetch / FormData).
//
//   node server.js
//
//   GET  /                 browser helmet simulator (index.html)
//   POST /api/chat         { message, history, tz }           → { reply }
//   POST /api/voice        multipart: audio (+tz, history, lang) → { transcript, reply }
//   GET  /api/health       what is configured
//   GET  /api/models       model names your LLM key can use
//
// Keys stay here in .env — never in the app or the browser.
// Any OpenAI-compatible provider works for the LLM (Gemini, Groq, OpenRouter).
// Speech-to-text uses an OpenAI-compatible Whisper endpoint (Groq has a free one).

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ── tiny .env loader ────────────────────────────────────────────────
try {
  const txt = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch (_) { /* no .env yet — /api/health will say so */ }

const PORT = Number(process.env.PORT) || 3000;

// LLM (answers)
const BASE = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const KEY = process.env.LLM_API_KEY || "";
const MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
const REASONING = process.env.LLM_REASONING_EFFORT || "";   // Gemini 2.5 only: "none" = faster

// STT (speech → text). Defaults to Groq Whisper; reuses the LLM key if it is also Groq.
const STT_BASE = (process.env.STT_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const STT_KEY = process.env.STT_API_KEY || (BASE === STT_BASE ? KEY : "");
const STT_MODEL = process.env.STT_MODEL || "whisper-large-v3-turbo";

const ACCESS_CODE = process.env.ACCESS_CODE || "";           // protects a public tunnel
const MAX_JSON = 20 * 1024;
const MAX_AUDIO = 5 * 1024 * 1024;
const TIMEOUT_MS = 25000;

// ── the assistant's personality ─────────────────────────────────────
function systemPrompt(tz) {
  let now;
  try {
    now = new Intl.DateTimeFormat("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(new Date());
  } catch (_) {
    tz = "UTC";
    now = new Date().toUTCString();
  }
  return [
    "You are MotoSafe, the voice assistant built into a motorcycle rider's helmet.",
    "Your answers are spoken aloud through the helmet speaker while the rider is riding, so:",
    "- Answer in one or two short sentences (under 40 words) unless the rider explicitly asks for more.",
    "- Plain spoken text only: no markdown, bullet points, emojis, links or special symbols.",
    "- Say numbers and units the way a person would say them out loud.",
    "- Reply in the language the rider used.",
    "- Never encourage speeding or any unsafe riding.",
    "- You cannot yet control navigation, calls or messages, and you do not know the rider's location or live weather. If asked, say so briefly instead of guessing.",
    `The current local date and time is ${now} (timezone ${tz}).`,
  ].join("\n");
}

function cleanForSpeech(s) {
  return String(s || "").replace(/https?:\/\/\S+/g, "").replace(/[*_`#>~|]/g, "").replace(/\s+/g, " ").trim();
}

// Whisper sometimes "hears" these on silence/noise. Treat them as nothing said.
const WHISPER_GHOSTS = /^(thank you\.?|thanks\.?|thanks for watching\.?|you\.?|bye\.?|\.+|)$/i;

// ── helpers ─────────────────────────────────────────────────────────
function send(res, code, obj) {
  const isHtml = typeof obj === "string";
  res.writeHead(code, {
    "content-type": isHtml ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, x-access-code",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "cache-control": "no-store",
  });
  res.end(isHtml ? obj : JSON.stringify(obj));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { const e = new Error("Request too large."); e.status = 413; reject(e); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Minimal multipart/form-data parser (what React Native FormData sends).
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!m) { const e = new Error("Expected multipart/form-data."); e.status = 400; throw e; }
  const boundary = Buffer.from("--" + (m[1] || m[2]).trim());
  const fields = {}, files = {};
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    let start = pos + boundary.length;
    if (buf.subarray(start, start + 2).toString() === "--") break;      // closing boundary
    start += 2;                                                          // skip CRLF after boundary
    const next = buf.indexOf(boundary, start);
    if (next === -1) break;
    const part = buf.subarray(start, next - 2);                          // drop CRLF before next boundary
    const hdrEnd = part.indexOf("\r\n\r\n");
    if (hdrEnd !== -1) {
      const head = part.subarray(0, hdrEnd).toString("utf8");
      const body = part.subarray(hdrEnd + 4);
      const name = /name="([^"]*)"/i.exec(head)?.[1];
      const filename = /filename="([^"]*)"/i.exec(head)?.[1];
      const type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1];
      if (name) {
        if (filename !== undefined) files[name] = { filename, type, data: Buffer.from(body) };
        else fields[name] = body.toString("utf8");
      }
    }
    pos = next;
  }
  return { fields, files };
}

function authorized(req) {
  return !ACCESS_CODE || req.headers["x-access-code"] === ACCESS_CODE;
}

function upstreamError(status, detail, what) {
  const msg =
    status === 429 ? `The free ${what} quota is used up for now (rate limited). Wait a minute or switch provider in .env.`
    : status === 401 || status === 403 ? `The ${what} service rejected the API key. Check your key in .env.`
    : status === 404 ? `${what} model or URL not found — check the model/base URL in .env. (${detail})`
    : `${what} error ${status}: ${detail}`;
  const e = new Error(msg);
  e.status = 502;
  return e;
}

async function withTimeout(fn) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try { return await fn(ctl.signal); }
  catch (e) {
    if (e.name === "AbortError") { const t = new Error("The AI service took too long to answer."); t.status = 504; throw t; }
    throw e;
  } finally { clearTimeout(timer); }
}

async function callLLM(messages) {
  const payload = { model: MODEL, messages, temperature: 0.5, max_tokens: 1000 };
  if (REASONING) payload.reasoning_effort = REASONING;
  return withTimeout(async (signal) => {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
      body: JSON.stringify(payload), signal,
    });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch (_) { j = null; }
    if (!r.ok) throw upstreamError(r.status, (j && (j.error?.message || j[0]?.error?.message)) || text.slice(0, 200), "LLM");
    const out = j?.choices?.[0]?.message?.content;
    if (!out) { const e = new Error("The LLM returned an empty reply."); e.status = 502; throw e; }
    return out;
  });
}

async function transcribe(file, lang) {
  const fd = new FormData();
  fd.append("file", new Blob([file.data], { type: file.type || "audio/m4a" }), file.filename || "speech.m4a");
  fd.append("model", STT_MODEL);
  fd.append("response_format", "json");
  fd.append("temperature", "0");
  if (/^[a-z]{2}$/.test(lang || "")) fd.append("language", lang);
  return withTimeout(async (signal) => {
    const r = await fetch(`${STT_BASE}/audio/transcriptions`, {
      method: "POST", headers: { authorization: `Bearer ${STT_KEY}` }, body: fd, signal,
    });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch (_) { j = null; }
    if (!r.ok) throw upstreamError(r.status, (j && (j.error?.message || j.message)) || text.slice(0, 200), "speech-to-text");
    return String(j?.text || "").trim();
  });
}

async function answer(message, historyIn, tz) {
  const history = (Array.isArray(historyIn) ? historyIn : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  const raw = await callLLM([
    { role: "system", content: systemPrompt(String(tz || "UTC")) },
    ...history,
    { role: "user", content: message },
  ]);
  return cleanForSpeech(raw) || "Sorry, I don't have an answer for that.";
}

// ── routes ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  console.log(new Date().toLocaleTimeString(), req.method, url.pathname);
  try {
    if (req.method === "OPTIONS") return send(res, 204, "");

    if (req.method === "GET" && url.pathname === "/") {
      return send(res, 200, fs.readFileSync(path.join(__dirname, "index.html"), "utf8"));
    }
    if (url.pathname === "/favicon.ico") return send(res, 204, "");

    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(res, 200, {
        ok: true, model: MODEL, base: BASE, hasKey: !!KEY,
        stt: { model: STT_MODEL, hasKey: !!STT_KEY }, needsCode: !!ACCESS_CODE,
      });
    }

    if (!authorized(req)) return send(res, 401, { error: "Wrong or missing access code." });

    if (req.method === "GET" && url.pathname === "/api/models") {
      const r = await fetch(`${BASE}/models`, { headers: { authorization: `Bearer ${KEY}` } });
      const j = await r.json().catch(() => ({}));
      return send(res, r.status, { models: (j.data || j.models || []).map((m) => m.id || m.name) });
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      if (!KEY) return send(res, 500, { error: "No LLM_API_KEY yet. Copy .env.example to .env and paste your key." });
      let body;
      try { body = JSON.parse((await readBody(req, MAX_JSON)).toString("utf8")); } catch (e) { return send(res, e.status || 400, { error: e.message || "Bad request." }); }
      const message = String(body.message || "").trim().slice(0, 800);
      if (!message) return send(res, 400, { error: "Empty message." });
      const t0 = Date.now();
      const reply = await answer(message, body.history, body.tz);
      console.log(`[chat ] ${Date.now() - t0} ms  "${message}" -> "${reply}"`);
      return send(res, 200, { reply, ms: Date.now() - t0, model: MODEL });
    }

    if (req.method === "POST" && url.pathname === "/api/voice") {
      if (!KEY) return send(res, 500, { error: "No LLM_API_KEY yet. Copy .env.example to .env and paste your key." });
      if (!STT_KEY) return send(res, 500, { error: "No speech-to-text key. Set STT_API_KEY (a free Groq key works) in .env." });
      const raw = await readBody(req, MAX_AUDIO);
      const { fields, files } = parseMultipart(raw, req.headers["content-type"]);
      const audio = files.audio;
      if (!audio || audio.data.length < 800) return send(res, 200, { transcript: "", reply: "", ms: 0 });

      const t0 = Date.now();
      const transcript = await transcribe(audio, fields.lang);
      const sttMs = Date.now() - t0;
      if (WHISPER_GHOSTS.test(transcript)) {
        console.log(`[voice] ${sttMs} ms  (nothing heard: "${transcript}")`);
        return send(res, 200, { transcript: "", reply: "", ms: sttMs });
      }
      let history = [];
      try { history = JSON.parse(fields.history || "[]"); } catch (_) {}
      const reply = await answer(transcript.slice(0, 800), history, fields.tz);
      const total = Date.now() - t0;
      console.log(`[voice] stt ${sttMs} ms + llm ${total - sttMs} ms  "${transcript}" -> "${reply}"`);
      return send(res, 200, { transcript, reply, ms: total, stt_ms: sttMs, model: MODEL });
    }

    send(res, 404, { error: "Not found." });
  } catch (e) {
    console.error("[error]", e.message);
    send(res, e.status || 500, { error: e.message || "Server error." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("\nMotoSafe Voice Lab is running.\n");
  console.log(`  This computer :  http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === "IPv4" && !i.internal) console.log(`  For the app   :  http://${i.address}:${PORT}   <- put this in the Voice screen's server box`);
    }
  }
  console.log(`\n  LLM : ${MODEL} @ ${BASE}  ${KEY ? "(key found)" : "(NO KEY — create .env)"}`);
  console.log(`  STT : ${STT_MODEL} @ ${STT_BASE}  ${STT_KEY ? "(key found)" : "(NO KEY)"}\n`);
});
