import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app            = null;
let auth           = null;
let db             = null;
let googleProvider = null;
let isConfigured   = false;

if (
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your_api_key_here'
) {
  try {
    app  = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Enable offline persistence via IndexedDB (free, no Cloud Functions needed).
    // persistentMultipleTabManager allows the same cache to be shared across
    // browser tabs so they don't fight each other.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });

    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    isConfigured = true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

export { app, auth, db, googleProvider, isConfigured };
