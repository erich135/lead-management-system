# Bouwa First-Principles Calculation Strategy

**Status:** Strategy proposal for ARS review

**Scope:** Calculation authority, register design, inputs, validation, and implementation direction

**Applies to:** ARS/Bouwa internal working proposal builder
**Does not change:** Current application code, current calculation outputs, stored data, or customer-release behavior

---

## 1. Decision and calculation authority

The Bouwa Proposal Builder will move from workbook-led calculation replication to a first-principles calculation model.

### 1.1 Source-of-truth decision

- Excel workbooks are **not formula authority**.
- Workbook formulas must not be copied merely because they exist or reproduce a historical proposal.
- Hidden, manually edited, inconsistent, broken, or potentially corrupted workbook formulas are treated as untrusted until independently derived and approved.
- The versioned **app calculation register** is the source of truth for formulas, units, constants, assumptions, validation rules, and approval state.
- Only approved register entries may contribute to a customer-final calculation.

### 1.2 Continuing role of workbooks

Workbooks remain valuable as:

- historical reference cases;
- validation and regression examples;
- records of old proposal inputs and outputs;
- import/input sources where fields can be identified safely;
- comparison cases that may expose mistakes in either the workbook or the app.

A mismatch with a workbook is not automatically an app defect. It is an investigation result. Validation must display the workbook value, app value, difference, input versions, and review outcome without forcing the app to match the workbook.

### 1.3 Authority hierarchy

For a production calculation, authority flows as follows:

1. Approved calculation-register entry.
2. Approved, proposal-specific inputs with units, source, date, confidence, and reviewer.
3. Applicable engineering or tariff reference identified by the register entry.
4. Calculation-engine implementation of that exact register version.
5. Historical workbooks as independent comparison cases only.

No workbook cell address is sufficient evidence for approving a formula. A workbook may be recorded as a validation-case reference, but not as the engineering source of the formula.

---

## 2. Formula register design

The calculation register should be a version-controlled, human-reviewable catalogue. Each executable calculation must map to exactly one register entry and version.

### 2.1 Required fields

| Field | Meaning |
|---|---|
| Calculation ID | Stable machine-readable key, for example `flow.m3_min_to_m3_hour` |
| Calculation name | Clear human-readable name |
| Purpose | Why the calculation exists and where it may be used |
| Inputs | Named inputs, including whether each is measured, specified, derived, or assumed |
| Input units | Required unit for every numeric input |
| Formula | Explicit mathematical relationship, including order of operations |
| Constants | Named constants, exact values, units, and origin |
| Assumptions | Conditions under which the formula is valid |
| Output units | Unit and physical meaning of every output |
| Rounding | Display precision and whether internal values remain unrounded |
| Validation rule | Domain checks, invariants, tolerances, and comparison method |
| Source/reference | Engineering standard, manufacturer data, official schedule, or documented derivation |
| Approval status | `draft`, `engineering-review`, `approved-internal`, `approved-customer`, `retired`, or `rejected` |
| Version | Immutable semantic version of the formula definition |
| Approved by/on | Named approver and approval timestamp |
| Supersedes | Previous register version, when applicable |
| Implementation mapping | Code function/module and implementation version |
| Test cases | Golden inputs/outputs, boundary cases, and historical comparisons |

### 2.2 Register rules

- Register versions are immutable after approval. A formula change creates a new version.
- Internal calculations retain full precision; rounding occurs only at defined boundaries or for display.
- Every proposal snapshot stores the formula-register version used for each material output.
- Inputs and outputs carry units. Unit conversion must occur through registered conversion functions.
- A calculation cannot be customer-approved while any required dependency is draft, rejected, missing, or based on an unreviewed fallback.
- Manual overrides require the original value, override value, reason, user, timestamp, and review status.
- The register must distinguish an engineering formula from a commercial policy, such as whether VAT is included or which costs enter net investment.

### 2.3 Proposed register record shape

