import React, { useState, useEffect, useRef, useMemo } from "react";

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

import MapView, { Marker, Polyline } from "react-native-maps";

import { calculateRoute } from "../services/routeService";

import { extractRouteInstructions } from "../utils/routeInstructions.mjs";

import { buildManeuverPositions, getUpcomingTurn, } from "../utils/upcomingTurn.mjs";

import { stabilizeRouteProgress } from "../utils/routeProgressStabilizer.mjs";

import { calculateRouteProgress } from "../utils/routeProgress.mjs";

import { evaluateGpsReliability } from "../utils/gpsReliability.mjs";

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

function MapBackground({
  currentLocation,
  mapRef,
  selectedDestination,
  onDestinationSelect,
  routeData,
}) {

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
      onLongPress={(event) => {
        onDestinationSelect(event.nativeEvent.coordinate);
      }}
    >
      {selectedDestination && (
        <Marker
          coordinate={selectedDestination}
          title="Selected Destination"
          description="MotoSafe destination"
          pinColor="#2563eb"
        />
      )}
      {routeData?.coordinates?.length > 1 && (
        <Polyline
          coordinates={routeData.coordinates}
          strokeColor="#2563eb"
          strokeWidth={5}
        />
      )}
    </MapView>
  );
}
// ─────────────────────────────────────────────────────────────

// Main Component

// ─────────────────────────────────────────────────────────────

