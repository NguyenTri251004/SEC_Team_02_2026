# 🚀 Deploy lên DigitalOcean Droplet + Supabase

Hướng dẫn chi tiết deploy **Frontend** + **Backend** lên **DigitalOcean Droplet** và **Database** lên **Supabase**.

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Your Custom Domain                   │
│    (yourdomain.com / IP address)             │
└──────────────────────┬──────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼──────────┐         ┌──────▼──────────┐
    │  DigitalOcean │         │    Supabase     │
    │    Droplet    │         │   PostgreSQL    │
    │  (Ubuntu 22)  │         │    (Cloud DB)   │
    │               │         │                 │
    │ ┌─────────┐   │         │ ┌─────────────┐ │
    │ │Frontend │   │         │ │   Database  │ │
    │ │ (React) │   │────────────│ (Postgres)  │ │
    │ │ :5173   │   │         │ │ :5432       │ │
    │ └────┬────┘   │         │ └─────────────┘ │
    │      │        │         │                 │
    │ ┌────▼─────┐  │         └─────────────────┘
    │ │ Backend  │  │
    │ │(Express) │  │
    │ │ :3000    │  │
    │ └──────────┘  │
    │               │
    └───────────────┘
      $6-12/month
```

---

## 📋 Yêu cầu

✅ DigitalOcean account (https://www.digitalocean.com)  
✅ Supabase account (https://app.supabase.com)  
✅ GitHub account (với private repo)  
✅ Domain name (tùy chọn, có thể dùng IP)  
✅ SSH key setup  
✅ Firewall access

---

## ⚡ Quick Deploy Checklist

| Bước      | Task                        | Est. Time   |
| --------- | --------------------------- | ----------- |
| 1         | Setup Supabase Database     | 5 min       |
| 2         | Create DigitalOcean Droplet | 2 min       |
| 3         | Upload & Run Deploy Script  | 10 min      |
| 4         | Configure .env.prod         | 5 min       |
| 5         | Setup Domain & SSL          | 15 min      |
| 6         | Test & Monitor              | 5 min       |
| **TOTAL** |                             | **~45 min** |

---

## 📚 Table of Contents

- [Supabase Database Setup](#1-supabase-database-setup)
- [DigitalOcean Droplet Setup](#2-digitalocean-droplet-setup)
- [Deployment Script](#3-deployment-script)
- [Environment Configuration](#4-environment-configuration)
- [Domain & SSL](#5-domain--ssl-setup)
- [Monitoring](#6-monitoring--logs)
- [Maintenance](#7-maintenance)
- [Troubleshooting](#8-troubleshooting)
- [Backup & Recovery](#9-backup--recovery)

---

# 1️⃣ Supabase Database Setup

## Bước 1: Tạo Supabase Project

1. Vào https://app.supabase.com
2. Click **"New Project"**
3. Cấu hình:
   ```
   Organization: (create or select)
   Project name: ims-production
   Password: [strong password - save it!]
   Region: Singapore (gần Việt Nam nhất)
   ```
4. Click **"Create new project"** (chờ 3-5 phút)

## Bước 2: Lấy Connection String

1. Đợi project ready
2. Vào **Settings** → **Database**
3. Tab **"Connection string"** → Copy **URI** format:
   ```
   postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres
   ```
4. **Lưu thông tin này** (sẽ cần cho .env.prod)

**Variables:**

- `[PASSWORD]`: Database password bạn vừa tạo
- `[HOST]`: Unique ID của project (ví dụ: `db.cposdksrjwblusvegmsl`)

## Bước 3: Import Database Schema

### Cách A: Sử dụng Supabase SQL Editor (Dễ)

1. Vào **SQL Editor** trong Supabase Dashboard
2. Click **"New Query"**
3. Copy nội dung từ file `db_schema/db-init.sql`
4. Paste vào editor
5. Click **"Run"**
6. ✅ Chờ schema được tạo (1-2 giây)

### Cách B: Sử dụng psql (Command Line)

```bash
# Lấy connection string từ Supabase
# Thay [CONNECTION_STRING] với URI từ bước 2

psql "[CONNECTION_STRING]" -f db_schema/db-init.sql

