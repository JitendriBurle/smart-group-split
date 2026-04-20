import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Guard: prevents a duplicate Firestore getDoc on token-refresh events
  // when the profile is already loaded into memory.
  const profileFetchedFor = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Set a minimal profile instantly from auth object so UI renders fast
        const quickProfile = { name: currentUser.displayName || currentUser.email.split('@')[0], email: currentUser.email };
        setUserProfile(quickProfile);
        setLoading(false); // Unblock app immediately — profile sync happens in background

        // Pre-warm the token cache so the first API call after login has zero auth overhead
        currentUser.getIdToken(false).catch(() => {}); // fire-and-forget

        // Background: sync full profile from Firestore only once per uid
        if (profileFetchedFor.current === currentUser.uid) return;
        profileFetchedFor.current = currentUser.uid;

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            await setDoc(doc(db, 'users', currentUser.uid), quickProfile);
          }
        } catch (err) {
          console.error("Firestore Profile Sync Error:", err);
          // quickProfile already set above — no extra fallback needed
        }
      } else {
        setUser(null);
        setUserProfile(null);
        profileFetchedFor.current = null;
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  
  const register = async (name, email, password) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(res.user, { displayName: name });
    await setDoc(doc(db, 'users', res.user.uid), { name, email });
    return res;
  };

  const logout = () => signOut(auth);

  const value = { user, userProfile, login, register, signup: register, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


