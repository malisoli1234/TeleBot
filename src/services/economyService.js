const logger = require('../utils/logger');
const userService = require('../database/services/userService');
const userGroupStatsService = require('../database/services/userGroupStatsService');

class EconomyService {
  constructor() {
    this.bot = null;
    this.messageRewards = {
      base: 1,           // سکه پایه برای هر پیام
      quality: 2,        // سکه اضافی برای پیام با کیفیت
      engagement: 3,     // سکه اضافی برای تعامل
      daily_bonus: 50,   // پاداش روزانه
      level_bonus: 10    // پاداش سطح
    };
  }

  init(bot) {
    this.bot = bot;
  }

  /**
   * Process message and give rewards
   * @param {Object} msg - Message object
   */
  async processMessageReward(msg) {
    try {
      const userId = msg.from.id;
      const chatId = msg.chat.id;
      const messageText = msg.text || '';

      // Skip if it's a bot message
      if (msg.from.is_bot) {
        return;
      }

      // Get user info
      const user = await userService.getUserInfo(userId.toString());
      if (!user) {
        return;
      }

      // Check anti-fraud measures
      if (!this.isValidMessage(msg, user)) {
        logger.warn(`Invalid message from user ${userId} - no reward given`);
        return;
      }

      // Calculate reward
      const reward = await this.calculateReward(msg, user);
      
      if (reward > 0) {
        // Add coins and XP
        await userService.addCoins(userId.toString(), reward.coins, 'پیام ارسالی');
        await userService.addXP(userId.toString(), reward.xp, 'پیام ارسالی');

        // Message counters are already updated in idService

        // Update group-specific stats (message count already updated in idService)
        await userGroupStatsService.incrementMessageCount(
          userId.toString(), 
          chatId.toString(), 
          reward.coins, 
          reward.xp
        );

        // Update group member stats in Group.members array
        const groupService = require('../database/services/groupService');
        await groupService.addMemberCoins(chatId.toString(), userId.toString(), reward.coins);
        await groupService.addMemberXP(chatId.toString(), userId.toString(), reward.xp);

        // Check for level up
        await this.checkLevelUp(userId.toString());

        // Check for achievements
        await this.checkAchievements(userId.toString());

        logger.debug(`Rewarded user ${userId}: ${reward.coins} coins, ${reward.xp} XP`);
      }

    } catch (error) {
      logger.error('Error processing message reward:', error);
    }
  }

  /**
   * Calculate reward for a message
   * @param {Object} msg - Message object
   * @param {Object} user - User object
   */
  async calculateReward(msg, user) {
    let coins = 0;
    let xp = 0;

    // Base reward
    coins += this.messageRewards.base;
    xp += 1;

    // Quality bonus
    const quality = this.calculateMessageQuality(msg);
    if (quality > 70) {
      coins += this.messageRewards.quality;
      xp += 2;
    }

    // Engagement bonus (replies, mentions)
    if (msg.reply_to_message) {
      coins += this.messageRewards.engagement;
      xp += 3;
    }

    // Level bonus
    coins += user.level * this.messageRewards.level_bonus;

    // Trust score multiplier
    const trustMultiplier = (user.anti_fraud?.trust_score || 100) / 100;
    coins = Math.floor(coins * trustMultiplier);
    xp = Math.floor(xp * trustMultiplier);

    return { coins, xp };
  }

