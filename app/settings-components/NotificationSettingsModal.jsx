import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

const SECTIONS = [
  {
    title: "Safety Alerts",
    items: [
      {
        key: "lane",
        icon: "alert-triangle",
        label: "Lane Change Warnings",
        subtitle: "Notify when unsafe lane change detected",
        locked: false,
      },
      {
        key: "drowsy",
        icon: "moon",
        label: "Drowsiness Alerts",
        subtitle: "Alert when fatigue or drowsiness detected",
        locked: false,
      },
      {
        key: "accident",
        icon: "zap",
        label: "Accident Detection",
        subtitle: "Cannot be disabled — critical safety feature",
        locked: true,
      },
    ],
  },
  {
    title: "Navigation",
    items: [
      {
        key: "nav",
        icon: "navigation",
        label: "Turn-by-Turn Directions",
        subtitle: "Audio prompts during navigation",
        locked: false,
      },
      {
        key: "speed",
        icon: "activity",
        label: "Speed Alerts",
        subtitle: "Warn when exceeding safe speed",
        locked: false,
      },
    ],
  },
  {
    title: "Emergency",
    items: [
      {
        key: "emergency",
        icon: "phone-call",
        label: "Emergency Contact Alerts",
        subtitle: "Notify contacts during accidents",
        locked: true,
      },
      {
        key: "location",
        icon: "map-pin",
        label: "Location Sharing",
        subtitle: "Share GPS with emergency contacts",
        locked: false,
      },
    ],
  },
];

export default function NotificationSettingsModal({ visible, onClose }) {
  const [toggles, setToggles] = useState({
    lane: true,
    drowsy: true,
    accident: true,
    nav: true,
    speed: false,
    emergency: true,
    location: true,
  });

  const flip = (key) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Notification Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {SECTIONS.map((section, si) => (
              <View key={si} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionCard}>
                  {section.items.map((item, ii) => (
                    <View
                      key={item.key}
                      style={[
                        styles.row,
                        ii !== section.items.length - 1 && styles.rowBorder,
                      ]}
                    >
                      <View style={styles.iconBox}>
                        <Feather name={item.icon} size={18} color="#2563eb" />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                        <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                      </View>
                      <Switch
                        value={toggles[item.key]}
                        onValueChange={() => !item.locked && flip(item.key)}
                        disabled={item.locked}
                        trackColor={{ false: "#e5e7eb", true: "#bfdbfe" }}
                        thumbColor={toggles[item.key] ? "#2563eb" : "#d1d5db"}
                        ios_backgroundColor="#e5e7eb"
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <View style={styles.lockedNote}>
              <Feather name="lock" size={13} color="#9ca3af" />
              <Text style={styles.lockedNoteText}>
                Locked toggles are critical safety features that cannot be disabled.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 2 },
  rowSubtitle: { fontSize: 12, color: "#9ca3af" },
  lockedNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  lockedNoteText: { flex: 1, fontSize: 12, color: "#9ca3af", lineHeight: 17 },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    marginTop: 4,
  },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
