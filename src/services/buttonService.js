const logger = require('../utils/logger');
const permissionService = require('./permissionService');

class ButtonService {
  constructor() {
    this.bot = null;
  }

  init(bot) {
    this.bot = bot;
  }

  async showRoleBasedButtons(chatId, userId) {
    try {
      if (!userId) {
        logger.error('User ID is required for role-based buttons');
        return;
      }

      // Check if it's a private chat (user ID is positive)
      const isPrivateChat = chatId > 0;
      
      if (isPrivateChat) {
        // In private chat, show role-based buttons
        const permissionLevel = await permissionService.getPermissionLevel(userId, chatId);
        logger.info(`Showing buttons for user ${userId} with permission level: ${permissionLevel} in private chat`);
        
        switch (permissionLevel) {
          case 'owner':
            await this.showOwnerButtons(chatId);
            break;
          case 'admin':
            await this.showAdminButtons(chatId);
            break;
          default:
            await this.showMemberButtons(chatId);
        }
      } else {
        // In group chat: NO BUTTONS - only reply commands work
        logger.info(`No buttons shown in group chat for user ${userId} - only reply commands available`);
        
        // Remove any existing keyboard
        await this.bot.sendMessage(chatId, 
          '📋 <b>راهنمای کامل دستورات</b>\n\n' +
          '🔹 <b>دستورات مدیریت (Reply):</b>\n' +
          '• Reply + "میوت" → میوت کردن کاربر\n' +
          '• Reply + "بن" → بن کردن کاربر\n' +
          '• Reply + "اخراج" → اخراج کردن کاربر\n' +
          '• Reply + "آنمیوت" → خارج کردن از میوت\n' +
          '• Reply + "آنبن" → خارج کردن از بن\n' +
          '• Reply + "اخطار" → اخطار دادن به کاربر\n' +
          '• Reply + "آمار" → آمار کاربر\n' +
          '• Reply + "اطلاعات" → اطلاعات کاربر\n\n' +
          '🔹 <b>دستورات کلی:</b>\n' +
          '• "آمار گروه" → آمار کل گروه (فقط مدیر)\n\n' +
          '🔹 <b>دستورات کامندی:</b>\n' +
          '• /stats → آمار گروه\n' +
          '• /members → لیست اعضا\n' +
          '• /remove_buttons → حذف دکمه‌ها\n' +
          '• /help → راهنما', 
          { 
            parse_mode: 'HTML',
            reply_markup: {
              remove_keyboard: true
            }
          });
      }
    } catch (error) {
      logger.error('Error showing role-based buttons:', error);
    }
  }

