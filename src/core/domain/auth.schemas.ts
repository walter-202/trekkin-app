import { z } from 'zod';

/**
 * Clean Architecture — Dominio Auth (HU-01 / HU-02).
 * TypeScript + Zod puros. Sin imports de Firebase, React ni AsyncStorage.
 * Estas reglas son la única fuente de verdad para registro y login.
 */

export const RegisterSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(3, 'El nombre completo debe tener al menos 3 caracteres')
      .max(150, 'El nombre es demasiado largo'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Introduce un correo electrónico válido')
      .max(200),
    username: z
      .string()
      .trim()
      // HU-01 C2: el ejemplo de diseño muestra `@caminante_bolivia`; se acepta y normaliza.
      .transform((v) => v.replace(/^@/, ''))
      .pipe(
        z
          .string()
          .min(3, 'El usuario debe tener al menos 3 caracteres')
          .max(80, 'El usuario es demasiado largo')
          .regex(
            /^[a-zA-Z0-9_.]+$/,
            'El usuario solo puede contener letras, números, punto y guion bajo'
          )
      ),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, 'Debes aceptar los términos y las normas de seguridad en montaña'),
  })
  .refine((v) => v.password === v.confirmPassword, 'Las contraseñas no coinciden');

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Introduce un correo electrónico válido'),
  password: z.string().min(1, 'Introduce tu contraseña'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/** Normaliza un username: quita @ inicial y espacios. */
export function normalizeUsername(raw: string, fallbackEmail: string): string {
  const base = (raw || '').trim().replace(/^@/, '');
  if (base) return base;
  return fallbackEmail.split('@')[0] ?? 'senderista';
}

/**
 * HU-02 C11 — Validación para modificación de datos de perfil.
 * Excluye email (inmutable) y teléfono (no recolectado/persistido).
 */
export const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(3, 'El nombre completo debe tener al menos 3 caracteres')
    .max(150, 'El nombre es demasiado largo'),
  username: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ''))
    .pipe(
      z
        .string()
        .min(3, 'El usuario debe tener al menos 3 caracteres')
        .max(80, 'El usuario es demasiado largo')
        .regex(
          /^[a-zA-Z0-9_.]+$/,
          'El usuario solo puede contener letras, números, punto y guion bajo'
        )
    ),
  bio: z.string().trim().max(120, 'La descripción es demasiado larga').optional(),
  bloodType: z.string().trim().max(30, 'El grupo sanguíneo es demasiado largo').optional(),
  emergencyContact: z.string().trim().max(120, 'El contacto es demasiado largo').optional(),
  themePreference: z.enum(['dark', 'light', 'high_contrast']).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

