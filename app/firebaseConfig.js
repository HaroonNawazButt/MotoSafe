import { initializeApp } from "firebase/app";
import { getDatabase }   from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyDPFLsjGOFj-km9CPfVgQxJS5vd8UL-9o0",
  authDomain:        "motosafe-70.firebaseapp.com",
  databaseURL:       "https://motosafe-70-default-rtdb.firebaseio.com",
  projectId:         "motosafe-70",
  storageBucket:     "motosafe-70.firebasestorage.app",
  messagingSenderId: "947342689888",
  appId:             "1:947342689888:web:218665ee40cc2aa0b56505"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);