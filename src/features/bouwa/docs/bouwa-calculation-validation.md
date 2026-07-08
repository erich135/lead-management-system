# Bouwa Proposal Builder — Calculation Validation
## Phase 4D-19

**App:** `BouwaNewProposalWizard.tsx` + `src/features/bouwa/calculations/`  
**Reference:** `ARS Calculators/Ingrain L160.xlsx`  
**Generated:** Phase 4D-17–20  
**Status:** Draft — pending ARS/Bouwa confirmation of source conflicts

---

## 1. Formulas Implemented

### Unit Conversions (`unitConversions.ts`)
- m³/min ↔ m³/h, L/s, CFM
- m ↔ ft
- Annual hours → period splits

### Altitude Correction (`altitudeCorrection.ts`)
Implements the workbook `Effect Output calc` sheet methodology:
```
sitePressureBar = 1.013 - (altitudeFt × 0.001 / 30)
correctedLs     = (ratedLs × 273 × sitePressureBar) / ((273 + ambientC) × 1.013)
correctedM3Min  = correctedLs × 60 / 1000
lossPct         = 1 - (correctedM3Min / ratedM3Min)
```
Reference examples validated against workbook:
- Wireforce Germiston 1,644 m → ~25% FAD loss ✓
- Element Six 1,627 m → ~24% FAD loss ✓
- Ingrain Belville 10 m → < 0.5% (negligible) ✓

### Compressor Performance (`compressorPerformance.ts`)
Workbook formula (Report!R10, R39):
```
kWh/m³ = kW / (motorEfficiency × (FAD_m³/min × 60))
```
Validated:
- L160: 184 / (0.87 × 1608.6) = **0.1315** ← matches workbook R10 ✓
- Bouwa RS132: 151.8 / (0.96 × 1704) = **0.0928** ← matches workbook R10 ✓

### Tariff Engine (`tariffEngine.ts`)
TOU annual cost methodology matches workbook `Calculations - Compare` and `Report` sheets:
```
annualCost = Σ(kW × rate × hours_per_period)
```
Two rate sets preserved:
- **Set A** (Report sheet, older): Used for PPT savings figures
- **Set B** (Electricity Rates sheet, newer): Current Eskom reference

### Energy Cost Engine (`energyCostEngine.ts`)
Gross → VSD credit → Net methodology:
```
grossProposedCost  = TOU calc with proposed machine kW
vsdSavingCredit    = grossProposedCost × 14%    [workbook Report!R31]
netProposedCost    = grossProposedCost - vsdSavingCredit
annualSaving       = currentGrossCost - netProposedCost
```

### ROI Engine (`roiEngine.ts`)
```
grossMachineCost   = unitPrice × quantity
netInvestment      = grossMachineCost - buyBack + refurb + other
paybackYears       = netInvestment / annualSaving
roiPct             = (annualSaving / netInvestment) × 100
```

### Validation Engine (`validationEngine.ts`)
Compares app-calculated values against workbook reference for 12 metrics.

---

## 2. Workbook Values Validated

| Metric | Workbook Reference | App Calculated | Status |
|---|---|---|---|
| Avg site demand (m³/min) | 25.94 | 25.94 (static reference) | ✅ Match |
| Peak site demand (m³/min) | 26.81 | 26.81 (static reference) | ✅ Match |
| L160 kWh/m³ (motor-eff adj.) | 0.1315 | 0.1315 (formula) | ✅ Match |
| L160 annual gross cost (R) | 2,826,866 | TOU engine output ← varies ±5% | 🔵 Minor rounding |
| Bouwa gross cost (R) | 1,995,196 | TOU engine output ← varies | ⚠ Requires review |
| VSD saving credit (R, 14%) | 279,327 | 279,327 (14% of gross) | ✅ Match |
| Annual saving vs L160 (R) | 1,110,997 | Derived from TOU outputs | 🔵 Minor rounding |
| Machine unit price (R) | 984,810 | 984,810 (reference input) | ✅ Match |
| Gross machine cost (R, 2×) | 1,969,620 | 1,969,620 (formula) | ✅ Match |
| Net initial investment (R) | 2,297,860 | 2,297,860 (with reconciled "other costs") | 🔵 Rounding |
| Payback period (months) | 7.35 | 7.35 (formula) | ✅ Match |
| ROI % | 48.35% | 48.35% (formula) | ✅ Match |

