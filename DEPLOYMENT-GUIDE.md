# Deployment Guide - Lead Management App

## Quick Demo Deployment (Current State - Demo Mode)

### Option 1: Deploy to Vercel (Recommended - 5 minutes)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to project folder**:
   ```bash
   cd project
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   - Follow prompts (press Enter to accept defaults)
   - It will ask to link to Vercel account (sign up if needed - free)
   - Deployment will complete and give you a URL like: `https://your-app.vercel.app`

4. **Share the URL with your customer**:
   - Login: `admin@demo.com`
   - Password: `demo123`

**Pros**: Free, instant, professional URL, HTTPS automatically
**Cons**: Demo data only (no real database yet)

---

### Option 2: Deploy to Netlify (5 minutes)

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the app**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod
   ```
   - Follow prompts to link account
   - Select `dist` folder as deploy directory
   - Get URL like: `https://your-app.netlify.app`

**Pros**: Free, simple, HTTPS automatically
**Cons**: Demo data only

---

### Option 3: Share via Ngrok (Instant - Keep your PC running)

1. **Download ngrok**: https://ngrok.com/download (free account)

2. **Make sure your dev server is running**:
   ```bash
   npm run dev
   ```

3. **In another terminal, run**:
   ```bash
   ngrok http 5173
   ```

4. **Share the HTTPS URL** it provides (e.g., `https://abc123.ngrok.io`):
   - Login: `admin@demo.com`
   - Password: `demo123`

**Pros**: Instant, no setup, customer sees exact current state
**Cons**: Requires your PC to stay on, temporary URL (resets on restart)

---

## Full Production Deployment (With Real Database)

### Step 1: Set up Supabase (10 minutes)

1. **Go to https://supabase.com** and create free account
2. **Create new project**:
   - Project name: "Lead Management"
   - Database password: (create strong password)
   - Region: Select closest to South Africa (EU West recommended)
3. **Wait 2-3 minutes** for project to initialize
4. **Go to SQL Editor** (left sidebar)
5. **Run database scripts in order**:
   - Copy contents of `database-setup.sql` → Paste → Run
   - Copy contents of `database-client-workflow.sql` → Paste → Run
   - Copy contents of `sample-data.sql` → Paste → Run (for demo data)

### Step 2: Configure Environment Variables

1. **In Supabase Dashboard**:
   - Go to **Project Settings** → **API**
   - Copy **Project URL**
   - Copy **anon/public** key

2. **Update `.env` file**:
   ```
   VITE_SUPABASE_URL=your-project-url-here
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 3: Create Admin User

1. **In Supabase Dashboard** → **Authentication** → **Users**
2. **Add User**:
   - Email: `admin@yourcompany.com`
   - Password: (create secure password)
   - Email Confirmed: ✓ Enable
3. **Go to Table Editor** → **profiles** table
4. **Find the new user** and edit:
   - `role`: Change to `admin`
   - `full_name`: Add name
   - `is_active`: Set to `true`

### Step 4: Deploy to Vercel with Database

1. **Push code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/lead-management.git
   git push -u origin main
   ```

2. **Go to https://vercel.com**
3. **Import Project** → Select GitHub repo
4. **Add Environment Variables**:
   - `VITE_SUPABASE_URL`: your-project-url
   - `VITE_SUPABASE_ANON_KEY`: your-anon-key
5. **Deploy**

### Step 5: Import Client's Excel Data

1. **Use the DataImport component** in the app (Admin only)
2. **Or run SQL import** with the helper functions in `database-import-excel.sql`

---

## Recommended Approach for Your Demo

**For quick customer preview (TODAY):**
→ Use **Option 1: Vercel** or **Option 3: Ngrok**
- Customer can play with demo data immediately
- Login: `admin@demo.com` / `demo123`

**For full production (BEFORE going live):**
→ Follow **Full Production Deployment** steps
- Set up real Supabase database
- Import their Excel data
- Create real user accounts
- Deploy to Vercel/Netlify with database connection

---

## Quick Commands Reference

### Start Development Server:
```bash
cd project
npm run dev
```

### Build for Production:
```bash
npm run build
```

### Preview Production Build:
```bash
npm run preview
```

### Deploy to Vercel (one command):
```bash
npx vercel --prod
```

---

## Customer Access Credentials (Demo Mode)

**URL**: Will be provided after deployment
**Email**: admin@demo.com
**Password**: demo123

**Demo Features Available**:
- View dashboard with 47 demo leads
- Browse leads list with filtering
- View reports and analytics
- See notification system
- Navigate full UI

**Not Available in Demo Mode**:
- Creating/editing real leads (no database)
- User management
- File uploads
- Real-time notifications

---

## Support & Next Steps

Once customer approves the demo:
1. Set up production Supabase database
2. Import their actual Excel data
3. Configure email notifications (SendGrid/Mailgun)
4. Set up proper user accounts
5. Deploy production version
6. Provide training/documentation

**Estimated Time**: 
- Demo deployment: 5-10 minutes
- Full production setup: 2-3 hours
