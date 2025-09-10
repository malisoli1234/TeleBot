const logger = require('../utils/logger');
const userService = require('../database/services/userService');
const groupService = require('../database/services/groupService');
const statsService = require('../database/services/statsService');
const permissionService = require('../services/permissionService');

class ReplyHandler {
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
    // Management commands (reply-based)
    this.commands.set('اخراج', this.handleKick.bind(this));
    this.commands.set('بن', this.handleBan.bind(this));
    this.commands.set('میوت', this.handleMute.bind(this));
    this.commands.set('آمار', this.handleStats.bind(this));
    this.commands.set('اطلاعات', this.handleInfo.bind(this));
    this.commands.set('اخطار', this.handleWarn.bind(this));
    this.commands.set('آنبن', this.handleUnban.bind(this));
    this.commands.set('آنمیوت', this.handleUnmute.bind(this));
    
    // Group commands (non-reply)
    this.commands.set('آمار گروه', this.handleGroupStats.bind(this));
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

    // Check if it's a group command
    if (command === 'آمار گروه') {
      // Group command - check if user is admin/owner
      try {
        const permissionLevel = await permissionService.getPermissionLevel(userId, chatId);
        if (permissionLevel === 'member') {
          await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
          return;
        }
        await this.handleGroupStats(chatId, userId);
      } catch (error) {
        logger.error(`Error handling group command ${command}:`, error);
      }
      return;
    }

    // Reply commands - only handle if it's a reply
    if (!msg.reply_to_message) {
      return;
    }

    const targetUser = msg.reply_to_message.from;

