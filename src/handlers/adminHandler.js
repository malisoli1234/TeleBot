const logger = require('../utils/logger');
const statsService = require('../database/services/statsService');
const groupService = require('../database/services/groupService');
const userService = require('../database/services/userService');
const permissionService = require('../services/permissionService');

class AdminHandler {
  constructor() {
    this.bot = null;
    this.commands = new Map();
    this.setupCommands();
  }

  init(bot) {
    this.bot = bot;
    this.registerCommands();
  }

  setupCommands() {
    // Owner commands
    this.commands.set('آمار_کلی', this.handleOverallStats.bind(this));
    this.commands.set('همه_گروهها', this.handleAllGroups.bind(this));
    this.commands.set('بن_سراسری', this.handleGlobalBan.bind(this));
    this.commands.set('ارسال_همه', this.handleBroadcast.bind(this));
    this.commands.set('گروه', this.handleGroupInfo.bind(this));
    this.commands.set('اعضا', this.handleGroupMembers.bind(this));
    this.commands.set('مدیران', this.handleGroupAdmins.bind(this));
    this.commands.set('تنظیمات', this.handleGroupSettings.bind(this));
  }

  registerCommands() {
    this.bot.on('message', this.handleMessage.bind(this));
  }

  async handleMessage(msg) {
    const command = msg.text?.trim();
    if (!command || !this.commands.has(command)) {
      return;
    }

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user is bot owner
      const isOwner = await permissionService.isUserBotOwner(userId);
      if (!isOwner) {
        // Check if user is admin for group-specific commands
        const isAdmin = await permissionService.isUserAdmin(userId, chatId);
        if (!isAdmin) {
          await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          return;
        }
      }

      // Execute command
      const handler = this.commands.get(command);
      await handler(msg, chatId, userId);

    } catch (error) {
      logger.error('Error in admin handler:', error);
      await this.bot.sendMessage(chatId, '❌ خطایی در اجرای دستور رخ داد.');
    }
  }

  async handleOverallStats(msg, chatId, userId) {
    try {
      const stats = await statsService.getOverallStats();
      
      const statsMessage = `📊 <b>آمار کلی بات</b>

🏢 <b>گروه‌ها:</b>
├── تعداد کل: ${stats.total_groups.toLocaleString('fa-IR')}
├── گروه‌های فعال: ${stats.active_groups.toLocaleString('fa-IR')}
└── مجموع پیام‌ها: ${stats.total_messages.toLocaleString('fa-IR')}

👥 <b>کاربران:</b>
└── تعداد کل: ${stats.total_users.toLocaleString('fa-IR')}

🏆 <b>پرکارترین گروه‌ها:</b>
${stats.top_groups.map((group, index) => 
  `${index + 1}. ${group.title} (${group.statistics.total_messages.toLocaleString('fa-IR')} پیام)`
).join('\n')}

👑 <b>پرکارترین کاربران:</b>
${stats.top_users.map((user, index) => 
  `${index + 1}. ${user.first_name} ${user.last_name || ''} (${user.activity.messages_sent.toLocaleString('fa-IR')} پیام)`
).join('\n')}`;

      await this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error getting overall stats:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت آمار کلی.');
    }
  }

  async handleAllGroups(msg, chatId, userId) {
    try {
      const groups = await groupService.getAllGroups();
      
      if (groups.length === 0) {
        await this.bot.sendMessage(chatId, '📭 هیچ گروهی یافت نشد.');
        return;
      }

      let groupsMessage = `📋 <b>لیست همه گروه‌ها (${groups.length})</b>\n\n`;
      
      groups.forEach((group, index) => {
        const lastActivity = new Date(group.last_activity).toLocaleDateString('fa-IR');
        groupsMessage += `${index + 1}. <b>${group.title}</b>\n`;
        groupsMessage += `   ├── نوع: ${group.type}\n`;
        groupsMessage += `   ├── اعضا: ${group.member_count.toLocaleString('fa-IR')}\n`;
        groupsMessage += `   ├── پیام‌ها: ${group.statistics.total_messages.toLocaleString('fa-IR')}\n`;
        groupsMessage += `   └── آخرین فعالیت: ${lastActivity}\n\n`;
      });

      // Split message if too long
      if (groupsMessage.length > 4000) {
        const chunks = this.splitMessage(groupsMessage, 4000);
        for (const chunk of chunks) {
          await this.bot.sendMessage(chatId, chunk, { parse_mode: 'HTML' });
        }
      } else {
        await this.bot.sendMessage(chatId, groupsMessage, { parse_mode: 'HTML' });
      }
    } catch (error) {
      logger.error('Error getting all groups:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت لیست گروه‌ها.');
    }
  }

  async handleGlobalBan(msg, chatId, userId) {
    try {
      if (!msg.reply_to_message) {
        await this.bot.sendMessage(chatId, '❌ لطفاً روی پیام کاربر مورد نظر reply کنید.');
        return;
      }

      const targetUser = msg.reply_to_message.from;
      const targetUserId = targetUser.id;
      
      // Ban from all groups
      const groups = await groupService.getAllGroups();
      let bannedCount = 0;

      for (const group of groups) {
        try {
          await this.bot.banChatMember(group._id, targetUserId);
          await userService.banUserFromGroup(targetUserId.toString(), group._id, 'Global ban by owner');
          bannedCount++;
        } catch (error) {
          logger.warn(`Failed to ban user from group ${group._id}:`, error.message);
        }
      }

      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `🔨 کاربر ${userName} از ${bannedCount} گروه بن شد.`);
      
      logger.info(`Global ban applied to user ${targetUserId} by ${userId}`);
    } catch (error) {
      logger.error('Error applying global ban:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در اعمال بن سراسری.');
    }
  }

  async handleBroadcast(msg, chatId, userId) {
    try {
      // Extract message from command
      const messageText = msg.text.replace('ارسال_همه', '').trim();
      if (!messageText) {
        await this.bot.sendMessage(chatId, '❌ لطفاً پیام خود را بعد از دستور بنویسید.\nمثال: ارسال_همه سلام به همه');
        return;
      }

      const groups = await groupService.getAllGroups();
      let sentCount = 0;
      let failedCount = 0;

      for (const group of groups) {
        try {
          await this.bot.sendMessage(group._id, `📢 <b>پیام از مالک بات:</b>\n\n${messageText}`, { parse_mode: 'HTML' });
          sentCount++;
        } catch (error) {
          failedCount++;
          logger.warn(`Failed to send broadcast to group ${group._id}:`, error.message);
        }
      }

      await this.bot.sendMessage(chatId, `📢 پیام به ${sentCount} گروه ارسال شد.\n❌ ${failedCount} گروه ناموفق.`);
      
      logger.info(`Broadcast sent by ${userId}: ${sentCount} successful, ${failedCount} failed`);
    } catch (error) {
      logger.error('Error sending broadcast:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در ارسال پیام به همه گروه‌ها.');
    }
  }

  async handleGroupInfo(msg, chatId, userId) {
    try {
      const groupInfo = await groupService.getGroupInfo(chatId.toString());
      
      if (!groupInfo) {
        await this.bot.sendMessage(chatId, '❌ اطلاعات گروه یافت نشد.');
        return;
      }

      const infoMessage = `ℹ️ <b>اطلاعات گروه</b>

🏷️ <b>نام:</b> ${groupInfo.title}
📊 <b>نوع:</b> ${groupInfo.type}
👥 <b>تعداد اعضا:</b> ${groupInfo.active_member_count.toLocaleString('fa-IR')}
📅 <b>تاریخ ایجاد:</b> ${new Date(groupInfo.created_at).toLocaleDateString('fa-IR')}
🕐 <b>آخرین فعالیت:</b> ${new Date(groupInfo.last_activity).toLocaleString('fa-IR')}

📈 <b>آمار پیام‌ها:</b>
├── کل پیام‌ها: ${groupInfo.statistics.total_messages.toLocaleString('fa-IR')}
├── پیام‌های امروز: ${groupInfo.statistics.daily_messages.toLocaleString('fa-IR')}
└── آخرین پیام: ${new Date(groupInfo.statistics.last_message_date).toLocaleString('fa-IR')}

👑 <b>مدیران (${groupInfo.admins.length}):</b>
${groupInfo.admins.map(admin => 
  `├── ${admin.user_id.first_name} ${admin.user_id.last_name || ''} (@${admin.user_id.username || 'ندارد'})`
).join('\n')}`;

      await this.bot.sendMessage(chatId, infoMessage, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error getting group info:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت اطلاعات گروه.');
    }
  }

  async handleGroupMembers(msg, chatId, userId) {
    try {
      const members = await groupService.getGroupMembers(chatId.toString(), 20);
      
      if (members.length === 0) {
        await this.bot.sendMessage(chatId, '📭 هیچ عضوی یافت نشد.');
        return;
      }

      let membersMessage = `👥 <b>لیست اعضای گروه (${members.length})</b>\n\n`;
      
      members.forEach((member, index) => {
        const userName = this.getUserDisplayName(member.user_id);
        const lastActivity = new Date(member.last_activity).toLocaleDateString('fa-IR');
        membersMessage += `${index + 1}. <b>${userName}</b>\n`;
        membersMessage += `   ├── نقش: ${member.role}\n`;
        membersMessage += `   ├── پیام‌ها: ${member.messages_count.toLocaleString('fa-IR')}\n`;
        membersMessage += `   └── آخرین فعالیت: ${lastActivity}\n\n`;
      });

      await this.bot.sendMessage(chatId, membersMessage, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error getting group members:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت لیست اعضا.');
    }
  }

  async handleGroupAdmins(msg, chatId, userId) {
    try {
      const admins = await groupService.getGroupAdmins(chatId.toString());
      
      if (admins.length === 0) {
        await this.bot.sendMessage(chatId, '👑 هیچ مدیری یافت نشد.');
        return;
      }

      let adminsMessage = `👑 <b>لیست مدیران گروه (${admins.length})</b>\n\n`;
      
      admins.forEach((admin, index) => {
        const userName = this.getUserDisplayName(admin.user_id);
        adminsMessage += `${index + 1}. <b>${userName}</b>\n`;
        adminsMessage += `   └── نقش: ${admin.role}\n\n`;
      });

      await this.bot.sendMessage(chatId, adminsMessage, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error getting group admins:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت لیست مدیران.');
    }
  }

  async handleGroupSettings(msg, chatId, userId) {
    try {
      const groupInfo = await groupService.getGroupInfo(chatId.toString());
      
      if (!groupInfo) {
        await this.bot.sendMessage(chatId, '❌ اطلاعات گروه یافت نشد.');
        return;
      }

      const settingsMessage = `⚙️ <b>تنظیمات گروه</b>

🔔 <b>خوشامدگویی:</b> ${groupInfo.settings.welcome_enabled ? '✅ فعال' : '❌ غیرفعال'}
🛡️ <b>ضد اسپم:</b> ${groupInfo.settings.anti_spam ? '✅ فعال' : '❌ غیرفعال'}
🗑️ <b>حذف خودکار:</b> ${groupInfo.settings.auto_delete ? '✅ فعال' : '❌ غیرفعال'}
🔇 <b>مدت میوت:</b> ${groupInfo.settings.mute_duration} ساعت

💡 برای تغییر تنظیمات با مالک بات تماس بگیرید.`;

      await this.bot.sendMessage(chatId, settingsMessage, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Error getting group settings:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت تنظیمات گروه.');
    }
  }

  getUserDisplayName(user) {
    if (user.username) {
      return `@${user.username}`;
    }
    return `${user.first_name} ${user.last_name || ''}`.trim();
  }

  splitMessage(message, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = line;
        }
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
}

module.exports = new AdminHandler();
