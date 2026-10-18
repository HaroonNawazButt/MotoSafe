import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

const STEPS = [
  {
    icon: "crosshair",
    title: "Place Helmet on Flat Surface",
    description:
      "Rest the helmet on a flat, stable surface. Ensure no movement occurs during this step.",
    instruction: "Keep completely still for 3 seconds",
    duration: 3000,
  },
  {
    icon: "activity",
    title: "Gyroscope Calibration",
    description:
      "Slowly rotate the helmet 360° once in each axis. This calibrates the motion sensor.",
    instruction: "Rotate slowly and steadily",
    duration: 4000,
  },
  {
    icon: "shield",
    title: "Accelerometer Verification",
    description:
      "Gently tilt the helmet forward, backward, left, and right to verify impact detection.",
    instruction: "Tilt in all four directions",
    duration: 3000,
  },
];

export default function CalibrationModal({ visible, onClose }) {
  const [step, setStep] = useState(0); // 0 = intro, 1-3 = steps, 4 = done
  const [running, setRunning] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const currentStep = step >= 1 && step <= 3 ? STEPS[step - 1] : null;

  const runStep = () => {
    if (running) return;
    setRunning(true);
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: currentStep.duration,
      useNativeDriver: false,
    }).start(() => {
      setRunning(false);
      if (step < 3) {
        setStep((s) => s + 1);
        progress.setValue(0);
      } else {
        setStep(4);
      }
    });
  };

  const handleReset = () => {
    progress.setValue(0);
    setStep(0);
    setRunning(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Sensor Calibration</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          {step > 0 && step <= 3 && (
            <View style={styles.stepIndicator}>
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <View
                    style={[
                      styles.stepDot,
                      step >= s && styles.stepDotActive,
                      step > s && styles.stepDotDone,
                    ]}
                  >
                    {step > s ? (
                      <Feather name="check" size={12} color="#fff" />
                    ) : (
                      <Text
                        style={[styles.stepNum, step >= s && { color: "#fff" }]}
                      >
                        {s}
                      </Text>
                    )}
                  </View>
                  {s < 3 && (
                    <View
                      style={[styles.stepLine, step > s && styles.stepLineDone]}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Intro */}
          {step === 0 && (
            <View style={styles.body}>
              <View style={styles.iconCircle}>
                <Feather name="settings" size={40} color="#2563eb" />
              </View>
              <Text style={styles.bodyTitle}>Calibrate Your Helmet</Text>
              <Text style={styles.bodyDesc}>
                This process takes about 30 seconds and ensures accurate safety
                monitoring. Make sure your helmet is charged and within
                Bluetooth range.
              </Text>
              <View style={styles.warningBox}>
                <Feather name="alert-circle" size={15} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Do not ride until calibration is complete.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryBtnFull]}
                onPress={() => setStep(1)}
              >
                <Text style={styles.primaryBtnText}>Start Calibration</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Steps 1-3 */}
          {step >= 1 && step <= 3 && currentStep && (
            <View style={styles.body}>
              <View style={styles.iconCircle}>
                <Feather name={currentStep.icon} size={38} color="#2563eb" />
              </View>
              <Text style={styles.stepLabel}>Step {step} of 3</Text>
              <Text style={styles.bodyTitle}>{currentStep.title}</Text>
              <Text style={styles.bodyDesc}>{currentStep.description}</Text>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, { width: progressWidth }]}
                  />
                </View>
                <Text style={styles.progressHint}>
                  {currentStep.instruction}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.primaryBtnFull,
                  running && styles.primaryBtnDisabled,
                ]}
                onPress={runStep}
                disabled={running}
              >
                <Feather
                  name={running ? "loader" : "play"}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.primaryBtnText}>
                  {running ? "Calibrating..." : "Run Step"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Done */}
          {step === 4 && (
            <View style={styles.body}>
              <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
                <Feather name="check-circle" size={40} color="#10b981" />
              </View>
              <Text style={styles.bodyTitle}>Calibration Complete!</Text>
              <Text style={styles.bodyDesc}>
                All sensors have been successfully calibrated. Your MotoSafe
                helmet is ready for accurate safety monitoring.
              </Text>
              <View style={styles.successItems}>
                {[
                  "Accelerometer calibrated",
                  "Gyroscope calibrated",
                  "Impact detection active",
                ].map((item, i) => (
                  <View key={i} style={styles.successItem}>
                    <Feather name="check" size={14} color="#10b981" />
                    <Text style={styles.successText}>{item}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleReset}
                >
                  <Text style={styles.secondaryBtnText}>Recalibrate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.primaryBtnFlex]}
                  onPress={handleClose}
                >
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 0,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: { borderColor: "#2563eb", backgroundColor: "#2563eb" },
  stepDotDone: { borderColor: "#10b981", backgroundColor: "#10b981" },
  stepNum: { fontSize: 13, fontWeight: "700", color: "#9ca3af" },
  stepLine: { width: 48, height: 2, backgroundColor: "#e5e7eb" },
  stepLineDone: { backgroundColor: "#10b981" },
  body: { alignItems: "center", paddingBottom: 8 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircleSuccess: { backgroundColor: "rgba(16,185,129,0.1)" },
  stepLabel: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: 6,
  },
  bodyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  bodyDesc: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: "100%",
  },
  warningText: { flex: 1, fontSize: 13, color: "#92400e" },
  progressSection: { width: "100%", marginBottom: 20 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#2563eb", borderRadius: 4 },
  progressHint: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2563eb",
  },
  primaryBtnFull: { width: "100%" },
  primaryBtnFlex: { flex: 1 },
  primaryBtnDisabled: { backgroundColor: "#93c5fd" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  successItems: { width: "100%", gap: 8, marginBottom: 20 },
  successItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  successText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  actionsRow: { flexDirection: "row", gap: 12, width: "100%" },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  secondaryBtnText: { color: "#6b7280", fontWeight: "600", fontSize: 15 },
});
