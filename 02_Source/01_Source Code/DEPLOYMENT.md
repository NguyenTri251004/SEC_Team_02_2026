# Deployment Guide

Complete deployment guide for **Frontend** on **Vercel**, **Backend** on **Fly.io**, and **Database** on **Supabase**

---

## 📊 Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│         yourdomain.com (Custom Domain)               │
└──────────────┬──────────────────────────────┬────────┘
               │                              │
        ┌──────▼──────────┐           ┌───────▼────────┐
        │     Vercel      │           │     Fly.io     │
        │  (Frontend CDN) │           │   (Backend)    │
        │                 │           │                │
        │ ┌────────────┐  │           │ ┌────────────┐ │
        │ │   React    │  │           │ │  Express   │ │
        │ │   (SSR)    │  │           │ │  (Node.js) │ │
        │ │ Auto-scale │  │           │ │   :3000    │ │
        │ └────────────┘  │           │ └─────┬──────┘ │
        │                 │           │       │        │
        └─────────────────┘           └───────┼────────┘
                                              │
                                              │
                                    ┌─────────▼──────────┐
                                    │    Supabase        │
                                    │   PostgreSQL       │
                                    │   (Cloud DB)       │
                                    │                    │
                                    │ ┌────────────────┐ │
                                    │ │    Database    │ │
                                    │ │                │ │
                                    │ └────────────────┘ │
                                    └────────────────────┘

```

## 📚 Table of Contents

- [Supabase Database Setup](#supabase-database-setup)
- [Fly.io Backend Deployment](#flyio-backend-deployment)
- [Vercel Frontend Deployment](#vercel-frontend-deployment)
- [Environment Configuration](#environment-configuration)
- [Custom Domain & SSL Setup](#custom-domain-ssl-setup)
- [Testing & Verification](#testing-verification)
- [Monitoring & Logs](#monitoring-logs)
- [Updates & Maintenance](#updates-maintenance)
- [Backup & Recovery](#backup-recovery)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)
- [Deployment Checklist](#deployment-checklist)
- [Additional Resources](#additional-resources)
- [Support & Help](#support-help)

---

<a id="supabase-database-setup"></a>
# 1️⃣ Supabase Database Setup

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Configure:
   ```
   Organization: (create or select)
   Project name: ims-production
   Password: [strong password - save it!]
   Region: Singapore
   ```
4. Click **"Create new project"** (wait 3-5 minutes)

## Step 2: Get Connection String

1. Wait for project to be ready
2. Go to **Settings** → **Database**
3. Tab **"Connection string"** → Copy **URI** format:
   ```
   postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres
   ```
4. **Save this information** (needed for .env)

**Variables:**

- `[PASSWORD]`: Database password you just created
- `[HOST]`: Unique project ID (example: `db.cposdksrjwblusvegmsl`)

## Step 3: Import Database Schema

### Method A: Using Supabase SQL Editor (Easiest)

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New Query"**
3. Copy content from `db_schema/db-init.sql` file
4. Paste into editor
5. Click **"Run"**
6. ✅ Wait for schema creation (1-2 seconds)

### Method B: Using psql (Command Line)

```bash
# Get connection string from Supabase
# Replace [CONNECTION_STRING] with URI from step 2

psql "[CONNECTION_STRING]" -f db_schema/db-init.sql

# Verify database
psql "[CONNECTION_STRING]" -c "\dt"
```

## Step 4: Verify Database

Check that schema was created:

```bash
# Connect to Supabase
psql "[CONNECTION_STRING]"

# List tables
\dt

# Expected output:
# Schema  |    Name    | Type  |  Owner
# --------+------------+-------+---------
#  public | users      | table | postgres
#  public | materials  | table | postgres

# Check users table
SELECT * FROM users;

# Expected:
# id | name
# ---+------
#  1 | hello world

\q
```

## Step 5: Firewall & Network (Important!)

Supabase allows all connections by default.  
If you need to restrict, add IP whitelist:

1. **Settings** → **Network**
2. Add IP ranges if needed
3. Keep default (allow all) for simplicity

---

# 2️⃣ Fly\.io Backend Deployment

## Step 1: Prepare Backend Repository

Ensure backend folder has required files:

1. `package.json` ✅
2. `tsconfig.json` ✅
3. `src/server.ts` ✅
4. `.env.example` ✅

## Step 2: Install Fly CLI

```bash
# Windows (PowerShell)
choco install flyctl

# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

Verify:

```bash
flyctl version
```

## Step 3: Login to Fly.io

```bash
flyctl auth login

# Opens browser for authentication
# Create account if you don't have one
```

## Step 4: Setup Fly.io Project

From backend folder:

```bash
cd 02_Source\01_Source\ Code\backend

# Create Fly.io app WITHOUT Managed Postgres
flyctl launch --no-db
```

This creates `fly.toml` file

## Step 5: Configure Environment Variables

```bash
# From backend folder
flyctl secrets set DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST].supabase.co:5432/postgres"
flyctl secrets set NODE_ENV="production"
flyctl secrets set PORT="3000"
```

Replace `[YOUR_PASSWORD]` and `[YOUR_HOST]` from Supabase credentials

## Step 6: Deploy Backend

```bash
# Deploy to Fly.io
flyctl deploy

# Wait for build & deployment (2-3 minutes)
```

After completion, you'll see URL:

```
App URL: https://ims-backend.fly.dev
```

## Step 7: Verify Backend

```bash
# Test endpoint
curl https://ims-backend.fly.dev/api/users

# Should return:
# {"success":true,"data":[...]}
```

Check logs:

```bash
flyctl logs
```

---

<a id="vercel-frontend-deployment"></a>
# 3️⃣ Vercel Frontend Deployment

## Step 1: Prepare Frontend Repository

Ensure frontend folder has required files:

1. `package.json` ✅
2. `vite.config.ts` ✅
3. `src/` folder ✅
4. `.env.example`✅

## Step 2: Create .env.local For Vercel

Create `.env.local` in frontend folder:

```bash
cd 02_Source\01_Source\ Code\frontend

# Create env file from Command Prompt (cmd)
echo VITE_API_URL=https://ims-backend.fly.dev > .env.local

```

Or manually edit with your backend URL:

```env
VITE_API_URL=https://ims-backend.fly.dev
```

## Step 3: Push Code to GitHub

Make sure your code is on GitHub:

```bash
# Add all changes
git add .

# Commit
git commit -m "Prepare for deployment"

# Push to GitHub
git push origin master
```

## Step 4: Login to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your repositories

## Step 5: Import Project to Vercel

1. On Vercel Dashboard, click **"Add New"** → **"Project"**
2. Select your **SEC_Team_02_2026** repository
3. Configure:
   ```
   Project Name: ims-frontend
   Framework Preset: Vite
   Root Directory: 02_Source/01_Source Code/frontend
   ```

## Step 6: Set Environment Variables

In Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   VITE_API_URL = https://ims-backend.fly.dev
   ```
3. Click **"Save"**

## Step 7: Deploy Frontend

1. Click **"Deploy"**
2. Wait for build & deployment (1-2 minutes)
3. You'll see URL: `https://ims-frontend-[random].vercel.app`

## Step 8: Verify Frontend

Open the URL in browser and check:

- Frontend loads successfully ✅
- Can make API calls to backend ✅
- Data displays from database ✅

## Step 9: (Optional) Connect Custom Domain

1. Go to **Settings** → **Domains**
2. Add your domain
3. Update DNS records according to Vercel's instructions
4. SSL certificate auto-configured

---

<a id="environment-configuration"></a>
# 4️⃣ Environment Configuration

## Configure Backend Environment

Create `.env` file in backend folder:

```bash
cd 02_Source\01_Source\ Code\backend

# Create env file
echo DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST].supabase.co:5432/postgres > .env
echo NODE_ENV=production >> .env
echo PORT=3000 >> .env
```

Or edit manually. Update with Supabase credentials:

```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST].supabase.co:5432/postgres
NODE_ENV=production
PORT=3000
```

## Configure Frontend Environment

Create `.env.local` file in frontend folder:

```env
VITE_API_URL=https://ims-backend.fly.dev
```

## Verify Environments

```bash
# Check backend .env
cat 02_Source\01_Source\ Code\backend\.env

# Check frontend .env
cat 02_Source\01_Source\ Code\frontend\.env.local
```

---

<a id="custom-domain-ssl-setup"></a>
# 5️⃣ Custom Domain & SSL Setup

