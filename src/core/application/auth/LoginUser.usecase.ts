import { LoginSchema } from '../../domain/auth.schemas';
import type { UserProfile } from '../../domain/types';

/**
 * HU-02 — Iniciar Sesión.
 * Valida credenciales y sincroniza el perfil (RBAC) desde persistencia.
 */

export interface LoginPorts {
  signIn: (email: string, password: string) => Promise<{ uid: string; email: string }>;
  getProfile: (uid: string) => Promise<UserProfile | null>;
  createProfile: (profile: UserProfile) => Promise<void>;
  saveSession: (profile: UserProfile) => Promise<void>;
}

export async function LoginUserUseCase(
  args: { email: string; password: string },
  ports: LoginPorts
): Promise<UserProfile> {
  const parsed = LoginSchema.parse({ email: args.email.trim(), password: args.password });

  const account = await ports.signIn(parsed.email, parsed.password);

  const existing = await ports.getProfile(account.uid);
  if (existing) {
    if (existing.isBlocked) {
      throw new Error('Tu cuenta está bloqueada. Contacta al administrador.');
    }
    await ports.saveSession(existing);
    return existing;
  }

  const fresh: UserProfile = {
    uid: account.uid,
    email: account.email,
    displayName: account.email.split('@')[0] ?? 'Senderista',
    username: account.email.split('@')[0] ?? 'senderista',
    summitsCount: 0,
    gpsAccuracy: '±2.4m Preciso',
    role: 'user',
    isBlocked: false,
    createdAt: Date.now(),
  };
  await ports.createProfile(fresh);
  await ports.saveSession(fresh);
  return fresh;
}
