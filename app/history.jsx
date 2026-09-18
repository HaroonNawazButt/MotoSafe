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

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const today = new Date();
const fmt = (d) =>
  d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
};

const allRides = [
  // ── Today ──────────────────────────────────────────
  {
    date: today,
    title: "Ride to FAST University",
    time: "7:40 AM - 8:22 AM",
    status: "Safe",
    statusColor: "#10b981",
    statusBg: "rgba(16,185,129,0.1)",
    distance: "15.8 km",
    duration: "42 min",
    speed: "45 km/h",
    lane: 0,
    drowsy: 0,
    accident: 0,
  },

  {
    date: today,
    title: "Return home from FAST",
    time: "5:15 PM - 6:02 PM",
    status: "Safe",
    statusColor: "#10b981",
    statusBg: "rgba(16,185,129,0.1)",
    distance: "16.1 km",
    duration: "47 min",
    speed: "41 km/h",
    lane: 0,
    drowsy: 0,
    accident: 0,
  },

  // ── Yesterday ──────────────────────────────────────
  {
    date: daysAgo(1),
    title: "Evening grocery shopping",
    time: "7:10 PM - 7:42 PM",
    status: "Safe",
    statusColor: "#10b981",
    statusBg: "rgba(16,185,129,0.1)",
    distance: "8.4 km",
    duration: "32 min",
    speed: "34 km/h",
    lane: 0,
    drowsy: 0,
    accident: 0,
  },

  // ── This Week ──────────────────────────────────────
  {
    date: daysAgo(3),
    title: "Morning university commute",
    time: "8:00 AM - 8:46 AM",
    status: "Warning",
    statusColor: "#f59e0b",
    statusBg: "rgba(245,158,11,0.1)",
    distance: "17.2 km",
    duration: "46 min",
    speed: "39 km/h",
    lane: 1,
    drowsy: 1,
    accident: 0,
  },

  {
    date: daysAgo(4),
    title: "Ride back home after classes",
    time: "4:50 PM - 5:41 PM",
    status: "Safe",
    statusColor: "#10b981",
    statusBg: "rgba(16,185,129,0.1)",
    distance: "16.8 km",
    duration: "51 min",
    speed: "37 km/h",
    lane: 0,
    drowsy: 0,
    accident: 0,
  },

  {
    date: daysAgo(5),
    title: "Shopping trip to mall",
    time: "6:15 PM - 7:08 PM",
    status: "Safe",
    statusColor: "#10b981",
    statusBg: "rgba(16,185,129,0.1)",
    distance: "19.3 km",
    duration: "53 min",
    speed: "40 km/h",
    lane: 0,
    drowsy: 0,
    accident: 0,
  },

  // ── This Month ────────────────────────────────────
  {
    date: daysAgo(9),
    title: "Visit to hostel",
    time: "8:40 PM - 9:22 PM",
    status: "Safe",
    statusColor: "#10b981",
    statusBg: "rgba(16,185,129,0.1)",
    distance: "11.2 km",
    duration: "42 min",
    speed: "33 km/h",
    lane: 0,
    drowsy: 0,
    accident: 0,
  },

  {
    date: daysAgo(12),
    title: "Late night return from FAST",
    time: "11:05 PM - 11:54 PM",
    status: "Alert",
    statusColor: "#ef4444",
    statusBg: "rgba(239,68,68,0.1)",
    distance: "18.7 km",
    duration: "49 min",
    speed: "36 km/h",
    lane: 2,
    drowsy: 3,
    accident: 1,
  },

  {
    date: daysAgo(15),
    title: "Evening market visit",
    time: "5:20 PM - 6:01 PM",
    status: "Warning",
    statusColor: "#f59e0b",
    statusBg: "rgba(245,158,11,0.1)",
    distance: "13.5 km",
    duration: "41 min",
    speed: "35 km/h",
    lane: 1,
    drowsy: 1,
    accident: 0,
  },

  {
    date: daysAgo(18),
    title: "Ride home after lab",
    time: "6:10 PM - 7:00 PM",
    status: "Safe",
    statusColor: "#10b981",
    statusBg: "rgba(16,185,129,0.1)",
    distance: "17.4 km",
    duration: "50 min",
    speed: "39 km/h",
    lane: 0,
    drowsy: 0,
    accident: 0,
  },

  // ── Older Ride ────────────────────────────────────
  {
    date: daysAgo(35),
    title: "Weekend ride with friends",
    time: "4:30 PM - 8:00 PM",
    status: "Safe",
    statusColor: "#10b981",
    statusBg: "rgba(16,185,129,0.1)",
    distance: "70.6 km",
    duration: "3h 30m",
    speed: "52 km/h",
    lane: 0,
    drowsy: 0,
    accident: 0,
  },
];


