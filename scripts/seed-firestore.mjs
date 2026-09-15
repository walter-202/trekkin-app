/**
 * Seed SOLO PARA PROBAR (nunca importado por la app ni por servicios).
 * Crea las 4 cuentas admin de HU-01/02 en Firebase Auth + sus docs `users` con rol admin.
 * Uso:  SEED_TEST_PASSWORD="clave-temporal" npm run seed:test
 * Corre con: docker compose run --rm dev npm run seed:test
 * Cuentas de prueba desechables: cámbialas o bórralas al terminar el QA.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import cfg from '../firebase-applet-config.json' with { type: 'json' };

const API = 'https://identitytoolkit.googleapis.com/v1';
const FS = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`;
const PASSWORD = process.env.SEED_TEST_PASSWORD || 'Trekkin2026-Test';

const ADMINS = [
  { email: 'wfernando.aguilarm@gmail.com', displayName: 'Fernando Aguilar', username: 'wfernando', summitsCount: 48, gpsAccuracy: '±1.2m RTK' },
  { email: 'pomajuradoc@gmail.com', displayName: 'Christian Poma Jurado', username: 'pomajurado', summitsCount: 35, gpsAccuracy: '±1.5m Preciso' },
  { email: 'monjequinofabianacareliz@gmail.com', displayName: 'Fabiana Careliz Monje', username: 'monjequino', summitsCount: 29, gpsAccuracy: '±1.8m Preciso' },
  { email: 'Cortestrading@gmail.com', displayName: 'Alejandro Cortés', username: 'cortestrading', summitsCount: 42, gpsAccuracy: '±1.4m Preciso' },
];

async function authToken(email) {
  // Idempotente: si ya existe, entra en vez de crear.
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, PASSWORD);
    return { uid: cred.user.uid, idToken: await cred.user.getIdToken(), created: true };
  } catch (e) {
    if (String(e?.code || '').includes('email-already-in-use')) {
      const cred = await signInWithEmailAndPassword(auth, email, PASSWORD);
      return { uid: cred.user.uid, idToken: await cred.user.getIdToken(), created: false };
    }
    throw e;
  }
}

async function getDoc(token, uid) {
  const r = await fetch(`${FS}/users/${uid}?key=${cfg.apiKey}`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`firestore read ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function patchDoc(token, uid, fields) {
  // REST patch: la máscara va en query (updateMask.fieldPaths); en body se ignora.
  const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const r = await fetch(`${FS}/users/${uid}?key=${cfg.apiKey}&${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`firestore ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

const F = {
  str: (v) => ({ stringValue: v }),
  num: (v) => ({ integerValue: String(v) }),
  bool: (v) => ({ booleanValue: v }),
};

function userFields(uid, admin, role) {
  return {
    uid: F.str(uid), email: F.str(admin.email),
    displayName: F.str(admin.displayName), username: F.str(admin.username),
    summitsCount: F.num(admin.summitsCount), gpsAccuracy: F.str(admin.gpsAccuracy),
    role: F.str(role), isBlocked: F.bool(false),
    createdAt: F.num(Date.now()),
  };
}

(async () => {
  console.log('Seed de prueba HU-01/02: 4 admins (Auth + Firestore). Clave temporal de prueba, NO usar en prod.\n');
  // wfernando primero: su email tiene bypass de admin en firestore.rules y puede promover al resto.
  const sessions = [];
  for (const admin of ADMINS) {
    const s = await authToken(admin.email);
    sessions.push({ admin, ...s });
    console.log(`  ${s.created ? 'creado ' : 'existía'} ${admin.email} uid=${s.uid}`);
  }
  // Fase 1: cada uno crea SU propio doc (las reglas exigen request.auth.uid == userId).
  // Rol 'user' para todos salvo wfernando (su email permite role admin directo).
  for (const s of sessions) {
    const existing = await getDoc(s.idToken, s.uid);
    if (!existing) {
      const role = s.admin.email.toLowerCase() === ADMINS[0].email.toLowerCase() ? 'admin' : 'user';
      await patchDoc(s.idToken, s.uid, userFields(s.uid, s.admin, role));
      console.log(`  doc creado (${role}): ${s.admin.email}`);
    } else {
      console.log(`  doc existía: ${s.admin.email} rol=${existing.fields?.role?.stringValue}`);
    }
  }
  // Fase 2: wfernando (admin) promueve a 'admin' a quien siga en 'user'.
  const owner = sessions[0];
  for (const s of sessions) {
    const current = await getDoc(owner.idToken, s.uid);
    if (current?.fields?.role?.stringValue !== 'admin') {
      await patchDoc(owner.idToken, s.uid, { role: F.str('admin') });
      console.log(`  promovido a admin: ${s.admin.email}`);
    } else {
      console.log(`  ya era admin: ${s.admin.email}`);
    }
  }
  console.log('\nListo. Entra a la app con cualquiera de esos correos y la clave temporal.');
  console.log('Al terminar el QA: cambia claves o borra las cuentas en Firebase Console → Authentication.');
})();