```text
calculationId
name
purpose
version
approvalStatus
inputs[]: { name, quantity, unit, sourceRequirement, required }
formula
constants[]: { name, value, unit, reference }
assumptions[]
outputs[]: { name, quantity, unit }
rounding: { internal, persisted, display }
validationRules[]
references[]
implementation: { module, function, version }
testCases[]
approvedBy
approvedAt
supersedes
```

---

## 3. Initial first-principles formula groups

These definitions establish the intended direction. They remain `draft` until ARS engineering review and must not silently replace the current implementation.

### 3.1 Unit conversions

#### m³/min to m³/hour

```text
Q_m3_h = Q_m3_min × 60
```

- Input: volumetric flow, m³/min.
- Output: volumetric flow, m³/h.
- Constant: 60 min/h, exact.
- Validation: converting the result back by dividing by 60 must reproduce the input within floating-point tolerance.
- Rounding: none internally; normally 2–3 decimal places for display.

#### m³/min to L/second

```text
Q_L_s = Q_m3_min × 1000 / 60
```

- Constants: 1 m³ = 1000 L and 1 min = 60 s, both exact.
- Validation: zero maps to zero; negative physical flows are rejected unless a signed sensor-flow use case is explicitly registered.

#### CFM to m³/min

```text
Q_m3_min = Q_cfm × 0.028316846592
```

- Basis: 1 international foot = 0.3048 m exactly; therefore 1 ft³ = 0.028316846592 m³.
- The minute unit is unchanged.
- Display rounding must not replace the exact internal conversion constant.

#### m³/min to CFM

```text
Q_cfm = Q_m3_min / 0.028316846592
```

- Validation: round-trip against the CFM-to-m³/min conversion.

### 3.2 Compressor performance

#### kW per m³/min

```text
specific_power_kW_per_m3_min = effective_input_kW / delivered_FAD_m3_min
```

- `effective_input_kW` must represent electrical package input at the same operating point as the FAD measurement.
- FAD must be positive and expressed at clearly declared reference or site conditions.
- Power and flow values measured at different operating points must not be combined.
- Lower values indicate less electrical power per unit of air delivered, assuming comparable pressure and reference conditions.

#### Effective input kW

Use the highest-confidence applicable source in this order:

1. Time-aligned measured three-phase real power from a calibrated meter/logger.
2. Manufacturer package-input power at the applicable pressure and load point.
3. Electrical motor input derived from shaft power and approved efficiency.
4. Nameplate/rated power as an explicitly labelled low-confidence fallback.

For sampled measured power:

```text
effective_input_kW = Σ(P_i × Δt_i) / Σ(Δt_i)
```

For constant shaft-output power and known motor efficiency:

```text
motor_input_kW = shaft_output_kW / motor_efficiency_fraction
```

If auxiliary package loads are separately known:

```text
package_input_kW = motor_input_kW + auxiliary_input_kW
```

Package input power already includes motor losses and must **not** be divided by motor efficiency again. The register must explicitly identify whether a power input is shaft power, motor electrical input, or total package input to prevent double adjustment.

#### Motor efficiency adjustment

```text
motor_input_kW = shaft_output_kW / η_motor
motor_loss_kW  = motor_input_kW - shaft_output_kW
```

- `η_motor` is a fraction greater than 0 and at most 1, applicable at the relevant load point.
- A nameplate maximum efficiency must not be applied to a different load point without an approved efficiency curve or assumption.
- No efficiency adjustment is applied to measured real package-input kW.

#### Cost per m³ of compressed air

For a stable operating point and a flat applicable energy rate:

```text
energy_per_m3_kWh = effective_input_kW / (delivered_FAD_m3_min × 60)
cost_per_m3_R     = energy_per_m3_kWh × energy_rate_R_per_kWh
```

For TOU or variable-load operation, cost per m³ should be calculated from integrated cost and delivered volume:

```text
cost_per_m3_R = Σ(P_i × Δt_i × tariff_i) / Σ(Q_i × 60 × Δt_i)
```

