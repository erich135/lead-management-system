/**
 * Contract check: Machine Spec Library page must consume the consolidated
 * library API and must not ship production demo manufacturer fixtures.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = fs.readFileSync(
  path.join(root, "src/features/bouwa/components/BouwaSpecLibraryPage.tsx"),
  "utf8",
);
const library = fs.readFileSync(
  path.join(root, "src/features/bouwa/components/BouwaMachineSpecLibrary.tsx"),
  "utf8",
);
const api = fs.readFileSync(
  path.join(root, "src/features/bouwa/wizard/wizardApi.ts"),
  "utf8",
);

const failures = [];

if (page.includes("DEMO_MFR_SPECS")) {
  failures.push("BouwaSpecLibraryPage still contains DEMO_MFR_SPECS.");
}
if (page.includes("badge: '75'") || page.includes("75 Bouwa specs")) {
  failures.push("BouwaSpecLibraryPage still hard-codes the 75 badge/copy.");
}
if (!page.includes("browseSpecLibrary")) {
  failures.push("BouwaSpecLibraryPage does not call browseSpecLibrary.");
}
if (library.includes("listBouwaMachineSpecs")) {
  failures.push("BouwaMachineSpecLibrary still calls legacy listBouwaMachineSpecs.");
}
if (!library.includes("browseSpecLibrary")) {
  failures.push("BouwaMachineSpecLibrary does not call browseSpecLibrary.");
}
if (!api.includes("export async function browseSpecLibrary")) {
  failures.push("wizardApi is missing browseSpecLibrary.");
}
if (!library.includes("Not available")) {
  failures.push("BouwaMachineSpecLibrary must render honest Not available blanks.");
}
if (!library.includes("offset")) {
  failures.push("BouwaMachineSpecLibrary must paginate with offset.");
}

if (failures.length > 0) {
  console.error("Bouwa Spec Library page contract failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("Bouwa Spec Library page contract passed.");
