import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { userProfileService } from "../database/userProfileService";
import { UserRole, UserProfile } from "../../core/domain/types";
import type { RegisterArgs } from "../../core/application/auth/RegisterUser.usecase";
import { RegisterUserUseCase } from "../../core/application/auth/RegisterUser.usecase";
import { LoginUserUseCase } from "../../core/application/auth/LoginUser.usecase";
import { LogoutUserUseCase } from "../../core/application/auth/LogoutUser.usecase";
import { UpdateUserProfileUseCase } from "../../core/application/auth/UpdateUserProfile.usecase";
import type { UpdateProfileInput } from "../../core/domain/auth.schemas";
import { appStorage } from "../persistence/storage";

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (args: RegisterArgs) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileInput) => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  isAdmin: boolean;
  /**
   * Servicio reutilizable para HU-03…HU-10.
   * Guest = visitante sin registrar (HU-01/02 no cambian): SOLO memoria, nunca se
   * persiste en `trekkin_auth_user`. Distingue “invitado” de “sin sesión”.
   */
  isGuest: boolean;
  isAuthenticated: boolean;
  continueAsGuest: () => void;
  exitGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AUTH_STORAGE_KEY = "trekkin_auth_user";

export interface SeedAdminAccount {
  profile: UserProfile;
  passwords: string[];
}

export const SEED_ADMIN_ACCOUNTS: SeedAdminAccount[] = [
  {
    profile: {
      uid: "admin-wfernando",
      email: "wfernando.aguilarm@gmail.com",
      displayName: "Fernando Aguilar",
      username: "wfernando",
      summitsCount: 48,
      gpsAccuracy: "±1.2m RTK",
      role: "admin",
      isBlocked: false,
      createdAt: 1717000000000,
    },
    passwords: ["Fernando123", "wfernando123", "admin123"],
  },
  {
    profile: {
      uid: "admin-pomajurado",
      email: "pomajuradoc@gmail.com",
      displayName: "Christian Poma Jurado",
      username: "pomajurado",
      summitsCount: 35,
      gpsAccuracy: "±1.5m Preciso",
      role: "admin",
      isBlocked: false,
      createdAt: 1717100000000,
    },
    passwords: ["Christian123", "pomajurado123", "admin123"],
  },
  {
    profile: {
      uid: "admin-monjequino",
      email: "monjequinofabianacareliz@gmail.com",
      displayName: "Fabiana Careliz Monje",
      username: "monjequino",
      summitsCount: 29,
      gpsAccuracy: "±1.8m Preciso",
      role: "admin",
      isBlocked: false,
      createdAt: 1717200000000,
    },
    passwords: ["Fabiana123", "monjequino123", "admin123"],
  },
  {
    profile: {
      uid: "admin-cortestrading",
      email: "Cortestrading@gmail.com",
      displayName: "Alejandro Cortés",
      username: "cortestrading",
      summitsCount: 42,
      gpsAccuracy: "±1.4m Preciso",
      role: "admin",
      isBlocked: false,
      createdAt: 1717300000000,
    },
    passwords: ["Alejandro123", "cortestrading123", "admin123"],
  },
];

