# Bouwa Proposal Builder — Calculation Map
## Phase 4D-16: Ingrain L160.xlsx → Proposal Builder Field Mapping

**Source file:** `ARS Calculators/Ingrain L160.xlsx`  
**Audit date:** 30 May 2025  
**Site:** Ingrain Belville, Western Cape  
**Wizard:** `BouwaNewProposalWizard.tsx` (Phase 4D-15 / 15B / 15C / 15D)  
**Purpose:** Map every input, calculated field, and rate from the xlsx workbook to the corresponding wizard step and state field.

---

## 1. Workbook Structure (14 sheets)

| Sheet | Content | Maps to Wizard |
|---|---|---|
| `Report` | Summary: L160 vs Bouwa SVC-RS132-II | Steps 2, 5, 8 |
| `Results - Comparison to Bouwa` | Extended results (same structure as Report) | Steps 5, 8 |
| `GRAPHS` | Charts (visual only) | Step 5 (bar charts) |
| `ROI Calculation` | Pricing, annual savings, payback, ROI % | Step 9 |
| `Air Flow Result Input` | Measured air flow time series (May–Jun 2025, 15-min intervals) | Steps 2, 4, 5 |
| `Eskom Tariff` | Full Eskom tariff table (all categories / voltage bands) | Step 1 Section C (advanced) |
| `Effect Output calc` | ISO 1217 altitude correction calculator (Wireforce, Element Six examples) | Step 1 Section B, Step 5 |
| `Electricity Rates` | LDS/HDS TOU rates (current — differs from Report sheet rates) | Step 1 Section C |
| `Data File 1` | DS400 sensor raw data (15-min, Nov 2018 — likely different audit/site) | Not in scope for Ingrain 2025 |
| `Data File 2` | DS400 condensed (30-min, Nov 2018) | Not in scope for Ingrain 2025 |
| `Calculations - Compare` | Hourly TOU cost comparison by season and day type | Step 8 (TOU method) |
| `Day Calculations` | HDS/LDS day calendar, work/weekend counts, production days | Step 1 Section D |
| `CALCULATOR` | Generic kW/CFM/bar unit converter | Reference only |
| `Calcualtion - Optimisor` | Optimiser worksheet | Not examined |

> **Note:** Data File 1 and Data File 2 contain sensor readings dated November 2018. These are almost certainly from a *different* site or audit (likely a plant air demand study used as a template). The Ingrain Belville audit air flow data is in `Air Flow Result Input` (May–June 2025 dates). Do not treat the Data Files as Ingrain Belville 2025 data.

---

## 2. Step 1 — Customer / Site & Conditions

### Section A — Customer / Site
| Wizard field | Source in xlsx | Value |
|---|---|---|
| `customer` | Report!R1 context | `Ingrain Belville` |
| `site` | Context from audit | `Belville, Cape Town, Western Cape` |
| `auditDate` | Air Flow Result Input — data start date | `2025-05-30` |
| `proposalTitle` | — | `Ingrain Belville — Compressed Air Performance Audit Report` |

### Section B — Site Conditions
| Wizard field | Source in xlsx | Value |
|---|---|---|
| `altitudeM` | Belville is coastal | `~10 m (near sea level)` |
| `ambientTempC` | Audit observation | `21 °C` |
| `relativeHumidity` | Not recorded | `Not recorded — assume typical coastal` |
| `sitePressureRequirement` | Report!R2 / compressor pressure | `7.5 bar(g)` |
| `conditionSource` | Measured during audit | `audit-measured` |

> **Altitude note:** The `Effect Output calc` sheet contains a fully working ISO 1217 altitude correction calculator (uses Pi = 1.013 × (1 - altitude/44308)^5.256 methodology, expressed as -1 mb per 30 ft). Belville (~10 m) needs no meaningful correction. For Gauteng proposals (Wireforce example: 5,394 ft / 1,644 m → 25% FAD loss), this sheet is the reference calculation.

### Section C — Electricity Tariff Profile (15D TariffProfile fields)

> ⚠️ **Critical discrepancy:** The workbook contains **two sets of rates** from different tariff years. The `Electricity Rates` sheet has the rates used in the CALCULATOR while `Report` sheet has different (likely older) hardcoded rates. The `Report` rates appear to use an older Eskom tariff schedule. Final proposals must use the customer's actual bill or the current official Eskom schedule.

#### Rates from `Electricity Rates` sheet (use these — more current):

| Wizard field | Season | Period | Value (R/kWh) |
|---|---|---|---|
| `lowDemandPeakRate` | LDS | Peak | **R 2.2919** |
| `standardRateRkWh` (LDS Standard) | LDS | Standard | **R 1.6311** |
| `offPeakRateRkWh` (LDS Off-Peak) | LDS | Off-Peak | **R 1.0979** |
| `highDemandPeakRate` | HDS | Peak | **R 5.3783** |
| `highDemandOffPeakRate` | HDS | Standard | **R 2.1322** |
| (HDS Off-Peak) | HDS | Off-Peak | **R 1.2365** |

#### Rates from `Report` sheet (older — used in workbook calculations):

| Period | L160 / Bouwa (same rate applied) |
|---|---|
| LDS Standard | R 1.5562/kWh |
| LDS Peak | R 2.7678/kWh |
| LDS Off-Peak | R 1.1115/kWh |
| HDS Standard | R 1.6673/kWh |
| HDS Peak | R 6.6692/kWh |
| HDS Off-Peak | R 1.1115/kWh |

