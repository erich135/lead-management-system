import { getAuthToken } from '../lib/api';
import { resolveApiBaseUrl } from '../lib/resolveApiBaseUrl';

export const PDF_PHOTO_DPI = 144;
export const PDF_PHOTO_QUALITY = 0.75;

/** Fit within the printed box at 144 DPI; never upscale or distort a photograph. */
export function pdfPhotoSize(width: number, height: number, boxWidthMm: number, boxHeightMm: number) {
  if (![width, height, boxWidthMm, boxHeightMm].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid photograph dimensions');
  const scale = Math.min(1, boxWidthMm / 25.4 * PDF_PHOTO_DPI / width, boxHeightMm / 25.4 * PDF_PHOTO_DPI / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function stylesFor(document: Document): string {
  return [...document.styleSheets].map(sheet => {
    try { return [...sheet.cssRules].map(rule => rule.cssText).join('\n'); }
    catch { return ''; } // Cross-origin fonts are not required; report fonts use system fallbacks.
  }).join('\n');
}

async function embedOriginal(src: string): Promise<string> {
  if (src.startsWith('data:image/')) return src;
  const response = await fetch(src);
  if (!response.ok) throw new Error('A report image could not be loaded');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('A report image could not be read'));
    reader.readAsDataURL(blob);
  });
}

/** Prepares a detached export copy. The live report, photographs and signatures are never changed. */
export async function prepareOfficePdf(element: HTMLElement, inspection = false): Promise<string> {
  const document = element.ownerDocument;
  const clone = element.cloneNode(true) as HTMLElement;
  const width = element.getBoundingClientRect().width || 794;
  const photos: Array<{ src: string; caption: string }> = [];
  const sourceImages = [...element.querySelectorAll<HTMLImageElement>('img')];
  const images = [...clone.querySelectorAll<HTMLImageElement>('img')];
  for (let i = 0; i < sourceImages.length; i++) {
    const source = sourceImages[i];
    const image = images[i];
    if (!source.complete || !source.naturalWidth) {
      try { await source.decode(); }
      catch { throw new Error('A report image could not be decoded. Please reload the report before exporting.'); }
    }
    if (source.matches('.photo, .jcr-photo-img')) {
      const box = source.getBoundingClientRect();
      const size = pdfPhotoSize(source.naturalWidth, source.naturalHeight,
        inspection ? 92 : Math.max(1, box.width) / width * 190,
        inspection ? 112 : Math.max(1, box.height) / width * 190);
      const canvas = document.createElement('canvas');
      canvas.width = size.width; canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare a photograph for PDF');
      context.fillStyle = '#fff'; context.fillRect(0, 0, size.width, size.height);
      context.drawImage(source, 0, 0, size.width, size.height);
      image.src = canvas.toDataURL('image/jpeg', PDF_PHOTO_QUALITY);
      if (inspection) {
        photos.push({ src: image.src, caption: `Photograph ${photos.length + 1}` });
        (image.parentElement?.tagName === 'A' ? image.parentElement : image).remove();
      }
    } else {
      // Logos and signatures retain their original representation and resolution.
      image.src = await embedOriginal(source.currentSrc || source.src);
    }
  }
  clone.querySelectorAll('.jcr-photo-open').forEach(button => button.replaceWith(...button.childNodes));
  clone.querySelectorAll('script, iframe, object, embed, link, meta, base, button, .no-print').forEach(node => node.remove());
  if (inspection && photos.length) {
    [...clone.querySelectorAll('h2')].filter(h => h.textContent?.trim() === 'Photos').forEach(h => h.remove());
    for (let offset = 0; offset < photos.length; offset += 4) {
      const page = document.createElement('section'); page.className = 'pdf-photo-page';
      const heading = document.createElement('h2'); heading.textContent = 'Inspection photographs'; page.append(heading);
      const grid = document.createElement('div'); grid.className = 'pdf-photo-grid'; page.append(grid);
      for (const photo of photos.slice(offset, offset + 4)) {
        const figure = document.createElement('figure');
        const image = document.createElement('img'); image.src = photo.src; image.alt = photo.caption;
        const caption = document.createElement('figcaption'); caption.textContent = photo.caption;
        figure.append(image, caption); grid.append(figure);
      }
      clone.append(page);
    }
  }
  const exportStyles = `
    @page { size:A4; margin:10mm }
    html,body { margin:0!important; padding:0!important; background:white!important }
    .job-card-report { width:190mm!important; max-width:none!important; padding:0!important; margin:0!important }
    tr,.jcr-keep,.jcr-photo-row-block { break-inside:avoid; page-break-inside:avoid }
    img { max-width:100% }
    .pdf-photo-page { break-before:page; page-break-before:always; break-inside:avoid; height:268mm; box-sizing:border-box }
    .pdf-photo-page h2 { font: bold 14px Arial; margin:0 0 6mm; padding:0 }
    .pdf-photo-grid { display:grid; grid-template-columns:92mm 92mm; grid-auto-rows:120mm; gap:6mm }
    .pdf-photo-grid figure { margin:0; padding:0; width:92mm; height:120mm; break-inside:avoid }
    .pdf-photo-grid img { display:block; width:92mm; height:112mm; object-fit:contain; margin:0 }
    .pdf-photo-grid figcaption { font:11px Arial; text-align:center; margin-top:2mm }
  `;
  return `<style>${stylesFor(document)}\n${exportStyles}</style>${clone.outerHTML}`;
}

export async function downloadOptimizedOfficePdf(element: HTMLElement, filename: string, inspection = false): Promise<void> {
  const html = await prepareOfficePdf(element, inspection);
  const token = getAuthToken();
  // Same local/prod API resolution as the rest of the Office application.
  const response = await fetch(`${resolveApiBaseUrl()}/api/reports/office-pdf`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ html, filename }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || error?.message || 'The optimised PDF could not be generated');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a'); link.href = url; link.download = filename;
  window.document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
