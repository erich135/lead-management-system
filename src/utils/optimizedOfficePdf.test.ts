import { describe, expect, it } from 'vitest';
import { pdfPhotoSize, PDF_PHOTO_DPI, PDF_PHOTO_QUALITY } from './optimizedOfficePdf';

describe('export-only photograph sizing', () => {
  it('fits a landscape photograph at 144 DPI without cropping or upscaling', () => {
    expect(PDF_PHOTO_DPI).toBe(144);
    expect(PDF_PHOTO_QUALITY).toBe(0.75);
    expect(pdfPhotoSize(4000, 3000, 92, 112)).toEqual({ width: 522, height: 391 });
    expect(pdfPhotoSize(100, 50, 92, 112)).toEqual({ width: 100, height: 50 });
  });
  it('fits portrait and rotated orientation without stretching', () => {
    const portrait = pdfPhotoSize(3000, 4000, 92, 112);
    expect(portrait).toEqual({ width: 476, height: 635 });
    expect(Math.abs(portrait.width / portrait.height - 0.75)).toBeLessThan(0.002);
  });
  it('rejects missing or invalid dimensions rather than exporting a blank photograph', () => {
    for (const value of [0, -1, NaN, Infinity]) expect(() => pdfPhotoSize(value, 3000, 92, 112)).toThrow();
  });
});