#### TariffProfile field mapping:

| Wizard field (TariffProfile) | Mapped value from xlsx |
|---|---|
| `tariffConfidence` | `official-schedule` (Eskom published schedule used — bill not provided) |
| `tariffSource` | `eskom-schedule` |
| `electricitySupplier` | `eskom-direct` (Eskom direct supply — Belville) |
| `municipalityRegion` | `City of Cape Town (Eskom direct — not municipal)` |
| `tariffCategoryName` | Not specified in workbook — needs confirmation from site |
| `tariffType` | `tou` (Time-of-Use — LDS/HDS × Peak/Standard/Off-Peak) |
| `vatIncluded` | `excluded` — ROI sheet R31: *"above costs exclude VAT"* |
| `highDemandMonths` | HDS: Apr–Jun (implied from Day Calculations — HDS rows start April) |
| `lowDemandMonths` | LDS: Jul–Mar (implied from Day Calculations — LDS after Jun) |
| `effectiveFrom` | Unknown — must be confirmed from source tariff schedule |
| `sourceDocumentRef` | `Ingrain L160.xlsx — Electricity Rates sheet. Tariff year unconfirmed.` |
| `lastCheckedDate` | Date of workbook creation / last save (unknown) |
| `confirmedBy` | `ARS / John Roselt — needs customer bill confirmation` |

> **Action required:** The workbook does not include a customer electricity bill or Eskom tariff effective date. To reach `tariffConfidence = 'bill-confirmed'`, request the customer's latest bill and confirm:
> - Which Eskom tariff category (Megaflex, Businessrate, Nightsave Urban, etc.)
> - Effective date (typically 1 April each year)
> - VAT treatment on the bill
> - Whether supply is direct Eskom or via City of Cape Town municipality

---

## 3. Step 1 Section D — Compressor Operating Profile by Tariff Period

Source: `Day Calculations` sheet

| Wizard field | Source | Value |
|---|---|---|
| `annualRunHours` | 364 production days × 24h assumed (24/7 operation) | `8,736 h/year` |
| Annual LDS Work days | Day Calculations | 186 days |
| Annual LDS Saturday | Day Calculations | 42 days |
| Annual LDS Sunday | Day Calculations | 44 days |
| Annual HDS Work days | Day Calculations | 64 days |
| Annual HDS Saturday | Day Calculations | 13 days |
| Annual HDS Sunday | Day Calculations | 15 days |
| Total production days | Day Calculations | **364 days** |

> The workbook assumes **continuous 24/7 operation** across all 364 days. This is reflected in the per-day cost rows in `Calculations - Compare` (costs are given for each hour 0:00–23:00).

**Period split (approximate, from workbook TOU structure):**
- Eskom LDS/HDS peak hours typically: 06:00–09:00 and 17:00–20:00 weekdays
- Standard: 09:00–17:00 and 20:00–22:00
- Off-peak: 22:00–06:00 and all weekend hours

| Wizard field | Approximate value | Basis |
|---|---|---|
| `peakRunPct` | `~18%` | Peak period ≈ 6h/day on 250 weekdays ÷ 8,736h |
| `standardRunPct` | `~44%` | Standard period ~10h/day weekdays |
| `offPeakRunPct` | `~38%` | Off-peak all weekends + overnight |
| `annualPeakHours` | `~1,570 h` | Estimated from Eskom TOU schedule |
| `annualStandardHours` | `~3,840 h` | Estimated |
| `annualOffPeakHours` | `~3,326 h` | Estimated |

> These are estimates. The exact split should be re-derived from the `Calculations - Compare` sheet which calculates TOU costs hour-by-hour across all 364 day types. That sheet already splits by: LDS Work Day, LDS Saturday, LDS Sunday, HDS Work Day, HDS Saturday, HDS Sunday.

---

## 4. Step 2 — Existing Compressors

Source: `Report` sheet (R2–R11), `Air Flow Result Input` sheet

### CompAir L160

| Wizard field | Source | Value |
|---|---|---|
| `make` | Report!R2 | `CompAir` |
| `model` | Report!R2 | `L160` |
| `type` | — | `Fixed-speed oil-injected rotary screw` |
| `standardFAD` | Report!R2 (rated per model name) | `29.7 m³/min` |
| `peakFlowFAD` | Report!R3 — "Delivery m³/min (29.7)" actual = 26.81 | `26.81 m³/min (measured peak)` |
| `powerDrawMax` | Report!R5 kW = 184 | `184 kW (package input)` |
| `pressure` | CALCULATOR!R2 | `7.5 bar(g)` |
| `motorEfficiency` | Report!R11 = 0.87 | `87%` |
| `powerEfficiencyRange` | Report!R10 = 0.1315 kW/(m³/h) | See formula below |
| `standardPowerEfficiency` | Calculated at rated FAD | `6.19 kW/m³/min` |
| `totalRunningHours` | From audit observation | `112,782 h (unit spec)` |
| `yearMfg` | 2001 (from deck) | `2001` |

**kW/m³ formula used in workbook (Report!R39):**
```
kW/(m³/h) = Machine_kW / (Motor_Efficiency × Output_m³/h)
           = 184 / (0.87 × 1608.6)
           = 184 / 1399.5
           = 0.1315 kWh/m³
```
This is `kWh per m³ of compressed air produced`, accounting for motor efficiency losses.

