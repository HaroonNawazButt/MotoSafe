import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ToastAndroid,
  Platform,
  Alert,
} from "react-native";

import { useRouter } from "expo-router";

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function SignupPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons
              name="motorbike-helmet"
              size={56}
              color="#fff"
            />
          </View>

          <Text style={styles.title}>Create account</Text>

          <Text style={styles.subtitle}>
            Join Moto Safe and ride smarter & safer
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Full Name</Text>

            <View style={styles.inputContainer}>
              <Feather name="user" size={18} color="#9ca3af" />

              <TextInput
                placeholder="Your name"
                placeholderTextColor="#9ca3af"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>

            <View style={styles.inputContainer}>
              <Feather name="mail" size={18} color="#9ca3af" />

              <TextInput
                placeholder="rider@gmail.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Phone Number</Text>

            <View style={styles.inputContainer}>
              <Feather name="phone" size={18} color="#9ca3af" />

              <TextInput
                placeholder="+92 234 567 890"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Feather name="lock" size={18} color="#9ca3af" />

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

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Confirm Password</Text>

            <View style={styles.inputContainer}>
              <Feather name="lock" size={18} color="#9ca3af" />

              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirmPassword}
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Signup Button */}

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => {
              if (Platform.OS === "android") {
                ToastAndroid.show(
                  "Account created successfully!",
                  ToastAndroid.SHORT,
                );
              } else {
                Alert.alert("Success", "Account created successfully!");
              }

              setTimeout(() => {
                router.replace("/dashboard");
              }, 1000);
            }}
          >
            <Text style={styles.signupButtonText}>Create Account</Text>
          </TouchableOpacity>
          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}> Login</Text>
            </TouchableOpacity>
          </View>

          {/* Safety Card */}
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={20} color="#2563eb" />

            <Text style={styles.infoText}>
              Your data is protected with secure encryption.
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
    backgroundColor: "#f9fafb",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  heroSection: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 34,
  },

  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
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
    textAlign: "center",
    paddingHorizontal: 30,
  },

  formContainer: {
    paddingHorizontal: 20,
  },

  inputWrapper: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  inputContainer: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },

  signupButton: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 22,
  },

  signupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },

  loginText: {
    color: "#6b7280",
    fontSize: 14,
  },

  loginLink: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "700",
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(37,99,235,0.05)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.12)",
    borderRadius: 14,
    padding: 14,
  },

  infoText: {
    flex: 1,
    color: "#1e40af",
    fontSize: 13,
    lineHeight: 20,
  },
});