  /**
   * Calculate message quality score
   * @param {Object} msg - Message object
   */
  calculateMessageQuality(msg) {
    const text = msg.text || '';
    let score = 0;

    // Length score (0-30)
    if (text.length > 50) score += 30;
    else if (text.length > 20) score += 20;
    else if (text.length > 10) score += 10;

    // Content richness (0-25)
    const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(text);
    const hasNumbers = /\d/.test(text);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(text);
    
    if (hasEmoji) score += 10;
    if (hasNumbers) score += 5;
    if (hasSpecialChars) score += 10;

    // Uniqueness (0-25)
    // This would need to be implemented with message history
    score += 15; // Default score

    // Engagement (0-20)
    if (msg.reply_to_message) score += 20;
    if (msg.entities && msg.entities.length > 0) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Check if message is valid (anti-fraud)
   * @param {Object} msg - Message object
   * @param {Object} user - User object
   */
  isValidMessage(msg, user) {
    const text = msg.text || '';

    // Check for spam patterns
    if (this.isSpamMessage(msg, user)) {
      return false;
    }

    // Check message frequency
    if (this.isTooFrequent(msg, user)) {
      return false;
    }

    // Check message quality
    if (this.isLowQuality(text)) {
      return false;
    }

    return true;
  }

  /**
   * Check if message is spam
   * @param {Object} msg - Message object
   * @param {Object} user - User object
   */
  isSpamMessage(msg, user) {
    const text = msg.text || '';

    // Repeated messages
    if (user.last_message === text) {
      return true;
    }

    // Very short messages
    if (text.length < 3) {
      return true;
    }

    // Only emojis
    if (/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]+$/u.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Check if message is too frequent
   * @param {Object} msg - Message object
   * @param {Object} user - User object
   */
  isTooFrequent(msg, user) {
    // This would need to be implemented with message timing tracking
    // For now, return false
    return false;
  }

  /**
   * Check if message is low quality
   * @param {string} text - Message text
   */
  isLowQuality(text) {
    // Very short messages
    if (text.length < 3) {
      return true;
    }

    // Only special characters
    if (/^[!@#$%^&*(),.?":{}|<>]+$/.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Check for level up
   * @param {string} userId - User ID
   */
  async checkLevelUp(userId) {
    try {
      const user = await userService.getUserInfo(userId);
      if (!user) return;

      const newLevel = this.calculateLevel(user.xp);
      
      if (newLevel > user.level) {
        // Level up!
        await userService.updateUser(userId, { level: newLevel });
        
        // Give level up bonus
        const bonus = newLevel * 100;
        await userService.addCoins(userId, bonus, `سطح ${newLevel} رسیدید!`);
        
        // Add achievement
        await userService.addAchievement(userId, {
          id: `level_${newLevel}`,
          name: `سطح ${newLevel}`,
          description: `به سطح ${newLevel} رسیدید!`,
          coins_reward: bonus
        });

        logger.info(`User ${userId} leveled up to ${newLevel}!`);
      }
    } catch (error) {
      logger.error('Error checking level up:', error);
    }
  }

  /**
   * Calculate level based on XP
   * @param {number} xp - XP amount
   */
  calculateLevel(xp) {
    if (xp < 100) return 1;
    if (xp < 500) return 2;
    if (xp < 1000) return 3;
    if (xp < 5000) return 4;
    return 5;
  }

  /**
   * Check for achievements
   * @param {string} userId - User ID
   */
  async checkAchievements(userId) {
    try {
      const user = await userService.getUserInfo(userId);
      if (!user) return;

      const achievements = [];

      // Message achievements
      if (user.total_messages >= 100 && !this.hasAchievement(user, '100_messages')) {
        achievements.push({
          id: '100_messages',
          name: 'چت‌کننده',
          description: '100 پیام ارسال کردید!',
          coins_reward: 50
        });
      }

      if (user.total_messages >= 1000 && !this.hasAchievement(user, '1000_messages')) {
        achievements.push({
          id: '1000_messages',
          name: 'چت‌کننده حرفه‌ای',
          description: '1000 پیام ارسال کردید!',
          coins_reward: 200
        });
      }

      // Level achievements
      if (user.level >= 3 && !this.hasAchievement(user, 'level_3')) {
        achievements.push({
          id: 'level_3',
          name: 'پیشرفته',
          description: 'به سطح 3 رسیدید!',
          coins_reward: 100
        });
      }

      // Add achievements
      for (const achievement of achievements) {
        await userService.addAchievement(userId, achievement);
        logger.info(`User ${userId} earned achievement: ${achievement.name}`);
      }

    } catch (error) {
      logger.error('Error checking achievements:', error);
    }
  }

  /**
   * Check if user has specific achievement
   * @param {Object} user - User object
   * @param {string} achievementId - Achievement ID
   */
  hasAchievement(user, achievementId) {
    return user.achievements.some(achievement => achievement.id === achievementId);
  }

  /**
   * Give daily bonus
   * @param {string} userId - User ID
   */
  async giveDailyBonus(userId) {
    try {
      const user = await userService.getUserInfo(userId);
      if (!user) return;

      const today = new Date();
      const lastBonus = user.last_daily_bonus;
      
      // Check if already received today
      if (lastBonus && this.isSameDay(today, lastBonus)) {
        return;
      }

      // Give bonus
      const bonus = this.messageRewards.daily_bonus + (user.level * 10);
      await userService.addCoins(userId, bonus, 'پاداش روزانه');
      await userService.updateUser(userId, { last_daily_bonus: today });

      logger.info(`User ${userId} received daily bonus: ${bonus} coins`);
    } catch (error) {
      logger.error('Error giving daily bonus:', error);
    }
  }

  /**
   * Check if two dates are the same day
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   */
  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
}

module.exports = new EconomyService();
