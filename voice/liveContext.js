// voice/liveContext.js
// ─────────────────────────────────────────────────────────────
// What the assistant knows about "right now", gathered on the phone and sent
// with every question:
//   phone  → battery % and whether it is charging   (expo-battery)
//   helmet → battery %, connected                   (Firebase: helmet/status)
//   loc    → rough GPS position for "weather here"  (expo-location)
//
// useLiveContext() returns { get } — call `await get()` right before asking.
// It never throws; anything unavailable is simply left out.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef } from "react";
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import { ref, onValue } from "firebase/database";
import { db } from "../config/firebaseConfig";

const LOC_MAX_AGE_MS = 10 * 60 * 1000;   // refresh the GPS fix every 10 minutes
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

export function useLiveContext() {
  const helmet = useRef({ battery: null, connected: false });
  const loc = useRef(null);               // { lat, lon, at }
  const locBusy = useRef(false);

  // helmet status from Firebase (live)
  useEffect(() => {
    let off = () => {};
    try {
      off = onValue(
        ref(db, "helmet/status"),
        (snap) => {
          const v = snap.val() || {};
          helmet.current = {
            battery: typeof v.battery === "number" ? v.battery : null,
            connected: v.connected === true,
          };
        },
        (err) => console.log("[live] firebase:", err?.message)
      );
    } catch (e) { console.log("[live] firebase setup:", e?.message); }
    return () => { try { off(); } catch (_) {} };
  }, []);

  const refreshLoc = useCallback(async () => {
    if (locBusy.current) return;
    locBusy.current = true;
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      let p = await Location.getLastKnownPositionAsync();
      if (!p) p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      if (p?.coords) loc.current = { lat: p.coords.latitude, lon: p.coords.longitude, at: Date.now() };
    } catch (e) {
      console.log("[live] location:", e?.message);
    } finally { locBusy.current = false; }
  }, []);

  // ask for location permission early (when the Voice screen opens), not in the middle of a question
  useEffect(() => { refreshLoc(); }, [refreshLoc]);

  const get = useCallback(async () => {
    const ctx = { helmet: { ...helmet.current } };

    try {
      const [level, state] = await Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()]);
      if (typeof level === "number" && level >= 0) {
        ctx.phone = {
          battery: Math.round(level * 100),
          pluggedIn: state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL,
        };
      }
    } catch (e) { console.log("[live] battery:", e?.message); }

    if (!loc.current) await withTimeout(refreshLoc(), 4000);        // first time: wait a moment
    else if (Date.now() - loc.current.at > LOC_MAX_AGE_MS) refreshLoc();   // later: refresh in background
    if (loc.current) ctx.loc = { lat: loc.current.lat, lon: loc.current.lon };

    console.log("[live] context:", JSON.stringify(ctx));
    return ctx;
  }, [refreshLoc]);

  return { get };
}
