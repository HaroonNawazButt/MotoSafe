package com.haroon.motosafe

import android.Manifest
import android.content.pm.PackageManager
import android.telephony.SmsManager

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeSMSModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NativeSMS"
    }

    @ReactMethod
    fun sendSMS(
        phoneNumber: String,
        message: String,
        promise: Promise
    ) {
        try {
            if (
                reactApplicationContext.checkSelfPermission(
                    Manifest.permission.SEND_SMS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject(
                    "SMS_PERMISSION_DENIED",
                    "SEND_SMS permission has not been granted."
                )
                return
            }

            if (phoneNumber.isBlank()) {
                promise.reject(
                    "INVALID_PHONE_NUMBER",
                    "Phone number is empty."
                )
                return
            }

            if (message.isBlank()) {
                promise.reject(
                    "INVALID_MESSAGE",
                    "SMS message is empty."
                )
                return
            }

            val smsManager = SmsManager.getDefault()

            // Android SMS messages have a size limit.
            // divideMessage() safely splits a longer MotoSafe
            // emergency message into multipart SMS messages.
            val parts = smsManager.divideMessage(message)

            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(
                    phoneNumber,
                    null,
                    parts,
                    null,
                    null
                )
            } else {
                smsManager.sendTextMessage(
                    phoneNumber,
                    null,
                    message,
                    null,
                    null
                )
            }

            promise.resolve(true)

        } catch (e: Exception) {
            promise.reject(
                "SMS_SEND_ERROR",
                e.message ?: "Unable to send SMS.",
                e
            )
        }
    }
}
