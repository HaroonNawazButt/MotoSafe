import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";

import { useRouter } from "expo-router";

import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

export default function HelmetConnectPage() {
  const router = useRouter();

  const [isScanning, setIsScanning] =
    useState(false);

  const [showDevices, setShowDevices] =
    useState(false);

  const [connectedDevice, setConnectedDevice] =
    useState(null);

  const devices = [
    {
      id: 1,
      name: "MotoSafe Pro X1",
      signal: "Strong",
      signalColor: "#10b981",
      connectable: true,
    },

    {
      id: 2,
      name: "MotoSafe Lite",
      signal: "Medium",
      signalColor: "#f59e0b",
      connectable: true,
    },

    {
      id: 3,
      name: "BT Device 4F:A2",
      signal: "Weak",
      signalColor: "#ef4444",
      connectable: false,
    },
  ];

  const startScanning = () => {
    setIsScanning(true);
    setShowDevices(false);

    setTimeout(() => {
      setIsScanning(false);
      setShowDevices(true);
    }, 1500);
  };

  const connectDevice = (device) => {
    if (!device.connectable) return;

    setConnectedDevice(device.name);

    Alert.alert(
      "Helmet Connected",
      `${device.name} connected successfully!`
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
                name="motorbike-helmet"
                size={72}
                color="#2563eb"
              />
            </View>

            {/* Bluetooth Button */}
            <View style={styles.bluetoothButton}>
              <MaterialCommunityIcons
                name="bluetooth"
                size={26}
                color="#fff"
              />
            </View>
          </View>

          <Text style={styles.heroText}>
            Make sure Bluetooth is enabled on
            your device
          </Text>
        </View>

        {/* Scan Button */}
        <View style={styles.scanContainer}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              isScanning && {
                opacity: 0.7,
              },
            ]}
            onPress={startScanning}
            disabled={isScanning}
          >
            <Feather
              name="search"
              size={18}
              color="#fff"
            />

            <Text style={styles.scanButtonText}>
              {isScanning
                ? "Scanning..."
                : "Scan for helmet devices"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Device List */}
        {showDevices && (
          <View style={styles.devicesContainer}>
            <Text style={styles.devicesTitle}>
              Available devices
            </Text>

            {devices.map((device) => (
              <View
                key={device.id}
                style={styles.deviceCard}
              >
                <View
                  style={[
                    styles.deviceIcon,
                    {
                      backgroundColor:
                        device.connectable
                          ? "rgba(37,99,235,0.1)"
                          : "rgba(107,114,128,0.1)",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="motorbike-helmet"
                    size={28}
                    color={
                      device.connectable
                        ? "#2563eb"
                        : "#6b7280"
                    }
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View
                    style={styles.deviceNameRow}
                  >
                    <Text
                      style={[
                        styles.deviceName,
                        !device.connectable && {
                          color: "#6b7280",
                        },
                      ]}
                    >
                      {device.name}
                    </Text>

                    <View
                      style={[
                        styles.signalDot,
                        {
                          backgroundColor:
                            device.signalColor,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={styles.signalText}
                  >
                    Signal strength:{" "}
                    {device.signal}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.connectButton,
                    !device.connectable && {
                      backgroundColor:
                        "#e5e7eb",
                    },

                    connectedDevice ===
                      device.name && {
                      backgroundColor:
                        "#10b981",
                    },
                  ]}
                  disabled={!device.connectable}
                  onPress={() =>
                    connectDevice(device)
                  }
                >
                  <Text
                    style={[
                      styles.connectButtonText,
                      !device.connectable && {
                        color: "#9ca3af",
                      },
                    ]}
                  >
                    {connectedDevice ===
                    device.name
                      ? "Connected"
                      : "Connect"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Status Banner */}
        {connectedDevice && (
          <View style={styles.statusBanner}>
            <View style={styles.statusIcon}>
              <Feather
                name="check"
                size={18}
                color="#fff"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                Connected to{" "}
                {connectedDevice}
              </Text>

              <Text
                style={styles.statusSubtitle}
              >
                Your helmet is ready to use
              </Text>
            </View>
          </View>
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
            Make sure your helmet is powered
            on and within range. The LED
            indicator should be blinking blue.
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