## Step 1: Configure Domain DNS (Optional)

If using custom domain:

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update **CNAME Records**:
   ```
   yourdomain.com → cname.vercel-dns.com (for Vercel)
   ims-backend.yourdomain.com → fly.io endpoint
   ```
3. Wait for DNS propagation (5-30 minutes)
4. Test: `nslookup yourdomain.com`

## Step 2: Add Domain to Vercel

1. In Vercel Dashboard, go to **Settings** → **Domains**
2. Add your domain
3. Add DNS records as Vercel instructs
4. SSL certificate auto-configured

## Step 3: Add Domain to Fly.io

1. In Fly.io Dashboard, go to your backend app
2. Click **Settings** → **Hostnames**
3. Add custom domain
4. Update DNS records
5. SSL auto-configured

---

<a id="testing-verification"></a>
# 6️⃣ Testing & Verification

## Test Frontend

```bash
# Open in browser
https://ims-frontend-[random].vercel.app
```

Verify:

- React app loads ✅
- Can see UI components ✅
- No console errors ✅

## Test Backend API

```bash
# Get users
curl https://ims-backend.fly.dev/api/users

# Should return:
# {"success":true,"data":[{"id":1,"name":"hello world"}]}
```

## Test Database Connection

From your local machine:

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" -c "SELECT * FROM users;"

# Should return user data
```

## End-to-End Testing

| Test     | URL                                   | Expected        |
| -------- | ------------------------------------- | --------------- |
| Frontend | https://ims-frontend.vercel.app       | React app loads |
| Backend  | https://ims-backend.fly.dev/api/users | JSON data       |
| Database | Supabase Console                      | Tables visible  |

## Verify Integrations

```bash
# On frontend, check Network tab in DevTools
# API calls should go to: https://ims-backend.fly.dev

# Data should flow: Frontend → Backend → Supabase → Frontend
```

---

<a id="monitoring-logs"></a>
# 7️⃣ Monitoring & Logs

## View Backend Logs (Fly.io)

```bash
# Real-time logs
flyctl logs

# Last 100 lines
flyctl logs -n 100

# Specific app
flyctl logs --app ims-backend
```

## View Frontend Logs (Vercel)

1. Go to Vercel Dashboard
2. Select your project
3. Click **"Deployments"** tab
4. Choose deployment → View **"Logs"**

## Monitor Performance

### IMS Telemetry Stack (Prometheus + Grafana + Loki + Tempo + OTEL)

```bash
# Start observability stack in local/full environment
cd 02_Source/01_Source\ Code
docker-compose up -d otel-collector tempo loki prometheus alertmanager grafana

# Verify telemetry endpoints
curl http://localhost:3000/metrics
curl http://localhost:9090/-/ready
curl http://localhost:3100/ready
curl http://localhost:3200/ready
```

Default local endpoints:

- Grafana: http://localhost:3001 (use credentials from .env)
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Loki: http://localhost:3100
- Tempo: http://localhost:3200

### Grafana Dashboards

Pre-provisioned dashboard:

- `IMS Observability Overview`

Data sources provisioned automatically:

- Prometheus (metrics)
- Loki (logs)
- Tempo (traces)

### Email Alerts Configuration

Set these values in `.env` before starting Alertmanager:

```env
SMTP_SMARTHOST=smtp.gmail.com:587
SMTP_FROM=alerts@example.com
SMTP_AUTH_USERNAME=alerts@example.com
SMTP_AUTH_PASSWORD=app-password
ALERT_EMAIL_TO=ops-team@example.com
```

Current default alert rules:

- `BackendDown` (critical)
- `HighHttpErrorRate` (high)
- `HighP95Latency` (medium)

### Metrics Authentication

The backend `/metrics` endpoint requires a token. Keep these two values identical:

1. `.env` variable `METRICS_AUTH_TOKEN`
2. `monitoring/prometheus/metrics-token.txt` content

Create the local token file from template before running compose:

```bash
cp monitoring/prometheus/metrics-token.txt.example monitoring/prometheus/metrics-token.txt
```

### Fly.io Monitoring

1. Dashboard → Select app
2. View:
   - CPU usage
   - Memory usage
   - Request metrics
   - Response times

### Vercel Analytics

1. Dashboard → Settings → Analytics
2. View:
   - Core Web Vitals
   - Response times
   - Error rates

### Supabase Metrics

1. Go to https://app.supabase.com
2. Select project
3. **Statistics** → View:
   - Database size
   - API calls
   - Auth events

---

<a id="updates-maintenance"></a>
# 8️⃣ Updates & Maintenance

## Deploy Code Updates

### Backend Updates (Fly.io)

```bash
cd 02_Source\01_Source\ Code\backend

