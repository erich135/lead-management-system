# Element Six — Bouwa Validation Scenario 2
## Workbook Mapping Document — Phase 4D-21A / 4D-21B

**Source file:** `bouwa-source-data/excel-proposals/Element Six BOUWA SVC RS132 KW Updated - March 2025.xlsx`  
**Mapping date:** July 2026  
**Reference scenario:** Ingrain L160 (Scenario 1) — see `bouwa-calculation-validation.md`  
**Branch:** validation/bouwa-excel-proposals  
**Status:** ✅ Implemented as Scenario 2 — Phase 4D-21B

### Phase 4D-21B — John Confirmations (July 2026)

| Item | John's confirmation |
|---|---|
| Model variant SVC-RS132A-II | "A" = Air Cooled. Same RS132 model family. ARS staff sometimes omit "A". Store as SVC-RS132A-II, base model SVC-RS132-II, cooling type Air Cooled. |
| Buy-back — two units | Offer document confirms: Ingersoll Rand ML250 R220,000 incl. VAT + Ingersoll Rand R132i R100,000 incl. VAT = R320,000 total. Workbook split (R200,000 + R120,000) differs from offer split but total agrees. Both stored; discrepancy visible. |
| Altitude — 30.1 m³/min | Sea-level FAD only. At 5,337 ft and 20% loss, corrected site output = 24.0 m³/min. App must not treat 30.1 m³/min as site-effective output. |

### Implementation (Phase 4D-21B)

- `src/features/bouwa/calculations/elementSixReferenceScenario.ts` — created
- `src/features/bouwa/calculations/validationEngine.ts` — `runE6Validation()` and `E6_VALIDATION_META` added
- `src/features/bouwa/components/BouwaNewProposalWizard.tsx` — Step 11 scenario selector added (Ingrain / Element Six)

---

## 1. Workbook Identity

| Field | Value | Source / Notes |
|---|---|---|
| Customer / site name | **Element Six** | `Effect Output calc!B58`, workbook title |
| Workbook date / version | **March 2025 (Updated)** | Filename: *Element Six BOUWA SVC RS132 KW Updated - March 2025.xlsx* |
| Existing compressor make | **ML250** (CompAir M250 equivalent) | `Results - Comparison to Bouwa!B1`, `Report!B2` |
| Existing compressor kW | **250 kW** | `Results!B4 = 250`, `Report!B5 = 250` |
| Existing compressor FAD (rated) | **46 m³/min / 2,760 m³/h** (Report) | `Report!B3 = 46`, `Report!B4 = 2760` |
| Existing compressor FAD (Results sheet) | **43.9 m³/min / 2,634 m³/h** | `Results!B2 = 43.9`, `Results!B3 = 2634` |
| Proposed Bouwa model (all sheets) | **BOUWA® SVC-RS132A-II** | `Results!C1`, `Report!C2`, `ROI!A5 = "New Machine 132kW"` |
| Proposed Bouwa kW | **132 kW** | `Results!C4 = 132`, `Report!C5 = 132`, `ROI!A5` |
| Site altitude | **5,337 ft (≈ 1,627 m)** | `Effect Output calc!D63 = 5337` |
| Workbook type | RS132 — same family as Ingrain Scenario 1 | Both use SVC-RS132A-II (or similar -II variant) |

> ⚠️ **Model variant note:** The workbook consistently uses **SVC-RS132A-II** (with "A" suffix). The Ingrain scenario uses **SVC-RS132-II** (no "A"). These may be the same machine class at slightly different FAD or spec. Confirm with Bouwa whether "A" denotes a variant or is typographical.

> ⚠️ **FAD discrepancy between sheets:** The `Report` sheet shows **46 m³/min / 2,760 m³/h** for the ML250, while the `Results - Comparison to Bouwa` sheet shows **43.9 m³/min / 2,634 m³/h**. The Results sheet is more detailed (pulls from `Calculations - Compare`) and uses the **audit-measured** demand profile. The Report values appear to be nominal/rounded figures. The Results sheet values should be used for the validation scenario.

