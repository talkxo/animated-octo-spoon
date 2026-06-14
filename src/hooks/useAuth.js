import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { auth, googleProvider, isConfigured } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setUser(null);
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
      throw new Error('Firebase is not configured.');
    }
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    return signInWithPopup(auth, googleProvider);
  };

  const signUpWithEmail = async (email, password, displayName, rememberMe = true) => {
    if (!isConfigured || !auth) {
      throw new Error('Firebase is not configured.');
    }
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    return result;
  };

  const signInWithEmail = async (email, password, rememberMe = true) => {
    if (!isConfigured || !auth) {
      throw new Error('Firebase is not configured.');
    }
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
  };

  const resetPassword = async (email) => {
    if (!isConfigured || !auth) {
      throw new Error('Firebase is not configured.');
    }
    return sendPasswordResetEmail(auth, email);
  };

  const signOutUser = () => {
    if (isConfigured && auth) {
      return signOut(auth);
    }
  };

  return { user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword, signOutUser };
}
