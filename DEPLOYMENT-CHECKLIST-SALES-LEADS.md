# Sales Leads Permissions - Deployment Checklist ✅

## Pre-Deployment

- [ ] Backend server is running locally or on development server
- [ ] Database is connected and accessible
- [ ] You have super admin credentials for testing
- [ ] You have read/write access to `ars-app-backend` directory
- [ ] You have read/write access to `lead-management-system` directory

---

## Deployment Steps

### Step 1: Run Permission Migration (30 seconds)

```bash
cd ars-app-backend
npm run migrate:sales-lead-perms
```

**Verify output includes:**
- ✅ "Connected to database for migration"
- ✅ "Adding Sales Lead Management permissions..."
- ✅ "✅ Migration completed successfully!"
- ✅ Shows count of permissions added/updated

**If fails:**
- [ ] Check database connection: `npm run seed`
- [ ] Check if permissions already exist: Check `migrations-applied.txt`
- [ ] Look for error messages in output

---

### Step 2: Run Permission Grant (30 seconds)

```bash
npm run grant:sales-lead-perms
```

**Verify output includes:**
- ✅ "Connected to database for permission grant"
- ✅ "Found X Sales Lead permissions in catalog"
- ✅ "Granting permissions to roles..."
- ✅ "✅ Permission grant completed!"
- ✅ Shows which roles were updated
- ✅ Shows permission summary

**If fails:**
- [ ] Run Step 1 first if not done
- [ ] Check database connection
- [ ] Verify default roles exist: `npm run seed` (optional)

---

### Step 3: Restart Backend (if needed)

```bash
# Stop backend if running (Ctrl+C)
# Then restart:
npm run dev
```

**Verify server starts:**
- ✅ "Server running on port 5000"
- ✅ No error messages in console

---

## Post-Deployment Testing

### Test 1: Super Admin Access
- [ ] Login as super admin (admin@ars.com or similar)
- [ ] Navigate to Sales Leads
- [ ] Verify you see the tab ✅
- [ ] Verify you can see leads
- [ ] Verify delete button is visible ✅

### Test 2: Admin Access (Before Granting Delete)
- [ ] Create admin test user or use existing admin
- [ ] Login as admin
- [ ] Navigate to Sales Leads
- [ ] Verify you see the tab ✅
- [ ] Verify you can create a lead ✅
- [ ] Verify you can edit a lead ✅
- [ ] Try to delete → Should show "Access Denied" ❌
- [ ] Delete button should NOT be visible ✅

### Test 3: Manager Access
- [ ] Create manager test user or use existing manager
- [ ] Login as manager
- [ ] Navigate to Sales Leads
- [ ] Verify you see the tab ✅
- [ ] Verify you can create a lead ✅
- [ ] Try to delete → Should show "Access Denied" ❌

### Test 4: Rep Access
- [ ] Create rep test user or use existing rep
- [ ] Login as rep
- [ ] Navigate to Sales Leads
- [ ] Verify you see the tab ✅
- [ ] Verify you can create a lead ✅
- [ ] Verify leads are filtered (only see own or unassigned) ✅
- [ ] Try to edit another rep's lead → Should fail ❌

### Test 5: User Access
- [ ] Create user test user or use existing user
- [ ] Login as user
- [ ] Navigate to Sales Leads
- [ ] Verify you see the tab ✅
- [ ] Verify you can see leads ✅
- [ ] Try to create a lead → Should show "Access Denied" ❌
- [ ] Try to edit → Should show "Access Denied" ❌

### Test 6: Grant Delete Permission

**Grant to Admin Role:**
- [ ] Login as super admin
- [ ] Go to System Admin → Roles
- [ ] Click "Admin" role
- [ ] Find `sales_leads.delete` permission
- [ ] Click checkbox to add
- [ ] Click "Save"
- [ ] Logout admin user

**Verify Delete Works:**
- [ ] Login as admin again
- [ ] Go to Sales Leads
- [ ] Delete button should now be visible ✅
- [ ] Try to delete a lead → Should succeed ✅
- [ ] Check activity log shows deletion ✅

### Test 7: Revoke Delete Permission

**Remove from Admin Role:**
- [ ] Login as super admin
- [ ] Go to System Admin → Roles
- [ ] Click "Admin" role
- [ ] Find `sales_leads.delete` permission
- [ ] Click checkbox to remove
- [ ] Click "Save"
- [ ] Logout admin user

**Verify Delete Fails:**
- [ ] Login as admin again
- [ ] Go to Sales Leads
- [ ] Delete button should NOT be visible ✅
- [ ] Try to delete via direct API call → Should fail with 403 ❌

---

## Grant Delete Permission (Configure)

### Choose ONE option:

#### ☑️ Option A: Grant to Admin Role
```
System Admin → Roles → Admin
  ├─ Click "Manage Permissions"
  ├─ Search for: sales_leads.delete
  ├─ ☑️ Check the box
  └─ Save
```

**Result:** All Admin users can delete

#### ☑️ Option B: Grant to Manager Role
```
System Admin → Roles → Manager
  ├─ Click "Manage Permissions"
  ├─ Search for: sales_leads.delete
  ├─ ☑️ Check the box
  └─ Save
```

**Result:** All Manager users can delete

#### ☑️ Option C: Grant to Specific Users
```
System Admin → User Management
  └─ For each user who should delete:
       ├─ Click user
       ├─ Click "Manage Permissions"
       ├─ Search for: sales_leads.delete
       ├─ ☑️ Check the box
       └─ Save
```

**Result:** Only those users can delete

