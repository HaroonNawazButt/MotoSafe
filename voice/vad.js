// voice/vad.js
// ─────────────────────────────────────────────────────────────
// "Did the rider stop talking?" detector.
// Same idea as the helmet firmware's VAD: learn the background noise,
// call it speech when the level jumps well above it, and call it finished
// after ~1.2 s of quiet. Pure JS (no React, no native code) so it can be tested alone.
//
// Feed it one microphone level (dB, about -160 … 0) every ~100 ms:
//     const vad = createVad();
//     const event = vad.push(db, Date.now());
//     // event is null | "speech_start" | "speech_end" | "timeout"
// ─────────────────────────────────────────────────────────────

export const VAD = {
  CALIBRATE_MS: 400,     // learn the background noise first
  START_ABOVE_DB: 12,    // speech = this much louder than the noise floor …
  START_FRAMES: 3,       // … for this many readings in a row
  KEEP_ABOVE_DB: 7,      // while talking, anything above this counts as "still talking"
  SILENCE_MS: 1200,      // quiet this long after speech = finished
  NO_SPEECH_MS: 7000,    // never started talking = give up
  MAX_SPEECH_MS: 12000,  // hard cap on one question
  FLOOR_CAP_DB: -38,     // if the rider talks during calibration, don't treat speech as "noise"
  MIN_START_DB: -45,     // never trigger on levels quieter than this
};

export function createVad(cfg = {}) {
  const c = { ...VAD, ...cfg };
  let t0 = null;
  let sum = 0, n = 0;
  let floor = null;
  let frames = 0;
  let speaking = false;
  let speechStart = 0, lastVoice = 0;

  return {
    get floor() { return floor; },
    get speaking() { return speaking; },

    push(db, now) {
      if (t0 === null) t0 = now;

      // 1) calibrate
      if (floor === null) {
        sum += db; n++;
        if (now - t0 >= c.CALIBRATE_MS) floor = Math.min(sum / n, c.FLOOR_CAP_DB);
        return null;
      }

      const startThr = Math.max(floor + c.START_ABOVE_DB, c.MIN_START_DB);
      const keepThr = Math.max(floor + c.KEEP_ABOVE_DB, c.MIN_START_DB - 8);

      // 2) waiting for the rider to start
      if (!speaking) {
        frames = db > startThr ? frames + 1 : 0;
        if (frames >= c.START_FRAMES) {
          speaking = true;
          speechStart = lastVoice = now;
          return "speech_start";
        }
        if (db < floor + 4) floor = 0.95 * floor + 0.05 * db;     // follow slow noise changes
        if (now - t0 > c.NO_SPEECH_MS) return "timeout";
        return null;
      }

      // 3) rider is talking — wait for silence
      if (db > keepThr) lastVoice = now;
      if (now - lastVoice > c.SILENCE_MS || now - speechStart > c.MAX_SPEECH_MS) return "speech_end";
      return null;
    },
  };
}
