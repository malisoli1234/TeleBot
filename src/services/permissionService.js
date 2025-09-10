const logger = require('../utils/logger');
const userService = require('../database/services/userService');

class PermissionService {
  constructor() {
    this.bot = null;
  }

  init(bot) {
    this.bot = bot;
  }

  async checkPermission(userId, chatId, command) {
    try {
      // Check if user is bot owner
      const isBotOwner = await userService.isUserBotOwner(userId.toString());
      if (isBotOwner) {
        return true;
      }

      // Check if user is admin in the group
      const isAdmin = await this.isUserAdmin(userId, chatId);
      if (!isAdmin) {
        return false;
      }

      // Check command-specific permissions
      return this.checkCommandPermission(command);
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  async isUserAdmin(userId, chatId) {
    try {
      const member = await this.bot.getChatMember(chatId, userId);
      return member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
      logger.error('Error checking if user is admin:', error);
      return false;
    }
  }

  checkCommandPermission(command) {
    // Define which commands require special permissions
    const adminCommands = [
      'اخراج', 'بن', 'میوت', 'اخطار', 'لغو_بن', 'لغو_میوت'
    ];

    const ownerCommands = [
      'آمار_کلی', 'همه_گروهها', 'بن_سراسری', 'ارسال_همه'
    ];

    if (adminCommands.includes(command)) {
      return true; // Admin commands are allowed for admins
    }

    if (ownerCommands.includes(command)) {
      return false; // Owner commands are not allowed for regular admins
    }

    return true; // Other commands are allowed
  }

  async isUserBotOwner(userId) {
    try {
      return await userService.isUserBotOwner(userId.toString());
    } catch (error) {
      logger.error('Error checking if user is bot owner:', error);
      return false;
    }
  }

  async canUserPerformAction(userId, chatId, action) {
    try {
      // Bot owner can do everything
      if (await this.isUserBotOwner(userId)) {
        return true;
      }

      // Check if user is admin
      const isAdmin = await this.isUserAdmin(userId, chatId);
      if (!isAdmin) {
        return false;
      }

      // Check action-specific permissions
      switch (action) {
        case 'kick':
        case 'ban':
        case 'mute':
        case 'warn':
          return true;
        case 'unban':
        case 'unmute':
          return true;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error checking user action permission:', error);
      return false;
    }
  }

  async getPermissionLevel(userId, chatId) {
    try {
      if (await this.isUserBotOwner(userId)) {
        return 'owner';
      }

      if (await this.isUserAdmin(userId, chatId)) {
        return 'admin';
      }

      return 'member';
    } catch (error) {
      logger.error('Error getting permission level:', error);
      return 'member';
    }
  }

  async canAccessGroup(userId, chatId) {
    try {
      // Bot owner can access all groups
      if (await this.isUserBotOwner(userId)) {
        return true;
      }

      // Check if user is member of the group
      const member = await this.bot.getChatMember(chatId, userId);
      return member.status !== 'left' && member.status !== 'kicked';
    } catch (error) {
      logger.error('Error checking group access:', error);
      return false;
    }
  }

  async isUserBanned(userId, chatId) {
    try {
      return await userService.isUserBannedFromGroup(userId.toString(), chatId.toString());
    } catch (error) {
      logger.error('Error checking if user is banned:', error);
      return false;
    }
  }

  async isUserMuted(userId, chatId) {
    try {
      return await userService.isUserMutedInGroup(userId.toString(), chatId.toString());
    } catch (error) {
      logger.error('Error checking if user is muted:', error);
      return false;
    }
  }

  async canUserSendMessage(userId, chatId) {
    try {
      // Check if user is banned
      if (await this.isUserBanned(userId, chatId)) {
        return false;
      }

      // Check if user is muted
      if (await this.isUserMuted(userId, chatId)) {
        return false;
      }

      // Check if user is member
      const member = await this.bot.getChatMember(chatId, userId);
      return member.status === 'member' || 
             member.status === 'administrator' || 
             member.status === 'creator';
    } catch (error) {
      logger.error('Error checking if user can send message:', error);
      return false;
    }
  }

  async hasPermission(userId, chatId, requiredLevel = 'admin') {
    try {
      // Check if user is bot owner
      const isBotOwner = await userService.isUserBotOwner(userId.toString());
      if (isBotOwner) {
        return true;
      }

      // Check permission level
      const userLevel = await this.getPermissionLevel(userId, chatId);
      
      if (requiredLevel === 'owner') {
        return userLevel === 'owner';
      } else if (requiredLevel === 'admin') {
        return userLevel === 'admin' || userLevel === 'owner';
      } else {
        return true; // member level
      }
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }
}

module.exports = new PermissionService();