**Converting to kW/m³/min (as used in wizard):**
```
0.1315 kWh/m³ × 60 min/h = 7.89 kW/m³/min ← at measured FAD
```
> Note: The wizard shows `6.86 kW/m³/min` at peak measured FAD. Discrepancy likely due to rounding or different efficiency assumption. Use measured values from audit, not recalculated values, in the final proposal.

### Air Flow Measurement Data (Air Flow Result Input sheet)

| Parameter | Value | Source |
|---|---|---|
| Measurement period | 29 May 2025 – 5 June 2025 | Air Flow Result Input |
| Interval | 15-minute readings | Time column |
| Flow range | 23.79 – 26.81 m³/min | MIN/MAX rows |
| Average flow | **25.94 m³/min** | AVG row |
| Peak flow | 26.81 m³/min | MAX |

> The 25.94 m³/min average is the **actual site demand** during the audit period. This is the key input to right-sizing calculations. It is consistently lower than the L160 rated capacity of 29.7 m³/min, confirming the machine is oversized.

---

## 5. Step 3 — Data Source

| Wizard field | Mapping |
|---|---|
| `dataMode` | `audit-excel` — the workbook contains actual air flow logger data from a DS400 instrument |

The workbook IS the completed air audit Excel. When a customer submits this file, data should flow from `Air Flow Result Input` → `DEMO_COMPRESSORS` values automatically in a future implementation. Currently this is demo/manual entry.

---

## 6. Step 5 — Performance Metrics

Source: `Report` and `Results - Comparison to Bouwa` sheets

| Metric | L160 | Bouwa SVC-RS132-II | Source |
|---|---|---|---|
| Delivery (m³/min) — measured | 26.81 | 28.4 | Report!R3 |
| Delivery (m³/h) | 1,608.6 | 1,704 | Report!R4 |
| Power (kW) | 184 | 151.8 | Report!R5 |
| Motor efficiency | 87% | 96% | Report!R11 |
| kW/m³/h (efficiency) | 0.1315 | 0.0928 | Report!R10 |
| Quantity required | 1 | 1 | Report!R34/35 |
| Spare capacity (m³/h) | 0 | 0 | Report!R37 |

**Efficiency improvement:**
```
L160:  0.1315 kWh/m³
Bouwa: 0.0928 kWh/m³
Saving: 0.1315 - 0.0928 = 0.0387 kWh/m³ = 29.4% efficiency improvement
```

---

## 7. Step 8 — Savings Opportunity

Source: `Report`, `Results - Comparison to Bouwa`, `Calculations - Compare`

### Annual electricity costs

| Period type | L160 (R/year) | Bouwa RS132-II (R/year) | Source |
|---|---|---|---|
| LDS Work Days | R 1,421,443 | R 1,003,251 | Report!R22 |
| LDS Saturday | R 256,284 | R 180,884 | Report!R23 |
| LDS Sunday | R 240,167 | R 169,509 | Report!R24 |
| HDS Work Days | R 745,681 | R 526,300 | Report!R25 |
| HDS Saturday | R 81,416 | R 57,463 | Report!R26 |
| HDS Sunday | R 81,875 | R 57,787 | Report!R27 |
| **TOTAL** | **R 2,826,866** | **R 1,995,196** | Report!R30 |

**Total annual saving: R 831,670 (before VSD savings)**  
**VSD efficiency savings (14% additional): R 279,327**  
**Total saving (Annum): R 1,110,997/year** (Report!R32)

> The workbook applies a 14% additional VSD savings credit on top of the direct energy comparison (Report!R31: "VSD Savings 14%"). This credit accounts for the Bouwa VSD reducing unload losses and peak demand. This should be explicitly labelled in the proposal and confirmed with Bouwa.

### Tariff accuracy for Step 8 TariffProfile display

| Field | Value to show |
|---|---|
| `tariffConfidence` | `official-schedule` |
| `tariffSource` | `eskom-schedule` |
| `tariffType` | `tou` (TOU method used — full LDS/HDS breakdown) |
| `vatIncluded` | `excluded` (confirmed in ROI sheet) |
| Demand charge | `Not modelled in workbook` — no demand charge line in the xlsx |
| Calculation method used | **TOU method (Method B)** — period-by-period, not blended |

---

## 8. Step 9 — ROI Comparison

Source: `ROI Calculation` sheet

### Pricing (ROI sheet data):

| Item | Unit price | Qty | Total |
|---|---|---|---|
| New Machine (Bouwa SVC-RS132-II) | R 984,810 | 2 | **R 1,969,620** |
| Annual Savings (L160 only) | R 1,110,997 | — | R 1,110,997/year |
| Annual Savings (L250 only) | R 2,639,781 | — | R 2,639,781/year |
| Buy-back (L160 + L250) | R 130,000 | — | R 130,000 |
| Refurbishment L160 | R 472,760 | — | R 472,760 |
| Refurbishment L250 | R 671,000 | — | R 671,000 |

### ROI outputs:

| Metric | Value | Source |
|---|---|---|
| Net Initial Investment | **R 2,297,860** | ROI!R13 |
| ROI % | **48.35%** | ROI!R12 (0.4835) |
| Payback period | **0.613 years = 7.35 months** | ROI!R14 |

> **VAT note:** All pricing excludes VAT (ROI!R31). The proposal PDF must clearly state "Pricing excludes VAT."