# Verify database
psql "[CONNECTION_STRING]" -c "\dt"
```

## Bước 4: Verify Database

Kiểm tra schema được tạo:

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

## Bước 5: Firewall & Network (Important!)

Supabase cho phép tất cả connections từ bên ngoài.  
Nếu cần restrict, thêm IP whitelist:

1. **Settings** → **Network**
2. Add IP ranges nếu cần
3. Keep default (allow all) để dễ

---

# 2️⃣ DigitalOcean Droplet Setup

## Bước 1: Tạo Droplet

1. DigitalOcean Dashboard → **Droplets** → **Create Droplet**

2. **Choose Region**

   ```
   Region: Singapore (gần nhất)
   ```

3. **Choose Image**

   ```
   OS: Ubuntu
   Version: 22.04 LTS (Recommended)
   ```

4. **Choose Size**

   ```
   💰 $6/month (1GB RAM) - Good for Dev/Small Production
   💰 $12/month (2GB RAM) - Recommended for Production
   ```

5. **Authentication**

   ```
   SSH Key (Recommended)
   - If you don't have one, click "New SSH Key"
   - Follow prompts to generate
   ```

6. **Hostname**

   ```
   ims-server-prod
   ```

7. **Backups** (Optional)

   ```
   Enable: Yes (3 backups, $1.20/month)
   ```

8. Click **"Create Droplet"** (chờ 1-2 phút)

## Bước 2: SSH vào Droplet

```bash
# Lấy IP từ DigitalOcean Dashboard

ssh root@[DROPLET_IP]

# First time: accept fingerprint
# Type: yes
```

**Verify bạn đã connect:**

```bash
hostname
# Output: ubuntu-server (hoặc hostname bạn chọn)

pwd
# Output: /root
```

---

# 3️⃣ Deployment Script

## Bước 1: Upload Deploy Script

**Cách 1: Manual (Dễ nhất)**

```bash
# SSh vào droplet (from bước 2)
nano deploy.sh

# Copy toàn bộ nội dung từ deploy.sh file
# Paste (Ctrl+Shift+V)
# Save (Ctrl+X → y → Enter)
```

**Cách 2: SCP từ Local Machine**

```powershell
# Windows PowerShell
scp "C:\Users\HP\clones\SEC_Team_02_2026\02_Source\01_Source Code\deploy.sh" root@[DROPLET_IP]:/root/
```

## Bước 2: Chạy Deploy Script

```bash
# SSH vào droplet first
ssh root@[DROPLET_IP]

# Chạy script
chmod +x deploy.sh
./deploy.sh
```

Script sẽ:

- ✅ Update system packages
- ✅ Install Docker & Docker Compose
- ✅ Install Git & Certbot
- ✅ Setup GitHub authentication
- ✅ Clone repository
- ✅ Create .env.prod template

---

# 4️⃣ Environment Configuration

## Bước 1: Edit .env.prod

```bash
# SSH vào droplet
ssh root@[DROPLET_IP]

# Navigate to project
cd /root/SEC_Team_02_2026/02_Source/01_Source\ Code

# Edit environment file
nano .env.prod
```

## Bước 2: Update Environment Variables

```env
# ==========================================
# Database (Supabase)
# ==========================================
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST].supabase.co:5432/postgres

# ==========================================
# Backend Configuration
# ==========================================
NODE_ENV=production
PORT=3000

# ==========================================
# Frontend Configuration
# ==========================================
# Format: https://yourdomain.com (with domain)
# Or: http://[DROPLET_IP] (without domain)
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# ==========================================
# If using IP address instead of domain:
# ==========================================
# FRONTEND_URL=http://[DROPLET_IP]
# BACKEND_URL=http://[DROPLET_IP]:3000
```

## Bước 3: Verify Environment

```bash
# Kiểm tra file
cat .env.prod

# Output should show:
# DATABASE_URL=postgresql://postgres:...
# NODE_ENV=production
# PORT=3000
# FRONTEND_URL=...
# BACKEND_URL=...
```

---

# 5️⃣ Build & Start Services

## Bước 1: Build Docker Images

```bash
# From /root/SEC_Team_02_2026/02_Source/01_Source\ Code
docker-compose -f docker-compose.prod.yml build

# This will:
# - Build backend image
# - Build frontend image
# - Download Nginx image
```

**Monitor build:**

```bash
# In another terminal, monitor disk usage
df -h
```

## Bước 2: Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d

# Output:
# Creating ims-backend ... done
# Creating ims-frontend ... done
# Creating ims-nginx ... done
```

## Bước 3: Verify Services Starting

```bash
# Check status
docker-compose -f docker-compose.prod.yml ps

# Expected output:
# NAME           STATUS
# ims-backend    Up 30 seconds (healthy)
# ims-frontend   Up 25 seconds
# ims-nginx      Up 20 seconds

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Wait for "Connected to PostgreSQL" message in backend logs
```

