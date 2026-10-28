import { useEffect } from 'react';
import { X } from 'lucide-react';

interface JobCardPhotoLightboxProps {
  url: string;
  caption: string;
  onClose: () => void;
}

/**
 * Full-size view of one job card photograph. A plain overlay (no extra packages); Escape or
 * a click outside the picture closes it. Hidden when printing.
 */
export function JobCardPhotoLightbox({ url, caption, onClose }: JobCardPhotoLightboxProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="jcr-lightbox fixed inset-0 z-[100000] bg-black/85 flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={caption}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-white text-gray-900"
        aria-label="Close photograph"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={url}
        alt={caption}
        className="max-h-[85vh] max-w-full object-contain bg-white rounded"
        onClick={(event) => event.stopPropagation()}
      />
      <p className="mt-3 text-sm text-white text-center">{caption}</p>
    </div>
  );
}