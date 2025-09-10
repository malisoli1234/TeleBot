const logger = require('../utils/logger');
const userService = require('../database/services/userService');

class IDService {
  constructor() {
    this.bot = null;
  }

  init(bot) {
    this.bot = bot;
  }

  /**
   * Process user message and create profile silently
   * @param {Object} msg - The message object
   */
  async processUserMessage(msg) {
    try {
      // Skip if it's a bot message
      if (msg.from.is_bot) {
        return;
      }

      const userId = msg.from.id;
      const chatId = msg.chat.id;

      // Check if user already exists in database
      const existingUser = await userService.getUserInfo(userId.toString());
      if (existingUser) {
        // Update last seen and message count
        await this.updateUserActivity(userId, chatId);
        return;
      }

      // Create new user profile silently
      await this.createUserProfile(msg.from, chatId);
      
      logger.info(`Created profile for user ${userId} (${msg.from.first_name})`);
    } catch (error) {
      logger.error('Error processing user message:', error);
    }
  }

  /**
   * Create user profile in database
   * @param {Object} user - Telegram user object
   * @param {number} chatId - Chat ID where user was seen
   */
  async createUserProfile(user, chatId) {
    try {
      const userData = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || '',
        username: user.username || null,
        is_bot: user.is_bot || false,
        is_bot_owner: user.id.toString() === process.env.BOT_OWNER_ID,
        first_seen: new Date(),
        last_seen: new Date(),
        groups_joined: [chatId.toString()],
        groups_count: 1
      };

      await userService.createOrUpdateUser(userData);
      
      // Add user to group members
      const groupService = require('../database/services/groupService');
      await groupService.addGroupMember(chatId.toString(), {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || '',
        username: user.username || null,
        joined_at: new Date()
      });

      logger.info(`User profile created: ${user.id} (${user.first_name})`);
    } catch (error) {
      logger.error('Error creating user profile:', error);
    }
  }

  /**
   * Update user activity (last seen, message count)
   * @param {number} userId - User ID
   * @param {number} chatId - Chat ID
   */
  async updateUserActivity(userId, chatId) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Update last seen and message count
      await userService.incrementUserMessageCount(userId, chatId);

      // Check if user is in group and add if not
      const groupService = require('../database/services/groupService');
      
      // Check if user exists in group's members array
      const group = await groupService.getGroupInfo(chatId.toString());
      if (group) {
        const memberExists = group.members.some(member => member.user_id === userId.toString());
        
        if (!memberExists) {
          // Add user to group if not exists
          const user = await userService.getUserInfo(userId.toString());
          if (user) {
            await groupService.addGroupMember(chatId.toString(), {
              user_id: userId,
              first_name: user.first_name,
              last_name: user.last_name || '',
              username: user.username || null,
              joined_at: now
            });
            logger.debug(`Added new member ${user.first_name} to group ${chatId}`);
          }
        }
      }

      // Update group member stats
      await groupService.incrementMemberMessageCount(chatId.toString(), userId.toString());

      logger.debug(`Updated activity for user ${userId}`);
    } catch (error) {
      logger.error('Error updating user activity:', error);
    }
  }

  /**
   * Reset daily counters (run at midnight)
   */
  async resetDailyCounters() {
    try {
      await userService.resetDailyCounters();
      logger.info('Daily counters reset');
    } catch (error) {
      logger.error('Error resetting daily counters:', error);
    }
  }

  /**
   * Reset weekly counters (run on Sunday)
   */
  async resetWeeklyCounters() {
    try {
      await userService.resetWeeklyCounters();
      logger.info('Weekly counters reset');
    } catch (error) {
      logger.error('Error resetting weekly counters:', error);
    }
  }

  /**
   * Reset monthly counters (run on 1st of month)
   */
  async resetMonthlyCounters() {
    try {
      await userService.resetMonthlyCounters();
      logger.info('Monthly counters reset');
    } catch (error) {
      logger.error('Error resetting monthly counters:', error);
    }
  }

  /**
   * Clean up processed users set (run every hour)
   */
  cleanupProcessedUsers() {
    this.processedUsers.clear();
    logger.debug('Cleaned up processed users set');
  }

  /**
   * Clean up expired requests (for compatibility)
   */
  cleanupExpiredRequests() {
    // This method is kept for compatibility with server.js
    // The new idService doesn't use pending requests
    logger.debug('Cleanup expired requests called (no-op)');
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    try {
      const user = await userService.getUserInfo(userId.toString());
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: `${user.first_name} ${user.last_name || ''}`.trim(),
        username: user.username,
        level: user.level,
        rank: user.rank,
        coins: user.coins,
        xp: user.xp,
        total_messages: user.total_messages,
        daily_messages: user.daily_messages,
        groups_count: user.groups_count,
        achievements_count: user.achievements.length,
        first_seen: user.first_seen,
        last_seen: user.last_seen,
        trust_score: user.anti_fraud?.trust_score || 100
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return null;
    }
  }
}

module.exports = new IDService();