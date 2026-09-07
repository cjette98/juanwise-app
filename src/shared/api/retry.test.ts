import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression cover for "Forgot password just errors".
 *
 * The API runs as one Vercel function capped at `maxDuration: 30`. When the
 * container has gone cold, the first request spends longer than that booting
 * (Firebase Admin init plus the whole module graph) and Vercel kills it, so the
 * client gets a dropped connection rather than a response — measured at 33.1s /
 * no status, with the very next call succeeding in 5.0s.
 *
 * Forgot password is usually the first call a cold app makes, so it took the
 * hit almost every time and the screen showed "Could not reach the JuanWise
 * server". Retrying once puts the request on the now-warm container.
 */

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-file-system', () => ({ File: class {} }));
vi.mock('./config', () => ({
  API_BASE_URL: 'https://example.test/api/v1',
  REQUEST_TIMEOUT_MS: 35_000,
  TOKEN_REFRESH_SKEW_MS: 60_000,
}));
vi.mock('./session', () => ({
  clearSession: vi.fn(),
  getSession: () => null,
  hydrateSession: async () => null,
  setTokens: vi.fn(),
}));

const { request } = await import('./client');

const ok = (payload: unknown) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(payload),
});

/** What Vercel killing the function mid-boot looks like to the client. */
const dropped = () => Promise.reject(Object.assign(new TypeError('Network request failed'), { name: 'TypeError' }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

describe('transient retry', () => {
  it('retries a cold-start drop once and returns the second response', async () => {
    fetchMock.mockImplementationOnce(dropped).mockImplementationOnce(async () => ok({ message: 'sent' }));

    await expect(
      request('/auth/forgot-password', { method: 'POST', body: { email: 'a@b.com' }, auth: false, idempotent: true }),
    ).resolves.toEqual({ message: 'sent' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after one retry rather than hammering a server that is really down', async () => {
    fetchMock.mockImplementation(dropped);

    await expect(
      request('/auth/forgot-password', { method: 'POST', body: { email: 'a@b.com' }, auth: false, idempotent: true }),
    ).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries GETs without being asked — reading twice costs nothing', async () => {
    fetchMock.mockImplementationOnce(dropped).mockImplementationOnce(async () => ok({ items: [] }));

    await expect(request('/content/categories', { auth: false })).resolves.toEqual({ items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never replays a write that was not marked safe to repeat', async () => {
    fetchMock.mockImplementation(dropped);

    await expect(
      request('/results', { method: 'POST', body: { score: 1 }, auth: false }),
    ).rejects.toMatchObject({ status: 0 });

    // A submitted result may have landed before the connection dropped.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a response that actually arrived', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: async () => JSON.stringify({ error: { code: 'X', message: 'bad' } }) });

    await expect(
      request('/auth/forgot-password', { method: 'POST', body: {}, auth: false, idempotent: true }),
    ).rejects.toMatchObject({ status: 422 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