---

## 2. Key Validation Fields Map

### 2A. Air Demand / Flow

| Field | Sheet | Cell | Value | Formula | Confidence | Notes |
|---|---|---|---|---|---|---|
| Existing machine FAD (Results sheet) | Results - Comparison to Bouwa | B2 | **43.9 m³/min** | static | High | Audit-based demand; different from Report sheet nominal (46) |
| Existing machine FAD (Report sheet nominal) | Report | B3 | 46 m³/min | static | Medium | Nominal/rounded figure |
| Proposed Bouwa FAD | Results | C2 | **30.1 m³/min** | static | High | Rated FAD for RS132A-II |
| Proposed Bouwa FAD (Report) | Report | C3 | 30 m³/min | static | Medium | Rounded |
| Output m³/h (existing, Results) | Results | B3 | **2,634 m³/h** | `=+B2*60` | High | Derived from B2 |
| Output m³/h (proposed, Results) | Results | C3 | **1,806 m³/h** | `=+C2*60` | High | Derived from C2 |
| Average demand | — | — | Not directly stated | — | Low | Not extracted in Air Flow sheet top rows; site demand implicit in sizing |

> **Note:** Unlike the Ingrain scenario (which had explicit min/avg/peak rows in Air Flow Result Input), the Element Six workbook's Air Flow sheet (rows 1–30 visible) appears to use a similar 24-hour hourly average structure but the min/max/avg summary rows were not in the top 30 rows. The demand used in cost calculations is driven by the effective kW set in rows B4/C4 of the Results sheet (250 kW / 132 kW), not a measured average m³/min.

### 2B. Machine kW and Motor Efficiency

| Field | Sheet | Cell | Value | Formula | Confidence | Notes |
|---|---|---|---|---|---|---|
| Current machine kW | Results | B4 | **250 kW** | static | High | |
| Current machine kW (Report) | Report | B5 | 250 kW | static | High | Consistent |
| Proposed Bouwa kW | Results | C4 | **132 kW** | static | High | |
| Proposed Bouwa kW (Report) | Report | C5 | 132 kW | static | High | Consistent |
| Effective input kW (current) | Results | B7 | **250** | `=B4` | High | Pass-through |
| Effective input kW (proposed) | Results | C7 | **132** | `=C4` | High | Pass-through |
| Motor efficiency (current) | Results | B10 | **0.94 (94%)** | static | High | Different from Ingrain L160 (87%) |
| Motor efficiency (proposed) | Results | C10 | **0.96 (96%)** | static | High | Same as Ingrain scenario proposed |
| Motor efficiency (Report — formula basis) | Report | B11 | ~0.087 | unusual formula | Low | Report B11 = 0.087 appears to be `kW/(efficiency × FAD)` derived, not direct efficiency. Do not use for motor efficiency. Use Results!B10 = 0.94 |

### 2C. Efficiency (kW/m³)

| Field | Sheet | Cell | Value | Formula | Confidence | Notes |
|---|---|---|---|---|---|---|
| kW/m³ (current, Results) | Results | B9 | **0.1010** | `=B7/(B10*B8)` → 250/(0.94×2634) | High | Lower than Ingrain L160 (0.1315) — motor efficiency 94% vs 87% |
| kW/m³ (proposed, Results) | Results | C9 | **0.0761** | `=C7/(C10*C8)` → 132/(0.96×1806) | High | Lower than Ingrain RS132 (0.0928) — higher motor eff assumption |
| kW/(m³/min) current | Derived | — | **~6.07** | 0.1010 × 60 | Derived | For comparison with app |
| kW/(m³/min) proposed | Derived | — | **~4.57** | 0.0761 × 60 | Derived | For comparison with app |

### 2D. Production Days / Operating Profile