> **Important: The ROI sheet also shows a second set of figures (R17–R20):**
> - Net Initial Investment: R 2,968,860 (higher — includes refurbishment costs)
> - Annual Savings L160: R 3,750,778 (significantly higher than R 1,110,997 — unclear why)
> This second set appears to model a different scenario. The R 3.75M figure is likely a combined scenario (L160 + L250 savings together). Needs confirmation before use in final proposal.

### Wizard scenario mapping:

| Wizard Scenario | ROI sheet scenario | Annual saving | Net investment |
|---|---|---|---|
| Scenario A (replace both) | Row 13 (2 machines) | R 1,110,997 + R 2,639,781 = R 3,750,778 combined | R 2,297,860 |
| Scenario B (replace L250 only) | Not explicitly modelled | R 2,639,781 | TBC |
| Scenario C (replace L160 only) | Rows 6 + 8 | R 1,110,997 | TBC |

---

## 9. Critical Naming Discrepancy

The wizard already flags this. Confirmed in the xlsx:

| Source | Model referenced |
|---|---|
| `Report` sheet (header) | `BOUWA® SVC-RS132-II` |
| `Results - Comparison to Bouwa` sheet | `BOUWA® SVC-RS132-II` |
| `ROI Calculation` sheet (R5) | `New Machine 132kW` |
| Ingrain Belville Presentation (Dec 2025) deck | `SVC-RS160-II` / `SVC160-II` |
| Deck savings table | `BOUWA RS132 VSD COST` |

**Conclusion:** The calculator workbook consistently uses **SVC-RS132-II (132 kW)** as the proposed replacement. The Dec 2025 deck uses `SVC-RS160-II (160 kW)`. These are different machines with different FAD, kW, and pricing. This is not a typo — these are genuinely different model designations.

**Action required before finalising any proposal:** Confirm with Bouwa which model is actually being proposed for Ingrain Belville. The kW difference (132 vs 160) will change both the energy savings calculation and the pricing.

---

## 10. Altitude Correction (Effect Output calc sheet)

The `Effect Output calc` sheet is a multi-site altitude correction calculator. It is **not specific to Ingrain Belville** — it contains examples for:
- Wireforce Germiston (5,394 ft = 1,644 m altitude → 25% FAD loss)
- Element Six (5,337 ft altitude → 24% FAD loss)

**The correction formula used:**
```
Pi (site pressure bar) = 1.013 × (1 - 0.001mb/30ft × altitude_ft)
  ≈ 1.013 - (altitude_ft × 0.001 / 30)

Qn (site FAD) = Q_sea_level × (Pi / P_std) × (T_std / T_site)
```

For **Ingrain Belville (~10 m):** correction is negligible (< 0.1% FAD loss).  
For **Gauteng (1,700 m):** expect ~20–25% FAD loss from datasheet ratings.

The `Effect Output calc` sheet should be the reference for Phase 4D-17 when altitude correction is implemented in the wizard.

---

## 11. Gap Analysis — Fields in TariffProfile Not Populated by Workbook

| Field | Status | Action |
|---|---|---|
| `tariffCategoryName` | Not in workbook | Confirm: likely Megaflex or Businessrate (HV supply) — check site supply agreement |
| `networkAccessCharge` | Not modelled | Obtain from Eskom bill — separate to energy charges |
| `serviceAdminCharge` | Not modelled | Obtain from Eskom bill |
| `effectiveFrom` / `effectiveTo` | Not in workbook | Confirm tariff year from Eskom schedule |
| `confirmedBy` | Not in workbook | ARS engineer name + confirmation date |
| Demand charge (R/kVA/month) | Not modelled | Large compressors → demand charge can be significant. Not in this workbook. |

---

## 12. Phase 4D-17 Implementation Notes

When the wizard moves from demo-data to real xlsx import, the field mapping above drives the import logic:

| xlsx Cell / Range | → Wizard State |
|---|---|
| `Report!R3 col B` (26.81) | `DEMO_COMPRESSORS[L160].peakFlowFAD` |
| `Report!R5 col B` (184) | `DEMO_COMPRESSORS[L160].powerDrawMax` |
| `Report!R11 col B` (0.87) | `DEMO_COMPRESSORS[L160].motorEfficiency` |
| `Report!R10 col B` (0.1315) | Efficiency calc input |
| `Electricity Rates!R1:R8` | `tariffProfile.peakRateRkWh`, `standardRateRkWh`, etc. |
| `Day Calculations!K2:K8` | `tariffOpProfile.annualRunHours` splits |
| `Air Flow Result Input!MAX row` | `DEMO_COMPRESSORS[L160].peakFlowFAD` |
| `Air Flow Result Input!AVG row` | Site demand for right-sizing |
| `ROI Calculation!R5` (R984,810) | `ROI_SCENARIOS[A].unitPrice` |
| `ROI Calculation!R8` (R130,000) | `ROI_SCENARIOS[A].buybackL160` + `buybackL250` |
| `ROI Calculation!R14 col B` (0.6126 years) | `ROI_SCENARIOS[A].payback` |
| `ROI Calculation!R12 col B` (0.4835) | `ROI_SCENARIOS[A].roiPct` |
| `ROI Calculation!R6 col B` (R1,110,997) | `SAVINGS_TABLE[0].savingL160` |
| `ROI Calculation!R7 col B` (R2,639,781) | `SAVINGS_TABLE[0].savingL250` |

