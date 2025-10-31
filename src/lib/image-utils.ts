export type ResizeOptions = {
  background?: string; // CSS color, e.g., '#000' or 'transparent'
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number; // 0..1 for lossy formats
};

export function parseResolution(resolution: string): { width: number; height: number } {
  const [w, h] = resolution.split('x').map((v) => Number(v));
  if (!w || !h) {
    throw new Error(`Invalid resolution: ${resolution}`);
  }
  return { width: w, height: h };
}

// Resize an image to exactly targetWidth x targetHeight without cropping:
// - Scales the image to fit while preserving aspect ratio
// - Adds padding (letterbox/pillarbox) using the provided background color
export async function resizeImageToSize(
  input: File | Blob,
  targetWidth: number,
  targetHeight: number,
  options: ResizeOptions = {}
): Promise<File> {
  const { background = '#000', format = 'image/png', quality } = options;

  // Create an ImageBitmap or HTMLImageElement for drawing
  const bitmap = await loadImage(input);
  const srcWidth = bitmap.width;
  const srcHeight = bitmap.height;

  // Compute scale to contain
  const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
  const drawWidth = Math.round(srcWidth * scale);
  const drawHeight = Math.round(srcHeight * scale);
  const dx = Math.floor((targetWidth - drawWidth) / 2);
  const dy = Math.floor((targetHeight - drawHeight) / 2);

  // Prepare canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  // Fill background (supports transparent for PNG/WEBP)
  if (background === 'transparent') {
    ctx.clearRect(0, 0, targetWidth, targetHeight);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // Draw scaled image centered
  // drawImage works with ImageBitmap or HTMLImageElement interchangeably
  ctx.drawImage(bitmap as unknown as CanvasImageSource, dx, dy, drawWidth, drawHeight);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode canvas'))), format, quality);
  });

  // Build a file name based on the original if available
  const baseName = getBaseName(input);
  const ext = format.split('/')[1];
  const fileName = `${baseName || 'image'}_${targetWidth}x${targetHeight}.${ext}`;
  return new File([blob], fileName, { type: format });
}

export async function resizeImageToResolution(
  input: File | Blob,
  resolution: string,
  options: ResizeOptions = {}
): Promise<File> {
  const { width, height } = parseResolution(resolution);
  return resizeImageToSize(input, width, height, options);
}

async function loadImage(input: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  // Prefer createImageBitmap for performance if available
  try {
    if ('createImageBitmap' in window && typeof createImageBitmap === 'function') {
      return await createImageBitmap(input);
    }
  } catch {
    // Fallback below
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(input);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function getBaseName(input: File | Blob): string | null {
  if (input instanceof File) {
    const name = input.name;
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  }
  return null;
}

export function computeContainFit(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number
): { scale: number; drawWidth: number; drawHeight: number; dx: number; dy: number } {
  if (srcWidth <= 0 || srcHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    throw new Error('All dimensions must be positive');
  }
  const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
  const drawWidth = Math.round(srcWidth * scale);
  const drawHeight = Math.round(srcHeight * scale);
  const dx = Math.floor((targetWidth - drawWidth) / 2);
  const dy = Math.floor((targetHeight - drawHeight) / 2);
  return { scale, drawWidth, drawHeight, dx, dy };
}
