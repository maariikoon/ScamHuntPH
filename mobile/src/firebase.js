import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseApp = initializeApp({
  apiKey: "AIzaSyAuUlRq4JDTlvgMNkOm3oHfWJKp3ML_wjY",
  authDomain: "scamhuntph-b3485.firebaseapp.com",
  projectId: "scamhuntph-b3485",
  storageBucket: "scamhuntph-b3485.appspot.com",
  messagingSenderId: "328631682624",
  appId: "1:328631682624:web:f83e963e664d62230841a5",
  measurementId: "G-ZCJSNYW07K"
});

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
