import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { auth, googleProvider, isConfigured } from '../firebase';

/**
 * useAuth — wraps Firebase Auth state.
 * Returns { user, loading, signInWithGoogle, signOutUser }
 * `user` is null when signed out, Firebase User object when signed in.
 */
export function useAuth() {
  const [user, setUser] = useState(isConfigured ? undefined : null); // undefined = still loading
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async (rememberMe = true) => {
    if (!isConfigured || !auth || !googleProvider) {
      alert('Firebase is not configured yet. Please configure it in your .env file.');
      return;
    }
    // Match the existing "Remember Me" UX — persist session accordingly
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    return signInWithPopup(auth, googleProvider);
  };

  const signOutUser = () => {
    if (isConfigured && auth) {
      return signOut(auth);
    }
  };

  return { user, loading, signInWithGoogle, signOutUser };
}
