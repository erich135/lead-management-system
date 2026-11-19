/**
 * Opens a report window during the click, then fills it when the report arrives.
 * Chrome only treats window.open as part of the click for a few seconds.
 */
export async function openReportDocument(input: {
  blockedMessage: string;
  loadHtml: () => Promise<string>;
  prepare?: (popup: Window) => void;
  openWindow?: () => Window | null;
}): Promise<void> {
  const popup = (input.openWindow ?? (() => window.open('', '_blank')))();
  if (!popup) throw new Error(input.blockedMessage);
  popup.opener = null;
  let html: string;
  try {
    html = await input.loadHtml();
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : 'The report could not be opened';
    writeReportMessage(popup, message);
    throw error instanceof Error ? error : new Error(message);
  }
  if (popup.closed) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  input.prepare?.(popup);
}

function writeReportMessage(popup: Window, message: string): void {
  const safe = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  try {
    popup.document.open();
    popup.document.write(`<!doctype html><title>Report</title><p>${safe}</p>`);
    popup.document.close();
  } catch {
    popup.close();
  }
}
