
import {
    checkHelmetConnection,
} from "./helmetWifiTransport.js";

import {
    validateHelmetStatusResponse,
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