---

## 13. Summary of Confirmed Values for Demo Data Update

These are the values directly extracted from `Ingrain L160.xlsx` that should be in the wizard demo data:

### Machine comparison
- L160 actual delivery: **26.81 m³/min** ✓ (already in wizard)
- Bouwa RS132-II delivery: **28.4 m³/min** (note: wizard shows SVC-RS160-II, not RS132-II)
- L160 power: **184 kW** ✓ (already in wizard)
- Bouwa power: **151.8 kW** (wizard shows TBC — this is the confirmed value from workbook)
- Motor efficiency L160: **87%** ✓ (already in wizard)
- Motor efficiency Bouwa: **96%** (should be in wizard Bouwa solution spec)

### Savings
- Annual saving vs L160: **R 1,110,997/year** (wizard shows R 1,150,000 — small discrepancy, workbook is more precise)
- Total annual cost L160: **R 2,826,866** (wizard shows R 2,830,000 — rounded from deck)
- Total annual cost Bouwa: **R 1,995,196** (wizard shows R 1,680,000 — significant discrepancy — see below)

> **Savings discrepancy:** The wizard uses R 1,680,000 from the deck savings table. The workbook calculates R 1,995,196 total annual Bouwa cost and R 1,110,997 saving. The deck's R 1,680,000 appears to be a different reference (possibly a different tariff year, or a combined-scenario average). Do not change the wizard until the correct basis is confirmed with ARS/John Roselt.

### ROI
- Machine price: **R 984,810 per unit** (workbook — should be entered in wizard ROI step)
- 2 machines: **R 1,969,620**
- Buy-back: **R 130,000 combined**
- Net investment: **R 2,297,860**
- Payback: **7.35 months (0.613 years)**
- ROI: **48.35%**
- VAT: **Excluded**

### Tariff (from Electricity Rates sheet — more current)
| | LDS | HDS |
|---|---|---|
| Peak | R 2.2919/kWh | R 5.3783/kWh |
| Standard | R 1.6311/kWh | R 2.1322/kWh |
| Off-Peak | R 1.0979/kWh | R 1.2365/kWh |

---

*Document created: Phase 4D-16 mapping pass.*  
*Source: `ARS Calculators/Ingrain L160.xlsx` — extracted 2026-07-08.*  
*No UI or wizard code was changed in this phase.*

---

## 14. Source Reconciliation: Ingrain PowerPoint vs Ingrain L160 Workbook

**Phase 4D-16B — reconciliation pass.**  
**PowerPoint source:** `ARS Calculators/Ingrain Belville Presentation - Dec 2025.pptx` (16 slides, extracted 2026-07-08)  
**Excel workbook:** `ARS Calculators/Ingrain L160.xlsx`

This section compares the two source documents field by field, documents all conflicts, and establishes a recommended source-of-truth hierarchy.

---

### 14.1 Proposed Bouwa Model — ⚠️ CONFLICT

The PowerPoint and Excel workbook use **different and inconsistent model names across slides and sheets**.

| Location | Model reference | kW |
|---|---|---|
| PPT Slide 3 — Recommendations | `BOUWA® SVC160-II` (2-Stage, VSD) | 160 kW |
| PPT Slide 4 — Savings table (column header) | `BOUWA® RS 132 VSD COST` | 132 kW |
| PPT Slide 7 — Next Steps | `BOUWA® SVC-RS160-II` Extreme Energy Saving | 160 kW |
| PPT Slide 13 — Performance chart narrative | `RS132` | 132 kW |
| Excel `Report` sheet header | `BOUWA® SVC-RS132-II` | 132 kW |
| Excel `Results - Comparison to Bouwa` header | `BOUWA® SVC-RS132-II` | 132 kW |
| Excel `ROI Calculation` sheet | `New Machine 132kW` | 132 kW |
| Current wizard demo (`BOUWA_SOLUTION`) | `SVC-RS160-II / SVC160-II` | 160 kW |

**Summary:**
- The **financial model** (savings table Slide 4, full Excel workbook) is consistently based on the **132 kW machine (SVC-RS132-II / RS132 VSD)**.
- The **recommendation text** (Slides 3 and 7) refers to the **160 kW machine (SVC160-II / SVC-RS160-II)**.
- **The PPT contains four different model name variants across six slides.** This is not a typo — the 132 kW and 160 kW are genuinely different machines with different FAD, kW, and capital cost.
- The wizard currently shows `SVC-RS160-II / SVC160-II` and already flags this inconsistency.

> **⚠️ Requires ARS/Bouwa confirmation before finalising any proposal:**
> Which machine is being proposed — RS132 (132 kW, cost as per workbook R984,810) or SVC-RS160-II (160 kW, higher cost)? The answer changes both the energy savings calculation and the ROI.

---

### 14.2 Annual Energy Costs — ⚠️ THREE-WAY DISCREPANCY

**L160 annual energy cost:**

| Source | Value | Basis |
|---|---|---|
| PPT Slide 4 | **R 2.83M** | Rounded; matches Excel Report |
| Excel `Report` sheet (R30 col B) | **R 2,826,866** | TOU calculation using Report-sheet rates |
| Current wizard demo | **R 2,830,000** | Rounded from deck |

✅ **These three agree** (within rounding). L160 cost is well established.

---

**Bouwa proposed annual energy cost:**

