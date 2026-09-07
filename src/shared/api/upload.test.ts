import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression cover for the profile-photo upload.
 *
 * The bug: `uploadToSignedUrl` read the picked file with `await fetch(fileUri)`.
 * On Android that request goes through OkHttp, which only accepts http(s), so a
 * `file://` URI from expo-image-picker rejected with "Network request failed"
 * and no bytes ever reached Cloud Storage. iOS happened to work because
 * RCTFileRequestHandler resolves file URLs, which is why it looked fine on one
 * platform and not the other.
 *
 * These tests pin the fix: on native the bytes come from expo-file-system, and
 * the PUT still carries the exact headers the signed URL was signed with.
 */

const platform = { OS: 'android' };
vi.mock('react-native', () => ({ Platform: platform }));

const arrayBuffer = vi.fn();
vi.mock('expo-file-system', () => ({
  File: class {
    constructor(public uri: string) {}
    arrayBuffer = () => arrayBuffer(this.uri);
  },
}));

// `./config` reaches for expo-constants, which has no native module under vitest.
vi.mock('./config', () => ({
  API_BASE_URL: 'https://example.test/api/v1',
  REQUEST_TIMEOUT_MS: 35_000,
  TOKEN_REFRESH_SKEW_MS: 60_000,
}));

const { ApiError, uploadToSignedUrl } = await import('./client');

const UPLOAD_URL = 'https://storage.googleapis.com/bucket/profile-photos/u1/a.jpeg?X-Goog-Signature=abc';
const REQUIRED = { 'x-goog-acl': 'public-read' };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  platform.OS = 'android';
  arrayBuffer.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal('fetch', fetchMock);
});

describe('uploadToSignedUrl on native', () => {
  it('never asks fetch to read the file:// URI', async () => {
    await uploadToSignedUrl(UPLOAD_URL, 'file:///data/user/0/pic.jpeg', 'image/jpeg', REQUIRED);

    const requested = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requested).not.toContain('file:///data/user/0/pic.jpeg');
    expect(requested).toEqual([UPLOAD_URL]);
  });

  it('reads the bytes through expo-file-system and PUTs them to the signed URL', async () => {
    await uploadToSignedUrl(UPLOAD_URL, 'file:///data/user/0/pic.jpeg', 'image/jpeg', REQUIRED);

    expect(arrayBuffer).toHaveBeenCalledWith('file:///data/user/0/pic.jpeg');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('PUT');
    // Both headers were signed — dropping either invalidates the signature.
    expect(init.headers).toMatchObject({ 'Content-Type': 'image/jpeg', 'x-goog-acl': 'public-read' });
    expect(new Uint8Array(init.body as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('surfaces a rejected upload as an ApiError', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    await expect(
      uploadToSignedUrl(UPLOAD_URL, 'file:///data/user/0/pic.jpeg', 'image/jpeg', REQUIRED),
    ).rejects.toMatchObject({ status: 403, code: 'UPLOAD_FAILED' });
    await expect(
      uploadToSignedUrl(UPLOAD_URL, 'file:///data/user/0/pic.jpeg', 'image/jpeg', REQUIRED),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('uploadToSignedUrl on web', () => {
  it('still reads the picker blob: URL with fetch, which the browser resolves natively', async () => {
    platform.OS = 'web';
    const blob = { size: 3 };
    fetchMock.mockImplementation(async (url: string) =>
      String(url).startsWith('blob:')
        ? { ok: true, status: 200, blob: async () => blob }
        : { ok: true, status: 200 },
    );

    await uploadToSignedUrl(UPLOAD_URL, 'blob:https://app.test/abc', 'image/png', REQUIRED);

    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(['blob:https://app.test/abc', UPLOAD_URL]);
    expect(fetchMock.mock.calls[1][1].body).toBe(blob);
  });
});