| Field | Sheet | Cell | Value | Formula | Confidence |
|---|---|---|---|---|---|
| LDS Work days | Day Calculations | K2 | **186** | `=+L3+L2` (35+151) | High |
| LDS Saturday | Day Calculations | K3 | **42** | static | High |
| LDS Sunday | Day Calculations | K4 | **44** | static | High |
| HDS Work days | Day Calculations | K5 | **64** | `=+L7+L6` (13+51) | High |
| HDS Saturday | Day Calculations | K6 | **13** | static | High |
| HDS Sunday | Day Calculations | K7 | **15** | static | High |
| Total production days | Day Calculations | K8 | **364** | `=SUM(K2:K7)` | High |

> **Observation:** The Day Calculations day distribution is **identical** to the Ingrain scenario (186/42/44/64/13/15 = 364). Either both sites share the same Eskom calendar assumption, or this is a template default.

### 2E. Electricity Tariff Rates

> **Two rate sets are present in this workbook**, mirroring the Ingrain workbook structure:
> - **Set A (Eskom Tariff sheet → Results/Report sheet):** Used in cost calculations — pulled via `='Eskom Tariff'!R9/100` type formulas.
> - **Set B (Electricity Rates sheet — derived from bill data):** Higher-level rates used as a secondary reference.

#### Set A — Eskom Tariff sheet (used in calculations, pulled by Results/Report sheets):

| Rate | Cell in Results | Value (R/kWh) | Source formula | Notes |
|---|---|---|---|---|
| LDS Standard | B13 | **1.3524** | `='Eskom Tariff'!R9/100` | From Eskom Tariff sheet row 9 |
| LDS Peak | B14 | **1.9646** | `='Eskom Tariff'!P9/100` | |
| LDS Off-Peak | B15 | **0.8590** | `='Eskom Tariff'!T9/100` | |
| HDS Standard | B16 | **1.8247** | `='Eskom Tariff'!L9/100` | |
| HDS Peak | B17 | **6.0234** | `='Eskom Tariff'!J9/100` | |
| HDS Off-Peak | B18 | **0.9911** | `='Eskom Tariff'!N9/100` | |

> **VAT status:** `Eskom Tariff!W7 = "VAT incl"` — column W values include VAT. The W1 error (see Section 4) is a column heading reference, not an energy rate cell. The rates in columns J/L/N/P/R/T (row 9) are the source for the energy rate formulas above.

#### Set B — Electricity Rates sheet (reference/secondary):

| Period | Cell | Value (R/kWh) | Formula |
|---|---|---|---|
| LDS Peak | O1 | **2.2919** | `=87227.42/38059` (bill-derived ratio) |
| LDS Standard | O2 | **1.6311** | `=121453.34/74461` |
| LDS Off-Peak | O3 | **1.0979** | `=135724.59/123622` |
| HDS Peak | O6 | **5.3783** | `=269265.56/50065` |
| HDS Standard | O7 | **2.1322** | `=222610.88/104404` |
| HDS Off-Peak | O8 | **1.2365** | `=183846.53/148683` |

> **Note:** Set B rates differ significantly from Set A. Set B appears to be **derived from a customer electricity bill** (total cost ÷ total kWh per period). Set B LDS Peak = R2.29 vs Set A = R1.96. The **calculations use Set A** (Eskom Tariff sheet rates). Set B is informational only.

### 2F. Annual Energy Costs

