// app/contacts.jsx
// Emergency contacts with:
// - Pick from phone book (expo-contacts)
// - Persistent storage (AsyncStorage)
// - SMS sent automatically on accident detection

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { useRouter } from "expo-router";
import * as Contacts from "expo-contacts";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const STORAGE_KEY = "motosafe_emergency_contacts";

const RELATION_OPTIONS = [
  "Brother",
  "Sister",
  "Mother",
  "Father",
  "Friend",
  "Cousin",
  "Spouse",
  "Other",
];

const AVATAR_COLORS = [
  { color1: "#2563eb" },
  { color1: "#10b981" },
  { color1: "#f59e0b" },
  { color1: "#ec4899" },
  { color1: "#8b5cf6" },
  { color1: "#ef4444" },
  { color1: "#06b6d4" },
];

function getInitials(name = "") {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─────────────────────────────────────────
export default function ContactsPage() {
  const router = useRouter();

  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRelation, setEditRelation] = useState("");

  // Manual add modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState("Friend");

  // ── Load contacts from AsyncStorage on mount ──────────────
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setContacts(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Load contacts error:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveContacts = async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setContacts(updated);
    } catch (e) {
      console.error("Save contacts error:", e);
    }
  };

  // ── Pick from phone book ──────────────────────────────────
  const pickFromPhoneBook = async () => {
    try {
      // Request permission
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow contacts access to pick from your phone book.",
          [{ text: "OK" }],
        );
        return;
      }

      // Get all contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      if (data.length === 0) {
        Alert.alert("No contacts", "No contacts found on your device.");
        return;
      }

      // Filter contacts that have phone numbers
      const withPhone = data
        .filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

      // Show picker
      showContactPicker(withPhone);
    } catch (error) {
      Alert.alert("Error", "Could not access contacts: " + error.message);
    }
  };

  // ── Show contact picker alert ─────────────────────────────
  // Shows first 10 contacts as alert options
  // For a real app, a FlatList modal would be better
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerContacts, setPickerContacts] = useState([]);
  const [pickerSearch, setPickerSearch] = useState("");

  const showContactPicker = (contactList) => {
    setPickerContacts(contactList);
    setPickerSearch("");
    setPickerVisible(true);
  };

  const selectPhoneBookContact = (contact) => {
    setPickerVisible(false);

    // If multiple phone numbers, use the first one
    const phone = contact.phoneNumbers?.[0]?.number ?? "";

    // Pre-fill the add modal
    setNewName(contact.name ?? "");
    setNewPhone(phone);
    setNewRelation("Friend");
    setAddModalVisible(true);
  };

  // ── Set primary ───────────────────────────────────────────
  const setPrimaryContact = (id) => {
    const updated = contacts
      .map((c) => ({ ...c, primary: c.id === id }))
      .sort((a, b) => b.primary - a.primary);
    saveContacts(updated);
  };

  // ── Delete ────────────────────────────────────────────────
  const deleteContact = (id, name) => {
    Alert.alert("Delete Contact", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const updated = contacts.filter((c) => c.id !== id);
          saveContacts(updated);
        },
      },
    ]);
  };

  // ── Edit ──────────────────────────────────────────────────
  const openEdit = (contact) => {
    setEditingContact(contact);
    setEditName(contact.name);
    setEditPhone(contact.phone);
    setEditRelation(contact.relation);
    setEditModalVisible(true);
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    const updated = contacts.map((c) =>
      c.id === editingContact.id
        ? {
            ...c,
            name: editName.trim(),
            phone: editPhone.trim(),
            relation: editRelation,
            initials: getInitials(editName.trim()),
          }
        : c,
    );
    saveContacts(updated);
    setEditModalVisible(false);
  };

  // ── Add manually ──────────────────────────────────────────
  const openAdd = () => {
    setNewName("");
    setNewPhone("");
    setNewRelation("Friend");
    setAddModalVisible(true);
  };

  const saveAdd = () => {
    if (!newName.trim()) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    const colorSet = AVATAR_COLORS[contacts.length % AVATAR_COLORS.length];
    const newContact = {
      id: Date.now(),
      name: newName.trim(),
      initials: getInitials(newName.trim()),
      phone: newPhone.trim() || "—",
      relation: newRelation,
      primary: contacts.length === 0, // first contact is primary
      color1: colorSet.color1,
    };
    const updated = [...contacts, newContact];
    if (contacts.length === 0) {
      saveContacts(updated);
    } else {
      saveContacts(updated);
    }
    setAddModalVisible(false);
  };

  // ── Filter ────────────────────────────────────────────────
  const filtered = searchQuery.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery) ||
          c.relation.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : contacts;

  // ── Relation picker ───────────────────────────────────────
  const RelationPicker = ({ value, onChange }) => (
    <View style={styles.relationPickerRow}>
      {RELATION_OPTIONS.map((rel) => (
        <TouchableOpacity
          key={rel}
          style={[
            styles.relationChip,
            value === rel && styles.relationChipActive,
          ]}
          onPress={() => onChange(rel)}
        >
          <Text
            style={[
              styles.relationChipText,
              value === rel && styles.relationChipTextActive,
            ]}
          >
            {rel}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#6b7280" }}>Loading contacts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Filtered picker contacts ──────────────────────────────
  const filteredPicker = pickerSearch.trim()
    ? pickerContacts.filter((c) =>
        c.name?.toLowerCase().includes(pickerSearch.toLowerCase()),
      )
    : pickerContacts;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Phone Book Picker Modal ───────────────────────── */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Search in picker */}
          <View style={styles.pickerSearchBar}>
            <Feather name="search" size={16} color="#9ca3af" />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#9ca3af"
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoFocus
            />
          </View>

          <ScrollView>
            {filteredPicker.map((contact, idx) => (
              <TouchableOpacity
                key={contact.id ?? idx}
                style={styles.pickerContact}
                onPress={() => selectPhoneBookContact(contact)}
              >
                <View
                  style={[
                    styles.pickerAvatar,
                    {
                      backgroundColor:
                        AVATAR_COLORS[idx % AVATAR_COLORS.length].color1,
                    },
                  ]}
                >
                  <Text style={styles.pickerAvatarText}>
                    {getInitials(contact.name ?? "?")}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerName}>{contact.name}</Text>
                  <Text style={styles.pickerPhone}>
                    {contact.phoneNumbers?.[0]?.number ?? "No number"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>
            ))}
            {filteredPicker.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No contacts found</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Emergency Contacts</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSearch((s) => !s)}>
            <Feather
              name={showSearch ? "x" : "search"}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        {showSearch ? (
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.headerSubtitle}>
            These contacts will be notified on accident detection
          </Text>
        )}
      </View>

      {/* ── SMS info banner ───────────────────────────────── */}
      {!searchQuery && contacts.length > 0 && (
        <View style={styles.smsBanner}>
          <Feather name="message-square" size={16} color="#059669" />
          <Text style={styles.smsBannerText}>
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} will
            receive SMS when an accident is detected
          </Text>
        </View>
      )}

      {/* ── Contact List ─────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.contactsContainer}>
          {filtered.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Feather name="users" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No contacts found"
                  : "No emergency contacts yet"}
              </Text>
              {!searchQuery && (
                <Text style={styles.emptySubText}>
                  Add contacts below to enable accident SMS alerts
                </Text>
              )}
            </View>
          )}

          {filtered.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              activeOpacity={0.85}
              onPress={() => setPrimaryContact(contact.id)}
              style={[
                styles.contactCard,
                contact.primary && styles.primaryCard,
              ]}
            >
              {contact.primary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryText}>PRIMARY</Text>
                </View>
              )}

              <View style={styles.contactRow}>
                <View
                  style={[styles.avatar, { backgroundColor: contact.color1 }]}
                >
                  <Text style={styles.avatarText}>{contact.initials}</Text>
                </View>

                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <View style={styles.phoneRow}>
                    <Feather name="phone" size={14} color="#6b7280" />
                    <Text style={styles.phoneText}>{contact.phone}</Text>
                  </View>
                  <View style={styles.relationBadge}>
                    <Text
                      style={[
                        styles.relationText,
                        { color: contact.primary ? "#2563eb" : "#4b5563" },
                      ]}
                    >
                      {contact.relation}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      openEdit(contact);
                    }}
                  >
                    <Feather name="edit-2" size={16} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      deleteContact(contact.id, contact.name);
                    }}
                  >
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Add buttons */}
          {!searchQuery && (
            <>
              {/* Pick from phone book */}
              <TouchableOpacity
                style={styles.phoneBookCard}
                onPress={pickFromPhoneBook}
              >
                <View style={styles.phoneBookIcon}>
                  <Feather name="book" size={26} color="#2563eb" />
                </View>
                <Text style={styles.addTitle}>Add from phone book</Text>
                <Text style={styles.addSubtitle}>
                  Pick a contact from your phone
                </Text>
              </TouchableOpacity>

              {/* Add manually */}
              <TouchableOpacity style={styles.addCard} onPress={openAdd}>
                <View style={styles.addCircle}>
                  <Ionicons name="add" size={28} color="#2563eb" />
                </View>
                <Text style={styles.addTitle}>Add manually</Text>
                <Text style={styles.addSubtitle}>Enter name and number</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Info banner */}
          {!searchQuery && (
            <View style={styles.infoBanner}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#2563eb"
                style={{ marginTop: 2 }}
              />
              <Text style={styles.infoText}>
                Tap a contact to set as primary. The primary contact is notified
                first. All contacts receive SMS when an accident is detected by
                the helmet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Edit Modal ───────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Contact</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {editingContact && (
              <View style={styles.modalAvatarRow}>
                <View
                  style={[
                    styles.modalAvatar,
                    { backgroundColor: editingContact.color1 },
                  ]}
                >
                  <Text style={styles.modalAvatarText}>
                    {getInitials(editName) || editingContact.initials}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter full name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+92 300 0000000"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Relation</Text>
            <RelationPicker value={editRelation} onChange={setEditRelation} />

            <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Modal ────────────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Contact</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAvatarRow}>
              <View
                style={[
                  styles.modalAvatar,
                  {
                    backgroundColor:
                      AVATAR_COLORS[contacts.length % AVATAR_COLORS.length]
                        .color1,
                  },
                ]}
              >
                <Text style={styles.modalAvatarText}>
                  {getInitials(newName) || "?"}
                </Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={styles.fieldInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter full name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="+92 300 0000000"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Relation</Text>
            <RelationPicker value={newRelation} onChange={setNewRelation} />

            <TouchableOpacity style={styles.saveButton} onPress={saveAdd}>
              <Text style={styles.saveButtonText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Bottom Nav ───────────────────────────────────── */}
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
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/history")}
        >
          <Feather name="activity" size={24} color="#6b7280" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="users" size={24} color="#2563eb" />
          <Text style={styles.activeNavText}>Contacts</Text>
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
    marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  headerSubtitle: { fontSize: 14, color: "#6b7280" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", padding: 0 },

  smsBanner: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smsBannerText: { flex: 1, fontSize: 13, color: "#047857", fontWeight: "600" },

  contactsContainer: { padding: 20 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { color: "#9ca3af", fontSize: 15, fontWeight: "600" },
  emptySubText: { color: "#d1d5db", fontSize: 13, textAlign: "center" },

  contactCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  primaryCard: { borderWidth: 2, borderColor: "#2563eb" },
  primaryBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 10,
  },
  primaryText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  contactRow: { flexDirection: "row" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  contactInfo: { flex: 1 },
  contactName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  phoneText: { color: "#6b7280", fontSize: 14, marginTop: 5, paddingTop: 2 },
  relationBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(107,114,128,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  relationText: { fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  phoneBookCard: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#2563eb",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.05)",
    marginTop: 4,
    marginBottom: 12,
  },
  phoneBookIcon: {
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  addCard: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#93c5fd",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.03)",
    marginTop: 4,
  },
  addCircle: {
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  addTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563eb",
    marginBottom: 4,
  },
  addSubtitle: { color: "#6b7280", fontSize: 13 },

  infoBanner: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    backgroundColor: "rgba(37,99,235,0.05)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
    borderRadius: 12,
    padding: 14,
  },
  infoText: { flex: 1, color: "#1e40af", fontSize: 13, lineHeight: 20 },

  // Phone book picker
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  pickerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  pickerSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: "#111827", padding: 0 },
  pickerContact: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
    gap: 14,
  },
  pickerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerAvatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  pickerName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  pickerPhone: { fontSize: 13, color: "#6b7280", marginTop: 2 },

  // Bottom nav
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

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  modalAvatarRow: { alignItems: "center", marginBottom: 20 },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  modalAvatarText: { color: "#fff", fontSize: 26, fontWeight: "700" },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 4,
  },
  fieldInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  relationPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  relationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  relationChipActive: {
    backgroundColor: "rgba(37,99,235,0.1)",
    borderColor: "#2563eb",
  },
  relationChipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  relationChipTextActive: { color: "#2563eb" },
  saveButton: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
