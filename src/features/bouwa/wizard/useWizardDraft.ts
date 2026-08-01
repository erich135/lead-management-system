/**
 * The saving half of the guided wizard.
 *
 * Every answer goes to the backend. There is no local authority here: the
 * component holds what the user has typed only until the save that carries it
 * returns, and what comes back — readiness, applicability, locked values — is
 * taken as stated.
 *
 * Three things this hook is careful about.
 *
 * Saves are serialised. One request is in flight at a time and a change made
 * while it is running queues the next one, so two saves can never race and the
 * revision quoted on a request is never one the browser has already spent.
 *
 * A save that returns while the user has carried on typing does not overwrite
 * what they typed. The server's answers are adopted only when nothing is
 * pending, which is the difference between a form that autosaves and a form
 * that eats keystrokes.
 *
 * A conflict is not an error. Somebody else's newer work is held and offered,
 * and nothing local is thrown away until the user says so.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { writeAnswerAtPath } from '../auditIntakeState';
import type { AuditIntakeDocument, IntakeAnswer } from '../auditIntakeTypes';
import {
  WizardRequestError,
  fetchWizardDraft,
  saveWizardDraft,
  uploadWizardDocument,
  uploadWizardSource,
  type WizardSaveRequest,
} from './wizardApi';
import type { WizardSaveState } from './wizardState';
import type {
  WizardConflict,
  WizardDraftView,
  WizardManualBasis,
  WizardProposalType,
  WizardStepId,
} from './wizardTypes';

/** How long a user may pause before what they have entered is saved for them. */
export const WIZARD_AUTOSAVE_DELAY_MS = 1200;

interface PendingChange {
  intake?: AuditIntakeDocument;
  proposalType?: WizardProposalType;
  manualBasis?: WizardManualBasis | null;
  customer?: WizardSaveRequest['customer'];
  currentStepId?: WizardStepId;
  currentPageIndex?: number;
}

export interface WizardDraftController {
  view: WizardDraftView;
  intake: AuditIntakeDocument;
  saveState: WizardSaveState;
  conflict: WizardConflict | null;
  busy: boolean;
  mayEdit: boolean;
  answer: (path: string, value: IntakeAnswer<unknown>) => void;
  setProposalType: (type: WizardProposalType) => void;
  setManualBasis: (basis: WizardManualBasis) => void;
  setCustomer: (customer: NonNullable<WizardSaveRequest['customer']>) => void;
  /** Saves everything outstanding. Resolves false where the save was refused. */
  flush: (position?: {
    currentStepId: WizardStepId;
    currentPageIndex: number;
  }) => Promise<boolean>;
  uploadSource: (file: File) => Promise<boolean>;
  uploadDocument: (
    file: File,
    options?: { evidenceId?: string | null; evidenceType?: string | null },
  ) => Promise<boolean>;
  reloadFromServer: () => Promise<void>;
  keepServerVersion: () => void;
  dismissConflict: () => void;
}

