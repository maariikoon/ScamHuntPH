import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* -------------------- Firebase Config -------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAuUlRq4JDTlvgMNkOm3oHfWJKp3ML_wjY",
  authDomain: "scamhuntph-b3485.firebaseapp.com",
  projectId: "scamhuntph-b3485",
  storageBucket: "scamhuntph-b3485-2n5bd",
  messagingSenderId: "328631682624",
  appId: "1:328631682624:web:f83e963e664d62230841a5",
  measurementId: "G-ZCJSNYW07K",
};

/* -------------------- Initialize App -------------------- */
export const firebaseApp = initializeApp(firebaseConfig);

/* 
   ✅ Use initializeAuth instead of getAuth.
   This enables persistent sessions via AsyncStorage.
*/
export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

/* -------------------- Firestore -------------------- */
export const db = getFirestore(firebaseApp);
