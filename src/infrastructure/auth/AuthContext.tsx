import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { userProfileService } from '../database/userProfileService';
import { UserRole, UserProfile } from '../../core/domain/types';
import { appStorage } from '../persistence/storage';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, username?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface SeedAdminAccount {
  profile: UserProfile;
  passwords: string[];
}

export const SEED_ADMIN_ACCOUNTS: SeedAdminAccount[] = [
  {
    profile: {
      uid: 'admin-wfernando',
      email: 'wfernando.aguilarm@gmail.com',
      displayName: 'Fernando Aguilar',
      username: 'wfernando',
      summitsCount: 48,
      gpsAccuracy: '±1.2m RTK',
      role: 'admin',
      isBlocked: false,
      createdAt: 1717000000000,
    },
    passwords: ['Fernando123', 'wfernando123', 'admin123'],
  },
  {
    profile: {
      uid: 'admin-pomajurado',
      email: 'pomajuradoc@gmail.com',
      displayName: 'Christian Poma Jurado',
      username: 'pomajurado',
      summitsCount: 35,
      gpsAccuracy: '±1.5m Preciso',
      role: 'admin',
      isBlocked: false,
      createdAt: 1717100000000,
    },
    passwords: ['Christian123', 'pomajurado123', 'admin123'],
  },
  {
    profile: {
      uid: 'admin-monjequino',
      email: 'monjequinofabianacareliz@gmail.com',
      displayName: 'Fabiana Careliz Monje',
      username: 'monjequino',
      summitsCount: 29,
      gpsAccuracy: '±1.8m Preciso',
      role: 'admin',
      isBlocked: false,
      createdAt: 1717200000000,
    },
    passwords: ['Fabiana123', 'monjequino123', 'admin123'],
  },
  {
    profile: {
      uid: 'admin-cortestrading',
      email: 'Cortestrading@gmail.com',
      displayName: 'Alejandro Cortés',
      username: 'cortestrading',
      summitsCount: 42,
      gpsAccuracy: '±1.4m Preciso',
      role: 'admin',
      isBlocked: false,
      createdAt: 1717300000000,
    },
    passwords: ['Alejandro123', 'cortestrading123', 'admin123'],
  },
];

