import { BadRequestException } from '@nestjs/common';
import sharp = require('sharp');

// Every photo is re-encoded before it reaches R2: a phone's camera shot is several MB and
// thousands of pixels wide, far more than any screen in the app shows, and it made spots
// slow to load. Resized to fit within `maxDimension` (never enlarged), turned upright from
// its EXIF orientation (which re-encoding would otherwise drop, leaving it sideways), EXIF
// itself stripped (GPS location included), and saved as WebP -- typically a few hundred KB.
export interface CompressedImage {
  buffer: Buffer;
  contentType: 'image/webp';
  extension: 'webp';
}

// Spot photos are shown at most phone-width (a gallery, a card); documentation photos are
// read by an admin, so they keep a bit more detail.
export const SPOT_PHOTO_MAX_DIMENSION = 1600;
export const VERIFICATION_PHOTO_MAX_DIMENSION = 2000;
const WEBP_QUALITY = 80;

export async function compressImage(input: Buffer, maxDimension: number): Promise<CompressedImage> {
  try {
    const buffer = await sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return { buffer, contentType: 'image/webp', extension: 'webp' };
  } catch {
    // Not decodable as an image, whatever its declared type said.
    throw new BadRequestException('El archivo no es una imagen válida.');
  }
}
