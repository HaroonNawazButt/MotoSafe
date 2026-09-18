import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

const LANGUAGES = [
  { code: "en-US", label: "English (US)", flag: "🇺🇸", region: "United States" },
  { code: "en-GB", label: "English (UK)", flag: "🇬🇧", region: "United Kingdom" },
  { code: "ur", label: "اردو", flag: "🇵🇰", region: "Pakistan" },
  { code: "ar", label: "العربية", flag: "🇸🇦", region: "Arabic" },
  { code: "fr", label: "Français", flag: "🇫🇷", region: "French" },
  { code: "es", label: "Español", flag: "🇪🇸", region: "Spanish" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", region: "German" },
  { code: "zh", label: "中文", flag: "🇨🇳", region: "Chinese" },
];

export default function LanguageModal({ visible, onClose, onSelect }) {
  const [selected, setSelected] = useState("en-US");
  const [pending, setPending] = useState("en-US");

  const handleApply = () => {
    setSelected(pending);
    const lang = LANGUAGES.find((l) => l.code === pending);
    onSelect?.(lang);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Select Language</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            <View style={styles.list}>
              {LANGUAGES.map((lang, i) => {
                const isSelected = pending === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.item,
                      i !== LANGUAGES.length - 1 && styles.itemBorder,
                      isSelected && styles.itemSelected,
                    ]}
                    onPress={() => setPending(lang.code)}
                  >
                    <Text style={styles.flag}>{lang.flag}</Text>
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>
                        {lang.label}
                      </Text>
                      <Text style={styles.itemRegion}>{lang.region}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Feather name="check" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>Apply</Text>
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
  list: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderRadius: 10,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  itemSelected: { backgroundColor: "rgba(37,99,235,0.05)" },
  flag: { fontSize: 28 },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 2 },
  itemLabelActive: { color: "#2563eb" },
  itemRegion: { fontSize: 12, color: "#9ca3af" },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  actions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelText: { color: "#6b7280", fontWeight: "600", fontSize: 15 },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  applyText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