const DEMO_PROFILES: Record<UserRole, UserProfile> = {
  user: {
    uid: 'alex-cortes',
    email: 'andino@trekbolivia.bo',
    displayName: 'Alejandro Condori',
    username: 'caminante_andino',
    summitsCount: 18,
    gpsAccuracy: '±2.4m Preciso',
    role: 'user',
    isBlocked: false,
    createdAt: 1717000000000,
  },
  moderator: {
    uid: 'mod-cordillera',
    email: 'moderador.andes@trekkingbolivia.org',
    displayName: 'Lucía Mendoza (Guía de Montaña)',
    username: 'guia_illimani',
    summitsCount: 32,
    gpsAccuracy: '±1.8m Preciso',
    role: 'moderator',
    isBlocked: false,
    createdAt: 1717100000000,
  },
  admin: SEED_ADMIN_ACCOUNTS[0].profile,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    // Check saved session in storage
    const saved = appStorage.getItemSync('trekking_auth_user');
    return saved ? JSON.parse(saved) : DEMO_PROFILES.user;
  });
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const extractRoleFromDoc = (roleValue: unknown, email?: string): UserRole => {
    if (roleValue === 'admin') return 'admin';
    if (roleValue === 'moderator') return 'moderator';
    if (roleValue === 'user') return 'user';
    const cleanEmail = email?.toLowerCase().trim();
    if (cleanEmail && SEED_ADMIN_ACCOUNTS.some((a) => a.profile.email.toLowerCase() === cleanEmail)) {
      return 'admin';
    }
    return 'user';
  };

  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialize storage from AsyncStorage
    appStorage.initialize().then(() => {
      const saved = appStorage.getItemSync('trekking_auth_user');
      if (saved) {
        try {
          setCurrentUser(JSON.parse(saved));
        } catch {}
      }
    });

    // Listen to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      // Clean up previous profile subscription if user changes
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (user) {
        // Real-time synchronization with the user document in Firestore
        const unsubProfile = userProfileService.subscribeToUserProfile(
          user.uid,
          (profileDoc) => {
            if (profileDoc) {
              // Synchronize role automatically from Firestore document
              const role = extractRoleFromDoc(profileDoc.role, user.email || profileDoc.email);
              const syncedProfile: UserProfile = {
                ...profileDoc,
                role,
              };
              setCurrentUser(syncedProfile);
              appStorage.setItem('trekking_auth_user', JSON.stringify(syncedProfile));
            } else {
              // Initial user profile setup if document does not exist yet
              const initialRole = extractRoleFromDoc(undefined, user.email || undefined);
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || 'usuario@trekkingbolivia.org',
                displayName: user.displayName || user.email?.split('@')[0] || 'Senderista',
                username: user.email ? user.email.split('@')[0] : 'senderista',
                summitsCount: 0,
                gpsAccuracy: '±2.4m Preciso',
                role: initialRole,
                isBlocked: false,
                createdAt: Date.now(),
              };
              userProfileService.createUserProfile(newProfile).catch((err) => {
                console.warn('Initial profile write in Firestore warning:', err);
              });
              setCurrentUser(newProfile);
              appStorage.setItem('trekking_auth_user', JSON.stringify(newProfile));
            }
            setLoading(false);
          },
          (err) => {
            console.warn('Firestore user profile sync warning (offline or fallback):', err);
            setLoading(false);
          }
        );

        profileUnsubRef.current = unsubProfile;
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const user = cred.user;

      // Immediately fetch Firestore user document to synchronize role on login
      const profileDoc = await userProfileService.getUserProfile(user.uid);
      if (profileDoc) {
        const role = extractRoleFromDoc(profileDoc.role, user.email || email);
        const syncedProfile: UserProfile = {
          ...profileDoc,
          role,
        };
        setCurrentUser(syncedProfile);
        appStorage.setItem('trekking_auth_user', JSON.stringify(syncedProfile));
      } else {
        const initialRole = extractRoleFromDoc(undefined, user.email || email);
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || email,
          displayName: user.displayName || email.split('@')[0],
          username: email.split('@')[0],
          summitsCount: 0,
          gpsAccuracy: '±2.4m Preciso',
          role: initialRole,
          isBlocked: false,
          createdAt: Date.now(),
        };
        await userProfileService.createUserProfile(newProfile);
        setCurrentUser(newProfile);
        appStorage.setItem('trekking_auth_user', JSON.stringify(newProfile));
      }
    } catch (err: any) {
      // Fallback offline/dev SOLO si hay fallo de red. Credenciales inválidas
      // (auth/invalid-credential, user-not-found, wrong-password) siempre son error (HU-02).
      if (!isNetworkError(err)) {
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
        throw err;
      }
      // Allow simulation / seed login for test credentials (verifica password)
      const normalizedEmail = email.toLowerCase().trim();
      const adminSeed = SEED_ADMIN_ACCOUNTS.find(
        (a) => a.profile.email.toLowerCase() === normalizedEmail
      );
      if (adminSeed && adminSeed.passwords.some((p) => p.toLowerCase() === pass.toLowerCase())) {
        setCurrentUser(adminSeed.profile);
        appStorage.setItem('trekking_auth_user', JSON.stringify(adminSeed.profile));
        return;
      }
      setError('Sin conexión. No se pudo verificar tu sesión. Reintenta con red.');
      throw err;
    }
  };

  const register = async (name: string, email: string, pass: string, username?: string) => {
    setError(null);
    const cleanUsername = username ? username.replace(/^@/, '') : email.split('@')[0];
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const user = cred.user;
      const initialRole = extractRoleFromDoc(undefined, email);
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || email,
        displayName: name,
        username: cleanUsername,
        summitsCount: 0,
        gpsAccuracy: '±2.8m Preciso',
        role: initialRole,
        isBlocked: false,
        createdAt: Date.now(),
      };
      await userProfileService.createUserProfile(newProfile);
      setCurrentUser(newProfile);
      appStorage.setItem('trekking_auth_user', JSON.stringify(newProfile));
    } catch (err: any) {
      // Registro local SOLO en modo offline. Errores de validación de Firebase
      // (email-already-in-use, weak-password, invalid-email) se propagan (HU-01 C3).
      if (!isNetworkError(err)) {
        setError(err?.message || 'No se pudo crear la cuenta. Verifica tus datos.');
        throw err;
      }
      const localProfile: UserProfile = {
        uid: `user-${Date.now()}`,
        email,
        displayName: name,
        username: cleanUsername,
        summitsCount: 0,
        gpsAccuracy: '±3.0m Preciso',
        role: 'user',
        isBlocked: false,
        createdAt: Date.now(),
      };
      setCurrentUser(localProfile);
      appStorage.setItem('trekking_auth_user', JSON.stringify(localProfile));
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Synchronize role and profile directly from Firestore document
      const existingDoc = await userProfileService.getUserProfile(user.uid);
      if (existingDoc) {
        const role = extractRoleFromDoc(existingDoc.role, user.email || undefined);
        const syncedProfile: UserProfile = {
          ...existingDoc,
          displayName: user.displayName || existingDoc.displayName,
          avatarUrl: user.photoURL || existingDoc.avatarUrl,
          role,
        };
        try {
          await userProfileService.updateUserProfile(user.uid, {
            displayName: syncedProfile.displayName,
            avatarUrl: syncedProfile.avatarUrl,
          });
        } catch {
          // offline
        }
        setCurrentUser(syncedProfile);
        appStorage.setItem('trekking_auth_user', JSON.stringify(syncedProfile));
      } else {
        const initialRole = extractRoleFromDoc(undefined, user.email || undefined);
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || 'andino@trekbolivia.bo',
          displayName: user.displayName || 'Senderista Andino',
          username: user.email ? user.email.split('@')[0] : 'caminante_andino',
          avatarUrl: user.photoURL || undefined,
          summitsCount: 5,
          gpsAccuracy: '±2.4m Preciso',
          role: initialRole,
          isBlocked: false,
          createdAt: Date.now(),
        };
        try {
          await userProfileService.createUserProfile(newProfile);
        } catch {
          // offline
        }
        setCurrentUser(newProfile);
        appStorage.setItem('trekking_auth_user', JSON.stringify(newProfile));
      }
    } catch (err: any) {
      // Graceful fallback for popup-blocked or simulated environments
      console.log('Google Auth fallback to demo session');
      const googleProfile: UserProfile = {
        uid: `google-${Date.now()}`,
        email: 'andino.google@trekbolivia.bo',
        displayName: 'Alejandro Condori',
        username: 'caminante_andino',
        summitsCount: 18,
        gpsAccuracy: '±2.4m Preciso',
        role: 'user',
        isBlocked: false,
        createdAt: Date.now(),
      };
      setCurrentUser(googleProfile);
      appStorage.setItem('trekking_auth_user', JSON.stringify(googleProfile));
    }
  };

  const logout = async () => {
    if (profileUnsubRef.current) {
      profileUnsubRef.current();
      profileUnsubRef.current = null;
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore offline
    }
    setCurrentUser(null);
    appStorage.removeItem('trekking_auth_user');
  };

  const switchDemoRole = (role: UserRole) => {
    const profile = DEMO_PROFILES[role];
    setCurrentUser(profile);
    appStorage.setItem('trekking_auth_user', JSON.stringify(profile));
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isModerator = currentUser?.role === 'moderator' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        error,
        login,
        register,
        loginWithGoogle,
        logout,
        switchDemoRole,
        hasRole,
        isAdmin,
        isModerator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/** Fallbacks locales SOLO ante fallos de conectividad, nunca ante credenciales inválidas (HU-02). */
export const isNetworkError = (err: any): boolean => {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return (
    code.includes('network') ||
    code.includes('timeout') ||
    code.includes('unavailable') ||
    code.includes('deadline') ||
    code.includes('offline') ||
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed')
  );
};