---

# 6️⃣ Domain & SSL Setup

## Bước 1: Configure Domain DNS (Optional)

**If using custom domain:**

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update **A Records**:
   ```
   @ → [DROPLET_IP]
   www → [DROPLET_IP]
   api → [DROPLET_IP]  (optional, for API subdomain)
   ```
3. ⏳ Wait for DNS propagation (5-30 minutes)
4. Test: `nslookup yourdomain.com`

**If using IP address only:**

Skip to testing section below.

## Bước 2: Setup SSL Certificate (Recommended)

```bash
# Stop services temporarily
docker-compose -f docker-compose.prod.yml stop

# Install certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Select email for renewal notices
# Agree to terms
# Share email: no

# Output shows certificate location:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

## Bước 3: Enable HTTPS in Nginx

```bash
# Edit nginx config
nano nginx.prod.conf

# Find section: # server { listen 443 ssl http2;
# Remove ALL # from that section

# Update domain name (search for 'yourdomain.com'):
# Line: server_name yourdomain.com www.yourdomain.com;
# Update to your actual domain
```

## Bước 4: Restart Services

```bash
# Restart with SSL enabled
docker-compose -f docker-compose.prod.yml up -d

# Verify HTTPS
curl https://yourdomain.com

# Should return HTML (no SSL errors)
```

## Bước 5: Auto-Renewal Setup

```bash
# Test renewal (dry-run, doesn't actually renew)
sudo certbot renew --dry-run

# Setup auto-renewal with cron
sudo crontab -e

# Add line:
0 3 * * * certbot renew --quiet --post-hook "cd /root/SEC_Team_02_2026/02_Source/01_Source\ Code && docker-compose -f docker-compose.prod.yml restart"

# Save (Ctrl+X → y → Enter)
```

---

# 7️⃣ Testing & Verification

## Test Frontend

```bash
# Option 1: Using IP
curl http://[DROPLET_IP]

# Option 2: Using Domain + HTTPS
curl https://yourdomain.com

# Should return HTML content
```

## Test Backend API

```bash
# Get users
curl http://[DROPLET_IP]:3000/api/users

# Should return:
# {"success":true,"data":[{"id":1,"name":"hello world"}]}
```

## Test Database Connection

```bash
# From droplet
docker-compose -f docker-compose.prod.yml logs backend

# Should see:
# ✓ Connected to Supabase PostgreSQL database
```

## Browser Testing

| URL                     | Expected                  |
| ----------------------- | ------------------------- |
| http://[IP]             | React app loads           |
| http://[IP]/api/users   | JSON with users data      |
| http://[IP]:3000/health | `{"status":"ok"}`         |
| https://yourdomain.com  | React app + HTTPS lock 🔒 |

---

# 8️⃣ Monitoring & Logs

## View Real-time Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Last 50 lines + follow
docker-compose -f docker-compose.prod.yml logs --tail 50 -f backend
```

## Check Service Status

```bash
# Overall status
docker-compose -f docker-compose.prod.yml ps

# Detailed container info
docker ps -a

# Container resource usage
docker stats

# Check specific service
docker-compose -f docker-compose.prod.yml exec backend /bin/sh -c "curl http://localhost:3000/health"
```

## Database Connection Check

```bash
# Test Supabase connection
psql "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" -c "SELECT COUNT(*) FROM users;"

# Should return: 1 (from sample data)
```

---

# 9️⃣ Maintenance & Updates

## Regular Maintenance

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# View system logs
journalctl -xe

# Clean up Docker
docker system prune -a --volumes
```

## Update Code

```bash
# Pull latest from GitHub
git pull origin master

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Verify
docker-compose -f docker-compose.prod.yml ps
```

## Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Stop all
docker-compose -f docker-compose.prod.yml down

# Start all
docker-compose -f docker-compose.prod.yml up -d
```

## View Supabase Metrics

1. Go to https://app.supabase.com
2. Select project
3. **Statistics** → View:
   - Database size
   - API calls
   - Auth events
   - Real-time subscriptions

---

# 🔟 Backup & Recovery

## Database Backups (Supabase)

### Automatic Backups

Supabase provides:

- Daily backups (retained 7 days)
- Weekly backups (retained 4 weeks)
- Monthly backups (retained 3 months)

### Manual Backup

```bash
# Backup database to local file
pg_dump "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" > ims_backup_$(date +%Y%m%d).sql

# Restore from backup
psql "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" < ims_backup_20260206.sql
```

