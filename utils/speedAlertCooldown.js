
/**
 * MotoSafe — Speed Alert Cooldown
 *
 * Controls repeated warning events.
 * Does not play audio or access helmet hardware.
 */

export const SPEED_ALERT_COOLDOWN_MS = 30000;
export const SPEED_ALERT_REARM_MARGIN_KMH = 2;

export const shouldEmitSpeedWarning = ({
    isOverspeeding,
    lastWarningTime = null,
    now = Date.now(),
    cooldownMs = SPEED_ALERT_COOLDOWN_MS,
}) => {
    if (!isOverspeeding) {
        return {
            emit: false,
            reset: true,
            reason: "within_threshold",
        };
    }

    if (lastWarningTime === null) {
        return {
            emit: true,
            reset: false,
            reason: "first_warning",
        };
    }

    if (now - lastWarningTime >= cooldownMs) {
        return {
            emit: true,
            reset: false,
            reason: "cooldown_completed",
        };
    }

    return {
        emit: false,
        reset: false,
        reason: "cooldown_active",
    };
};

/**
 * Rearms the speed warning only after the rider
 * reduces speed sufficiently below the threshold.
 */
export const shouldRearmSpeedWarning = ({
    currentSpeedKmh,
    thresholdKmh,
    marginKmh = SPEED_ALERT_REARM_MARGIN_KMH,
} = {}) => {
    if (
        typeof currentSpeedKmh !== "number" ||
        !Number.isFinite(currentSpeedKmh) ||
        currentSpeedKmh < 0 ||
        typeof thresholdKmh !== "number" ||
        !Number.isFinite(thresholdKmh) ||
        thresholdKmh <= 0
    ) {
        return false;
    }

    const margin = Math.max(
        0,
        Number.isFinite(marginKmh)
            ? marginKmh
            : SPEED_ALERT_REARM_MARGIN_KMH
    );

    return currentSpeedKmh <= thresholdKmh - margin;
};