# راهنمای توسعه‌دهنده

## 🏗️ ساختار پروژه

```
src/
├── server.js                    # سرور اصلی
├── database/
│   ├── connection.js            # اتصال MongoDB
│   ├── models/                  # مدل‌های دیتابیس
│   │   ├── Group.js
│   │   ├── User.js
│   │   ├── GroupMember.js
│   │   └── Statistics.js
│   └── services/                # سرویس‌های دیتابیس
│       ├── groupService.js
│       ├── userService.js
│       └── statsService.js
├── handlers/                    # مدیریت کننده‌ها
│   ├── commandHandler.js        # دستورات عادی
│   ├── messageHandler.js        # مدیریت پیام‌ها
│   ├── replyHandler.js          # دستورات Reply-based
│   └── adminHandler.js          # دستورات مالک
├── services/                    # سرویس‌ها
│   ├── mlService.js             # سرویس ماشین لرنینگ
│   └── permissionService.js     # سرویس دسترسی‌ها
├── utils/                       # ابزارهای کمکی
│   ├── logger.js                # سیستم لاگ
│   ├── idExtractor.js           # استخراج ID
│   └── formatter.js             # فرمت کردن
└── ml/                          # بخش ماشین لرنینگ
    ├── chat_handler.py
    └── requirements.txt
```

## 🔧 توسعه

### اضافه کردن دستور جدید

#### 1. دستور عادی (با /)
```javascript
// در src/handlers/commandHandler.js
setupCommands() {
  this.commands.set('/newcommand', this.handleNewCommand.bind(this));
}

async handleNewCommand(msg) {
  const chatId = msg.chat.id;
  // منطق دستور
  await this.bot.sendMessage(chatId, 'پاسخ دستور');
}
```

#### 2. دستور Reply-based
```javascript
// در src/handlers/replyHandler.js
setupCommands() {
  this.commands.set('دستور_جدید', this.handleNewReplyCommand.bind(this));
}

async handleNewReplyCommand(msg, targetUser, chatId, userId) {
  // منطق دستور
  await this.bot.sendMessage(chatId, 'پاسخ دستور');
}
```

#### 3. دستور مالک
```javascript
// در src/handlers/adminHandler.js
setupCommands() {
  this.commands.set('دستور_مالک', this.handleOwnerCommand.bind(this));
}

async handleOwnerCommand(msg, chatId, userId) {
  // منطق دستور
  await this.bot.sendMessage(chatId, 'پاسخ دستور');
}
```

### اضافه کردن مدل دیتابیس جدید

```javascript
// در src/database/models/NewModel.js
const mongoose = require('mongoose');

const newModelSchema = new mongoose.Schema({
  field1: String,
  field2: Number,
  field3: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
newModelSchema.index({ field1: 1 });

// Methods
newModelSchema.methods.customMethod = function() {
  // منطق متد
};

module.exports = mongoose.model('NewModel', newModelSchema);
```

### اضافه کردن سرویس جدید

```javascript
// در src/database/services/newService.js
const NewModel = require('../models/NewModel');
const logger = require('../../utils/logger');

class NewService {
  async create(data) {
    try {
      const newItem = new NewModel(data);
      await newItem.save();
      return newItem;
    } catch (error) {
      logger.error('Error creating new item:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      return await NewModel.findById(id);
    } catch (error) {
      logger.error('Error finding item by id:', error);
      throw error;
    }
  }
}

module.exports = new NewService();
```

## 🗄️ دیتابیس

### مدل‌های موجود

#### Group
```javascript
{
  _id: String,           // Group ID
  title: String,         // Group title
  type: String,          // group/supergroup/channel
  member_count: Number,  // Member count
  admins: [String],      // Admin user IDs
  created_at: Date,      // Creation date
  last_activity: Date,   // Last activity
  settings: Object,      // Group settings
  statistics: Object     // Group statistics
}
```

#### User
```javascript
{
  _id: String,           // User ID
  username: String,      // Username
  first_name: String,    // First name
  last_name: String,     // Last name
  profile: Object,       // User profile
  activity: Object,      // User activity
  is_bot_owner: Boolean  // Is bot owner
}
```

