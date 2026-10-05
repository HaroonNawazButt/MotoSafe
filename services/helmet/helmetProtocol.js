/**
 * MotoSafe Helmet Warning Protocol — Version 1
 *
 * Defines application-level warning messages.
 * Does not transmit data or trigger emergency actions.
 */

export const HELMET_PROTOCOL_VERSION = 1;

export const HELMET_COMMAND = Object.freeze({
  SPEED_WARNING: "SPEED_WARNING",
  LANE_DEPARTURE_WARNING: "LANE_DEPARTURE_WARNING",
  CONNECTION_TEST: "CONNECTION_TEST",
});

export const HELMET_EVENT = Object.freeze({
  ACCIDENT_DETECTED: "ACCIDENT_DETECTED",
  DEVICE_STATUS: "DEVICE_STATUS",
});

export function createHelmetCommand(type, payload = {}) {
  if (!Object.values(HELMET_COMMAND).includes(type)) {
    throw new Error(`Unsupported helmet command: ${type}`);
  }

  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new TypeError("Helmet command payload must be an object");
  }

  return {
    version: HELMET_PROTOCOL_VERSION,
    type,
    payload: { ...payload },
  };
}

export function createHelmetEvent(type, payload = {}) {
  if (!Object.values(HELMET_EVENT).includes(type)) {
    throw new Error(`Unsupported helmet event: ${type}`);
  }

  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new TypeError("Helmet event payload must be an object");
  }

  return {
    version: HELMET_PROTOCOL_VERSION,
    type,
    payload: { ...payload },
  };
}
