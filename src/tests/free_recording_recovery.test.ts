import assert from "node:assert/strict";
import { BeginTrackingUseCase } from "../core/application/activity/BeginTracking.usecase";
import { StartFreeRecordingUseCase } from "../core/application/activity/StartFreeRecording.usecase";
import { freeRecordingBootAction } from "../presentation/views/record/freeRecordingBoot";
import type { LiveActivity } from "../core/domain/activity";

async function main() {
  const free = await BeginTrackingUseCase(
    StartFreeRecordingUseCase({
      position: { lat: -16.5, lng: -68.1 },
      userId: "owner",
      userName: "Tester",
    }),
  );

  let starts = 0;
  const action = freeRecordingBootAction(free);
  if (action !== "resume") starts += 1;
  assert.equal(action, "resume");
  assert.equal(starts, 0);

  const guided: LiveActivity = { ...free, origin: "route" };
  assert.equal(freeRecordingBootAction(guided), "blocked");
  assert.equal(freeRecordingBootAction(null), "start");
  assert.equal(
    freeRecordingBootAction({ ...free, phase: "finished" }),
    "start",
  );

  console.log(
    "Free recording boot: existing free session resumes without a new start",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