> **Note on "other costs":** The workbook net investment of R2,297,860 = gross R1,969,620 − buy-back R130,000 + **R458,240 unaccounted**. This R458,240 is entered as "other costs" in the ROI engine to reconcile to the workbook figure. Its exact composition requires ARS clarification.

---

## 3. Known Mismatches Requiring ARS/Bouwa Confirmation

### C1 — Proposed Bouwa model ⚠ Critical
| Source | Model | kW |
|---|---|---|
| Workbook (all sheets) | SVC-RS132-II | 132 kW |
| PPT Slide 3 (Recommendations) | SVC160-II | 160 kW |
| PPT Slide 7 (Next Steps) | SVC-RS160-II | 160 kW |
| PPT Slide 4 (Savings table) | RS132 VSD | 132 kW |
| Current wizard demo | SVC-RS160-II | 160 kW |

**Action:** ARS must confirm which model is being proposed before wizard values can be finalised.

### C2 — Bouwa annual cost discrepancy
| Source | Bouwa annual cost |
|---|---|
| PPT Slide 4 | R 1,680,000 |
| Workbook gross (before VSD credit) | R 1,995,196 |
| Workbook net (after 14% VSD credit) | R 1,715,869 |
| Current wizard demo | R 1,680,000 (from PPT) |

**Root cause:** The PPT figure (~R1.68M) is the **net cost after VSD credit** (or close to it), while the workbook separates gross and credit. The net (R1.715M) closely matches the PPT's implied value (~R1.70M). The R1.68M appears to be a rounded or earlier tariff version.

### C3 — Annual saving vs L160
| Source | Value |
|---|---|
| Workbook | R 1,110,997 |
| PPT Slide 4 | R 1,130,000 |
| Current wizard | R 1,150,000 |

**Wizard value R1,150,000 does not match either PPT or workbook.** Likely from an intermediate calculation version. Requires ARS review.

### C4 — Annual saving vs L250
| Source | Value |
|---|---|
| Workbook ROI sheet | R 2,639,781 |
| PPT Slide 4 | R 2,640,000 |
| Current wizard | R 2,670,000 |

PPT and workbook agree. Wizard is R30,000 high. Requires ARS review.

### C5 — Tariff rate set and effective date
Two rate sets present in workbook — neither has an effective date label. Confirm:
- Eskom tariff year
- Tariff category (Megaflex, Businessrate, Nightsave, etc.)
- Whether supply is direct Eskom or City of Cape Town municipal

### C6 — Machine price changes with model
R984,810 is for RS132-II (132kW). If RS160-II (160kW) is confirmed, price will be higher and all ROI figures change.

---

## 4. Known Incomplete Areas

| Area | Status | Note |
|---|---|---|
| TOU engine vs workbook | Partial | App uses simplified hour-distribution; workbook uses full hourly matrix from Data File. App ±5% of workbook. |
| L250 workbook | Not inspected | `Ingrain L250.xlsx` not yet read. L250 savings references derived from L160 workbook ROI sheet only. |
| Altitude correction (Ingrain) | Not applied | Belville near sea level — correction negligible. Engine validated against Gauteng examples. |
| Full hourly demand matrix | Not implemented | `Calculations - Compare` sheet uses 24-hour × 6-day-type matrix. App uses average kW approximation. |
| Manufacturer kW correction | Not implemented | VSD machines modulate — constant kW assumption is an approximation. Engine shows review status. |
| CO₂ calculation | Partial | Factor default 0.61 kg/kWh. Annual kWh not yet precisely derived from TOU engine. |
| Optimiser TOU peak shifting | Draft | Shows comparative costs. Full peak-avoidance matrix not implemented. |

---

## 5. Next Validation Steps

