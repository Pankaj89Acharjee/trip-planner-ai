import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase config is valid
const isFirebaseConfigValid = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.authDomain && 
         firebaseConfig.projectId &&
         firebaseConfig.storageBucket &&
         firebaseConfig.messagingSenderId &&
         firebaseConfig.appId;
};

// Initialize Firebase only if config is valid
let app: any = null;
let auth: any = null;
let db: any = null;
let functions: any = null;

if (isFirebaseConfigValid()) {
  console.log("Firebase Config:", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKey: firebaseConfig.apiKey ? "Set" : "Missing"
  });
  
  try {
    // Check if Firebase app already exists
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app, "hackathon01");
    functions = getFunctions(app);

    // Enable network connectivity for Firestore
    enableNetwork(db).catch((error) => {
      console.error('Error enabling Firestore network:', error);
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Set to null if initialization fails
    app = null;
    auth = null;
    db = null;
    functions = null;
  }
} else {
  console.warn('Firebase config is incomplete, skipping initialization');
}

export { auth, db, functions };
export default app;
