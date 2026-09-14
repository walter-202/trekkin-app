import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, UserRole } from '../../core/domain/types';
import { handleFirestoreError, OperationType } from './firestoreErrors';

const USERS_COLLECTION = 'users';

export const userProfileService = {
  /**
   * Retrieves a user profile by UID from Firestore.
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docPath = `${USERS_COLLECTION}/${uid}`;
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      return snapshot.data() as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  },

  /**
   * Creates a new user profile document in Firestore.
   */
  async createUserProfile(profile: UserProfile): Promise<void> {
    const docPath = `${USERS_COLLECTION}/${profile.uid}`;
    try {
      const docRef = doc(db, USERS_COLLECTION, profile.uid);
      await setDoc(docRef, {
        ...profile,
        createdAt: profile.createdAt || Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  },

  /**
   * Updates non-restricted fields of an existing user profile.
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    const docPath = `${USERS_COLLECTION}/${uid}`;
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      // Clean undefined values
      const cleanUpdates = Object.entries(updates).reduce<Record<string, any>>((acc, [key, val]) => {
        if (val !== undefined) acc[key] = val;
        return acc;
      }, {});

      await updateDoc(docRef, cleanUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  /**
   * Deletes a user profile (Admin privileged operation).
   */
  async deleteUserProfile(uid: string): Promise<void> {
    const docPath = `${USERS_COLLECTION}/${uid}`;
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  },

  /**
   * Real-time listener for user profile updates.
   */
  subscribeToUserProfile(
    uid: string,
    onUpdate: (profile: UserProfile | null) => void,
    onError?: (err: unknown) => void
  ): () => void {
    const docPath = `${USERS_COLLECTION}/${uid}`;
    const docRef = doc(db, USERS_COLLECTION, uid);

    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate(null);
        } else {
          onUpdate(snapshot.data() as UserProfile);
        }
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, docPath);
      }
    );
  },

  /**
   * Lists users (e.g. for administration or moderation).
   */
  async listUsers(max = 50): Promise<UserProfile[]> {
    const collectionPath = USERS_COLLECTION;
    try {
      const q = query(collection(db, collectionPath), limit(max));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  },
};
