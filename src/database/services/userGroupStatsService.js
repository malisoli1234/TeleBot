const UserGroupStats = require('../models/UserGroupStats');
const logger = require('../../utils/logger');

class UserGroupStatsService {
  async incrementMessageCount(userId, groupId, coins = 0, xp = 0) {
    try {
      const statsId = `${userId}_${groupId}`;
      const now = new Date();
      
      const stats = await UserGroupStats.findOneAndUpdate(
        { _id: statsId },
        {
          $inc: {
            messages_count: 1,
            daily_messages: 1,
            weekly_messages: 1,
            monthly_messages: 1,
            coins_earned: coins,
            xp_earned: xp
          },
          $set: {
            last_message: now
          },
          $setOnInsert: {
            user_id: parseInt(userId),
            group_id: groupId.toString(),
            first_message: now
          }
        },
        { upsert: true, new: true }
      );

      logger.debug(`Updated group stats for user ${userId} in group ${groupId}`);
      return stats;
    } catch (error) {
      logger.error('Error incrementing message count:', error);
      throw error;
    }
  }

  async getUserGroupStats(userId, groupId) {
    try {
      const statsId = `${userId}_${groupId}`;
      const stats = await UserGroupStats.findById(statsId);
      return stats;
    } catch (error) {
      logger.error('Error getting user group stats:', error);
      return null;
    }
  }

  async getUserAllGroupsStats(userId) {
    try {
      const stats = await UserGroupStats.find({ user_id: parseInt(userId) })
        .sort({ messages_count: -1 });
      return stats;
    } catch (error) {
      logger.error('Error getting user all groups stats:', error);
      return [];
    }
  }

  async getGroupTopUsers(groupId, limit = 10) {
    try {
      const stats = await UserGroupStats.find({ group_id: groupId.toString() })
        .sort({ messages_count: -1 })
        .limit(limit);

      // Get user info for each stat
      const userService = require('./userService');
      const enrichedStats = await Promise.all(
        stats.map(async (stat) => {
          const userInfo = await userService.getUserInfo(stat.user_id.toString());
          return {
            ...stat.toObject(),
            first_name: userInfo ? userInfo.first_name : 'کاربر',
            last_name: userInfo ? userInfo.last_name : '',
            username: userInfo ? userInfo.username : null
          };
        })
      );

      return enrichedStats;
    } catch (error) {
      logger.error('Error getting group top users:', error);
      return [];
    }
  }

  async resetDailyCounters() {
    try {
      await UserGroupStats.updateMany(
        {},
        { $set: { daily_messages: 0 } }
      );
      logger.info('Daily group stats counters reset');
    } catch (error) {
      logger.error('Error resetting daily counters:', error);
    }
  }

  async resetWeeklyCounters() {
    try {
      await UserGroupStats.updateMany(
        {},
        { $set: { weekly_messages: 0 } }
      );
      logger.info('Weekly group stats counters reset');
    } catch (error) {
      logger.error('Error resetting weekly counters:', error);
    }
  }

  async resetMonthlyCounters() {
    try {
      await UserGroupStats.updateMany(
        {},
        { $set: { monthly_messages: 0 } }
      );
      logger.info('Monthly group stats counters reset');
    } catch (error) {
      logger.error('Error resetting monthly counters:', error);
    }
  }
}

module.exports = new UserGroupStatsService();
