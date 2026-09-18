import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="motorbike" size={42} color="#fff" />
          </View>

          <Text style={styles.title}>Moto Safe</Text>
          <Text style={styles.subtitle}>Smart helmet safety system</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>

            <View style={styles.inputWrapper}>
              <Feather
                name="mail"
                size={18}
                color="#9ca3af"
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="rider@example.com"
                placeholderTextColor="#9ca3af"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>

            <View style={styles.inputWrapper}>
              <Feather
                name="lock"
                size={18}
                color="#9ca3af"
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotContainer}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
           onPress={() => router.replace("/dashboard")}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Sign Up */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account?</Text>

            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={styles.signupLink}> Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Security Badge */}
          <View style={styles.badgeContainer}>
            <Feather name="shield" size={18} color="#2563eb" />

            <Text style={styles.badgeText}>
              Your ride data is encrypted and secure
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 30,
    justifyContent: "center",
  },

  logoSection: {
    alignItems: "center",
    marginBottom: 50,
  },

  logoBox: {
    width: 85,
    height: 85,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    elevation: 6,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },

  formContainer: {
    width: "100%",
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },

  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 28,
  },

  forgotText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
  },

  loginButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  orText: {
    marginHorizontal: 12,
    color: "#9ca3af",
    fontSize: 13,
  },

  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },

  signupText: {
    color: "#6b7280",
    fontSize: 14,
  },

  signupLink: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 14,
  },

  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.08)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },

  badgeText: {
    flex: 1,
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "600",
  },
});
