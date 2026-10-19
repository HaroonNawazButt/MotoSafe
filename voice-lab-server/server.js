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

// Internet look-ups ("who won the match", "dollar rate"): the main model hands these to a
// model that can search the web. Groq's "groq/compound-mini" does that. Set SEARCH_MODEL=off to disable.
const SEARCH_MODEL = process.env.SEARCH_MODEL || "groq/compound-mini";
const SEARCH_ON = SEARCH_MODEL.toLowerCase() !== "off";

// Weather: Open-Meteo is free and needs no key.
const WEATHER_BASE = (process.env.WEATHER_BASE_URL || "https://api.open-meteo.com").replace(/\/+$/, "");
const GEO_BASE = (process.env.GEOCODE_BASE_URL || "https://geocoding-api.open-meteo.com").replace(/\/+$/, "");
const DEFAULT_CITY = process.env.DEFAULT_CITY || "Lahore";   // used when the phone sends no location

const ACCESS_CODE = process.env.ACCESS_CODE || "";           // protects a public tunnel
const MAX_JSON = 20 * 1024;
const MAX_AUDIO = 5 * 1024 * 1024;
const TIMEOUT_MS = 25000;

// ── the assistant's personality ─────────────────────────────────────
function systemPrompt(tz, liveLines = []) {
  let now;
  try {
    now = new Intl.DateTimeFormat("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(new Date());
  } catch (_) {
    tz = "UTC";
    now = new Date().toUTCString();
  }
  const lines = [
    "You are MotoSafe, the voice assistant built into a motorcycle rider's helmet.",
    "Your answers are spoken aloud through the helmet speaker while the rider is riding, so:",
    "- Answer in one or two short sentences (under 40 words) unless the rider explicitly asks for more.",
    "- Plain spoken text only: no markdown, bullet points, emojis, links or special symbols.",
    "- Say numbers and units the way a person would say them out loud.",
    "- Reply in the language the rider used.",
    "- Never encourage speeding or any unsafe riding.",
    "- You cannot yet control navigation, calls or messages. If asked, say so briefly instead of guessing.",
    "- LIVE DATA below is measured right now. Use it for battery, weather and location questions and never contradict it. If something is not listed there, say you don't have it.",
  ];
  if (SEARCH_ON) {
    lines.push(
      "- If the question needs fresh facts from the internet that LIVE DATA does not contain (news, sports scores, prices, exchange rates, who currently holds a position, recent events), reply with exactly: [[SEARCH]] followed by a short English search query, and nothing else. Never use [[SEARCH]] for anything you can answer without the internet."
    );
  } else {
    lines.push("- You cannot look things up on the internet. For fresh facts you don't know, say so briefly.");
  }
  lines.push(`The current local date and time is ${now} (timezone ${tz}).`);
  if (liveLines.length) lines.push("LIVE DATA:", ...liveLines.map((l) => "- " + l));
  return lines.join("\n");
}

function cleanForSpeech(s) {
  return String(s || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── live data: what the phone knows + weather ───────────────────────
const num = (v, lo, hi) => (typeof v === "number" && isFinite(v) && v >= lo && v <= hi ? v : null);

// The app sends { phone:{battery,pluggedIn}, helmet:{battery,connected,fw}, loc:{lat,lon} }.
// Only numbers/booleans/short strings are accepted, so nothing from the app can inject text into the prompt.
function cleanContext(c) {
  const out = {};
  if (!c || typeof c !== "object") return out;
  if (c.phone && typeof c.phone === "object") {
    const b = num(c.phone.battery, 0, 100);
    if (b !== null) out.phone = { battery: Math.round(b), pluggedIn: c.phone.pluggedIn === true };
  }
  if (c.helmet && typeof c.helmet === "object") {
    out.helmet = {
      battery: num(c.helmet.battery, 0, 100) === null ? null : Math.round(c.helmet.battery),
      connected: c.helmet.connected === true,
    };
  }
  if (c.loc && typeof c.loc === "object") {
    const lat = num(c.loc.lat, -90, 90), lon = num(c.loc.lon, -180, 180);
    if (lat !== null && lon !== null) out.loc = { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
  }
  return out;
}

const WEATHER_WORDS = /\b(weather|temperature|forecast|raining|rain|humidity|humid|windy|wind speed|sunny|cloudy|storm|mausam|barish|how (hot|cold|warm)|will it rain|is it (hot|cold|raining))\b|موسم|بارش|گرمی|سردی/i;
const CODE_TEXT = {
  0: "clear sky", 1: "mostly clear", 2: "partly cloudy", 3: "overcast", 45: "foggy", 48: "foggy",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
  71: "light snow", 73: "snow", 75: "heavy snow", 80: "light showers", 81: "showers", 82: "heavy showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail",
};

async function getJson(url) {
  return withTimeout(async (signal) => {
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

// "weather in Karachi" → "Karachi"
function cityFromMessage(m) {
  const x = /\b(?:in|at|for|of)\s+([A-Za-z][A-Za-z .'-]{1,30}?)(?:\s+(?:today|tomorrow|now|right now|tonight|please)\b|[?.!,]|$)/i.exec(m);
  const city = x?.[1]?.trim();
  return city && !/^(the|my|this|that|here|it)$/i.test(city) ? city : null;
}

async function weatherLines(message, loc) {
  let lat, lon, place = "";
  const named = cityFromMessage(message);
  try {
    if (named) {
      const g = await getJson(`${GEO_BASE}/v1/search?name=${encodeURIComponent(named)}&count=1&language=en&format=json`);
      const hit = g?.results?.[0];
      if (hit) { lat = hit.latitude; lon = hit.longitude; place = hit.name; }
    }
    if (lat === undefined && loc) { lat = loc.lat; lon = loc.lon; place = "your location"; }
    if (lat === undefined) {
      const g = await getJson(`${GEO_BASE}/v1/search?name=${encodeURIComponent(DEFAULT_CITY)}&count=1&language=en&format=json`);
      const hit = g?.results?.[0];
      if (hit) { lat = hit.latitude; lon = hit.longitude; place = hit.name + " (default city, phone location unavailable)"; }
    }
    if (lat === undefined) return ["Weather: could not find that place."];
    const w = await getJson(
      `${WEATHER_BASE}/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
      `&timezone=auto&forecast_days=2`
    );
    const c = w.current || {}, d = w.daily || {};
    const out = [
      `Weather for ${place}: now ${Math.round(c.temperature_2m)} degrees Celsius (feels like ${Math.round(c.apparent_temperature)}), ` +
      `${CODE_TEXT[c.weather_code] || "unknown conditions"}, humidity ${Math.round(c.relative_humidity_2m)} percent, wind ${Math.round(c.wind_speed_10m)} kilometres per hour.`,
      `Today: high ${Math.round(d.temperature_2m_max?.[0])}, low ${Math.round(d.temperature_2m_min?.[0])}, ` +
      `chance of rain ${Math.round(d.precipitation_probability_max?.[0] ?? 0)} percent, ${CODE_TEXT[d.weather_code?.[0]] || "mixed"}.`,
      `Tomorrow: high ${Math.round(d.temperature_2m_max?.[1])}, low ${Math.round(d.temperature_2m_min?.[1])}, ` +
      `chance of rain ${Math.round(d.precipitation_probability_max?.[1] ?? 0)} percent, ${CODE_TEXT[d.weather_code?.[1]] || "mixed"}.`,
    ];
    return out;
  } catch (e) {
    console.log("[weather] failed:", e.message);
    return ["Weather: the weather service could not be reached right now."];
  }
}

async function liveLines(ctx, message) {
  const lines = [];
  if (ctx.phone) lines.push(`Phone battery: ${ctx.phone.battery} percent${ctx.phone.pluggedIn ? ", charging / plugged in" : ", not charging"}.`);
  else lines.push("Phone battery: unknown.");
  if (ctx.helmet) {
    if (!ctx.helmet.connected) lines.push("Helmet: not connected right now" + (ctx.helmet.battery !== null ? `, last known battery ${ctx.helmet.battery} percent.` : "; battery unknown."));
    else lines.push(ctx.helmet.battery !== null ? `Helmet battery: ${ctx.helmet.battery} percent (connected).` : "Helmet is connected but its battery level is unknown.");
  } else lines.push("Helmet: no data available.");
  if (WEATHER_WORDS.test(message)) lines.push(...(await weatherLines(message, ctx.loc)));
  return lines;
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

async function callLLM(messages, model = MODEL) {
  const payload = { model, messages, temperature: 0.5, max_tokens: 1000 };
  if (REASONING && model === MODEL) payload.reasoning_effort = REASONING;
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

async function answer(message, historyIn, tz, ctxIn) {
  const history = (Array.isArray(historyIn) ? historyIn : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  const ctx = cleanContext(ctxIn);
  const lines = await liveLines(ctx, message);
  const raw = await callLLM([
    { role: "system", content: systemPrompt(String(tz || "UTC"), lines) },
    ...history,
    { role: "user", content: message },
  ]);

  // The model asked for an internet look-up → hand it to the search-capable model.
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const ask = SEARCH_ON && /^\[\[SEARCH\]\]\s*([\s\S]+)/i.exec(stripped);
  if (ask) {
    const query = ask[1].trim().slice(0, 200);
    console.log(`[search] "${query}" via ${SEARCH_MODEL}`);
    try {
      const found = await callLLM(
        [
          { role: "system", content: "Answer the question using current information from the web. Reply in one or two short plain sentences (under 40 words), no markdown, no links. If you are not sure, say so briefly." },
          { role: "user", content: `${query}\n(Rider's original words: ${message})` },
        ],
        SEARCH_MODEL
      );
      return cleanForSpeech(found) || "I couldn't find that right now.";
    } catch (e) {
      console.log("[search] failed:", e.message);
      return "Sorry, I couldn't look that up right now.";
    }
  }
  return cleanForSpeech(raw) || "Sorry, I don't have an answer for that.";
}

// context arrives as an object (typed chat) or as a JSON string (voice upload)
function parseCtx(v) {
  if (typeof v === "string") { try { return JSON.parse(v); } catch (_) { return null; } }
  return v;
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
      const reply = await answer(message, body.history, body.tz, parseCtx(body.context));
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
      const reply = await answer(transcript.slice(0, 800), history, fields.tz, parseCtx(fields.context));
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
  console.log(`  STT : ${STT_MODEL} @ ${STT_BASE}  ${STT_KEY ? "(key found)" : "(NO KEY)"}`);
  console.log(`  Web : ${SEARCH_ON ? SEARCH_MODEL : "off"}   Weather: Open-Meteo (default city ${DEFAULT_CITY})\n`);
});