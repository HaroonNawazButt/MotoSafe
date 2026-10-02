// utils/smsHelper.js
// MotoSafe emergency SMS helper
// expo-sms opens the device SMS composer; it does not silently send SMS.

import * as SMS from "expo-sms";

// ── Send accident alert SMS to all contacts ───────────────────
export async function sendAccidentSMS(contacts, accidentData) {
  try {
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      console.log("[SMS] SMS not available on this device");
      return { success: false, reason: "SMS not available" };
    }

    if (!contacts || contacts.length === 0) {
      console.log("[SMS] No emergency contacts saved");
      return { success: false, reason: "No contacts" };
    }

    const phoneNumbers = contacts
      .map((contact) => contact.phone)
      .filter(
        (phone) =>
          phone &&
          phone.trim() !== "" &&
          phone !== "—"
      );

    if (phoneNumbers.length === 0) {
      return {
        success: false,
        reason: "No valid phone numbers",
      };
    }

    const message = buildAccidentMessage(accidentData);

    const { result } = await SMS.sendSMSAsync(
      phoneNumbers,
      message
    );

    console.log("[SMS] Result:", result);

    return {
      success: result === "sent",
      result,
    };
  } catch (error) {
    console.error("[SMS] Error:", error);

    return {
      success: false,
      reason: error.message,
    };
  }
}

// ── Send drowsiness alert SMS ─────────────────────────────────
export async function sendDrowsinessSMS(contacts) {
  try {
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable || !contacts || contacts.length === 0) {
      return;
    }

    const primary =
      contacts.find((contact) => contact.primary) ??
      contacts[0];

    if (!primary?.phone) return;

    const message =
      `⚠️ MotoSafe Warning: ${primary.riderName ?? "The rider"} ` +
      `is showing signs of drowsiness. ` +
      `Please check on them. — MotoSafe Safety System`;

    await SMS.sendSMSAsync([primary.phone], message);
  } catch (error) {
    console.error("[SMS] Drowsiness SMS error:", error);
  }
}

// ── Build accident message ────────────────────────────────────
// Exported separately so we can test the emergency message
// without opening the SMS composer.
export function buildAccidentMessage(accidentData = {}) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const impact =
    accidentData?.impact_g != null &&
      Number.isFinite(Number(accidentData.impact_g))
      ? `Impact force: ${Number(
        accidentData.impact_g
      ).toFixed(1)}g.\n`
      : "";

  const latitude = Number(accidentData?.latitude);
  const longitude = Number(accidentData?.longitude);

  const hasLocation =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const locationText = hasLocation
    ? `Location:\nhttps://maps.google.com/?q=${latitude},${longitude}\n`
    : "Location: unavailable\n";

  return (
    `🚨 EMERGENCY - MotoSafe Alert 🚨\n\n` +
    `An accident has been detected.\n` +
    `Time: ${time}\n` +
    `${impact}` +
    `${locationText}\n` +
    `Please contact the rider or emergency services immediately.\n\n` +
    `— MotoSafe Safety System`
  );
}