| Description | Sheet | Cell | Value (R) | Formula / Notes |
|---|---|---|---|---|
| LDS Work Days — ML250 daily cost | Results | F12 | 3,374.85/day | `='Calculations - Compare'!C46` |
| LDS Work Days — Bouwa RS132A daily cost | Results | G12 | 2,544.74/day | `='Calculations - Compare'!D46` |
| LDS Saturday — ML250 | Results | F13 | 2,507.12/day | `='Calculations - Compare'!C47` |
| LDS Saturday — Bouwa | Results | G13 | 1,890.44/day | `='Calculations - Compare'!D47` |
| LDS Sunday — ML250 | Results | F14 | 2,143.60/day | `='Calculations - Compare'!C48` |
| LDS Sunday — Bouwa | Results | G14 | 1,616.34/day | `='Calculations - Compare'!D48` |
| HDS Work Days — ML250 | Results | F15 | 5,831.63/day | `='Calculations - Compare'!C49` |
| HDS Work Days — Bouwa | Results | G15 | 4,397.22/day | `='Calculations - Compare'!D49` |
| HDS Saturday — ML250 | Results | F16 | 3,087.41/day | `='Calculations - Compare'!C50` |
| HDS Saturday — Bouwa | Results | G16 | 2,328.00/day | `='Calculations - Compare'!D50` |
| HDS Sunday — ML250 | Results | F17 | 2,473.25/day | `='Calculations - Compare'!C51` |
| HDS Sunday — Bouwa | Results | G17 | 1,864.90/day | `='Calculations - Compare'!D51` |
| **Annual total — ML250** | Results | F29 | **R 1,277,798.94** | `=SUM(F21:F27)` |
| **Annual total — Bouwa RS132A** | Results | G29 | **R 963,498.61** | `=SUM(G21:G26)` |
| VSD saving credit (14%) | Results | G30 | **R 134,889.81** | `=G29*14%` |
| **Annual saving (Annum)** | Results | G31 | **R 449,190.14** | `=F29-G29+G30` |

> **Formula for annual saving:** `annualSaving = ML250_annual − Bouwa_annual + (Bouwa_annual × 14%)`  
> This is the same methodology as the Ingrain scenario (VSD 14% credit added back to saving), but the formula direction is: saving = (old − new) + VSD_credit_on_new.

### 2G. ROI Inputs and Outputs

| Field | Sheet | Cell | Value | Formula | Notes |
|---|---|---|---|---|---|
| New machine unit price | ROI Calculation | B5 | **R 838,350** | static | For one RS132 machine |
| Quantity | ROI Calculation | C5 | **1** | static | Only 1 machine replacing ML250 |
| Gross machine cost | ROI Calculation | D5 | **R 838,350** | `=B5*C5` | 1 × R838,350 |
| Annual savings (from Results G31) | ROI Calculation | B6 / D6 | **R 449,190.14** | `='Results - Comparison to Bouwa'!G31` | Primary saving |
| Buy-back machine 1 | ROI Calculation | B7 / D7 | **R 200,000** | static | ML250 buy-back |
| Buy-back machine 2 | ROI Calculation | B8 / D8 | **R 120,000** | static | Second machine buy-back (purpose unclear — ML250 is listed as 1 machine) |
| Refurbishment cost | ROI Calculation | B9 / D9 | **R 0** | static | No refurbishment cost in this proposal |
| **Net initial investment** | ROI Calculation | B12 | **R 518,350** | `=B5+B9-B8-B7` → 838,350+0−120,000−200,000 | |
| **ROI %** | ROI Calculation | B11 | **86.66%** | `=(B6/B12)*100/100` | R449,190 / R518,350 = 86.66% |
| **Payback period (years)** | ROI Calculation | B13 | **1.154 years** | `=B12/B6` | R518,350 / R449,190 |
| **Payback period (months)** | ROI Calculation | C13 | **13.85 months** | `=B13*12` | |
| VAT included? | — | — | **Excluded** | Consistent with Ingrain workbook convention | |

> **Two buy-backs noted:** The ROI sheet lists "Buy back Machine 1" (R200,000) and "Buy back Machine 2" (R120,000). Only 1 existing machine (ML250) is identified in the Results sheet. The second buy-back may refer to a secondary compressor on-site (not modelled in the air comparison), or could be a legacy field from the Ingrain template. **Requires ARS clarification.**

---

## 3. Formula Chain Review