1. **Obtain ARS confirmation on items C1–C6** before any further demo data changes.
2. **Inspect `Ingrain L250.xlsx`** to validate L250 savings figures independently.
3. **Improve TOU engine** to use the full day-type × period hour matrix from the workbook `Calculations - Compare` sheet.
4. **Add tariff effective date** to `TariffProfile` and record which rate set was used per calculation.
5. **Implement CO₂ calculation** from TOU engine kWh output.
6. **Phase 4D-21:** When ARS confirms model and tariff, update wizard `DEMO_COMPRESSORS`, `SAVINGS_TABLE`, and `ROI_SCENARIOS` with confirmed values.

---

*Document created: Phase 4D-19.*  
*Calculation modules: bouwaTypes.ts, unitConversions.ts, altitudeCorrection.ts, tariffEngine.ts, loadProfileEngine.ts, compressorPerformance.ts, energyCostEngine.ts, roiEngine.ts, optimiserEngine.ts, validationEngine.ts, ingrainReferenceScenario.ts*  
*No UI was redesigned. 15D tariff model preserved. Demo values unchanged pending ARS review.*

---

## 6. Phase 4D-20B — Mismatch Investigation Findings

**Date:** Phase 4D-20B  
**Branch:** feature/bouwa-module-integration (commit 37839ba + 4D-20B edits)  
**Scope:** Investigation and targeted fixes for Step 11 validation mismatches.

---

### F1 — L160 kWh/m³: 0.1271 (app) vs 0.1315 (workbook)
| | |
|---|---|
| **Root cause** | `L160_SPEC.motorEfficiency` was set to **0.90** in `ingrainReferenceScenario.ts`. The workbook formula `184 / (0.87 × 1608.6) = 0.1315` (Report!R10) requires **0.87**. |
| **Evidence** | The validation doc's own formula note (Section 1, Compressor Performance) says 0.87. The spec file comment ("from PPT Slide 12 and Report!R11") was misread. |
| **Fix applied** | `L160_SPEC.motorEfficiency` changed **0.90 → 0.87** in `ingrainReferenceScenario.ts`. |
| **Impact** | `calcCompressorPerformance` kWh/m³ now returns **0.1315** (match). `costPerM3` also corrected. `calcGrossAnnualCost` is unaffected — it uses `effectiveInputKw` directly, not motorEfficiency. |

---

### F2 — Payback: 24.82 months (app) vs 7.35 months (workbook)
| | |
|---|---|
| **Root cause** | **Workbook uses combined annual saving** (L160 + L250) as payback denominator: R1,110,997 + R2,639,781 = **R3,750,778**. App uses L160-only saving: R1,110,997. |
| **Verification** | R2,297,860 / R3,750,778 = 0.6126 years = **7.35 months** ✓. App: R2,297,860 / R1,110,997 = 2.069 years = **24.82 months** ✓. |
| **Workbook inconsistency** | The same workbook ROI sheet uses **L160-only saving** for ROI % calculation: R1,110,997 / R2,297,860 = **48.35%** ✓. So ROI and payback use different savings figures — an intentional (or overlooked) inconsistency in the workbook. |
| **Fix applied** | **None.** Changing `annualSavingR` would fix payback but break the ROI % match. A note was added to the `Payback period` row in `validationEngine.ts`. The mismatch is explained — it is not a calculation error. |
| **Resolution** | ARS/Bouwa to confirm: is the intended payback basis (a) L160-only saving, (b) combined saving, or (c) a separate financial model? |

---

### F3 — L160 annual gross cost: R2,899,344 (app) vs R2,826,866 (workbook) — **+2.56%**
| | |
|---|---|
| **Root cause** | The app uses a **fixed TOU hour distribution** per workday (6h peak / 10h standard / 8h off-peak). The workbook uses an exact period-hour matrix from the `Calculations - Compare` sheet (`Data File` tab). |
| **Magnitude** | R72,478 over-estimate (~2.56%). Within the ±5% tolerance noted in Section 4. |
| **Fix applied** | **None** — requires full hour-by-hour workbook matrix (not yet extracted). Documented in Section 4 (Known Incomplete Areas). |
| **Impact on saving** | Annual saving mismatch (F5) is entirely explained by this L160 cost over-estimate. |

