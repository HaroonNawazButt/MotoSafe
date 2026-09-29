import React, { useState, useEffect, useRef } from "react";

import {

  View,

  Text,

  StyleSheet,

  TouchableOpacity,

  TextInput,

  Modal,

  Animated,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";

import * as Location from "expo-location";

import MapView from "react-native-maps";

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// ─────────────────────────────────────────────────────────────

// Mic Pulse Animation

// ─────────────────────────────────────────────────────────────

function MicPulse() {

  const s1 = useRef(new Animated.Value(1)).current;

  const s2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {

    const pulse = (val, delay) =>

      Animated.loop(

        Animated.sequence([

          Animated.delay(delay),

          Animated.timing(val, {

            toValue: 1.6,

            duration: 800,

            useNativeDriver: true,

          }),

          Animated.timing(val, {

            toValue: 1,

            duration: 800,

            useNativeDriver: true,

          }),

        ]),

      ).start();

    pulse(s1, 0);

    pulse(s2, 400);

  }, []);

  return (

    <View style={mic.wrapper}>

      <Animated.View

        style={[

          mic.ring,

          {

            transform: [{ scale: s2 }],

            opacity: 0.15,

          },

        ]}

      />

      <Animated.View

        style={[

          mic.ring,

          {

            transform: [{ scale: s1 }],

            opacity: 0.25,

          },

        ]}

      />

      <View style={mic.circle}>

        <Feather name="mic" size={44} color="#fff" />

      </View>

    </View>

  );

}

const mic = StyleSheet.create({

  wrapper: {

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 32,

  },

  ring: {

    position: "absolute",

    width: 120,

    height: 120,

    borderRadius: 60,

    backgroundColor: "#2563eb",

  },

  circle: {

    width: 90,

    height: 90,

    borderRadius: 45,

    backgroundColor: "#2563eb",

    justifyContent: "center",

    alignItems: "center",

  },

});

// ─────────────────────────────────────────────────────────────

// Real Map Background

// ─────────────────────────────────────────────────────────────

function MapBackground({ currentLocation, mapRef }) {

  if (!currentLocation) {

    return (

      <View

        style={[

          StyleSheet.absoluteFill,

          {

            backgroundColor: "#e8f0fe",

            justifyContent: "center",

            alignItems: "center",

          },

        ]}

      >

        <Text style={{ color: "#64748b", fontWeight: "600" }}>

          Getting your location...

        </Text>

      </View>

    );

  }

  const { latitude, longitude } = currentLocation.coords;

  return (

    <MapView

      ref={mapRef}

      style={StyleSheet.absoluteFill}

      initialRegion={{

        latitude,

        longitude,

        latitudeDelta: 0.01,

        longitudeDelta: 0.01,

      }}

      showsUserLocation

      showsMyLocationButton={false}

    >

    </MapView>

  );

}

// ─────────────────────────────────────────────────────────────

// Main Component

// ─────────────────────────────────────────────────────────────

