import { useEffect, useRef, useState } from 'react';
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
 * that opens a Brother QL-800 layout for a 62 mm continuous label roll.
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
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    const requestGeneration = ++requestGenerationRef.current;
    let cancelled = false;
    setScanUrl(null);
    setLoading(Boolean(machineId));
    setError(null);
    if (!machineId) return () => { cancelled = true; };

    void getMachineQrToken(machineId)
      .then(({ scanUrl: url }) => {
        if (!cancelled && requestGeneration === requestGenerationRef.current) setScanUrl(url);
      })
      .catch((e: unknown) => {
        if (!cancelled && requestGeneration === requestGenerationRef.current) {
          setError(e instanceof Error ? e.message : 'Failed to load QR code');
        }
      })
      .finally(() => {
        if (!cancelled && requestGeneration === requestGenerationRef.current) setLoading(false);
      });

    return () => {
      cancelled = true;
      requestGenerationRef.current += 1;
    };
  }, [machineId]);

  /** Print a 55 mm QR (including its quiet zone) on a 62 mm Brother DK roll. */
  const handlePrint = () => {
    if (!scanUrl) return;
    const svg = document.getElementById(`machine-qr-${machineId}`) as unknown as SVGSVGElement | null;
    if (!svg) return;
    const serialiser = new XMLSerializer();
    const svgString = serialiser.serializeToString(svg);
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Machine QR Label</title>
<style>
  @page { size: 62mm 75mm; margin: 2mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; }
  .label { width: 58mm; display: flex; flex-direction: column;
           align-items: center; padding: 1.5mm; box-sizing: border-box;
           break-inside: avoid; page-break-inside: avoid; }
  .label svg { display: block; width: 55mm; height: 55mm; flex: none; }
  .meta { width: 55mm; font-size: 8pt; line-height: 1.2; margin-top: 1mm;
          text-align: center; overflow-wrap: anywhere; }
  .meta strong { display: block; font-size: 9pt; }
  @media print { .instructions { display: none; } }
  .instructions { padding: 12px; font-size: 12px; color: #555; }</style></head>
<body>
  <div class="instructions">Choose <strong>Brother QL-800</strong>, a <strong>62 mm continuous roll</strong>, and <strong>100% / Actual size</strong>. Turn headers and footers off. Label length: <span id="label-length">75</span> mm. The 55 mm QR includes its white border.</div>
  <div class="label">
    ${svgString}
    <div class="meta">
      <strong>${escapeHtml(`${make || ''} ${model || ''}`.trim() || 'Machine')}</strong>
      ${serialNumber ? `S/N: ${escapeHtml(serialNumber)}<br/>` : ''}
      ${assetNumber ? `Asset: ${escapeHtml(assetNumber)}` : ''}
    </div>
  </div>
  <script>
    window.addEventListener('load', () => {
      // Extend the cut length for long machine details without shrinking the QR.
      const label = document.querySelector('.label');
      const heightMm = Math.max(75, Math.ceil(label.getBoundingClientRect().height * 25.4 / 96 + 4));
      const pageStyle = document.createElement('style');
      pageStyle.textContent = '@page { size: 62mm ' + heightMm + 'mm; margin: 2mm; }';
      document.head.appendChild(pageStyle);
      document.getElementById('label-length').textContent = String(heightMm);
      setTimeout(() => window.print(), 200);
    });
  </script>
</body></html>`;

    const w = window.open('', '_blank', 'width=480,height=560');
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
              size={130}
              level="M"
              includeMargin={true}
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
