import { describe, it, expect, vi, afterEach } from 'vitest';
import { MAX_PHOTO_BYTES, PhotoError, preparePhoto, uploadToCloudinary } from '../../src/platform/photoUpload';

const signed = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/unmute-test/image/upload',
  fields: { public_id: 'unmute/avatars/u1/abc', timestamp: 1700000000, api_key: 'k', signature: 's' },
};

describe('photo upload', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('refuses files that are not photos', async () => {
    await expect(preparePhoto(new File(['x'], 'notes.pdf', { type: 'application/pdf' }))).rejects.toBeInstanceOf(PhotoError);
    await expect(preparePhoto(new File(['x'], 'a.gif', { type: 'image/gif' }))).rejects.toThrow(/JPEG, PNG, WebP or HEIC/);
  });

  it('uploads formats the browser cannot decode (HEIC) as they are, within the size limit', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('unsupported'); }));
    const heic = new File(['heic-bytes'], 'IMG_0001.HEIC', { type: '' });
    expect(await preparePhoto(heic)).toBe(heic);
    const huge = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'big.heic', { type: 'image/heic' });
    await expect(preparePhoto(huge)).rejects.toThrow(/under 10 MB/);
  });

  it('re-encodes decodable photos as a smaller JPEG (dropping their metadata)', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 3000, close })));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as any);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb, type) {
      cb(new Blob(['jpeg'], { type: type as string }));
    });
    const out = await preparePhoto(new File(['raw'], 'photo.jpg', { type: 'image/jpeg' }));
    expect(out.type).toBe('image/jpeg');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
    expect(close).toHaveBeenCalled();
  });

  it('posts the signed fields and the file to Cloudinary without cookies, and returns what the server verifies', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ public_id: 'unmute/avatars/u1/abc', version: 42, signature: 'f'.repeat(40) })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await uploadToCloudinary(signed, new Blob(['jpeg']));
    expect(result).toEqual({ publicId: 'unmute/avatars/u1/abc', version: 42, signature: 'f'.repeat(40) });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(signed.uploadUrl);
    expect(init.credentials).toBe('omit');
    const form = init.body as FormData;
    expect(form.get('public_id')).toBe('unmute/avatars/u1/abc');
    expect(form.get('signature')).toBe('s');
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  it('explains upload failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Image file format pdf not allowed' } }), { status: 400 })));
    await expect(uploadToCloudinary(signed, new Blob(['x']))).rejects.toThrow(/JPEG, PNG, WebP or HEIC/);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(uploadToCloudinary(signed, new Blob(['x']))).rejects.toThrow(/Check your connection/);
  });
});
