// config/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

import {
  initializeAuth,
  getReactNativePersistence,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDPFLsjGOFj-km9CPfVgQxJS5vd8UL-9o0",
  authDomain: "motosafe-70.firebaseapp.com",
  databaseURL: "https://motosafe-70-default-rtdb.firebaseio.com",
  projectId: "motosafe-70",
  storageBucket: "motosafe-70.firebasestorage.app",
  messagingSenderId: "947342689888",
  appId: "1:947342689888:web:218665ee40cc2aa0b56505",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);

// Initialize Firebase Authentication with persistent storage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Wait for Firebase to restore any existing session.
export const authReady = new Promise((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(
    auth,
    async (user) => {
      unsubscribe();

      if (user) {
        console.log("[MotoSafe AUTH] Existing session restored:", user.uid);
        resolve(user);
        return;
      }

      try {
        const credential = await signInAnonymously(auth);

        console.log(
          "[MotoSafe AUTH] Signed in successfully:",
          credential.user.uid
        );

        resolve(credential.user);
      } catch (error) {
        console.error(
          "[MotoSafe AUTH] Sign-in failed:",
          error.code,
          error.message
        );

        reject(error);
      }
    },
    (error) => {
      unsubscribe();
      console.error("[MotoSafe AUTH] Authentication error:", error);
      reject(error);
    }
  );
});