#### GroupMember
```javascript
{
  _id: String,           // group_id_user_id
  group_id: String,      // Group ID
  user_id: String,       // User ID
  joined_at: Date,       // Join date
  role: String,          // member/admin/creator
  messages_count: Number, // Message count
  last_activity: Date,   // Last activity
  is_active: Boolean     // Is active
}
```

### کوئری‌های مفید

```javascript
// پیدا کردن کاربران فعال
const activeUsers = await User.find({
  'activity.last_seen': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});

// پیدا کردن گروه‌های پرکار
const activeGroups = await Group.find()
  .sort({ 'statistics.total_messages': -1 })
  .limit(10);

// آمار روزانه
const dailyStats = await Statistics.getDailyStats();
```

## 🔐 سیستم دسترسی‌ها

### سطوح دسترسی
- **owner**: مالک بات
- **admin**: مدیر گروه
- **member**: عضو عادی

### بررسی دسترسی
```javascript
// بررسی دسترسی
const hasPermission = await permissionService.checkPermission(userId, chatId, command);

// بررسی مالک بودن
const isOwner = await permissionService.isUserBotOwner(userId);

// بررسی ادمین بودن
const isAdmin = await permissionService.isUserAdmin(userId, chatId);
```

## 📊 سیستم آمارگیری

### آپدیت آمار
```javascript
// آپدیت آمار کاربر
await userService.incrementUserMessageCount(userId, groupId);

// آپدیت آمار گروه
await groupService.incrementGroupMessageCount(groupId);

// آپدیت آمار کلی
await statsService.updateDailyStats();
```

### دریافت آمار
```javascript
// آمار کلی
const overallStats = await statsService.getOverallStats();

// آمار کاربر
const userStats = await statsService.getUserStats(userId);

// آمار گروه
const groupStats = await statsService.getGroupStats(groupId);
```

## 🧪 تست

### تست واحد
```javascript
// در test.js
const assert = require('assert');

async function testUserService() {
  const userService = require('./src/database/services/userService');
  
  // تست ایجاد کاربر
  const user = await userService.createOrUpdateUser({
    id: '123456789',
    first_name: 'Test',
    last_name: 'User'
  });
  
  assert(user.first_name === 'Test');
  console.log('✅ User service test passed');
}
```

### تست یکپارچگی
```javascript
async function testBotIntegration() {
  const { bot } = require('./src/server');
  
  // تست اتصال بات
  const botInfo = await bot.getMe();
  assert(botInfo.id);
  console.log('✅ Bot integration test passed');
}
```

## 🚀 استقرار

### محیط Development
```bash
# نصب وابستگی‌ها
npm install

# راه‌اندازی دیتابیس
mongod

# راه‌اندازی بات
npm run dev
```

### محیط Production
```bash
# با Docker
docker-compose up -d

# بدون Docker
npm start
```

## 📝 بهترین روش‌ها

### کدنویسی
- از async/await استفاده کنید
- خطاها را handle کنید
- لاگ‌ها را بنویسید
- کد را تمیز نگه دارید

### دیتابیس
- از index استفاده کنید
- کوئری‌ها را بهینه کنید
- از aggregation استفاده کنید
- داده‌ها را validate کنید

### امنیت
- دسترسی‌ها را بررسی کنید
- ورودی‌ها را validate کنید
- اطلاعات حساس را محرمانه نگه دارید
- از HTTPS استفاده کنید

## 🆘 عیب‌یابی

### مشکلات رایج
1. **اتصال دیتابیس**
   - بررسی MongoDB
   - بررسی connection string
   - بررسی network

2. **دستورات کار نمی‌کنند**
   - بررسی permissions
   - بررسی command handlers
   - بررسی logs

3. **آمار نمایش داده نمی‌شود**
   - بررسی database queries
   - بررسی data integrity
   - بررسی formatters

### ابزارهای مفید
- MongoDB Compass
- Postman
- VS Code
- Git

---

**نکته:** همیشه قبل از تغییرات مهم، backup بگیرید و تست کنید.