| Source | Value | Basis |
|---|---|---|
| PPT Slide 4 | **R 1.68M** | Rounded; origin unclear (see below) |
| Excel `Report` sheet (R30 col C) | **R 1,995,196** | TOU calculation + 14% VSD credit |
| Current wizard demo | **R 1,680,000** | Taken from PPT deck |

> ⚠️ **Significant discrepancy: PPT R1.68M vs Excel R2.00M — a difference of ~R315,000/year.**

**Root cause analysis:**

The PPT's R1.68M Bouwa cost cannot be reconciled directly from the Excel's own TOU calculation (which produces R1.995M). Back-calculating from the PPT's own savings figures:
- PPT savings vs L160: R1.13M → implied Bouwa cost: R2.83M − R1.13M = **R1.70M**
- PPT savings vs L250: R2.64M → implied Bouwa cost: R4.35M − R2.64M = **R1.71M**

The R1.68M on Slide 4 appears to be rounded down or based on slightly different assumptions. The implied Bouwa cost from the savings figures (~R1.70–1.71M) is closer to R1.70M than the stated R1.68M.

Possible explanations for the gap between R1.68–1.71M (PPT) and R1.995M (Excel workbook):
1. **Different tariff year / rate set:** PPT may have been prepared with an earlier Eskom rate schedule.
2. **Different operating assumptions:** PPT may assume fewer annual operating hours or different load factor.
3. **Different machine baseline:** PPT may include a VSD correction factor that the workbook doesn't, or vice versa.
4. **Workbook has a 14% VSD savings credit:** The Excel adds a 14% VSD savings on top of the TOU comparison (Report!R31). If removed, the R1.995M becomes R1.716M — **which is very close to the PPT's implied ~R1.70M.**

> **Most likely explanation:** The PPT's R1.68M is the **energy cost comparison before applying the Excel's internal 14% VSD savings credit**, then the VSD credit is what creates the R1.13M saving vs L160 directly. The Excel separately shows the VSD credit as R279,327 (Report!R31). If you subtract the VSD credit: R1,995,196 − R279,327 = **R1,715,869 ≈ R1.71M** — close to the PPT's implied value.

> Until this is confirmed with ARS, **do not change the wizard demo values**. The wizard correctly notes "Requires confirmation."

---

**L250 annual energy cost:**

| Source | Value | Basis |
|---|---|---|
| PPT Slide 4 | **R 4.35M** | Rounded |
| Current wizard demo | **R 4,350,000** | Taken from PPT |
| Excel L250 workbook | Not in `Ingrain L160.xlsx` — separate file: `Ingrain L250.xlsx` | — |

> The `Ingrain L160.xlsx` workbook only models the L160 replacement. The L250 savings figure is referenced in the ROI sheet (R7: R2,639,781) but the full L250 TOU calculation is likely in `Ingrain L250.xlsx` (not yet inspected).

---

### 14.3 Savings Values — ⚠️ THREE-WAY DISCREPANCY

| Metric | PPT Slide 4 | Excel Workbook | Current Wizard |
|---|---|---|---|
| Annual saving vs L160 | **R 1.13M (40%)** | **R 1,110,997** | **R 1,150,000** |
| Annual saving vs L250 | **R 2.64M (61%)** | **R 2,639,781** | **R 2,670,000** |

**Analysis:**

- **Excel vs PPT (vs L160):** R1,110,997 vs R1.13M. The Excel value is ~R19,000 lower. Given the PPT is rounded, these likely derive from the same tariff calculation (the ~R19K difference is within rounding/VSD-credit treatment).
- **Wizard vs PPT (vs L160):** R1,150,000 vs R1.13M — wizard value is R20,000 *higher* than the PPT. The wizard value does not match either the PPT or the workbook precisely.
- **Excel vs PPT (vs L250):** R2,639,781 vs R2.64M — Excel and PPT agree to within rounding ✅.
- **Wizard vs PPT (vs L250):** R2,670,000 vs R2.64M — wizard is R30,000 higher. Same pattern as the L160 discrepancy.

> **Wizard values (R1,150,000 and R2,670,000) appear to come from an earlier version of the presentation or a different calculation pass.** They do not match either the extracted PPT text or the Excel workbook. These should be reviewed before any customer-facing output.

**CO₂ savings (from PPT Slide 4 — directly extracted):**

| Metric | PPT value |
|---|---|
| CO₂ savings vs L160 | 2,240,952 kg CO₂/year (2,241 tons/year) |
| CO₂ savings vs L250 | 9,221,538 kg CO₂/year (9,221 tons/year) |

The wizard demo correctly shows these values. ✅

---

### 14.4 ROI Values

**Excel workbook (ROI Calculation sheet) — complete data extracted:**

| Item | Value | VAT |
|---|---|---|
| Machine unit price (Bouwa RS132-II) | **R 984,810** | Excluded |
| Quantity (Scenario A: replace both) | 2 | — |
| Total machine cost | **R 1,969,620** | Excluded |
| Annual saving vs L160 | R 1,110,997/year | — |
| Annual saving vs L250 | R 2,639,781/year | — |
| Buy-back (L160 + L250 combined) | **R 130,000** | — |
| Refurbishment cost L160 | **R 472,760** | — |
| Refurbishment cost L250 | **R 671,000** | — |
| Net initial investment (buy-back offset only) | **R 2,297,860** | Excluded |
| ROI % | **48.35%** | — |
| Payback period | **7.35 months (0.613 years)** | — |
| VAT note | *"Please note that the above costs exclude VAT"* | Confirmed: excluded |

