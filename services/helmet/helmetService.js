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

export const HELMET_STATUS = Object.freeze({
  DISCONNECTED: "disconnected",
  SIMULATED: "simulated",
  CONNECTED: "connected",
});

export const HELMET_MODE = Object.freeze({
  SIMULATION: "simulation",
  WIFI: "wifi",
});

let currentStatus = HELMET_STATUS.DISCONNECTED;

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

  currentStatus = HELMET_STATUS.SIMULATED;
  notifyListeners();

  return {
    success: true,
    status: currentStatus,
    message: "Helmet simulation started. No physical device is connected.",
  };
}

export function disconnectHelmet() {
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
