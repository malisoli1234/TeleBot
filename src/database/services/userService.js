const User = require('../models/User');
const GroupMember = require('../models/GroupMember');
const Group = require('../models/Group');
const Statistics = require('../models/Statistics');
const logger = require('../../utils/logger');

class UserService {
  async createOrUpdateUser(userData) {
    try {
      const { id, first_name, last_name, username, is_bot, is_bot_owner, groups_joined, groups_count } = userData;
      
      let user = await User.findOne({ id: id });
      
      if (user) {
        // Update existing user
        user.first_name = first_name;
        user.last_name = last_name || user.last_name;
        user.username = username || user.username;
        user.is_bot = is_bot || user.is_bot;
        user.is_bot_owner = is_bot_owner || user.is_bot_owner;
        
        // Add new groups if any
        if (groups_joined && groups_joined.length > 0) {
          groups_joined.forEach(groupId => {
            if (!user.groups_joined.includes(groupId)) {
              user.groups_joined.push(groupId);
            }
          });
          user.groups_count = user.groups_joined.length;
        }
        
        await user.save();
      } else {
        // Create new user
        user = new User({
          _id: id.toString(),
          id: id,
          first_name: first_name,
          last_name: last_name || '',
          username: username || null,
          is_bot: is_bot || false,
          is_bot_owner: is_bot_owner || false,
          groups_joined: groups_joined || [],
          groups_count: groups_count || 0
        });
        await user.save();
        logger.info(`Created new user: ${first_name} (${id})`);
      }

      return user;
    } catch (error) {
      logger.error('Error creating/updating user:', error);
      throw error;
    }
  }

