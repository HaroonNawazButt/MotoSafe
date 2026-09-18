// app/dashboard.jsx
// MotoSafe Dashboard — Firebase-connected
// ✅ Lane detection REMOVED
// ✅ Drowsiness  → reads /helmet/alerts/drowsiness + /helmet/sensors
// ✅ Accident    → reads /helmet/alerts/accident
// ✅ SMS sent to all emergency contacts on accident detection

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Vibration,
} from "react-native";
import { useRouter } from "expo-router";
import {
  MaterialCommunityIcons,
  Feather,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";

import AlertBanner from "./dashboard-components/AlertBanner";
import EmergencySOSModal from "./dashboard-components/EmergencySOSModal";

// ── Firebase ──────────────────────────────────────────────────
import { db } from "./firebaseConfig";
import { ref, onValue, set } from "firebase/database";

// ── SMS + Storage (NEW) ───────────────────────────────────────
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendAccidentSMS } from "./utils/smsHelper";

const STORAGE_KEY = "motosafe_emergency_contacts";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
};

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
};

const calcSafetyScore = (drowsiness, accident) => {
  let score = 100;
  if (drowsiness === 1) score -= 15;
  if (drowsiness === 2) score -= 35;
  if (accident === 1) score -= 20;
  if (accident === 2) score -= 50;
  return Math.max(0, score);
};

const scoreColor = (score) => {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
};

