const logger = require('../utils/logger');
const mlService = require('../services/mlService');
const buttonService = require('../services/buttonService');

class CommandHandler {
  constructor() {
    this.bot = null;
    this.commands = new Map();
    this.setupCommands();
  }

  init(bot) {
    this.bot = bot;
    this.registerCommands();
    buttonService.init(bot);
  }

  setupCommands() {
    // Basic commands
    this.commands.set('/start', this.handleStart.bind(this));
    this.commands.set('/help', this.handleHelp.bind(this));
    this.commands.set('/info', this.handleInfo.bind(this));
    this.commands.set('/time', this.handleTime.bind(this));
    this.commands.set('/weather', this.handleWeather.bind(this));
    
    // Group commands
    this.commands.set('/members', this.handleMembers.bind(this));
    this.commands.set('/remove_buttons', this.handleRemoveButtons.bind(this));
    this.commands.set('/profile', this.handleProfile.bind(this));
    this.commands.set('/stats', this.handleGroupStats.bind(this));
    this.commands.set('/fix_groups', this.handleFixGroups.bind(this));
    
    // ML related commands
    this.commands.set('/chat', this.handleChat.bind(this));
    this.commands.set('/ml_status', this.handleMLStatus.bind(this));
    
    // Button commands
    this.commands.set('/menu', this.handleMenu.bind(this));
    this.commands.set('/buttons', this.handleButtons.bind(this));
  }

  registerCommands() {
    this.commands.forEach((handler, command) => {
      this.bot.onText(new RegExp(command), handler);
    });
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const welcomeMessage = `
🤖 سلام! به بات تلگرام خوش اومدی!

من یه بات مدیریت و آمارگیری هستم که می‌تونم:
• مدیریت گروه‌ها و کاربران
• آمارگیری پیشرفته
• دستورات Reply-based
• سیستم دسترسی‌های چندسطحه

برای دیدن منوی کامل /menu رو بزن.
    `;
    
    await this.bot.sendMessage(chatId, welcomeMessage);
    
    // Show role-based buttons
    await buttonService.showRoleBasedButtons(chatId, userId);
    
    logger.info(`Start command received from chat ${chatId}`);
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    const helpMessage = `
📋 دستورات موجود:

🔹 دستورات پایه:
/start - شروع کار با بات
/help - نمایش این راهنما
/info - اطلاعات بات
/time - زمان فعلی
/weather - وضعیت هوا
/menu - نمایش منوی دکمه‌ها

🔹 دستورات مدیریت (Reply-based):
اخراج - اخراج کاربر
بن - بن کاربر
میوت - سکوت کاربر
آمار - آمار کاربر
اطلاعات - اطلاعات کاربر
اخطار - اخطار به کاربر
لغو_بن - لغو بن
لغو_میوت - لغو سکوت

🔹 دستورات گروه:
گروه - اطلاعات گروه
اعضا - لیست اعضا
مدیران - لیست مدیران
تنظیمات - تنظیمات گروه

🔹 دستورات مالک:
آمار_کلی - آمار کلی
همه_گروهها - لیست همه گروه‌ها
بن_سراسری - بن سراسری (Reply)
ارسال_همه - ارسال به همه گروه‌ها

💡 نکته: برای دستورات مدیریت، روی پیام کاربر reply کنید!
    `;
    
    await this.bot.sendMessage(chatId, helpMessage);
  }

  async handleInfo(msg) {
    const chatId = msg.chat.id;
    const infoMessage = `
ℹ️ اطلاعات بات:

🤖 نام: Telegram Bot Modular
📅 نسخه: 1.0.0
🔧 زبان: Node.js
🧠 ML: Python (قابل فعال‌سازی)
📊 وضعیت: آنلاین
    `;
    
    await this.bot.sendMessage(chatId, infoMessage);
  }

  async handleTime(msg) {
    const chatId = msg.chat.id;
    const now = new Date();
    const timeMessage = `🕐 زمان فعلی: ${now.toLocaleString('fa-IR')}`;
    
    await this.bot.sendMessage(chatId, timeMessage);
  }

  async handleWeather(msg) {
    const chatId = msg.chat.id;
    // This is a placeholder - you can integrate with weather APIs
    const weatherMessage = `
🌤️ وضعیت هوا:
🌡️ دما: 25°C
☁️ وضعیت: آفتابی
💨 باد: 10 km/h
    `;
    
    await this.bot.sendMessage(chatId, weatherMessage);
  }