  async getUserInfo(userId) {
    try {
      const user = await User.findOne({ id: parseInt(userId) });
      if (!user) {
        return null;
      }

      const userGroups = await GroupMember.findByUser(userId);
      
      return {
        ...user.toObject(),
        groups: userGroups
      };
    } catch (error) {
      logger.error('Error getting user info:', error);
      return null;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const user = await User.findOneAndUpdate(
        { id: parseInt(userId) },
        updateData,
        { new: true }
      );
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async addCoins(userId, amount, reason = '') {
    try {
      const user = await User.findOneAndUpdate(
        { id: parseInt(userId) },
        { 
          $inc: { coins: amount },
          $push: {
            'stats.activity_log': {
              type: 'coins_earned',
              description: reason,
              coins_earned: amount,
              date: new Date()
            }
          }
        },
        { new: true }
      );
      
      if (user) {
        logger.info(`Added ${amount} coins to user ${userId}. Reason: ${reason}`);
        
        // Update Group.members array for all user's groups
        await this.updateUserCoinsInAllGroups(userId, amount);
      }
      
      return user;
    } catch (error) {
      logger.error('Error adding coins:', error);
      throw error;
    }
  }

  async addXP(userId, amount, reason = '') {
    try {
      const user = await User.findOneAndUpdate(
        { id: parseInt(userId) },
        { 
          $inc: { xp: amount },
          $push: {
            'stats.activity_log': {
              type: 'xp_earned',
              description: reason,
              xp_earned: amount,
              date: new Date()
            }
          }
        },
        { new: true }
      );
      
      if (user) {
        logger.info(`Added ${amount} XP to user ${userId}. Reason: ${reason}`);
        
        // Update Group.members array for all user's groups
        await this.updateUserXPInAllGroups(userId, amount);
      }
      
      return user;
    } catch (error) {
      logger.error('Error adding XP:', error);
      throw error;
    }
  }

  async addAchievement(userId, achievement) {
    try {
      const user = await User.findOneAndUpdate(
        { id: parseInt(userId) },
        { 
          $push: { achievements: achievement },
          $inc: { 'stats.achievements_count': 1 }
        },
        { new: true }
      );
      
      if (user) {
        logger.info(`Added achievement ${achievement.name} to user ${userId}`);
      }
      
      return user;
    } catch (error) {
      logger.error('Error adding achievement:', error);
      throw error;
    }
  }

  async addChallenge(userId, challenge) {
    try {
      const user = await User.findOneAndUpdate(
        { id: parseInt(userId) },
        { $push: { active_challenges: challenge } },
        { new: true }
      );
      
      if (user) {
        logger.info(`Added challenge ${challenge.name} to user ${userId}`);
      }
      
      return user;
    } catch (error) {
      logger.error('Error adding challenge:', error);
      throw error;
    }
  }

  async completeChallenge(userId, challengeId, reward) {
    try {
      const user = await User.findOneAndUpdate(
        { 
          id: parseInt(userId),
          'active_challenges.id': challengeId
        },
        { 
          $pull: { active_challenges: { id: challengeId } },
          $inc: { 
            coins: reward,
            'stats.challenges_completed': 1
          }
        },
        { new: true }
      );
      
      if (user) {
        logger.info(`Completed challenge ${challengeId} for user ${userId}. Reward: ${reward} coins`);
      }
      
      return user;
    } catch (error) {
      logger.error('Error completing challenge:', error);
      throw error;
    }
  }

  async resetDailyCounters() {
    try {
      await User.updateMany(
        {},
        { 
          $set: { daily_messages: 0 },
          $unset: { last_daily_bonus: 1 }
        }
      );
      logger.info('Daily counters reset');
    } catch (error) {
      logger.error('Error resetting daily counters:', error);
    }
  }

  async resetWeeklyCounters() {
    try {
      await User.updateMany(
        {},
        { $set: { weekly_messages: 0 } }
      );
      logger.info('Weekly counters reset');
    } catch (error) {
      logger.error('Error resetting weekly counters:', error);
    }
  }

  async resetMonthlyCounters() {
    try {
      await User.updateMany(
        {},
        { $set: { monthly_messages: 0 } }
      );
      logger.info('Monthly counters reset');
    } catch (error) {
      logger.error('Error resetting monthly counters:', error);
    }
  }

  async getTopUsers(limit = 10, sortBy = 'coins') {
    try {
      const users = await User.find({})
        .sort({ [sortBy]: -1 })
        .limit(limit)
        .select('id first_name last_name username coins xp level rank total_messages');
      
      return users;
    } catch (error) {
      logger.error('Error getting top users:', error);
      return [];
    }
  }

  async getUserRank(userId, sortBy = 'coins') {
    try {
      const user = await User.findOne({ id: parseInt(userId) });
      if (!user) return null;

      const rank = await User.countDocuments({
        [sortBy]: { $gt: user[sortBy] }
      }) + 1;

      return rank;
    } catch (error) {
      logger.error('Error getting user rank:', error);
      return null;
    }
  }

  async isUserBotOwner(userId) {
    try {
      // Check against BOT_OWNER_ID from environment
      const botOwnerId = process.env.BOT_OWNER_ID;
      if (botOwnerId && userId.toString() === botOwnerId.toString()) {
        return true;
      }
      
      // Also check database for backward compatibility
      const user = await User.findOne({ id: parseInt(userId) });
      return user ? user.is_bot_owner : false;
    } catch (error) {
      logger.error('Error checking if user is bot owner:', error);
      return false;
    }
  }

  async getAllUsers() {
    try {
      const users = await User.find({})
        .select('id first_name last_name username coins xp level rank total_messages last_seen')
        .sort({ last_seen: -1 });
      
      return users;
    } catch (error) {
      logger.error('Error getting all users:', error);
      return [];
    }
  }

  async getUserCount() {
    try {
      const count = await User.countDocuments({});
      return count;
    } catch (error) {
      logger.error('Error getting user count:', error);
      return 0;
    }
  }

  async getActiveUsers(days = 7) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);
      
      const users = await User.find({
        last_seen: { $gte: date }
      }).countDocuments();
      
      return users;
    } catch (error) {
      logger.error('Error getting active users:', error);
      return 0;
    }
  }

  async setUserAsBotOwner(userId) {
    try {
      // Try to find existing user by ID
      let user = await User.findOne({ id: parseInt(userId) });
      
      if (user) {
        // Update existing user
        user.is_bot_owner = true;
        await user.save();
        logger.info(`Updated existing user ${userId} as bot owner`);
        return user;
      }
      
      // Try to find by _id
      user = await User.findById(userId.toString());
      if (user) {
        user.is_bot_owner = true;
        await user.save();
        logger.info(`Updated existing user ${userId} as bot owner (by _id)`);
        return user;
      }
      
      // If not found, just log and continue
      logger.warn(`User ${userId} not found in database, will be created when they send a message`);
      return null;
    } catch (error) {
      logger.error('Error setting user as bot owner:', error);
      // Don't throw error, just log and continue
      return null;
    }
  }

  async updateUserActivity(userId, chatId) {
    try {
      const now = new Date();
      
      // Update last seen and message count
      await User.findOneAndUpdate(
        { id: parseInt(userId) },
        {
          last_seen: now,
          $inc: {
            total_messages: 1,
            daily_messages: 1,
            weekly_messages: 1,
            monthly_messages: 1
          }
        }
      );

      logger.debug(`Updated activity for user ${userId}`);
    } catch (error) {
      logger.error('Error updating user activity:', error);
    }
  }

  async incrementUserMessageCount(userId, chatId) {
    try {
      const now = new Date();
      
      // Update user activity
      await this.updateUserActivity(userId, chatId);
      
      // Add group to user's groups if not already there
      const user = await User.findOne({ id: parseInt(userId) });
      if (user) {
        const groupId = chatId.toString();
        if (!user.groups_joined.includes(groupId)) {
          user.groups_joined.push(groupId);
        }
        
        // Always update groups_count to match groups_joined.length
        user.groups_count = user.groups_joined.length;
        await user.save();
        
        if (!user.groups_joined.includes(groupId)) {
          logger.debug(`Added group ${groupId} to user ${userId}. Total groups: ${user.groups_count}`);
        }

        // Group.members stats are updated by groupService.incrementMemberMessageCount
      }

      logger.debug(`Incremented message count for user ${userId} in group ${chatId}`);
    } catch (error) {
      logger.error('Error incrementing user message count:', error);
    }
  }


  async updateUserCoinsInAllGroups(userId, amount) {
    try {
      const user = await User.findOne({ id: parseInt(userId) });
      if (!user || !user.groups_joined) {
        return;
      }

      // Update coins in all user's groups
      for (const groupId of user.groups_joined) {
        const group = await Group.findById(groupId);
        if (group) {
          const member = group.members.find(m => m.user_id === userId.toString());
          if (member) {
            member.coins_earned += amount;
            member.last_activity = new Date();
            await group.save();
          }
        }
      }
    } catch (error) {
      logger.error('Error updating user coins in all groups:', error);
    }
  }

  async updateUserXPInAllGroups(userId, amount) {
    try {
      const user = await User.findOne({ id: parseInt(userId) });
      if (!user || !user.groups_joined) {
        return;
      }

      // Update XP in all user's groups
      for (const groupId of user.groups_joined) {
        const group = await Group.findById(groupId);
        if (group) {
          const member = group.members.find(m => m.user_id === userId.toString());
          if (member) {
            member.xp_earned += amount;
            member.last_activity = new Date();
            await group.save();
          }
        }
      }
    } catch (error) {
      logger.error('Error updating user XP in all groups:', error);
    }
  }

  async fixAllUsersGroupsCount() {
    try {
      const users = await User.find({});
      let fixedCount = 0;

      for (const user of users) {
        const correctCount = user.groups_joined.length;
        if (user.groups_count !== correctCount) {
          user.groups_count = correctCount;
          await user.save();
          fixedCount++;
          logger.debug(`Fixed groups_count for user ${user.id}: ${user.groups_count}`);
        }
      }

      logger.info(`Fixed groups_count for ${fixedCount} users`);
      return fixedCount;
    } catch (error) {
      logger.error('Error fixing users groups count:', error);
      return 0;
    }
  }

  async isUserBannedFromGroup(userId, groupId) {
    try {
      // Check if user is banned in the group
      const group = await Group.findById(groupId);
      if (!group) return false;

      const member = group.members.find(m => m.user_id === userId.toString());
      if (!member) return false;

      return member.is_banned || false;
    } catch (error) {
      logger.error('Error checking if user is banned from group:', error);
      return false;
    }
  }

  async isUserMutedInGroup(userId, groupId) {
    try {
      // Check if user is muted in the group
      const group = await Group.findById(groupId);
      if (!group) return false;

      const member = group.members.find(m => m.user_id === userId.toString());
      if (!member) return false;

      // Check if mute is still active
      if (member.muted_until && new Date() < new Date(member.muted_until)) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking if user is muted in group:', error);
      return false;
    }
  }

  async muteUserInGroup(userId, groupId, durationHours = 24, reason = '') {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Find member in Group.members array
      const member = group.members.find(m => m.user_id === userId.toString());
      if (!member) {
        throw new Error('User not found in group');
      }

      // Set mute until time
      const muteUntil = new Date();
      muteUntil.setHours(muteUntil.getHours() + durationHours);
      
      member.is_muted = true;
      member.muted_until = muteUntil;
      member.mute_reason = reason;
      member.last_activity = new Date();

      await group.save();
      logger.info(`User ${userId} muted in group ${groupId} until ${muteUntil}`);
      return true;
    } catch (error) {
      logger.error('Error muting user in group:', error);
      throw error;
    }
  }

  async unmuteUserInGroup(userId, groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Find member in Group.members array
      const member = group.members.find(m => m.user_id === userId.toString());
      if (!member) {
        throw new Error('User not found in group');
      }

      // Remove mute
      member.is_muted = false;
      member.muted_until = null;
      member.mute_reason = null;
      member.last_activity = new Date();

      await group.save();
      logger.info(`User ${userId} unmuted in group ${groupId}`);
      return true;
    } catch (error) {
      logger.error('Error unmuting user in group:', error);
      throw error;
    }
  }

  async banUserFromGroup(userId, groupId, reason = '') {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Find member in Group.members array
      const member = group.members.find(m => m.user_id === userId.toString());
      if (!member) {
        throw new Error('User not found in group');
      }

      // Set ban
      member.is_banned = true;
      member.ban_reason = reason;
      member.banned_at = new Date();
      member.is_active = false;
      member.last_activity = new Date();

      // Update member count
      group.member_count = group.members.filter(m => m.is_active).length;

      await group.save();
      logger.info(`User ${userId} banned from group ${groupId}`);
      return true;
    } catch (error) {
      logger.error('Error banning user from group:', error);
      throw error;
    }
  }

  async unbanUserFromGroup(userId, groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Find member in Group.members array
      const member = group.members.find(m => m.user_id === userId.toString());
      if (!member) {
        throw new Error('User not found in group');
      }

      // Remove ban
      member.is_banned = false;
      member.ban_reason = null;
      member.banned_at = null;
      member.is_active = true;
      member.last_activity = new Date();

      // Update member count
      group.member_count = group.members.filter(m => m.is_active).length;

      await group.save();
      logger.info(`User ${userId} unbanned from group ${groupId}`);
      return true;
    } catch (error) {
      logger.error('Error unbanning user from group:', error);
      throw error;
    }
  }
}

module.exports = new UserService();