## Droplet Snapshots

```bash
# From DigitalOcean Dashboard:
# 1. Select Droplet
# 2. Click "Snapshots"
# 3. Click "Take Snapshot"
# 4. Name: ims-prod-backup-[DATE]

# Restore from snapshot:
# 1. Click "More" → "Restore from Snapshot"
# 2. Select snapshot
# 3. Choose target Droplet
```

---

# 1️⃣1️⃣ Troubleshooting

### Port 80/443 In Use

```bash
# Find process
lsof -i :80
lsof -i :443

# Kill process
kill -9 [PID]

# Or restart docker
docker-compose -f docker-compose.prod.yml restart
```

### Database Connection Error

```bash
# Check DATABASE_URL
cat .env.prod | grep DATABASE_URL

# Test connection
psql "postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres" -c "\dt"

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose -f docker-compose.prod.yml logs frontend

# Verify Nginx config
docker-compose -f docker-compose.prod.yml exec frontend nginx -t

# Rebuild frontend
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Disk Space Issues

```bash
# Check usage
df -h

# Remove old images
docker image prune -a

# Remove volumes
docker volume prune

# Check docker usage
du -sh /var/lib/docker/
```

### SSL Certificate Issues

```bash
# List certificates
certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -dates
```

---

# 1️⃣2️⃣ Performance Optimization

## Database Query Optimization

```bash
# Check slow queries
psql "[DATABASE_URL]" -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Create indexes on frequently used columns
psql "[DATABASE_URL]" -c "CREATE INDEX idx_materials_type ON materials(material_type);"
```

## Backend Optimization

```yaml
# In docker-compose.prod.yml, add resource limits:
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 512M
        reservations:
          cpus: "0.5"
          memory: 256M
```

## Frontend Caching

Already configured in `nginx.prod.conf`:

- Static files cached 1 year
- JS/CSS cached 1 year
- Images cached 30 days
- Gzip compression enabled

---

# 1️⃣3️⃣ Security Best Practices

```bash
# 1. Keep system updated
apt update && apt upgrade -y

# 2. Check firewall
ufw status

# 3. Monitor logs
tail -f /var/log/auth.log

# 4. Check failed SSH attempts
grep "Failed password" /var/log/auth.log | wc -l

# 5. Disable root SSH login (optional)
# Edit /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Restart: systemctl restart sshd

# 6. Check open ports
netstat -tuln

