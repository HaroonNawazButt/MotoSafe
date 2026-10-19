// voice/voiceApi.js
// ─────────────────────────────────────────────────────────────
// Talks to the MotoSafe Voice Lab server (voice-lab-server/server.js).
// The AI keys live on that server — the app never sees them.
//
// Server address: set EXPO_PUBLIC_VOICE_API_URL in the app's .env, or type it
// into the Voice screen's settings (saved on the phone). Your computer's
// Wi-Fi IP changes, so the in-app box is the handy way during development.
// ─────────────────────────────────────────────────────────────
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_URL = "motosafe_voice_api_url";
const KEY_CODE = "motosafe_voice_api_code";
const DEFAULT_URL = process.env.EXPO_PUBLIC_VOICE_API_URL || "http://192.168.1.100:3000";

const clean = (u) => String(u || "").trim().replace(/\/+$/, "");

export async function getServer() {
  try {
    const [url, code] = await Promise.all([AsyncStorage.getItem(KEY_URL), AsyncStorage.getItem(KEY_CODE)]);
    return { url: clean(url || DEFAULT_URL), code: code || "" };
  } catch (_) {
    return { url: clean(DEFAULT_URL), code: "" };
  }
}

export async function saveServer(url, code) {
  await AsyncStorage.setItem(KEY_URL, clean(url));
  await AsyncStorage.setItem(KEY_CODE, code || "");
}

// fetch with a timeout, an access-code header and friendly errors
async function call(path, { method = "GET", body, headers = {}, signal, timeoutMs = 30000 } = {}) {
  const { url, code } = await getServer();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const onAbort = () => ctl.abort();
  signal?.addEventListener?.("abort", onAbort);
  let res;
  try {
    res = await fetch(url + path, {
      method, body, signal: ctl.signal,
      headers: { ...headers, ...(code ? { "x-access-code": code } : {}) },
    });
  } catch (e) {
    if (signal?.aborted) throw Object.assign(new Error("cancelled"), { name: "AbortError" });
    if (e.name === "AbortError") throw new Error("The voice server took too long to answer.");
    console.log("[voiceApi] request failed:", method, url + path, "->", e?.name, e?.message);
    throw Object.assign(
      new Error(`Request to ${url}${path} failed: ${e?.message || e}. (Typing works? Then the problem is the audio upload, not the address.)`),
      { network: true }
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.("abort", onAbort);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
  return json;
}

const tz = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (_) { return "UTC"; }
};

export function health() {
  return call("/api/health", { timeoutMs: 6000 });
}

// recorded audio → { transcript, reply, ms }
// Newer Expo's fetch rejects the old {uri,name,type} FormData trick
// ("Unsupported FormDataPart implementation"), so we upload with expo-file-system instead.
let FS = null;
try { FS = require("expo-file-system/legacy"); } catch (_) {
  try { FS = require("expo-file-system"); } catch (_) {}
}

export async function askVoice({ audio, history, lang, context, signal }) {
  console.log("[voiceApi] uploading recording:", audio.uri);
  const params = { tz: tz(), history: JSON.stringify(history || []) };
  if (lang && lang !== "auto") params.lang = lang;
  if (context) params.context = JSON.stringify(context);

  if (FS?.uploadAsync) {
    const { url, code } = await getServer();
    let res;
    try {
      res = await FS.uploadAsync(url + "/api/voice", audio.uri, {
        httpMethod: "POST",
        uploadType: FS.FileSystemUploadType?.MULTIPART ?? 1,
        fieldName: "audio",
        mimeType: "audio/m4a",
        parameters: params,
        headers: code ? { "x-access-code": code } : {},
      });
    } catch (e) {
      console.log("[voiceApi] upload failed:", e?.message);
      throw new Error(`Upload to ${url}/api/voice failed: ${e?.message || e}`);
    }
    let json = {};
    try { json = JSON.parse(res.body || "{}"); } catch (_) {}
    if (res.status < 200 || res.status >= 300) throw new Error(json.error || `Server error ${res.status}`);
    return json;
  }

  // Fallback: send the recording as a Blob
  const form = new FormData();
  const blob = await (await fetch(audio.uri)).blob();
  form.append("audio", blob, "speech.m4a");
  Object.entries(params).forEach(([k, v]) => form.append(k, v));
  return call("/api/voice", { method: "POST", body: form, signal, timeoutMs: 45000 });
}

// typed text → { transcript, reply, ms }
export async function askText({ message, history, context, signal }) {
  const out = await call("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, history: history || [], tz: tz(), context: context || undefined }),
    signal,
  });
  return { transcript: message, reply: out.reply, ms: out.ms };
}