where `Δt_i` is in hours and `Q_i` is in m³/min. Demand charges and fixed charges must be shown separately unless an approved allocation rule is registered.

### 3.3 Annual energy, cost, and savings

#### Annual energy use

For interval data:

```text
annual_energy_kWh = Σ(effective_input_kW_i × interval_hours_i)
```

For a constant approved effective power estimate:

```text
annual_energy_kWh = effective_input_kW × annual_operating_hours
```

The interval method is preferred. Load/unload states, stopped periods, and multiple machines must be represented explicitly rather than hidden in an annual multiplier.

#### Annual energy cost

For a flat tariff:

```text
annual_energy_cost_R = annual_energy_kWh × energy_rate_R_per_kWh
```

For TOU energy rates:

```text
annual_energy_cost_R = Σ(energy_kWh_period × rate_R_per_kWh_period)
```

If included in the proposal scope, separately registered components may be added:

```text
total_annual_electricity_cost_R =
  energy_charges_R
  + demand_charges_R
  + network_charges_R
  + service_charges_R
  + approved_taxes_or_levies_R
  + VAT_R
```

The output must identify which components are included. Fixed customer-wide charges must not be attributed to compressor savings unless the proposal can demonstrate that they change.

#### Savings

```text
annual_energy_saving_kWh = current_annual_energy_kWh - proposed_annual_energy_kWh
annual_cost_saving_R     = current_comparable_cost_R - proposed_comparable_cost_R
saving_pct               = annual_cost_saving_R / current_comparable_cost_R × 100
```

- Current and proposed costs must use the same tariff version, annualisation period, VAT policy, and cost-component scope.
- Negative savings are valid results and must not be suppressed.
- A VSD benefit already captured in proposed interval power must not be added again as a separate credit.

### 3.4 Investment, ROI, and payback

Define the proposal's net investment transparently:

```text
gross_capital_cost_R = Σ(unit_price_R × quantity)

net_investment_R =
  gross_capital_cost_R
  + installation_R
  + commissioning_R
  + refurbishment_R
  + other_approved_costs_R
  - buy_back_R
  - approved_rebates_R
```

Simple annual ROI:

```text
simple_ROI_pct = annual_net_saving_R / net_investment_R × 100
```

Simple payback:

```text
payback_years  = net_investment_R / annual_net_saving_R
payback_months = payback_years × 12
```

- `annual_net_saving_R` must identify whether maintenance or other recurring savings are included in addition to electricity savings.
- ROI and payback for one scenario must use the same savings scope.
- If net investment is not positive, or annual saving is not positive, simple payback is not applicable and must not be displayed as a finite value.
- Simple ROI is not IRR or NPV. Discounted cash-flow measures require separate register entries with project life, escalation, discount rate, and residual-value assumptions.

### 3.5 Altitude, temperature, and site-effective FAD

#### Atmospheric pressure from altitude

For a first-principles screening calculation within the standard troposphere, use absolute pressure:

```text
p_site_Pa = p0 × (1 - L × h / T0)^(g × M / (R × L))
```

Proposed standard-atmosphere constants:

- `p0 = 101325 Pa` at sea level;
- `T0 = 288.15 K`;
- `L = 0.0065 K/m`;
- `g = 9.80665 m/s²`;
- `M = 0.0289644 kg/mol`;
- `R = 8.3144598 J/(mol·K)`.

The exponent is approximately `5.25588`. Altitude must be in metres. The result is absolute atmospheric pressure, not gauge pressure.

The legacy `−1 mbar per 30 ft` rule is not the default formula. It remains a historical workbook comparison only.

#### Temperature correction

For an ideal-gas density-ratio screening correction:

```text
temperature_factor = T_reference_K / T_site_K
T_K = temperature_C + 273.15
```

Reference temperature must come from the applicable published machine rating or registered standard condition; it must not be assumed silently.

#### Site-effective FAD

Preferred hierarchy:

1. Manufacturer correction table or performance map for the exact compressor, pressure, altitude, temperature, and cooling configuration.
2. Approved engineering calculation tied to the machine's rating standard.
3. Density-ratio screening estimate, explicitly marked for review.

