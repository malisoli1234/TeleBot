const Statistics = require('../models/Statistics');
const Group = require('../models/Group');
const User = require('../models/User');
const GroupMember = require('../models/GroupMember');
const logger = require('../../utils/logger');

class StatsService {
  async getDailyStats(date = new Date()) {
    try {
      let stats = await Statistics.getDailyStats(date);
      
      if (!stats) {
        stats = await Statistics.createOrUpdateDailyStats(date);
      }

      // Get current counts
      const totalGroups = await Group.countDocuments();
      const totalUsers = await User.countDocuments();
      const activeGroups = await Group.countDocuments({ 
        last_activity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      });

      // Update stats with current data
      stats.total_groups = totalGroups;
      stats.total_users = totalUsers;
      await stats.save();

      return {
        date: stats.date,
        total_groups: stats.total_groups,
        total_users: stats.total_users,
        active_groups: activeGroups,
        new_users_today: stats.new_users_today,
        messages_today: stats.messages_today,
        most_active_group: stats.most_active_group,
        top_users: stats.top_users
      };
    } catch (error) {
      logger.error('Error getting daily stats:', error);
      throw error;
    }
  }

  async getOverallStats() {
    try {
      const totalGroups = await Group.countDocuments();
      const totalUsers = await User.countDocuments();
      const totalMessages = await Group.aggregate([
        { $group: { _id: null, total: { $sum: '$statistics.total_messages' } } }
      ]);

      const activeGroups = await Group.countDocuments({
        last_activity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      const topGroups = await Group.find()
        .sort({ 'statistics.total_messages': -1 })
        .limit(5)
        .select('title statistics.total_messages member_count');

      const topUsers = await User.find()
        .sort({ 'activity.messages_sent': -1 })
        .limit(5)
        .select('first_name last_name username activity.messages_sent');

      return {
        total_groups: totalGroups,
        total_users: totalUsers,
        total_messages: totalMessages[0]?.total || 0,
        active_groups: activeGroups,
        top_groups: topGroups,
        top_users: topUsers
      };
    } catch (error) {
      logger.error('Error getting overall stats:', error);
      throw error;
    }
  }

  async getGroupStats(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return null;
      }

      const memberCount = await GroupMember.countDocuments({ 
        group_id: groupId, 
        is_active: true 
      });

      const topMembers = await GroupMember.getTopMembers(groupId, 10);
      const admins = await GroupMember.findAdminsByGroup(groupId);

      return {
        group: {
          id: group._id,
          title: group.title,
          type: group.type,
          member_count: memberCount,
          created_at: group.created_at,
          last_activity: group.last_activity
        },
        statistics: {
          total_messages: group.statistics.total_messages,
          daily_messages: group.statistics.daily_messages,
          last_message_date: group.statistics.last_message_date
        },
        top_members: topMembers,
        admins: admins
      };
    } catch (error) {
      logger.error('Error getting group stats:', error);
      throw error;
    }
  }

  async getUserStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      const userGroups = await GroupMember.findByUser(userId);
      const isAdminIn = userGroups.filter(gm => gm.role === 'admin' || gm.role === 'creator');

      return {
        user: {
          id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          join_date: user.profile.join_date,
          is_bot_owner: user.is_bot_owner
        },
        activity: {
          messages_sent: user.activity.messages_sent,
          last_seen: user.activity.last_seen,
          daily_messages: user.activity.daily_messages
        },
        profile: {
          total_groups: user.profile.total_groups,
          is_admin_in: isAdminIn.length,
          warnings: user.profile.warnings,
          banned_from: user.profile.banned_from.length
        },
        groups: userGroups
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getTopGroups(limit = 10) {
    try {
      return await Group.find()
        .sort({ 'statistics.total_messages': -1 })
        .limit(limit)
        .select('title statistics.total_messages member_count last_activity');
    } catch (error) {
      logger.error('Error getting top groups:', error);
      throw error;
    }
  }

  async getTopUsers(limit = 10) {
    try {
      return await User.find()
        .sort({ 'activity.messages_sent': -1 })
        .limit(limit)
        .select('first_name last_name username activity.messages_sent profile.total_groups');
    } catch (error) {
      logger.error('Error getting top users:', error);
      throw error;
    }
  }

  async getRecentActivity(limit = 20) {
    try {
      const recentGroups = await Group.find()
        .sort({ last_activity: -1 })
        .limit(limit)
        .select('title last_activity member_count');

      const recentUsers = await User.find()
        .sort({ 'activity.last_seen': -1 })
        .limit(limit)
        .select('first_name last_name username activity.last_seen');

      return {
        recent_groups: recentGroups,
        recent_users: recentUsers
      };
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      throw error;
    }
  }

  async updateDailyStats() {
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);

      let stats = await Statistics.getDailyStats(today);
      if (!stats) {
        stats = await Statistics.createOrUpdateDailyStats(today);
      }

      // Update with current data
      const totalGroups = await Group.countDocuments();
      const totalUsers = await User.countDocuments();
      const newUsersToday = await User.countDocuments({
        'profile.join_date': { $gte: startOfDay }
      });

      stats.total_groups = totalGroups;
      stats.total_users = totalUsers;
      stats.new_users_today = newUsersToday;

      await stats.save();
      logger.info('Updated daily statistics');
    } catch (error) {
      logger.error('Error updating daily stats:', error);
      throw error;
    }
  }

  async getWeeklyStats() {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const weeklyStats = await Statistics.find({
        date: { $gte: weekAgo },
        type: 'daily'
      }).sort({ date: -1 });

      const totalMessages = weeklyStats.reduce((sum, stat) => sum + stat.messages_today, 0);
      const totalNewUsers = weeklyStats.reduce((sum, stat) => sum + stat.new_users_today, 0);

      return {
        period: '7 days',
        total_messages: totalMessages,
        total_new_users: totalNewUsers,
        daily_stats: weeklyStats
      };
    } catch (error) {
      logger.error('Error getting weekly stats:', error);
      throw error;
    }
  }
}

module.exports = new StatsService();
