import { useEffect, useState } from 'react';
import { fetchJobCardPhotoBlob, type JobCardPhotoReport } from '../lib/api';
import { receivedPhotoIds, type PhotoImageState } from '../utils/jobCardPhotos';

/**
 * Loads every received photograph of a submission with the signed-in user's token, turns each
 * into an object URL and waits until the browser has decoded it. Photographs that cannot be
 * fetched or decoded are marked as errors so the report can show that visibly.
 * Object URLs are released when the report closes.
 */
export function useJobCardPhotoImages(
  submissionId: string | undefined,
  report: JobCardPhotoReport | undefined
): Record<string, PhotoImageState> {
  const [images, setImages] = useState<Record<string, PhotoImageState>>({});
  const idsKey = receivedPhotoIds(report).join('|');

  useEffect(() => {
    if (!submissionId || !idsKey) {
      setImages({});
      return;
    }
    const ids = idsKey.split('|');
    let cancelled = false;
    const created: string[] = [];
    setImages(Object.fromEntries(ids.map((id) => [id, { status: 'loading' } as PhotoImageState])));

    ids.forEach((id) => {
      fetchJobCardPhotoBlob(submissionId, id)
        .then(async (blob) => {
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          created.push(url);
          const probe = new Image();
          probe.src = url;
          await probe.decode();
          if (cancelled) return;
          setImages((prev) => ({ ...prev, [id]: { status: 'loaded', url } }));
        })
        .catch(() => {
          if (cancelled) return;
          setImages((prev) => ({ ...prev, [id]: { status: 'error' } }));
        });
    });

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [submissionId, idsKey]);

  return images;
}