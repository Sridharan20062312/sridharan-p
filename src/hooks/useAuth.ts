import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserProfile, getUserProfile } from '../lib/firebaseService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const profile = await getUserProfile(u.uid);
        if (!profile) {
          await createUserProfile(u.uid, {
            email: u.email,
            displayName: u.displayName,
            phoneNumber: u.phoneNumber || '',
            emergencyContacts: [],
            isSafetyOn: false
          });
        }
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const logout = () => signOut(auth);

  return { user, loading, login, logout };
}
