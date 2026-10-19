// app/voice-lab.jsx
// ─────────────────────────────────────────────────────────────
// Voice Assistant — HELMET SIMULATOR
// The phone pretends to be the helmet: the big button = helmet button,
// phone mic = helmet mic, phone speaker = helmet speaker.
// Open it from the dashboard: router.push("/voice-lab")
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { usePhoneIO } from "../voice/phoneIO";
import { useLiveContext } from "../voice/liveContext";
import { useVoiceAssistant } from "../voice/useVoiceAssistant";
import * as api from "../voice/voiceApi";

const LANGS = [
  { id: "auto", label: "Auto" },
  { id: "en", label: "English" },
  { id: "ur", label: "اردو" },
];

const STATE_UI = {
  idle:      { color: "#2563eb", hint: "Tap to talk" },
  beeping:   { color: "#2563eb", hint: "Get ready…" },
  listening: { color: "#2563eb", hint: "Speak now — tap when done" },
  thinking:  { color: "#f59e0b", hint: "Thinking…  (tap to cancel)" },
  speaking:  { color: "#10b981", hint: "Speaking — tap to interrupt" },
};

export default function VoiceLab() {
  const router = useRouter();
  const io = usePhoneIO();
  const [lang, setLang] = useState("auto");
  const live = useLiveContext();
  const { state, level, messages, press, sendText, clear } = useVoiceAssistant({ io, api, lang, getContext: live.get });

  const [typed, setTyped] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [serverCode, setServerCode] = useState("");
  const [serverInfo, setServerInfo] = useState(null);   // {ok, text}
  const scrollRef = useRef(null);

  // load saved server address once
  useEffect(() => {
    api.getServer().then((s) => { setServerUrl(s.url); setServerCode(s.code); });
  }, []);

  const testServer = async () => {
    setServerInfo({ ok: null, text: "Testing…" });
    try {
      await api.saveServer(serverUrl, serverCode);
      const h = await api.health();
      const sttOk = h.stt?.hasKey;
      setServerInfo({
        ok: h.hasKey && sttOk,
        text: h.hasKey
          ? `Connected · ${h.model}${sttOk ? "" : " · NO speech-to-text key (STT_API_KEY)"}`
          : "Server is up but has no LLM key in .env",
      });
    } catch (e) {
      setServerInfo({ ok: false, text: e.message });
    }
  };

  // pulse animation on the helmet button
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pulse.setValue(0);
    if (state === "idle") return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: state === "listening" ? 1100 : 1500, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const ui = STATE_UI[state];
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const meter = useMemo(() => Math.max(0, Math.min(1, (level + 60) / 45)), [level]);   // -60 dB … -15 dB

  const submitTyped = () => {
    if (!typed.trim()) return;
    sendText(typed);
    setTyped("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Voice Assistant</Text>
            <Text style={styles.headerSub}>Helmet simulator · phone mic + speaker</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowSettings((s) => !s)}>
            <Feather name="sliders" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Settings */}
          {showSettings && (
            <View style={styles.card}>
              <Text style={styles.label}>I speak</Text>
              <View style={styles.segment}>
                {LANGS.map((l) => (
                  <TouchableOpacity key={l.id} style={[styles.segBtn, lang === l.id && styles.segBtnOn]} onPress={() => setLang(l.id)}>
                    <Text style={[styles.segText, lang === l.id && styles.segTextOn]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>Voice server address</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.1.50:3000"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={serverCode}
                onChangeText={setServerCode}
                placeholder="Access code (only if you set ACCESS_CODE)"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <View style={styles.row}>
                <TouchableOpacity style={styles.smallBtn} onPress={testServer}>
                  <Feather name="wifi" size={14} color="#2563eb" />
                  <Text style={styles.smallBtnText}>Save & test</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallBtn} onPress={clear}>
                  <Feather name="trash-2" size={14} color="#2563eb" />
                  <Text style={styles.smallBtnText}>Clear chat</Text>
                </TouchableOpacity>
              </View>
              {serverInfo && (
                <Text style={[styles.serverInfo, { color: serverInfo.ok === false ? "#b91c1c" : serverInfo.ok ? "#047857" : "#6b7280" }]}>
                  {serverInfo.text}
                </Text>
              )}
            </View>
          )}

          {/* Mic / speaker chips */}
          <View style={styles.chips}>
            <View style={[styles.chip, state === "listening" && styles.chipOn]}>
              <Feather name="mic" size={14} color={state === "listening" ? "#2563eb" : "#9ca3af"} />
              <Text style={styles.chipText}>Helmet mic: {state === "listening" ? "listening" : "idle"}</Text>
            </View>
            <View style={[styles.chip, (state === "speaking" || state === "beeping") && styles.chipOnGreen]}>
              <Feather name="volume-2" size={14} color={state === "speaking" || state === "beeping" ? "#10b981" : "#9ca3af"} />
              <Text style={styles.chipText}>Speaker: {state === "beeping" ? "beep" : state === "speaking" ? "speaking" : "idle"}</Text>
            </View>
          </View>

          {/* The helmet button */}
          <View style={styles.stage}>
            <View style={styles.btnWrap}>
              {state !== "idle" && (
                <Animated.View style={[styles.ring, { backgroundColor: ui.color, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
              )}
              <TouchableOpacity activeOpacity={0.85} style={[styles.helmetBtn, { backgroundColor: ui.color }]} onPress={press}>
                <MaterialCommunityIcons name="racing-helmet" size={44} color="#fff" />
                <Text style={styles.helmetBtnText}>HELMET BUTTON</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>{ui.hint}</Text>

            {/* mic level */}
            <View style={styles.meterTrack}>
              <View style={[styles.meterFill, { width: `${(state === "listening" ? meter : 0) * 100}%` }]} />
            </View>
          </View>

          {/* Conversation */}
          {messages.length === 0 ? (
            <Text style={styles.empty}>
              Try: “What time is it?”, “Tell me a fun fact”, “How far is the moon?”
            </Text>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[styles.bubble, bubbleStyle[m.kind]]}>
                <Text style={[styles.bubbleText, m.kind === "user" && { color: "#fff" }, m.kind === "error" && { color: "#b91c1c" }, m.kind === "note" && { color: "#6b7280", fontSize: 12 }]}>
                  {m.text}
                </Text>
                {m.meta ? <Text style={styles.meta}>{m.meta}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>

        {/* Type instead */}
        <View style={styles.typeBar}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={typed}
            onChangeText={setTyped}
            placeholder="…or type a question"
            returnKeyType="send"
            onSubmitEditing={submitTyped}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={submitTyped}>
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const bubbleStyle = StyleSheet.create({
  user: { alignSelf: "flex-end", backgroundColor: "#2563eb", borderBottomRightRadius: 4 },
  bot: { alignSelf: "flex-start", backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  error: { alignSelf: "stretch", backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  note: { alignSelf: "center", backgroundColor: "transparent", paddingVertical: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { backgroundColor: "rgba(255,255,255,0.2)", padding: 8, borderRadius: 10 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 6 },
  segment: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 10, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segBtnOn: { backgroundColor: "#2563eb" },
  segText: { fontSize: 13, fontWeight: "600", color: "#4b5563" },
  segTextOn: { color: "#fff" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  row: { flexDirection: "row", gap: 8, marginTop: 10 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(37,99,235,0.1)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  smallBtnText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  serverInfo: { marginTop: 10, fontSize: 13, fontWeight: "600" },

  chips: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", paddingVertical: 8, paddingHorizontal: 10 },
  chipOn: { borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.06)" },
  chipOnGreen: { borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.06)" },
  chipText: { fontSize: 12, color: "#374151", fontWeight: "600" },

  stage: { alignItems: "center", paddingVertical: 26 },
  btnWrap: { width: 190, height: 190, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 170, height: 170, borderRadius: 85 },
  helmetBtn: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  helmetBtnText: { color: "#fff", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  hint: { marginTop: 14, color: "#374151", fontSize: 15, fontWeight: "600" },
  meterTrack: { marginTop: 12, width: 180, height: 6, borderRadius: 3, backgroundColor: "#e5e7eb", overflow: "hidden" },
  meterFill: { height: 6, backgroundColor: "#2563eb" },

  empty: { textAlign: "center", color: "#9ca3af", fontSize: 13, marginTop: 4 },
  bubble: { maxWidth: "88%", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, marginBottom: 8 },
  bubbleText: { fontSize: 15, color: "#111827", lineHeight: 21 },
  meta: { fontSize: 11, color: "#9ca3af", marginTop: 4 },

  typeBar: { flexDirection: "row", gap: 8, padding: 12, paddingHorizontal: 16, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#e5e7eb" },
  sendBtn: { width: 46, borderRadius: 12, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
});