# 7. Validate SSL
openssl s_client -connect yourdomain.com:443
```

---

# ✅ Deployment Checklist

- [ ] Supabase project created
- [ ] Database schema imported
- [ ] Droplet created & accessible
- [ ] Deploy script uploaded & executed
- [ ] .env.prod configured correctly
- [ ] Docker images built successfully
- [ ] All services running (docker ps)
- [ ] Frontend accessible via browser
- [ ] API endpoints responding
- [ ] Database connected (logs show success)
- [ ] Domain DNS configured (if using domain)
- [ ] SSL certificate installed
- [ ] HTTPS working with lock icon
- [ ] Auto-renewal configured
- [ ] Monitoring & alerts set up
- [ ] Backup strategy in place

---

# 📚 Additional Resources

| Resource            | Link                            |
| ------------------- | ------------------------------- |
| DigitalOcean Docs   | https://docs.digitalocean.com   |
| Supabase Docs       | https://supabase.com/docs       |
| Docker Compose Docs | https://docs.docker.com/compose |
| PostgreSQL Docs     | https://www.postgresql.org/docs |
| Nginx Docs          | https://nginx.org/en/docs       |
| Let's Encrypt       | https://letsencrypt.org         |

---

## 📞 Support & Help

**Can't connect to database?**

- Check DATABASE_URL format
- Verify Supabase project is running
- Check firewall rules

**Services not starting?**

- View logs: `docker-compose logs -f`
- Check disk space: `df -h`
- Rebuild: `docker-compose build --no-cache`

**Domain not resolving?**

- Wait for DNS propagation (up to 30 min)
- Test: `nslookup yourdomain.com`
- Check A record in registrar

**SSL certificate not working?**

- Verify domain is accessible
- Check certificate location
- Restart nginx: `docker-compose restart`

---

**Deployed successfully? 🎉**

Next steps:

1. Monitor application performance
2. Set up automated backups
3. Configure monitoring alerts
4. Plan scaling strategy
5. Document your setup

**Happy Deploying!** 🚀

---

## ⚡ Cách 1: Quick Deploy (Khuyên dùng)

### Bước 1: Tạo Droplet

1. **DigitalOcean Dashboard** → **Droplets** → **Create Droplet**
2. Cấu hình:
   ```
   Image: Ubuntu 22.04 LTS
   Size: Basic $6/month (1GB RAM)
   Region: Singapore (gần Việt Nam)
   Authentication: SSH Key (khuyên dùng)
   Hostname: ims-server
   ```
3. Click **Create Droplet** (chờ 1-2 phút)

### Bước 2: SSH vào Droplet

```bash
ssh root@[DROPLET_IP]
```

Thay `[DROPLET_IP]` với IP của Droplet (hiển thị trên Dashboard)

### Bước 3: Copy Deployment Script

⚠️ **Repository là PRIVATE**, không thể download trực tiếp từ GitHub.

**Cách 1: Manual Upload (Dễ nhất)**

1. Tạo file `deploy.sh` trên Droplet:

   ```bash
   nano deploy.sh
   ```

2. Copy nội dung từ file [`deploy.sh`](deploy.sh) của project

3. Paste vào terminal (Ctrl+Shift+V)

4. Lưu file (Ctrl+X → Y → Enter)

5. Chạy script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

**Cách 2: SCP Upload**

Từ máy local, upload script:

```bash
scp deploy.sh root@[DROPLET_IP]:/root/
```

SSH vào Droplet:

```bash
ssh root@[DROPLET_IP]
chmod +x deploy.sh
./deploy.sh
```

### Bước 4: Chạy Script & Chọn Authentication

Script sẽ hỏi chọn phương thức xác thực GitHub:

```
Choose authentication method (1 or 2):
Option 1: Personal Access Token (PAT) - Easier
Option 2: SSH Key - More secure
```

**Lựa chọn 1️⃣: Personal Access Token (Khuyên dùng - Dễ hơn)**

1. Vào: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Cấu hình:
   - **Token name**: `DigitalOcean Droplet`
   - **Expiration**: 90 days (hoặc custom)
   - **Scopes**: Tích vào `repo` (full control)
4. Click **"Generate token"**
5. Copy token (⚠️ Chỉ hiển thị một lần)
6. Quay lại terminal, dán token khi được hỏi
7. Nhập GitHub username

**Lựa chọn 2️⃣: SSH Key (Bảo mật hơn)**

Script sẽ tự động:

1. Tạo SSH key của droplet
2. Hiển thị public key
3. Bạn thêm vào GitHub:
   - Vào: https://github.com/settings/keys
   - Click **"New SSH key"**
   - Paste public key
   - Click **"Add SSH key"**
4. Quay lại terminal, nhấn Enter để tiếp tục

### Bước 5: Cấu hình Environment

```bash
nano .env.prod
```

Cập nhật với Supabase credentials:

```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST].supabase.co:5432/postgres
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

**Lấy Supabase Connection String:**

1. Vào: https://app.supabase.com
2. Chọn project
3. **Settings** → **Database** → **Connection String** → **URI**
4. Copy & dán vào `DATABASE_URL`
5. Lưu file (Ctrl+X → Y → Enter)

### Bước 5: Khởi động Services

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Bước 6: Kiểm tra Status

```bash
docker-compose -f docker-compose.prod.yml ps
```

Output nên hiển thị:

```
ims-backend    running
ims-frontend   running
ims-nginx      running
```

### Bước 7: Truy cập Ứng dụng

```
http://[DROPLET_IP]
```

Hoặc nếu có domain:

```
http://yourdomain.com
```

---

## 🔐 Setup SSL Certificate (Optional nhưng Khuyên dùng)

### Bước 1: Cấu hình Domain DNS

Trong registrar của bạn (GoDaddy, Namecheap, etc.), thêm A Record:

```
@ → [DROPLET_IP]
www → [DROPLET_IP]
api → [DROPLET_IP]  (nếu dùng subdomain cho API)
```

Chờ DNS propagate (5-30 phút)

### Bước 2: Cài Let's Encrypt SSL

```bash
# Dừng nginx tạm thời
docker-compose -f docker-compose.prod.yml stop

# Cài certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Xác nhận email
```

### Bước 3: Cấu hình HTTPS

Edit `nginx.prod.conf`:

```bash
nano nginx.prod.conf
```

Bỏ comment phần HTTPS (tìm `# server {` với `listen 443`)

Update domain name:

```nginx
server_name yourdomain.com www.yourdomain.com;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### Bước 4: Khởi động lại

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Bước 5: Setup Auto-Renewal

```bash
# Test renewal
certbot renew --dry-run

