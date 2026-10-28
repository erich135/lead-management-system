import {
  buildSectionPhotoGroups,
  photoGroupText,
  photoIncompleteMessage,
  photoLoadCounts,
  type JobCardPhotoRenderData,
  type PhotoQuestionGroup,
} from '../../utils/jobCardPhotos';

const PHOTOS_PER_ROW = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

interface PhotoTileProps {
  group: PhotoQuestionGroup;
  photo: PhotoQuestionGroup['photos'][number];
  position: number;
  photos: JobCardPhotoRenderData;
}

/** One photograph slot: the image, or a visible reason why there is no image. */
function PhotoTile({ group, photo, position, photos }: PhotoTileProps) {
  const caption = `${group.label} - photo ${position}`;
  if (!photo.received) {
    return <div className="jcr-photo-tile jcr-photo-missing">Photo {position}: not received yet</div>;
  }
  const state = photos.images[photo.clientPhotoId];
  if (state?.status === 'error') {
    return <div className="jcr-photo-tile jcr-photo-error">Photo {position}: could not be loaded</div>;
  }
  if (state?.status !== 'loaded' || !state.url) {
    return <div className="jcr-photo-tile jcr-photo-pending">Photo {position}: loading...</div>;
  }
  const image = <img className="jcr-photo-img" src={state.url} alt={caption} />;
  const url = state.url;
  return (
    <div className="jcr-photo-tile">
      {photos.onOpen ? (
        <button
          type="button"
          className="jcr-photo-open"
          title="View larger"
          onClick={() => photos.onOpen?.({ url, caption })}
        >
          {image}
        </button>
      ) : (
        image
      )}
    </div>
  );
}

interface PhotoGroupsProps {
  groups: PhotoQuestionGroup[];
  photos: JobCardPhotoRenderData;
}

function PhotoGroups({ groups, photos }: PhotoGroupsProps) {
  return (
    <>
      {groups.map((group) => {
        const rows = chunk(group.photos, PHOTOS_PER_ROW);
        return (
          <div key={group.questionId} className="jcr-photo-group">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="jcr-block jcr-photo-row-block">
                {rowIndex === 0 && (
                  <div className="jcr-photo-head">
                    <span className="jcr-photo-question">{group.label}</span>
                    <span className={group.missing > 0 ? 'jcr-photo-count jcr-photo-incomplete' : 'jcr-photo-count'}>
                      {photoGroupText(group)}
                    </span>
                  </div>
                )}
                <div className="jcr-photo-row">
                  {row.map((photo, index) => (
                    <PhotoTile
                      key={photo.clientPhotoId}
                      group={group}
                      photo={photo}
                      position={rowIndex * PHOTOS_PER_ROW + index + 1}
                      photos={photos}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

interface PhotoSectionBlockProps {
  section: { id: string; title: string; type: string; fields?: Array<{ id: string; label: string; type: string }> };
  photos?: JobCardPhotoRenderData;
}

/**
 * Photograph groups of one section, under the section title. Renders nothing when the
 * submission has no photographs for the section, so no empty photo section is printed.
 */
export function PhotoSectionBlock({ section, photos }: PhotoSectionBlockProps) {
  if (!photos) return null;
  const groups = buildSectionPhotoGroups(section, photos.report);
  if (groups.length === 0) return null;
  return (
    <div className="jcr-block jcr-photo-section">
      <div className="jcr-section-title">{section.title}</div>
      <PhotoGroups groups={groups} photos={photos} />
    </div>
  );
}

/**
 * Photograph groups to place inside an existing section block (questions that sit beside
 * ordinary answers). Renders nothing without photographs.
 */
export function PhotoGroupsForSection({ section, photos }: PhotoSectionBlockProps) {
  if (!photos) return null;
  const groups = buildSectionPhotoGroups(section, photos.report);
  if (groups.length === 0) return null;
  return <PhotoGroups groups={groups} photos={photos} />;
}

/**
 * Banner at the top of the report when photographs are still outstanding or could not be
 * loaded. Printed with the report so a paper copy cannot be mistaken for a complete one.
 */
export function PhotoCompletenessNotice({ photos }: { photos?: JobCardPhotoRenderData }) {
  if (!photos) return null;
  const incomplete = photoIncompleteMessage(photos.report);
  const { failed } = photoLoadCounts(photos.report, photos.images);
  if (!incomplete && failed === 0) return null;
  return (
    <div className="jcr-photo-banner" role="status">
      {incomplete && <div>{incomplete} The missing photographs have not been uploaded yet.</div>}
      {failed > 0 && (
        <div>
          {failed} {failed === 1 ? 'photograph' : 'photographs'} could not be loaded and {failed === 1 ? 'is' : 'are'} not shown.
        </div>
      )}
    </div>
  );
}