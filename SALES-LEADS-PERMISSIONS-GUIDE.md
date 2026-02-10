# Sales Leads - Permission-Based Access Control Guide

## Overview

The Sales Leads feature now uses a **granular, role-based permission system** that allows you to control exactly who can do what, including restricting delete operations to specific users.

## Available Permissions

### Core Permissions

| Permission | Description | Purpose |
|------------|-------------|---------|
| `sales_leads.read` | View sales leads list and details | Read-only access |
| `sales_leads.create` | Create new sales leads | Add new leads to system |
| `sales_leads.update` | Update sales lead information | Edit existing leads |
| `sales_leads.delete` | Delete/soft-delete sales leads | Remove leads (restricted) |
| `sales_leads.assign` | Assign sales leads to reps | Allocate work to team members |
| `sales_leads.convert` | Convert sales lead to job | Create jobs from leads |

### Appointment Permissions

| Permission | Description |
|------------|-------------|
| `appointments.read` | View appointments |
| `appointments.create` | Create appointments |
| `appointments.update` | Update appointments |
| `appointments.delete` | Delete appointments |

## Default Role Assignments

### Super Admin
- ✅ **ALL permissions** (automatic)
- Cannot be changed

### Admin
- ✅ `sales_leads.read`
- ✅ `sales_leads.create`
- ✅ `sales_leads.update`
- ✅ `sales_leads.assign`
- ✅ `sales_leads.convert`
- ✅ `appointments.read/create/update`
- ❌ `sales_leads.delete` (NOT included by default)

### Manager
- ✅ `sales_leads.read`
- ✅ `sales_leads.create`
- ✅ `sales_leads.update`
- ✅ `sales_leads.assign`
- ✅ `sales_leads.convert`
- ✅ `appointments.read/create/update`
- ❌ `sales_leads.delete` (NOT included by default)

### Rep (Sales Representative)
- ✅ `sales_leads.read`
- ✅ `sales_leads.create`
- ✅ `appointments.read/create/update`
- ❌ `sales_leads.update` (cannot modify)
- ❌ `sales_leads.delete` (cannot delete)
- ❌ `sales_leads.assign` (cannot assign to others)

### User
- ✅ `sales_leads.read` (view only)
- ❌ All other permissions

## Setup Instructions

### Step 1: Run Migration Scripts

First, ensure the permissions exist in the database:

```bash
cd ars-app-backend
npm run ts-node src/scripts/add-sales-lead-permissions.ts
```

**Expected output:**
```
✅ Migration completed successfully!
  Added: X new permissions
  Updated: Y existing permissions
⚠️  IMPORTANT: These permissions are NOT assigned to any role by default.
   Only super_admin users will have access to the Sales Lead system.
```

### Step 2: Grant Permissions to Roles

After migration, grant permissions to roles:

```bash
npm run ts-node src/scripts/grant-sales-leads-permissions.ts
```

**Expected output:**
```
✅ Permission grant completed!
  Updated: X role(s)

📊 Permission Summary by Role:
  ADMIN: sales_leads.read, sales_leads.create, sales_leads.update, ...
  MANAGER: sales_leads.read, sales_leads.create, sales_leads.update, ...
  REP: sales_leads.read, sales_leads.create, appointments.read, ...
  USER: sales_leads.read
  
  RESTRICTED (NOT GRANTED):
    • sales_leads.delete
```

### Step 3: Manage Delete Permission

The delete permission is **restricted by default**. You have two options:

#### Option A: Grant to Specific Roles (Recommended)
Use the admin panel: **System Admin → Roles → Select Role → Manage Permissions**

Add `sales_leads.delete` to roles that should be able to delete leads (e.g., admin, manager).

#### Option B: Grant to Individual Users
Use the admin panel: **System Admin → User Management → Select User → Permissions**

Add `sales_leads.delete` to specific users who need delete capability.

#### Option C: Use API
```bash
# Grant delete permission to admin role
curl -X PUT http://localhost:5000/api/roles/{adminRoleId}/permissions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "sales_leads.read",
      "sales_leads.create",
      "sales_leads.update",
      "sales_leads.delete",      # Add this
      "sales_leads.assign",
      "sales_leads.convert"
    ]
  }'
```

## How It Works

### Permission Checking

