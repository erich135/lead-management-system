# Sales Leads Permission Architecture 🏗️

## Permission Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    USER LOGIN                                 │
│              (email@company.com)                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Get User from DB      │
        │  (with Role + Perms)   │
        └────────────┬───────────┘
                     │
                 ┌───┴───┐
                 │       │
          ┌─────▼──┐  ┌──▼──────┐
          │  Role  │  │  User    │
          │ Perms  │  │  Perms   │
          └─────┬──┘  └──┬───────┘
                │        │
                └────┬───┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Merged Permission Set     │
        │  (Role + Direct)           │
        └────────────┬───────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
    ┌─────▼────┐        ┌──────▼────┐
    │ Frontend  │        │  Backend   │
    │ (UI Show) │        │  (API OK)  │
    └───────────┘        └────────────┘
```

## Permission Matrix

```
╔════════════════╦═══════╦═════════╦═══╦════════╦═════════╦═══════════╗
║ Permission     ║ Admin ║ Manager ║Rep║ User   ║ Default ║ Locked    ║
╠════════════════╬═══════╬═════════╬═══╬════════╬═════════╬═══════════╣
║ read           ║   ✅  ║    ✅   ║✅ ║  ✅    ║ After   ║ Visible   ║
║                ║       ║         ║   ║        ║ Step 2  ║ to all    ║
╠════════════════╬═══════╬═════════╬═══╬════════╬═════════╬═══════════╣
║ create         ║   ✅  ║    ✅   ║✅ ║  ❌    ║ After   ║ Default   ║
║                ║       ║         ║   ║        ║ Step 2  ║           ║
╠════════════════╬═══════╬═════════╬═══╬════════╬═════════╬═══════════╣
║ update         ║   ✅  ║    ✅   ║✅ ║  ❌    ║ After   ║ Default   ║
║                ║       ║         ║   ║        ║ Step 2  ║           ║
╠════════════════╬═══════╬═════════╬═══╬════════╬═════════╬═══════════╣
║ delete         ║   ❌  ║    ❌   ║❌ ║  ❌    ║ MANUAL  ║ YOU       ║
║                ║       ║         ║   ║        ║ CONFIG  ║ CONTROL   ║
╠════════════════╬═══════╬═════════╬═══╬════════╬═════════╬═══════════╣
║ assign         ║   ✅  ║    ✅   ║✅ ║  ❌    ║ After   ║ Default   ║
║                ║       ║         ║   ║        ║ Step 2  ║           ║
╠════════════════╬═══════╬═════════╬═══╬════════╬═════════╬═══════════╣
║ convert        ║   ✅  ║    ✅   ║❌ ║  ❌    ║ After   ║ Default   ║
║                ║       ║         ║   ║        ║ Step 2  ║           ║
╚════════════════╩═══════╩═════════╩═══╩════════╩═════════╩═══════════╝

Legend:
  ✅ = Has permission by default
  ❌ = Does NOT have permission (restricted)
  After Step 2 = Script grants it automatically
  MANUAL CONFIG = You decide who gets it
  YOU CONTROL = This is what you configure
  Default = Cannot be changed
```

## Implementation Timeline

```
NOW: Run These Scripts
┌────────────────────────────────────────┐
│ npm run migrate:sales-lead-perms       │ ← Add permissions to DB
├────────────────────────────────────────┤
│ npm run grant:sales-lead-perms         │ ← Grant to roles
└────────────────────────────────────────┘
         │
         ▼
   RESULT: Everyone can see Sales Leads
         ├─ Admins: read, create, update, assign, convert
         ├─ Managers: read, create, update, assign, convert
         ├─ Reps: read, create (own leads only)
         └─ Users: read only


THEN: Configure Delete Access
┌────────────────────────────────────────┐
│ System Admin → Roles → Admin           │ ← Option A
│ Add: sales_leads.delete ✅            │
└────────────────────────────────────────┘
         │
         ▼
   RESULT: Only Admins can delete
         └─ Managers: still cannot delete
