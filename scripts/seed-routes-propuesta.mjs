/**
 * Seed PROPUESTA de rutas HU-03 — SOLO PARA POBLAR DATOS DE PRUEBA.
 * Nunca importado por la app ni por servicios. Datos base del proyecto hermano,
 * adaptados a RouteModel + firestore.rules de trekkin-app.
 * Los devs de HU-03 refinan campos libremente: el script NUNCA sobrescribe docs existentes.
 *
 * Reglas que respeta: create exige status draft/in_review + creatorId == auth.uid;
 * la publicación la hace el mismo admin en segunda escritura.
 * Requiere: seed de admins previo (npm run seed:test) + SEED_TEST_PASSWORD.
 * Uso: docker compose run --rm dev npm run seed:routes
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import cfg from '../firebase-applet-config.json' with { type: 'json' };

const FS = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`;
const OWNER_EMAIL = 'wfernando.aguilarm@gmail.com';
const PASSWORD = process.env.SEED_TEST_PASSWORD || 'Trekkin2026-Test';

// --- Datos propuesta (los devs HU-03 refinan: campos, fotos, waypoints) ---
const ROUTES = [
  {
    id: 'route-takesi',
    title: 'Ruta del Takesi (Camino del Inca)',
    description: 'Travesía prehispánica pavimentada que une el altiplano andino a más de 4,600 msnm con los valles cálidos de los Yungas. Sendero empedrado incaico bien conservado con cascadas y flora tropical.',
    region: 'Mururata / Yungas, La Paz',
    startPoint: { name: 'Mina San Francisco (Ventilla)', lat: -16.5385, lng: -67.8924 },
    endPoint: { name: 'Yanacachi (Yungas)', lat: -16.3982, lng: -67.7421 },
    distanceKm: 42.5, durationMinutes: 1080, difficulty: 'moderado', modality: 'acompañado',
    waypoints: [
      { lat: -16.5385, lng: -67.8924, altitude: 4300 }, { lat: -16.5298, lng: -67.8812, altitude: 4650 },
      { lat: -16.5122, lng: -67.8643, altitude: 4100 }, { lat: -16.4854, lng: -67.8398, altitude: 3450 },
      { lat: -16.4521, lng: -67.8105, altitude: 2800 }, { lat: -16.4219, lng: -67.7784, altitude: 2200 },
      { lat: -16.3982, lng: -67.7421, altitude: 1850 },
    ],
    checkpoints: [
      { id: 'cp-takesi-1', name: 'Paso Cumbre Takesi (Abra)', category: 'vista', lat: -16.5298, lng: -67.8812, notes: 'Punto más alto (4,650 msnm). Viento gélido continuo y vista del glaciar Mururata.', createdAt: 1720000000000 },
      { id: 'cp-takesi-2', name: 'Campamento Comunidad Takesi', category: 'camping', lat: -16.4854, lng: -67.8398, notes: 'Zona de acampe segura con fuente de agua limpia proveniente de deshielo andino.', createdAt: 1720000000000 },
      { id: 'cp-takesi-3', name: 'Puente Colgante Río Kakapi', category: 'agua', lat: -16.4521, lng: -67.8105, notes: 'Punto de recarga de agua (filtrar recomendablemente). Entrada a la selva alta.', createdAt: 1720000000000 },
    ],
    photos: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'],
  },
  {
    id: 'route-choro',
    title: 'Ruta del Choro (La Cumbre - Coroico)',
    description: 'El trekking andino más famoso de Bolivia. Desciende desde los 4,850 msnm en La Cumbre hasta los 1,200 msnm en Coroico. Pavimento inca escalonado, selva húmeda de montaña y puentes rústicos.',
    region: 'Cordillera Real a Nor Yungas',
    startPoint: { name: 'La Cumbre (Carretera La Paz - Coroico)', lat: -16.3352, lng: -68.0418 },
    endPoint: { name: 'Chairo (Inicio a Coroico)', lat: -16.2084, lng: -67.7029 },
    distanceKm: 58.0, durationMinutes: 1800, difficulty: 'experto', modality: 'acompañado',
    waypoints: [
      { lat: -16.3352, lng: -68.0418, altitude: 4850 }, { lat: -16.3015, lng: -68.0125, altitude: 3900 },
      { lat: -16.2741, lng: -67.9542, altitude: 3100 }, { lat: -16.2512, lng: -67.8943, altitude: 2350 },
      { lat: -16.2305, lng: -67.8124, altitude: 1750 }, { lat: -16.2084, lng: -67.7029, altitude: 1250 },
    ],
    checkpoints: [
      { id: 'cp-choro-1', name: 'Abra Apacheta La Cumbre', category: 'vista', lat: -16.3352, lng: -68.0418, notes: 'Punto de partida a 4,850 msnm. Ropa térmica obligatoria antes de iniciar descenso.', createdAt: 1720100000000 },
      { id: 'cp-choro-2', name: 'Campamento Challapampa', category: 'camping', lat: -16.2741, lng: -67.9542, notes: 'Refugio de acampe junto al río. Cuota local comunitaria de acampe.', createdAt: 1720100000000 },
      { id: 'cp-choro-3', name: 'Paso Colgante Río Coscapa', category: 'peligro', lat: -16.2512, lng: -67.8943, notes: 'Precaución durante temporada de lluvias (diciembre a marzo). Cruce con cables.', createdAt: 1720100000000 },
    ],
    photos: ['https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80'],
  },
  {
    id: 'route-valle-animas',
    title: 'Cañón y Cresta del Valle de las Ánimas',
    description: 'Paseo geológico por agujas de arcilla gigantes esculpidas por la erosión en la cuenca sur de La Paz, con vista panorámica inigualable al nevado Illimani.',
    region: 'Zona Sur, La Paz',
    startPoint: { name: 'Entrada Apaña / Ovejuyo', lat: -16.5412, lng: -68.0345 },
    endPoint: { name: 'Mirador de los Órganos', lat: -16.5598, lng: -68.0121 },
    distanceKm: 7.2, durationMinutes: 160, difficulty: 'facil', modality: 'solo',
    waypoints: [
      { lat: -16.5412, lng: -68.0345, altitude: 3750 }, { lat: -16.5492, lng: -68.0261, altitude: 3880 },
      { lat: -16.5551, lng: -68.0195, altitude: 3950 }, { lat: -16.5598, lng: -68.0121, altitude: 4020 },
    ],
    checkpoints: [
      { id: 'cp-animas-1', name: 'Mirador Illimani Majestic', category: 'vista', lat: -16.5551, lng: -68.0195, notes: 'Punto ideal para fotografía al atardecer cuando el sol alumbra el Illimani.', createdAt: 1720200000000 },
    ],
    photos: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'],
  },
  {
    id: 'route-condoriri',
    title: 'Laguna Chiar Khota & Glaciares del Condoriri',
    description: 'Circuito andino de alta montaña por el macizo del Condoriri (Cordillera Real). Lagunas glaciares esmeralda, rebaños de llamas y aproximación al Ala Izquierda y Cabeza del Cóndor.',
    region: 'Cordillera Real, Tuni Condoriri',
    startPoint: { name: 'Represa Tuni', lat: -16.2112, lng: -68.2541 },
    endPoint: { name: 'Campamento Base Chiar Khota', lat: -16.1834, lng: -68.2432 },
    distanceKm: 14.8, durationMinutes: 340, difficulty: 'moderado', modality: 'solo',
    waypoints: [
      { lat: -16.2112, lng: -68.2541, altitude: 4400 }, { lat: -16.1998, lng: -68.2492, altitude: 4520 },
      { lat: -16.1895, lng: -68.2458, altitude: 4600 }, { lat: -16.1834, lng: -68.2432, altitude: 4700 },
    ],
    checkpoints: [
      { id: 'cp-condor-1', name: 'Laguna Tuni Desagüe', category: 'agua', lat: -16.2112, lng: -68.2541, notes: 'Inicio del sendero bordeando la represa.', createdAt: 1720300000000 },
      { id: 'cp-condor-2', name: 'Refugio Andino Base Chiar Khota', category: 'refugio', lat: -16.1834, lng: -68.2432, notes: 'Base para ascensiones al Pequeño Alpamayo y Condoriri.', createdAt: 1720300000000 },
    ],
    photos: ['https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80'],
  },
];

// --- Codificador Firestore REST ---
const enc = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc).filter(Boolean) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)]).filter(([, x]) => x)) } };
};
const mask = (fields) => Object.keys(fields).map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
async function req(token, method, path, fields) {
  const url = `${FS}/${path}?key=${cfg.apiKey}` + (fields ? `&${mask(fields)}` : '');
  const r = await fetch(url, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(fields ? { body: JSON.stringify({ fields }) } : {}),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

(async () => {
  console.log('Seed PROPUESTA de rutas HU-03 (no sobrescribe existentes).\n');
  const app = initializeApp(cfg);
  const cred = await signInWithEmailAndPassword(getAuth(app), OWNER_EMAIL, PASSWORD).catch(() => null);
  if (!cred) throw new Error(`Sin sesión admin (${OWNER_EMAIL}). Corre primero: npm run seed:test`);
  const token = await cred.user.getIdToken();
  const uid = cred.user.uid;
  const now = Date.now();

  for (const route of ROUTES) {
    const existing = await req(token, 'GET', `routes/${route.id}`);
    if (existing) { console.log(`  existe, se respeta: ${route.id}`); continue; }
    // Fase 1: crear como borrador (único status permitido al crear por reglas).
    await req(token, 'PATCH', `routes/${route.id}`, {
      ...enc({ ...route, status: 'draft', isPrivate: false, creatorId: uid, creatorName: 'Fernando Aguilar', createdAt: now, updatedAt: now }).mapValue.fields,
    });
    // Fase 2: publicar como admin (propuesta visible para guest en HU-03).
    await req(token, 'PATCH', `routes/${route.id}`, {
      status: { stringValue: 'published' }, reviewedBy: { stringValue: uid }, reviewedAt: { integerValue: String(now) },
      moderationNotes: { stringValue: 'Seed propuesta inicial (pendiente refinamiento HU-03).' },
    });
    console.log(`  publicada (propuesta): ${route.id} — ${route.title}`);
  }
  console.log('\nListo. Guest verá el catálogo cuando HU-03 lo lea (status published, públicas).');
})();
