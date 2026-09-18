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

// ── Child modals (place these in components/settings/) ──
import ProfileEditModal from "./settings-components/ProfileEditModal";
import SecurityModal from "./settings-components/SecurityModal";
import HelmetDeviceModal from "./settings-components/HelmetDeviceModal";
import CalibrationModal from "./settings-components/CalibrationModal";
import NotificationSettingsModal from "./settings-components/NotificationSettingsModal";
import LanguageModal from "./settings-components/LanguageModal";
import PrivacyModal from "./settings-components/PrivacyModal";
import HelpSupportModal from "./settings-components/HelpSupportModal";

export default function SettingsPage() {
  const router = useRouter();

  // ── Profile state (updated by ProfileEditModal) ──
  const [profile, setProfile] = useState({
    name: "Haroon Nawaz",
    email: "haroonnawaz12345@gmail.com",
  });

  // ── Language label (updated by LanguageModal) ──
  const [languageLabel, setLanguageLabel] = useState("English (US)");

  // ── Modal visibility ──
  const [modals, setModals] = useState({
    profile: false,
    security: false,
    helmet: false,
    calibration: false,
    notifications: false,
    language: false,
    privacy: false,
    help: false,
  });

  const openModal = (key) =>
    setModals((prev) => ({ ...prev, [key]: true }));

  const closeModal = (key) =>
    setModals((prev) => ({ ...prev, [key]: false }));

  // ── Avatar initials helper ──
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // ── Settings sections ──
  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: "user",
          name: "Profile settings",
          subtitle: "Manage your personal information",
          action: () => openModal("profile"),
        },
        {
          icon: "lock",
          name: "Security",
          subtitle: "Password and authentication",
          action: () => openModal("security"),
        },
      ],
    },
    {
      title: "Device",
      items: [
        {
          icon: "shield",
          name: "Helmet device",
          subtitle: "MotoSafe Pro X1 • Connected",
          action: () => openModal("helmet"),
        },
        {
          icon: "settings",
          name: "Sensor calibration",
          subtitle: "Adjust helmet sensors",
          action: () => openModal("calibration"),
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "bell",
          name: "Notifications",
          subtitle: "Alerts and reminders",
          action: () => openModal("notifications"),
        },
        {
          icon: "globe",
          name: "Language",
          subtitle: languageLabel,
          action: () => openModal("language"),
        },
        {
          icon: "shield",
          name: "Privacy",
          subtitle: "Data and permissions",
          action: () => openModal("privacy"),
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "help-circle",
          name: "Help & support",
          subtitle: "FAQs and contact us",
          action: () => openModal("help"),
        },
        {
          icon: "info",
          name: "About Moto Safe",
          subtitle: "Version 2.4.1",
          action: () =>
            Alert.alert(
              "About MotoSafe",
              "MotoSafe v2.4.1\nBuilt for rider safety.\n\nFYP Project — FAST NUCES"
            ),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => openModal("profile")}
            >
              <Feather name="edit-2" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Settings Sections ── */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.settingItem,
                    index !== section.items.length - 1 && styles.borderBottom,
                  ]}
                  onPress={item.action}
                >
                  <View style={styles.iconBox}>
                    <Feather name={item.icon} size={20} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>{item.name}</Text>
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ── Logout ── */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() =>
              Alert.alert(
                "Logout",
                "Are you sure you want to logout?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Logout",
                    style: "destructive",
                    onPress: () => router.replace("/"),
                  },
                ]
              )
            }
          >
            <Feather name="log-out" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Bottom Navigation ── */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/dashboard")}
        >
          <MaterialCommunityIcons name="view-dashboard" size={24} color="#6b7280" />
          <Text style={styles.navText}>Dashboard</Text>
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

        <TouchableOpacity style={styles.navItem}>
          <Feather name="settings" size={24} color="#2563eb" />
          <Text style={styles.activeNavText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* ════════════ Modals ════════════ */}
      <ProfileEditModal
        visible={modals.profile}
        onClose={() => closeModal("profile")}
        onSave={(data) => setProfile({ name: data.name, email: data.email })}
      />

      <SecurityModal
        visible={modals.security}
        onClose={() => closeModal("security")}
      />

      <HelmetDeviceModal
        visible={modals.helmet}
        onClose={() => closeModal("helmet")}
      />

      <CalibrationModal
        visible={modals.calibration}
        onClose={() => closeModal("calibration")}
      />

      <NotificationSettingsModal
        visible={modals.notifications}
        onClose={() => closeModal("notifications")}
      />

      <LanguageModal
        visible={modals.language}
        onClose={() => closeModal("language")}
        onSelect={(lang) => setLanguageLabel(lang.label)}
      />

      <PrivacyModal
        visible={modals.privacy}
        onClose={() => closeModal("privacy")}
      />

      <HelpSupportModal
        visible={modals.help}
        onClose={() => closeModal("help")}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
//  Styles — unchanged from original design
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  profileCard: {
    backgroundColor: "#2563eb",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  profileName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 10,
    textTransform: "uppercase",
  },
  sectionCard: {
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 15,
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
  navItem: { alignItems: "center" },
  navText: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 4,
  },
  activeNavText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
});