```

## Request Flow (Delete Example)

```
USER CLICKS DELETE BUTTON
         │
         ▼
    ┌─────────────────────────────┐
    │  Frontend Check             │
    │  hasPermission('sales_le... │
    │  .delete')? ──────────┐     │
    │                       │     │
    │  YES    ─────────────┐│     │
    │                      ││     │
    └──────────────────────┼│─────┘
                           ││
                        ┌──┘│
                        │   │ NO (skip)
                        │   │
         ┌──────────────▼─────────────────┐
         │  Send DELETE /api/sales-leads  │
         │  + Authorization token        │
         └────────────┬──────────────────┘
                      │
                      ▼
          ┌────────────────────────────────┐
          │  Backend Check                 │
          │  requirePermission('sales_le.. │
          │  .delete')                     │
          └────────┬──────────────┬────────┘
                   │              │
            HAS PERM│              │NO PERM
                   │              │
         ┌─────────▼────┐   ┌─────▼──────────┐
         │  DELETE LEAD │   │  RETURN 403    │
         │  from DB     │   │  Forbidden     │
         │  Log action  │   │                │
         │  Return 200  │   └────┬───────────┘
         └─────┬────────┘        │
               │                 │
               ▼                 ▼
        ┌──────────────┐  ┌──────────────────┐
        │  SUCCESS ✅  │  │  ERROR "Access   │
        │  Lead        │  │  Denied" ❌      │
        │  deleted     │  │                  │
        └──────────────┘  └──────────────────┘
```

## Configuration Options

### Option A: Role-Based (Recommended)
```
Grant DELETE to entire role (e.g., Admin)
↓
All users in that role can delete
↓
Simple to manage
↓
Example: "All Admins can delete"
```

### Option B: User-Based (Selective)
```
Grant DELETE to specific users only
↓
Only those users can delete
↓
More control
↓
Example: "Only John and Sarah can delete"
```

### Option C: New Role (Specialized)
```
Create "Sales Manager" role
↓
Only users in that role have DELETE
↓
Clear separation of duties
↓
Example: "Sales Managers can delete, regular Admins cannot"
```

## Permission Check Layers

```
LAYER 1: Database
┌──────────────────────────────────┐
│ Permissions stored in MongoDB    │
│ - Permission catalog             │
│ - Role ↔ Permission mappings     │
│ - User ↔ Permission mappings     │
└──────────────────────────────────┘

LAYER 2: Backend (Enforcement)
┌──────────────────────────────────┐
│ Express middleware               │
│ - Auth check                     │
│ - Permission lookup              │
│ - Access grant/deny              │
└──────────────────────────────────┘

LAYER 3: Frontend (User Experience)
┌──────────────────────────────────┐
│ React components                 │
│ - Show/hide buttons              │
│ - Enable/disable fields          │
│ - Display messages               │
└──────────────────────────────────┘
```

## Audit Trail

Every action is logged:

```
┌─────────────────────────────────────────┐
│ WHO: admin@ars.com                      │
│ WHAT: Deleted sales lead LEAD-2026-0001│
│ WHEN: 2026-02-10 14:30:00              │
│ WHY: Lead no longer interested          │
│ RESULT: Soft deleted (recoverable)      │
│ STATUS: ✅ Permission check passed      │
└─────────────────────────────────────────┘
```

---

## Key Decisions

### ✅ Delete is Restricted by Default
**Rationale:** Prevent accidental deletions
- More dangerous than other operations
- Usually needs approval
- Easy to configure if needed

### ✅ All Other Permissions Are Granted by Default
**Rationale:** Empower team to work
- Read, create, update are common operations
- Less risky than delete
- Can be revoked if misused

### ✅ Super Admin Cannot Be Restricted
**Rationale:** Emergency access
- System administrator needs override
- Use sparingly and with trusted users

### ✅ Both Frontend + Backend Check Permissions
**Rationale:** Defense in depth
- Frontend: Better user experience (hide unavailable buttons)
- Backend: Security (cannot be bypassed by clever users)
- Both must pass for action to succeed

---

## Terminology Reference

| Term | Meaning | Example |
|------|---------|---------|
| **Permission** | Individual access right | `sales_leads.delete` |
| **Role** | Collection of permissions | Admin role has: read, create, update, delete |
| **User** | Person in the system | john@company.com |
| **Super Admin** | Unrestricted user | admin@ars.com |
| **Soft Delete** | Mark as deleted, don't remove | Recoverable later |
| **Hard Delete** | Completely remove | Cannot recover |
| **Middleware** | Code that runs before request | Permission checker |
| **Decorator** | Function wrapper | `@requirePermission()` |
| **Access Control** | System to restrict access | Role-based access control (RBAC) |

---

Generated: February 2026
Built for: ARS App - Lead Management System
