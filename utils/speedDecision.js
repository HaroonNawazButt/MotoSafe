
/**
 * MotoSafe — Speed Decision Engine
 *
 * This utility does not access GPS, camera, Firebase,
 * Google Maps, or helmet hardware directly.
 *
 * It only evaluates information supplied by those systems.
 */

// Internal safety-warning thresholds (km/h).
// These are NOT official legal road speed limits.
export const SPEED_THRESHOLDS = {
    LOCAL: 60,
    MOTORWAY: 70,
    BUSY_ROAD: 50,
};

// OSM road classifications.
const MOTORWAY_TYPES = ["motorway", "motorway_link"];

const LOCAL_TYPES = [
    "residential",
    "living_street",
    "tertiary",
    "tertiary_link",
    "secondary",
    "secondary_link",
    "primary",
    "primary_link",
    "unclassified",
    "service",
];

// Validate a supplied speed value.
const validSpeed = (value) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0;

/**
 * Determine the provisional fallback threshold.
 *
 * An unknown road category receives the conservative
 * MotoSafe default of 60 km/h.
 */
export const getFallbackSpeed = (roadType) => {
    const type = String(roadType ?? "").toLowerCase();

    if (MOTORWAY_TYPES.includes(type)) {
        return SPEED_THRESHOLDS.MOTORWAY;
    }

    if (LOCAL_TYPES.includes(type)) {
        return SPEED_THRESHOLDS.LOCAL;
    }

    return SPEED_THRESHOLDS.LOCAL;
};

/**
 * Calculate the effective MotoSafe warning threshold.
 *
 * Priority:
 * 1. Valid camera-detected speed sign
 * 2. Explicit map speed limit
 * 3. MotoSafe road-category fallback
 *
 * Environmental assessment can additionally lower
 * the selected warning threshold.
 */
export const decideSpeedThreshold = ({
    cameraSpeedLimit = null,
    cameraSignValid = false,
    mapSpeedLimit = null,
    roadType = null,
    busyRoad = false,
} = {}) => {
    let selectedSpeed;
    let source;
    let verifiedLimit = false;

    // Priority 1: validated camera speed sign.
    if (cameraSignValid && validSpeed(cameraSpeedLimit)) {
        selectedSpeed = cameraSpeedLimit;
        source = "camera";
        verifiedLimit = true;
    }

    // Priority 2: mapped speed limit.
    else if (validSpeed(mapSpeedLimit)) {
        selectedSpeed = mapSpeedLimit;
        source = "map";
        verifiedLimit = true;
    }

    // Priority 3: MotoSafe internal fallback.
    else {
        selectedSpeed = getFallbackSpeed(roadType);
        source = "fallback";
    }

    // Apply additional environmental safety assessment.
    const effectiveSpeed = busyRoad
        ? Math.min(selectedSpeed, SPEED_THRESHOLDS.BUSY_ROAD)
        : selectedSpeed;

    return {
        selectedSpeed,
        effectiveSpeed,
        source,
        verifiedLimit,
        busyRoadApplied: busyRoad && effectiveSpeed < selectedSpeed,
    };
};

/**
 * Evaluate GPS speed against the effective threshold.
 *
 * No GPS speed or invalid GPS data produces no warning.
 * The alert tolerance is configurable.
 */
export const evaluateSpeedAlert = ({
    currentSpeedKmh,
    decision,
    toleranceKmh = 0,
} = {}) => {
    if (
        !validSpeed(currentSpeedKmh) ||
        !validSpeed(decision?.effectiveSpeed)
    ) {
        return {
            shouldWarn: false,
            reason: "insufficient_data",
        };
    }

    const tolerance = Math.max(
        0,
        Number.isFinite(toleranceKmh) ? toleranceKmh : 0,
    );

    const warningThreshold = decision.effectiveSpeed + tolerance;

    const shouldWarn = currentSpeedKmh > warningThreshold;

    return {
        shouldWarn,
        reason: shouldWarn ? "speed_exceeded" : "within_threshold",
        currentSpeedKmh,
        warningThreshold,
        excessSpeedKmh: Math.max(
            0,
            currentSpeedKmh - decision.effectiveSpeed,
        ),
        source: decision.source,
        busyRoadApplied: decision.busyRoadApplied,
    };
};
