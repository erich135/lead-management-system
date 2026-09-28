const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const COMPRESS_OVER_BYTES = 1_200_000;
const MAX_EDGE_PX = 1600;

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

/**
 * User-facing photo failure. The visit stays open; `userMessage` is what the rep sees.
 */
export class VisitPhotoError extends Error {
  readonly userMessage: string;

  constructor(userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = 'VisitPhotoError';
    this.userMessage = userMessage;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * capture must stay off. On an installed Android PWA, capture="environment"
 * launches the camera intent and replaces the page with a blank screen.
 * multiple and capture also disagree: older Chrome honours capture, newer
 * Chrome ignores it and opens the gallery. That is why one phone can add
 * several photos while another goes white on the same button.
 */
export function isVisitPhotoFile(file: { type: string; name: string }): boolean {
  const type = file.type.trim().toLowerCase();
  if (type.startsWith('image/')) return true;
  return IMAGE_EXTENSION.test(file.name);
}

export function visitPhotoRejection(file: { type: string; name: string; size: number }): string | null {
  if (file.size < 0) return 'That photo could not be read. Try again.';
  if (file.size === 0) return 'That photo was empty. Try again.';
  if (file.size > MAX_PHOTO_BYTES) {
    return 'That photo is too large. Choose a smaller JPEG or PNG and try again.';
  }
  if (!isVisitPhotoFile(file)) {
    return 'That file is not a photo ARS can use. Choose a JPEG or PNG and try again.';
  }
  return null;
}

export function shouldCompressVisitPhoto(file: { type: string; name: string; size: number }): boolean {
  if (file.size > COMPRESS_OVER_BYTES) return true;
  const type = file.type.trim().toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return /\.heic$|\.heif$/i.test(file.name);
}

export function visitPhotoStorageMessage(error: unknown): string | null {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (name === 'QuotaExceededError' || /quota exceeded/i.test(message)) {
    return 'The phone is out of space for more photos. Remove a photo and try again. The rest of this visit is still here.';
  }
  return null;
}

function runningBuild(): string {
  return typeof __ARS_APP_BUILD__ === 'string' && __ARS_APP_BUILD__.trim()
    ? __ARS_APP_BUILD__.trim()
    : 'dev';
}

export function visitPhotoClientContext(): Record<string, string> {
  if (typeof navigator === 'undefined') return { build: runningBuild() };
  const standalone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return {
    build: runningBuild(),
    userAgent: navigator.userAgent,
    standalone: standalone ? 'yes' : 'no',
  };
}

export function logVisitPhotoFailure(error: unknown, step: string): void {
  console.error('[ARS visit photo]', {
    step,
    name: error instanceof Error ? error.name : 'unknown',
    message: error instanceof Error ? error.message : String(error),
    ...visitPhotoClientContext(),
  });
}

/**
 * Opens the system photo chooser. The input must stay in the page, not display:none.
 * Android 13 and earlier, Samsung Internet, and Firefox usually include Camera.
 * Chrome on Android 14 and 15 opens the photo picker without a camera tile when
 * accept is image/*. Do not add capture="environment" to force that tile.
 */
export function openVisitPhotoPicker(input: HTMLInputElement | null): void {
  if (!input) {
    throw new VisitPhotoError('Photo picker is not available on this screen. Stay on the visit and try again.');
  }
  input.value = '';
  input.click();
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.startsWith('data:image/')) {
        reject(new VisitPhotoError('That photo could not be read. Try again.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      reject(new VisitPhotoError('That photo could not be read. Try again.', reader.error));
    };
    reader.readAsDataURL(file);
  });
}

async function compressVisitPhoto(file: File): Promise<string> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return fileToDataUrl(file);
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    throw new VisitPhotoError(
      'This photo format could not be read on this phone. Choose a JPEG or PNG and try again.',
      error,
    );
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new VisitPhotoError('That photo could not be prepared. Try again.');
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    if (!dataUrl.startsWith('data:image/')) {
      throw new VisitPhotoError('That photo could not be prepared. Try again.');
    }
    return dataUrl;
  } finally {
    bitmap.close?.();
  }
}

/**
 * Validates and prepares one photo. Large images are reduced so the visit
 * draft can be stored without exhausting the phone.
 */
export async function prepareVisitPhoto(file: File): Promise<string> {
  const rejection = visitPhotoRejection(file);
  if (rejection) throw new VisitPhotoError(rejection);
  try {
    if (!shouldCompressVisitPhoto(file)) return await fileToDataUrl(file);
    return await compressVisitPhoto(file);
  } catch (error) {
    if (error instanceof VisitPhotoError) throw error;
    throw new VisitPhotoError('Unable to add photo. Try again.', error);
  }
}