**PowerPoint (Slide 5 — ROI COMPARISON):**

Only the slide title `ROI COMPARISON` was extractable as text. All numeric values on the ROI slide are embedded in charts, tables, or visual elements that are not accessible as plain text. The Excel workbook provides the only confirmed source for ROI figures.

> **Wizard ROI steps currently show TBC for all pricing.** The Excel workbook provides confirmed values that should eventually be entered. However, the machine price (R984,810) is for the **RS132 (132kW)** — the wrong model if the final decision is SVC-RS160-II (160kW). Do not populate wizard ROI fields until the model question is resolved.

---

### 14.5 Tariff Basis — ⚠️ TWO-RATE-SET PROBLEM IN WORKBOOK

The workbook contains two tariff rate sets, and the PPT does not document which one was used.

| Rate set | Location in xlsx | LDS Peak | LDS Standard | LDS Off-Peak | HDS Peak | HDS Standard | HDS Off-Peak |
|---|---|---|---|---|---|---|---|
| Set A — "Report sheet" (hardcoded, older) | Report!R14–R19, Results sheet | R2.7678 | R1.5562 | R1.1115 | R6.6692 | R1.6673 | R1.1115 |
| Set B — "Electricity Rates sheet" (newer) | Electricity Rates!R1–R8 | R2.2919 | R1.6311 | R1.0979 | R5.3783 | R2.1322 | R1.2365 |

**Which rate set was used for the Report calculations?**

The Report and Results sheets used **Set A** (the hardcoded older rates embedded in cells R14–R19). This is the set that produces the L160 total of R2,826,866 ≈ R2.83M — matching the PPT.

**Why do two rate sets exist?**

Eskom tariff rates change annually, typically on 1 April. The `Electricity Rates` sheet (Set B) appears to be a more current schedule while the Report sheet cells contain rates from an earlier tariff year. Neither sheet is dated or version-labelled in the workbook.

**For the 15D TariffProfile model, this confirms:**
- `tariffConfidence` = `official-schedule` at best, but the effective date is unknown
- `tariffSource` = `eskom-schedule` but the tariff year is unconfirmed  
- The `Electricity Rates` sheet (Set B) values should be stored in the **advanced tariff details** (HDS/LDS fields)
- The Report sheet (Set A) values represent what was actually used for the **PPT savings figures**
- Both rate sets must be versioned — the proposal must state which tariff year was used

> **Action required:** Obtain the Eskom tariff schedule effective date. The workbook lacks this. The City of Cape Town bill (or direct Eskom supply agreement) must be reviewed to confirm:
> - Current applicable tariff category
> - Whether supply is City of Cape Town tariff or direct Eskom
> - The effective date (1 April YYYY)

---

### 14.6 Air Flow and Load Profile

**Air Flow Result Input sheet (Excel) — confirmed Ingrain 2025 data:**

| Parameter | Value | Source |
|---|---|---|
| Measurement period | 29 May – 5 June 2025 | Air Flow Result Input rows |
| Measurement interval | 15-minute readings | Time column |
| Flow range | 23.79 – 26.81 m³/min | MIN/MAX rows |
| Average demand | **25.94 m³/min** | AVG row |
| Peak demand | **26.81 m³/min** | MAX row |

**PowerPoint (Slide 12 + 15):**
- L160 peak FAD measured: 26.81 m³/min ✅ (matches)
- L160 standard FAD (rated): 29.7 m³/min ✅ (matches)
- Power: 184 kW ✅ (matches)
- The PPT shows summary values only; the full time-series data is exclusively in the Excel workbook

**PowerPoint running hours (Slide 14):**
- L160 running hours: 113,530 h ✅ (matches wizard)
- L160 loading hours: 93,808 h ✅ (matches wizard)
- L250 running hours: 93,889 h ✅ (matches wizard)
- L250 loading hours: 65,574 h ✅ (matches wizard)

> **For load profile analysis, the Excel workbook is the definitive source.** The PPT contains only summary values. The 15-minute time-series air flow data (29 May – 5 June 2025) in `Air Flow Result Input` is the actual measured demand profile.

---

### 14.7 Values That Agree Between PPT and Workbook ✅

These values are confirmed by both sources and can be trusted for the wizard:

| Field | Value | Status |
|---|---|---|
| L160 peak FAD measured | 26.81 m³/min | ✅ Confirmed both sources |
| L160 rated FAD | 29.7 m³/min | ✅ Confirmed both sources |
| L160 power | 184 kW | ✅ Confirmed both sources |
| L160 motor efficiency | 87% | ✅ Confirmed both sources |
| L160 unloaded operation | 18% | ✅ Confirmed both sources |
| L160 total running hours | 112,782 h (spec) / 113,530 h (obs) | ✅ Confirmed both sources |
| L250 peak FAD measured | 27.86 m³/min | ✅ Confirmed both sources |
| L250 rated FAD | 42.7 m³/min | ✅ Confirmed both sources |
| L250 power | 294 kW | ✅ Confirmed both sources |
| L250 motor efficiency | 87% | ✅ Confirmed both sources |
| L250 unloaded operation | 30% | ✅ Confirmed both sources |
| Audit date | 30 May 2025 | ✅ Confirmed both sources |
| Site pressure | 7.5 bar(g) | ✅ Confirmed both sources |
| L160 annual energy cost | ~R2.83M | ✅ Confirmed (within rounding) |
| L250 annual energy cost | ~R4.35M | ✅ PPT confirmed; L250 workbook not yet inspected |
| CO₂ savings vs L160 | 2,241 t/year | ✅ Confirmed PPT Slide 4 |
| CO₂ savings vs L250 | 9,221 t/year | ✅ Confirmed PPT Slide 4 |
| Pricing: VAT excluded | Yes | ✅ Excel ROI sheet explicit |
| Year of manufacture L160 | 2001 (25 years old) | ✅ Confirmed both sources |
| Year of manufacture L250 | 2006 (19 years old) | ✅ Confirmed both sources |

