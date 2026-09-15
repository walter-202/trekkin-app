import { z } from "zod";
import type { RouteModel } from "../../domain/types";
import { RouteSchema } from "../../domain/route.schemas";
import {
  SharePayloadSchema,
  type SharePayload,
} from "../../domain/share.schemas";

/**
 * HU-05 C3/C4 — Generar el enlace de una ruta publicada.
 * C3: valida `status == 'published'` (usa el zod de dominio como fuente).
 * C4: el enlace es determinístico y único porque se construye desde el
 * `routeId` (único en Firestore); no se persiste nada ni se duplica la Route.
 */

export interface ShareRoutePorts {
  buildShareUrl: (routeId: string) => string;
}

/** Subconjunto mínimo de la Route necesario para compartir (sin duplicar el modelo). */
const ShareRouteInputSchema = z.object({
  route: z.object({
    id: RouteSchema.shape.id,
    status: RouteSchema.shape.status,
    title: RouteSchema.shape.title,
    region: RouteSchema.shape.region,
    distanceKm: RouteSchema.shape.distanceKm,
    durationMinutes: RouteSchema.shape.durationMinutes,
    difficulty: RouteSchema.shape.difficulty,
  }),
});

const difficultyLabel: Record<RouteModel["difficulty"], string> = {
  facil: "Fácil",
  moderado: "Moderado",
  dificil: "Difícil",
  experto: "Experto",
};

function composeShareMessage(
  route: z.infer<typeof ShareRouteInputSchema>["route"],
): string {
  const hours = Math.round(route.durationMinutes / 60);
  const time =
    hours > 0 ? `~${hours} h` : `${Math.round(route.durationMinutes)} min`;
  return [
    `Ruta en Trekkin App: ${route.title}`,
    route.region ? `(${route.region})` : null,
    `${route.distanceKm.toFixed(1)} km · ${time}`,
    `dificultad ${difficultyLabel[route.difficulty]}`,
  ]
    .filter((part): part is string => part !== null)
    .join(" — ");
}

export async function ShareRouteUseCase(
  args: { route: RouteModel },
  ports: ShareRoutePorts,
): Promise<SharePayload> {
  const { route } = ShareRouteInputSchema.parse(args);

  if (route.status !== "published") {
    throw new Error("La ruta no está publicada y no se puede compartir.");
  }

  const url = ports.buildShareUrl(route.id);
  const message = composeShareMessage(route);

  return SharePayloadSchema.parse({ url, message });
}
