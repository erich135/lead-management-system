export function deliveryNoteActions(note: { status?: string | null; workflow?: string | null }, tab: string) {
  const draft = note.status === "draft";
  const assigned = note.status === "assigned";
  const archived = tab === "archived";
  return {
    edit: note.workflow === "office" && (draft || assigned) && !archived,
    view: assigned,
    print: !draft && !assigned,
    archive: !archived,
    restore: archived,
  };
}
