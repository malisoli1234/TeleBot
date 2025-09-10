# راهنمای Docker

## 🐳 راه‌اندازی با Docker

### 1. نصب Docker
- Docker Desktop را از [docker.com](https://www.docker.com/products/docker-desktop) دانلود کنید
- Docker Compose را نصب کنید

### 2. راه‌اندازی پروژه
```bash
# کلون کردن پروژه
git clone <repository-url>
cd telegram-bot-modular

# کپی کردن فایل محیطی
cp env.example .env

# ویرایش فایل .env
nano .env
```

### 3. تنظیم متغیرهای محیطی
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
BOT_OWNER_ID=your_telegram_user_id_here

# Database (خودکار تنظیم می‌شود)
MONGODB_URI=mongodb://mongodb:27017/telegram_bot

# Server
PORT=3000
NODE_ENV=production
```

### 4. راه‌اندازی با Docker Compose
```bash
# راه‌اندازی تمام سرویس‌ها
docker-compose up -d

# مشاهده لاگ‌ها
docker-compose logs -f

# توقف سرویس‌ها
docker-compose down
```

### 5. مدیریت سرویس‌ها
```bash
# راه‌اندازی مجدد بات
docker-compose restart bot

# راه‌اندازی مجدد دیتابیس
docker-compose restart mongodb

# مشاهده وضعیت سرویس‌ها
docker-compose ps

# حذف تمام داده‌ها
docker-compose down -v
```

## 🔧 تنظیمات پیشرفته

### تنظیمات MongoDB
```yaml
# در docker-compose.yml
mongodb:
  image: mongo:6.0
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: password
  volumes:
    - mongodb_data:/data/db
    - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js
```

### تنظیمات بات
```yaml
# در docker-compose.yml
bot:
  environment:
    - NODE_ENV=production
    - MONGODB_URI=mongodb://admin:password@mongodb:27017/telegram_bot
    - PORT=3000
  volumes:
    - ./logs:/app/logs
    - ./.env:/app/.env
```

## 📊 مانیتورینگ

### مشاهده لاگ‌ها
```bash
# لاگ‌های بات
docker-compose logs -f bot

# لاگ‌های دیتابیس
docker-compose logs -f mongodb

# لاگ‌های همه سرویس‌ها
docker-compose logs -f
```

### بررسی وضعیت
```bash
# وضعیت سرویس‌ها
docker-compose ps

# استفاده از منابع
docker stats

# بررسی سلامت بات
curl http://localhost:3000/health
```

## 🚀 استقرار در Production

### 1. تنظیمات امنیتی
```bash
# تغییر رمزهای عبور
# تنظیم فایروال
# استفاده از SSL/TLS
```

### 2. پشتیبان‌گیری
```bash
# پشتیبان‌گیری از دیتابیس
docker-compose exec mongodb mongodump --out /backup

# بازیابی دیتابیس
docker-compose exec mongodb mongorestore /backup
```

### 3. به‌روزرسانی
```bash
# به‌روزرسانی کد
git pull

# ساخت مجدد تصاویر
docker-compose build

# راه‌اندازی مجدد
docker-compose up -d
```

## 🆘 عیب‌یابی

### مشکلات رایج
1. **سرویس راه‌اندازی نمی‌شود**
   ```bash
   # بررسی لاگ‌ها
   docker-compose logs
   
   # بررسی وضعیت
   docker-compose ps
   ```

2. **دیتابیس متصل نمی‌شود**
   ```bash
   # بررسی اتصال
   docker-compose exec bot ping mongodb
   
   # بررسی پورت‌ها
   netstat -tulpn | grep 27017
   ```

3. **بات پاسخ نمی‌دهد**
   ```bash
   # بررسی توکن
   docker-compose exec bot env | grep TELEGRAM
   
   # بررسی لاگ‌ها
   docker-compose logs bot
   ```

### دستورات مفید
```bash
# ورود به کانتینر
docker-compose exec bot sh

# بررسی فایل‌ها
docker-compose exec bot ls -la

# بررسی متغیرهای محیطی
docker-compose exec bot env
```

## 📝 نکات مهم

- همیشه فایل `.env` را محرمانه نگه دارید
- از پشتیبان‌گیری منظم استفاده کنید
- لاگ‌ها را منظم بررسی کنید
- منابع سرور را مانیتور کنید

---

**نکته:** برای استفاده در production، تنظیمات امنیتی و مانیتورینگ را جدی بگیرید.