export function useWizardDraft(initial: WizardDraftView): WizardDraftController {
  const [view, setView] = useState<WizardDraftView>(initial);
  const [intake, setIntake] = useState<AuditIntakeDocument>(initial.draft.intake);
  const [saveState, setSaveState] = useState<WizardSaveState>({ kind: 'clean' });
  const [conflict, setConflict] = useState<WizardConflict | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = useRef<PendingChange>({});
  const inFlight = useRef(false);
  /** While a conflict is unresolved, autosave stops: retrying would only fail again. */
  const conflictOpen = useRef(false);
  const revision = useRef(initial.draft.revision);
  const autosave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (autosave.current !== null) clearTimeout(autosave.current);
    };
  }, []);

  const adopt = useCallback((next: WizardDraftView) => {
    revision.current = next.draft.revision;
    setView(next);
    // Only take the server's answers when nothing local is waiting to be sent,
    // so a slow response cannot undo what was typed while it was in flight.
    if (Object.keys(pending.current).length === 0) setIntake(next.draft.intake);
  }, []);

  const send = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return true;
    const change = pending.current;
    if (Object.keys(change).length === 0) return true;
    pending.current = {};
    inFlight.current = true;
    setSaveState({ kind: 'saving' });
    try {
      const next = await saveWizardDraft(view.draft.draftId, {
        revision: revision.current,
        ...change,
      });
      inFlight.current = false;
      if (!mounted.current) return true;
      adopt(next);
      if (Object.keys(pending.current).length > 0) return send();
      setSaveState({ kind: 'saved', at: next.draft.updatedAt });
      return true;
    } catch (error: unknown) {
      inFlight.current = false;
      // The change was not stored, so it goes back on the queue rather than
      // being lost. Nothing on screen is discarded.
      pending.current = { ...change, ...pending.current };
      if (!mounted.current) return false;
      if (error instanceof WizardRequestError && error.conflict !== null) {
        conflictOpen.current = true;
        setConflict(error.conflict);
        setSaveState({ kind: 'conflict', message: error.message });
        return false;
      }
      setSaveState({
        kind: 'failed',
        message:
          error instanceof Error ? error.message : 'The save did not complete.',
      });
      return false;
    }
  }, [adopt, view.draft.draftId]);

  const queue = useCallback(
    (change: PendingChange) => {
      pending.current = { ...pending.current, ...change };
      setSaveState(current =>
        current.kind === 'conflict' ? current : { kind: 'dirty' },
      );
      if (autosave.current !== null) clearTimeout(autosave.current);
      if (conflictOpen.current) return;
      autosave.current = setTimeout(() => {
        void send();
      }, WIZARD_AUTOSAVE_DELAY_MS);
    },
    [send],
  );

  const answer = useCallback(
    (path: string, value: IntakeAnswer<unknown>) => {
      setIntake(current => {
        const next = writeAnswerAtPath(current, path, value);
        queue({ intake: next });
        return next;
      });
    },
    [queue],
  );

  const setProposalType = useCallback(
    (type: WizardProposalType) => {
      setView(current => ({
        ...current,
        draft: { ...current.draft, proposalType: type },
      }));
      queue({ proposalType: type });
    },
    [queue],
  );

  const setManualBasis = useCallback(
    (basis: WizardManualBasis) => {
      setView(current => ({
        ...current,
        draft: { ...current.draft, manualBasis: basis },
      }));
      queue({ manualBasis: basis });
    },
    [queue],
  );

  const setCustomer = useCallback(
    (customer: NonNullable<WizardSaveRequest['customer']>) => {
      setView(current => ({
        ...current,
        draft: { ...current.draft, customer: { ...current.draft.customer, ...customer } },
      }));
      queue({ customer });
    },
    [queue],
  );

  const flush = useCallback(
    async (position?: {
      currentStepId: WizardStepId;
      currentPageIndex: number;
    }): Promise<boolean> => {
      if (autosave.current !== null) clearTimeout(autosave.current);
      if (position !== undefined) {
        pending.current = { ...pending.current, ...position };
      }
      if (Object.keys(pending.current).length === 0) {
        setSaveState(current =>
          current.kind === 'saved' || current.kind === 'clean'
            ? current
            : { kind: 'clean' },
        );
        return true;
      }
      setBusy(true);
      const outcome = await send();
      if (mounted.current) setBusy(false);
      return outcome;
    },
    [send],
  );

  const uploadSource = useCallback(
    async (file: File): Promise<boolean> => {
      if (!(await flush())) return false;
      setBusy(true);
      setSaveState({ kind: 'saving' });
      try {
        const next = await uploadWizardSource(
          view.draft.draftId,
          revision.current,
          file,
        );
        if (!mounted.current) return true;
        adopt(next);
        setIntake(next.draft.intake);
        setSaveState({ kind: 'saved', at: next.draft.updatedAt });
        return true;
      } catch (error: unknown) {
        if (!mounted.current) return false;
        if (error instanceof WizardRequestError && error.conflict !== null) {
          conflictOpen.current = true;
          setConflict(error.conflict);
          setSaveState({ kind: 'conflict', message: error.message });
          return false;
        }
        setSaveState({
          kind: 'failed',
          message:
            error instanceof Error
              ? error.message
              : 'The logger export was not accepted.',
        });
        return false;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [adopt, flush, view.draft.draftId],
  );

  const uploadDocument = useCallback(
    async (
      file: File,
      options?: { evidenceId?: string | null; evidenceType?: string | null },
    ): Promise<boolean> => {
      if (!(await flush())) return false;
      setBusy(true);
      setSaveState({ kind: 'saving' });
      try {
        const next = await uploadWizardDocument(
          view.draft.draftId,
          revision.current,
          file,
          options,
        );
        if (!mounted.current) return true;
        adopt(next);
        setSaveState({ kind: 'saved', at: next.draft.updatedAt });
        return true;
      } catch (error: unknown) {
        if (!mounted.current) return false;
        setSaveState({
          kind: 'failed',
          message:
            error instanceof Error
              ? error.message
              : 'The document was not stored.',
        });
        return false;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [adopt, flush, view.draft.draftId],
  );

  const reloadFromServer = useCallback(async () => {
    setBusy(true);
    try {
      const next = await fetchWizardDraft(view.draft.draftId);
      if (!mounted.current) return;
      pending.current = {};
      revision.current = next.draft.revision;
      conflictOpen.current = false;
      setView(next);
      setIntake(next.draft.intake);
      setConflict(null);
      setSaveState({ kind: 'clean' });
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [view.draft.draftId]);

  /** Takes the newer stored version, discarding the refused local change. */
  const keepServerVersion = useCallback(() => {
    if (conflict?.current == null) {
      void reloadFromServer();
      return;
    }
    pending.current = {};
    revision.current = conflict.current.draft.revision;
    conflictOpen.current = false;
    setView(conflict.current);
    setIntake(conflict.current.draft.intake);
    setConflict(null);
    setSaveState({ kind: 'clean' });
  }, [conflict, reloadFromServer]);

  /** Keeps what is on screen and re-quotes the stored revision to save over it. */
  const dismissConflict = useCallback(() => {
    if (conflict?.current != null) revision.current = conflict.current.draft.revision;
    conflictOpen.current = false;
    setConflict(null);
    setSaveState({ kind: 'dirty' });
  }, [conflict]);

  return {
    view,
    intake,
    saveState,
    conflict,
    busy,
    mayEdit: view.mayEdit !== false && view.draft.status === 'draft',
    answer,
    setProposalType,
    setManualBasis,
    setCustomer,
    flush,
    uploadSource,
    uploadDocument,
    reloadFromServer,
    keepServerVersion,
    dismissConflict,
  };
}
