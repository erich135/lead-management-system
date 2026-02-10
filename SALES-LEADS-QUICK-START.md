# Sales Leads - Quick Implementation Checklist

## Execute in This Order

### 1️⃣ STEP 1: Add Permissions to Database (5 minutes)

```bash
cd ars-app-backend
npm run ts-node src/scripts/add-sales-lead-permissions.ts
```

✅ **What this does:**
- Adds 13 new Sales Lead permissions to the permission catalog
- Marks them as active
- Does NOT assign them to any role yet (only super_admin has access)

⏱️ **Expected time:** 30 seconds
📊 **Output:** Should show "Added: X new permissions"

---

### 2️⃣ STEP 2: Grant Permissions to Roles (5 minutes)

```bash
npm run ts-node src/scripts/grant-sales-leads-permissions.ts
```

✅ **What this does:**
- Grants read/create/update/assign/convert to: **admin, manager, rep, user**
- **DOES NOT grant delete** to any role (restricted by default)
- Adds appointment permissions
- Provides detailed output showing what each role gets

⏱️ **Expected time:** 30 seconds
📊 **Output:** Shows permission summary for each role

---

### 3️⃣ STEP 3: Grant Delete Permission (1 minute per user/role)

#### Option A: Grant to Admin Role (Recommended)

Go to **System Admin → Roles** in the UI:
1. Click "Admin" role
2. Click "Manage Permissions"
3. Search for: `sales_leads.delete`
4. Check the box
5. Click "Save"

Now all Admin users can delete leads.

#### Option B: Grant to Specific Users Only

Go to **System Admin → User Management** in the UI:
1. Find the user
2. Click "Manage Permissions"
3. Search for: `sales_leads.delete`
4. Check the box
5. Click "Save"

Now only that user can delete leads.

#### Option C: Create "Sales Manager" Role

Go to **System Admin → Roles**:
1. Click "Create Role"
2. Name: "Sales Manager"
3. Add permissions:
   - ✅ sales_leads.read
   - ✅ sales_leads.create
   - ✅ sales_leads.update
   - ✅ sales_leads.delete ← Only one with this
   - ✅ sales_leads.assign
   - ✅ sales_leads.convert
   - ✅ appointments.*
4. Click "Create"
5. Assign users to this role

---

## Immediate Results

After these 3 steps:

✅ **Anyone with admin/manager/rep/user role** can access Sales Leads
- See the "Sales Leads" button in navigation
- View and search leads
- Create new leads
- Update lead info
- Assign leads to reps
- Convert leads to jobs
- Manage appointments

❌ **Delete is restricted** 
- Only super_admin OR users you explicitly granted permission to
- Others will see "Access Denied" if they try
- All deletions are soft-deleted (not truly removed) and logged

---

## Verification

### Check it's working:

1. **Login as different users** (admin, manager, rep, user)
2. Each should see the "Sales Leads" tab
3. Try to delete a lead:
   - ✅ Should work for super_admin
   - ✅ Should work for those with `sales_leads.delete` permission
   - ❌ Should show "Access Denied" for others

### From Terminal:

```bash
# Check a user's permissions
cd ars-app-backend
npm run ts-node src/scripts/checkUserRole.ts email@example.com

# Should show Sales Lead permissions they have
```

---

## Customization Examples

### "Only Managers Can Delete"

1. Run Step 1 & 2 (permission setup)
2. Go to **System Admin → Roles → Manager**
3. Add `sales_leads.delete` permission
4. Save

✅ Result: Only managers and super_admin can delete leads

---

### "Only Specific Admins Can Delete"

1. Run Step 1 & 2
2. Go to **System Admin → Roles → Admin**
3. Do NOT add `sales_leads.delete` permission (leave unchecked)
4. Save
5. Go to **System Admin → User Management**
6. For each admin that should delete: add `sales_leads.delete` individually

✅ Result: Only specific admin users can delete (not all admins)

---

### "Reps Can Only See Their Own Leads"

This is already built-in! The backend filters leads by rep automatically:
- Reps see: their assigned leads
- Managers/Admins see: all leads
- Super admin sees: all leads

No extra configuration needed.

---

## Troubleshooting

### "I don't see Sales Leads button"

**Cause:** User doesn't have `sales_leads.read` permission

**Fix:** 
1. Run Step 2 script again
2. Or manually add `sales_leads.read` to user's role
3. User logs out and back in

---

### "Users can see button but get 'Access Denied' when clicking"

**Cause:** Backend doesn't have permissions assigned

**Fix:**
1. Run both Step 1 and Step 2 scripts
2. Check backend logs for errors
3. Restart backend server

---

### "Delete button doesn't appear"

**Expected if:**
- User doesn't have `sales_leads.delete` permission ← This is the goal!

**To fix (if unintended):**
- Grant `sales_leads.delete` permission via System Admin panel

---

## Permission Reference

| Action | Required Permission | Who Has It (default) |
|--------|---------------------|----------------------|
| View Leads | `sales_leads.read` | Everyone (after Step 2) |
| Create Lead | `sales_leads.create` | Admin, Manager, Rep, User |
| Edit Lead | `sales_leads.update` | Admin, Manager, Rep |
| Delete Lead | `sales_leads.delete` | Only Super Admin (configurable) |
| Assign to Rep | `sales_leads.assign` | Admin, Manager, Rep |
| Convert to Job | `sales_leads.convert` | Admin, Manager |
| Schedule Appointment | `appointments.create` | Admin, Manager, Rep |

---

## Files Modified/Created

📄 **New Scripts:**
- `ars-app-backend/src/scripts/grant-sales-leads-permissions.ts` ← Run this!

📄 **Updated Components:**
- `lead-management-system/src/components/SalesLeadDetails.tsx` (removed hardcoded role check)

📄 **Documentation:**
- `lead-management-system/SALES-LEADS-PERMISSIONS-GUIDE.md` (full guide)
- `lead-management-system/SALES-LEADS-QUICK-START.md` (this file)

---

## Support

For detailed information, see: **SALES-LEADS-PERMISSIONS-GUIDE.md**

For API reference, see: **ars-app-backend/postman/API_ENDPOINTS.md**
