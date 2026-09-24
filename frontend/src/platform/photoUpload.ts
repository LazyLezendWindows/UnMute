/**
 * Profile photo uploads: the photo goes from the browser straight to Cloudinary using a
 * short-lived permission signed by the backend, then the backend verifies and saves it.
 */

/** Cloudinary's free plan accepts images up to 10 MB. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const ACCEPTED = /^image\/(jpeg|png|webp|heic|heif)$/;

export class PhotoError extends Error {}

/**
 * Scales the photo down and re-encodes it as JPEG in the browser: smaller uploads on mobile data,
 * and camera metadata such as GPS location never leaves the device (Cloudinary strips it again).
 * Formats the browser cannot decode (e.g. HEIC on most browsers) are uploaded as they are.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!ACCEPTED.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
    throw new PhotoError('Choose a JPEG, PNG, WebP or HEIC photo.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (file.size > MAX_PHOTO_BYTES) throw new PhotoError('That photo is too large. Choose one under 10 MB.');
    return file;
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) return file;
  if (blob.size > MAX_PHOTO_BYTES) throw new PhotoError('That photo is too large. Choose one under 10 MB.');
  return blob;
}

export interface SignedUpload {
  uploadUrl: string;
  fields: Record<string, string | number>;
}

/** Uploads to Cloudinary and returns what the backend needs to verify the upload. */
export async function uploadToCloudinary(signed: SignedUpload, photo: Blob) {
  const form = new FormData();
  for (const [key, value] of Object.entries(signed.fields)) form.append(key, String(value));
  form.append('file', photo);
  let res: Response;
  try {
    // No credentials: Cloudinary needs none beyond the signature, and gets no cookies.
    res = await fetch(signed.uploadUrl, { method: 'POST', body: form, credentials: 'omit' });
  } catch {
    throw new PhotoError('The upload failed. Check your connection and try again.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.public_id) {
    throw new PhotoError(
      /format/i.test(body?.error?.message || '') ? 'Choose a JPEG, PNG, WebP or HEIC photo.' : 'The upload failed. Please try again.'
    );
  }
  return { publicId: body.public_id as string, version: body.version as number, signature: body.signature as string };
}
