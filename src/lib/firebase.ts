import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app;
let auth;
let db;
let initError: Error | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Use the database ID if provided, otherwise use default database
  db = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (error) {
  initError = error as Error;
  console.error('Firebase initialization error:', error);
}

export { auth, db, initError };
