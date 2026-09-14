import type { RouteModel } from "../../core/domain/types";

/**
 * HU-03 — Seed demo local (Expo Go sin colección `routes` poblada).
 * Solo se usa como fallback ante error de red o catálogo vacío en dev;
 * nunca sustituye a Firestore ni altera HU-01/02.
 */
const now = Date.now();

export const SEED_PUBLISHED_ROUTES: RouteModel[] = [
  {
    id: "ruta-illimani-base",
    title: "Illimani — Campo Base",
    description:
      "Ascenso clásico al campo base del Illimani con vistas a La Paz. Sendero marcado, tramos de acarreo y campamento en Nido de Cóndores.",
    region: "Cordillera Real · La Paz",
    startPoint: { name: "Pinaya", lat: -16.612, lng: -67.82 },
    endPoint: { name: "Nido de Cóndores", lat: -16.635, lng: -67.79 },
    distanceKm: 12.4,
    durationMinutes: 420,
    elevationGainM: 1150,
    difficulty: "dificil",
    modality: "acompañado",
    status: "published",
    isPrivate: false,
    creatorId: "guia-demo",
    creatorName: "Guía Illimani",
    waypoints: [
      { lat: -16.612, lng: -67.82 },
      { lat: -16.62, lng: -67.81 },
      { lat: -16.628, lng: -67.8 },
      { lat: -16.635, lng: -67.79 },
    ],
    checkpoints: [
      {
        id: "cp-agua",
        name: "Vertiente Pinaya",
        category: "agua",
        lat: -16.615,
        lng: -67.815,
        notes: "Último punto de agua segura.",
        createdAt: now,
      },
      {
        id: "cp-vista",
        name: "Mirador Cóndores",
        category: "vista",
        lat: -16.63,
        lng: -67.795,
        notes: "Vista panorámica del glaciar.",
        createdAt: now,
      },
    ],
    photos: [],
    createdAt: now - 86400000 * 9,
    updatedAt: now - 86400000 * 2,
  },
  {
    id: "ruta-huayna-potosi",
    title: "Huayna Potosí — Refugio",
    description:
      "Ruta de aproximación al refugio Casa Blanca. Ideal para aclimatación antes del glaciar.",
    region: "Cordillera Real · El Alto",
    startPoint: { name: "Paso Zongo", lat: -16.25, lng: -68.13 },
    endPoint: { name: "Refugio Casa Blanca", lat: -16.265, lng: -68.145 },
    distanceKm: 6.8,
    durationMinutes: 240,
    elevationGainM: 620,
    difficulty: "moderado",
    modality: "acompañado",
    status: "published",
    isPrivate: false,
    creatorId: "guia-demo",
    creatorName: "Club Andino",
    waypoints: [
      { lat: -16.25, lng: -68.13 },
      { lat: -16.258, lng: -68.138 },
      { lat: -16.265, lng: -68.145 },
    ],
    checkpoints: [
      {
        id: "cp-descanso",
        name: "Descanso Piedra Grande",
        category: "descanso",
        lat: -16.258,
        lng: -68.138,
        createdAt: now,
      },
    ],
    photos: [],
    createdAt: now - 86400000 * 6,
    updatedAt: now - 86400000,
  },
  {
    id: "ruta-valle-luna",
    title: "Valle de la Luna — Circuito",
    description:
      "Circuito familiar entre formaciones de arcilla. Ideal para visitantes y caminatas cortas.",
    region: "La Paz · Mallasa",
    startPoint: { name: "Ingreso Valle", lat: -16.567, lng: -68.09 },
    endPoint: { name: "Mirador Final", lat: -16.572, lng: -68.095 },
    distanceKm: 2.4,
    durationMinutes: 75,
    elevationGainM: 90,
    difficulty: "facil",
    modality: "solo",
    status: "published",
    isPrivate: false,
    creatorId: "guia-demo",
    creatorName: "Comunidad Trekkin",
    waypoints: [
      { lat: -16.567, lng: -68.09 },
      { lat: -16.57, lng: -68.092 },
      { lat: -16.572, lng: -68.095 },
    ],
    checkpoints: [],
    photos: [],
    createdAt: now - 86400000 * 3,
    updatedAt: now,
  },
];
