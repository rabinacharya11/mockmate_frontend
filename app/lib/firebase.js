// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC6J2z-0CF-kcrOSnZThLVJ53SioKtlMDk",
  authDomain: "mockmate-b2673.firebaseapp.com",
  projectId: "mockmate-b2673",
  storageBucket: "mockmate-b2673.firebasestorage.app",
  messagingSenderId: "514758016853",
  appId: "1:514758016853:web:7a16b6955e6a70fd67b9dc",
  measurementId: "G-QMQT4XB67Q"
};

// Log the config for debugging (remove in production)
console.log("Firebase config:", { 
  apiKey: firebaseConfig.apiKey ? "defined" : "undefined",
  authDomain: firebaseConfig.authDomain ? "defined" : "undefined",
  projectId: firebaseConfig.projectId ? "defined" : "undefined"
});

// Initialize Firebase only on the client side
let app;
let auth;
let provider;
let db;

if (typeof window !== "undefined") {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  db = getFirestore(app);
}

export { auth, provider, db };