# Stylist Guide – Dashboard Surface Areas

## Quick Map
| Area | Component | Path |
| --- | --- | --- |
| Top navigation + notifications | `Header` | `src/components/Header.tsx` |
| Dashboard hero + stat cards + CTA | `DashboardHero` | `src/components/DashboardHero.tsx` |
| Priority tabs (All / Overdue / Approaching / Monitored) | `PriorityFilters` | `src/components/PriorityFilters.tsx` |
| Advanced filters (job number, status, admin, rep, customer) | `JobFiltersPanel` | `src/components/JobFiltersPanel.tsx` |
| Overdue jobs table + pagination + CTA | `OverdueJobsTable` | `src/components/OverdueJobsTable.tsx` |
| Empty states (“All Clear” and “No Jobs”) | `AllClearState`, `NoCategoryState` | `src/components/OverdueEmptyStates.tsx` |

## Styling Notes
- All components are Tailwind-first. Adjust gradients, spacing, and typography by editing utility classes in each component.
- Components are pure presentational wrappers with props for data; no API calls are inside, so you can focus solely on layout/design tweaks.
- Reminder severity colors (critical/warning/info) are centralized in `getSeverityColor` / `getSeverityIcon` within `Dashboard.tsx`. Change palette there if needed.
- Keep the JSDoc headers when editing components—these feed our documentation and autocomplete tooling.

## Component Tips
### `Header`
- Desktop, mobile top bar, and notification dropdown live together in this file.
- Background gradients / SVG textures are at the top of the component if you want to swap imagery.

### `DashboardHero`
- Controls the gradient hero, “New Job” CTA, and the four quick stat cards.
- Card layout uses a `grid grid-cols-2 md:grid-cols-4`; adjust here if the card count changes.

### `PriorityFilters`
- Tab buttons already include hover/selected states per severity. Modify class sets to update colors or add icons.

### `JobFiltersPanel`
- All filter inputs, chips, and the “Clear all” link are bundled here.
- To change layout (e.g., move filters into two rows), edit the `grid grid-cols-1 md:grid-cols-5` wrapper.

### `OverdueJobsTable`
- Entire table, pagination, and “View All Jobs” CTA live here, so you can experiment with striped rows, zebra colors, or sticky headers.
- Update the `TABLE_COLUMNS` array to rename columns or adjust alignments.

### `OverdueEmptyStates`
- Houses both empty-state cards so you can adjust illustrations, emojis, or copy in one place.

## Testing Checklist for Stylists
1. Dashboard loads with hero + tabs + filters visible (desktop).
2. Mobile view: header collapses, overflow scrolling on tabs/filters remains usable.
3. Toggle each priority tab and confirm the empty states still look polished.
4. Apply various filters to ensure chips and “Clear all” look correct with your new styles.

Ping Engineering if you need new props or data for any of these components—they’re all imported inside `src/components/Dashboard.tsx`.