### 3A. Results - Comparison to Bouwa
- **Rates** pulled from `'Eskom Tariff'` sheet via cells `J9`, `L9`, `N9`, `P9`, `R9`, `T9` (divided by 100 to convert from c/kWh to R/kWh).
- **Daily costs** pulled from `'Calculations - Compare'` sheet columns C and D (ML250 and Bouwa columns).
- **Annual cost** = sum of (days × daily cost) for each day type (LDS/HDS × Work/Sat/Sun): `F21 = F2 × F12` etc.
- **Annual saving** = `F29 − G29 + G30` where G30 = VSD credit (14% of Bouwa annual cost).
- **Formula basis is identical to Ingrain workbook structure.** Same sheet references, same VSD 14% credit.

### 3B. ROI Calculation
- Straightforward: `netInvestment = unitPrice + refurb − buyback1 − buyback2`
- `ROI = annualSaving / netInvestment`
- `payback = netInvestment / annualSaving`
- Annual saving B6 links directly to `'Results - Comparison to Bouwa'!G31`
- No compound or secondary scenario — one row only (unlike Ingrain which had two sets of rows for L160 + L250 scenarios)

### 3C. Electricity Rates
- Rates are **bill-ratio derived**: `R/kWh = totalBillAmount / totalKWh` per period
- These are informational / secondary — calculations use Set A from Eskom Tariff sheet
- No direct link from Electricity Rates sheet to other sheets (formula-free values other than division)

### 3D. Eskom Tariff
- Standard Eskom tariff table (all categories, voltage bands)
- Rows used by Results sheet: Row 9 (likely "Megaflex" or "Businessrate" row — exact category label not confirmed from extraction)
- Column references: J (HDS Peak), L (HDS Standard), N (HDS Off-Peak), P (LDS Peak), R (LDS Standard), T (LDS Off-Peak)
- W1 = **23** (a numeric value — see Section 4)

### 3E. Calculations - Compare
- Provides **daily cost per day type** for ML250 (col C) and Bouwa (col D), fed into Results sheet
- Rows 46–51 correspond to LDS Work / LDS Sat / LDS Sun / HDS Work / HDS Sat / HDS Sun (same structure as Ingrain)
- Per-m³ cost breakdown at top (rows 2–7) references Results sheet B21–B26 / C21–C26 — circular in appearance but one-direction (Calculations → Results → Calculations uses Eskom Tariff rates as leaf nodes)

### 3F. Day Calculations
- Enumerates every production day in the calendar year, classifying each as HDS or LDS, Work/Sat/Sun
- Subtotals K2:K8 used directly in Results/Report sheets
- Identical structure to Ingrain

### 3G. Calcualtion - Optimisor (typo in sheet name preserved)
- 1,332 formulas, hidden — optimiser/TOU peak-shifting worksheet
- Not inspected in detail; same role as Ingrain optimiser sheet
- Not used for primary energy cost / ROI calculations

---

## 4. Eskom Tariff W1 = 23 — #REF! Investigation

### What the extraction shows
From extraction:
```
=== Eskom Tariff rows 1-5 cols A-AD ===
  G1 = "Back to menu"
  W1 = 23          ← numeric value
  W7 = "VAT incl"  ← column W header label
  W8 = 20.14       formula=[ROUND(V8 * (1 + VAT), 2)]
  W9 = 18.4        formula=[ROUND(V9 * (1 + VAT), 2)]
  W10 = 17.91      formula=[ROUND(V10 * (1 + VAT), 2)]
```

### Analysis
- The `xlsx` library (reading with `data_only=true`) extracted **W1 = 23** (numeric) rather than `#REF!`. The `#REF!` visible in the Excel UI is the **formula** in W1 referencing a range that no longer exists, but the **cached value** stored in the file is `23`.
- W7 = "VAT incl" — column W is the **VAT-inclusive column** of the network capacity charge table.
- W8–W10 formulas: `=ROUND(V8 * (1 + VAT), 2)` — column W applies VAT to column V (network capacity charge R/kVA/month).
- **W1 is a column heading cell** (likely a cross-reference/navigation link that points to a deleted named range or hyperlink), **not an energy rate cell**.

