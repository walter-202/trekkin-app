import { CreateRouteDetailCacheRepository } from "../../core/application/explore/RouteDetailCacheRepository";
import { appStorage } from "./storage";

export const routeDetailCache = CreateRouteDetailCacheRepository(appStorage);
