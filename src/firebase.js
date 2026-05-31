import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let isConfigured = false;

// Check if credentials are set up
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'your_api_key_here') {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    
    // Request access to the user's Google account profile (name, email, photo)
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    isConfigured = true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

export { app, auth, db, googleProvider, isConfigured };