Generic screening estimate:

```text
pressure_factor     = p_site_abs / p_reference_abs
temperature_factor  = T_reference_K / T_site_K
site_effective_FAD   = rated_FAD × pressure_factor × temperature_factor
```

This screening equation must not automatically approve machine sizing. Compressor performance is machine-specific, and FAD is normally declared at defined reference conditions. Final selection requires an approved manufacturer correction or engineering review. Humidity, inlet restrictions, pressure setpoint, cooling limits, and drive limits may require additional registered corrections.

### 3.6 VSD saving logic

#### Preferred: measured load profile plus approved machine performance map

VSD saving must be derived from the proposed machine's input-power response at each required flow and pressure point:

```text
for each interval i:
  proposed_power_kW_i = approved_power_curve(flow_i, pressure_i, site_conditions)
  proposed_energy_kWh_i = proposed_power_kW_i × interval_hours_i

proposed_annual_energy_kWh = Σ(proposed_energy_kWh_i)
VSD_energy_saving_kWh = current_annual_energy_kWh - proposed_annual_energy_kWh
```

The curve may be a manufacturer table with interpolation or an ARS-approved measured curve. Extrapolation outside the approved curve range is not allowed without review. Minimum turndown, unload/blow-off behavior, stop/start control, multiple-compressor sequencing, and minimum pressure must be represented when applicable.

#### Fallback: no load profile

Where no usable load profile exists, a fallback VSD saving may be used only as an explicit scenario assumption:

```text
fallback_VSD_saving_kWh = approved_baseline_energy_kWh × approved_fallback_fraction
```

Rules for the fallback:

- There is no permanent universal 14% default.
- The fraction must be an approved register input with source, applicable conditions, version, and confidence.
- The proposal must label the result `assumption-based` and show the fallback percentage.
- A sensitivity range should show the effect of conservative/base/high assumptions.
- The fallback cannot be added if VSD behavior is already included in effective proposed power or a load-profile model.
- Customer-final use requires an explicit reviewer decision; otherwise it remains internal/draft only.

The historical 14% workbook credit remains a comparison value and must not be treated as engineering truth.

---

## 4. Annualisation decision

The default proposal year is **365 calendar days**, not the workbook's 364-day convention.

```text
available_calendar_days = 365
operating_days = 365 - declared_shutdown_days
annual_operating_hours = proposal_specific_hours_per_operating_day × operating_days
```

For the initial implementation:

- Default calendar: 365 days.
- Operating hours: proposal-specific and explicitly entered or derived from an approved audit schedule.
- Leap-year handling may be added later as an explicit calendar version; it must not silently alter an existing proposal.
- Customer shutdown days are a future optional input and default to zero until implemented.
- Shift patterns and weekday/weekend differences should override the simplified formula when supplied.
- Interval audit data must be annualised using a declared method and representative-period assessment.
- The 364-day convention remains visible only in historical validation comparisons.

All proposals must store the annualisation method, hours, operating days, shutdown days, and version used.

---

## 5. Tariff source strategy

### 5.1 Source hierarchy

Use the highest available applicable source:

1. Customer electricity bill.
2. AMMP, approved tariff database, or other controlled tariff source.
3. Official Eskom or municipal tariff schedule.
4. Manual estimate.

The tariff source does not become authoritative merely because it appears in a workbook.

### 5.2 Required tariff model

The tariff record must support:

- supplier;
- tariff plan/category;
- supply region or municipality;
- effective-from and effective-to dates;
- source hierarchy level;
- flat or TOU structure;
- peak, standard, and off-peak energy rates;
- high-demand and low-demand seasons where relevant;
- day-type and time-band definitions;
- demand charge and billing determinant, if included;
- network, service, and other charges, if included;
- VAT inclusion/exclusion and applicable rate;
- source document/reference;
- captured by/date and reviewed by/date;
- confidence level;
- tariff version.

### 5.3 Tariff application rules

