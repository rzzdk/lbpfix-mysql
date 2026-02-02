# Panduan Deployment - Sistem Presensi PT Lestari Bumi Persada

## Persyaratan Sistem

### Server Requirements
- Node.js 18.x atau lebih baru
- MySQL 8.0 atau MariaDB 10.5+
- RAM minimal 512MB
- Storage minimal 1GB

### Dependencies
- npm atau pnpm package manager

---

## Langkah-langkah Deployment

### 1. Persiapan Database MySQL

#### a. Login ke MySQL Server
```bash
mysql -u root -p
```

#### b. Buat User Database (Recommended)
```sql
CREATE USER 'presensi_user'@'localhost' IDENTIFIED BY 'password_kuat_anda';
GRANT ALL PRIVILEGES ON presensi_db.* TO 'presensi_user'@'localhost';
FLUSH PRIVILEGES;
```

#### c. Buat Database dan Schema
```bash
# Menggunakan script SQL langsung
mysql -u presensi_user -p < scripts/database-schema.sql

# Atau menggunakan npm script
npm run db:setup
```

#### d. Setup Users dengan Password Ter-hash
```bash
# Pastikan .env sudah dikonfigurasi
node scripts/setup-database.js
```

---

### 2. Konfigurasi Environment Variables

#### a. Salin file contoh
```bash
cp .env.example .env
```

#### b. Edit file .env
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=presensi_user
DB_PASSWORD=password_kuat_anda
DB_NAME=presensi_db
DB_POOL_SIZE=10

# Security (WAJIB DIGANTI DI PRODUCTION!)
JWT_SECRET=ganti_dengan_string_random_minimal_32_karakter
SESSION_SECRET=ganti_dengan_string_random_berbeda

# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_BASE_URL=https://domain-anda.com
```

---

### 3. Build Aplikasi

```bash
# Install dependencies
npm install

# Build production
npm run build
```

Build akan menghasilkan folder `.next/standalone` yang berisi aplikasi yang siap deploy.

---

### 4. Menjalankan Aplikasi

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run start
```

#### Dengan PM2 (Recommended untuk Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start aplikasi
pm2 start npm --name "presensi-app" -- start

# Auto-restart saat server reboot
pm2 startup
pm2 save
```

---

### 5. Konfigurasi Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name domain-anda.com;

    # Redirect HTTP ke HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name domain-anda.com;

    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security Headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Struktur Database

### Tabel Utama

| Tabel | Deskripsi |
|-------|-----------|
| `users` | Data karyawan dan admin |
| `attendance_records` | Rekaman kehadiran harian |
| `overtime_records` | Rekaman lembur |
| `work_schedules` | Jadwal kerja per hari |
| `holidays` | Daftar hari libur |
| `sessions` | Sesi login aktif |

### Views

| View | Deskripsi |
|------|-----------|
| `v_daily_attendance` | Summary kehadiran harian |
| `v_monthly_stats` | Statistik bulanan per karyawan |

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Employee | budi | budi123 |
| Employee | siti | siti123 |
| Employee | agus | agus123 |

**PENTING: Segera ganti password default setelah deployment!**

---

## Health Check

Endpoint untuk memeriksa status aplikasi:
```
GET /api/health
```

Response jika sehat:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "api": "running"
  }
}
```

---

## Troubleshooting

### Error: Connection refused to MySQL
- Pastikan MySQL service berjalan: `systemctl status mysql`
- Periksa konfigurasi host dan port di `.env`
- Pastikan user MySQL memiliki izin yang benar

### Error: Authentication failed
- Periksa username dan password MySQL di `.env`
- Pastikan user memiliki akses ke database

### Error: Table doesn't exist
- Jalankan ulang schema: `npm run db:migrate`
- Pastikan semua tabel terbuat dengan benar

### Application tidak bisa diakses
- Periksa firewall: `sudo ufw allow 3000`
- Periksa log aplikasi: `pm2 logs presensi-app`

---

## Backup Database

### Manual Backup
```bash
mysqldump -u presensi_user -p presensi_db > backup_$(date +%Y%m%d).sql
```

### Restore Backup
```bash
mysql -u presensi_user -p presensi_db < backup_20260101.sql
```

### Automated Backup dengan Cron
```bash
# Edit crontab
crontab -e

# Tambahkan (backup setiap hari jam 2 pagi)
0 2 * * * mysqldump -u presensi_user -pPASSWORD presensi_db > /backup/presensi_$(date +\%Y\%m\%d).sql
```

---

## Security Checklist

- [ ] Ganti semua password default
- [ ] Gunakan HTTPS dengan SSL certificate
- [ ] Konfigurasi firewall (hanya buka port yang diperlukan)
- [ ] Set `NODE_ENV=production`
- [ ] Gunakan JWT_SECRET yang kuat (minimal 32 karakter random)
- [ ] Aktifkan SSL untuk koneksi database (jika remote)
- [ ] Backup database secara berkala
- [ ] Monitor log aplikasi secara rutin

---

## Kontak Support

Jika mengalami kendala, hubungi:
- Email: support@lestaribumi.co.id
- Dokumentasi: [Link dokumentasi internal]
