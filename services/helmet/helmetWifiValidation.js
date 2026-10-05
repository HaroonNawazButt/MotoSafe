import { HELMET_EVENT } from "./helmetProtocol.js";
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

export function validateHelmetEventsResponse(response) {
    if (
        !response ||
        typeof response !== "object" ||
        Array.isArray(response) ||
        !Array.isArray(response.events)
    ) {
        return false;
    }

    const seenIds = new Set();

    return response.events.every((event) => {
        if (
            !event ||
            typeof event !== "object" ||
            Array.isArray(event) ||
            typeof event.id !== "string" ||
            event.id.trim() === "" ||
            event.version !== HELMET_WIFI_PROTOCOL_VERSION ||
            !Object.values(HELMET_EVENT).includes(event.type) ||
            !event.payload ||
            typeof event.payload !== "object" ||
            Array.isArray(event.payload)
        ) {
            return false;
        }

        if (seenIds.has(event.id)) {
            return false;
        }

        seenIds.add(event.id);
        return true;
    });
}
