import React, { useState, useEffect, useRef } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Platform,
  Keyboard,
  Linking,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import Constants from "expo-constants";

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
// Google Maps Platform.
// - The map itself uses the key in app.json -> android.config.googleMaps.apiKey
// - Place search (Places API New) and routing (Routes API) are plain HTTPS calls
//   that read the key from app.json -> extra.googleApiKey
// Strip stray spaces/quotes in case they slipped in from .env
const GOOGLE_KEY = String(Constants.expoConfig?.extra?.googleApiKey ?? "")
  .trim()
  .replace(/^["']|["']$/g, "");

// Shown in error banners so a blank/odd key is obvious (never shows the key itself)
const keyHint = () =>
  ` [key: ${GOOGLE_KEY ? `${GOOGLE_KEY.length} chars, starts "${GOOGLE_KEY.slice(0, 4)}"` : "EMPTY"}]`;
const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

function requireKey() {
  if (!GOOGLE_KEY || GOOGLE_KEY.startsWith("YOUR_")) {
    throw new Error("Google API key missing (app.json -> extra.googleApiKey)");
  }
}

const DEFAULT_REGION = {
  latitude: 31.5204, // Lahore
  longitude: 74.3587,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const OFF_ROUTE_METERS = 50;
const STEP_REACHED_METERS = 25;

const EMPTY_PROGRESS = {
  stepIdx: 0,
  distToNext: 0,
  remainingDist: 0,
  remainingTime: 0,
};

// ─────────────────────────────────────────────────────────────
// Geo helpers
// ─────────────────────────────────────────────────────────────
const toRad = (d) => (d * Math.PI) / 180;
const EARTH_R = 6371000;

function haversine(a, b) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(s));
}

// Distance from point p to segment a-b (metres, local flat projection)
function distToSegment(p, a, b) {
  const k = Math.cos(toRad(p.latitude));
  const x = (c) => toRad(c.longitude) * k * EARTH_R;
  const y = (c) => toRad(c.latitude) * EARTH_R;
  const px = x(p);
  const py = y(p);
  const ax = x(a);
  const ay = y(a);
  const dx = x(b) - ax;
  const dy = y(b) - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToRoute(p, coords) {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distToSegment(p, coords[i], coords[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

// ─────────────────────────────────────────────────────────────
// Formatting + instruction helpers
// ─────────────────────────────────────────────────────────────
function fmtDist(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.max(10, Math.round(m / 10) * 10)} m`;
}

function spokenDist(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} kilometers`;
  return `${Math.max(10, Math.round(m / 10) * 10)} meters`;
}

function fmtDuration(sec) {
  const mins = Math.max(1, Math.round(sec / 60));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

function fmtETA(sec) {
  return new Date(Date.now() + sec * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Google already returns ready-made text such as "Turn right onto Mall Rd".
function describeStep(step) {
  return step.text;
}

const MANEUVER_ICONS = {
  TURN_LEFT: "arrow-left",
  TURN_RIGHT: "arrow-right",
  TURN_SLIGHT_LEFT: "arrow-top-left",
  TURN_SLIGHT_RIGHT: "arrow-top-right",
  TURN_SHARP_LEFT: "arrow-bottom-left",
  TURN_SHARP_RIGHT: "arrow-bottom-right",
  UTURN_LEFT: "arrow-u-left-top",
  UTURN_RIGHT: "arrow-u-right-top",
  RAMP_LEFT: "arrow-top-left",
  RAMP_RIGHT: "arrow-top-right",
  FORK_LEFT: "arrow-top-left",
  FORK_RIGHT: "arrow-top-right",
  ROUNDABOUT_LEFT: "rotate-left",
  ROUNDABOUT_RIGHT: "rotate-right",
  DESTINATION: "flag-checkered",
};

function iconFor(step) {
  return MANEUVER_ICONS[step.maneuver] || "arrow-up";
}

// Google encodes route geometry as an "encoded polyline" string.
function decodePolyline(str) {
  const out = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    out.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Routing (Google Routes API)
// ─────────────────────────────────────────────────────────────
const latLng = (p) => ({ location: { latLng: { latitude: p.latitude, longitude: p.longitude } } });
const pt = (loc) => loc?.latLng ?? loc;

async function fetchRoute(from, to) {
  requireKey();

  const res = await fetch(ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline," +
        "routes.legs.steps.distanceMeters,routes.legs.steps.startLocation," +
        "routes.legs.steps.endLocation,routes.legs.steps.navigationInstruction",
    },
    body: JSON.stringify({
      origin: latLng(from),
      destination: latLng(to),
      travelMode: "DRIVE",
      languageCode: "en-US",
      units: "METRIC",
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || `Routes API error ${res.status}`);

  const r = json.routes?.[0];
  const raw = r?.legs?.[0]?.steps ?? [];
  if (!r || !raw.length) throw new Error("No route found");

  // Normalise into: { text, maneuver, location:[lon,lat] (where it happens), distance }
  const steps = raw.map((s, i) => {
    const start = pt(s.startLocation);
    return {
      text: (
        s.navigationInstruction?.instructions ||
        (i === 0 ? "Start driving" : "Continue straight")
      ).replace(/<[^>]+>/g, ""),
      maneuver: s.navigationInstruction?.maneuver || (i === 0 ? "DEPART" : "STRAIGHT"),
      location: [start.longitude, start.latitude],
      distance: s.distanceMeters ?? 0,
    };
  });

  const end = pt(raw[raw.length - 1].endLocation);
  steps.push({
    text: "You have arrived at your destination",
    maneuver: "DESTINATION",
    location: [end.longitude, end.latitude],
    distance: 0,
  });

  return {
    coords: decodePolyline(r.polyline.encodedPolyline),
    steps,
    distance: r.distanceMeters ?? 0,
    duration: parseInt(r.duration, 10) || 0, // "165s" -> 165
  };
}

// ─────────────────────────────────────────────────────────────
// Mic Pulse Animation
// ─────────────────────────────────────────────────────────────
function MicPulse() {
  const s1 = useRef(new Animated.Value(1)).current;
  const s2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = (val, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();

    pulse(s1, 0);
    pulse(s2, 400);
  }, []);

  return (
    <View style={mic.wrapper}>
      <Animated.View
        style={[mic.ring, { transform: [{ scale: s2 }], opacity: 0.15 }]}
      />
      <Animated.View
        style={[mic.ring, { transform: [{ scale: s1 }], opacity: 0.25 }]}
      />
      <View style={mic.circle}>
        <Feather name="mic" size={44} color="#fff" />
      </View>
    </View>
  );
}

const mic = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2563eb",
  },
  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function NavigationPage() {
  const router = useRouter();
  const mapRef = useRef(null);

  // UI state
  const [permission, setPermission] = useState("pending"); // pending | granted | denied
  const [position, setPosition] = useState(null);
  const [mode, setModeState] = useState("idle"); // idle | preview | navigating
  const [route, setRouteState] = useState(null);
  const [destination, setDestinationState] = useState(null);
  const [following, setFollowingState] = useState(true);
  const [muted, setMutedState] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [mapStatus, setMapStatus] = useState("waiting"); // TEMP debug: waiting | ready | loaded

  // Refs mirror state so the GPS callback (created once) never reads stale values
  const modeRef = useRef("idle");
  const routeRef = useRef(null);
  const destinationRef = useRef(null);
  const followingRef = useRef(true);
  const mutedRef = useRef(false);
  const positionRef = useRef(null);
  const headingRef = useRef(0);
  const stepIdxRef = useRef(0);
  const spokenRef = useRef({});
  const offRouteRef = useRef(0);
  const lastRerouteRef = useRef(0);

  const setMode = (m) => {
    modeRef.current = m;
    setModeState(m);
  };
  const setRoute = (r) => {
    routeRef.current = r;
    setRouteState(r);
  };
  const setDestination = (d) => {
    destinationRef.current = d;
    setDestinationState(d);
  };
  const setFollowing = (f) => {
    followingRef.current = f;
    setFollowingState(f);
  };
  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMutedState(next);
    if (next) Speech.stop();
  };

  // ── Voice guidance ──────────────────────────────────────────
  const speak = (text) => {
    if (mutedRef.current) return;
    Speech.stop();
    Speech.speak(text, { language: "en-US", rate: 0.95 });
  };

  // ── Camera ──────────────────────────────────────────────────
  const followCamera = (p) => {
    const navigating = modeRef.current === "navigating";
    mapRef.current?.animateCamera(
      {
        center: { latitude: p.latitude, longitude: p.longitude },
        heading: navigating ? headingRef.current : 0,
        pitch: navigating ? 45 : 0,
      },
      { duration: 900 },
    );
  };

  const fitRoute = (coords) => {
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 220, right: 50, bottom: 320, left: 50 },
      animated: true,
    });
  };

  // ── Navigation progress (runs on every GPS fix) ─────────────
  const endNavigation = (arrived = false) => {
    if (!arrived) Speech.stop();
    setMode("idle");
    setRoute(null);
    setDestination(null);
    setQuery("");
    setResults([]);
    setProgress(EMPTY_PROGRESS);
    stepIdxRef.current = 0;
    spokenRef.current = {};
    offRouteRef.current = 0;
    setFollowing(true);

    const p = positionRef.current;
    if (p) {
      mapRef.current?.animateCamera(
        {
          center: { latitude: p.latitude, longitude: p.longitude },
          heading: 0,
          pitch: 0,
          zoom: 15,
        },
        { duration: 600 },
      );
    }
  };

  const reroute = async (p) => {
    lastRerouteRef.current = Date.now();
    offRouteRef.current = 0;
    speak("Rerouting");
    try {
      const r = await fetchRoute(p, destinationRef.current);
      setRoute(r);
      stepIdxRef.current = 0;
      spokenRef.current = {};
    } catch {
      setError("Couldn't reroute. Check your connection.");
    }
  };

  const advance = (p) => {
    const r = routeRef.current;
    if (!r) return;

    // Off-route detection (3 consecutive bad fixes, 10 s cooldown)
    if (distanceToRoute(p, r.coords) > OFF_ROUTE_METERS) {
      offRouteRef.current += 1;
      if (
        offRouteRef.current >= 3 &&
        Date.now() - lastRerouteRef.current > 10000
      ) {
        reroute(p);
        return;
      }
    } else {
      offRouteRef.current = 0;
    }

    const steps = r.steps;
    let idx = stepIdxRef.current;

    // Step i ends where step i+1's maneuver happens
    while (idx < steps.length - 1) {
      const [lon, lat] = steps[idx + 1].location;
      if (haversine(p, { latitude: lat, longitude: lon }) < STEP_REACHED_METERS) {
        idx += 1;
      } else {
        break;
      }
    }
    stepIdxRef.current = idx;

    if (idx >= steps.length - 1) {
      speak("You have arrived at your destination");
      endNavigation(true);
      return;
    }

    const next = steps[idx + 1];
    const [nLon, nLat] = next.location;
    const distToNext = haversine(p, { latitude: nLat, longitude: nLon });

    let remainingDist = distToNext;
    for (let j = idx + 1; j < steps.length; j++) {
      remainingDist += steps[j].distance;
    }
    const remainingTime = remainingDist * (r.duration / (r.distance || 1));

    setProgress({ stepIdx: idx, distToNext, remainingDist, remainingTime });

    // Spoken prompts, once each per step
    const said = spokenRef.current;
    const text = describeStep(next);
    if (distToNext > 300 && !said[`${idx}-enter`]) {
      said[`${idx}-enter`] = true;
      speak(`In ${spokenDist(distToNext)}, ${text}`);
    } else if (distToNext <= 250 && distToNext > 60 && !said[`${idx}-far`]) {
      said[`${idx}-far`] = true;
      speak(`In ${spokenDist(distToNext)}, ${text}`);
    } else if (distToNext <= 60 && !said[`${idx}-near`]) {
      said[`${idx}-near`] = true;
      speak(text);
    }
  };

  const handleLocation = (loc) => {
    const c = loc.coords;
    if (c.speed > 1 && c.heading >= 0) headingRef.current = c.heading;

    const p = {
      latitude: c.latitude,
      longitude: c.longitude,
      speed: c.speed > 0 ? c.speed * 3.6 : 0, // m/s → km/h
    };
    positionRef.current = p;
    setPosition(p);

    if (modeRef.current === "navigating") advance(p);
    if (followingRef.current) followCamera(p);
  };

  // ── GPS subscription ────────────────────────────────────────
  useEffect(() => {
    let sub;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== "granted") {
        setPermission("denied");
        return;
      }
      setPermission("granted");

      try {
        const first = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) return;
        handleLocation(first);
        mapRef.current?.animateCamera(
          {
            center: {
              latitude: first.coords.latitude,
              longitude: first.coords.longitude,
            },
            zoom: 15,
          },
          { duration: 600 },
        );
      } catch {
        // watcher below will still deliver fixes
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 3,
        },
        handleLocation,
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      Speech.stop();
    };
  }, []);

  // ── Search (Google Places API New, Text Search) ─────────────
  // Runs on submit (not per keystroke) to keep request counts, and cost, low.
  const runSearch = async (text) => {
    const q = text.trim();
    if (q.length < 2) return [];

    setBusy(true);
    setError(null);
    try {
      requireKey();

      // Bias results to ~30 km around the rider (or Lahore before GPS arrives)
      const p = positionRef.current ?? DEFAULT_REGION;
      const res = await fetch(PLACES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          textQuery: q,
          pageSize: 6,
          languageCode: "en",
          locationBias: {
            circle: {
              center: { latitude: p.latitude, longitude: p.longitude },
              radius: 30000.0,
            },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || `Places API error ${res.status}`);
      }

      const list = (json.places ?? []).map((r) => ({
        id: r.id,
        name: r.displayName?.text ?? q,
        address: r.formattedAddress ?? "",
        latitude: r.location.latitude,
        longitude: r.location.longitude,
      }));
      if (!list.length) setError("No places found. Try a different search.");
      return list;
    } catch (e) {
      setError(`Search failed: ${e.message}${keyHint()}`);
      return [];
    } finally {
      setBusy(false);
    }
  };

  const onSubmitSearch = async () => {
    Keyboard.dismiss();
    setResults(await runSearch(query));
  };

  // ── Pick a destination → build route → preview ──────────────
  const selectPlace = async (place) => {
    const from = positionRef.current;
    if (!from) {
      setError("Waiting for GPS signal…");
      return;
    }

    Keyboard.dismiss();
    setResults([]);
    setQuery(place.name);
    setBusy(true);
    setError(null);

    try {
      const r = await fetchRoute(from, place);
      setDestination(place);
      setRoute(r);
      setMode("preview");
      setFollowing(false);
      fitRoute(r.coords);
    } catch (e) {
      setError(`Couldn't get a route: ${e.message}${keyHint()}`);
    } finally {
      setBusy(false);
    }
  };

  // Call this from your voice assistant: navigateToQuery("FAST NUCES")
  const navigateToQuery = async (text) => {
    const list = await runSearch(text);
    if (list[0]) await selectPlace(list[0]);
  };

  const startNavigation = () => {
    const r = routeRef.current;
    if (!r) return;

    stepIdxRef.current = 0;
    spokenRef.current = {};
    offRouteRef.current = 0;
    setProgress({
      stepIdx: 0,
      distToNext: r.steps[1]
        ? haversine(positionRef.current, {
            latitude: r.steps[1].location[1],
            longitude: r.steps[1].location[0],
          })
        : r.distance,
      remainingDist: r.distance,
      remainingTime: r.duration,
    });
    setMode("navigating");
    setFollowing(true);

    const p = positionRef.current;
    mapRef.current?.animateCamera(
      {
        center: { latitude: p.latitude, longitude: p.longitude },
        heading: headingRef.current,
        pitch: 45,
        zoom: 17,
      },
      { duration: 800 },
    );
  };

  // ── Map controls ────────────────────────────────────────────
  const recenter = () => {
    const p = positionRef.current;
    if (!p) return;
    setFollowing(true);
    mapRef.current?.animateCamera(
      {
        center: { latitude: p.latitude, longitude: p.longitude },
        heading: modeRef.current === "navigating" ? headingRef.current : 0,
        pitch: modeRef.current === "navigating" ? 45 : 0,
        zoom: modeRef.current === "navigating" ? 17 : 15,
      },
      { duration: 500 },
    );
  };

  const zoomBy = async (delta) => {
    const cam = await mapRef.current?.getCamera();
    if (cam && typeof cam.zoom === "number") {
      mapRef.current.animateCamera({ zoom: cam.zoom + delta }, { duration: 250 });
    }
  };

  // ── Derived values for rendering ────────────────────────────
  const steps = route?.steps ?? [];
  const upcoming =
    mode === "navigating" && steps.length
      ? steps[Math.min(progress.stepIdx + 1, steps.length - 1)]
      : null;
  const afterThat =
    mode === "navigating" ? steps[progress.stepIdx + 2] : undefined;

  return (
    <View style={styles.container}>
      {/* Real Google map */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        mapType="standard"
        showsTraffic
        onMapReady={() => setMapStatus((s) => (s === "loaded" ? s : "ready"))}
        onMapLoaded={() => setMapStatus("loaded")}
        showsUserLocation={permission === "granted"}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled
        pitchEnabled
        onPanDrag={() => {
          if (followingRef.current) setFollowing(false);
        }}
      >
        {route && (
          <>
            <Polyline
              coordinates={route.coords}
              strokeColor="#ffffff"
              strokeWidth={9}
              zIndex={1}
            />
            <Polyline
              coordinates={route.coords}
              strokeColor="#2563eb"
              strokeWidth={6}
              zIndex={2}
            />
          </>
        )}

        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title={destination.name}
            pinColor="#ef4444"
          />
        )}
      </MapView>

      <SafeAreaView
        style={StyleSheet.absoluteFill}
        edges={["top", "bottom"]}
        pointerEvents="box-none"
      >
        {/* Top Overlay */}
        <View style={styles.topOverlay} pointerEvents="box-none">
          {mode !== "navigating" && (
            <View style={styles.searchBar}>
              <View style={styles.searchIconBox}>
                {busy ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Feather name="search" size={17} color="#2563eb" />
                )}
              </View>

              <TextInput
                placeholder="Where to?"
                placeholderTextColor="#9ca3af"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={onSubmitSearch}
                returnKeyType="search"
                style={styles.searchInput}
              />

              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setQuery("");
                    setResults([]);
                    setError(null);
                    if (mode === "preview") endNavigation();
                  }}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.voiceButton, voiceOpen && styles.voiceButtonActive]}
                onPress={() => setVoiceOpen(true)}
              >
                <Feather name="mic" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Search results */}
          {mode !== "navigating" && results.length > 0 && (
            <View style={styles.dropdown}>
              {results.map((place, i) => (
                <TouchableOpacity
                  key={place.id}
                  style={[
                    styles.resultItem,
                    i < results.length - 1 && styles.resultDivider,
                  ]}
                  onPress={() => selectPlace(place)}
                >
                  <View style={styles.resultIcon}>
                    <Feather name="map-pin" size={16} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {place.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Notices */}
          {permission === "denied" && (
            <TouchableOpacity
              style={styles.notice}
              onPress={() => Linking.openSettings()}
            >
              <Feather name="alert-triangle" size={16} color="#b45309" />
              <Text style={styles.noticeText}>
                Location permission is off. Tap to open Settings.
              </Text>
            </TouchableOpacity>
          )}

          {error && (
            <View style={styles.notice}>
              <Feather name="info" size={16} color="#b45309" />
              <Text style={styles.noticeText}>{error}</Text>
            </View>
          )}

          {/* Turn Card */}
          {upcoming && (
            <View style={styles.turnCard}>
              <View style={styles.turnIconBox}>
                <MaterialCommunityIcons
                  name={iconFor(upcoming)}
                  size={30}
                  color="#fff"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.turnDistance}>
                  {upcoming.maneuver === "DESTINATION" ? "Destination in " : "In "}
                  {fmtDist(progress.distToNext)}
                </Text>
                <Text style={styles.turnInstruction} numberOfLines={2}>
                  {describeStep(upcoming)}
                </Text>
              </View>

              {afterThat && (
                <View style={styles.turnNextBox}>
                  <Text style={styles.turnNextLabel}>Then</Text>
                  <MaterialCommunityIcons
                    name={iconFor(afterThat)}
                    size={20}
                    color="#6b7280"
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlBtn} onPress={recenter}>
            <MaterialCommunityIcons
              name={following ? "crosshairs-gps" : "crosshairs"}
              size={20}
              color="#2563eb"
            />
          </TouchableOpacity>

          <View style={styles.controlDivider} />

          <TouchableOpacity style={styles.controlBtn} onPress={() => zoomBy(1)}>
            <Feather name="plus" size={20} color="#374151" />
          </TouchableOpacity>

          <View style={styles.controlDivider} />

          <TouchableOpacity style={styles.controlBtn} onPress={() => zoomBy(-1)}>
            <Feather name="minus" size={20} color="#374151" />
          </TouchableOpacity>

          {mode === "navigating" && (
            <>
              <View style={styles.controlDivider} />
              <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
                <Feather
                  name={muted ? "volume-x" : "volume-2"}
                  size={20}
                  color={muted ? "#ef4444" : "#374151"}
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* TEMP debug label: remove once the map shows */}
        <View style={styles.debugChip} pointerEvents="none">
          <Text style={styles.debugText}>
            {Constants.executionEnvironment === "storeClient" ? "Expo Go" : "Dev build"} · map: {mapStatus}
          </Text>
        </View>

        {/* Bottom Panel */}
        {mode === "preview" && route && destination && (
          <View style={styles.bottomPanel}>
            <View style={styles.previewCard}>
              <Text style={styles.previewName} numberOfLines={1}>
                {destination.name}
              </Text>
              <Text style={styles.previewAddress} numberOfLines={1}>
                {destination.address}
              </Text>

              <View style={styles.previewStats}>
                <Text style={styles.previewDuration}>
                  {fmtDuration(route.duration)}
                </Text>
                <Text style={styles.previewMeta}>
                  {fmtDist(route.distance)} · Arrive {fmtETA(route.duration)}
                </Text>
              </View>

              <View style={styles.previewButtons}>
                <TouchableOpacity
                  style={styles.previewCancel}
                  onPress={() => endNavigation()}
                >
                  <Text style={styles.previewCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.previewStart}
                  onPress={startNavigation}
                >
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.previewStartText}>Start</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {mode === "navigating" && (
          <View style={styles.bottomPanel}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconBox}>
                  <Feather name="activity" size={14} color="#2563eb" />
                </View>
                <Text style={styles.statValue}>
                  {Math.round(position?.speed ?? 0)}
                </Text>
                <Text style={styles.statUnit}>km/h</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconBox}>
                  <Feather name="clock" size={14} color="#2563eb" />
                </View>
                <Text style={styles.statValue}>
                  {fmtETA(progress.remainingTime)}
                </Text>
                <Text style={styles.statUnit}>Arrival</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconBox}>
                  <Ionicons name="navigate" size={14} color="#2563eb" />
                </View>
                <Text style={styles.statValue}>
                  {(progress.remainingDist / 1000).toFixed(1)}
                </Text>
                <Text style={styles.statUnit}>km left</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.endButton}
              onPress={() => endNavigation()}
            >
              <View style={styles.endIconBox}>
                <Feather name="square" size={14} color="#fff" />
              </View>
              <Text style={styles.endText}>End Navigation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          {[
            {
              icon: "view-dashboard",
              lib: "mci",
              label: "Dashboard",
              route: "/dashboard",
            },
            { icon: "navigate", lib: "ion", label: "Navigation", active: true },
            {
              icon: "activity",
              lib: "feather",
              label: "History",
              route: "/history",
            },
            {
              icon: "users",
              lib: "feather",
              label: "Contacts",
              route: "/contacts",
            },
            {
              icon: "settings",
              lib: "feather",
              label: "Settings",
              route: "/settings-page",
            },
          ].map((item) => {
            const ic = item.active ? "#2563eb" : "#94a3b8";

            const IconEl =
              item.lib === "mci" ? (
                <MaterialCommunityIcons name={item.icon} size={24} color={ic} />
              ) : item.lib === "ion" ? (
                <Ionicons name={item.icon} size={24} color={ic} />
              ) : (
                <Feather name={item.icon} size={24} color={ic} />
              );

            return (
              <TouchableOpacity
                key={item.label}
                style={styles.navItem}
                onPress={() => item.route && router.push(item.route)}
              >
                {IconEl}
                <Text style={item.active ? styles.activeNavText : styles.navText}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {/* Voice Modal (still simulated — wire to voice/useVoiceAssistant and call navigateToQuery) */}
      <Modal visible={voiceOpen} transparent animationType="fade">
        <View style={styles.voiceOverlay}>
          <MicPulse />

          <Text style={styles.voiceTitle}>Listening...</Text>
          <Text style={styles.voiceSubtitle}>
            Say your destination or command
          </Text>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setVoiceOpen(false)}
          >
            <Feather name="square" size={14} color="#fff" />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f0fe",
  },

  topOverlay: {
    padding: 16,
    paddingTop: 12,
    gap: 12,
    zIndex: 10,
  },

  searchBar: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.08)",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },

  searchIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  voiceButton: {
    backgroundColor: "#2563eb",
    padding: 9,
    borderRadius: 11,
  },

  voiceButtonActive: {
    backgroundColor: "#ef4444",
  },

  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },

  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  resultDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },

  resultName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },

  resultAddress: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
  },

  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#92400e",
  },

  turnCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },

  turnIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },

  turnDistance: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },

  turnInstruction: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },

  turnNextBox: {
    alignItems: "center",
    gap: 2,
  },

  turnNextLabel: {
    fontSize: 10,
    color: "#9ca3af",
  },

  mapControls: {
    position: "absolute",
    right: 16,
    top: "38%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },

  controlBtn: {
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },

  controlDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 10,
  },

  debugChip: {
    position: "absolute",
    right: 8,
    bottom: 74,
    backgroundColor: "rgba(15,23,42,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  debugText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  attribution: {
    position: "absolute",
    left: 8,
    bottom: 76,
    fontSize: 9,
    color: "#475569",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },

  bottomPanel: {
    position: "absolute",
    bottom: 96,
    left: 16,
    right: 16,
    gap: 14,
  },

  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },

  previewName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },

  previewAddress: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },

  previewStats: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 12,
  },

  previewDuration: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563eb",
  },

  previewMeta: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },

  previewButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  previewCancel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#f1f5f9",
  },

  previewCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },

  previewStart: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#2563eb",
  },

  previewStartText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 14,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },

  statUnit: {
    fontSize: 11,
    color: "#9ca3af",
  },

  statDivider: {
    width: 1,
    backgroundColor: "#f1f5f9",
  },

  endButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ef4444",
    borderRadius: 18,
    paddingVertical: 15,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },

  endIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  endText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
  },

  navItem: {
    alignItems: "center",
    paddingTop: 4,
  },

  activeNavText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },

  navText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 5,
  },

  voiceOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,15,40,0.93)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },

  voiceTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },

  voiceSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    marginBottom: 36,
  },

  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },

  cancelText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});