    try {
      // Check permissions
      const hasPermission = await permissionService.checkPermission(userId, chatId, command);
      if (!hasPermission) {
        await this.bot.sendMessage(chatId, '❌ شما دسترسی لازم برای این عملیات را ندارید.');
        return;
      }

      // Execute command
      const handler = this.commands.get(command);
      await handler(msg, targetUser, chatId, userId);

    } catch (error) {
      logger.error('Error in reply handler:', error);
      await this.bot.sendMessage(chatId, '❌ خطایی در اجرای دستور رخ داد.');
    }
  }

  async handleKick(msg, targetUser, chatId, userId) {
    try {
      const targetUserId = targetUser.id;
      
      // Check if target is admin
      const isTargetAdmin = await permissionService.isUserAdmin(targetUserId, chatId);
      if (isTargetAdmin) {
        await this.bot.sendMessage(chatId, '❌ نمی‌توانید مدیران را اخراج کنید.');
        return;
      }

      // Kick user
      await this.bot.kickChatMember(chatId, targetUserId);
      
      // Update database
      await groupService.removeMemberFromGroup(chatId.toString(), targetUserId.toString());
      
      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `✅ کاربر ${userName} اخراج شد.`);
      
      logger.info(`User ${targetUserId} kicked from group ${chatId} by ${userId}`);
    } catch (error) {
      logger.error('Error kicking user:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در اخراج کاربر.');
    }
  }

  async handleBan(msg, targetUser, chatId, userId) {
    try {
      const targetUserId = targetUser.id;
      
      // Check if target is admin
      const isTargetAdmin = await permissionService.isUserAdmin(targetUserId, chatId);
      if (isTargetAdmin) {
        await this.bot.sendMessage(chatId, '❌ نمی‌توانید مدیران را بن کنید.');
        return;
      }

      // Ban user
      await this.bot.banChatMember(chatId, targetUserId);
      
      // Update database
      await userService.banUserFromGroup(targetUserId.toString(), chatId.toString(), 'Banned by admin');
      
      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `🔨 کاربر ${userName} بن شد.`);
      
      logger.info(`User ${targetUserId} banned from group ${chatId} by ${userId}`);
    } catch (error) {
      logger.error('Error banning user:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در بن کردن کاربر.');
    }
  }

  async handleMute(msg, targetUser, chatId, userId) {
    try {
      const targetUserId = targetUser.id;
      
      // Check if target is admin
      const isTargetAdmin = await permissionService.isUserAdmin(targetUserId, chatId);
      if (isTargetAdmin) {
        await this.bot.sendMessage(chatId, '❌ نمی‌توانید مدیران را میوت کنید.');
        return;
      }

      // Mute user (24 hours)
      await userService.muteUserInGroup(targetUserId.toString(), chatId.toString(), 24, 'Muted by admin');
      
      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `🔇 کاربر ${userName} میوت شد (24 ساعت).`);
      
      logger.info(`User ${targetUserId} muted in group ${chatId} by ${userId}`);
    } catch (error) {
      logger.error('Error muting user:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در میوت کردن کاربر.');
    }
  }

  async handleStats(msg, targetUser, chatId, userId) {
    try {
      // Get group stats instead of user stats
      const groupService = require('../database/services/groupService');
      const group = await groupService.getGroupInfo(chatId.toString());
      
      if (!group) {
        await this.bot.sendMessage(chatId, '❌ اطلاعات گروه یافت نشد.');
        return;
      }

      const message = `📊 <b>آمار گروه</b>\n\n` +
                     `🏷️ <b>نام گروه:</b> ${group.title}\n` +
                     `👥 <b>تعداد اعضا:</b> ${group.member_count.toLocaleString('fa-IR')}\n` +
                     `💬 <b>پیام‌های کل:</b> ${group.statistics.total_messages.toLocaleString('fa-IR')}\n` +
                     `📅 <b>تاریخ ایجاد:</b> ${new Date(group.created_at).toLocaleDateString('fa-IR')}\n` +
                     `🕐 <b>آخرین فعالیت:</b> ${new Date(group.last_activity).toLocaleString('fa-IR')}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      
    } catch (error) {
      logger.error('Error getting group stats:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت آمار گروه.');
    }
  }

  async handleInfo(msg, targetUser, chatId, userId) {
    try {
      // Get group info instead of user info
      const groupService = require('../database/services/groupService');
      const group = await groupService.getGroupInfo(chatId.toString());
      
      if (!group) {
        await this.bot.sendMessage(chatId, '❌ اطلاعات گروه یافت نشد.');
        return;
      }

      const message = `ℹ️ <b>اطلاعات گروه</b>\n\n` +
                     `🏷️ <b>نام گروه:</b> ${group.title}\n` +
                     `🆔 <b>شناسه گروه:</b> <code>${group._id}</code>\n` +
                     `👥 <b>تعداد اعضا:</b> ${group.member_count.toLocaleString('fa-IR')}\n` +
                     `📅 <b>تاریخ ایجاد:</b> ${new Date(group.created_at).toLocaleDateString('fa-IR')}\n` +
                     `🕐 <b>آخرین فعالیت:</b> ${new Date(group.last_activity).toLocaleString('fa-IR')}\n` +
                     `⚙️ <b>تنظیمات:</b>\n` +
                     `  • خوش‌آمدگویی: ${group.settings.welcome_enabled ? 'فعال' : 'غیرفعال'}\n` +
                     `  • ضد اسپم: ${group.settings.anti_spam ? 'فعال' : 'غیرفعال'}\n` +
                     `  • حذف خودکار: ${group.settings.auto_delete ? 'فعال' : 'غیرفعال'}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      
    } catch (error) {
      logger.error('Error getting group info:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت اطلاعات گروه.');
    }
  }

  async handleWarn(msg, targetUser, chatId, userId) {
    try {
      const targetUserId = targetUser.id;
      
      // Add warning
      await userService.addUserWarning(targetUserId.toString(), chatId.toString(), 'Warning by admin');
      
      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `⚠️ اخطار به کاربر ${userName} داده شد.`);
      
      logger.info(`Warning added to user ${targetUserId} in group ${chatId} by ${userId}`);
    } catch (error) {
      logger.error('Error warning user:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دادن اخطار.');
    }
  }

  async handleUnban(msg, targetUser, chatId, userId) {
    try {
      const targetUserId = targetUser.id;
      
      // Unban user
      await this.bot.unbanChatMember(chatId, targetUserId);
      await userService.unbanUserFromGroup(targetUserId.toString(), chatId.toString());
      
      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `✅ بن کاربر ${userName} لغو شد.`);
      
      logger.info(`User ${targetUserId} unbanned from group ${chatId} by ${userId}`);
    } catch (error) {
      logger.error('Error unbanning user:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در لغو بن کاربر.');
    }
  }

  async handleUnmute(msg, targetUser, chatId, userId) {
    try {
      const targetUserId = targetUser.id;
      
      // Unmute user
      await userService.unmuteUserInGroup(targetUserId.toString(), chatId.toString());
      
      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `✅ میوت کاربر ${userName} لغو شد.`);
      
      logger.info(`User ${targetUserId} unmuted in group ${chatId} by ${userId}`);
    } catch (error) {
      logger.error('Error unmuting user:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در لغو میوت کاربر.');
    }
  }

  async handleBan(msg, targetUser, chatId, userId) {
    try {
      const targetUserId = targetUser.id;
      
      // Check if user is already banned
      const isBanned = await userService.isUserBannedFromGroup(targetUserId.toString(), chatId.toString());
      if (isBanned) {
        await this.bot.sendMessage(chatId, '❌ این کاربر قبلاً بن شده است.');
        return;
      }
      
      // Ban user
      await userService.banUserFromGroup(targetUserId.toString(), chatId.toString(), 'Banned by admin');
      
      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `🚫 کاربر ${userName} بن شد.`);
      
      logger.info(`User ${targetUserId} banned from group ${chatId} by ${userId}`);
    } catch (error) {
      logger.error('Error banning user:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در بن کردن کاربر.');
    }
  }

  async handleUnban(msg, targetUser, chatId, userId) {
    try {
      const targetUserId = targetUser.id;
      
      // Check if user is banned
      const isBanned = await userService.isUserBannedFromGroup(targetUserId.toString(), chatId.toString());
      if (!isBanned) {
        await this.bot.sendMessage(chatId, '❌ این کاربر بن نشده است.');
        return;
      }
      
      // Unban user
      await userService.unbanUserFromGroup(targetUserId.toString(), chatId.toString());
      
      const userName = this.getUserDisplayName(targetUser);
      await this.bot.sendMessage(chatId, `✅ بن کاربر ${userName} لغو شد.`);
      
      logger.info(`User ${targetUserId} unbanned from group ${chatId} by ${userId}`);
    } catch (error) {
      logger.error('Error unbanning user:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در لغو بن کاربر.');
    }
  }

  getUserDisplayName(user) {
    if (user.username) {
      return `@${user.username}`;
    }
    return `${user.first_name} ${user.last_name || ''}`.trim();
  }

  formatUserStats(userName, stats) {
    const { user, activity, profile, groups } = stats;
    
    return `📊 <b>آمار کاربر ${userName}</b>

👤 <b>اطلاعات شخصی:</b>
├── نام: ${user.first_name} ${user.last_name || ''}
├── یوزرنیم: ${user.username ? '@' + user.username : 'ندارد'}
└── تاریخ عضویت: ${new Date(user.join_date).toLocaleDateString('fa-IR')}

📈 <b>آمار فعالیت:</b>
├── پیام‌های ارسالی: ${activity.messages_sent.toLocaleString('fa-IR')}
├── پیام‌های امروز: ${activity.daily_messages.toLocaleString('fa-IR')}
└── آخرین فعالیت: ${new Date(activity.last_seen).toLocaleString('fa-IR')}

👥 <b>اطلاعات گروه‌ها:</b>
├── تعداد گروه‌ها: ${profile.total_groups}
├── مدیر در: ${profile.is_admin_in} گروه
└── اخطارها: ${profile.warnings}

${profile.banned_from.length > 0 ? `🚫 بن شده از: ${profile.banned_from.length} گروه` : ''}`;
  }

  formatUserInfo(userName, userInfo) {
    const { first_name, last_name, username, profile, activity } = userInfo;
    
    return `ℹ️ <b>اطلاعات کاربر ${userName}</b>

👤 <b>اطلاعات شخصی:</b>
├── نام: ${first_name} ${last_name || ''}
├── یوزرنیم: ${username ? '@' + username : 'ندارد'}
└── تاریخ عضویت: ${new Date(profile.join_date).toLocaleString('fa-IR')}

📊 <b>آمار:</b>
├── پیام‌های ارسالی: ${activity.messages_sent.toLocaleString('fa-IR')}
├── تعداد گروه‌ها: ${profile.total_groups}
├── اخطارها: ${profile.warnings}
└── آخرین فعالیت: ${new Date(activity.last_seen).toLocaleString('fa-IR')}

${profile.banned_from.length > 0 ? `🚫 بن شده از: ${profile.banned_from.length} گروه` : ''}
${profile.muted_in.length > 0 ? `🔇 میوت شده در: ${profile.muted_in.length} گروه` : ''}`;
  }

  async handleGroupStats(chatId, userId) {
    try {
      const groupService = require('../database/services/groupService');
      const group = await groupService.getGroupInfo(chatId.toString());
      
      if (!group) {
        await this.bot.sendMessage(chatId, '❌ آمار گروه یافت نشد.');
        return;
      }

      const message = `📊 <b>آمار گروه</b>\n\n` +
                     `🏷️ <b>نام گروه:</b> ${group.title}\n` +
                     `👥 <b>تعداد اعضا:</b> ${group.member_count.toLocaleString('fa-IR')}\n` +
                     `💬 <b>پیام‌های کل:</b> ${group.statistics.total_messages.toLocaleString('fa-IR')}\n` +
                     `📅 <b>تاریخ ایجاد:</b> ${new Date(group.created_at).toLocaleDateString('fa-IR')}\n` +
                     `🕐 <b>آخرین فعالیت:</b> ${new Date(group.last_activity).toLocaleString('fa-IR')}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      
      logger.info(`Group stats requested by ${userId} in chat ${chatId}`);
    } catch (error) {
      logger.error('Error getting group stats:', error);
      await this.bot.sendMessage(chatId, '❌ خطا در دریافت آمار گروه.');
    }
  }
}

module.exports = new ReplyHandler();
