// voice/phoneIO.js
// ─────────────────────────────────────────────────────────────
// The "helmet simulator": the phone pretends to be the helmet's
//   • speaker  → plays the start-listening beep and speaks the answers
//   • mic      → records the rider's question (and detects when they stop)
//
// It returns an object with a small, fixed set of methods. Later, a
// `useHelmetIO()` that talks to the real helmet over WebSocket can return the
// SAME methods, and nothing else in the app has to change:
//
//   io.beep()                     → Promise<void>
//   io.listen({onStart,onLevel})  → Promise<{uri}|{empty:true,reason}>
//   io.finishListening()          → stop now and send what was recorded
//   io.cancelListening()          → stop and throw the recording away
//   io.speak(text)                → Promise<void>   (resolves when finished/stopped)
//   io.stopSpeaking()
//
// Works in Expo Go (expo-audio + expo-speech, no custom native code).
// ─────────────────────────────────────────────────────────────
import { useMemo, useRef } from "react";
import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";
import * as Speech from "expo-speech";
import { createVad } from "./vad";

const BEEP = require("../assets/sounds/beep.wav");

// Small mono file: Whisper only needs 16 kHz speech.
const REC_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 48000,
  isMeteringEnabled: true,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ARABIC_SCRIPT = /[؀-ۿ]/;
const withScheme = (u) => (u && !/^[a-z][a-z0-9+.-]*:/i.test(u) ? "file://" + u : u);

export function usePhoneIO() {
  const recorder = useAudioRecorder(REC_OPTIONS);
  const beepPlayer = useAudioPlayer(BEEP);

  // Keep the newest hook objects in refs, so the `io` object we return NEVER
  // changes identity between renders (a changing `io` used to cancel listening).
  const recRef = useRef(recorder);
  recRef.current = recorder;
  const beepRef = useRef(beepPlayer);
  beepRef.current = beepPlayer;

  const session = useRef(null);       // the listening session that is running right now
  const cancelEarly = useRef(false);  // cancel arrived while the mic was still starting up

  return useMemo(() => {
    const beep = async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        beepRef.current.seekTo(0);
        beepRef.current.play();
      } catch (_) {}
      await sleep(330);               // let the beep finish so the mic doesn't record it
    };

    const listen = async ({ onStart, onLevel } = {}) => {
      const recorder = recRef.current;
      cancelEarly.current = false;
      let step = "start";
      const guarded = (name, p, ms = 6000) => {
        step = name;
        return Promise.race([
          Promise.resolve(p),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timed out")), ms)),
        ]);
      };
      try {
        const perm = await guarded("permission", AudioModule.requestRecordingPermissionsAsync(), 20000);
        console.log("[phoneIO] permission:", JSON.stringify(perm));
        if (!perm?.granted) return { empty: true, reason: "permission" };
        await guarded("audio mode", setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }));
        await guarded("prepare recorder", recorder.prepareToRecordAsync());
        step = "record";
        recorder.record();
        console.log("[phoneIO] recording started");
      } catch (e) {
        const msg = `step "${step}": ${e?.message || e}`;
        console.log("[phoneIO] could not start recording -", msg);
        return { empty: true, reason: "error", message: msg };
      }

      return new Promise((resolve) => {
        let settled = false;
        let timer = null;
        let sawMeter = false;

        const done = async (kind) => {            // kind: send | cancel | timeout
          if (settled) return;
          settled = true;
          clearInterval(timer);
          session.current = null;
          let ms = 0;
          try { ms = recorder.getStatus?.().durationMillis ?? 0; } catch (_) {}
          let uri = null;
          try { await recorder.stop(); uri = withScheme(recorder.uri); } catch (e) { console.log("[phoneIO] stop error:", e?.message); }
          console.log("[phoneIO] finished:", kind, "|", ms, "ms | metering seen:", sawMeter, "| uri:", uri);
          if (kind === "send" && uri && ms > 500) resolve({ uri });
          else resolve({ empty: true, reason: kind === "send" ? "short" : kind });
        };

        session.current = { finish: () => done("send"), cancel: () => done("cancel") };
        if (cancelEarly.current) return void done("cancel");
        onStart && onStart();

        const vad = createVad();
        const startedAt = Date.now();
        timer = setInterval(() => {
          let db;
          try { db = recorder.getStatus?.().metering; } catch (_) {}
          const now = Date.now();
          if (typeof db === "number") {
            sawMeter = true;
            onLevel && onLevel(db);
            const ev = vad.push(db, now);
            if (ev === "speech_end") done("send");
            else if (ev === "timeout") done("timeout");
          } else if (now - startedAt > 10000) {
            done("send");                         // no level meter on this phone: cap at 10 s (tap to finish earlier)
          }
        }, 100);
      });
    };

    return {
      beep,
      listen,
      finishListening: () => session.current?.finish(),
      cancelListening: () => {
        if (session.current) session.current.cancel();
        else cancelEarly.current = true;
      },

      speak: async (text) => {
        try {
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
        } catch (e) { console.log("[phoneIO] audio mode before speak:", e?.message); }
        await sleep(150);
        return new Promise((resolve) => {
          let finished = false;
          let triedPlain = false;
          const end = () => { if (!finished) { finished = true; clearTimeout(guard); resolve(); } };
          // If the phone's TTS engine never calls back, don't get stuck in "speaking".
          const guard = setTimeout(end, 4000 + text.length * 100);
          const say = (withLang) => {
            const opts = {
              rate: 1.0,
              volume: 1.0,
              onStart: () => console.log("[phoneIO] speaking started"),
              onDone: () => { console.log("[phoneIO] speaking done"); end(); },
              onStopped: end,
              onError: (e) => {
                console.log("[phoneIO] speech error:", e?.message || e);
                // the chosen language voice may be missing: retry once with the phone's default voice
                if (withLang && !triedPlain) { triedPlain = true; say(false); } else end();
              },
            };
            if (withLang) opts.language = ARABIC_SCRIPT.test(text) ? "ur-PK" : "en-US";
            try { Speech.speak(text, opts); } catch (e) { console.log("[phoneIO] speak threw:", e?.message); end(); }
          };
          say(true);
        });
      },
      stopSpeaking: () => { try { Speech.stop(); } catch (_) {} },
    };
  }, []);
}