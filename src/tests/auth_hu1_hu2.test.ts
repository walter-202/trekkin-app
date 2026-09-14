/**
 * Automated Acceptance Test Suite: HU-01 & HU-02
 * Clean Architecture - Pure Domain & Application Use Cases + Persistence Verification
 *
 * Scope:
 * - HU-01: Registrar Cuenta (C1 to C6)
 * - HU-02: Iniciar y Cerrar Sesión (C1 to C10)
 */

import { RegisterSchema, LoginSchema, normalizeUsername } from '../core/domain/auth.schemas';
import { RegisterUserUseCase, RegisterPorts, RegisterArgs } from '../core/application/auth/RegisterUser.usecase';
import { LoginUserUseCase, LoginPorts } from '../core/application/auth/LoginUser.usecase';
import { LogoutUserUseCase, LogoutPorts } from '../core/application/auth/LogoutUser.usecase';
import { UserProfile } from '../core/domain/types';
import { isNetworkError, AUTH_STORAGE_KEY } from '../infrastructure/auth/AuthContext';
import { testFirestoreConnection } from '../infrastructure/firebase/config';

interface TestResult {
  id: string;
  hu: 'HU-01' | 'HU-02' | 'INFRA';
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(hu: 'HU-01' | 'HU-02' | 'INFRA', criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `${hu}-${results.length + 1}`,
    hu,
    criterion,
    passed,
    detail,
  });
}