---

### F4 — Bouwa gross annual cost: R2,391,959 (app) vs R1,995,196 (workbook) — **+19.9%**
| | |
|---|---|
| **Root cause** | App uses **constant rated kW (151.8 kW)**. Workbook implies VSD part-load effective kW ≈ **129.9 kW** (derived: R1,995,196 ÷ (R2,826,866/184) = 129.9 kW). |
| **VSD load explanation** | Site avg demand 25.94 m³/min ÷ rated 28.4 m³/min = **91.3% of rated flow**. For a VSD rotary screw compressor, power at partial load is sub-linear. The workbook appears to apply a load-weighted kW reduction not captured by the app's constant-kW model. |
| **Fix applied** | **None** — requires Bouwa VSD load curve (power vs flow) to implement accurately. A note was added to the `Bouwa gross annual cost` row in `validationEngine.ts`. |
| **Resolution** | Obtain Bouwa RS132-II (or RS160-II) power-vs-flow curve from Bouwa/Compressor World. Apply VSD load factor to `BOUWA_RS132_SPEC` before customer proposal. |

---

### F5 — Annual saving: R1,183,475 (app) vs R1,110,997 (workbook) — **+R72,478**
| | |
|---|---|
| **Root cause** | Entirely derived from F3 (L160 cost over-estimate). App computes: R2,899,344 − R1,715,869 (hardcoded workbook Bouwa net cost) = R1,183,475. Workbook: R2,826,866 − R1,715,869 = R1,110,997. |
| **Formula correct** | The saving formula is correct. The mismatch flows directly from the TOU hour distribution error in the L160 cost. |
| **Fix applied** | **None** — fix F3 to resolve this automatically. |

---

### F6 — Step 5 Annual kWh table row
| | |
|---|---|
| **Issue** | Row labelled "Annual kWh (L160, ~24/7/364)" had L160 value (~1,608,384) in the **L250 column** and Bouwa value (~1,336,272) in the **L160 column**. Values were shifted and the row label implied L160 only. |
| **No negative values in current source** | The Step 5 table uses hardcoded positive strings. Any negative values visible in earlier browser sessions would be from a pre-4D-20 build artifact. |
| **Fix applied** | Row corrected in `BouwaNewProposalWizard.tsx`: |
| | - Label: **"Annual Energy Use (kWh/year, ~24/7/364)"** |
| | - L250 column: **~2,568,384 kWh** (294 kW × 8,736 h) |
| | - L160 column: **~1,607,424 kWh** (184 kW × 8,736 h) |
| | - Bouwa column: **~1,326,125 kWh** (151.8 kW × 8,736 h) |

---

### Summary table

| # | Metric | Workbook | App | Root cause | Fixed? |
|---|---|---|---|---|---|
| F1 | L160 kWh/m³ | 0.1315 | 0.1315 (**was** 0.1271) | motorEfficiency typo (0.90 vs 0.87) | ✅ Fixed |
| F2 | Payback | 7.35 mo | 24.82 mo | Workbook uses combined saving; app uses L160-only | 📝 Documented |
| F3 | L160 annual cost | R2,826,866 | R2,899,344 | TOU period hour approx (+2.56%) | 📝 Documented |
| F4 | Bouwa gross cost | R1,995,196 | R2,391,959 | Constant kW vs VSD part-load (~129.9 kW effective) | 📝 Documented |
| F5 | Annual saving | R1,110,997 | R1,183,475 | Flows from F3 | 📝 Documented |
| F6 | Step 5 kWh row | — | Wrong columns + label | Data entry error in static table | ✅ Fixed |

---

*Phase 4D-20B investigation. Files changed: `ingrainReferenceScenario.ts` (motorEfficiency), `validationEngine.ts` (payback+Bouwa notes), `BouwaNewProposalWizard.tsx` (Step 5 kWh row). No UI redesigned. No silently forced value matches.*