1. **Super Admin:** Automatically has all permissions (hardcoded bypass)
2. **Role-Based:** User inherits permissions from their assigned role
3. **User-Specific:** Additional permissions can be granted directly to users
4. **Evaluation:** Backend checks ALL permissions (role + user-specific)

### Frontend UI

Components respect permissions:
- **Delete button** - Only shown if user has `sales_leads.delete` permission
- **Assign button** - Only shown if user has `sales_leads.assign` permission
- **Convert button** - Only shown if user has `sales_leads.convert` permission
- **Edit fields** - Only enabled if user has `sales_leads.update` permission

### Backend Enforcement

All API routes are protected:

```typescript
// Example: Delete route requires sales_leads.delete permission
router.delete(
  "/:id",
  authenticate,
  requirePermission("sales_leads.delete"),  // ← Permission check
  deleteSalesLead,
);
```

Even if a user sees the UI button, the backend will reject the request if they don't have permission.

## Common Scenarios

### Scenario 1: Allow All Admins Except Delete

**Current Setup (After Step 2):**
- Admins can: read, create, update, assign, convert
- Cannot delete

**To Enable Delete for Admins:**
1. Go to System Admin → Roles
2. Select "Admin" role
3. Add `sales_leads.delete` permission
4. Save

### Scenario 2: Allow Managers to Approve Deletes (Not Perform Them)

**Keep Delete Permission Restricted:**
- No role has `sales_leads.delete` by default
- Only super_admin can delete leads

**Alternative:** Create a specific "Sales Manager" role with delete permission:
1. Create new role: "Sales Manager"
2. Assign: read, create, update, assign, convert, delete
3. Assign users to this new role

### Scenario 3: Different Permissions by Branch

**Use Individual User Permissions:**
1. Create users and assign base role (e.g., "user")
2. Go to System Admin → User Management
3. For each user, add specific Sales Leads permissions:
   - `sales_leads.read`
   - `sales_leads.create`
   - `sales_leads.update`
   - (Optionally) `sales_leads.delete`

## Verification

### Check User Permissions

Use the API to verify what permissions a user has:

```bash
curl -X GET http://localhost:5000/api/users/{userId} \
  -H "Authorization: Bearer {token}"
```

Response includes `permissions` array.

### Check Role Permissions

```bash
curl -X GET http://localhost:5000/api/roles/{roleId} \
  -H "Authorization: Bearer {token}"
```

Response shows all permissions assigned to the role.

## Troubleshooting

### Issue: "Access Denied" error for Sales Leads

**Solution:**
1. Verify user has a role assigned
2. Run permission grant script: `npm run ts-node src/scripts/grant-sales-leads-permissions.ts`
3. Verify role has `sales_leads.read` permission

### Issue: Users can't delete leads even with permission

**Solution:**
1. Verify permission is assigned: `sales_leads.delete`
2. Check backend logs for permission rejection
3. Restart backend server (may be caching)

### Issue: Delete button still shows "Access Denied"

**Possible Causes:**
- User doesn't have `sales_leads.delete` permission
- Backend rejecting request (check network tab in DevTools)
- Frontend cache (hard refresh browser: Ctrl+Shift+R)

## Best Practices

1. **Principle of Least Privilege**
   - Start with minimal permissions
   - Grant only what users need
   - Review periodically

2. **Use Roles, Not Individual Permissions**
   - Easier to manage
   - Consistent across team
   - Simpler to audit

3. **Restrict Delete Operations**
   - Only grant to trusted admins
   - Require reason for soft deletes
   - Audit all deletions

4. **Test Permissions**
   - Create test users with different roles
   - Verify UI and API both enforce rules
   - Check error messages are helpful

## API Reference

### Check User Permission

```bash
GET /api/users/:id
Authorization: Bearer {token}

# Returns user object with permissions array
```

### Update Role Permissions

```bash
PUT /api/roles/:id/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "permissions": [
    "sales_leads.read",
    "sales_leads.create",
    "sales_leads.update",
    "sales_leads.delete",
    "sales_leads.assign",
    "sales_leads.convert"
  ]
}
```

### Grant Permission to User

```bash
PUT /api/users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "permissions": ["sales_leads.delete"]
}
```

---

## Next Steps

1. ✅ Run both migration scripts
2. ✅ Test with different user roles
3. ✅ Grant delete permission to specific admins/managers
4. ✅ Brief team on new permissions
5. ✅ Monitor and adjust as needed