- A customer bill is preferred because it confirms the actual supplier, plan, and billed treatment; the bill period must still be checked for representativeness and effective date.
- AMMP/database data must identify its provider, dataset version, and effective date.
- Official schedules require confirmation that the selected row/category actually applies to the customer.
- Manual estimates must be visibly marked low confidence and normally remain internal/draft.
- TOU costs require timestamp or allocated period energy. Averaging high- and low-demand rates without calendar weighting is not an approved TOU method.
- Demand charges are included only when the proposed change can affect the billing determinant and the method is registered.
- Existing proposals retain their tariff snapshot even when a tariff table is later updated.

---

## 6. Bouwa price strategy

- There is no fixed permanent Bouwa price list in the calculation engine.
- Imported-machine prices may change with supplier pricing, exchange rates, freight, duties, configuration, and commercial terms.
- Price is editable at proposal level by an authorized user.
- Each price stores currency, amount, VAT treatment, source/quotation reference, effective or quoted date, user, timestamp, confidence/review status, and optional exchange-rate basis.
- The proposal stores a price snapshot. Updating a current price must not alter an old proposal.
- Price changes after technical/commercial approval require re-review of ROI, payback, and customer output.
- Historical workbook prices are reference-case inputs only.

---

## 7. Air-audit input strategy

### Short term: manual and audit-report capture

- Capture summarized, reviewed values from an audit report or trusted measurement set.
- Record measurement period, interval, instruments, calibration/verification note, units, pressure, flow, real power, operating state, and source document.
- Distinguish measured values from manufacturer specifications and assumptions.

### Medium term: ARS-controlled audit template

- Define a controlled ARS template with stable columns, units, required metadata, validation checks, and template version.
- Require timestamps and enough information to align flow, power, pressure, and operating state.
- Validate missing intervals, duplicate timestamps, unit mismatches, implausible values, and coverage.

### Long term: workbook/logger import

- Import from supported logger exports and controlled workbook formats.
- Treat imported cells as inputs, not formulas.
- Ignore or quarantine workbook formulas unless a field mapping explicitly requires a displayed historical result for comparison.
- Preserve the original file reference, hash, importer version, field mappings, warnings, and user confirmation.
- Never silently turn an imported historical calculation into an approved app result.

---

## 8. Internal working version strategy

The next product state is an **internal working proposal builder**, not a “demo.”

It should produce:

- an internal working proposal;
- a draft/internal report;
- transparent input sources, assumptions, formula versions, confidence, and review status;
- visible validation differences against historical cases;
- a review requirement before any customer issue.

The internal version may contain incomplete or assumption-based calculations if they are clearly labelled and gated. It must not imply that a workbook match equals engineering approval.

Customer-final export is a later capability. It should be enabled only when required formula entries, inputs, tariffs, prices, machine data, and approvals have customer-approved status. Until then, reports remain internal/draft and should carry an appropriate status marker.

---

## 9. Recommended next code phases

No code changes are part of this strategy document. The recommended implementation order is:

### Phase A — Formal calculation register and module refactor

- Define typed register records, dependency rules, versioning, approval states, and unit contracts.
- Map each calculation function to a register ID/version.
- Refactor unit conversions and pure formulas first.
- Separate engineering formulas from historical scenario fixtures.
- Add unit, boundary, dimensional, and golden-case tests.
- Retain current outputs as comparison fixtures during migration rather than silently replacing them.

### Phase B — Calculation registry review UI

If useful for ARS reviewers, add a read-only review table showing:

- calculation name and version;
- formula and units;
- assumptions and references;
- implementation/test status;
- approval status and approver;
- dependent outputs and proposals.

Editing and approval permissions should be designed separately and audited.

### Phase C — First-principles Element Six recalculation

- Recalculate Element Six from declared inputs rather than workbook formulas.
- Use corrected site-effective output, with the confirmed 30.1 m³/min sea-level rating and reviewed site correction.
- Rebuild energy, savings, ROI, and payback from the new register.
- Preserve workbook outputs as comparison rows and explain differences.
- Do not tune first-principles formulas merely to force a workbook match.

