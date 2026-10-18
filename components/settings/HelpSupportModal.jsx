import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

const FAQS = [
  {
    q: "How does accident detection work?",
    a: "MotoSafe uses the MPU6050 sensor in your helmet to detect sudden impact and extreme tilt patterns. When a crash-like event is detected, the app activates emergency mode and notifies your emergency contacts with your GPS location.",
  },
  {
    q: "Why is the drowsiness detection not triggering?",
    a: "Drowsiness detection requires the helmet to be connected via Bluetooth. Ensure the helmet battery is charged and the app is in active monitoring mode. Calibrate the sensors if issues persist.",
  },
  {
    q: "How do I add emergency contacts?",
    a: "Go to the Contacts tab from the bottom navigation. Tap the '+' button to add a new contact. You can set one contact as 'Primary' — they will always be the first to be notified in an emergency.",
  },
  {
    q: "Does MotoSafe work without internet?",
    a: "Core safety features (lane detection, drowsiness, accident detection) work offline as they rely on the helmet sensors and Bluetooth. Internet is required for GPS navigation and sending emergency SMS notifications.",
  },
  {
    q: "How do I update the helmet firmware?",
    a: "Go to Settings > Device > Helmet Device. If a firmware update is available, you will see an 'Update Available' banner. Ensure the helmet is charged above 50% before starting an update.",
  },
];

export default function HelpSupportModal({ visible, onClose }) {
  const [expanded, setExpanded] = useState(null);

  const toggle = (i) => setExpanded(expanded === i ? null : i);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Help & Support</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
            {/* Contact options */}
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={styles.contactCard}
                onPress={() => Alert.alert("Email Support", "support@motosafe.pk")}
              >
                <View style={styles.contactIcon}>
                  <Feather name="mail" size={20} color="#2563eb" />
                </View>
                <Text style={styles.contactLabel}>Email Us</Text>
                <Text style={styles.contactSub}>support@motosafe.pk</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactCard}
                onPress={() => Alert.alert("Call Support", "+92 300 MOTOSAFE")}
              >
                <View style={styles.contactIcon}>
                  <Feather name="phone" size={20} color="#2563eb" />
                </View>
                <Text style={styles.contactLabel}>Call Us</Text>
                <Text style={styles.contactSub}>+92 300 MOTOSAFE</Text>
              </TouchableOpacity>
            </View>

            {/* FAQ */}
            <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
            <View style={styles.faqCard}>
              {FAQS.map((faq, i) => (
                <View key={i} style={[styles.faqItem, i !== FAQS.length - 1 && styles.faqBorder]}>
                  <TouchableOpacity style={styles.faqQuestion} onPress={() => toggle(i)}>
                    <Text style={[styles.faqQ, expanded === i && styles.faqQActive]}>
                      {faq.q}
                    </Text>
                    <Ionicons
                      name={expanded === i ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={expanded === i ? "#2563eb" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                  {expanded === i && (
                    <Text style={styles.faqA}>{faq.a}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Version */}
            <View style={styles.versionBox}>
              <Text style={styles.versionText}>MotoSafe v2.4.1 · FYP Edition</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
            <Text style={styles.closeActionText}>Close</Text>
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
  contactRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  contactCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  contactLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  contactSub: { fontSize: 11, color: "#9ca3af", textAlign: "center" },
  faqTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  faqCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  faqItem: { paddingVertical: 14 },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  faqQuestion: { flexDirection: "row", alignItems: "center", gap: 10 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "600", color: "#374151", lineHeight: 20 },
  faqQActive: { color: "#2563eb" },
  faqA: { fontSize: 13, color: "#6b7280", lineHeight: 19, marginTop: 10 },
  versionBox: { alignItems: "center", marginBottom: 10 },
  versionText: { fontSize: 12, color: "#d1d5db" },
  closeActionBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    marginTop: 4,
  },
  closeActionText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
