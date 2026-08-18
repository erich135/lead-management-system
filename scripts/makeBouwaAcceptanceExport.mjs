/**
 * Writes a synthetic logger export for the acceptance run.
 *
 * This is not a customer record and must never be mistaken for one. It is a
 * DS400-shaped file with invented readings, generated so the browser run has
 * an untouched file to upload and a real SHA-256 to check against. It is
 * written outside the repository, and nothing reads it but the acceptance run.
 *
 * Usage: node scripts/makeBouwaAcceptanceExport.mjs [path]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HEADER = [
  ';;A1.1(28220347.0);A1.3(28220347.1);A1.5(28220347.2);A3.1(28220347.6);',
  ';;flow;;;pressure;',
  ';;Flow;Consum;Temp.;B1a;',
  ';;m³/min;m³;°C;bar;',
  '',
];

/** Two working days at fifteen-second intervals, with a plain shift pattern. */
function rows() {
  const out = [];
  const start = new Date(Date.UTC(2026, 6, 20, 6, 0, 0));
  const samples = (2 * 24 * 60 * 60) / 15;
  let consumption = 0;
  for (let index = 0; index < samples; index += 1) {
    const at = new Date(start.getTime() + index * 15000);
    const hour = at.getUTCHours();
    const running = hour >= 6 && hour < 18;
    const flow = running ? 2.4 + 0.6 * Math.sin(index / 240) : 0.2;
    const pressure = running ? 6.8 : 7.4;
    consumption += (flow * 15) / 60;
    const stamp = [
      String(at.getUTCDate()).padStart(2, '0'),
      String(at.getUTCMonth() + 1).padStart(2, '0'),
      String(at.getUTCFullYear() % 100).padStart(2, '0'),
    ].join('.');
    const clock = [
      String(at.getUTCHours()).padStart(2, '0'),
      String(at.getUTCMinutes()).padStart(2, '0'),
      String(at.getUTCSeconds()).padStart(2, '0'),
    ].join(':');
    out.push(
      `${stamp} ${clock};"28220347";"${flow.toFixed(3)}";"${consumption.toFixed(2)}";"21.0";"${pressure.toFixed(2)}"`,
    );
  }
  return out;
}

const target =
  process.argv[2] ??
  path.join(
    os.tmpdir(),
    'bouwa-wizard-acceptance',
    'synthetic-acceptance-export.csv',
  );
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${HEADER.join('\n')}\n${rows().join('\n')}\n`, 'utf8');
process.stdout.write(`${target}\n`);