// ── Helpers ──────────────────────────────────────────────────────────────────

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfWeek = (d) => {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay()); // Sunday
  s.setHours(0, 0, 0, 0);
  return s;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

const getDateLabel = (date) => {
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, daysAgo(1))) return "Yesterday";
  return fmt(date);
};

const filterRides = (tab) => {
  const now = today;
  if (tab === "This week") {
    const weekStart = startOfWeek(now);
    return allRides.filter((r) => r.date >= weekStart);
  }
  if (tab === "This month") {
    const monthStart = startOfMonth(now);
    return allRides.filter((r) => r.date >= monthStart);
  }
  return allRides; // "All rides"
};

// Group rides by date label preserving order
const groupRides = (rides) => {
  const groups = [];
  const seen = {};
  rides.forEach((ride) => {
    const label = getDateLabel(ride.date);
    if (!seen[label]) {
      seen[label] = true;
      groups.push({ label, rides: [] });
    }
    groups[groups.length - 1].rides.push(ride);
  });
  return groups;
};

// ── Summary totals ────────────────────────────────────────────────────────────

const parsekm = (s) => parseFloat(s.replace(" km", "").replace(",", ""));

const getSummary = (rides) => {
  const totalKm = rides.reduce((acc, r) => acc + parsekm(r.distance), 0);
  const totalMin = rides.reduce((acc, r) => {
    const m = r.duration.match(/(\d+)h\s*(\d+)m|(\d+)\s*min|(\d+)h/);
    if (!m) return acc;
    if (m[1]) return acc + parseInt(m[1]) * 60 + parseInt(m[2] || 0);
    if (m[3]) return acc + parseInt(m[3]);
    if (m[4]) return acc + parseInt(m[4]) * 60;
    return acc;
  }, 0);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return {
    count: rides.length,
    distance:
      totalKm >= 1000
        ? `${(totalKm / 1000).toFixed(1)}k km`
        : `${totalKm.toFixed(0)} km`,
    time: hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`,
  };
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All rides");

  const filtered = filterRides(activeTab);
  const grouped = groupRides(filtered);
  const summary = getSummary(filtered);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ride History</Text>
          </View>
          <TouchableOpacity>
            <Feather name="sliders" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Dynamic Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.count}</Text>
            <Text style={styles.summaryLabel}>Total rides</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.distance}</Text>
            <Text style={styles.summaryLabel}>Total distance</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.time}</Text>
            <Text style={styles.summaryLabel}>Total time</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs — NOT inside ScrollView to stay fixed */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {["All rides", "This week", "This month"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Ride List */}
      <ScrollView
        style={styles.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No rides found</Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label}>
              <Text style={styles.dayLabel}>{group.label}</Text>
              {group.rides.map((ride, i) => (
                <RideCard key={i} ride={ride} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/dashboard")}
        >
          <MaterialCommunityIcons
            name="view-dashboard"
            size={24}
            color="#6b7280"
          />
          <Text style={styles.navText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/navigation-page")}
        >
          <Ionicons name="navigate" size={24} color="#6b7280" />
          <Text style={styles.navText}>Navigation</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Feather name="activity" size={24} color="#2563eb" />
          <Text style={styles.activeNavText}>History</Text>
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

// ── RideCard sub-component ────────────────────────────────────────────────────

function RideCard({ ride }) {
  return (
    <View style={styles.rideCard}>
      {/* Card Header */}
      <View style={styles.rideHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.rideTitleRow}>
            <Feather name="clock" size={16} color="#2563eb" />
            <Text style={styles.rideTitle}>{ride.title}</Text>
          </View>
          <Text style={styles.rideTime}>{ride.time}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: ride.statusBg }]}>
          <Text style={[styles.statusText, { color: ride.statusColor }]}>
            {ride.status}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsBox}>
        <View style={styles.statItem}>
          <Ionicons name="navigate" size={14} color="#6b7280" />
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{ride.distance}</Text>
        </View>
        <View style={styles.statItem}>
          <Feather name="clock" size={14} color="#6b7280" />
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{ride.duration}</Text>
        </View>
        <View style={styles.statItem}>
          <Feather name="activity" size={14} color="#6b7280" />
          <Text style={styles.statLabel}>Avg Speed</Text>
          <Text style={styles.statValue}>{ride.speed}</Text>
        </View>
      </View>

      {/* Safety Alerts */}
      <View style={styles.alertSection}>
        <Text style={styles.alertTitle}>Safety alerts</Text>
        <View style={styles.alertRow}>
          <View style={styles.alertRed}>
            <MaterialCommunityIcons name="radar" size={14} color="#dc2626" />
            <Text style={styles.redText}>{ride.lane} lane</Text>
          </View>
          <View style={styles.alertYellow}>
            <Feather name="smile" size={14} color="#d97706" />
            <Text style={styles.yellowText}>{ride.drowsy} drowsy</Text>
          </View>
          <View style={styles.alertBlue}>
            <Feather name="shield" size={14} color="#2563eb" />
            <Text style={styles.blueText}>{ride.accident} impact</Text>
          </View>
        </View>
      </View>

      {/* Details Button */}
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() =>
          Alert.alert(
            "Ride Details",
            `Viewing detailed stats for ${ride.title}`,
          )
        }
      >
        <Text style={styles.detailsText}>View details</Text>
        <Ionicons name="chevron-forward" size={16} color="#2563eb" />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },

  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },

  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryValue: { fontSize: 22, fontWeight: "700", color: "#111827" },
  summaryLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },

  // Tabs fixed below header
  tabsWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
  },
  tabButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    marginRight: 10,
  },
  activeTabButton: { backgroundColor: "#2563eb" },
  tabText: { color: "#6b7280", fontWeight: "600", fontSize: 13 },
  activeTabText: { color: "#fff" },

  // Scroll list takes remaining space
  listScroll: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 100 },

  emptyState: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 15, fontWeight: "600" },

  dayLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: 10,
    marginTop: 8,
  },

  rideCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  rideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  rideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  rideTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  rideTime: { color: "#6b7280", fontSize: 13 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "700" },

  statsBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  statItem: { flex: 1 },
  statLabel: { fontSize: 11, color: "#6b7280", marginTop: 5 },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 5,
  },

  alertSection: { marginBottom: 16 },
  alertTitle: { fontSize: 12, color: "#6b7280", marginBottom: 10 },
  alertRow: { flexDirection: "row", gap: 8 },

  alertRed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
  },
  alertYellow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
  },
  alertBlue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
  },
  redText: { color: "#991b1b", fontWeight: "700", fontSize: 12 },
  yellowText: { color: "#92400e", fontWeight: "700", fontSize: 12 },
  blueText: { color: "#1e40af", fontWeight: "700", fontSize: 12 },

  detailsButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 13,
  },
  detailsText: { color: "#2563eb", fontWeight: "700", fontSize: 14 },

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
});
