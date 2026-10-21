import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Waits for images inside a DOM subtree to finish loading before capture.
 */
async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

/**
 * Exports a DOM element to a multi-page A4 PDF.
 * Clones the report off-screen so html2canvas is not affected by modal scroll/overflow.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  await renderElementToPdf(element, filename);
}

/**
 * The same render, handing back the bytes as well as saving the file.
 *
 * Used where the PDF has to be kept as well as downloaded. The bytes returned
 * are the bytes that were saved, taken from the same document object rather
 * than from a second render, so the file on disk and the file on the server
 * cannot be two different renderings of the same page.
 */
export async function exportElementToPdfBytes(
  element: HTMLElement,
  filename: string,
  options?: { download?: boolean }
): Promise<ArrayBuffer> {
  const pdf = await renderElementToPdf(element, filename, options?.download !== false);
  return pdf.output('arraybuffer');
}

/**
 * Safe vertical cuts: after each table row, and after a section block.
 * Nested row ends inside a side-by-side section are ignored so a short
 * neighbour cannot slice through the taller column.
 */
function collectSplitPoints(root: HTMLElement): number[] {
  const rootTop = root.getBoundingClientRect().top;
  const height = root.scrollHeight;
  const points = new Set<number>([0, height]);
  const mark = (node: Element) => {
    const bottom = (node as HTMLElement).getBoundingClientRect().bottom - rootTop;
    if (bottom > 1 && bottom < height - 1) points.add(Math.round(bottom));
  };
  root.querySelectorAll('.jcr-block').forEach(mark);
  root.querySelectorAll('tr').forEach((row) => {
    if (row.closest('.jcr-split')) return;
    mark(row);
  });
  return [...points].sort((a, b) => a - b);
}

function collectKeepRanges(root: HTMLElement): Array<{ start: number; end: number }> {
  const rootTop = root.getBoundingClientRect().top;
  return Array.from(root.querySelectorAll('.jcr-keep')).map((node) => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    return {
      start: Math.round(rect.top - rootTop),
      end: Math.round(rect.bottom - rootTop),
    };
  });
}
function sliceCanvas(
  source: HTMLCanvasElement,
  startPx: number,
  endPx: number,
  scale: number
): HTMLCanvasElement {
  const y = Math.max(0, Math.round(startPx * scale));
  const bottom = Math.min(source.height, Math.round(endPx * scale));
  const slice = document.createElement('canvas');
  slice.width = source.width;
  slice.height = Math.max(1, bottom - y);
  const ctx = slice.getContext('2d');
  if (!ctx) throw new Error('Could not prepare a PDF page');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, slice.width, slice.height);
  ctx.drawImage(source, 0, y, source.width, slice.height, 0, 0, source.width, slice.height);
  return slice;
}

async function renderElementToPdf(
  element: HTMLElement,
  filename: string,
  download = true
): Promise<jsPDF> {
  const sourceWidth = element.scrollWidth || element.offsetWidth;
  const sourceHeight = element.scrollHeight || element.offsetHeight;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('Report has no visible content to export');
  }

  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${sourceWidth}px`;
  wrapper.style.minHeight = `${sourceHeight}px`;
  wrapper.style.background = '#ffffff';
  wrapper.style.zIndex = '-1';
  wrapper.style.overflow = 'visible';
  wrapper.style.pointerEvents = 'none';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${sourceWidth}px`;
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await waitForImages(clone);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const laidOutWidth = clone.scrollWidth || sourceWidth;
    const laidOutHeight = clone.scrollHeight || sourceHeight;

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: laidOutWidth,
      height: laidOutHeight,
      windowWidth: laidOutWidth,
      windowHeight: laidOutHeight,
      onclone: (_doc, clonedEl) => {
        clonedEl.style.width = `${laidOutWidth}px`;
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.background = '#ffffff';
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('PDF capture produced an empty canvas');
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    const scale = canvas.height / laidOutHeight;
    const pageCssPx = (contentHeight * laidOutWidth) / contentWidth;
    const splits = collectSplitPoints(clone);
    const keeps = collectKeepRanges(clone);

    let cursor = 0;
    let page = 0;
    while (cursor < laidOutHeight - 1) {
      const limit = cursor + pageCssPx;
      const fitting = splits.filter((point) => point > cursor + 8 && point <= limit + 0.5);
      let cut = fitting.length ? fitting[fitting.length - 1] : 0;
      if (!cut) {
        const next = splits.find((point) => point > cursor + 8);
        cut = next && next - cursor <= pageCssPx ? next : Math.min(laidOutHeight, limit);
      }
      const overflowing = keeps
        .filter((keep) =>
          keep.start > cursor + 8 &&
          keep.start < limit - 8 &&
          keep.end > limit + 1 &&
          keep.end - keep.start <= pageCssPx
        )
        .sort((a, b) => a.start - b.start)[0];
      if (overflowing) cut = overflowing.start;
      if (cut <= cursor) break;

      const slice = sliceCanvas(canvas, cursor, cut, scale);
      const sliceHeight = (slice.height * contentWidth) / canvas.width;
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/png', 1.0), 'PNG', margin, margin, contentWidth, sliceHeight, undefined, 'FAST');
      cursor = cut;
      page += 1;
    }

    if (download) pdf.save(filename);
    return pdf;
  } finally {
    document.body.removeChild(wrapper);
  }
}
