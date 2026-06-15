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

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: sourceWidth,
      height: sourceHeight,
      windowWidth: sourceWidth,
      windowHeight: sourceHeight,
      onclone: (_doc, clonedEl) => {
        clonedEl.style.width = `${sourceWidth}px`;
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.background = '#ffffff';
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('PDF capture produced an empty canvas');
    }

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}
