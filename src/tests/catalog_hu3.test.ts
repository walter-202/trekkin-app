import assert from "node:assert/strict";
import { ListPublishedRoutesUseCase } from "../core/application/explore/ListPublishedRoutes.usecase";
import {
  ListPublishedRoutesPaginatedUseCase,
  mergePublishedRoutePages,
} from "../core/application/explore/ListPublishedRoutesPaginated.usecase";
import { SearchRoutesUseCase } from "../core/application/explore/SearchRoutes.usecase";
import { parseOptionalRoutePreview } from "../core/domain/routeCatalog";
import { buildRoutePreview } from "../core/domain/routePreview";
import type { RouteModel } from "../core/domain/types";

function route(id: string, createdAt: number, title: string): RouteModel {
  return {
    id,
    title,
    description: `Description for ${title}`,
    region: "La Paz",
    startPoint: { name: `Start ${title}`, lat: -16.5, lng: -68.15 },
    endPoint: { name: `End ${title}`, lat: -16.51, lng: -68.14 },
    distanceKm: 5,
    durationMinutes: 120,
    difficulty: "moderado",
    modality: "acompañado",
    status: "published",
    isPrivate: false,
    creatorId: "guide-1",
    creatorName: "Guide",
    waypoints: [],
    checkpoints: [],
    photos: [],
    createdAt,
    updatedAt: createdAt,
  };
}

const oldest = route("oldest", 1, "Valle Antiguo");
const sameDateSecond = route("b-route", 2, "Bosque");
const sameDateFirst = route("a-route", 2, "Amanecer");
const unordered = [oldest, sameDateSecond, sameDateFirst];

async function main(): Promise<void> {
  const sorted = await ListPublishedRoutesUseCase({
    listPublished: async () => unordered,
  });
  assert.deepEqual(sorted.map((item) => item.id), ["a-route", "b-route", "oldest"]);

  const searched = await SearchRoutesUseCase(
    { texto: "start amanecer", dificultad: "moderado" },
    { listPublished: async () => sorted },
  );
  assert.deepEqual(searched.map((item) => item.id), ["a-route"]);

  const receivedCursors: unknown[] = [];
  const firstPage = await ListPublishedRoutesPaginatedUseCase(
    2,
    undefined,
    {
      listPublishedPage: async (pageSize, cursor) => {
        assert.equal(pageSize, 2);
        receivedCursors.push(cursor);
        return {
          routes: [sameDateSecond, sameDateFirst],
          lastVisible: "cursor-page-1",
          hasMore: true,
        };
      },
    },
  );
  assert.deepEqual(firstPage.routes.map((item) => item.id), ["a-route", "b-route"]);
  assert.equal(firstPage.hasMore, true);

  const secondPage = await ListPublishedRoutesPaginatedUseCase(
    2,
    firstPage.lastVisible,
    {
      listPublishedPage: async (_pageSize, cursor) => {
        receivedCursors.push(cursor);
        return { routes: [oldest], lastVisible: "cursor-page-2", hasMore: false };
      },
    },
  );
  assert.deepEqual(receivedCursors, [undefined, "cursor-page-1"]);
  assert.deepEqual(secondPage.routes.map((item) => item.id), ["oldest"]);
  assert.equal(secondPage.hasMore, false);
  assert.deepEqual(
    mergePublishedRoutePages([sameDateFirst, sameDateSecond], [sameDateSecond, oldest]).map(
      (item) => item.id,
    ),
    ["a-route", "b-route", "oldest"],
  );

  assert.equal(parseOptionalRoutePreview(undefined), undefined);
  const preview = buildRoutePreview([
    { lat: -16.5, lng: -68.15 },
    { lat: -16.51, lng: -68.14 },
  ]);
  assert.deepEqual(parseOptionalRoutePreview(preview), preview);
  assert.throws(() => parseOptionalRoutePreview({ ...preview, pointCount: 3 }));

  console.log("HU-03 catalog: stable ordering, loaded-set search, pagination ports and legacy previews passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
