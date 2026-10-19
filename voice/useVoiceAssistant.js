// voice/useVoiceAssistant.js
// ─────────────────────────────────────────────────────────────
// The assistant's brain-stem: ONE state machine that doesn't care whether the
// mic/speaker are the phone's (usePhoneIO) or the real helmet's.
//
//   idle → beeping → listening → thinking → speaking → idle
//
// The "helmet button" is press():
//   idle       → beep, then listen
//   listening  → "I'm done talking" (send what was recorded)
//   speaking   → interrupt the answer and listen again
//   beeping / thinking → cancel
//
// `io` and `api` are passed in (see phoneIO.js / voiceApi.js) so this file
// has no native code and can be tested on its own.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";

const NOTES = {
  permission: "Microphone permission is off. Allow it in the phone's app settings.",
  timeout: "I didn't hear anything. Tap and try again.",
  short: "That was too short. Tap and try again.",
  error: "Couldn't start the microphone. Tap and try again.",
};

export function useVoiceAssistant({ io, api, lang = "auto" }) {
  const [state, setStateRaw] = useState("idle");
  const [level, setLevel] = useState(-60);          // mic level in dB, for the little meter
  const [messages, setMessages] = useState([]);

  const stateRef = useRef("idle");
  const run = useRef(0);                            // bumping this cancels whatever is in flight
  const history = useRef([]);
  const abort = useRef(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const setState = useCallback((s) => { stateRef.current = s; setStateRaw(s); }, []);
  const add = useCallback((kind, text, meta) => {
    setMessages((m) => [...m, { id: `${Date.now()}-${Math.random()}`, kind, text, meta }]);
  }, []);

  const cancelAll = useCallback(() => {
    run.current++;
    try { io.cancelListening(); } catch (_) {}
    try { io.stopSpeaking(); } catch (_) {}
    try { abort.current?.abort(); } catch (_) {}
    abort.current = null;
    setLevel(-60);
    setState("idle");
  }, [io, setState]);

  // send audio or text to the server, then speak the reply
  const ask = useCallback(async (id, { audio, text }) => {
    setState("thinking");
    abort.current = new AbortController();
    const signal = abort.current.signal;
    let out;
    try {
      out = audio
        ? await api.askVoice({ audio, history: history.current.slice(-8), lang: langRef.current, signal })
        : await api.askText({ message: text, history: history.current.slice(-8), signal });
    } catch (e) {
      if (id !== run.current || e.name === "AbortError") return;
      add("error", e.message);
      setState("speaking");
      await io.speak("Sorry, I can't reach my brain right now.");
      if (id === run.current) setState("idle");
      return;
    }
    if (id !== run.current) return;
    if (!out.transcript) {
      add("note", "I didn't catch that. Tap and try again.");
      setState("idle");
      return;
    }
    add("user", out.transcript);
    add("bot", out.reply, out.ms ? `${out.ms} ms` : undefined);
    history.current.push({ role: "user", content: out.transcript }, { role: "assistant", content: out.reply });
    setState("speaking");
    await io.speak(out.reply);
    if (id === run.current) setState("idle");
  }, [api, io, add, setState]);

  const startTalking = useCallback(async () => {
    const id = ++run.current;
    setState("beeping");
    await io.beep();
    if (id !== run.current) return;
    const res = await io.listen({
      onStart: () => { if (id === run.current) setState("listening"); },
      onLevel: (db) => { if (id === run.current) setLevel(db); },
    });
    if (id !== run.current) return;
    setLevel(-60);
    if (res.empty) {
      if (res.reason !== "cancel") add("note", NOTES[res.reason] || NOTES.error);
      setState("idle");
      return;
    }
    await ask(id, { audio: res });
  }, [io, ask, add, setState]);

  // The helmet button
  const press = useCallback(() => {
    switch (stateRef.current) {
      case "idle": startTalking(); break;
      case "listening": io.finishListening(); break;
      case "speaking": cancelAll(); startTalking(); break;
      default: cancelAll();                          // beeping / thinking
    }
  }, [io, startTalking, cancelAll]);

  const sendText = useCallback((text) => {
    const t = String(text || "").trim();
    if (!t) return;
    cancelAll();
    ask(++run.current, { text: t });
  }, [ask, cancelAll]);

  const clear = useCallback(() => { cancelAll(); history.current = []; setMessages([]); }, [cancelAll]);

  // leaving the screen must stop the mic and the speaker
  useEffect(() => () => { cancelAll(); }, [cancelAll]);

  return { state, level, messages, press, cancel: cancelAll, sendText, clear };
}
