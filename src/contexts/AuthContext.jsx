import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileFetchedFor = useRef(null);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user || null);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUser = async (currentUser) => {
    if (currentUser) {
      setUser(currentUser);
      const quickProfile = { 
        name: currentUser.user_metadata?.name || currentUser.email.split('@')[0], 
        email: currentUser.email 
      };
      setUserProfile(quickProfile);
      setLoading(false);

      if (profileFetchedFor.current === currentUser.id) return;
      profileFetchedFor.current = currentUser.id;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (data) {
          setUserProfile(data);
        } else if (error && error.code === 'PGRST116') {
          // Profile doesn't exist, handle_new_user trigger should handle it, 
          // but we can try to insert if trigger is not set up
          await supabase.from('profiles').upsert({ 
            id: currentUser.id, 
            name: quickProfile.name, 
            email: quickProfile.email 
          });
        }
      } catch (err) {
        console.error("Supabase Profile Sync Error:", err);
      }
    } else {
      setUser(null);
      setUserProfile(null);
      profileFetchedFor.current = null;
      setLoading(false);
    }
  };

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
  
  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
    return data;
  };

  const logout = () => supabase.auth.signOut();

  const value = { user, userProfile, login, register, signup: register, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


