export interface InspectionPdfPhotoSection {
  sectionKey: string;
  heading: string;
}

export interface InspectionPhotoNode {
  tagName: string;
  classList?: { contains(name: string): boolean };
  textContent?: string | null;
  alt?: string;
  getAttribute?(name: string): string | null;
  previousElementSibling?: InspectionPhotoNode | null;
  parentElement?: InspectionPhotoNode | null;
}

/** The heading is taken from the report. A photograph with no section stays under Photos. */
export function inspectionPhotoSectionFrom(image: InspectionPhotoNode): InspectionPdfPhotoSection {
  const start = image.parentElement?.tagName === 'A' ? image.parentElement : image;
  let node: InspectionPhotoNode | null | undefined = start;
  while (node) {
    let previous = node.previousElementSibling;
    while (previous) {
      if (previous.tagName === 'H2' && previous.classList?.contains('photo-section')) {
        const heading = previous.textContent?.trim() || 'Photos';
        return { sectionKey: previous.getAttribute?.('data-question-id') || heading, heading };
      }
      previous = previous.previousElementSibling;
    }
    node = node.parentElement;
  }
  const questionId = image.getAttribute?.('data-question-id')?.trim() || '';
  const alt = image.alt?.trim() || '';
  if (questionId) return { sectionKey: questionId, heading: alt && alt !== 'Inspection photo' ? alt : questionId };
  return { sectionKey: 'Photos', heading: 'Photos' };
}

export interface InspectionPdfPage<T> {
  heading: string;
  photos: T[];
}

/**
 * Keeps photographs in their report order and starts a new page when the section changes
 * or the current page is full. The heading is the one already chosen for that section.
 */
export function layoutInspectionPdfPages<T extends InspectionPdfPhotoSection>(
  photos: readonly T[],
  pageSize = 4,
): Array<InspectionPdfPage<T>> {
  const size = Math.max(1, pageSize);
  const pages: Array<InspectionPdfPage<T> & { sectionKey: string }> = [];
  for (const photo of photos) {
    const heading = photo.heading.trim() || "Photos";
    const sectionKey = photo.sectionKey || heading;
    const last = pages[pages.length - 1];
    if (!last || last.sectionKey !== sectionKey || last.photos.length >= size) {
      pages.push({ sectionKey, heading, photos: [photo] });
    } else {
      last.photos.push(photo);
    }
  }
  return pages.map(({ heading, photos: pagePhotos }) => ({ heading, photos: pagePhotos }));
}