### Is W1 used by the calculation chain?
- The energy rate formulas in Results sheet pull from columns **J, L, N, P, R, T** of the Eskom Tariff sheet (active energy charges).
- W1 (column W row 1) is in the **network capacity charge** area (not active energy charges).
- None of the identified formula chains in Results, ROI, or Calculations - Compare reference W1.
- **W1 = #REF! does NOT affect tariff rates, annual costs, annual savings, or ROI values.**

### Conclusion on W1
| Question | Answer |
|---|---|
| Is W1 used by energy rate formulas? | No — W col is network capacity charge (not active energy c/kWh) |
| Does it affect annual cost / savings? | No |
| Does it affect ROI / payback? | No |
| Can it be ignored for validation purposes? | **Yes — safely ignored** |
| Should it be fixed? | Only if network capacity charges are needed for a full Eskom bill model |
| Dependent formulas? | W8–W10 reference W-column VAT logic, but those cells are not referenced by cost calculations |

---

## 5. Comparison to Ingrain Scenario 1

| Aspect | Ingrain (Scenario 1) | Element Six (Scenario 2) | Same? |
|---|---|---|---|
| Sheet structure | 14 sheets | 13 sheets (no GRAPHS tab) | Very similar |
| Results - Comparison to Bouwa | Present | Present | ✅ Same |
| ROI Calculation | Present | Present | ✅ Same |
| Air Flow Result Input | Present, 15-min data | Present, hourly data | Same sheet, different data |
| Eskom Tariff | Present | Present | ✅ Same |
| Electricity Rates | Present | Present | ✅ Same |
| Day Calculations | Present | Present | ✅ Same |
| Calculations - Compare | Present | Present | ✅ Same |
| Calcualtion - Optimisor | Present | Present | ✅ Same |
| Existing machine | CompAir L160 (184 kW) | CompAir ML250 (250 kW) | **Different** — larger machine |
| Proposed Bouwa model | SVC-RS132-II | SVC-RS132A-II | **Variant** — check "A" suffix |
| Proposed Bouwa kW | 132 kW | 132 kW | ✅ Same kW |
| Motor eff (existing) | 87% | 94% | **Different** |
| Motor eff (proposed) | 96% | 96% | ✅ Same |
| Annual saving | R 1,110,997 | **R 449,190** | **Different — smaller saving** |
| Machine price | R 984,810 (×2) | **R 838,350 (×1)** | **Different — 1 machine, lower price** |
| Net investment | R 2,297,860 | **R 518,350** | **Much lower** |
| ROI % | 48.35% | **86.66%** | **Much higher** |
| Payback | 7.35 months | **13.85 months** | Element Six longer payback |
| VSD 14% credit | Yes (`G29*14%`) | Yes (`G29*14%`) | ✅ Same methodology |
| Formula chain | Eskom Tariff → Results → ROI | Eskom Tariff → Results → ROI | ✅ Same |
| Tariff rates used | Set A from Eskom Tariff sheet | Set A from Eskom Tariff sheet (different row values) | Same structure, different values |
| VAT treatment | Excluded | Excluded | ✅ Same |
| Number of machines | 2 (L160 + L250) | 1 (ML250 only) | **Different** |
| Production days | 364 (186/42/44/64/13/15) | 364 (186/42/44/64/13/15) | ✅ Identical calendar |

### Formula differences
- **Annual saving formula:** Both use `F29 − G29 + G30` (same). 
- **ROI formula:** Both use `annualSaving / netInvestment`. Element Six is `449,190 / 518,350 = 86.66%`. Simple ROI, same formula.
- **Payback:** Both use `netInvestment / annualSaving`. No combined-savings discrepancy like Ingrain (which mixed L160+L250 for payback).
- **Net investment calculation:** Element Six has **zero refurbishment** and two buy-backs, giving a much lower net investment.