const formatGpsSpeed = (speedMetersPerSecond) => {
  if (
    typeof speedMetersPerSecond !== "number" ||
    !Number.isFinite(speedMetersPerSecond) ||
    speedMetersPerSecond < 0
  ) {
    return "--";
  }

  const speedKmh = speedMetersPerSecond * 3.6;

  // Suppress very small GPS speed readings.
  if (speedKmh < 2) {
    return "0";
  }

  return Math.round(speedKmh).toString();
};

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return "--";

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return "--";

  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours} hr ${remainingMinutes} min`;
};

const formatArrivalTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "--";

  const arrival = new Date(Date.now() + seconds * 1000);

  return arrival.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function NavigationPage() {

  const router = useRouter();

  const mapRef = useRef(null);

  const [voiceOpen, setVoiceOpen] = useState(false);

  const [destination, setDestination] = useState("");

  const [navigationStatus, setNavigationStatus] = useState("idle");

  const [routeData, setRouteData] = useState(null);

  const [selectedDestination, setSelectedDestination] = useState(null);

  const [routeLoading, setRouteLoading] = useState(false);

  const [routeError, setRouteError] = useState("");

  const [currentLocation, setCurrentLocation] = useState(null);

  const [gpsCheckTime, setGpsCheckTime] = useState(() => Date.now());

  const previousGpsDebugRef = useRef(null);

  const [stableRouteProgress, setStableRouteProgress] = useState(null);

  const [progressStatus, setProgressStatus] = useState("waiting");

  const previousProgressRef = useRef(null);

  // Check GPS freshness every two seconds during navigation.
  useEffect(() => {
    if (navigationStatus !== "navigating") {
      return;
    }

    setGpsCheckTime(Date.now());

    const timer = setInterval(() => {
      setGpsCheckTime(Date.now());
    }, 2000);

    return () => clearInterval(timer);
  }, [navigationStatus]);

  // Evaluate freshness and reported location accuracy.
  const gpsReliability = useMemo(() => {
    return evaluateGpsReliability(currentLocation, {
      now: gpsCheckTime,
      maxAgeMs: 10000,
      maxAccuracyMeters: 35,
    });
  }, [currentLocation, gpsCheckTime]);

  const routeProgress = useMemo(() => {
    if (
      navigationStatus !== "navigating" ||
      !routeData ||
      !currentLocation?.coords ||
      !gpsReliability.reliable
    ) {
      return null;
    }

    const {
      latitude,
      longitude,
      accuracy,
    } = currentLocation.coords;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    // Reject GPS fixes with poor reported accuracy.
    if (
      !Number.isFinite(accuracy) ||
      accuracy > 35
    ) {
      return null;
    }

    const progress = calculateRouteProgress(
      { latitude, longitude },
      routeData.coordinates,
      routeData.distanceMeters
    );

    // Do not trust progress if the rider is far from the route.
    if (
      !progress ||
      progress.distanceFromRouteMeters > 35
    ) {
      return null;
    }

    return progress;
  }, [navigationStatus, routeData, currentLocation, gpsReliability.reliable,]);

  useEffect(() => {
    if (navigationStatus !== "navigating" || !routeData) {
      return;
    }

    // Do not display live progress from an unreliable GPS fix.
    if (!routeProgress) {
      setStableRouteProgress(null);

      setProgressStatus(
        gpsReliability.status === "stale"
          ? "gps-stale"
          : gpsReliability.status === "poor-accuracy"
            ? "gps-inaccurate"
            : "gps-unavailable"
      );

      return;
    }

    const timestamp = currentLocation?.timestamp;

    if (!Number.isFinite(timestamp)) {
      setStableRouteProgress(null);
      setProgressStatus("gps-unavailable");
      return;
    }

    const current = {
      ...routeProgress,
      timestamp,
    };

    const result = stabilizeRouteProgress(
      previousProgressRef.current,
      current
    );

    setProgressStatus(result.status);

    if (
      result.status === "accepted" ||
      result.status === "held"
    ) {
      previousProgressRef.current = result.progress;
      setStableRouteProgress(result.progress);
    } else {
      // Keep the last valid progress internally, but don't
      // display potentially inaccurate data.
      setStableRouteProgress(null);
    }
  }, [
    navigationStatus,
    routeData,
    routeProgress,
    currentLocation,
    gpsReliability.status,
  ]);

  // Prepare real maneuver positions from OSRM route steps.
  const routeManeuvers = useMemo(() => {
    if (!routeData?.steps || !routeData?.instructions) {
      return [];
    }

    return buildManeuverPositions(
      routeData.steps,
      routeData.instructions
    );
  }, [routeData]);

  // Identify the next maneuver using stabilized GPS progress.
  const upcomingTurn = useMemo(() => {
    if (
      navigationStatus !== "navigating" ||
      !stableRouteProgress ||
      routeManeuvers.length === 0 ||
      !routeData?.distanceMeters
    ) {
      return null;
    }

    return getUpcomingTurn(
      routeManeuvers,
      stableRouteProgress.progressFraction,
      routeData.distanceMeters
    );
  }, [
    navigationStatus,
    stableRouteProgress,
    routeManeuvers,
    routeData,
  ]);

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
              const { speed, accuracy, latitude, longitude } =
                location.coords;

              const previous = previousGpsDebugRef.current;

              let displacementMeters = null;

              if (previous) {
                const latDelta = (latitude - previous.latitude) * 111195;

                const lonDelta =
                  (longitude - previous.longitude) *
                  111195 *
                  Math.cos((latitude * Math.PI) / 180);

                displacementMeters = Math.hypot(latDelta, lonDelta);
              }

              console.log("[MotoSafe GPS Diagnostic]", {
                speedKmh:
                  Number.isFinite(speed) && speed >= 0
                    ? Number((speed * 3.6).toFixed(1))
                    : null,

                accuracyMeters: Number.isFinite(accuracy)
                  ? Number(accuracy.toFixed(1))
                  : null,

                displacementMeters: Number.isFinite(displacementMeters)
                  ? Number(displacementMeters.toFixed(1))
                  : null,

                elapsedSeconds: previous
                  ? Number(
                    ((location.timestamp - previous.timestamp) / 1000)
                      .toFixed(1)
                  )
                  : null,
              });

              previousGpsDebugRef.current = {
                latitude,
                longitude,
                timestamp: location.timestamp,
              };

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

  const handleDestinationSelect = (coordinate) => {
    previousProgressRef.current = null;
    setStableRouteProgress(null);
    setProgressStatus("waiting");
    setSelectedDestination({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });

    setDestination("Selected location");
    setRouteData(null);
    setNavigationStatus("idle");
  };

  const handleCalculateRoute = async () => {
    if (!currentLocation?.coords || !selectedDestination || routeLoading) {
      return;
    }

    setRouteLoading(true);
    setRouteError("");
    setRouteData(null);
    setNavigationStatus("idle");

    try {
      const origin = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      const route = await calculateRoute(
        origin,
        selectedDestination
      );

      const instructions = extractRouteInstructions(route.steps);

      console.log(
        "[MotoSafe Navigation] Route instructions:",
        instructions.map((item) => item.instruction)
      );

      setRouteData({
        ...route,
        instructions,
      });

      setNavigationStatus("preview");

      if (route.coordinates.length > 1) {
        mapRef.current?.fitToCoordinates(route.coordinates, {
          edgePadding: {
            top: 140,
            right: 50,
            bottom: 250,
            left: 50,
          },
          animated: true,
        });
      }
    } catch (error) {
      console.error("MotoSafe route calculation:", error);
      setRouteError(error.message || "Could not calculate route.");
    } finally {
      setRouteLoading(false);
    }
  };

  const handleStartNavigation = () => {
    if (!routeData || !selectedDestination) {
      return;
    }

    previousProgressRef.current = null;
    setStableRouteProgress(null);
    setProgressStatus("waiting");

    setNavigationStatus("navigating");
  };

  const handleEndNavigation = () => {
    previousProgressRef.current = null;
    setStableRouteProgress(null);
    setProgressStatus("waiting");

    setNavigationStatus("idle");
    setRouteData(null);
    setRouteError("");
  };

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

  const handleMapZoom = async (zoomIn) => {
    if (!mapRef.current) return;

    try {
      const camera = await mapRef.current.getCamera();

      if (!camera) return;

      const currentZoom = Number.isFinite(camera.zoom)
        ? camera.zoom
        : 15;

      const newZoom = Math.max(
        3,
        Math.min(20, currentZoom + (zoomIn ? 1 : -1))
      );

      mapRef.current.animateCamera(
        {
          zoom: newZoom,
        },
        { duration: 300 }
      );
    } catch (error) {
      console.error("MotoSafe map zoom error:", error);
    }
  };

  return (

    <SafeAreaView style={styles.container}>

      <MapBackground
        currentLocation={currentLocation}
        mapRef={mapRef}
        selectedDestination={selectedDestination}
        onDestinationSelect={handleDestinationSelect}
        routeData={routeData}
      />

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

            onChangeText={(text) => {
              setDestination(text);
              setSelectedDestination(null);
              setRouteData(null);
              setRouteError("");
              setNavigationStatus("idle");
            }}

            style={styles.searchInput}

          />

          <TouchableOpacity

            style={[styles.voiceButton, voiceOpen && styles.voiceButtonActive]}

            onPress={() => setVoiceOpen(true)}

          >

            <Feather name="mic" size={17} color="#fff" />

          </TouchableOpacity>

        </View>
        {/* Floating Upcoming Direction Banner */}
        {navigationStatus === "navigating" && upcomingTurn && (
          <View style={styles.floatingDirectionBanner}>
            <View style={styles.floatingDirectionIcon}>
              <Feather
                name={
                  upcomingTurn.instruction.toLowerCase().includes("left")
                    ? "corner-up-left"
                    : upcomingTurn.instruction.toLowerCase().includes("right")
                      ? "corner-up-right"
                      : "navigation"
                }
                size={29}
                color="#ffffff"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.floatingDirectionLabel}>
                NEXT DIRECTION
              </Text>

              <Text
                style={styles.floatingDirectionText}
                numberOfLines={2}
              >
                {upcomingTurn.instruction}
              </Text>

              <Text style={styles.floatingDirectionDistance}>
                {`In ${formatDistance(upcomingTurn.distanceToTurnMeters)}`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Selected Destination Panel */}
      {selectedDestination && navigationStatus === "idle" && (
        <View style={styles.destinationPanel}>
          <View style={{ flex: 1 }}>
            <Text style={styles.destinationTitle}>
              Destination Selected
            </Text>

            <Text style={styles.destinationCoordinates}>
              {selectedDestination.latitude.toFixed(5)},{" "}
              {selectedDestination.longitude.toFixed(5)}
            </Text>

            <Text style={styles.destinationHint}>
              Route calculation will be available after API integration.
            </Text>
            <TouchableOpacity
              onPress={handleCalculateRoute}
              disabled={routeLoading}
              style={{
                backgroundColor: "#2563eb",
                paddingVertical: 11,
                paddingHorizontal: 14,
                borderRadius: 10,
                alignSelf: "flex-start",
                marginTop: 12,
                opacity: routeLoading ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {routeLoading ? "Calculating..." : "Calculate Route"}
              </Text>
            </TouchableOpacity>

            {routeError ? (
              <Text style={{ color: "#dc2626", marginTop: 8 }}>
                {routeError}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.clearDestinationButton}
            onPress={() => {
              setSelectedDestination(null);
              setDestination("");
              setRouteData(null);
              setNavigationStatus("idle");
            }}
          >
            <Feather name="x" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

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

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => handleMapZoom(true)}
          accessibilityLabel="Zoom in"
        >
          <Feather name="plus" size={20} color="#374151" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => handleMapZoom(false)}
          accessibilityLabel="Zoom out"
        >
          <Feather name="minus" size={20} color="#374151" />
        </TouchableOpacity>

      </View>


      {/* Route Preview / Navigation Panel */}
      {routeData &&
        (navigationStatus === "preview" ||
          navigationStatus === "navigating") && (
          <View style={styles.bottomPanel}>

            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 12,
              }}
            >
              {navigationStatus === "preview"
                ? "Route Preview"
                : "Navigation Started"}
            </Text>
            {/* Live GPS Speed */}
            {/* Floating GPS Speedometer */}
            {navigationStatus === "navigating" && (
              <View
                style={styles.floatingSpeedometer}
                pointerEvents="none"
              >
                <Text style={styles.speedometerValue}>
                  {formatGpsSpeed(currentLocation?.coords?.speed)}
                </Text>

                <Text style={styles.speedometerUnit}>
                  km/h
                </Text>
              </View>
            )}

            {/* GPS Route Progress Status */}
            {navigationStatus === "navigating" &&
              progressStatus !== "accepted" && (
                <Text
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 11,
                    marginBottom: 8,
                  }}
                >
                  {progressStatus === "gps-stale"
                    ? "GPS signal delayed — waiting for a fresh location"
                    : progressStatus === "gps-inaccurate"
                      ? "GPS accuracy is insufficient"
                      : progressStatus === "held"
                        ? "GPS fluctuation filtered"
                        : progressStatus === "gps-unavailable"
                          ? "Waiting for reliable GPS"
                          : progressStatus === "needs-recheck"
                            ? "Route position needs verification"
                            : progressStatus === "stale"
                              ? "Waiting for a fresh GPS update"
                              : "Waiting for route progress"}
                </Text>
              )}

            <View style={styles.statsRow}>

              <View style={styles.statItem}>
                <Feather name="map-pin" size={17} color="#2563eb" />

                <Text style={styles.statValue}>
                  {navigationStatus === "navigating"
                    ? stableRouteProgress
                      ? formatDistance(stableRouteProgress.remainingMeters)
                      : "--"
                    : formatDistance(routeData.distanceMeters)}
                </Text>

                <Text style={styles.statUnit}>
                  {navigationStatus === "navigating"
                    ? "Distance left"
                    : "Total distance"}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Feather name="clock" size={17} color="#2563eb" />

                <Text style={styles.statValue}>
                  {formatDuration(routeData.durationSeconds)}
                </Text>

                <Text style={styles.statUnit}>
                  Estimated duration
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Ionicons name="navigate" size={17} color="#2563eb" />

                <Text style={styles.statValue}>
                  {formatArrivalTime(routeData.durationSeconds)}
                </Text>

                <Text style={styles.statUnit}>
                  Estimated arrival
                </Text>
              </View>

            </View>

            {navigationStatus === "preview" ? (
              <TouchableOpacity
                style={[
                  styles.endButton,
                  { backgroundColor: "#2563eb" },
                ]}
                onPress={handleStartNavigation}
              >
                <Feather name="navigation" size={17} color="#fff" />

                <Text style={[styles.endText, { color: "#fff" }]}>
                  Start Navigation
                </Text>
              </TouchableOpacity>
            ) : (
              <>

                <TouchableOpacity
                  style={styles.endButton}
                  onPress={handleEndNavigation}
                >
                  <Feather name="square" size={17} color="#ef4444" />

                  <Text style={styles.endText}>
                    End Navigation
                  </Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        )}

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
  floatingDirectionBanner: {
    backgroundColor: "#166534",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },

  floatingDirectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  floatingDirectionLabel: {
    color: "#bbf7d0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  floatingDirectionText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },

  floatingDirectionDistance: {
    color: "#dcfce7",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 5,
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
  floatingSpeedometer: {
    position: "absolute",
    right: 0,
    bottom: 180,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#1f2937",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 8,
  },

  speedometerValue: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },

  speedometerUnit: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "700",
  },

  bottomPanel: {

    position: "absolute",

    bottom: 110,

    left: 16,

    right: 16,

    gap: 6,

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

    bottom: 18,

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

  destinationPanel: {
    position: "absolute",
    bottom: 105,
    left: 16,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  destinationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  destinationCoordinates: {
    fontSize: 13,
    color: "#2563eb",
    marginTop: 5,
  },

  destinationHint: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 6,
  },

  clearDestinationButton: {
    padding: 8,
    marginLeft: 10,
  },
});