
export function stabilizeRouteProgress(
    previous,
    current,
    options = {}
) {
    const {
        backwardToleranceMeters = 25,
        maxForwardSpeedMps = 45,
        gpsMarginMeters = 25,
    } = options;

    if (
        !current ||
        !Number.isFinite(current.remainingMeters) ||
        !Number.isFinite(current.distanceFromRouteMeters) ||
        !Number.isFinite(current.timestamp)
    ) {
        return {
            status: "invalid",
            progress: previous,
        };
    }

    if (
        !previous ||
        !Number.isFinite(previous.remainingMeters) ||
        !Number.isFinite(previous.timestamp)
    ) {
        return {
            status: "accepted",
            progress: current,
        };
    }

    const elapsedSeconds =
        (current.timestamp - previous.timestamp) / 1000;

    if (elapsedSeconds <= 0) {
        return {
            status: "stale",
            progress: previous,
        };
    }

    const change =
        previous.remainingMeters - current.remainingMeters;

    // Small backward movements may be caused by GPS noise.
    if (
        change < 0 &&
        Math.abs(change) <= backwardToleranceMeters
    ) {
        return {
            status: "held",
            progress: {
                ...previous,
                timestamp: current.timestamp,
            },
        };
    }

    // A large backward movement requires a new route check.
    if (change < -backwardToleranceMeters) {
        return {
            status: "needs-recheck",
            progress: previous,
        };
    }

    // Reject implausibly large forward jumps.
    const maxForwardDistance =
        maxForwardSpeedMps * elapsedSeconds +
        gpsMarginMeters;

    if (change > maxForwardDistance) {
        return {
            status: "needs-recheck",
            progress: previous,
        };
    }

    return {
        status: "accepted",
        progress: current,
    };
}