export async function runAuthAcceptanceTests(): Promise<TestResult[]> {
  // =========================================================================
  // HU-01: REGISTRAR CUENTA
  // =========================================================================

  // HU-01 C2 & C3: RegisterSchema accepts valid 6-field inputs
  const validRegistration: RegisterArgs = {
    displayName: 'Mateo Condori',
    email: 'mateo.condori@trekkinapp.bo',
    username: 'mateo_andes',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    acceptTerms: true,
  };

  const parsedValid = RegisterSchema.safeParse(validRegistration);
  recordTest(
    'HU-01',
    'C2/C3: Validación de campos obligatorios con Zod (Nombre, Email, Usuario, Password, Confirmación, Términos)',
    parsedValid.success,
    parsedValid.success ? 'Schema validó exitosamente todos los campos requeridos' : JSON.stringify(parsedValid)
  );

  // HU-01 C3: Rejects passwords shorter than 8 characters
  const shortPass = RegisterSchema.safeParse({ ...validRegistration, password: '123', confirmPassword: '123' });
  recordTest(
    'HU-01',
    'C3: Rechazo de contraseñas menores a 8 caracteres',
    !shortPass.success && shortPass.error.issues[0]?.message.includes('8 caracteres'),
    !shortPass.success ? shortPass.error.issues[0]?.message : 'Falló: se aceptó contraseña corta'
  );

  // HU-01 C3: Rejects mismatched passwords
  const mismatched = RegisterSchema.safeParse({ ...validRegistration, confirmPassword: 'DifferentPassword123!' });
  recordTest(
    'HU-01',
    'C3: Rechazo de confirmación de contraseña dispar',
    !mismatched.success && mismatched.error.issues[0]?.message.includes('no coinciden'),
    !mismatched.success ? mismatched.error.issues[0]?.message : 'Falló: se aceptaron contraseñas distintas'
  );

  // HU-01 C3: Rejects invalid email
  const badEmail = RegisterSchema.safeParse({ ...validRegistration, email: 'not-an-email' });
  recordTest(
    'HU-01',
    'C3: Rechazo de correo con formato inválido',
    !badEmail.success && badEmail.error.issues[0]?.message.includes('válido'),
    !badEmail.success ? badEmail.error.issues[0]?.message : 'Falló: se aceptó correo inválido'
  );

  // HU-01 C3: Rejects terms not accepted
  const unacceptedTerms = RegisterSchema.safeParse({ ...validRegistration, acceptTerms: false });
  recordTest(
    'HU-01',
    'C3: Exigencia de aceptación de normas de seguridad en montaña',
    !unacceptedTerms.success && unacceptedTerms.error.issues[0]?.message.includes('seguridad'),
    !unacceptedTerms.success ? unacceptedTerms.error.issues[0]?.message : 'Falló: se permitió registrar sin aceptar términos'
  );

  // HU-01: Username normalization helper
  const normalized = normalizeUsername('@mi_usuario', 'correo@test.bo');
  recordTest(
    'HU-01',
    'C2: Normalización de nombre de usuario (remueve @ inicial)',
    normalized === 'mi_usuario',
    `Normalizado: ${normalized}`
  );

  // HU-01 C4 & C6: RegisterUserUseCase assigns 'user' role automatically and does not auto-login
  let createdProfileInDB: UserProfile | null = null;
  const mockRegisterPorts: RegisterPorts = {
    createAuthAccount: async (email) => ({ uid: `mock-uid-${Date.now()}` }),
    createProfile: async (profile) => {
      createdProfileInDB = profile;
    },
  };

  const createdUser = await RegisterUserUseCase(validRegistration, mockRegisterPorts);
  recordTest(
    'HU-01',
    'C4: Asignación automática de rol básico "user"',
    createdUser.role === 'user' && (createdProfileInDB as UserProfile | null)?.role === 'user',
    `Rol asignado en dominio y persistencia: ${createdUser.role}`
  );

  recordTest(
    'HU-01',
    'C4: Inicialización de métricas y estado no bloqueado (summitsCount: 0, isBlocked: false)',
    createdUser.summitsCount === 0 && createdUser.isBlocked === false,
    `summits: ${createdUser.summitsCount}, isBlocked: ${createdUser.isBlocked}`
  );

  // HU-01: Rejection on duplicate email
  const duplicatePorts: RegisterPorts = {
    createAuthAccount: async () => {
      const err: any = new Error('The email address is already in use by another account.');
      err.code = 'auth/email-already-in-use';
      throw err;
    },
    createProfile: async () => {},
  };

  let duplicateCaught = false;
  try {
    await RegisterUserUseCase(validRegistration, duplicatePorts);
  } catch (err: any) {
    duplicateCaught = err?.code === 'auth/email-already-in-use';
  }
  recordTest(
    'HU-01',
    'C3: Detección y bloqueo de registro duplicado (email-already-in-use)',
    duplicateCaught,
    duplicateCaught ? 'Error auth/email-already-in-use propagado fielmente' : 'No se bloqueó duplicado'
  );

  // =========================================================================
  // HU-02: INICIAR Y CERRAR SESIÓN
  // =========================================================================

  // HU-02 C4: LoginSchema validation
  const validLogin = { email: 'mateo.condori@trekkinapp.bo', password: 'Password123!' };
  const loginValidation = LoginSchema.safeParse(validLogin);
  recordTest(
    'HU-02',
    'C4: Validación Zod de credenciales de acceso',
    loginValidation.success,
    loginValidation.success ? 'LoginSchema validó correo y contraseña' : 'Error en schema'
  );

  // HU-02 C5 & C7: LoginUserUseCase logs in, synchronizes role, and saves session
  let savedSession: UserProfile | null = null;
  const mockLoginPorts: LoginPorts = {
    signIn: async (email) => ({ uid: 'user-123', email }),
    getProfile: async (uid) => ({
      uid,
      email: 'mateo.condori@trekkinapp.bo',
      displayName: 'Mateo Condori',
      username: 'mateo_andes',
      summitsCount: 5,
      gpsAccuracy: '±2.4m',
      role: 'user',
      isBlocked: false,
      createdAt: 1717000000000,
    }),
    createProfile: async () => {},
    saveSession: async (p) => {
      savedSession = p;
    },
  };

  const loggedUser = await LoginUserUseCase(validLogin, mockLoginPorts);
  recordTest(
    'HU-02',
    'C5/C7: Inicio de sesión válido y guardado de sesión persistente',
    loggedUser.uid === 'user-123' && (savedSession as UserProfile | null)?.uid === 'user-123',
    `Sesión persistida para UID: ${(savedSession as UserProfile | null)?.uid}`
  );

  // HU-02 C6: Account blocked rejection
  const blockedLoginPorts: LoginPorts = {
    signIn: async (email) => ({ uid: 'blocked-uid', email }),
    getProfile: async (uid) => ({
      uid,
      email: 'blocked@trekkinapp.bo',
      displayName: 'Usuario Bloqueado',
      role: 'user',
      isBlocked: true,
      createdAt: 1717000000000,
    }),
    createProfile: async () => {},
    saveSession: async () => {},
  };

  let blockedCaught = false;
  try {
    await LoginUserUseCase(validLogin, blockedLoginPorts);
  } catch (err: any) {
    blockedCaught = err.message.includes('bloqueada');
  }
  recordTest(
    'HU-02',
    'C6: Rechazo y bloqueo inmediato de inicio de sesión para cuentas suspendidas (isBlocked)',
    blockedCaught,
    blockedCaught ? 'Excepción de cuenta bloqueada lanzada correctamente' : 'Falló: cuenta bloqueada pudo acceder'
  );

  // HU-02 C10: LogoutUserUseCase clears Firebase and session
  let signOutCalled = false;
  let sessionCleared = false;
  const mockLogoutPorts: LogoutPorts = {
    signOut: async () => {
      signOutCalled = true;
    },
    clearSession: async () => {
      sessionCleared = true;
    },
  };

  await LogoutUserUseCase(mockLogoutPorts);
  recordTest(
    'HU-02',
    'C10: Cierre seguro de sesión (signOut + eliminación de sesión local)',
    signOutCalled && sessionCleared,
    `signOut: ${signOutCalled}, clearSession: ${sessionCleared}`
  );

  // HU-02 C7: Storage key verification
  recordTest(
    'HU-02',
    'C7: Clave canónica de almacenamiento sin referencia al proyecto anterior',
    AUTH_STORAGE_KEY === 'trekkin_auth_user',
    `Clave activa: ${AUTH_STORAGE_KEY}`
  );

  // Error classifier test (Network vs Bad Credentials)
  const isNetwork = isNetworkError({ code: 'auth/network-request-failed' });
  const isCredential = isNetworkError({ code: 'auth/invalid-credential' });
  recordTest(
    'HU-02',
    'C6: Clasificador de errores (diferencia sin red vs credenciales incorrectas)',
    isNetwork === true && isCredential === false,
    `network-request-failed -> ${isNetwork}, invalid-credential -> ${isCredential}`
  );

  // =========================================================================
  // INFRA: FIRESTORE CONNECTIVITY
  // =========================================================================
  const firestoreLive = await testFirestoreConnection();
  recordTest(
    'INFRA',
    'Conectividad con Google Cloud Firestore (ai-studio-trekkingbolivia database)',
    firestoreLive,
    firestoreLive ? 'Servidor Firestore accesible y evaluando reglas de seguridad' : 'No se pudo conectar a Firestore'
  );

  return results;
}

// If executed directly via `npx tsx src/tests/auth_hu1_hu2.test.ts`
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.some((arg) => arg.includes('auth_hu1_hu2'))) {
  console.log('\n============================================================');
  console.log('       TREKKIN APP — SUITE DE ACEPTACIÓN HU-01 & HU-02      ');
  console.log('============================================================\n');

  runAuthAcceptanceTests().then((allResults) => {
    let failedCount = 0;
    allResults.forEach((r) => {
      const statusIcon = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`[${statusIcon}] [${r.hu}] ${r.criterion}`);
      console.log(`        Detalle: ${r.detail}\n`);
      if (!r.passed) failedCount++;
    });

    console.log('------------------------------------------------------------');
    console.log(`Total Pruebas: ${allResults.length} | Aprobadas: ${allResults.length - failedCount} | Fallidas: ${failedCount}`);
    console.log('------------------------------------------------------------\n');

    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN HU-01 Y HU-02 PASARON AL 100%.\n');
      process.exit(0);
    }
  }).catch((err) => {
    console.error('Error fatal al ejecutar pruebas:', err);
    process.exit(1);
  });
}