const STATUSES = [
  { label: "Safe", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  { label: "Warning", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { label: "Alert", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
];

// ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();

  const [menuVisible, setMenuVisible] = useState(false);
  const [sosVisible, setSosVisible] = useState(false);

  const [helmetConnected, setHelmetConnected] = useState(false);
  const [helmetBattery, setHelmetBattery] = useState(null);

  const [accelG, setAccelG] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(0);
  const [drowsyLevel, setDrowsyLevel] = useState(0);
  const [nodCount, setNodCount] = useState(0);

  const [accidentAlert, setAccidentAlert] = useState(null);
  const [drowsinessAlert, setDrowsinessAlert] = useState(null);

  // Derived statuses
  const drowsinessStatus =
    drowsinessAlert?.detected === true
      ? drowsinessAlert.level >= 3
        ? 2
        : 1
      : drowsyLevel >= 2
        ? 1
        : 0;

  const accidentStatus = accidentAlert?.detected === true ? 2 : 0;
  const safetyScore = calcSafetyScore(drowsinessStatus, accidentStatus);

  // ── Firebase listeners ──────────────────────────────────────
  useEffect(() => {
    // 1. Helmet status
    const unsubStatus = onValue(ref(db, "helmet/status"), (snap) => {
      const d = snap.val();
      if (!d) return;
      setHelmetConnected(d.connected === true);
      setHelmetBattery(d.battery ?? null);
    });

    // 2. Live sensors
    const unsubSensors = onValue(ref(db, "helmet/sensors"), (snap) => {
      const d = snap.val();
      if (!d) return;
      setAccelG(d.accel_g ?? 0);
      setPitchDeg(d.pitch ?? 0);
      setDrowsyLevel(d.drowsy_lvl ?? 0);
      setNodCount(d.nod_count ?? 0);
    });

    // 3. Accident alert — now async to send SMS
    const unsubAcc = onValue(
      ref(db, "helmet/alerts/accident"),
      async (snap) => {
        const d = snap.val();
        if (d?.detected === true) {
          setAccidentAlert(d);
          Vibration.vibrate([0, 400, 200, 400, 200, 400]);

          // ── AUTO SMS TO ALL EMERGENCY CONTACTS ────────────
          try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
              const contacts = JSON.parse(saved);
              if (contacts.length > 0) {
                console.log("[SMS] Sending to", contacts.length, "contacts");
                await sendAccidentSMS(contacts, d);
              }
            }
          } catch (e) {
            console.error("[SMS] Failed:", e.message);
          }
          // ──────────────────────────────────────────────────
        } else {
          setAccidentAlert(null);
        }
      },
    );

    // 4. Drowsiness alert
    const unsubDrow = onValue(ref(db, "helmet/alerts/drowsiness"), (snap) => {
      const d = snap.val();
      if (d?.detected === true) {
        setDrowsinessAlert(d);
        Vibration.vibrate([0, 200, 100, 200]);
      } else {
        setDrowsinessAlert(null);
      }
    });

    return () => {
      unsubStatus();
      unsubSensors();
      unsubAcc();
      unsubDrow();
    };
  }, []);

  // ── Dismiss handlers ────────────────────────────────────────
  const dismissAccident = () => {
    setAccidentAlert(null);
    set(ref(db, "helmet/alerts/accident"), {
      detected: false,
      impact_g: 0,
      tilted: false,
      message: "",
      ts: 0,
    });
  };

  const dismissDrowsiness = () => {
    setDrowsinessAlert(null);
    set(ref(db, "helmet/alerts/drowsiness"), {
      detected: false,
      level: 0,
      nod_count: 0,
      message: "",
      ts: 0,
    });
  };

  // ── Ride session ────────────────────────────────────────────
  const [rideActive, setRideActive] = useState(false);
  const [rideSeconds, setRideSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (rideActive) {
      intervalRef.current = setInterval(
        () => setRideSeconds((s) => s + 1),
        1000,
      );
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [rideActive]);

  const distanceKm = (rideSeconds * 0.01389).toFixed(1);

  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Dropdown menu */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownBox}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push("/");
                }}
              >
                <Feather name="log-out" size={18} color="#ef4444" />
                <Text style={[styles.menuItemText, { color: "#ef4444" }]}>
                  Logout
                </Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setMenuVisible(false)}
              >
                <Feather name="x" size={18} color="#4b5563" />
                <Text style={styles.menuItemText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Accident Alert Modal */}
      <Modal
        transparent
        visible={!!accidentAlert}
        animationType="slide"
        onRequestClose={dismissAccident}
      >
        <View style={styles.accidentOverlay}>
          <View style={styles.accidentCard}>
            <View style={styles.accidentIconCircle}>
              <FontAwesome5
                name="exclamation-triangle"
                size={32}
                color="#fff"
              />
            </View>

            <Text style={styles.accidentTitle}>ACCIDENT DETECTED</Text>

            <Text style={styles.accidentImpact}>
              Impact:{" "}
              {accidentAlert?.impact_g != null
                ? accidentAlert.impact_g.toFixed(1)
                : "—"}{" "}
              g{accidentAlert?.tilted ? "  ·  Helmet tilted" : ""}
            </Text>

            <Text style={styles.accidentMsg}>
              {accidentAlert?.message || "Rider may need assistance!"}
            </Text>

            {/* SMS sent notice */}
            <View style={styles.smsSentBanner}>
              <Feather name="message-square" size={14} color="#059669" />
              <Text style={styles.smsSentText}>
                SMS alert sent to emergency contacts
              </Text>
            </View>

            <TouchableOpacity
              style={styles.accidentSOSBtn}
              onPress={() => {
                dismissAccident();
                setSosVisible(true);
              }}
            >
              <FontAwesome5
                name="exclamation-triangle"
                size={15}
                color="#fff"
              />
              <Text style={styles.accidentSOSText}>Open Emergency SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.accidentDismissBtn}
              onPress={dismissAccident}
            >
              <Text style={styles.accidentDismissText}>
                I am safe — dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SOS Modal */}
      <EmergencySOSModal
        visible={sosVisible}
        onClose={() => setSosVisible(false)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}, Haroon 👋</Text>
              <Text style={styles.headerTitle}>Moto Safe Dashboard</Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
            >
              <Feather name="more-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.connectionCard}
            onPress={() => router.push("/helmet-connect")}
          >
            <View style={styles.helmetIconBox}>
              <MaterialCommunityIcons
                name="motorbike-helmet"
                size={24}
                color="#2563eb"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.connectionRow}>
                <Text style={styles.connectionTitle}>
                  {helmetConnected ? "MotoSafe Pro X1" : "No helmet connected"}
                </Text>
                <View
                  style={[
                    styles.statusIndicatorDot,
                    {
                      backgroundColor: helmetConnected ? "#10b981" : "#9ca3af",
                    },
                  ]}
                />
              </View>
              <Text style={styles.connectionSubtitle}>
                {helmetConnected
                  ? `Connected · Battery ${helmetBattery ?? "—"}%`
                  : "Tap to connect your helmet"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Alert Banners */}
        <AlertBanner
          drowsinessStatus={drowsinessStatus}
          accidentStatus={accidentStatus}
          onDismissDrowsiness={dismissDrowsiness}
        />

        {/* Ride session */}
        <View style={styles.section}>
          <View style={styles.rideCard}>
            <View style={styles.rideLeft}>
              <View
                style={[
                  styles.rideStatusDot,
                  { backgroundColor: rideActive ? "#10b981" : "#d1d5db" },
                ]}
              />
              <View>
                <Text style={styles.rideCardTitle}>
                  {rideActive ? "Ride In Progress" : "Start a New Ride"}
                </Text>
                <Text style={styles.rideCardSub}>
                  {rideActive
                    ? `${formatTime(rideSeconds)} · ${distanceKm} km`
                    : "Tap to begin safety monitoring"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.rideToggleBtn,
                rideActive && styles.rideToggleBtnStop,
              ]}
              onPress={() => {
                if (rideActive) setRideSeconds(0);
                setRideActive(!rideActive);
              }}
            >
              <Feather
                name={rideActive ? "square" : "play"}
                size={14}
                color="#fff"
              />
              <Text style={styles.rideToggleText}>
                {rideActive ? "Stop" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Monitoring */}
        <View style={[styles.section, { paddingTop: 0 }]}>
          <Text style={styles.sectionTitle}>Real-time safety monitoring</Text>

          {/* Drowsiness card */}
          <View style={styles.card}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: STATUSES[drowsinessStatus].color },
              ]}
            >
              <Feather name="smile" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Drowsiness detection</Text>
              <Text style={styles.cardSubtitle}>
                {helmetConnected
                  ? `Head nods: ${nodCount}  ·  Level: ${drowsyLevel}/3`
                  : "Analyzing alertness level"}
              </Text>
              {drowsinessAlert?.detected && drowsinessAlert.message ? (
                <Text style={styles.alertMessage}>
                  {drowsinessAlert.message}
                </Text>
              ) : null}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUSES[drowsinessStatus].bg },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUSES[drowsinessStatus].color },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUSES[drowsinessStatus].color },
                  ]}
                >
                  {STATUSES[drowsinessStatus].label}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </View>

          {/* Accident card */}
          <View style={styles.card}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: STATUSES[accidentStatus].color },
              ]}
            >
              <Feather name="shield" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Accident monitoring</Text>
              <Text style={styles.cardSubtitle}>
                {accidentAlert?.detected
                  ? `Impact: ${
                      accidentAlert.impact_g != null
                        ? accidentAlert.impact_g.toFixed(1)
                        : "—"
                    }g${accidentAlert.tilted ? "  ·  Helmet tilted" : ""}`
                  : helmetConnected
                    ? `G-force: ${accelG.toFixed(2)}g  ·  Pitch: ${pitchDeg.toFixed(1)}°`
                    : "Impact detection active"}
              </Text>
              {accidentAlert?.detected && accidentAlert.message ? (
                <Text style={[styles.alertMessage, { color: "#b91c1c" }]}>
                  {accidentAlert.message}
                </Text>
              ) : null}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUSES[accidentStatus].bg },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUSES[accidentStatus].color },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUSES[accidentStatus].color },
                  ]}
                >
                  {STATUSES[accidentStatus].label}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Feather name="clock" size={16} color="#6b7280" />
            </View>
            <Text style={styles.statLabel}>Ride Time</Text>
            <Text style={styles.statValue}>
              {rideActive ? formatTime(rideSeconds) : "0m"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Feather name="activity" size={16} color="#6b7280" />
            </View>
            <Text style={styles.statLabel}>Avg Speed</Text>
            <Text style={styles.statValue}>
              {rideActive ? "52 km/h" : "— km/h"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Feather name="map" size={16} color="#6b7280" />
            </View>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>
              {rideActive ? `${distanceKm} km` : "0.0 km"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Feather name="shield" size={16} color="#6b7280" />
            </View>
            <Text style={styles.statLabel}>Safety Score</Text>
            <Text
              style={[styles.statValue, { color: scoreColor(safetyScore) }]}
            >
              {safetyScore}
            </Text>
          </View>
        </View>

        {/* SOS button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => setSosVisible(true)}
          >
            <FontAwesome5 name="exclamation-triangle" size={18} color="#fff" />
            <Text style={styles.sosText}>Emergency SOS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons
            name="view-dashboard"
            size={24}
            color="#2563eb"
          />
          <Text style={styles.activeNavText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/navigation-page")}
        >
          <Ionicons name="navigate" size={24} color="#6b7280" />
          <Text style={styles.navText}>Navigation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/history")}
        >
          <Feather name="activity" size={24} color="#6b7280" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/contacts")}
        >
          <Feather name="users" size={24} color="#6b7280" />
          <Text style={styles.navText}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/settings-page")}
        >
          <Feather name="settings" size={24} color="#6b7280" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles — identical to original + smsSentBanner added
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.05)" },
  dropdownBox: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 150,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  menuItemText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  menuDivider: { height: 1, backgroundColor: "#f3f4f6" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    backgroundColor: "#2563eb",
    padding: 24,
    paddingTop: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  menuButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 10,
  },
  connectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  helmetIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  connectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  connectionTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  connectionSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  statusIndicatorDot: { width: 8, height: 8, borderRadius: 100 },
  section: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111827",
  },
  rideCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  rideLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rideStatusDot: { width: 10, height: 10, borderRadius: 5 },
  rideCardTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  rideCardSub: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  rideToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 8,
    gap: 6,
  },
  rideToggleBtnStop: { backgroundColor: "#ef4444" },
  rideToggleText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f59e0b",
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 100, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "700" },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  statIconRow: { marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 8 },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
    color: "#111827",
  },
  sosContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sosButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  sosText: { color: "#fff", fontSize: 16, fontWeight: "700" },
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
  navItem: { alignItems: "center" },
  activeNavText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  navText: { color: "#6b7280", fontSize: 11, marginTop: 4 },
  accidentOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  accidentCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    alignItems: "center",
  },
  accidentIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  accidentTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ef4444",
    marginBottom: 8,
    textAlign: "center",
  },
  accidentImpact: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  accidentMsg: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 12,
  },

  // NEW — SMS sent confirmation inside accident modal
  smsSentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: "100%",
  },
  smsSentText: { fontSize: 13, color: "#047857", fontWeight: "600", flex: 1 },

  accidentSOSBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 14,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  accidentSOSText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  accidentDismissBtn: {
    paddingVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  accidentDismissText: { color: "#9ca3af", fontSize: 14 },
});
