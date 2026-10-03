import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";
import {
  HELMET_MODE,
  HELMET_STATUS,
  getHelmetStatus,
  subscribeHelmetStatus,
  connectHelmet,
  disconnectHelmet,
} from "../services/helmet/helmetService";

import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

export default function HelmetConnectPage() {
  const router = useRouter();
  const [helmetStatus, setHelmetStatus] = useState(
    getHelmetStatus()
  );

  useEffect(() => {
    const unsubscribe = subscribeHelmetStatus(setHelmetStatus);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleStartSimulation = () => {
    const result = connectHelmet(HELMET_MODE.SIMULATION);

    if (!result.success) {
      Alert.alert("Simulation Failed", result.message);
      return;
    }

    Alert.alert(
      "Simulation Started",
      "Development mode is active. No physical helmet is connected."
    );
  };

  const handleDisconnect = () => {
    disconnectHelmet();

    Alert.alert(
      "Simulation Stopped",
      "Helmet simulation has been disconnected."
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color="#111827"
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              Connect your helmet
            </Text>
          </View>
        </View>

        {/* Helmet Illustration */}
        <View style={styles.heroSection}>
          <View style={styles.helmetWrapper}>
            {/* Pulse Circles */}
            <View style={styles.pulse1} />
            <View style={styles.pulse2} />
            <View style={styles.pulse3} />

            {/* Helmet Circle */}
            <View style={styles.helmetCircle}>
              <MaterialCommunityIcons
                name="motorbike"
                size={72}
                color="#2563eb"
              />
            </View>

            {/* Bluetooth Button */}
            <View style={styles.bluetoothButton}>
              <MaterialCommunityIcons
                name="wifi"
                size={26}
                color="#fff"
              />
            </View>
          </View>

          <Text style={styles.heroText}>
            Helmet Communication Testing
          </Text>
        </View>

        {/* Development Simulation Control */}
        <View style={styles.scanContainer}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              helmetStatus === HELMET_STATUS.SIMULATED && {
                backgroundColor: "#6b7280",
              },
            ]}
            onPress={handleStartSimulation}
            disabled={helmetStatus === HELMET_STATUS.SIMULATED}
          >
            <Feather
              name="monitor"
              size={18}
              color="#fff"
            />

            <Text style={styles.scanButtonText}>
              {helmetStatus === HELMET_STATUS.SIMULATED
                ? "Simulation Running"
                : "Start Helmet Simulation"}
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              color: "#6b7280",
              fontSize: 12,
              textAlign: "center",
              marginTop: 10,
              lineHeight: 18,
            }}
          >
            Developer testing only. This does not scan for or connect
            to physical helmet hardware.
          </Text>
        </View>

        {/* Status Banner */}
        {helmetStatus === HELMET_STATUS.SIMULATED && (
          <View style={styles.statusBanner}>
            <View style={styles.statusIcon}>
              <Feather
                name="monitor"
                size={18}
                color="#fff"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                Helmet Simulation Active
              </Text>

              <Text style={styles.statusSubtitle}>
                Development mode only. No physical helmet is connected.
              </Text>
            </View>
          </View>
        )}

        {/* Simulation Disconnect Button */}
        {helmetStatus === HELMET_STATUS.SIMULATED && (
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
          >
            <Feather
              name="power"
              size={18}
              color="#dc2626"
            />

            <Text style={styles.disconnectButtonText}>
              Stop Helmet Simulation
            </Text>
          </TouchableOpacity>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#2563eb"
            style={{ marginTop: 2 }}
          />

          <Text style={styles.infoText}>
            Simulation mode allows developers to test MotoSafe
            without physical helmet hardware. Real ESP32 Wi-Fi
            communication will be enabled after hardware integration.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },

  heroSection: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor:
      "rgba(37,99,235,0.03)",
  },

  helmetWrapper: {
    width: 220,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  pulse1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 100,
    backgroundColor:
      "rgba(37,99,235,0.08)",
  },

  pulse2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 100,
    backgroundColor:
      "rgba(37,99,235,0.05)",
  },

  pulse3: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 120,
    backgroundColor:
      "rgba(37,99,235,0.03)",
  },

  helmetCircle: {
    width: 140,
    height: 140,
    borderRadius: 100,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  bluetoothButton: {
    position: "absolute",
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 100,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },

  heroText: {
    color: "#6b7280",
    fontSize: 14,
  },

  scanContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },

  scanButton: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  scanButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  devicesContainer: {
    paddingHorizontal: 20,
    marginTop: 26,
  },

  devicesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 14,
  },

  deviceCard: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  deviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  deviceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },

  deviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  signalDot: {
    width: 7,
    height: 7,
    borderRadius: 100,
  },

  signalText: {
    fontSize: 12,
    color: "#9ca3af",
  },

  connectButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  connectButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  statusBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor:
      "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor:
      "rgba(16,185,129,0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 100,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },

  statusTitle: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },

  statusSubtitle: {
    color: "#059669",
    fontSize: 12,
  },

  disconnectButton: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  disconnectButtonText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "700",
  },

  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor:
      "rgba(37,99,235,0.05)",
    borderWidth: 1,
    borderColor:
      "rgba(37,99,235,0.15)",
    flexDirection: "row",
    gap: 10,
  },

  infoText: {
    flex: 1,
    color: "#1e40af",
    fontSize: 13,
    lineHeight: 20,
  },
});