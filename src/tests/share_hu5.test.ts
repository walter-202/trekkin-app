/**
 * Automated Acceptance Test Suite: HU-05 Compartir ruta publicada
 * Clean Architecture — Pure Domain & Application Use Cases (puertos inyectados).
 *
 * Alcance:
 * - C2: botón Compartir (disparador UI) → se valida a nivel de usecase.
 * - C3: validación status == 'published'.
 * - C4: enlace único y determinístico desde routeId.
 * - C7: recuperar la ruta completa desde el enlace (GetRouteDetailUseCase).
 * - C6/C8: copiar enlace y compartir vía share sheet (puertos).
 * - C9: confirmación → resultado 'shared'/éxito del usecase.
 */

import { ShareRouteUseCase } from "../core/application/share/ShareRoute.usecase";
import { CopyShareLinkUseCase } from "../core/application/share/CopyShareLink.usecase";
import { PublishShareLinkUseCase } from "../core/application/share/PublishShareLink.usecase";
import { GetRouteDetailUseCase } from "../core/application/explore/GetRouteDetail.usecase";
import {
  parseShareLink,
  type SharePayload,
} from "../core/domain/share.schemas";
import type { RouteModel } from "../core/domain/types";

interface TestResult {
  id: string;
  hu: "HU-05";
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(
  hu: "HU-05",
  criterion: string,
  passed: boolean,
  detail: string,
) {
  results.push({
    id: `${hu}-${results.length + 1}`,
    hu,
    criterion,
    passed,
    detail,
  });
}

function makePublishedRoute(id = "ruta-illimani-base"): RouteModel {
  return {
    id,
    title: "Illimani — Campo Base",
    description:
      "Ascenso clásico al campo base del Illimani con vistas a La Paz.",
    region: "Cordillera Real · La Paz",
    startPoint: { name: "Pinaya", lat: -16.612, lng: -67.82 },
    endPoint: { name: "Nido de Cóndores", lat: -16.635, lng: -67.79 },
    distanceKm: 12.4,
    durationMinutes: 420,
    difficulty: "dificil",
    modality: "acompañado",
    status: "published",
    isPrivate: false,
    creatorId: "guia-demo",
    creatorName: "Guía Illimani",
    waypoints: [],
    checkpoints: [],
    photos: [],
    createdAt: 1717000000000,
    updatedAt: 1717000000000,
  };
}

const buildShareUrl = (routeId: string) =>
  `exp://192.168.1.10:8081/--/r/${routeId}`;

export async function runShareAcceptanceTests(): Promise<TestResult[]> {
  // =========================================================================
  // C3 + C4 + C7: Ruta publicada genera enlace válido con datos completos
  // =========================================================================
  const publishedRoute = makePublishedRoute();
  const payload = await ShareRouteUseCase(
    { route: publishedRoute },
    { buildShareUrl },
  );

  recordTest(
    "HU-05",
    "C4: Se genera un enlace único y determinístico basado en routeId",
    payload.url.includes("r/ruta-illimani-base") &&
      payload.url.startsWith("exp://"),
    `Enlace: ${payload.url}`,
  );

  recordTest(
    "HU-05",
    "C7: El mensaje conserva los datos completos (nombre, región, distancia, tiempo, dificultad)",
    payload.message.includes("Illimani") &&
      payload.message.includes("Cordillera Real") &&
      payload.message.includes("12.4 km") &&
      payload.message.includes("7 h") &&
      payload.message.includes("Difícil"),
    `Mensaje: ${payload.message}`,
  );

  // C7: el enlace permite identificar la ruta correcta
  const parsed = parseShareLink(payload.url);
  recordTest(
    "HU-05",
    "C7: El enlace permite recuperar el routeId correcto",
    parsed !== null && parsed.routeId === "ruta-illimani-base",
    parsed
      ? `routeId extraído: ${parsed.routeId}`
      : "No se pudo parsear el enlace",
  );

  // C7: recuperar la ruta completa desde el enlace
  if (parsed) {
    const detail = await GetRouteDetailUseCase(parsed.routeId, {
      getById: async (id) => (id === publishedRoute.id ? publishedRoute : null),
    });
    recordTest(
      "HU-05",
      "C7: La ruta completa se recupera desde el enlace (GetRouteDetailUseCase)",
      detail.id === "ruta-illimani-base" &&
        detail.title === "Illimani — Campo Base" &&
        detail.distanceKm === 12.4 &&
        detail.durationMinutes === 420 &&
        detail.difficulty === "dificil" &&
        detail.startPoint.name === "Pinaya",
      `Ruta recuperada: ${detail.title} (${detail.distanceKm} km, ${detail.durationMinutes} min)`,
    );
  }

  // =========================================================================
  // C3: Ruta NO publicada no puede compartirse
  // =========================================================================
  const draftRoute = makePublishedRoute("ruta-draft");
  draftRoute.status = "draft";
  let notPublishedCaught = false;
  let notPublishedMessage = "";
  try {
    await ShareRouteUseCase({ route: draftRoute }, { buildShareUrl });
  } catch (err: any) {
    notPublishedCaught = (err?.message as string).includes("no está publicada");
    notPublishedMessage = err?.message ?? "";
  }
  recordTest(
    "HU-05",
    "C3: Ruta no publicada (draft) no puede compartirse",
    notPublishedCaught,
    notPublishedMessage,
  );

  const rejectedRoute = makePublishedRoute("ruta-rechazada");
  rejectedRoute.status = "rejected";
  let rejectedCaught = false;
  try {
    await ShareRouteUseCase({ route: rejectedRoute }, { buildShareUrl });
  } catch (err: any) {
    rejectedCaught = (err?.message as string).includes("no está publicada");
  }
  recordTest(
    "HU-05",
    "C3: Ruta rechazada no puede compartirse",
    rejectedCaught,
    rejectedCaught
      ? "La ruta rechazada fue bloqueada por el dominio"
      : "Falló: ruta rechazada pudo compartirse",
  );

  // =========================================================================
  // C4: Unicidad — cada ruta → enlace distinto que se resuelve a su id
  // =========================================================================
  const routeB = makePublishedRoute("ruta-huayna-potosi");
  const payloadB = await ShareRouteUseCase(
    { route: routeB },
    { buildShareUrl },
  );
  const parsedA = parseShareLink(payload.url);
  const parsedB = parseShareLink(payloadB.url);
  recordTest(
    "HU-05",
    "C4: Enlaces únicos por ruta (distintos routeIds → distintas URLs)",
    payloadB.url !== payload.url &&
      parsedA?.routeId === "ruta-illimani-base" &&
      parsedB?.routeId === "ruta-huayna-potosi",
    `A=${payload.url} | B=${payloadB.url}`,
  );

  // parseShareLink rechaza enlaces sin patrón r/{routeId}
  recordTest(
    "HU-05",
    "C4: El parseador rechaza enlaces sin ruta válida",
    parseShareLink("https://example.com/home") === null &&
      parseShareLink("exp://x/--/foo/bar") === null,
    "Enlaces inválidos devuelven null",
  );

  // =========================================================================
  // C6: Copiar enlace
  // =========================================================================
  let copiedText = "";
  await CopyShareLinkUseCase(payload, {
    copyToClipboard: async (text) => {
      copiedText = text;
    },
  });
  recordTest(
    "HU-05",
    "C6: Copiar enlace delega el texto correcto al portapapeles",
    copiedText === payload.url,
    copiedText,
  );

  // =========================================================================
  // C8 + C9: Compartir vía share sheet (medio seleccionado) y confirmación
  // =========================================================================
  let sharedPayload: SharePayload | null = null;
  const getShared = () => sharedPayload;
  const sheetResult = await PublishShareLinkUseCase(payload, {
    openShareSheet: async (p) => {
      sharedPayload = p;
      return "shared" as const;
    },
  });
  const sent = getShared();
  recordTest(
    "HU-05",
    "C8: Compartir envía mensaje+enlace al medio del dispositivo",
    sent !== null &&
      sent.message.includes("Illimani") &&
      sent.url === payload.url,
    sent
      ? `Payload enviado: ${sent.message} — ${sent.url}`
      : "No se envió payload",
  );
  recordTest(
    "HU-05",
    'C9: Confirmación de envío exitoso (resultado "shared")',
    sheetResult === "shared",
    `Resultado del share sheet: ${sheetResult}`,
  );

  return results;
}

// Ejecución directa: `tsx src/tests/share_hu5.test.ts`
if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("share_hu5"))
) {
  console.log("\n============================================================");
  console.log("       TREKKIN APP — SUITE DE ACEPTACIÓN HU-05 (COMPARTIR)   ");
  console.log("============================================================\n");

  runShareAcceptanceTests()
    .then((allResults) => {
      let failedCount = 0;
      allResults.forEach((r) => {
        const statusIcon = r.passed ? "✓ PASS" : "✗ FAIL";
        console.log(`[${statusIcon}] [${r.hu}] ${r.criterion}`);
        console.log(`        Detalle: ${r.detail}\n`);
        if (!r.passed) failedCount++;
      });

      console.log(
        "------------------------------------------------------------",
      );
      console.log(
        `Total Pruebas: ${allResults.length} | Aprobadas: ${allResults.length - failedCount} | Fallidas: ${failedCount}`,
      );
      console.log(
        "------------------------------------------------------------\n",
      );

      if (failedCount > 0) {
        process.exit(1);
      } else {
        console.log(
          "🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN HU-05 PASARON AL 100%.\n",
        );
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Error fatal al ejecutar pruebas:", err);
      process.exit(1);
    });
}