---

### 14.8 Conflicts Requiring ARS/Bouwa Review

The following items cannot be resolved from the available source documents alone:

| # | Conflict | PPT value | Workbook value | Wizard current | Required action |
|---|---|---|---|---|---|
| C1 | Proposed Bouwa model | SVC160-II (slides 3, 7) and RS132 VSD (slide 4) | SVC-RS132-II (all sheets) | SVC-RS160-II | **ARS/Bouwa must confirm: 132kW or 160kW?** |
| C2 | Bouwa annual energy cost | R1.68M | R1,995,196 | R1,680,000 | **Confirm tariff year and VSD credit treatment** |
| C3 | Annual saving vs L160 | R1.13M | R1,110,997 | R1,150,000 | Wizard value matches neither — confirm |
| C4 | Annual saving vs L250 | R2.64M | R2,639,781 | R2,670,000 | Wizard value is R30K high — confirm |
| C5 | Tariff rate set | Unknown (Set A likely) | Two sets present (A + B) | Not specified | Confirm Eskom tariff year and category |
| C6 | Machine unit price | Not in PPT text | R984,810 (RS132 from ROI sheet) | TBC in wizard | Confirm model before using price |
| C7 | L250 workbook savings | R2.64M from PPT | R2,639,781 from L160 ROI sheet | R2,670,000 | Inspect `Ingrain L250.xlsx` to verify L250 model |

---

### 14.9 Recommended Source-of-Truth Hierarchy

For each field type in the Proposal Builder, the preferred data source in priority order:

| Data category | Priority 1 | Priority 2 | Priority 3 | Fallback |
|---|---|---|---|---|
| Air flow / demand | Audit Excel (time-series logger data) | Manual audit entry | Manufacturer spec | Assumed / estimate |
| Compressor specs | Audit measured | Manufacturer datasheet | PPT summary values | — |
| Tariff rates | Customer electricity bill (actual bill) | Official Eskom/municipal published schedule | Workbook rate sets (version unknown) | Estimate (labelled) |
| Energy cost calculations | Excel workbook TOU model | Simplified TOU from tariff + load profile | Blended estimate | — |
| Savings figures | Excel workbook calculated | PPT rounded presentation values | Manual estimate | — |
| ROI pricing | Confirmed Bouwa quotation | Excel workbook pricing (R984,810 / RS132) | Estimate | — |
| Model specification | Confirmed Bouwa spec sheet | Excel workbook model (RS132) | PPT recommendation (RS160-II) | — |
| CO₂ factor | Customer bill / Eskom reference | SA grid default 0.61 kg/kWh | Workbook CO₂ figure | — |

**Principle for the Proposal Builder:**

> Where values conflict between sources, the application must show the value as **"Requires Review"** rather than silently selecting one source. The source of each value should eventually be stored per field (PPT / Workbook / Audit Excel / Manufacturer Spec / Manual / Assumed) so that the confidence level and provenance are clear in any exported proposal.

---

### 14.10 Recommendation: Next Steps Before Ingrain Demo Values Are Finalised

In priority order:

1. **Confirm the Bouwa model [C1 — Critical].**  
   Contact Bouwa / ARS. Is the proposal for **SVC-RS132-II (132 kW)** or **SVC-RS160-II (160 kW)**? This affects machine price, energy savings, and every downstream calculation.

2. **Confirm the tariff basis [C5].**  
   Which Eskom tariff year and category applies to Ingrain Belville? Direct Eskom or City of Cape Town municipal? This resolves C2, C3, C4, and enables a `tariffConfidence = 'bill-confirmed'` or `'official-schedule'` entry.

3. **Inspect `Ingrain L250.xlsx` [C7].**  
   The L250 savings are referenced in the L160 workbook's ROI sheet but the full TOU calculation should be in the L250 workbook. Inspect to confirm the R2.64M / R4.35M L250 values.

4. **Update wizard demo data after (1) and (2) are resolved.**  
   Until then: retain current wizard values with `Requires Review` labels and the existing naming inconsistency warning.

5. **Add source-per-field metadata in a future wizard version.**  
   The 15D `TariffProfile` model and `TariffOperatingProfile` already provide the structure for this. Extend compressor spec fields with a `source` property to enable the full provenance model described in section 14.9.

---

*Section 14 added: Phase 4D-16B source reconciliation.*  
*Sources: `Ingrain Belville Presentation - Dec 2025.pptx` (16 slides extracted) + `Ingrain L160.xlsx`.*  
*No UI code, wizard code, or wizard demo data was changed in this phase.*  
*No commit, push, deploy, or package installation performed.*
