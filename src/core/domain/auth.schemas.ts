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
      .min(3, 'El usuario debe tener al menos 3 caracteres')
      .max(80, 'El usuario es demasiado largo')
      .regex(
        /^[a-zA-Z0-9_.]+$/,
        'El usuario solo puede contener letras, números, punto y guion bajo'
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
