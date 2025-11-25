# Changelog - Mike Customisations Branch

All notable changes made to the ARS Lead Management System for Mike's customisations.

**Branch**: `Mike-Customisations`  
**Base Branch**: `main`  
**Total Changes**: 6 files modified, 475 insertions, 393 deletions

---

## [Frontend] - 2025-11-25

### UI Standardization & Design Updates

#### Changed Components
- `src/components/Activities.tsx`
- `src/components/Diary.tsx`
- `src/components/Reports.tsx`
- `src/components/ResetPasswordPage.tsx`
- `src/components/SetPasswordPage.tsx`
- `src/components/SystemManagement.tsx`

#### Design Changes

**Buttons**
- Standardized all call-to-action buttons to yellow gradient
- Color scheme: `from-[#f7c12b] to-[#f9d04a]`
- Applied to: REFRESH, EXPORT, SAVE, EDIT, INVITE, IMPORT, CREATE, UPDATE, and authentication buttons
- Added hover effects: `hover:scale-105` for improved user feedback

**Containers**
- Standardized container width to `max-w-[1500px]`
- Applied consistent border styling: `border border-gray-200 rounded-xl`
- Removed all box shadows (`shadow-md`) for flat, modern design
- Consistent padding: `px-4 sm:px-6 lg:px-8 py-8`

**Input Fields**
- Label styling: `text-[11px] font-medium text-gray-600 mb-1`
- Input text size: `text-[13px]`
- Input height: `h-[38px]` or `py-1.5`
- Border radius: `rounded-[8px]`
- Consistent padding: `pl-2 pr-2` or `pl-2 pr-10` (for dropdowns)

**Reports Page**
- Updated custom date range fields to match filter styling
- Changed from larger inputs (`px-4 py-2.5 text-[15px]`) to standard size (`pl-2 pr-2 py-1.5 text-[13px]`)
- Label styling aligned with other filters

**Password Pages**
- Updated SetPasswordPage submit button to yellow gradient
- Updated ResetPasswordPage submit and "GO TO LOGIN" buttons to yellow gradient
- Maintained consistent hover effects across all buttons

---

## [Backend] - 2025-11-22

### Email Template System Implementation

#### New Files
- `email-templates/base-email-template.html` - Global reusable email template
- `email-templates/EMAIL_TEMPLATE_GUIDE.md` - Comprehensive documentation
- `public/ARS-Header-Image.png` - Email header background (1.1 MB)
- `public/ars-logo.png` - Company logo for emails (114 KB)

#### Modified Files
- `email-templates/invitation-email.html` - Updated with branded design
- `email-templates/password-reset-email.html` - Updated with branded design
- `src/app.ts` - Added static file serving middleware
- `src/utils/email.ts` - Refactored with template compilation system

#### Email System Features

**Base Template Design**
- Poppins font family throughout
- 800px max-width responsive layout
- 20px border radius for modern look
- Branded header with background image
- Company logo at top
- Professional footer with copyright

**Template Variables**
- Required: `BASE_URL`, `HEADER_TITLE`, `USER_NAME`, `MAIN_CONTENT`, `CURRENT_YEAR`
- Optional: `BUTTON_URL`, `BUTTON_TEXT`, `SHOW_LINK`, `WARNING_MESSAGE`, `INFO_MESSAGE`, `EXPIRATION_TIME`, `ADDITIONAL_CONTENT`

**Button Styling**
- Yellow gradient background: `#f7c12b`
- Hover state: `#f9d04a`
- Dark text color: `#383838`
- Uppercase text with bold font weight

**Conditional Sections**
- Warning box (yellow background `#fce9b5`)
- Info box (blue background `#e3f2fd`)
- Optional button with URL
- Optional clickable link
- Optional expiration notice

**Implementation**
- Created `EmailTemplateData` TypeScript interface
- Implemented `compileEmailTemplate()` function with variable replacement
- Handles conditional sections using `{{#if VARIABLE}}...{{/if}}` syntax
- Refactored `generateInvitationEmail()` to use base template
- Refactored `generatePasswordResetEmail()` to use base template
- Added static file serving: `app.use(express.static(path.join(__dirname, "../public")))`

**Assets**
- All email images now served locally from backend
- No external dependencies for email rendering
- Images accessible at `BASE_URL/ars-logo.png` and `BASE_URL/ARS-Header-Image.png`

**Benefits**
- Single source of truth for email design
- Easy to maintain and update
- Consistent branding across all emails
- Type-safe template data with TypeScript
- Comprehensive documentation for adding new email types

---

## Summary

### Frontend Changes
- **6 files modified**
- **475 insertions, 393 deletions**
- Complete UI standardization with yellow gradient buttons, consistent containers, and uniform input styling

### Backend Changes
- **8 files modified/added**
- **553 insertions, 99 deletions**
- Professional branded email template system with reusable base template and local assets

### Total Impact
- **14 files changed**
- Modern, consistent user interface
- Professional branded email communications
- Improved maintainability and code organization
