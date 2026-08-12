// expo-router serialises every route param through the URL, so what a screen
// reads back is always a string (or string[] for repeats). These coercers give
// screens back the number/boolean shapes the old React Navigation params had.
export type RawParam = string | string[] | undefined;

export function toStr(value: RawParam, fallback = ''): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw == null || raw === '' ? fallback : raw;
}

export function toNum(value: RawParam, fallback = 0): number {
  const parsed = Number(toStr(value, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toBool(value: RawParam, fallback = false): boolean {
  const raw = toStr(value, '');
  if (raw === '') return fallback;
  return raw === 'true' || raw === '1';
}