export default function NavigationPage() {

  const router = useRouter();

  const mapRef = useRef(null);

  const [voiceOpen, setVoiceOpen] = useState(false);

  const [destination, setDestination] = useState("FAST NUCES");

  const [currentLocation, setCurrentLocation] = useState(null);

  const [locationError, setLocationError] = useState(null);

  useEffect(() => {

    let locationSubscription = null;

    let isMounted = true;

    const startLocationTracking = async () => {

      try {

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {

          if (isMounted) {

            setLocationError("Location permission was denied.");

          }

          return;

        }

        const initialLocation = await Location.getCurrentPositionAsync({

          accuracy: Location.Accuracy.High,

        });

        if (isMounted) {

          setCurrentLocation(initialLocation);

          setLocationError(null);

        }

        locationSubscription = await Location.watchPositionAsync(

          {

            accuracy: Location.Accuracy.High,

            timeInterval: 2000,

            distanceInterval: 5,

          },

          (location) => {

            if (isMounted) {

              setCurrentLocation(location);

              setLocationError(null);

            }

          },

        );

      } catch (error) {

        console.error("Location tracking error:", error);

        if (isMounted) {

          setLocationError("Unable to get current location.");

        }

      }

    };

    startLocationTracking();

    return () => {

      isMounted = false;

      if (locationSubscription) {

        locationSubscription.remove();

      }

    };

  }, []);

  const refreshLocation = async () => {

    try {

      const location = await Location.getCurrentPositionAsync({

        accuracy: Location.Accuracy.High,

      });

      setCurrentLocation(location);

      setLocationError(null);

      const { latitude, longitude } = location.coords;

      mapRef.current?.animateToRegion(

        {

          latitude,

          longitude,

          latitudeDelta: 0.01,

          longitudeDelta: 0.01,

        },

        500,

      );

      console.log("MotoSafe GPS:", latitude, longitude);

    } catch (error) {

      console.error("Location refresh error:", error);

      setLocationError("Unable to refresh current location.");

    }

  };

  return (

    <SafeAreaView style={styles.container}>

      <MapBackground currentLocation={currentLocation} mapRef={mapRef} />

      {/* Top Overlay */}

      <View style={styles.topOverlay}>

        {/* Search */}

        <View style={styles.searchBar}>

          <View style={styles.searchIconBox}>

            <Feather name="search" size={17} color="#2563eb" />

          </View>

          <TextInput

            placeholder="Where to?"

            placeholderTextColor="#9ca3af"

            value={destination}

            onChangeText={setDestination}

            style={styles.searchInput}

          />

          <TouchableOpacity

            style={[styles.voiceButton, voiceOpen && styles.voiceButtonActive]}

            onPress={() => setVoiceOpen(true)}

          >

            <Feather name="mic" size={17} color="#fff" />

          </TouchableOpacity>

        </View>

        {/* Turn Card */}

        <View style={styles.turnCard}>

          <View style={styles.turnIconBox}>

            <Ionicons name="arrow-up" size={26} color="#fff" />

          </View>

          <View style={{ flex: 1 }}>

            <Text style={styles.turnDistance}>In 400 m</Text>

            <Text style={styles.turnInstruction}>

              Turn right onto Mall Road

            </Text>

          </View>

          <View style={styles.turnNextBox}>

            <Text style={styles.turnNextLabel}>Then</Text>

            <Ionicons name="arrow-back" size={14} color="#6b7280" />

          </View>

        </View>

      </View>

      {/* Controls */}

      <View style={styles.mapControls}>

        <TouchableOpacity

          style={styles.controlBtn}

          onPress={refreshLocation}

        >

          <MaterialCommunityIcons

            name="crosshairs-gps"

            size={20}

            color="#2563eb"

          />

        </TouchableOpacity>

        <View style={styles.controlDivider} />

        <TouchableOpacity style={styles.controlBtn}>

          <Feather name="plus" size={20} color="#374151" />

        </TouchableOpacity>

        <View style={styles.controlDivider} />

        <TouchableOpacity style={styles.controlBtn}>

          <Feather name="minus" size={20} color="#374151" />

        </TouchableOpacity>

      </View>

      {/* Bottom Panel */}

      <View style={styles.bottomPanel}>

        {/* Stats */}

        <View style={styles.statsRow}>

          <View style={styles.statItem}>

            <View style={styles.statIconBox}>

              <Feather name="activity" size={14} color="#2563eb" />

            </View>

            <Text style={styles.statValue}>45</Text>

            <Text style={styles.statUnit}>km/h</Text>

          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>

            <View style={styles.statIconBox}>

              <Feather name="clock" size={14} color="#2563eb" />

            </View>

            <Text style={styles.statValue}>12:45 PM</Text>

            <Text style={styles.statUnit}>Arrival</Text>

          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>

            <View style={styles.statIconBox}>

              <Ionicons name="navigate" size={14} color="#2563eb" />

            </View>

            <Text style={styles.statValue}>3.2</Text>

            <Text style={styles.statUnit}>km left</Text>

          </View>

        </View>

        {/* End Nav */}

        <TouchableOpacity style={styles.endButton}>

          <View style={styles.endIconBox}>

            <Feather name="square" size={14} color="#ef4444" />

          </View>

          <Text style={styles.endText}>End Navigation</Text>

        </TouchableOpacity>

      </View>

      {/* Bottom Nav */}

      <View style={styles.bottomNav}>

        {[

          {

            icon: "view-dashboard",

            lib: "mci",

            label: "Dashboard",

            route: "/dashboard",

          },

          {

            icon: "navigate",

            lib: "ion",

            label: "Navigation",

            active: true,

          },

          {

            icon: "activity",

            lib: "feather",

            label: "History",

            route: "/history",

          },

          {

            icon: "users",

            lib: "feather",

            label: "Contacts",

            route: "/contacts",

          },

          {

            icon: "settings",

            lib: "feather",

            label: "Settings",

            route: "/settings-page",

          },

        ].map((item) => {

          const ic = item.active ? "#2563eb" : "#94a3b8";

          const IconEl =

            item.lib === "mci" ? (

              <MaterialCommunityIcons name={item.icon} size={24} color={ic} />

            ) : item.lib === "ion" ? (

              <Ionicons name={item.icon} size={24} color={ic} />

            ) : (

              <Feather name={item.icon} size={24} color={ic} />

            );

          return (

            <TouchableOpacity

              key={item.label}

              style={styles.navItem}

              onPress={() => item.route && router.push(item.route)}

            >

              {IconEl}

              <Text style={item.active ? styles.activeNavText : styles.navText}>

                {item.label}

              </Text>

            </TouchableOpacity>

          );

        })}

      </View>

      {/* Voice Modal */}

      <Modal visible={voiceOpen} transparent animationType="fade">

        <View style={styles.voiceOverlay}>

          <MicPulse />

          <Text style={styles.voiceTitle}>Listening...</Text>

          <Text style={styles.voiceSubtitle}>

            Say your destination or command

          </Text>

          <TouchableOpacity

            style={styles.cancelButton}

            onPress={() => setVoiceOpen(false)}

          >

            <Feather name="square" size={14} color="#fff" />

            <Text style={styles.cancelText}>Cancel</Text>

          </TouchableOpacity>

        </View>

      </Modal>

    </SafeAreaView>

  );

}

