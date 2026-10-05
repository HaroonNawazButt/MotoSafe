/**
 * MotoSafe Helmet Communication Service
 *
 * Current implementation: simulation only.
 * Future implementation: local ESP32 Wi-Fi communication.
 *
 * Simulation must never be treated as a real safety connection.
 */
import {
  createHelmetCommand,
} from "./helmetProtocol.js";

import {
  establishHelmetWifiConnection,
  sendMockWifiCommand,
  receiveMockWifiEvents,
} from "./helmetWifiConnection.js";

export const HELMET_STATUS = Object.freeze({
  DISCONNECTED: "disconnected",
  SIMULATED: "simulated",
  MOCK_WIFI: "mock_wifi",
  CONNECTED: "connected",
});

export const HELMET_MODE = Object.freeze({
  SIMULATION: "simulation",
  WIFI: "wifi",
});

let currentStatus = HELMET_STATUS.DISCONNECTED;
let connectionGeneration = 0;
let activeMockWifiAddress = null;
const processedMockEventIds = new Set();
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(currentStatus);
    } catch (error) {
      console.error("[HelmetService] Listener error:", error);
    }
  });
}

export function getHelmetStatus() {
  return currentStatus;
}

export function subscribeHelmetStatus(listener) {
  if (typeof listener !== "function") {
    throw new TypeError("Helmet status listener must be a function");
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function connectHelmet(mode = HELMET_MODE.SIMULATION) {
  if (mode !== HELMET_MODE.SIMULATION) {
    return {
      success: false,
      status: currentStatus,
      message: "Real Wi-Fi communication is not implemented yet.",
    };
  }
  // Invalidate any pending asynchronous Wi-Fi connection.
  connectionGeneration++;
  activeMockWifiAddress = null;
  processedMockEventIds.clear();
  currentStatus = HELMET_STATUS.SIMULATED;
  notifyListeners();

  return {
    success: true,
    status: currentStatus,
    message: "Helmet simulation started. No physical device is connected.",
  };
}


/**
 * Connect to the development mock ESP32 server.
 *
 * A successful mock handshake must never be represented
 * as a verified physical helmet connection.
 */

export async function connectMockHelmetWifi(baseUrl) {
  const generation = ++connectionGeneration;

  const result = await establishHelmetWifiConnection(baseUrl);

  // A newer connection attempt, simulation start, or disconnect
  // invalidates this pending request.
  if (generation !== connectionGeneration) {
    return {
      success: false,
      status: currentStatus,
      message: "Helmet connection attempt was cancelled or superseded.",
    };
  }

  if (!result.success || !result.connected) {
    return {
      success: false,
      status: currentStatus,
      message: result.message,
    };
  }
  processedMockEventIds.clear();
  activeMockWifiAddress = baseUrl;
  currentStatus = HELMET_STATUS.MOCK_WIFI;
  notifyListeners();

  return {
    success: true,
    status: currentStatus,
    simulated: true,
    physicalDevice: false,
    device: result.device,
    message:
      "Mock Wi-Fi connection established. No physical helmet is connected.",
  };
}


export function disconnectHelmet() {
  // Cancel any pending asynchronous connection attempt.
  connectionGeneration++;
  activeMockWifiAddress = null;
  processedMockEventIds.clear();
  currentStatus = HELMET_STATUS.DISCONNECTED;
  notifyListeners();

  return {
    success: true,
    status: currentStatus,
  };
}

export function sendHelmetWarning(type, payload = {}) {
  // Validate the command before attempting delivery.
  const command = createHelmetCommand(type, payload);

  if (currentStatus !== HELMET_STATUS.SIMULATED) {
    return {
      success: false,
      delivered: false,
      simulated: false,
      message: "No active helmet simulation or hardware connection.",
    };
  }

  console.log(
    "[MotoSafe Helmet Simulation]",
    JSON.stringify(command, null, 2)
  );

  return {
    success: true,
    delivered: false,
    simulated: true,
    command,
    message: "Command simulated. Nothing was transmitted to hardware.",
  };
}

/**
 * Send a warning through the active development mock Wi-Fi connection.
 *
 * This function is asynchronous and separate from the existing
 * synchronous simulation warning function.
 *
 * A mock acknowledgement never represents physical speaker delivery.
 */
export async function sendMockHelmetWifiWarning(type, payload = {}) {
  // Validate the command before attempting transmission.
  createHelmetCommand(type, payload);

  if (
    currentStatus !== HELMET_STATUS.MOCK_WIFI ||
    !activeMockWifiAddress
  ) {
    return {
      success: false,
      accepted: false,
      delivered: false,
      simulated: true,
      message: "No active mock Wi-Fi helmet connection.",
    };
  }

  // Capture the connection identity before the asynchronous request.
  const generation = connectionGeneration;
  const address = activeMockWifiAddress;

  const result = await sendMockWifiCommand(address, type, payload);

  // Reject results belonging to an old connection.
  if (
    generation !== connectionGeneration ||
    currentStatus !== HELMET_STATUS.MOCK_WIFI ||
    activeMockWifiAddress !== address
  ) {
    return {
      success: false,
      accepted: false,
      delivered: false,
      simulated: true,
      message: "Warning result discarded: helmet connection changed.",
    };
  }

  return result;
}

/**
 * Receive new events from the active development mock Wi-Fi connection.
 *
 * Events already processed during the current connection session
 * are filtered by event ID.
 *
 * This function does not trigger emergency actions.
 */
export async function receiveMockHelmetWifiEvents() {
  if (
    currentStatus !== HELMET_STATUS.MOCK_WIFI ||
    !activeMockWifiAddress
  ) {
    return {
      success: false,
      events: [],
      message: "No active mock Wi-Fi helmet connection.",
    };
  }

  // Capture the current connection identity before the async request.
  const generation = connectionGeneration;
  const address = activeMockWifiAddress;

  const result = await receiveMockWifiEvents(address);

  // Discard results belonging to an old or changed connection.
  if (
    generation !== connectionGeneration ||
    currentStatus !== HELMET_STATUS.MOCK_WIFI ||
    activeMockWifiAddress !== address
  ) {
    return {
      success: false,
      events: [],
      message: "Event result discarded: helmet connection changed.",
    };
  }

  if (!result.success) {
    return result;
  }

  const newEvents = result.events.filter(
    (event) => !processedMockEventIds.has(event.id)
  );

  newEvents.forEach((event) => {
    processedMockEventIds.add(event.id);
  });

  return {
    success: true,
    events: newEvents,
    receivedCount: result.events.length,
    newCount: newEvents.length,
    message:
      newEvents.length > 0
        ? "New mock helmet events received."
        : "No new mock helmet events.",
  };
}
