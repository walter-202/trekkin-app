import { RegisterSchema, normalizeUsername } from '../../domain/auth.schemas';
import type { UserProfile } from '../../domain/types';

/**
 * HU-01 — Registrar Cuenta.
 * Caso de uso puro: valida input y orquesta puertos inyectados.
 * No importa Firebase ni AsyncStorage (inversión de dependencias).
 */

export interface RegisterPorts {
  createAuthAccount: (email: string, password: string) => Promise<{ uid: string }>;
  createProfile: (profile: UserProfile) => Promise<void>;
  saveSession: (profile: UserProfile) => Promise<void>;
}

export interface RegisterArgs {
  displayName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export async function RegisterUserUseCase(
  args: RegisterArgs,
  ports: RegisterPorts
): Promise<UserProfile> {
  const parsed = RegisterSchema.parse({
    ...args,
    displayName: args.displayName.trim(),
    email: args.email.trim(),
    username: args.username.trim(),
  });

  const { uid } = await ports.createAuthAccount(parsed.email, parsed.password);

  const profile: UserProfile = {
    uid,
    email: parsed.email,
    displayName: parsed.displayName,
    username: normalizeUsername(parsed.username, parsed.email),
    summitsCount: 0,
    gpsAccuracy: '±2.8m Preciso',
    role: 'user', // HU-01 CA-4: rol básico automático
    isBlocked: false,
    createdAt: Date.now(),
  };

  await ports.createProfile(profile);
  await ports.saveSession(profile);
  return profile;
}
