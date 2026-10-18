// app/utils/smsHelper.js
// Sends SMS to all emergency contacts when accident is detected
// Uses expo-sms

import * as SMS from "expo-sms";

// ── Send accident alert SMS to all contacts ───────────────────
export async function sendAccidentSMS(contacts, accidentData) {
  try {
    // Check if SMS is available on this device
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      console.log("[SMS] SMS not available on this device");
      return { success: false, reason: "SMS not available" };
    }

    if (!contacts || contacts.length === 0) {
      console.log("[SMS] No emergency contacts saved");
      return { success: false, reason: "No contacts" };
    }

    // Get all phone numbers
    const phoneNumbers = contacts
      .map((c) => c.phone)
      .filter((p) => p && p.trim() !== "" && p !== "—");

    if (phoneNumbers.length === 0) {
      return { success: false, reason: "No valid phone numbers" };
    }

    // Build the message
    const message = buildAccidentMessage(accidentData);

    // Send SMS to all contacts at once
    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);

    console.log("[SMS] Result:", result);
    return { success: result === "sent", result };

  } catch (error) {
    console.error("[SMS] Error:", error);
    return { success: false, reason: error.message };
  }
}

// ── Send drowsiness alert SMS ─────────────────────────────────
export async function sendDrowsinessSMS(contacts) {
  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable || !contacts || contacts.length === 0) return;

    // Only send to primary contact for drowsiness
    const primary = contacts.find((c) => c.primary) ?? contacts[0];
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
function buildAccidentMessage(accidentData) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const impact = accidentData?.impact_g
    ? `Impact force: ${Number(accidentData.impact_g).toFixed(1)}g. `
    : "";

  return (
    `🚨 EMERGENCY - MotoSafe Alert 🚨\n\n` +
    `An accident has been detected!\n` +
    `Time: ${time}\n` +
    `${impact}` +
    `\nThe rider's helmet safety system has triggered an emergency alert. ` +
    `Please contact them or emergency services immediately.\n\n` +
    `— MotoSafe Safety System`
  );
}