# Setup cron job (tự động renew 30 ngày trước expiry)
certbot renew --quiet --no-eff-email

# Thêm vào crontab
crontab -e

# Add line:
0 3 * * * certbot renew --quiet --post-hook "docker-compose -f /root/SEC_Team_02_2026/02_Source/01_Source\ Code/docker-compose.prod.yml restart"
```

---

## 📊 Monitoring & Quản lý

### Xem Logs

```bash
# Tất cả services
docker-compose -f docker-compose.prod.yml logs -f

# Chỉ backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Chỉ frontend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Chỉ 50 dòng cuối
docker-compose -f docker-compose.prod.yml logs --tail 50
```

### Khởi động lại Services

```bash
# Tất cả
docker-compose -f docker-compose.prod.yml restart

# Chỉ backend
docker-compose -f docker-compose.prod.yml restart backend

# Chỉ frontend
docker-compose -f docker-compose.prod.yml restart frontend
```

### Dừng Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Code

```bash
cd /root/SEC_Team_02_2026/02_Source/01_Source\ Code

# Pull latest
git pull origin master

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Kiểm tra Disk Usage

```bash
du -sh docker_*
df -h
```

### Xóa Old Images

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

---

## 🐛 Troubleshooting

### Port 80/443 đã được sử dụng

```bash
# Tìm process sử dụng port
lsof -i :80
lsof -i :443

# Kill process
kill -9 [PID]
```

### Database Connection Error

```bash
# Kiểm tra DATABASE_URL
cat .env.prod | grep DATABASE_URL

# Ping Supabase host
ping db.cposdksrjwblusvegmsl.supabase.co

# Xem backend logs
docker-compose -f docker-compose.prod.yml logs backend
```

### Container không khởi động

```bash
# Xem chi tiết lỗi
docker-compose -f docker-compose.prod.yml logs -f

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### DNS không resolve

```bash
# Test DNS
nslookup yourdomain.com

# Chờ propagation
dig yourdomain.com
```

---

## 📈 Performance Tips

### 1. Giảm RAM Usage

Trong `docker-compose.prod.yml`, thêm resource limits:

```yaml
services:
  backend:
    # ...
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
```

### 2. Enable Gzip Compression

Đã được enable trong `nginx.prod.conf`

### 3. Caching

Thêm vào `nginx.prod.conf`:

```nginx
# Cache static files 1 year
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 4. Database Connection Pool

Supabase mặc định cho phép 100 connections khá tốt

---

## 💰 Cost Optimization

| Lựa chọn    | Chi phí/tháng | Ram   | Notes                           |
| ----------- | ------------- | ----- | ------------------------------- |
| Droplet $5  | $5            | 512MB | Quá nhỏ, không khuyên dùng      |
| Droplet $6  | $6            | 1GB   | 👍 Đủ cho dev/small production  |
| Droplet $12 | $12           | 2GB   | 👍 Tốt cho small-medium traffic |
| Droplet $24 | $24           | 4GB   | 👍 Medium traffic               |
| Managed App | $12+          | Auto  | Tự động scaling                 |

---

## 🔄 Tự động Deploy từ GitHub (Optional)

### Cài đặt GitHub Actions

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DO_HOST }}
          username: root
          key: ${{ secrets.DO_SSH_KEY }}
          script: |
            cd /root/SEC_Team_02_2026/02_Source/01_Source\ Code
            git pull origin master
            docker-compose -f docker-compose.prod.yml up -d --build
```

Thêm GitHub Secrets:

- `DO_HOST`: Droplet IP
- `DO_SSH_KEY`: SSH private key

---

## ✅ Checklist

- [ ] Droplet tạo thành công
- [ ] SSH vào Droplet được
- [ ] Deploy script chạy OK
- [ ] .env.prod được cấu hình
- [ ] Docker containers running
- [ ] Ứng dụng accessible tại http://[DROPLET_IP]
- [ ] Domain DNS pointing tới Droplet
- [ ] SSL certificate installed
- [ ] HTTPS working
- [ ] Database kết nối OK
- [ ] Frontend hiển thị data từ backend
- [ ] Logs không có error

---

## 📞 Support

**Kiểm tra lại:**

1. DATABASE_URL có đúng không?
2. Firewall port 80, 443 có open không?
3. DNS đã propagate chưa?
4. Docker daemon đang chạy?

**Xem logs:**

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

**Restart all:**

```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

---

**Happy Deploying! 🎉**
