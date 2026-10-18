// app/dashboard-components/EmergencySOSModal.jsx
// Emergency SOS modal — loads real contacts from AsyncStorage
// Same contacts the user saves in contacts.jsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";

const STORAGE_KEY = "motosafe_emergency_contacts";
const RESCUE_NUMBER = "1122";
const POLICE_NUMBER = "15";
const AMBULANCE_NUMBER = "115";

function callNumber(number) {
  Linking.openURL(`tel:${number}`).catch(() =>
    Alert.alert("Error", "Could not make the call."),
  );
}

export default function EmergencySOSModal({ visible, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [calling, setCalling] = useState(null);

  // Load contacts from AsyncStorage every time modal opens
  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) setContacts(JSON.parse(saved));
        else setContacts([]);
      })
      .catch(() => setContacts([]));
  }, [visible]);

  const handleCall = (contact) => {
    setCalling(contact.id);
    callNumber(contact.phone);
    setTimeout(() => setCalling(null), 3000);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.sosIconBox}>
                <FontAwesome5
                  name="exclamation-triangle"
                  size={20}
                  color="#fff"
                />
              </View>
              <View>
                <Text style={styles.headerTitle}>Emergency SOS</Text>
                <Text style={styles.headerSub}>
                  Call for immediate assistance
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Emergency services */}
          <View style={styles.servicesRow}>
            <TouchableOpacity
              style={styles.serviceBtn}
              onPress={() => callNumber(RESCUE_NUMBER)}
            >
              <View
                style={[styles.serviceIcon, { backgroundColor: "#ef4444" }]}
              >
                <Feather name="truck" size={18} color="#fff" />
              </View>
              <Text style={styles.serviceLabel}>Rescue</Text>
              <Text style={styles.serviceNumber}>{RESCUE_NUMBER}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceBtn}
              onPress={() => callNumber(AMBULANCE_NUMBER)}
            >
              <View
                style={[styles.serviceIcon, { backgroundColor: "#10b981" }]}
              >
                <Feather name="heart" size={18} color="#fff" />
              </View>
              <Text style={styles.serviceLabel}>Ambulance</Text>
              <Text style={styles.serviceNumber}>{AMBULANCE_NUMBER}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceBtn}
              onPress={() => callNumber(POLICE_NUMBER)}
            >
              <View
                style={[styles.serviceIcon, { backgroundColor: "#2563eb" }]}
              >
                <Feather name="shield" size={18} color="#fff" />
              </View>
              <Text style={styles.serviceLabel}>Police</Text>
              <Text style={styles.serviceNumber}>{POLICE_NUMBER}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Personal emergency contacts from AsyncStorage */}
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.contactsList}
          >
            {contacts.length === 0 ? (
              <View style={styles.noContacts}>
                <Feather name="users" size={32} color="#d1d5db" />
                <Text style={styles.noContactsText}>No contacts saved</Text>
                <Text style={styles.noContactsSub}>
                  Add contacts in the Contacts tab
                </Text>
              </View>
            ) : (
              contacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View
                    style={[styles.avatar, { backgroundColor: contact.color1 }]}
                  >
                    <Text style={styles.avatarText}>{contact.initials}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <View style={styles.contactMeta}>
                      <View style={styles.relationBadge}>
                        <Text style={styles.relationText}>
                          {contact.relation}
                        </Text>
                      </View>
                      <Text style={styles.phoneText}>{contact.phone}</Text>
                    </View>
                    {contact.primary && (
                      <Text style={styles.primaryLabel}>PRIMARY</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.callBtn,
                      calling === contact.id && styles.callingBtn,
                    ]}
                    onPress={() => handleCall(contact)}
                    disabled={!contact.phone || contact.phone === "—"}
                  >
                    <Feather name="phone-call" size={16} color="#fff" />
                    <Text style={styles.callText}>
                      {calling === contact.id ? "Calling…" : "Call"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Dismiss */}
          <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
            <Text style={styles.dismissText}>I am safe — close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sosIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  servicesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  serviceBtn: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 6,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  serviceLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  serviceNumber: { fontSize: 16, fontWeight: "800", color: "#111827" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  contactsList: { maxHeight: 260 },
  noContacts: { alignItems: "center", paddingVertical: 24, gap: 8 },
  noContactsText: { color: "#9ca3af", fontSize: 14, fontWeight: "600" },
  noContactsSub: { color: "#d1d5db", fontSize: 12 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  contactInfo: { flex: 1 },
  contactName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  contactMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  relationBadge: {
    backgroundColor: "rgba(37,99,235,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  relationText: { fontSize: 11, fontWeight: "700", color: "#2563eb" },
  phoneText: { fontSize: 12, color: "#6b7280" },
  primaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10b981",
    marginTop: 4,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  callingBtn: { backgroundColor: "#6b7280" },
  callText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  dismissBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  dismissText: { color: "#6b7280", fontSize: 15, fontWeight: "600" },
});
