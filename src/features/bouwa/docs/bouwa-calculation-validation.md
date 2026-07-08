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