# Commit changes
git add .
git commit -m "Update backend"
git push origin master

# Deploy to Fly.io
flyctl deploy
```

### Frontend Updates (Vercel)

```bash
cd 02_Source\01_Source\ Code\frontend

# Commit changes
git add .
git commit -m "Update frontend"
git push origin master

# Vercel auto-deploys on push! ✅
```

## Regular Maintenance

### Fly.io Backend

```bash
# Check app status
flyctl status

# View resource usage
flyctl metrics

# Scale resources if needed
flyctl scale vm shared-cpu-1x
```

### Supabase Database

1. Monitor storage usage in dashboard
2. Check for slow queries in logs
3. Create indexes if needed for performance

### Vercel Frontend

- Automatically handles updates
- Check **Analytics** for performance
- Review deployments in dashboard

## Backup Strategy

### Supabase Auto-Backups

- Daily backups: keep 7 days
- Weekly backups: keep 4 weeks
- Monthly backups: keep 3 months

### Manual Database Backup

```bash
# Backup to local file
pg_dump "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" > backup_$(date +%Y%m%d).sql

# Restore from backup
psql "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" < backup_20260206.sql
```

---

<a id="backup-recovery"></a>
# 9️⃣ Backup & Recovery

## Supabase Database Backups

### Automatic Backups

Supabase provides:

- Daily backups (7 days retention)
- Weekly backups (4 weeks retention)
- Monthly backups (3 months retention)

### Manual Backup & Restore

```bash
# Create backup
pg_dump "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" > ims_backup_$(date +%Y%m%d).sql

# Restore from backup
psql "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" < ims_backup_20260206.sql
```

## Code Backup

- GitHub acts as your code repository
- All commits are preserved
- Can revert to any previous commit:

```bash
# View commit history
git log --oneline

# Revert to specific commit
git revert [COMMIT_HASH]
```

## Disaster Recovery Plan

| Issue           | Recovery                                |
| --------------- | --------------------------------------- |
| Backend down    | Fly.io auto-restarts, check logs        |
| Database down   | Restore from Supabase backup            |
| Frontend broken | Revert to previous Vercel deployment    |
| Total loss      | Restore from database backup + redeploy |

---

<a id="troubleshooting"></a>
# 🔟 Troubleshooting

## Backend Issues

### Payment Method Required Error

**Issue:** "You'll need to add a payment method in order to proceed"

**Cause:** You ran `flyctl launch` without `--no-db`, so Fly.io auto-created a Managed Postgres database ($38/month)

**Solution:**

1. Delete the `fly.toml` file:

```bash
cd 02_Source\01_Source\ Code\backend
Remove-Item fly.toml -Force
```

2. Relaunch WITHOUT database:

```bash
flyctl launch --no-db
```

3. Skip payment by pressing `N` when asked

4. Continue with Step 5 normally

**✅ Result:** Free deployment using Supabase instead of Managed Postgres

---

### Fly.io App Not Starting

```bash
# Check logs
flyctl logs

# Check app status
flyctl status

# Restart app
flyctl restart

# Check environment variables
flyctl secrets list
```

### Database Connection Error

```bash
# Verify DATABASE_URL
flyctl secrets list | grep DATABASE_URL

# Test connection from backend logs
flyctl logs | grep -i "database\|connection"

# Check Supabase status
# Go to https://app.supabase.com
```

### Port Issues

```bash
# Fly.io doesn't expose ports directly
# Request goes through: yourdomain.com → Fly.io internal port 3000
# Check nginx/reverse proxy config
```

## Frontend Issues

### Vercel Deployment Failed

1. Check **Deployments** tab in Vercel Dashboard
2. Click failed deployment → View **Build Logs**
3. Common issues:
   - Missing environment variables
   - Build script errors
   - Port conflicts

### API Calls Failing

```bash
# Check VITE_API_URL in .env.local
cat frontend/.env.local