// ─────────────────────────────────────────────────────────────

// Styles

// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: "#e8f0fe",

  },

  topOverlay: {

    padding: 16,

    paddingTop: 12,

    gap: 12,

    zIndex: 10,

  },

  searchBar: {

    backgroundColor: "rgba(255,255,255,0.98)",

    borderRadius: 20,

    paddingHorizontal: 14,

    paddingVertical: 11,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    borderWidth: 1,

    borderColor: "rgba(37,99,235,0.08)",

    shadowColor: "#2563eb",

    shadowOffset: {

      width: 0,

      height: 4,

    },

    shadowOpacity: 0.08,

    shadowRadius: 12,

    elevation: 5,

  },

  searchIconBox: {

    width: 32,

    height: 32,

    borderRadius: 9,

    backgroundColor: "#eff6ff",

    justifyContent: "center",

    alignItems: "center",

  },

  searchInput: {

    flex: 1,

    fontSize: 15,

    fontWeight: "600",

    color: "#111827",

  },

  voiceButton: {

    backgroundColor: "#2563eb",

    padding: 9,

    borderRadius: 11,

  },

  voiceButtonActive: {

    backgroundColor: "#ef4444",

  },

  turnCard: {

    backgroundColor: "#fff",

    borderRadius: 18,

    padding: 16,

    flexDirection: "row",

    alignItems: "center",

    gap: 14,

    shadowColor: "#000",

    shadowOffset: {

      width: 0,

      height: 3,

    },

    shadowOpacity: 0.05,

    shadowRadius: 8,

    elevation: 4,

  },

  turnIconBox: {

    width: 52,

    height: 52,

    borderRadius: 14,

    backgroundColor: "#2563eb",

    justifyContent: "center",

    alignItems: "center",

  },

  turnDistance: {

    color: "#6b7280",

    fontSize: 12,

    fontWeight: "600",

    marginBottom: 3,

  },

  turnInstruction: {

    fontSize: 17,

    fontWeight: "800",

    color: "#0f172a",

  },

  turnNextBox: {

    alignItems: "center",

    gap: 2,

  },

  turnNextLabel: {

    fontSize: 10,

    color: "#9ca3af",

  },

  mapControls: {

    position: "absolute",

    right: 16,

    top: 230,

    backgroundColor: "#fff",

    borderRadius: 16,

    overflow: "hidden",

  },

  controlBtn: {

    width: 46,

    height: 46,

    justifyContent: "center",

    alignItems: "center",

  },

  controlDivider: {

    height: 1,

    backgroundColor: "#f1f5f9",

    marginHorizontal: 10,

  },

  bottomPanel: {

    position: "absolute",

    bottom: 92,

    left: 16,

    right: 16,

    gap: 14,

  },

  statsRow: {

    flexDirection: "row",

    backgroundColor: "#fff",

    borderRadius: 20,

    paddingVertical: 14,

  },

  statItem: {

    flex: 1,

    alignItems: "center",

    gap: 4,

  },

  statIconBox: {

    width: 28,

    height: 28,

    borderRadius: 8,

    backgroundColor: "#eff6ff",

    justifyContent: "center",

    alignItems: "center",

  },

  statValue: {

    fontSize: 20,

    fontWeight: "800",

    color: "#0f172a",

  },

  statUnit: {

    fontSize: 11,

    color: "#9ca3af",

  },

  statDivider: {

    width: 1,

    backgroundColor: "#f1f5f9",

  },

  endButton: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 10,

    backgroundColor: "#ef4444",

    borderRadius: 18,

    paddingVertical: 15,

    shadowColor: "#ef4444",

    shadowOffset: {

      width: 0,

      height: 4,

    },

    shadowOpacity: 0.25,

    shadowRadius: 8,

    elevation: 6,

  },

  endIconBox: {

    width: 30,

    height: 30,

    borderRadius: 9,

    backgroundColor: "rgba(255,255,255,0.18)",

    justifyContent: "center",

    alignItems: "center",

  },

  endText: {

    fontSize: 15,

    fontWeight: "800",

    color: "#fff",

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

  navItem: {

    alignItems: "center",

    paddingTop: 4,

  },

  activeNavText: {

    color: "#2563eb",

    fontSize: 11,

    fontWeight: "800",

    marginTop: 5,

  },

  navText: {

    color: "#94a3b8",

    fontSize: 11,

    fontWeight: "600",

    marginTop: 5,

  },

  voiceOverlay: {

    flex: 1,

    backgroundColor: "rgba(10,15,40,0.93)",

    justifyContent: "center",

    alignItems: "center",

    padding: 28,

  },

  voiceTitle: {

    fontSize: 30,

    fontWeight: "800",

    color: "#fff",

    marginBottom: 8,

  },

  voiceSubtitle: {

    color: "rgba(255,255,255,0.55)",

    fontSize: 14,

    marginBottom: 36,

  },

  cancelButton: {

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    borderWidth: 1.5,

    borderColor: "rgba(255,255,255,0.2)",

    paddingHorizontal: 28,

    paddingVertical: 13,

    borderRadius: 14,

  },

  cancelText: {

    color: "#fff",

    fontSize: 15,

    fontWeight: "700",

  },

});