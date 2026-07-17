# Bouwa Logger CSV Import Strategy

**Status:** Strategy proposal for ARS review

**Scope:** Logger CSV import, measured-data handling, summary generation, and proposal input policy

**Applies to:** ARS/Bouwa internal working proposal builder
**Does not change:** Current application code, current calculation outputs, stored data, CSV/PDF source files, or customer-release behavior

---

## 1. Logger CSV role

The logger CSV is a measured audit input, not a formula source.

- The CSV contains recorded plant measurements from the logger.
- The CSV is more valuable than legacy workbook formulas as evidence of what was actually measured.
- The CSV does not become calculation authority.
- The first-principles formula register remains the calculation authority.
- Imported logger rows feed the app as measured inputs, while formulas, units, assumptions, and validation still come from the approved register.

The CSV should therefore be treated as traceable plant evidence, not as a hidden calculator.

---

## 2. File and source-location policy

### 2.1 Source folders

- `C:\Dev\ARS-Integration-Workspace\ARS Calculators` is the original/reference library.
- `C:\Dev\ARS-Integration-Workspace\bouwa-source-data` is the controlled app test/input area for later import samples and curated copies.
- Original source files must not be modified.
- Imported files should be stored as controlled records, not as ad hoc replacements for the originals.

### 2.2 Import metadata

Every imported file should retain:

- filename;
- content hash;
- original source location;
- uploaded by;
- uploaded date;
- import version;
- optional notes or review status.

This allows the app to prove which source file produced which summary, without changing the source file itself.

### 2.3 Current source examples

For the John Thomson sample set:

- `john_thmps_quincy.csv` is the raw logger export;
- `John Thomson 2.pdf` is the consumption summary report;
- `John Thomson 3.pdf` is the detailed flow and pressure chart report.

These files are reference evidence, not editable app inputs.

---

## 3. Expected logger fields

The John Thomson CSV sample indicates the app should expect these measured fields:

- timestamp;
- device or logger ID;
- flow m3/min;
- cumulative consumption m3;
- temperature C;
- pressure bar.

The importer should preserve the original field names where possible and also map them into normalized internal field names for consistent reporting.

---

## 4. Sampling interval policy

The importer must detect the actual sampling interval from the timestamps instead of assuming it.

Observed CSV data may represent:

- raw 15-second readings;
- hourly-averaged output;
- another logger export interval if the device or export setting differs.

Working rule:

- ARS / Leana have indicated that averages may be used to reduce 15-second data into hourly readings.
- The importer must detect the interval from the data itself.
- Hourly summaries should average the raw readings available for that hour.
- Daily summaries should use cumulative consumption and/or summed interval data where appropriate.
- Weekly summaries should be derived from the daily or interval summaries, not guessed from a fixed export assumption.

The app should never assume "hourly" unless the timestamps prove it.

---

## 5. Raw versus calculated summaries

The import pipeline should keep raw and derived values separate.

### 5.1 Raw summary

The raw summary should include:

- raw row count;
- raw minimum, average, and maximum flow;
- raw minimum, average, and maximum pressure;
- raw temperature summary;
- cumulative consumption start and end;
- total m3 consumed;
- detected sampling interval;
- any missing or duplicate timestamp warnings.

### 5.2 Derived summaries

The calculated summaries should include:

- hourly averages;
- daily consumption;
- weekly consumption;
- graph-ready flow and pressure profiles;
- summary values used for proposal inputs.

Raw data must remain available alongside calculated summaries so the user can inspect the evidence behind the summary numbers.

---

## 6. High-flow and low-pressure events

The John Thomson sample shows that raw maximum flow can be very high during low pressure, and those readings appear in the report.

Working rule:

- raw maximum flow such as 96.194 m3/min is retained;
- low-pressure periods are retained;
- the raw readings are included in raw data and normal average calculations;
- the app may flag the readings for review;
- the app must not silently delete them;
- the app must not infer the plant cause unless the user adds a note.

These events are evidence of plant behaviour, not automatic exclusion candidates.

---

## 7. Calculation use policy

The proposal should use measured logger information as follows:

- total consumption from the cumulative meter;
- average flow over the audit period;
- hourly average profile;
- pressure profile;
- detected operating periods;
- validated operating pressure range if ARS supplies one later;
- engineer-selected sizing basis later, if required.

The importer should provide measured values and summary context, but it should not decide the engineering interpretation by itself.

---

## 8. Peak demand policy

Do not automatically size a compressor from a single instantaneous maximum spike.

The app should show:

- raw instantaneous max;
- hourly max average;
- P95 or P99 later if implemented;
- engineer-reviewed peak if selected.

Raw max is evidence, not automatic demand sizing.

---

## 9. Report output

The app should eventually show:

- raw summary;
- hourly summary;
- daily consumption;
- weekly consumption;
- graph-ready flow and pressure profile;
- flagged events list;
- notes entered by user or engineer;
- comparison to the logger PDF summary if available.

The report should make it easy to trace each proposal input back to the measured logger record.

---

## 10. Import workflow

Recommended future workflow:

Upload CSV
-> detect delimiter, header, and units
-> parse timestamps
-> detect interval
-> validate row consistency
-> calculate raw summary
-> calculate hourly, daily, and weekly summaries
-> compare against PDF report totals where supplied
-> store original file reference and hash
-> feed selected measured values into the proposal

This flow keeps the original measurement, the summary, and the proposal input linked but separate.

---

## 11. Required questions for ARS

Before the importer is treated as production-ready, ARS should confirm:

- logger model(s);
- whether all exports use the same format;
- whether raw 15-second exports are available or only hourly averages;
- whether power kW or amps can be exported;
- whether load/unload state can be exported;
- whether a pressure threshold should be defined;
- whether hourly average is the official ARS reporting method;
- whether consumption from cumulative m3 should be treated as the primary total.

---

## 12. Next implementation phase

Recommended implementation order:

- Phase 4E-1: read-only CSV parser and summary generator;
- Phase 4E-2: compare CSV summary to John Thomson PDF values;
- Phase 4E-3: add CSV upload/import UI;
- Phase 4E-4: feed audit summary into Bouwa proposal calculations.

Each phase should remain reviewable and should keep raw data visible.

---

## 13. Risks and controls

| Risk | Required control |
|---|---|
| CSV contains raw measurements that may look abnormal | Keep all raw readings visible and traceable |
| Interval is assumed instead of detected | Detect timestamps before summarising |
| High-flow or low-pressure values are silently excluded | Retain the raw values and flag them for review |
| PDF and CSV totals disagree | Show the difference and preserve both sources |
| Source files are altered during import work | Keep original files read-only and store hashes for imported copies |
| Proposal inputs become detached from source evidence | Store source reference, hash, and import version per imported file |
| Engineering cause is inferred without user review | Require a user note or engineer review before assigning cause |

---

## 14. Relationship to existing documents

The following Bouwa strategy documents remain useful as background:

- `bouwa-first-principles-calculation-strategy.md`;
- `bouwa-calculation-map.md`;
- `bouwa-calculation-validation.md`;
- `element-six-validation-map.md`;
- `bouwa-data-structure-and-linking-audit.md`.

Where those documents describe calculation authority, this logger strategy provides the measured-input policy that feeds that authority.

---

**Strategy outcome:** The logger CSV becomes a traceable measured-data source for summaries and proposal inputs. Raw readings remain visible, sampling is detected rather than assumed, and the formula register still owns the calculations.