# Verify backend is accessible
curl https://ims-backend.fly.dev/api/users

# Check browser Console for CORS errors
# May need to add Vercel domain to backend CORS
```

### Build Errors

```bash
# Rebuild locally
cd frontend
npm run build

# Check for TypeScript errors
npm run type-check

# Clear cache
rm -rf .next node_modules
npm install
```

## Database Issues

### Can't Connect to Supabase

```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" -c "SELECT 1;"

# Check connection string format
# Should be: postgresql://postgres:PASSWORD@HOST.supabase.co:5432/postgres

# Verify Supabase project is running
# Go to https://app.supabase.com
```

### Database Full (500MB limit)

1. Check storage in Supabase Dashboard
2. Delete old/unused data
3. Optimize table indexes
4. Upgrade plan if needed

## Network Issues

### DNS Not Resolving

```bash
# Test DNS
nslookup yourdomain.com

# Flush DNS cache
ipconfig /flushdns  # Windows
sudo dscacheutil -flushcache  # macOS
sudo systemctl restart nscd  # Linux

# Wait for DNS propagation (up to 30 minutes)
```

### CORS Errors

If frontend can't call backend:

1. Add Vercel domain to backend CORS (if applicable)
2. Check backend is accessible
3. Check Content-Type headers

## Performance Issues

### Slow Loading

1. Check Vercel **Analytics** dashboard
2. Optimize assets:
   - Compress images
   - Minify CSS/JS
   - Use CDN

3. Check database queries:
   - Add indexes
   - Avoid N+1 queries
   - Monitor slow queries

### High Costs

| Issue              | Solution                      |
| ------------------ | ----------------------------- |
| Database too large | Delete old data, upgrade plan |
| Too many requests  | Add caching, optimize queries |
| Backend overload   | Scale Fly.io resources        |

---

<a id="performance-optimization"></a>
# 1️⃣1️⃣ Performance Optimization

## Database Query Optimization

```bash
# Connect to Supabase
psql "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres"
```

## Backend Optimization

1. **Connection Pooling**
   - Fly.io handles this automatically
   - Supabase supports up to 100 connections

2. **Request Caching**
   - Add caching headers in backend
   - Use Redis if needed (paid tier)

3. **Database Indexes**
   - Create on frequently queried columns
   - Monitor slow queries

## Frontend Optimization

1. **Image Optimization**
   - Use Vercel's Image Optimization
   - Compress before upload

2. **Code Splitting**
   - Vite does this automatically
   - Monitor bundle size

3. **Caching**
   - Vercel CDN caches automatically
   - Set Cache-Control headers

## Monitoring Performance

```bash
# Check Fly.io metrics
flyctl metrics

# Check Vercel analytics
# Dashboard → Analytics tab

# Monitor database size
# Supabase → Storage → Database Size
```

---

<a id="security-best-practices"></a>
# 1️⃣2️⃣ Security Best Practices

## Fly.io Backend Security

```bash
# Keep secrets secure
flyctl secrets list  # Only shows key names, not values

# Set secrets (not in code!)
flyctl secrets set SECRET_KEY=value

# Use environment variables for sensitive data
# Never commit .env files to GitHub
```

**Security Checklist:**

- ✅ Never commit .env to GitHub
- ✅ Use flyctl secrets for all sensitive data
- ✅ Keep dependencies updated: `npm audit`
- ✅ Use HTTPS only
- ✅ Validate all inputs
- ✅ Use parameterized SQL (no injection)

## Vercel Frontend Security

```bash
# Check dependencies for vulnerabilities
npm audit

# Update to latest safe versions
npm audit fix

# Before deploying
npm run build  # Test locally first
```

**Security Checklist:**

- ✅ Never expose API keys in frontend
- ✅ Use environment variables
- ✅ Validate all user inputs
- ✅ Use HTTPS (automatic on Vercel)
- ✅ Keep dependencies updated

## Supabase Database Security

1. **Network Access**
   - Supabase allows connections from anywhere
   - Use strong database password
   - Consider IP restrictions if needed

2. **Authentication**
   - Change default password
   - Use strong password (20+ chars)
   - Store securely

3. **Data Protection**
   - Regular backups (automatic)
   - Encrypted connections (SSL)
   - Monitor access logs

## GitHub Repository Security

```bash
# Set repository to private
# GitHub → Settings → Visibility

