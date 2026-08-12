import Constants from 'expo-constants';

/**
 * Where the JuanWise API lives. The deployed Vercel instance is the default so
 * a fresh clone talks to a working backend with no setup; point it somewhere
 * else with `EXPO_PUBLIC_API_URL` (or `expo.extra.apiUrl` in app.json) when
 * running against `npm run dev` on a laptop or against a preview deployment.
 *
 * On a physical device `http://localhost:3000` is the phone, not the laptop —
 * use the LAN address (e.g. `http://192.168.1.20:3000`) there.
 */
const FALLBACK_ORIGIN = 'https://juanwise-be.vercel.app';

function configuredOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  if (extra?.apiUrl && extra.apiUrl.trim()) return extra.apiUrl.trim();

  return FALLBACK_ORIGIN;
}

/** Origin only — used by `/health` and by the docs link in About. */
export const API_ORIGIN = configuredOrigin().replace(/\/+$/, '');

/** Every module route hangs off this prefix; see juanwise-be `src/app.ts`. */
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

/**
 * Vercel functions cap at 30s (`vercel.json` maxDuration) and a cold start pays
 * Firebase Admin init, so the client waits a little longer than that before
 * giving up rather than aborting a request the server is still serving.
 */
export const REQUEST_TIMEOUT_MS = 35_000;

/** Refresh the ID token this long before it actually expires. */
export const TOKEN_REFRESH_SKEW_MS = 60_000;
