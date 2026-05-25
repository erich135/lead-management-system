import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Loader2, AlertCircle, Lock } from 'lucide-react';
import { getMachineQrToken } from '../lib/api';

interface MachineQrPanelProps {
  machineId: string;
  /** Label fields shown alongside the QR on the printable layout. */
  make?: string;
  model?: string;
  serialNumber?: string;
  assetNumber?: string;
}

/**
 * Compact card shown on the Machines edit pane. Fetches a long-lived signed
 * QR token from the backend and displays the QR code plus a "Print" button
 * that opens a print-friendly window with the 50x50 mm label layout.
 *
 * Backend endpoint: GET /api/machines/:id/qr-token (requires `machines.manage`).
 */
export function MachineQrPanel({
  machineId,
  make,
  model,
  serialNumber,
  assetNumber,
}: MachineQrPanelProps) {
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { scanUrl: url } = await getMachineQrToken(machineId);
      setScanUrl(url);
    } catch (e: any) {
      setError(e?.message || 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (machineId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId]);

  /**
   * Opens a stripped-down print window with the QR code centred at the
   * label's physical print size (50x50 mm). The two-up layout keeps things
   * sensible if the user prints on a regular A4 label sheet — they can simply
   * choose "fit to page" / "actual size" in the browser print dialog.
   */
  const handlePrint = () => {
    if (!scanUrl) return;
    const svg = document.getElementById(`machine-qr-${machineId}`) as unknown as SVGSVGElement | null;
    if (!svg) return;
    const serialiser = new XMLSerializer();
    const svgString = serialiser.serializeToString(svg);
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Machine QR Label</title>
<style>
  @page { size: 60mm 60mm; margin: 2mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; }
  .label { width: 50mm; height: 50mm; display: flex; flex-direction: column;
           align-items: center; justify-content: center; padding: 2mm;
           border: 1px dashed #999; box-sizing: border-box; }
  .label svg { width: 30mm; height: 30mm; }
  .meta { font-size: 6pt; line-height: 1.15; margin-top: 1mm; text-align: center; }
  .meta strong { display: block; font-size: 7pt; }
  @media print { .label { border: none; } .instructions { display: none; } }
  .instructions { padding: 12px; font-size: 12px; color: #555; }
</style></head>
<body>
  <div class="instructions">Press <strong>Ctrl/Cmd + P</strong> to print. Choose "Actual size" so the label prints at exactly 50&nbsp;&times;&nbsp;50&nbsp;mm.</div>
  <div class="label">
    ${svgString}
    <div class="meta">
      <strong>${escapeHtml(`${make || ''} ${model || ''}`.trim() || 'Machine')}</strong>
      ${serialNumber ? `S/N: ${escapeHtml(serialNumber)}<br/>` : ''}
      ${assetNumber ? `Asset: ${escapeHtml(assetNumber)}` : ''}
    </div>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 200));</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=420,height=520');
    if (!w) {
      alert('Pop-up blocked. Please allow pop-ups for this site to print QR labels.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase">QR Label</span>
        <span
          className="text-[10px] text-slate-500 flex items-center gap-1"
          title="This QR is permanently bound to the machine — once printed and stuck on the unit it will never need to be re-issued."
        >
          <Lock className="w-3 h-3" /> Permanent
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && scanUrl && (
        <>
          <div className="flex justify-center bg-white border border-slate-200 rounded p-3 mb-3">
            <QRCodeSVG
              id={`machine-qr-${machineId}`}
              value={scanUrl}
              size={140}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-[10px] text-slate-500 break-all mb-3 font-mono">{scanUrl}</p>
          <button
            type="button"
            onClick={handlePrint}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition"
          >
            <Printer className="w-4 h-4" /> Print QR Label
          </button>
        </>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default MachineQrPanel;
