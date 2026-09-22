import { z } from "zod";
import {
  MAX_ROUTE_PREVIEW_ENCODED_LENGTH,
  MAX_ROUTE_PREVIEW_POINT_COUNT,
  ROUTE_PREVIEW_ENCODING,
  ROUTE_PREVIEW_VERSION,
  decodePolyline6,
  routePreviewBounds,
} from "./routePreview";

export const RoutePreviewBoundsSchema = z
  .object({
    minLng: z.number().finite().min(-180).max(180),
    minLat: z.number().finite().min(-90).max(90),
    maxLng: z.number().finite().min(-180).max(180),
    maxLat: z.number().finite().min(-90).max(90),
  })
  .refine((bounds) => bounds.minLng <= bounds.maxLng, {
    message: "Route preview minLng must not exceed maxLng.",
  })
  .refine((bounds) => bounds.minLat <= bounds.maxLat, {
    message: "Route preview minLat must not exceed maxLat.",
  });

/** Runtime contract for the compact geometry persisted on published route details. */
export const RoutePreviewSchema = z
  .object({
    version: z.literal(ROUTE_PREVIEW_VERSION),
    encoding: z.literal(ROUTE_PREVIEW_ENCODING),
    polyline: z.string().min(1).max(MAX_ROUTE_PREVIEW_ENCODED_LENGTH),
    pointCount: z.number().int().min(2).max(MAX_ROUTE_PREVIEW_POINT_COUNT),
    bbox: RoutePreviewBoundsSchema,
  })
  .strict()
  .superRefine((preview, context) => {
    try {
      const points = decodePolyline6(preview.polyline);
      if (points.length !== preview.pointCount) {
        context.addIssue({
          code: "custom",
          path: ["pointCount"],
          message: "Route preview pointCount does not match the polyline.",
        });
      }

      const bounds = routePreviewBounds(points);
      if (
        bounds.minLng !== preview.bbox.minLng ||
        bounds.minLat !== preview.bbox.minLat ||
        bounds.maxLng !== preview.bbox.maxLng ||
        bounds.maxLat !== preview.bbox.maxLat
      ) {
        context.addIssue({
          code: "custom",
          path: ["bbox"],
          message: "Route preview bbox does not match the polyline geometry.",
        });
      }
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["polyline"],
        message: error instanceof Error ? error.message : "Route preview polyline is invalid.",
      });
    }
  });

export type RoutePreviewValidated = z.infer<typeof RoutePreviewSchema>;
