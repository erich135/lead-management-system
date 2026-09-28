import { useState } from 'react';
import {
  ACCEPT_CONFIGURATION_NOTE,
  ACCEPT_CONFIGURATION_TITLE,
  formatAcceptanceTime,
  showsAcceptConfigurationButton,
  showsRevokeAcceptance,
} from '../configurationAcceptance';

interface ConfigurationAcceptancePanelProps {
  validationFailed: boolean;
  accepted: boolean;
  acceptedByName: string | null;
  acceptedAt: string | null;
  note: string | null;
  canAccept: boolean;
  onAccept: (note: string) => void;
  onRevoke: () => void;
}

export function ConfigurationAcceptancePanel({
  validationFailed,
  accepted,
  acceptedByName,
  acceptedAt,
  note,
  canAccept,
  onAccept,
  onRevoke,
}: ConfigurationAcceptancePanelProps) {
  const [open, setOpen] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const showAccept = showsAcceptConfigurationButton(validationFailed, accepted);
  const showRevoke = showsRevokeAcceptance(validationFailed, accepted);
  if (!showAccept && !showRevoke) return null;

  const acceptedWhen = formatAcceptanceTime(acceptedAt);

  return (
    <div className="mt-4 rounded-[8px] border border-amber-300 bg-amber-50 p-4">
      {showRevoke ? (
        <>
          <p className="text-sm font-bold text-amber-950">{ACCEPT_CONFIGURATION_TITLE}</p>
          <p className="mt-1 text-sm text-amber-950">{ACCEPT_CONFIGURATION_NOTE}</p>
          {acceptedByName && (
            <p className="mt-2 text-sm text-amber-950">Accepted by: {acceptedByName}</p>
          )}
          {acceptedWhen && (
            <p className="text-sm text-amber-950">Accepted: {acceptedWhen}</p>
          )}
          {note && (
            <p className="mt-2 text-sm text-amber-950">Engineering note: {note}</p>
          )}
          <button
            type="button"
            className="mt-3 rounded-[8px] border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-950"
            onClick={onRevoke}
          >
            Revoke Acceptance
          </button>
        </>
      ) : (
        <button
          type="button"
          className="rounded-[8px] bg-[#383838] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!canAccept}
          onClick={() => {
            setDraftNote(note ?? '');
            setOpen(true);
          }}
        >
          Accept Current Configuration
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-labelledby="accept-configuration-title"
            className="w-full max-w-lg rounded-[8px] bg-white p-5 shadow-lg"
          >
            <h2 id="accept-configuration-title" className="text-base font-bold text-[#383838]">
              Accept current configuration?
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              The selected equipment does not satisfy one or more automated Air Audit checks. The
              warnings will remain visible and will be included in the proposal. Accepting the
              configuration allows the proposal tool to calculate savings and payback using the
              selected equipment.
            </p>
            <label className="mt-4 block text-sm font-medium text-[#383838]" htmlFor="acceptance-note">
              Reason / engineering note
            </label>
            <textarea
              id="acceptance-note"
              className="mt-1 w-full rounded-[8px] border border-slate-300 p-2 text-sm"
              rows={3}
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-[8px] border border-slate-300 px-4 py-2 text-sm font-semibold text-[#383838]"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-[8px] bg-[#383838] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  onAccept(draftNote);
                  setOpen(false);
                }}
              >
                Accept Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
