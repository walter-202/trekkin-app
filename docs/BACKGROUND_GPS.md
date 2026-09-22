# Background GPS capture

Trekkin registers `trekkin-background-location` with Expo TaskManager at bundle
load. `expo-location` delivers batched `LocationObject` values to the
top-level task; the task restores the live activity from AsyncStorage/SQLite
before forwarding points through the same serialized `recordPoint` queue used
by the foreground watch. Points are never written as Firestore chunks.

Starting a recording starts the foreground watch and the background task when
background permission is available. Pausing, finishing, clearing, or replacing
the watch stops both producers. Background start/stop is idempotent so a screen
remount cannot create duplicate writers.

## Build and device limits

Background location requires a development build or production build on a
physical device. Expo Go does not provide Android background execution and is
limited on iOS (the iOS simulator can exercise the API, but it is not device
evidence). iOS and Android may suspend or terminate background services based
on user settings, battery policy, force-stop, reboot, or platform limits; the
app therefore restores the local session on the next task invocation and does
not claim uninterrupted hours/days capture without a device endurance test.

Native permission/config changes in `app.json` require a rebuild; an OTA update
cannot add the location background modes or Android foreground-service
permissions.