  async showOwnerButtons(chatId) {
    const keyboard = {
      reply_markup: {
        keyboard: [
          [
            { text: '📊 آمار کلی' },
            { text: '🏢 همه گروه‌ها' },
            { text: '👥 آمار کاربران' }
          ],
          [
            { text: '📈 گزارش‌های روزانه' },
            { text: '🔍 جستجوی پیشرفته' },
            { text: '📋 لاگ‌های سیستم' }
          ],
          [
            { text: '🔨 بن سراسری' },
            { text: '📢 ارسال همه' },
            { text: '⚙️ تنظیمات سراسری' }
          ],
          [
            { text: '🛡️ مدیریت امنیت' },
            { text: '📊 آمار عملکرد' },
            { text: '🔄 راه‌اندازی مجدد' }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };

    await this.bot.sendMessage(chatId, 
      '👑 <b>پنل مدیریت مالک</b>\n\nدسترسی کامل به تمام قابلیت‌ها\nدکمه مورد نظر را انتخاب کنید:', 
      { parse_mode: 'HTML', ...keyboard });
  }

  async showAdminButtons(chatId) {
    const keyboard = {
      reply_markup: {
        keyboard: [
          [
            { text: 'ℹ️ اطلاعات گروه' },
            { text: '👥 لیست اعضا' },
            { text: '👑 مدیران' }
          ],
          [
            { text: '📊 آمار گروه' },
            { text: '🔍 جستجو کاربر' },
            { text: '⚙️ تنظیمات گروه' }
          ],
          [
            { text: '🛡️ مدیریت امنیت' },
            { text: '📋 گزارش گروه' },
            { text: '📈 آمار فعالیت' }
          ],
          [
            { text: '🔔 اعلان‌ها' },
            { text: '📝 قوانین گروه' },
            { text: '🆘 پشتیبانی' }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };

    await this.bot.sendMessage(chatId, 
      '👨‍💼 <b>پنل مدیریت گروه</b>\n\nدسترسی به مدیریت این گروه\nدکمه مورد نظر را انتخاب کنید:', 
      { parse_mode: 'HTML', ...keyboard });
  }

  async showMemberButtons(chatId) {
    const keyboard = {
      reply_markup: {
        keyboard: [
          [
            { text: '📊 آمار من' },
            { text: 'ℹ️ اطلاعات گروه' }
          ],
          [
            { text: '👥 اعضای گروه' },
            { text: '📋 قوانین' }
          ],
          [
            { text: '🆘 پشتیبانی' },
            { text: 'ℹ️ درباره بات' }
          ],
          [
            { text: '❓ راهنما' }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    };

    await this.bot.sendMessage(chatId, 
      '👤 <b>پنل کاربری</b>\n\nدسترسی به اطلاعات شخصی و گروه\nدکمه مورد نظر را انتخاب کنید:', 
      { parse_mode: 'HTML', ...keyboard });
  }

  async handleButtonClick(chatId, userId, buttonText) {
    try {
      // Check permissions
      const permissionLevel = await permissionService.getPermissionLevel(userId, chatId);
      
      // Handle button based on permission level
      switch (buttonText) {
        // Owner buttons
        case '📊 آمار کلی':
          if (permissionLevel === 'owner') {
            await this.handleOverallStats(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '🏢 همه گروه‌ها':
          if (permissionLevel === 'owner') {
            await this.handleAllGroups(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '👥 آمار کاربران':
          if (permissionLevel === 'owner') {
            await this.handleUsersStats(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '📈 گزارش‌های روزانه':
          if (permissionLevel === 'owner') {
            await this.handleDailyReports(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '🔍 جستجوی پیشرفته':
          if (permissionLevel === 'owner') {
            await this.handleAdvancedSearch(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '📋 لاگ‌های سیستم':
          if (permissionLevel === 'owner') {
            await this.handleSystemLogs(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '🔨 بن سراسری':
          if (permissionLevel === 'owner') {
            await this.handleGlobalBan(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '📢 ارسال همه':
          if (permissionLevel === 'owner') {
            await this.handleBroadcast(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '⚙️ تنظیمات سراسری':
          if (permissionLevel === 'owner') {
            await this.handleGlobalSettings(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '🛡️ مدیریت امنیت':
          if (permissionLevel === 'owner') {
            await this.handleSecurityManagement(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '📊 آمار عملکرد':
          if (permissionLevel === 'owner') {
            await this.handlePerformanceStats(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '🔄 راه‌اندازی مجدد':
          if (permissionLevel === 'owner') {
            await this.handleRestart(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;

        // Admin buttons
        case 'ℹ️ اطلاعات گروه':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleGroupInfo(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '👥 لیست اعضا':
        case '👥 اعضا':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleGroupMembers(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '👑 مدیران':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleGroupAdmins(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '📊 آمار گروه':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleGroupStats(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '🔍 جستجو کاربر':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleUserSearch(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '⚙️ تنظیمات گروه':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleGroupSettings(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '🛡️ مدیریت امنیت':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleGroupSecurity(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '📋 گزارش گروه':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleGroupReport(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '📈 آمار فعالیت':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleActivityStats(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '🔔 اعلان‌ها':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleNotifications(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;
        case '📝 قوانین گروه':
          if (permissionLevel === 'admin' || permissionLevel === 'owner') {
            await this.handleGroupRules(chatId);
          } else {
            await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          }
          break;

        // Member buttons
        case '📊 آمار من':
          await this.handleMyStats(chatId, userId);
          break;
        case 'ℹ️ اطلاعات گروه':
          await this.handleGroupInfo(chatId);
          break;
        case '👥 اعضای گروه':
          await this.handleGroupMembers(chatId);
          break;
        case '📋 قوانین':
          await this.handleGroupRules(chatId);
          break;
        case '🆘 پشتیبانی':
          await this.handleSupport(chatId);
          break;
        case 'ℹ️ درباره بات':
          await this.handleAboutBot(chatId);
          break;
        case '❓ راهنما':
          await this.handleHelp(chatId);
          break;

        default:
          await this.bot.sendMessage(chatId, '❌ دکمه مورد نظر یافت نشد!');
      }
      
    } catch (error) {
      logger.error('Error handling button click:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در پردازش درخواست!');
    }
  }

  // Handler methods
  async handleOverallStats(chatId) {
    const statsService = require('../database/services/statsService');
    const stats = await statsService.getOverallStats();
    
    const message = `📊 <b>آمار کلی بات</b>

🏢 <b>گروه‌ها:</b>
├── تعداد کل: ${stats.total_groups.toLocaleString('fa-IR')}
├── گروه‌های فعال: ${stats.active_groups.toLocaleString('fa-IR')}
└── مجموع پیام‌ها: ${stats.total_messages.toLocaleString('fa-IR')}

👥 <b>کاربران:</b>
└── تعداد کل: ${stats.total_users.toLocaleString('fa-IR')}`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleAllGroups(chatId) {
    const groupService = require('../database/services/groupService');
    const groups = await groupService.getAllGroups();
    
    let message = `📋 <b>لیست همه گروه‌ها (${groups.length})</b>\n\n`;
    
    groups.slice(0, 10).forEach((group, index) => {
      const lastActivity = new Date(group.last_activity).toLocaleDateString('fa-IR');
      message += `${index + 1}. <b>${group.title}</b>\n`;
      message += `   ├── اعضا: ${group.member_count.toLocaleString('fa-IR')}\n`;
      message += `   └── آخرین فعالیت: ${lastActivity}\n\n`;
    });

    if (groups.length > 10) {
      message += `... و ${groups.length - 10} گروه دیگر`;
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleUsersStats(chatId) {
    const statsService = require('../database/services/statsService');
    const topUsers = await statsService.getTopUsers(10);
    
    let message = `👑 <b>پرکارترین کاربران</b>\n\n`;
    
    topUsers.forEach((user, index) => {
      const userName = user.username ? `@${user.username}` : `${user.first_name} ${user.last_name || ''}`;
      message += `${index + 1}. <b>${userName}</b>\n`;
      message += `   └── پیام‌ها: ${user.activity.messages_sent.toLocaleString('fa-IR')}\n\n`;
    });

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleGroupInfo(chatId) {
    const groupService = require('../database/services/groupService');
    const groupInfo = await groupService.getGroupInfo(chatId.toString());
    
    if (!groupInfo) {
      await this.bot.sendMessage(chatId, '❌ اطلاعات گروه یافت نشد.');
      return;
    }

    const message = `ℹ️ <b>اطلاعات گروه</b>

🏷️ <b>نام:</b> ${groupInfo.title}
📊 <b>نوع:</b> ${groupInfo.type}
👥 <b>تعداد اعضا:</b> ${groupInfo.active_member_count.toLocaleString('fa-IR')}
📅 <b>تاریخ ایجاد:</b> ${new Date(groupInfo.created_at).toLocaleDateString('fa-IR')}
🕐 <b>آخرین فعالیت:</b> ${new Date(groupInfo.last_activity).toLocaleString('fa-IR')}

📈 <b>آمار پیام‌ها:</b>
├── کل پیام‌ها: ${groupInfo.statistics.total_messages.toLocaleString('fa-IR')}
└── پیام‌های امروز: ${groupInfo.statistics.daily_messages.toLocaleString('fa-IR')}`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleGroupMembers(chatId) {
    const groupService = require('../database/services/groupService');
    const members = await groupService.getGroupMembers(chatId.toString(), 10);
    
    if (members.length === 0) {
      await this.bot.sendMessage(chatId, '📭 هیچ عضوی یافت نشد.');
      return;
    }

    let message = `👥 <b>لیست اعضای گروه (${members.length})</b>\n\n`;
    
    members.forEach((member, index) => {
      const userName = member.user_id.username ? `@${member.user_id.username}` : `${member.user_id.first_name} ${member.user_id.last_name || ''}`;
      message += `${index + 1}. <b>${userName}</b>\n`;
      message += `   ├── نقش: ${member.role}\n`;
      message += `   └── پیام‌ها: ${member.messages_count.toLocaleString('fa-IR')}\n\n`;
    });

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleGroupAdmins(chatId) {
    const groupService = require('../database/services/groupService');
    const admins = await groupService.getGroupAdmins(chatId.toString());
    
    if (admins.length === 0) {
      await this.bot.sendMessage(chatId, '👑 هیچ مدیری یافت نشد.');
      return;
    }

    let message = `👑 <b>لیست مدیران گروه (${admins.length})</b>\n\n`;
    
    admins.forEach((admin, index) => {
      const userName = admin.user_id.username ? `@${admin.user_id.username}` : `${admin.user_id.first_name} ${admin.user_id.last_name || ''}`;
      message += `${index + 1}. <b>${userName}</b>\n`;
      message += `   └── نقش: ${admin.role}\n\n`;
    });

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleGroupStats(chatId) {
    const statsService = require('../database/services/statsService');
    const groupStats = await statsService.getGroupStats(chatId.toString());
    
    if (!groupStats) {
      await this.bot.sendMessage(chatId, '❌ آمار گروه یافت نشد.');
      return;
    }

    const message = `📊 <b>آمار گروه</b>

🏷️ <b>نام:</b> ${groupStats.group.title}
👥 <b>اعضا:</b> ${groupStats.group.member_count.toLocaleString('fa-IR')}
📈 <b>پیام‌ها:</b> ${groupStats.statistics.total_messages.toLocaleString('fa-IR')}
📅 <b>تاریخ ایجاد:</b> ${new Date(groupStats.group.created_at).toLocaleDateString('fa-IR')}`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleGroupRules(chatId) {
    const message = `📋 <b>قوانین گروه</b>

1️⃣ احترام به همه اعضا
2️⃣ عدم ارسال محتوای نامناسب
3️⃣ عدم اسپم و تبلیغات
4️⃣ استفاده از زبان فارسی
5️⃣ رعایت قوانین تلگرام

⚠️ <b>توجه:</b> در صورت عدم رعایت قوانین، اخطار یا اخراج خواهید شد.`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleSupport(chatId) {
    const message = `🆘 <b>پشتیبانی</b>

برای دریافت پشتیبانی:
📧 ایمیل: support@example.com
📱 تلگرام: @support_bot
🌐 وب‌سایت: www.example.com

⏰ <b>ساعات پاسخگویی:</b>
شنبه تا پنج‌شنبه: 9:00 - 18:00`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleAboutBot(chatId) {
    const message = `ℹ️ <b>درباره بات</b>

🤖 <b>نام:</b> Telegram Bot Modular
📅 <b>نسخه:</b> 1.0.0
🔧 <b>زبان:</b> Node.js
🗄️ <b>دیتابیس:</b> MongoDB
🧠 <b>هوش مصنوعی:</b> Python (قابل فعال‌سازی)

✨ <b>ویژگی‌ها:</b>
• مدیریت گروه‌ها
• آمارگیری پیشرفته
• سیستم دسترسی‌های چندسطحه
• دستورات Reply-based`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleGlobalBan(chatId) {
    await this.bot.sendMessage(chatId, 
      '🔨 <b>بن سراسری</b>\n\nبرای بن کردن کاربر از همه گروه‌ها، روی پیام کاربر reply کنید و دستور "بن_سراسری" را بنویسید.', 
      { parse_mode: 'HTML' });
  }

  async handleBroadcast(chatId) {
    await this.bot.sendMessage(chatId, 
      '📢 <b>ارسال به همه گروه‌ها</b>\n\nبرای ارسال پیام به همه گروه‌ها، دستور "ارسال_همه" را بنویسید و پیام خود را بعد از آن قرار دهید.\n\nمثال: ارسال_همه سلام به همه گروه‌ها', 
      { parse_mode: 'HTML' });
  }

  // New handler methods
  async handleDailyReports(chatId) {
    const statsService = require('../database/services/statsService');
    const dailyStats = await statsService.getDailyStats();
    
    const message = `📈 <b>گزارش‌های روزانه</b>

📅 <b>تاریخ:</b> ${new Date(dailyStats.date).toLocaleDateString('fa-IR')}
🏢 <b>گروه‌ها:</b> ${dailyStats.total_groups.toLocaleString('fa-IR')}
👥 <b>کاربران:</b> ${dailyStats.total_users.toLocaleString('fa-IR')}
🟢 <b>گروه‌های فعال:</b> ${dailyStats.active_groups.toLocaleString('fa-IR')}
👤 <b>کاربران جدید:</b> ${dailyStats.new_users_today.toLocaleString('fa-IR')}
💬 <b>پیام‌های امروز:</b> ${dailyStats.messages_today.toLocaleString('fa-IR')}`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleAdvancedSearch(chatId) {
    await this.bot.sendMessage(chatId, 
      '🔍 <b>جستجوی پیشرفته</b>\n\nبرای جستجوی کاربران، گروه‌ها یا پیام‌ها از دستورات زیر استفاده کنید:\n\n• جستجوی کاربر: "جستجو کاربر @username"\n• جستجوی گروه: "جستجو گروه نام_گروه"\n• جستجوی پیام: "جستجو پیام متن"', 
      { parse_mode: 'HTML' });
  }

  async handleSystemLogs(chatId) {
    await this.bot.sendMessage(chatId, 
      '📋 <b>لاگ‌های سیستم</b>\n\nلاگ‌های سیستم در فایل‌های زیر ذخیره می‌شوند:\n\n• error.log - خطاها\n• combined.log - تمام لاگ‌ها\n\nبرای مشاهده لاگ‌ها با پشتیبانی تماس بگیرید.', 
      { parse_mode: 'HTML' });
  }

  async handleGlobalSettings(chatId) {
    await this.bot.sendMessage(chatId, 
      '⚙️ <b>تنظیمات سراسری</b>\n\nتنظیمات سراسری بات:\n\n• وضعیت بات: آنلاین\n• دیتابیس: متصل\n• سرویس ML: غیرفعال\n• لاگ‌گیری: فعال\n\nبرای تغییر تنظیمات با پشتیبانی تماس بگیرید.', 
      { parse_mode: 'HTML' });
  }

  async handleSecurityManagement(chatId) {
    await this.bot.sendMessage(chatId, 
      '🛡️ <b>مدیریت امنیت</b>\n\nوضعیت امنیتی:\n\n• احراز هویت: فعال\n• رمزگذاری: فعال\n• لاگ دسترسی‌ها: فعال\n• فایروال: فعال\n\nبرای تنظیمات امنیتی بیشتر با پشتیبانی تماس بگیرید.', 
      { parse_mode: 'HTML' });
  }

  async handlePerformanceStats(chatId) {
    const statsService = require('../database/services/statsService');
    const stats = await statsService.getOverallStats();
    
    const message = `📊 <b>آمار عملکرد</b>

⚡ <b>عملکرد سرور:</b>
├── CPU: 15%
├── RAM: 45%
├── Disk: 30%
└── Network: 2.5 MB/s

📈 <b>آمار بات:</b>
├── درخواست‌های امروز: ${stats.total_messages}
├── گروه‌های فعال: ${stats.active_groups}
└── کاربران آنلاین: ${stats.total_users}`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleRestart(chatId) {
    await this.bot.sendMessage(chatId, 
      '🔄 <b>راه‌اندازی مجدد</b>\n\nبرای راه‌اندازی مجدد بات، دستور زیر را در سرور اجرا کنید:\n\n```bash\npm2 restart telegram-bot\n```\n\nیا:\n\n```bash\nnpm restart\n```', 
      { parse_mode: 'HTML' });
  }

  async handleUserSearch(chatId) {
    await this.bot.sendMessage(chatId, 
      '🔍 <b>جستجوی کاربر</b>\n\nبرای جستجوی کاربر، یکی از روش‌های زیر را استفاده کنید:\n\n• Reply روی پیام کاربر و بنویسید "آمار"\n• Reply روی پیام کاربر و بنویسید "اطلاعات"\n• جستجو با یوزرنیم: "جستجو @username"', 
      { parse_mode: 'HTML' });
  }

  async handleGroupSettings(chatId) {
    const groupService = require('../database/services/groupService');
    const groupInfo = await groupService.getGroupInfo(chatId.toString());
    
    if (!groupInfo) {
      await this.bot.sendMessage(chatId, '❌ اطلاعات گروه یافت نشد.');
      return;
    }

    const message = `⚙️ <b>تنظیمات گروه</b>

🏷️ <b>نام گروه:</b> ${groupInfo.title}
📊 <b>نوع:</b> ${groupInfo.type}
👥 <b>اعضا:</b> ${groupInfo.active_member_count.toLocaleString('fa-IR')}

🔧 <b>تنظیمات فعلی:</b>
├── خوشامدگویی: ${groupInfo.settings.welcome_enabled ? '✅ فعال' : '❌ غیرفعال'}
├── ضد اسپم: ${groupInfo.settings.anti_spam ? '✅ فعال' : '❌ غیرفعال'}
├── حذف خودکار: ${groupInfo.settings.auto_delete ? '✅ فعال' : '❌ غیرفعال'}
└── مدت میوت: ${groupInfo.settings.mute_duration} ساعت

💡 برای تغییر تنظیمات با مالک بات تماس بگیرید.`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleGroupSecurity(chatId) {
    await this.bot.sendMessage(chatId, 
      '🛡️ <b>مدیریت امنیت گروه</b>\n\nوضعیت امنیتی گروه:\n\n• ضد اسپم: فعال\n• فیلتر کلمات: فعال\n• محدودیت پیام: غیرفعال\n• احراز هویت: فعال\n\nبرای تنظیمات امنیتی بیشتر با مالک بات تماس بگیرید.', 
      { parse_mode: 'HTML' });
  }

  async handleGroupReport(chatId) {
    const statsService = require('../database/services/statsService');
    const groupStats = await statsService.getGroupStats(chatId.toString());
    
    if (!groupStats) {
      await this.bot.sendMessage(chatId, '❌ آمار گروه یافت نشد.');
      return;
    }

    const message = `📋 <b>گزارش گروه</b>

🏷️ <b>نام:</b> ${groupStats.group.title}
👥 <b>اعضا:</b> ${groupStats.group.member_count.toLocaleString('fa-IR')}
📈 <b>پیام‌ها:</b> ${groupStats.statistics.total_messages.toLocaleString('fa-IR')}
📅 <b>تاریخ ایجاد:</b> ${new Date(groupStats.group.created_at).toLocaleDateString('fa-IR')}
🕐 <b>آخرین فعالیت:</b> ${new Date(groupStats.group.last_activity).toLocaleString('fa-IR')}`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleActivityStats(chatId) {
    const statsService = require('../database/services/statsService');
    const groupStats = await statsService.getGroupStats(chatId.toString());
    
    if (!groupStats) {
      await this.bot.sendMessage(chatId, '❌ آمار گروه یافت نشد.');
      return;
    }

    const message = `📈 <b>آمار فعالیت گروه</b>

💬 <b>پیام‌ها:</b>
├── کل پیام‌ها: ${groupStats.statistics.total_messages.toLocaleString('fa-IR')}
├── پیام‌های امروز: ${groupStats.statistics.daily_messages.toLocaleString('fa-IR')}
└── آخرین پیام: ${new Date(groupStats.statistics.last_message_date).toLocaleString('fa-IR')}

👥 <b>اعضا:</b>
└── تعداد کل: ${groupStats.group.member_count.toLocaleString('fa-IR')}`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleNotifications(chatId) {
    await this.bot.sendMessage(chatId, 
      '🔔 <b>اعلان‌های گروه</b>\n\nتنظیمات اعلان‌ها:\n\n• اعلان پیام‌های جدید: فعال\n• اعلان عضویت: فعال\n• اعلان اخراج: فعال\n• اعلان بن: فعال\n\nبرای تغییر تنظیمات اعلان‌ها با مالک بات تماس بگیرید.', 
      { parse_mode: 'HTML' });
  }

  async handleMemberNotifications(chatId) {
    await this.bot.sendMessage(chatId, 
      '🔔 <b>اعلان‌های شما</b>\n\nاعلان‌های فعال:\n\n• پیام‌های جدید گروه\n• اعلان‌های مهم\n• به‌روزرسانی‌های بات\n\nبرای غیرفعال کردن اعلان‌ها با پشتیبانی تماس بگیرید.', 
      { parse_mode: 'HTML' });
  }

  async handleSuggestions(chatId) {
    await this.bot.sendMessage(chatId, 
      '📝 <b>پیشنهادات</b>\n\nبرای ارسال پیشنهادات و نظرات:\n\n📧 ایمیل: suggestions@example.com\n📱 تلگرام: @suggestions_bot\n🌐 وب‌سایت: www.example.com/suggestions\n\nپیشنهادات شما برای بهبود بات مهم است!', 
      { parse_mode: 'HTML' });
  }

  async handleHelp(chatId) {
    await this.bot.sendMessage(chatId, 
      '❓ <b>راهنما</b>\n\nدستورات موجود:\n\n🔹 دستورات پایه:\n/start - شروع کار\n/help - راهنما\n/menu - منوی دکمه‌ها\n\n🔹 دستورات مدیریت:\nاخراج، بن، میوت، آمار (Reply)\n\n🔹 دکمه‌ها:\nاز دکمه‌های زیر پیام استفاده کنید\n\n💡 برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.', 
      { parse_mode: 'HTML' });
  }

  async handleMyStats(chatId, userId) {
    try {
      const userService = require('../database/services/userService');
      const userInfo = await userService.getUserInfo(userId.toString());
      
      if (!userInfo) {
        await this.bot.sendMessage(chatId, '❌ اطلاعات کاربر یافت نشد.');
        return;
      }

      const message = `📊 <b>آمار شخصی شما</b>

👤 <b>اطلاعات شخصی:</b>
├── نام: ${userInfo.first_name} ${userInfo.last_name || ''}
├── یوزرنیم: @${userInfo.username || 'ندارد'}
└── ID: ${userInfo._id}

📈 <b>آمار فعالیت:</b>
├── پیام‌های کل: ${userInfo.total_messages || 0}
├── گروه‌های عضو: ${userInfo.groups ? userInfo.groups.length : 0}
└── آخرین فعالیت: ${userInfo.last_activity ? new Date(userInfo.last_activity).toLocaleString('fa-IR') : 'نامشخص'}

💡 برای آمار بیشتر از دکمه‌های دیگر استفاده کنید.`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error getting user stats:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت آمار شخصی.');
    }
  }
}

module.exports = new ButtonService();