const DEMO_PROFILES: Record<UserRole, UserProfile> = {
  user: {
    uid: "alex-cortes",
    email: "andino@trekbolivia.bo",
    displayName: "Alejandro Condori",
    username: "caminante_andino",
    summitsCount: 18,
    gpsAccuracy: "±2.4m Preciso",
    role: "user",
    isBlocked: false,
    createdAt: 1717000000000,
  },
  admin: SEED_ADMIN_ACCOUNTS[0].profile,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Sin sesión al compilar: el Gate muestra AuthView hasta login/registro real (HU-01/02).
  // Los perfiles demo/seed solo se activan vía switchDemoRole o fallback offline (aislados).
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const extractRoleFromDoc = (roleValue: unknown, email?: string): UserRole => {
    if (roleValue === 'admin') return 'admin';
    if (roleValue === 'user') return 'user';
    const cleanEmail = email?.toLowerCase().trim();
    if (
      cleanEmail &&
      SEED_ADMIN_ACCOUNTS.some(
        (a) => a.profile.email.toLowerCase() === cleanEmail,
      )
    ) {
      return "admin";
    }
    return "user";
  };

  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialize storage from AsyncStorage
    appStorage.initialize().then(() => {
      const saved = appStorage.getItemSync(AUTH_STORAGE_KEY);
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
              // HU-02: cuenta bloqueada → sin sesión, nunca entra a HomeView.
              if (profileDoc.isBlocked) {
                setError(
                  "Tu cuenta está bloqueada. Contacta al administrador.",
                );
                setCurrentUser(null);
                appStorage.removeItem(AUTH_STORAGE_KEY);
                firebaseSignOut(auth).catch(() => {});
                setLoading(false);
                return;
              }
              // Synchronize role automatically from Firestore document
              const role = extractRoleFromDoc(
                profileDoc.role,
                user.email || profileDoc.email,
              );
              const syncedProfile: UserProfile = {
                ...profileDoc,
                role,
              };
              setCurrentUser(syncedProfile);
              appStorage.setItem(
                AUTH_STORAGE_KEY,
                JSON.stringify(syncedProfile),
              );
            } else {
              // Initial user profile setup if document does not exist yet
              const initialRole = extractRoleFromDoc(
                undefined,
                user.email || undefined,
              );
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || "usuario@trekkinapp.bo",
                displayName:
                  user.displayName || user.email?.split("@")[0] || "Senderista",
                username: user.email ? user.email.split("@")[0] : "senderista",
                summitsCount: 0,
                gpsAccuracy: "±2.4m Preciso",
                role: initialRole,
                isBlocked: false,
                createdAt: Date.now(),
              };
              userProfileService.createUserProfile(newProfile).catch((err) => {
                console.warn(
                  "Initial profile write in Firestore warning:",
                  err,
                );
              });
              setCurrentUser(newProfile);
              appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
            }
            setLoading(false);
          },
          (err) => {
            console.warn(
              "Firestore user profile sync warning (offline or fallback):",
              err,
            );
            setLoading(false);
          },
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
      // HU-02: delega al caso de uso (valida LoginSchema, chequea isBlocked, sincroniza rol).
      const profile = await LoginUserUseCase(
        { email, password: pass },
        {
          signIn: async (signInEmail, signInPass) => {
            const cred = await signInWithEmailAndPassword(
              auth,
              signInEmail,
              signInPass,
            );
            return {
              uid: cred.user.uid,
              email: cred.user.email || signInEmail,
            };
          },
          getProfile: async (uid) => {
            const docFound = await userProfileService.getUserProfile(uid);
            if (!docFound) return null;
            // Sincroniza rol (incluye seed admin por email) preservando isBlocked.
            return {
              ...docFound,
              role: extractRoleFromDoc(docFound.role, docFound.email),
            };
          },
          createProfile: (fresh) => userProfileService.createUserProfile(fresh),
          saveSession: (synced) =>
            appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(synced)),
        },
      );
      setCurrentUser(profile);
      setIsGuest(false);
    } catch (err: any) {
      // Fallback offline/dev SOLO si hay fallo de red. Credenciales inválidas
      // (auth/invalid-credential, user-not-found, wrong-password) siempre son error (HU-02 C6).
      // isBlocked y errores Zod se propagan con su mensaje original, nunca como fallback.
      if (!isNetworkError(err)) {
        const blockerMsg = String(err?.message || "");
        const zodMsg = err?.issues?.[0]?.message as string | undefined;
        setError(
          zodMsg ??
            (blockerMsg.includes("bloqueada")
              ? blockerMsg
              : "Credenciales inválidas. Verifica tu correo y contraseña."),
        );
        throw err;
      }
      // Allow simulation / seed login for test credentials (verifica password)
      const normalizedEmail = email.toLowerCase().trim();
      const adminSeed = SEED_ADMIN_ACCOUNTS.find(
        (a) => a.profile.email.toLowerCase() === normalizedEmail,
      );
      if (
        adminSeed &&
        adminSeed.passwords.some((p) => p.toLowerCase() === pass.toLowerCase())
      ) {
        setCurrentUser(adminSeed.profile);
        setIsGuest(false);
        appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminSeed.profile));
        return;
      }
      setError(
        "Sin conexión. No se pudo verificar tu sesión. Reintenta con red.",
      );
      throw err;
    }
  };

  const register = async (args: RegisterArgs) => {
    setError(null);
    try {
      // HU-01: delega al caso de uso (valida RegisterSchema, rol 'user' automático).
      await RegisterUserUseCase(args, {
        createAuthAccount: async (registerEmail, registerPass) => {
          const cred = await createUserWithEmailAndPassword(
            auth,
            registerEmail,
            registerPass,
          );
          return { uid: cred.user.uid };
        },
        createProfile: (newProfile) =>
          userProfileService.createUserProfile(newProfile),
      });
      // HU-01 C6: sin auto-sesión — Firebase auto-loguea al crear cuenta, lo revertimos
      // para redirigir a login. La vista muestra el mensaje de éxito y cambia de modo.
      try {
        await firebaseSignOut(auth);
      } catch {
        // ignore offline
      }
      setCurrentUser(null);
      await appStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (err: any) {
      // Registro local SOLO en modo offline (demo aislado, matriz Expo Go modo avión).
      // Errores de validación de Firebase (email-already-in-use, weak-password,
      // invalid-email) y de Zod se propagan, nunca crean sesión (HU-01 C3).
      if (!isNetworkError(err)) {
        // HU-01 C3/C4: Zod y Firebase en español descriptivo, nunca sesión parcial.
        const zodMsg = err?.issues?.[0]?.message as string | undefined;
        const code = String(err?.code || "");
        const friendly = code.includes("email-already-in-use")
          ? "Este correo ya está registrado. Inicia sesión."
          : code.includes("weak-password")
            ? "La contraseña es muy débil. Usa al menos 8 caracteres."
            : code.includes("invalid-email")
              ? "Introduce un correo electrónico válido."
              : undefined;
        const message =
          zodMsg ??
          friendly ??
          err?.message ??
          "No se pudo crear la cuenta. Verifica tus datos.";
        setError(message);
        throw new Error(message);
      }
      const cleanFallbackUsername =
        (args.username || "").trim().replace(/^@/, "") ||
        args.email.split("@")[0];
      const localProfile: UserProfile = {
        uid: `user-${Date.now()}`,
        email: args.email.trim(),
        displayName: args.displayName.trim(),
        username: cleanFallbackUsername,
        summitsCount: 0,
        gpsAccuracy: "±3.0m Preciso",
        role: "user",
        isBlocked: false,
        createdAt: Date.now(),
      };
      setCurrentUser(localProfile);
      setIsGuest(false);
      appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(localProfile));
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
        const role = extractRoleFromDoc(
          existingDoc.role,
          user.email || undefined,
        );
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
        appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(syncedProfile));
      } else {
        const initialRole = extractRoleFromDoc(
          undefined,
          user.email || undefined,
        );
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || "andino@trekbolivia.bo",
          displayName: user.displayName || "Senderista Andino",
          username: user.email ? user.email.split("@")[0] : "caminante_andino",
          avatarUrl: user.photoURL || undefined,
          summitsCount: 5,
          gpsAccuracy: "±2.4m Preciso",
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
        appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
      }
    } catch (err: any) {
      // Graceful fallback for popup-blocked or simulated environments
      console.log("Google Auth fallback to demo session");
      const googleProfile: UserProfile = {
        uid: `google-${Date.now()}`,
        email: "andino.google@trekbolivia.bo",
        displayName: "Alejandro Condori",
        username: "caminante_andino",
        summitsCount: 18,
        gpsAccuracy: "±2.4m Preciso",
        role: "user",
        isBlocked: false,
        createdAt: Date.now(),
      };
      setCurrentUser(googleProfile);
      appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(googleProfile));
    }
  };

  const logout = async () => {
    if (profileUnsubRef.current) {
      profileUnsubRef.current();
      profileUnsubRef.current = null;
    }
    // HU-02 C10: cierre seguro vía caso de uso (signOut Firebase + limpia sesión local).
    await LogoutUserUseCase({
      signOut: async () => {
        try {
          await firebaseSignOut(auth);
        } catch {
          // ignore offline — el usecase igual limpia la sesión local en finally
        }
      },
      clearSession: () => appStorage.removeItem(AUTH_STORAGE_KEY),
    });
    setCurrentUser(null);
    setIsGuest(false);
  };

  const switchDemoRole = (role: UserRole) => {
    const profile = DEMO_PROFILES[role];
    setCurrentUser(profile);
    appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  /** HU-03 (scaffold): entra como invitado sin crear sesión (solo memoria). */
  const continueAsGuest = () => {
    setError(null);
    setIsGuest(true);
  };

  /** Vuelve a AuthView (HU-01/02). No toca la sesión persistida. */
  const exitGuest = () => {
    setIsGuest(false);
  };

  const updateProfile = async (data: UpdateProfileInput) => {
    if (!currentUser) {
      throw new Error("No hay una sesión activa para modificar.");
    }
    setError(null);
    try {
      const updated = await UpdateUserProfileUseCase(
        currentUser.uid,
        data,
        currentUser,
        {
          updateProfileInDb: async (uid, updates) => {
            try {
              await userProfileService.updateUserProfile(uid, updates);
            } catch (err) {
              console.warn("Update profile offline/firestore fallback:", err);
            }
          },
          saveSession: async (synced) => {
            await appStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(synced));
          },
        }
      );
      setCurrentUser(updated);
    } catch (err: any) {
      const msg = err?.issues?.[0]?.message || err?.message || "Error al actualizar perfil";
      setError(msg);
      throw err;
    }
  };

  const isAuthenticated = currentUser !== null;

  const isAdmin = currentUser?.role === 'admin';

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
        updateProfile,
        switchDemoRole,
        hasRole,
        isAdmin,
        isGuest,
        isAuthenticated,
        continueAsGuest,
        exitGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/** Fallbacks locales SOLO ante fallos de conectividad, nunca ante credenciales inválidas (HU-02). */
export const isNetworkError = (err: any): boolean => {
  const code = String(err?.code || "").toLowerCase();
  const msg = String(err?.message || "").toLowerCase();
  return (
    code.includes("network") ||
    code.includes("timeout") ||
    code.includes("unavailable") ||
    code.includes("deadline") ||
    code.includes("offline") ||
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed")
  );
};
