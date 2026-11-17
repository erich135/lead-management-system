import { describe, expect, it } from 'vitest';
import { inspectionPhotoSectionFrom, layoutInspectionPdfPages, type InspectionPhotoNode } from './inspectionPhotoPdfLayout';

function node(tagName: string, fields: Partial<InspectionPhotoNode> = {}): InspectionPhotoNode {
  return { tagName, classList: { contains: () => false }, textContent: '', getAttribute: () => null, ...fields };
}

const photo = (sectionKey: string, heading: string, src: string) => ({ sectionKey, heading, src });

describe('inspection optimised PDF photograph sections', () => {
  it('keeps Before, After and general photographs under their own headings, once each', () => {
    const pages = layoutInspectionPdfPages([
      photo('before', 'Before Work Photos', 'b1'),
      photo('before', 'Before Work Photos', 'b2'),
      photo('after', 'After Work Photos', 'a1'),
      photo('after', 'After Work Photos', 'a2'),
      photo('Photos', 'Photos', 'g1'),
      photo('Photos', 'Photos', 'legacy'),
    ]);
    expect(pages.map((page) => [page.heading, page.photos.map((item) => item.src)])).toEqual([
      ['Before Work Photos', ['b1', 'b2']],
      ['After Work Photos', ['a1', 'a2']],
      ['Photos', ['g1', 'legacy']],
    ]);
    expect(pages.flatMap((page) => page.photos)).toHaveLength(6);
    expect(pages.flatMap((page) => page.photos.map(() => page.heading))).not.toContain('Photograph 1');
  });

  it('reads the report heading for each photograph and does not invent one', () => {
    const before = node('H2', {
      classList: { contains: (name) => name === 'photo-section' },
      textContent: 'Before Work Photos',
      getAttribute: (name) => (name === 'data-question-id' ? 'q_before' : null),
    });
    const beforeLink = node('A', { previousElementSibling: before });
    const beforeImage = node('IMG', { parentElement: beforeLink, alt: 'Before Work Photos', getAttribute: () => 'q_before' });
    const general = node('H2', {
      classList: { contains: (name) => name === 'photo-section' },
      textContent: 'Photos',
      previousElementSibling: beforeLink,
    });
    const generalLink = node('A', { previousElementSibling: general });
    const legacy = node('IMG', { parentElement: generalLink, alt: 'Inspection photo', getAttribute: () => null });
    expect(inspectionPhotoSectionFrom(beforeImage)).toEqual({ sectionKey: 'q_before', heading: 'Before Work Photos' });
    expect(inspectionPhotoSectionFrom(legacy)).toEqual({ sectionKey: 'Photos', heading: 'Photos' });
  });

  it('starts a new page at four photographs or a new section, and leaves an empty report unchanged', () => {
    const pages = layoutInspectionPdfPages([
      photo('before', 'Before Work Photos', '1'),
      photo('before', 'Before Work Photos', '2'),
      photo('before', 'Before Work Photos', '3'),
      photo('before', 'Before Work Photos', '4'),
      photo('before', 'Before Work Photos', '5'),
      photo('other', 'custom_photo_question', 'x'),
    ], 4);
    expect(pages.map((page) => [page.heading, page.photos.length])).toEqual([
      ['Before Work Photos', 4],
      ['Before Work Photos', 1],
      ['custom_photo_question', 1],
    ]);
    expect(layoutInspectionPdfPages([])).toEqual([]);
  });
});
