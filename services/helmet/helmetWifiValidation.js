
export const HELMET_WIFI_PROTOCOL_VERSION = 1;

/**
 * Validate the response received from GET /status.
 *
 * An HTTP 200 response alone does not establish
 * a valid helmet connection.
 */
export function validateHelmetStatusResponse(response) {
    if (
        !response ||
        typeof response !== "object" ||
        Array.isArray(response)
    ) {
        return false;
    }

    return (
        response.status === "ok" &&
        response.device === "MOCK_ESP32_CAM" &&
        response.protocolVersion === HELMET_WIFI_PROTOCOL_VERSION
    );
}
