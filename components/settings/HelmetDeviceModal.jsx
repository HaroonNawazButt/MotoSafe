import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const BATTERY = 87;

const InfoRow = ({ icon, label, value, valueColor }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconBox}>
      <Feather name={icon} size={16} color="#2563eb" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  </View>
);

export default function HelmetDeviceModal({ visible, onClose }) {
  const [connected, setConnected] = useState(true);

  const batteryColor =
    BATTERY > 60 ? "#10b981" : BATTERY > 30 ? "#f59e0b" : "#ef4444";

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Helmet",
      "Are you sure you want to disconnect MotoSafe Pro X1?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => setConnected(false),
        },
      ]
    );
  };

  const handleReconnect = () => {
    Alert.alert("Connecting...", "Reconnecting to MotoSafe Pro X1.", [
      {
        text: "OK",
        onPress: () => setConnected(true),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Helmet Device</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Device Card */}
          <View style={styles.deviceCard}>
            <View style={styles.deviceIconWrapper}>
              <MaterialCommunityIcons name="shield-check" size={36} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceName}>MotoSafe Pro X1</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: connected ? "#10b981" : "#d1d5db" }]} />
                <Text style={[styles.statusText, { color: connected ? "#10b981" : "#9ca3af" }]}>
                  {connected ? "Connected" : "Disconnected"}
                </Text>
              </View>
            </View>
          </View>

          {/* Battery */}
          <View style={styles.batterySection}>
            <View style={styles.batteryHeader}>
              <Feather name="battery" size={16} color={batteryColor} />
              <Text style={styles.batteryTitle}>Battery Level</Text>
              <Text style={[styles.batteryPercent, { color: batteryColor }]}>{BATTERY}%</Text>
            </View>
            <View style={styles.batteryTrack}>
              <View
                style={[
                  styles.batteryFill,
                  { width: `${BATTERY}%`, backgroundColor: batteryColor },
                ]}
              />
            </View>
            <Text style={styles.batteryHint}>
              {BATTERY > 20 ? "Sufficient for your next ride" : "Please charge before riding"}
            </Text>
          </View>

          {/* Info rows */}
          <View style={styles.infoCard}>
            <InfoRow icon="cpu" label="Firmware Version" value="v3.1.4" />
            <View style={styles.divider} />
            <InfoRow icon="wifi" label="Signal Strength" value="Excellent (−52 dBm)" valueColor="#10b981" />
            <View style={styles.divider} />
            <InfoRow icon="bluetooth" label="Connection Type" value="Bluetooth 5.0 BLE" />
            <View style={styles.divider} />
            <InfoRow icon="clock" label="Last Synced" value="Just now" />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {connected ? (
              <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                <Feather name="bluetooth-off" size={18} color="#ef4444" />
                <Text style={styles.disconnectText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.reconnectBtn} onPress={handleReconnect}>
                <Feather name="bluetooth" size={18} color="#fff" />
                <Text style={styles.reconnectText}>Reconnect</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
              <Text style={styles.closeActionText}>Done</Text>
            </TouchableOpacity>
          </View>
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
  deviceCard: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  deviceIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  deviceName: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 6 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  batterySection: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  batteryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  batteryTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: "#374151" },
  batteryPercent: { fontSize: 16, fontWeight: "700" },
  batteryTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 6,
  },
  batteryFill: { height: "100%", borderRadius: 4 },
  batteryHint: { fontSize: 12, color: "#9ca3af" },
  infoCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginLeft: 46 },
  actions: { flexDirection: "row", gap: 12 },
  disconnectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fecaca",
  },
  disconnectText: { color: "#ef4444", fontWeight: "600", fontSize: 15 },
  reconnectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2563eb",
  },
  reconnectText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  closeActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  closeActionText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
