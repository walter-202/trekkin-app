import type { LiveActivity } from "../../../core/domain/activity";
import {
  isFreeRecording,
  isResumableLive,
} from "../../../core/domain/activity";

export type FreeRecordingBootAction = "resume" | "start" | "blocked";

export function freeRecordingBootAction(
  live: LiveActivity | null,
): FreeRecordingBootAction {
  if (!live || live.phase === "finished") return "start";
  if (!isResumableLive(live)) return "blocked";
  return isFreeRecording(live) ? "resume" : "blocked";
}