### App calculation module compatibility
All existing modules can calculate Element Six using the same engine:
- `tariffEngine.ts` — same structure, different rate values
- `energyCostEngine.ts` — same formula (gross → VSD 14% → net)
- `roiEngine.ts` — same formula (direct ROI, no combined scenario complexity)
- `compressorPerformance.ts` — same kW/m³ formula
- `altitudeCorrection.ts` — applicable (site at 5,337 ft → ~24.5% FAD loss)

New input fields needed (not in Ingrain scenario):
- `motorEfficiency` for current machine = **0.94** (Ingrain was 0.87 — different value; the engine already accepts this as a parameter)
- Single machine ROI (no combined scenario)

---

## 6. Altitude Correction — Element Six Site

From `Effect Output calc!B58` section:

| Field | Cell | Value |
|---|---|---|
| Site name | B58 | Element Six |
| Machine modelled | C61 | **Bouwa® SVC-RS90-II** ← note: RS90, not RS132 |
| FAD at sea level | D62 | **20.2 m³/min** |
| Altitude | D63 | **5,337 ft (~1,627 m)** |
| Ambient temp | D64 | 25°C |
| Site pressure (Pi) | D71 | **0.8351 bar** (`=(1.013−(5337/30/1000))`) |
| Corrected FAD (Qn) | D76 | **15.26 m³/min** |
| Altitude efficiency | D80 | **75.52%** |
| FAD loss | D81 | **~24.5%** |

> **Key observation:** The altitude correction section models a **Bouwa SVC-RS90-II** (90 kW, 20.2 m³/min FAD), **not** the RS132A-II used in the main proposal. The Effect Output calc sheet appears to be a general-purpose reference showing several machine examples. The RS90 section may be for context (e.g., evaluating a smaller machine or a different phase of the proposal). The main Results and ROI sheets consistently use the RS132A-II at 132 kW / 30.1 m³/min.
>
> At 5,337 ft altitude, the altitude correction **is significant** (~24.5% FAD reduction). The proposed Bouwa RS132A-II rated FAD of 30.1 m³/min must be understood as the **site-corrected** figure already, or the correction must be applied. This is a critical gap to confirm with ARS/Bouwa.

---

## 7. Scenario Readiness

**Classification: Ready after manual confirmation of specific cells**

Reasons it is NOT fully "ready to add as-is":

| Item | Status | Action required |
|---|---|---|
| Model variant "SVC-RS132A-II" vs "SVC-RS132-II" | ⚠️ Unconfirmed | Confirm with Bouwa whether "A" suffix changes FAD/kW/price spec |
| Two buy-backs (R200K + R120K) with only 1 visible machine | ⚠️ Unconfirmed | Confirm what second machine (R120K buy-back) refers to |
| FAD 43.9 m³/min vs 46 m³/min discrepancy | ⚠️ Noted | Results sheet (43.9) should be used — confirm with ARS |
| Altitude: RS90 in Effect Output calc vs RS132A in proposal | ⚠️ Noted | Confirm whether RS132A-II FAD of 30.1 m³/min is already altitude-corrected |
| Eskom tariff year / category | ⚠️ Unconfirmed | Tariff row 9 used — confirm tariff category (Megaflex, Businessrate?) and effective date |
| Motor efficiency current machine 94% (not 87% like Ingrain) | ✅ Extracted | Set motor efficiency = 0.94 for ML250 in scenario config |
| W1 #REF! error | ✅ Can ignore | Doesn't affect calculation chain (see Section 4) |
| Annual saving R449,190 vs full Ingrain saving R1.1M | ✅ Expected | Smaller saving because RS132 replaces one ML250 at partial match |

---

## 8. Recommended Next Implementation Step

