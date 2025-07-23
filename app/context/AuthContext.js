"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, provider, db } from "../lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || !auth) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
          // Check if user exists in Firestore, else create
          try {
            const userRef = doc(db, "users", firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                createdAt: new Date(),
              });
            }
            setUser(firebaseUser);
          } catch (err) {
            console.error("Error accessing Firestore:", err);
            setError(err.message);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Auth state change error:", err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Auth initialization error:", err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const login = async () => {
    try {
      if (!auth || !provider) {
        throw new Error("Firebase Auth not initialized");
      }
      return await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (!auth) {
        throw new Error("Firebase Auth not initialized");
      }
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);