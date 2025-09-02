// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Client-side environment variables (for React/Vite)
// Server-side environment variables (for Node.js) are not available in browser
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDU0FwpNhRJUyELDlTxuC3UsqbkvcpKk0Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "personal-ai-5f2c4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "personal-ai-5f2c4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "personal-ai-5f2c4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "619638178308",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:619638178308:web:2b756c7d3b877f5b9aeb51",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XCZKYCY79T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);  

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;