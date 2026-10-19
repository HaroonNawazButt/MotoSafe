export function evaluateGpsReliability(
    location,
    options = {}
) {
    const {
        now = Date.now(),
        maxAgeMs = 10000,
        maxAccuracyMeters = 35,
        maxFutureSkewMs = 2000,
    } = options;

    if (!location?.coords) {
        return {
            reliable: false,
            status: "unavailable",
            ageMs: null,
        };
    }

    const {
        latitude,
        longitude,
        accuracy,
    } = location.coords;

    const timestamp = location.timestamp;

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180 ||
        !Number.isFinite(timestamp)
    ) {
        return {
            reliable: false,
            status: "invalid",
            ageMs: null,
        };
    }

    const ageMs = now - timestamp;

    // Reject timestamps significantly ahead of the clock.
    if (ageMs < -maxFutureSkewMs) {
        return {
            reliable: false,
            status: "invalid-time",
            ageMs,
        };
    }

    // Do not navigate using an old position.
    if (ageMs > maxAgeMs) {
        return {
            reliable: false,
            status: "stale",
            ageMs,
        };
    }

    if (
        !Number.isFinite(accuracy) ||
        accuracy < 0 ||
        accuracy > maxAccuracyMeters
    ) {
        return {
            reliable: false,
            status: "poor-accuracy",
            ageMs,
        };
    }

    return {
        reliable: true,
        status: "reliable",
        ageMs,
    };
}
