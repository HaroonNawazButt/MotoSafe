// app/dashboard-components/AlertBanner.jsx
// Shows warning / alert banners for DROWSINESS and ACCIDENT only.
// Lane detection has been removed from this component.
//
// Props:
//   drowsinessStatus    {0|1|2}  — 0 Safe, 1 Warning, 2 Alert
//   accidentStatus      {0|1|2}  — 0 Safe, 2 Alert
//   onDismissDrowsiness {func}   — optional, called when user taps ✕ on drowsiness banner

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";

export default function AlertBanner({
  drowsinessStatus = 0,
  accidentStatus   = 0,
  onDismissDrowsiness,
}) {
  // Nothing to show — all systems safe
  if (drowsinessStatus === 0 && accidentStatus === 0) return null;

  return (
    <View style={styles.container}>

      {/* ── ACCIDENT ALERT — highest priority ────────────────────────────── */}
      {accidentStatus === 2 && (
        <View style={[styles.banner, styles.accidentBanner]}>
          <View style={[styles.iconBox, styles.iconRed]}>
            <FontAwesome5 name="exclamation-triangle" size={16} color="#fff" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.accidentTitle}>Accident Detected!</Text>
            <Text style={styles.accidentSub}>
              Impact + tilt confirmed — check on rider
            </Text>
          </View>
          {/* Pulsing dot to grab attention */}
          <View style={styles.pulseDot} />
        </View>
      )}

      {/* ── DROWSINESS — ALERT level (3 nods triggered alert on ESP32) ───── */}
      {drowsinessStatus === 2 && (
        <View style={[styles.banner, styles.alertBanner]}>
          <View style={[styles.iconBox, { backgroundColor: "#ef4444" }]}>
            <Feather name="alert-circle" size={16} color="#fff" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.alertTitle}>Severe Drowsiness!</Text>
            <Text style={styles.alertSub}>
              Rider should pull over immediately
            </Text>
          </View>
          {/* Dismiss button — clears alert in Firebase via callback */}
          {onDismissDrowsiness && (
            <TouchableOpacity
              onPress={onDismissDrowsiness}
              style={styles.dismissBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color="#b91c1c" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── DROWSINESS — WARNING level (live drowsy_lvl >= 2 from sensors) ─ */}
      {drowsinessStatus === 1 && (
        <View style={[styles.banner, styles.warningBanner]}>
          <View style={[styles.iconBox, { backgroundColor: "#f59e0b" }]}>
            <Feather name="alert-circle" size={16} color="#fff" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.warningTitle}>Drowsiness Warning</Text>
            <Text style={styles.warningSub}>
              Head nodding detected — stay alert
            </Text>
          </View>
          {onDismissDrowsiness && (
            <TouchableOpacity
              onPress={onDismissDrowsiness}
              style={styles.dismissBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color="#92400e" />
            </TouchableOpacity>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },

  // ── Accident ─────────────────────────────────────────────────────────────
  accidentBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.4)",
  },
  accidentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b91c1c",
  },
  accidentSub: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 2,
  },

  // ── Drowsiness Alert (level 2 / severe) ───────────────────────────────────
  alertBanner: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.3)",
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b91c1c",
  },
  alertSub: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 2,
  },

  // ── Drowsiness Warning (level 1) ──────────────────────────────────────────
  warningBanner: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.35)",
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400e",
  },
  warningSub: {
    fontSize: 12,
    color: "#b45309",
    marginTop: 2,
  },

  // ── Shared ────────────────────────────────────────────────────────────────
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  iconRed: {
    backgroundColor: "#ef4444",
  },
  textBox: {
    flex: 1,
  },
  // Pulsing red dot for accident banner
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    flexShrink: 0,
  },
  // ✕ dismiss button
  dismissBtn: {
    padding: 4,
    flexShrink: 0,
  },
});