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

const PERMISSIONS = [
  {
    key: "location",
    icon: "map-pin",
    label: "Location Access",
    subtitle: "Required for navigation and emergency sharing",
    locked: true,
  },
  {
    key: "rideData",
    icon: "database",
    label: "Ride Data Storage",
    subtitle: "Save ride history and safety events locally",
    locked: false,
  },
  {
    key: "emergencyShare",
    icon: "share-2",
    label: "Emergency Location Sharing",
    subtitle: "Share GPS location with contacts during accidents",
    locked: false,
  },
  {
    key: "analytics",
    icon: "bar-chart-2",
    label: "Usage Analytics",
    subtitle: "Help improve MotoSafe with anonymous data",
    locked: false,
  },
  {
    key: "crashReport",
    icon: "alert-circle",
    label: "Crash Reporting",
    subtitle: "Send automatic reports to improve the app",
    locked: false,
  },
];

export default function PrivacyModal({ visible, onClose }) {
  const [perms, setPerms] = useState({
    location: true,
    rideData: true,
    emergencyShare: true,
    analytics: false,
    crashReport: true,
  });

  const flip = (key) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Privacy & Permissions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {/* Info box */}
            <View style={styles.infoBanner}>
              <Feather name="shield" size={16} color="#2563eb" />
              <Text style={styles.infoText}>
                Your data is stored only on your device. MotoSafe never sells your personal information.
              </Text>
            </View>

            <View style={styles.card}>
              {PERMISSIONS.map((p, i) => (
                <View
                  key={p.key}
                  style={[styles.row, i !== PERMISSIONS.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.iconBox}>
                    <Feather name={p.icon} size={17} color="#2563eb" />
                  </View>
                  <View style={styles.rowContent}>
                    <View style={styles.labelRow}>
                      <Text style={styles.rowLabel}>{p.label}</Text>
                      {p.locked && (
                        <View style={styles.lockedBadge}>
                          <Feather name="lock" size={10} color="#9ca3af" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowSubtitle}>{p.subtitle}</Text>
                  </View>
                  <Switch
                    value={perms[p.key]}
                    onValueChange={() => !p.locked && flip(p.key)}
                    disabled={p.locked}
                    trackColor={{ false: "#e5e7eb", true: "#bfdbfe" }}
                    thumbColor={perms[p.key] ? "#2563eb" : "#d1d5db"}
                    ios_backgroundColor="#e5e7eb"
                  />
                </View>
              ))}
            </View>

            {/* Data deletion */}
            <View style={styles.dangerSection}>
              <Text style={styles.dangerTitle}>Data Management</Text>
              <TouchableOpacity style={styles.dangerBtn}>
                <Feather name="trash-2" size={16} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dangerBtnLabel}>Delete Ride History</Text>
                  <Text style={styles.dangerBtnSub}>Permanently remove all saved rides</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={onClose}>
            <Text style={styles.saveBtnText}>Save Preferences</Text>
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(37,99,235,0.07)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: "#1d4ed8", lineHeight: 18 },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 12 },
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
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  rowLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  lockedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  rowSubtitle: { fontSize: 12, color: "#9ca3af" },
  dangerSection: { marginBottom: 16 },
  dangerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff5f5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  dangerBtnLabel: { fontSize: 14, fontWeight: "600", color: "#ef4444", marginBottom: 2 },
  dangerBtnSub: { fontSize: 12, color: "#9ca3af" },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