#### ☑️ Option D: Create "Sales Manager" Role
```
System Admin → Roles → Create Role
  ├─ Name: Sales Manager
  ├─ Description: Manager with delete access
  ├─ Add permissions:
  │  ├─ sales_leads.read
  │  ├─ sales_leads.create
  │  ├─ sales_leads.update
  │  ├─ sales_leads.delete ✅
  │  ├─ sales_leads.assign
  │  └─ sales_leads.convert
  └─ Create
```

Then assign users to this role.

**Result:** Clear separation - only Sales Managers can delete

#### ☑️ Option E: Keep Delete Restricted (Super Admin Only)
- Do nothing
- Only super admin can delete
- Safest option

**Result:** Maximum protection

---

## Verification Commands

### Check Database Permissions
```bash
cd ars-app-backend
npm run check-user-role admin@ars.com
```

Should show:
```
✅ Role: admin
✅ Permissions: sales_leads.read, sales_leads.create, ...
✅ Super Admin: false
```

### List All Permissions
```bash
# Check /api/permissions endpoint via Postman or curl
# Should return all sales_leads.* permissions
```

### Check Role Permissions
```bash
# Via UI: System Admin → Roles → Click role
# Should show permission list with checkboxes
```

---

## Rollback Plan

If something goes wrong:

### Rollback Step 1
If permission migration fails:
- Database has no sales_leads.* permissions
- UI access will be denied for everyone except super admin
- No damage done

### Rollback Step 2
If permission grant fails:
- Run migration again: `npm run migrate:sales-lead-perms`
- Run grant again: `npm run grant:sales-lead-perms`
- Or manually fix in UI

### Rollback Delete Permission
If you grant delete to wrong role:
- Login as super admin
- Go to System Admin → Roles
- Remove the permission
- Save

No data loss - just permission adjustment

---

## Troubleshooting

### Problem: Scripts fail with "Not authenticated"
**Solution:** 
- Make sure backend is running
- Check .env file has database credentials
- Run `npm run seed` first to initialize DB

### Problem: "Permission not found" error
**Solution:**
- Run migration first: `npm run migrate:sales-lead-perms`
- Check Step 1 completed successfully

### Problem: After setup, users still can't see Sales Leads tab
**Solution:**
- User must log out and back in
- Permissions are cached at login time
- Check user's role has `sales_leads.read` permission
- Run grant script again: `npm run grant:sales-lead-perms`

### Problem: Delete button appears but says "Access Denied" when clicked
**Solution:**
- Backend doesn't have permission for this user
- Check backend logs for permission check failure
- Grant `sales_leads.delete` permission explicitly
- User must log out and back in

### Problem: Can't find roles or user management in System Admin
**Solution:**
- Make sure you're logged in as super admin
- Some UI sections only visible to super admin
- Check permission: users.read, roles.read

---

## Success Indicators ✅

After deployment, you should see:

1. ✅ **Sales Leads tab visible** - For anyone in admin/manager/rep/user role
2. ✅ **Can create leads** - For admin/manager/rep
3. ✅ **Can view leads** - For everyone with role assigned
4. ✅ **Delete restricted** - Not visible unless you grant permission
5. ✅ **Delete works** - After you grant permission via UI
6. ✅ **Different roles see different features** - Proper filtering
7. ✅ **Audit trail** - Actions logged in activity log
8. ✅ **No errors** - Backend logs clean, no exceptions

---

## Team Communication

### Email to Team
```
Subject: Sales Leads Access Now Available

Hi Team,

Sales Leads access is now live with permission-based controls!

Who can access:
✅ Admins - Full access (read, create, update, assign, convert)
✅ Managers - Full access (read, create, update, assign, convert)
✅ Reps - Can read and create leads
✅ Users - View-only access

Important: Only Super Admin can delete leads by default. 
Contact IT to request delete access if needed.

See you in Sales Leads tab!
```

### Permissions Summary to Share
```
Sales Leads Permissions Summary:
┌─────────────┬────────┬─────────┬─────┬──────┐
│ Permission  │ Admin  │ Manager │ Rep │ User │
├─────────────┼────────┼─────────┼─────┼──────┤
│ View        │   ✅   │   ✅    │ ✅  │  ✅  │
│ Create      │   ✅   │   ✅    │ ✅  │  ❌  │
│ Edit        │   ✅   │   ✅    │ ✅  │  ❌  │
│ Delete      │   ⚙️   │   ⚙️    │ ❌  │  ❌  │
│ Assign      │   ✅   │   ✅    │ ✅  │  ❌  │
│ Convert Job │   ✅   │   ✅    │ ❌  │  ❌  │
└─────────────┴────────┴─────────┴─────┴──────┘

⚙️ = Configurable (ask Admin)
```

---

## Documentation Links

- 📖 Full Guide: `SALES-LEADS-PERMISSIONS-GUIDE.md`
- ⚡ Quick Start: `SALES-LEADS-QUICK-START.md`
- 📊 Architecture: `SALES-LEADS-ARCHITECTURE.md`
- 📋 Summary: `SALES-LEADS-IMPLEMENTATION-SUMMARY.md`

---

## Sign-Off

- [ ] All tests passed
- [ ] No errors in backend logs
- [ ] Team notified
- [ ] Documentation shared
- [ ] Delete permission configured
- [ ] Approved for production (if applicable)

---

**Date Deployed:** ________________

**Deployed By:** ________________

**Approved By:** ________________

**Notes:** 

```




```

---

**Need Help?** Check documentation files or review permission system in System Admin panel.