# Use personal access tokens
# Never share credentials
# Rotate tokens regularly

# Enable branch protection
# Require code review before merge
```

## Secrets Management

**What should be secrets:**

- Database credentials ✅
- API keys ✅
- Passwords ✅
- Private tokens ✅

**What NOT to expose:**

- ❌ Secrets in .env files
- ❌ Secrets in code
- ❌ Secrets in logs
- ❌ Secrets in git history

**How to manage:**

1. Use Fly.io secrets: `flyctl secrets set KEY=value`
2. Use Vercel env vars: Vercel Dashboard
3. Use Supabase for database
4. Use .env.local (local only, never committed)

---

<a id="deployment-checklist"></a>
# ✅ Deployment Checklist

## Pre-Deployment

- [ ] Code committed to GitHub
- [ ] All environment variables configured
- [ ] Database migrations tested locally
- [ ] Build works locally (`npm run build`)
- [ ] All tests passing

## Supabase Setup

- [ ] Project created
- [ ] Database schema imported
- [ ] Connection string obtained
- [ ] Firewall configured
- [ ] Backups enabled

## Fly\.io Backend Deployment

- [ ] Fly CLI installed and logged in
- [ ] Backend app created (`flyctl launch`)
- [ ] Environment variables set (`flyctl secrets set`)
- [ ] Build succeeds locally
- [ ] Backend deployed (`flyctl deploy`)
- [ ] API endpoints responding
- [ ] Logs show no errors
- [ ] Database connection working

## Vercel Frontend Deployment

- [ ] Frontend code in GitHub
- [ ] `.env.local` created with API URL
- [ ] Build works locally (`npm run build`)
- [ ] Project imported to Vercel
- [ ] Environment variables configured
- [ ] Auto-deploy enabled
- [ ] Frontend accessible in browser
- [ ] API calls working

## Integration Testing

- [ ] Frontend loads without errors
- [ ] Can make API calls to backend
- [ ] Database data displays in UI
- [ ] User interactions work
- [ ] Forms submit correctly
- [ ] No console errors

## Security

- [ ] No secrets in code
- [ ] `.env` files in `.gitignore`
- [ ] Using environment variables
- [ ] HTTPS enabled
- [ ] Dependencies updated (`npm audit`)

## Monitoring Setup

- [ ] Fly.io metrics enabled
- [ ] Vercel analytics connected
- [ ] Database monitoring active
- [ ] Error tracking enabled
- [ ] Backups configured

## Documentation

- [ ] Deployment guide updated
- [ ] Environment variables documented
- [ ] Troubleshooting guide created
- [ ] Team informed of deployment

---

<a id="additional-resources"></a>
# 📚 Additional Resources

| Resource        | Link                            |
| --------------- | ------------------------------- |
| Fly.io Docs     | https://fly.io/docs/            |
| Vercel Docs     | https://vercel.com/docs         |
| Supabase Docs   | https://supabase.com/docs       |
| Node.js Express | https://expressjs.com/          |
| React Docs      | https://react.dev               |
| PostgreSQL Docs | https://www.postgresql.org/docs |

---

<a id="support-help"></a>
# 📞 Support & Help

## Common Issues & Solutions

**Can't deploy to Fly.io?**

- Check if `flyctl` is installed: `flyctl version`
- Login to Fly.io: `flyctl auth login`
- Check logs: `flyctl logs`

**Frontend not loading?**

- Clear browser cache
- Check Vercel deployment logs
- Verify environment variables in Vercel dashboard
- Check browser console for errors

**Backend not connecting to database?**

- Verify `DATABASE_URL` in `flyctl secrets list`
- Test connection manually with `psql`
- Check Supabase project is running
- Review backend logs: `flyctl logs`

**API calls failing from frontend?**

- Verify `VITE_API_URL` in .env.local
- Check backend is accessible: `curl https://ims-backend.fly.dev`
- Check for CORS errors in browser console
- Verify API endpoint exists

**Database connection limit reached?**

- Check open connections: `SELECT count(*) FROM pg_stat_activity;`
- Close unused connections
- Restart backend: `flyctl restart`

---