**Option A: Add Element Six as static validation scenario 2 using mapped cells — after confirming 3 items**

Required confirmations before implementation:
1. **Confirm model variant:** Is SVC-RS132A-II the same machine as SVC-RS132-II? Same FAD (30.1 m³/min), same kW (132), same price (~R838,350)?
2. **Confirm two buy-backs:** What are the two machines being bought back? Is there a second (smaller) compressor on-site?
3. **Confirm altitude-corrected FAD:** Is the 30.1 m³/min already the site-altitude-corrected figure, or is it the sea-level rating that needs applying `altitudeCorrection.ts`?

Once confirmed, add to `elementSixReferenceScenario.ts` with these static values:
```ts
// Element Six — Validation Scenario 2 (static reference)
const ML250_SPEC = { kW: 250, fadM3Min: 43.9, motorEfficiency: 0.94 };
const BOUWA_RS132A_SPEC = { kW: 132, fadM3Min: 30.1, motorEfficiency: 0.96 };
const ROI_INPUT = {
  unitPrice: 838350, quantity: 1,
  buyback: 320000,   // 200000 + 120000
  refurb: 0,
  annualSavingR: 449190.14,
  netInvestment: 518350,
  roiPct: 86.66,
  paybackMonths: 13.85
};
const TARIFF_RATES = {  // Set A from Eskom Tariff sheet, row 9
  ldsStandard: 1.3524, ldsPeak: 1.9646, ldsOffPeak: 0.8590,
  hdsStandard: 1.8247, hdsPeak: 6.0234, hdsOffPeak: 0.9911
};
const DAY_PROFILE = {
  ldsWorkDays: 186, ldsSaturdays: 42, ldsSundays: 44,
  hdsWorkDays: 64, hdsSaturdays: 13, hdsSundays: 15, total: 364
};
```

---

## 9. Final 10-Bullet Summary

- **Mapping doc created:** `src/features/bouwa/docs/element-six-validation-map.md` — this file
- **Customer/machine/proposed model identified:** Element Six site; existing CompAir ML250 (250 kW, 43.9 m³/min); proposed BOUWA® SVC-RS132A-II (132 kW, 30.1 m³/min, 1 machine)
- **Key values successfully mapped:** Annual saving R449,190; ML250 annual cost R1,277,799; Bouwa annual cost R963,499; VSD credit R134,890; net investment R518,350; ROI 86.66%; payback 13.85 months; machine price R838,350; tariff rates extracted (Set A from Eskom Tariff sheet row 9)
- **Eskom Tariff W1 impact:** W1 = #REF! in Excel UI but cached value is 23 (a column heading/nav link). It is in the **network capacity charge column** and is **not referenced** by any energy rate or cost formula. Safe to ignore for this validation scenario.
- **Similarity to Ingrain:** Same sheet structure, same formula methodology (Eskom Tariff → Results → ROI), same VSD 14% credit, identical day calendar. Key differences: single machine (vs two), different motor efficiency (94% vs 87%), different machine price, no refurbishment cost, much higher ROI (86.66% vs 48.35%).
- **Scenario readiness:** Ready after manual confirmation of 3 items: (1) SVC-RS132A-II model variant, (2) two buy-backs explanation, (3) altitude-corrected FAD clarification
- **Recommended next step:** Option A — add as static validation scenario 2 using the mapped values above, after ARS confirms the 3 open items. All existing calculation modules are compatible.
- **Git status:** No commits. New file only: `src/features/bouwa/docs/element-six-validation-map.md` (unstaged). Temp extraction files `lead-management-system/temp_e6_extract.cjs` and `temp_e6_output.txt` can be deleted.
- **Confirmation:** No app code changed. No backend touched. No production server accessed. No database written. No packages installed. No commits or pushes performed.

---

*Extraction method: Node.js + `xlsx` library (from lead-management-system node_modules), read-only, data-only mode.*  
*Phase 4D-21A — workbook mapping only.*
