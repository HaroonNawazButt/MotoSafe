# MotoSafe Native Automatic SMS Module

This directory contains the custom Android Kotlin implementation
used by MotoSafe to send emergency SMS without opening the SMS composer.

## Files

- NativeSMSModule.kt
- NativeSMSPackage.kt

## Integration

The Android directory is excluded from Git because it is generated
by Expo. After generating the Android project, copy both Kotlin files
into:

android/app/src/main/java/com/haroon/motosafe/

In MainApplication.kt, locate:

PackageList(this).packages.apply {

Add the following inside that block:

// MotoSafe native automatic SMS module
add(NativeSMSPackage())

## Android permission

Ensure app.json contains the following Android permission:

"permissions": [
  "android.permission.SEND_SMS"
]

Also verify that the generated AndroidManifest.xml contains:

<uses-permission android:name="android.permission.SEND_SMS"/>

## Important

- NativeSMS requires an Android development build.
- It does not work inside Expo Go.
- Request SEND_SMS runtime permission before sending.
- Do not replace the existing emergency controller.
- Do not run expo prebuild --clean on an existing working
  Android directory without preserving native modifications.
- Test emergency SMS only with an authorized test recipient.
- SMS delivery depends on cellular SMS service, not mobile internet.