  async handleChat(msg) {
    const chatId = msg.chat.id;
    
    if (!mlService.isEnabled()) {
      await this.bot.sendMessage(chatId, 
        '🤖 سرویس چت هوشمند در حال حاضر غیرفعال است. لطفاً بعداً تلاش کنید.');
      return;
    }

    await this.bot.sendMessage(chatId, 
      '🧠 چت هوشمند فعال شد! پیامت رو بفرست تا جواب بدم.');
  }

  async handleMLStatus(msg) {
    const chatId = msg.chat.id;
    const status = mlService.isEnabled() ? '✅ فعال' : '❌ غیرفعال';
    const message = `🧠 وضعیت سرویس ماشین لرنینگ: ${status}`;
    
    await this.bot.sendMessage(chatId, message);
  }

  async handleMenu(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    await buttonService.showRoleBasedButtons(chatId, userId);
  }

  async handleButtons(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    await buttonService.showRoleBasedButtons(chatId, userId);
  }


  async handleMembers(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Check if user has permission (owner or admin)
    const permissionService = require('../services/permissionService');
    const permissionLevel = await permissionService.getPermissionLevel(userId, chatId);
    
    if (permissionLevel === 'member') {
      await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
      return;
    }

    // Get group members
    const groupService = require('../database/services/groupService');
    const members = await groupService.getGroupMembers(chatId.toString());
    
    if (!members || members.length === 0) {
      await this.bot.sendMessage(chatId, '❌ لیست اعضا یافت نشد.');
      return;
    }

    let message = `👥 <b>لیست اعضای گروه</b>\n\n`;
    
    members.slice(0, 20).forEach((member, index) => {
      message += `${index + 1}. ${member.user.first_name} ${member.user.last_name || ''}\n`;
      if (member.user.username) {
        message += `   @${member.user.username}\n`;
      }
      message += `   ID: ${member.user._id}\n\n`;
    });

    if (members.length > 20) {
      message += `... و ${members.length - 20} عضو دیگر`;
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  async handleRemoveButtons(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Check if user has permission (owner or admin)
    const permissionService = require('../services/permissionService');
    const permissionLevel = await permissionService.getPermissionLevel(userId, chatId);
    
    if (permissionLevel === 'member') {
      await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
      return;
    }

    // Remove keyboard for all users in the group
    await this.bot.sendMessage(chatId, 
      '🗑️ <b>حذف دکمه‌ها</b>\n\nتمام دکمه‌ها از گروه حذف شدند.\nفقط دستورات Reply در دسترس هستند.', 
      { 
        parse_mode: 'HTML',
        reply_markup: {
          remove_keyboard: true
        }
      });
  }

  async handleProfile(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let targetUserId = userId;

    try {
      // Check if it's a reply to another user's message
      if (msg.reply_to_message && msg.reply_to_message.from) {
        targetUserId = msg.reply_to_message.from.id;
      }

      const idService = require('../services/idService');
      const userStats = await idService.getUserStats(targetUserId);

      if (!userStats) {
        const targetName = targetUserId === userId ? 'شما' : 'کاربر مورد نظر';
        await this.bot.sendMessage(chatId, `❌ پروفایل ${targetName} یافت نشد.`);
        return;
      }

      const isOwnProfile = targetUserId === userId;
      const profileTitle = isOwnProfile ? 'پروفایل شما' : `پروفایل ${userStats.name}`;
      
      let message = `👤 <b>${profileTitle}</b>\n\n` +
                    `🏷️ <b>نام:</b> ${userStats.name}\n` +
                    `👤 <b>یوزرنیم:</b> @${userStats.username || 'ندارد'}\n` +
                    `⭐ <b>سطح:</b> ${userStats.level} (${userStats.rank})\n` +
                    `💰 <b>سکه:</b> ${userStats.coins.toLocaleString('fa-IR')}\n` +
                    `📊 <b>امتیاز:</b> ${userStats.xp.toLocaleString('fa-IR')}\n` +
                    `👥 <b>گروه‌ها:</b> ${userStats.groups_count}\n` +
                    `🏆 <b>دستاوردها:</b> ${userStats.achievements_count}\n` +
                    `🛡️ <b>اعتبار:</b> ${userStats.trust_score}%\n` +
                    `🕐 <b>آخرین فعالیت:</b> ${new Date(userStats.last_seen).toLocaleString('fa-IR')}\n\n`;

      // Check if it's a group chat
      if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        // Get group-specific stats
        const groupService = require('../database/services/groupService');
        const group = await groupService.getGroupInfo(chatId.toString());
        
        if (group) {
          const member = group.members.find(m => m.user_id === targetUserId.toString());
          if (member) {
            message += `📊 <b>آمار این گروه:</b>\n` +
                      `💬 <b>پیام‌ها:</b> ${member.messages_count.toLocaleString('fa-IR')}\n` +
                      `📅 <b>امروز:</b> ${member.daily_messages.toLocaleString('fa-IR')}\n` +
                      `📊 <b>هفته:</b> ${member.weekly_messages.toLocaleString('fa-IR')}\n` +
                      `📈 <b>ماه:</b> ${member.monthly_messages.toLocaleString('fa-IR')}\n` +
                      `💰 <b>سکه:</b> ${member.coins_earned.toLocaleString('fa-IR')}\n` +
                      `⭐ <b>امتیاز:</b> ${member.xp_earned.toLocaleString('fa-IR')}\n` +
                      `⚠️ <b>اخطارها:</b> ${member.warnings}`;
          } else {
            message += `📊 <b>آمار این گروه:</b>\n` +
                      `💬 <b>پیام‌ها:</b> 0\n` +
                      `📅 <b>امروز:</b> 0\n` +
                      `💰 <b>سکه:</b> 0\n` +
                      `⭐ <b>امتیاز:</b> 0\n` +
                      `⚠️ <b>اخطارها:</b> 0`;
          }
        }
      } else {
        // Private chat - show total stats
        message += `📊 <b>آمار کلی:</b>\n` +
                  `💬 <b>پیام‌ها:</b> ${userStats.total_messages.toLocaleString('fa-IR')}\n` +
                  `📅 <b>امروز:</b> ${userStats.daily_messages.toLocaleString('fa-IR')}`;
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت پروفایل.');
    }
  }

  async handleGroupStats(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user has permission to view group stats
      const permissionService = require('../services/permissionService');
      const hasPermission = await permissionService.hasPermission(userId, chatId, 'admin');

      if (!hasPermission) {
        await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای مشاهده آمار گروه را ندارید.');
        return;
      }

      const groupService = require('../database/services/groupService');

      // Get group info with members array
      const groupInfo = await groupService.getGroupInfo(chatId.toString());
      if (!groupInfo) {
        await this.bot.sendMessage(chatId, '❌ اطلاعات گروه یافت نشد.');
        return;
      }

      // Get top members from Group's members array
      const topMembers = groupInfo.getTopMembers ? groupInfo.getTopMembers(10) : [];

      let message = `📊 <b>آمار گروه: ${groupInfo.title}</b>\n\n`;
      message += `📈 <b>آمار کلی:</b>\n`;
      message += `💬 <b>کل پیام‌ها:</b> ${groupInfo.statistics.total_messages.toLocaleString('fa-IR')}\n`;
      message += `📅 <b>پیام‌های امروز:</b> ${groupInfo.statistics.daily_messages.toLocaleString('fa-IR')}\n`;
      message += `👥 <b>تعداد اعضا:</b> ${groupInfo.member_count}\n`;
      message += `🕐 <b>آخرین فعالیت:</b> ${new Date(groupInfo.last_activity).toLocaleString('fa-IR')}\n\n`;

      if (topMembers.length > 0) {
        message += `🏆 <b>برترین اعضا:</b>\n`;
        topMembers.forEach((member, index) => {
          const rank = index + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔸';
          message += `${medal} <b>${rank}.</b> ${member.first_name || 'کاربر'} - ${member.messages_count} پیام\n`;
          message += `   💰 سکه: ${member.coins_earned || 0} | ⭐ XP: ${member.xp_earned || 0} | ⚠️ اخطار: ${member.warnings || 0}\n`;
          message += `   📅 امروز: ${member.daily_messages || 0} | 📊 هفته: ${member.weekly_messages || 0} | 📈 ماه: ${member.monthly_messages || 0}\n\n`;
        });
      } else {
        message += `📝 <b>هنوز آمار کاربری ثبت نشده است.</b>`;
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error getting group stats:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت آمار گروه.');
    }
  }

  async handleFixGroups(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user is bot owner
      const userService = require('../database/services/userService');
      const isOwner = await userService.isUserBotOwner(userId);
      
      if (!isOwner) {
        await this.bot.sendMessage(chatId, '❌ فقط مالک بات می‌تواند از این دستور استفاده کند.');
        return;
      }

      await this.bot.sendMessage(chatId, '🔧 در حال بروزرسانی تعداد گروه‌های کاربران...');
      
      const fixedCount = await userService.fixAllUsersGroupsCount();
      
      const message = `✅ **بروزرسانی کامل شد!**\n\n` +
                     `🔧 تعداد کاربران بروزرسانی شده: ${fixedCount}\n` +
                     `📊 حالا تعداد گروه‌ها درست نمایش داده می‌شود.`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error fixing groups count:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در بروزرسانی تعداد گروه‌ها.');
    }
  }
}

module.exports = new CommandHandler();
