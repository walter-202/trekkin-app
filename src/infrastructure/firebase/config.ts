import { initializeApp, getApps, getApp } from 'firebase/app';
import * as authModule from 'firebase/auth';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig from '../../../firebase-applet-config.json';

// Initialize Firebase App gracefully (supports SSR, Expo and reloads)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with React Native persistence when available (avoids memory-only warning)
function initializeFirebaseAuth(): Auth {
  try {
    const getRNPersistence = (authModule as Record<string, any>).getReactNativePersistence;
    if (typeof getRNPersistence === 'function' && AsyncStorage) {
      return initializeAuth(app, {
        persistence: getRNPersistence(AsyncStorage),
      });
    }
    return getAuth(app);
  } catch {
    return getAuth(app);
  }
}

export const auth = initializeFirebaseAuth();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

/**
 * Validates Firestore server connection on boot.
 * Reaching the server (even with permission-denied from security rules) confirms live connectivity.
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    return true;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.code === 'not-found') {
      return true;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is in offline mode or network unreachable.');
    }
    return false;
  }
}

export default app;
