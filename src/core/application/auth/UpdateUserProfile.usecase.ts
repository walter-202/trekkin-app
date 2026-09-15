import { UpdateProfileSchema, normalizeUsername, type UpdateProfileInput } from '../../domain/auth.schemas';
import type { UserProfile } from '../../domain/types';

/**
 * HU-02 C11 — Modificación de Perfil de Usuario.
 * Caso de uso puro: valida con Zod, preserva invariantes estrictos
 * (email inmutable, sin celular, rol protegido) y orquesta puertos inyectados.
 */

export interface UpdateProfilePorts {
  updateProfileInDb: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  saveSession?: (profile: UserProfile) => Promise<void>;
}

export async function UpdateUserProfileUseCase(
  uid: string,
  args: unknown,
  currentProfile: UserProfile,
  ports: UpdateProfilePorts
): Promise<UserProfile> {
  if (!uid || uid !== currentProfile.uid) {
    throw new Error('No se puede actualizar el perfil de otro usuario.');
  }

  if (currentProfile.isBlocked) {
    throw new Error('Tu cuenta se encuentra suspendida. No puedes modificar tus datos.');
  }

  const parsed = UpdateProfileSchema.parse(args);
  const cleanUsername = normalizeUsername(parsed.username, currentProfile.email);

  const updatedProfile: UserProfile = {
    ...currentProfile,
    displayName: parsed.displayName,
    username: cleanUsername,
    bio: parsed.bio !== undefined ? parsed.bio : currentProfile.bio,
    bloodType: parsed.bloodType !== undefined ? parsed.bloodType : currentProfile.bloodType,
    emergencyContact: parsed.emergencyContact !== undefined ? parsed.emergencyContact : currentProfile.emergencyContact,
    themePreference: parsed.themePreference !== undefined ? parsed.themePreference : currentProfile.themePreference,
    // Invariantes estrictos garantizados por el dominio (inmutables en este flujo):
    uid: currentProfile.uid,
    email: currentProfile.email,
    role: currentProfile.role,
    isBlocked: currentProfile.isBlocked,
    createdAt: currentProfile.createdAt,
  };

  await ports.updateProfileInDb(uid, {
    displayName: updatedProfile.displayName,
    username: updatedProfile.username,
    bio: updatedProfile.bio,
    bloodType: updatedProfile.bloodType,
    emergencyContact: updatedProfile.emergencyContact,
    themePreference: updatedProfile.themePreference,
  });

  if (ports.saveSession) {
    await ports.saveSession(updatedProfile);
  }

  return updatedProfile;
}
