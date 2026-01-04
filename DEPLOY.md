# RLBot GCP Deployment - Quick Start

## Trước Khi Deploy

### 1. Chuẩn Bị Environment Files

**Copy và điền thông tin:**

```bash
# Root folder
cp .env.example .env
# Điền DB_PASSWORD

# Backend
cp backend/.env.example backend/.env
# Điền: GEMINI_API_KEY, DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET

# Frontend
# File .env.production đã có sẵn, cần điền SUPABASE thông tin
```

### 2. Supabase Dashboard

Vào [supabase.com](https://supabase.com) → Project Settings → Authentication → URL Configuration:

- **Site URL**: `https://rlbot.dpdns.org`
- **Redirect URLs**: `https://rlbot.dpdns.org/**`

---

## Deploy Lên VM

### Step 1: Upload bằng WinSCP

1. Mở WinSCP
2. Connect tới VM: `username@[EXTERNAL_IP]`
3. Upload toàn bộ folder `RLBot_Share1` vào `~/RLBot`

### Step 2: SSH vào VM và chạy

```bash
cd ~/RLBot
chmod +x deploy.sh
./deploy.sh
# Chọn option 1 (Full install)
```

---

## Files Đã Tạo

| File | Mô Tả |
|------|-------|
| `docker-compose.prod.yml` | Docker Compose production |
| `nginx/nginx.conf` | Nginx với SSL |
| `nginx/nginx.init.conf` | Nginx không SSL (setup ban đầu) |
| `deploy.sh` | Script deploy tự động |
| `.env.example` | Template env root |
| `backend/.env.example` | Template backend |
| `frontend/.env.production` | Frontend production env |

---

## Checklist

- [ ] Điền `backend/.env` với API keys
- [ ] Điền `frontend/.env.production` với Supabase info
- [ ] Tạo `.env` từ `.env.example`
- [ ] Thêm domain vào Supabase Redirect URLs
- [ ] Mở port 80, 443 trên GCP Firewall
- [ ] DNS trỏ `rlbot.dpdns.org` → External IP

---

## Commands Hữu Ích

```bash
# Xem logs
docker compose -f docker-compose.prod.yml logs -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Stop
docker compose -f docker-compose.prod.yml down

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build
```
