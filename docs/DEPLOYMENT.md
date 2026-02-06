# Deployment Guide - IMS Application

## Overview
Deploy Backend (Express + TypeScript) and Frontend (React + Vite) to DigitalOcean App Platform.

**Stack:**
- Backend: Express.js + PostgreSQL (Supabase)
- Frontend: React + Vite
- Database: Supabase PostgreSQL (Cloud)

**Cost:** $5/month (Backend) + FREE (Frontend)

---

## Prerequisites

1. **GitHub Repository:** Code pushed to GitHub
2. **DigitalOcean Account:** https://cloud.digitalocean.com
3. **Supabase Database:** Already configured

---

## Step 1: Deploy Backend

### DigitalOcean App Platform Setup:

1. **Dashboard → Apps → Create App**
2. **Connect GitHub:**
   - Repository: `NguyenTri251004/SEC_Team_02_2026`
   - Branch: `master`
   - Source Directory: `02_Source/01_Source Code/backend`
   - Autodeploy: ✅ Enabled

3. **App Configuration:**
   - Type: Web Service (Dockerfile detected)
   - Name: `ims-backend`
   - Region: Singapore
   - Plan: Basic ($5/month)

4. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.cposdksrjwblusvegmsl.supabase.co:5432/postgres
   PORT=8080
   NODE_ENV=production
   ```

5. **HTTP Settings:**
   - HTTP Port: `3000`
   - Health Check Path: `/health`

6. **Deploy:** Click "Create Resources"

**Backend URL:** `https://ims-backend-xxxxx.ondigitalocean.app`

---

## Step 2: Deploy Frontend

### Update Production Config:

1. **Update `.env.production`:**
   ```bash
   VITE_API_URL=https://ims-backend-xxxxx.ondigitalocean.app
   ```

2. **Commit & Push:**
   ```bash
   git add 02_Source/01_Source\ Code/frontend/.env.production
   git commit -m "Update production API URL"
   git push origin master
   ```

### DigitalOcean Setup:

1. **Dashboard → Apps → Create App**
2. **Connect GitHub:** Same repository
   - Source Directory: `02_Source/01_Source Code/frontend`

3. **App Configuration:**
   - Type: Static Site
   - Name: `ims-frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Plan: Starter (FREE)

4. **Deploy:** Click "Create Resources"

**Frontend URL:** `https://ims-frontend-xxxxx.ondigitalocean.app`

---

## Verification

### Backend Health Check:
```bash
curl https://ims-backend-xxxxx.ondigitalocean.app/health
# Expected: {"status":"ok"}
```

### Backend API Test:
```bash
curl https://ims-backend-xxxxx.ondigitalocean.app/api/data
# Expected: {"success":true,"data":[...]}
```

### Frontend:
Open `https://ims-frontend-xxxxx.ondigitalocean.app` in browser.
Should display users list from Supabase.

---

## Local Docker Testing

### Build & Run with Docker Compose:
```bash
cd "02_Source/01_Source Code"
docker-compose up -d
```

**Access:**
- Backend: http://localhost:3000
- Frontend: http://localhost:80

**Stop:**
```bash
docker-compose down
```

---

## Troubleshooting

### Backend Deployment Issues:
- Check environment variables in DigitalOcean dashboard
- Verify Supabase connection string
- Check build logs for errors

### Frontend Not Loading Data:
- Verify `VITE_API_URL` points to correct backend URL
- Check CORS settings in backend
- Inspect browser console for errors

### Database Connection Failed:
- Verify Supabase credentials
- Check if IP whitelist is configured (Supabase allows all by default)
- Test connection locally first

---

## Monitoring

**DigitalOcean Dashboard:**
- App Metrics
- Deployment Logs
- Runtime Logs
- Resource Usage

**Supabase Dashboard:**
- Database Metrics
- Query Performance
- Connection Pool

---

## Updating Deployment

**Auto-deploy on push:**
```bash
git add .
git commit -m "Update feature"
git push origin master
```

DigitalOcean will automatically rebuild and deploy.

**Manual Redeploy:**
DigitalOcean Dashboard → App → Settings → Force Rebuild & Deploy

---

## Cost Breakdown

| Service | Cost |
|---------|------|
| Backend (Basic) | $5/month |
| Frontend (Static) | FREE |
| Supabase (Free tier) | FREE |
| **Total** | **$5/month** |

---

## Support

- **DigitalOcean Docs:** https://docs.digitalocean.com/products/app-platform/
- **Supabase Docs:** https://supabase.com/docs
- **GitHub Issues:** Report bugs in repository issues

---

**Last Updated:** February 6, 2026
