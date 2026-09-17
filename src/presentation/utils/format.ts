/**
 * Formateo de mÃ©tricas para la UI de actividad (HU-06). Cero lÃ³gica de negocio.
 */

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatKm(km: number): string {
  return `${km.toFixed(2)} km`;
}

export function formatDate(timestamp?: number): string {
  if (!timestamp) return "â€”";
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

/**
 * Formatea un ritmo numérico (min/km) como "mm'ss"/km.
 * Rescate cruz→main (HU-08, 2026-09-16). Cero lógica de negocio.
 */
export function formatPace(paceMinPerKm: number): string {
  if (paceMinPerKm <= 0 || !Number.isFinite(paceMinPerKm)) {
    return "--:--/km";
  }
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(mins)}'${pad(secs)}"/km`;
}
