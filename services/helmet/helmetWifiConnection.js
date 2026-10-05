import {
    checkHelmetConnection,
    transmitHelmetCommand,
    fetchHelmetEvents,
} from "./helmetWifiTransport.js";

import {
    createHelmetCommand,
} from "./helmetProtocol.js";

import {
    validateHelmetStatusResponse,
    validateHelmetEventsResponse,
} from "./helmetWifiValidation.js";

/**
 * Establish a validated connection to the helmet HTTP server.
 *
 * This module does not change the shared Helmet Service status.
 * It is currently intended for mock-server testing.
 */
export async function establishHelmetWifiConnection(baseUrl) {
    try {
        const response = await checkHelmetConnection(baseUrl);

        if (!validateHelmetStatusResponse(response)) {
            return {
                success: false,
                connected: false,
                message: "Helmet handshake validation failed.",
            };
        }

        return {
            success: true,
            connected: true,
            device: response.device,
            protocolVersion: response.protocolVersion,
            message: "Mock helmet handshake successful.",
        };
    } catch (error) {
        return {
            success: false,
            connected: false,
            message: error.message,
        };
    }
}

/**
 * Send a structured warning to the development mock ESP32.
 *
 * An HTTP acknowledgement does not mean physical delivery.
 */
export async function sendMockWifiCommand(baseUrl, type, payload = {}) {
    const command = createHelmetCommand(type, payload);

    try {
        const response = await transmitHelmetCommand(baseUrl, command);

        const accepted =
            response !== null &&
            typeof response === "object" &&
            !Array.isArray(response) &&
            response.success === true &&
            response.accepted === true &&
            response.simulated === true &&
            response.delivered === false &&
            response.commandType === command.type;

        if (!accepted) {
            return {
                success: false,
                accepted: false,
                delivered: false,
                simulated: true,
                message: "Mock helmet acknowledgement validation failed.",
            };
        }

        return {
            success: true,
            accepted: true,
            delivered: false,
            simulated: true,
            command,
            message:
                "Mock ESP32 accepted the command. No physical delivery occurred.",
        };
    } catch (error) {
        return {
            success: false,
            accepted: false,
            delivered: false,
            simulated: true,
            message: error.message,
        };
    }
}

/**
 * Fetch and validate events exposed by the mock helmet.
 *
 * This function only retrieves validated events.
 * It does not trigger emergency actions.
 */
export async function receiveMockWifiEvents(baseUrl) {
    try {
        const response = await fetchHelmetEvents(baseUrl);

        if (!validateHelmetEventsResponse(response)) {
            return {
                success: false,
                events: [],
                message: "Mock helmet event validation failed.",
            };
        }

        return {
            success: true,
            events: response.events,
            message: "Mock helmet events received successfully.",
        };
    } catch (error) {
        return {
            success: false,
            events: [],
            message: error.message,
        };
    }
}