### Phase D — Tariff source model

- Add customer-bill, AMMP/database, official-schedule, and manual-estimate source types.
- Capture supplier, plan, dates, TOU periods, seasons, demand charges, VAT, source, and confidence.
- Snapshot the selected tariff and version per proposal.

### Phase E — Blank New Proposal flow

- Convert New Proposal from scenario/demo-led values to a blank internal proposal.
- Require explicit customer/site, machine, audit/assumption, tariff, price, and review inputs.
- Keep Ingrain and Element Six as separate validation/reference cases, not defaults for a new customer.

### Phase F — Customer/machine linking and snapshots

- Add existing-customer/existing-machine, existing-customer/manual-machine, new-customer/manual-machine, and machine-first flows.
- Store proposal snapshots so historical proposals do not change when live customer, machine, tariff, or price records change.
- Add master-data linking later with permission checks and duplicate prevention.

Each phase should be separately approved, reviewable, and tested. Customer-final export remains out of scope until the register and proposal review gates are approved.

---

## 10. Risks and required controls

| Risk | Required control |
|---|---|
| Old workbook formulas may be wrong, hidden, manually changed, or corrupted | Treat workbooks as comparison/input cases; derive and approve formulas independently |
| A first-principles formula may still be applied outside its valid range | Register assumptions, applicability, input validation, and engineering review |
| Tariff data may be incomplete, outdated, or for the wrong customer category | Use source hierarchy, effective dates, tariff snapshots, confidence, and review |
| VSD savings without a load profile are assumption-based | Use an approved fallback with visible percentage, sensitivity, low confidence, and no double counting |
| Site correction may not represent the exact compressor | Prefer manufacturer maps; mark generic density correction as screening/review-required |
| Measured package power may be adjusted for motor efficiency twice | Classify power quantity explicitly and prohibit efficiency adjustment of measured/package input |
| Price changes invalidate ROI/payback | Store proposal price source/date/user/version and require recalculation/review after change |
| Tariff updates silently change an old proposal | Store an immutable tariff snapshot and calculation-register versions per proposal |
| Current and proposed calculations may use inconsistent bases | Enforce common time period, tariff version, VAT policy, operating schedule, and cost scope |
| Customer output may overstate confidence | Show review/confidence status and block customer-final export until required approvals pass |
| Historical workbook validation may be mistaken for formula approval | Label workbook matches as comparison results, not engineering validation |
| Rounding can create unexplained differences | Retain full internal precision and define persistence/display rounding per register entry |

---

## 11. Governance and acceptance criteria

The first-principles strategy is ready for implementation planning when ARS has approved:

1. Formula-register ownership and approvers.
2. Register schema and approval statuses.
3. Power and FAD quantity definitions.
4. Altitude/site-correction method and manufacturer-review rule.
5. Default 365-day annualisation and proposal operating-hours policy.
6. Tariff source hierarchy and charge scope.
7. VSD load-profile method and fallback governance.
8. Net-investment, ROI, and payback commercial definitions.
9. Internal/draft report status and customer-export gate.
10. Version and snapshot retention requirements.

Until those decisions are approved, the current calculation code remains unchanged and its workbook-derived outputs remain internal validation/reference behavior.

---

## 12. Relationship to existing documents

The following documents remain useful historical audits and validation maps:

- `bouwa-calculation-map.md`;
- `bouwa-calculation-validation.md`;
- `element-six-validation-map.md`;
- `bouwa-data-structure-and-linking-audit.md`.

Where those documents describe a workbook or workbook-derived formula as a source of truth, this strategy supersedes that direction. Their extracted values and mismatch investigations remain useful as historical evidence and regression cases.

---

**Strategy outcome:** The versioned app calculation register becomes formula authority. Engineering maths, units, declared assumptions, approved inputs, source versions, and review gates determine proposal results. Workbooks remain visible and useful, but never silently control the calculation engine.
