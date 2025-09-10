const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');
const Statistics = require('../models/Statistics');
const logger = require('../../utils/logger');

class GroupService {
  async ensureGroupExists(chatId, chatInfo) {
    try {
      const groupId = chatId.toString();
      let group = await Group.findById(groupId);
      
      if (!group) {
        // Create new group
        group = new Group({
          _id: groupId,
          title: chatInfo.title || 'Unknown Group',
          type: chatInfo.type || 'group',
          member_count: 0 // Will be updated when members are added
        });
        await group.save();
        logger.info(`Created new group: ${group.title} (${groupId})`);
      }
      
      return group;
    } catch (error) {
      logger.error('Error ensuring group exists:', error);
      return null;
    }
  }

  async createOrUpdateGroup(groupData) {
    try {
      const { id, title, type, member_count } = groupData;
      
      let group = await Group.findById(id);
      
      if (group) {
        // Update existing group
        group.title = title;
        group.type = type;
        group.member_count = member_count;
        group.last_activity = new Date();
        await group.save();
        logger.info(`Updated group: ${title} (${id})`);
      } else {
        // Create new group
        group = new Group({
          _id: id,
          title: title,
          type: type,
          member_count: member_count
        });
        await group.save();
        logger.info(`Created new group: ${title} (${id})`);
      }

      // Update statistics
      await Statistics.updateGroupStats(id, member_count, 0, 0);
      
      return group;
    } catch (error) {
      logger.error('Error creating/updating group:', error);
      throw error;
    }
  }

  async addMemberToGroup(groupId, userData, role = 'member') {
    try {
      const { id, first_name, last_name, username } = userData;
      
      // Create or update user
      let user = await User.findById(id);
      if (!user) {
        user = new User({
          _id: id,
          first_name: first_name,
          last_name: last_name || '',
          username: username || null
        });
        await user.save();
      } else {
        // Update user info
        user.first_name = first_name;
        user.last_name = last_name || user.last_name;
        user.username = username || user.username;
        await user.save();
      }

      // Add user to group
      let groupMember = await GroupMember.findOne({ group_id: groupId, user_id: id });
      if (!groupMember) {
        groupMember = new GroupMember({
          _id: `${groupId}_${id}`,
          group_id: groupId,
          user_id: id,
          role: role
        });
        await groupMember.save();
        
        // Update user's group count
        await user.addToGroup(groupId);
        
        logger.info(`Added user ${first_name} to group ${groupId}`);
      } else {
        // Update role if changed
        if (groupMember.role !== role) {
          groupMember.role = role;
          await groupMember.save();
        }
      }

      return groupMember;
    } catch (error) {
      logger.error('Error adding member to group:', error);
      throw error;
    }
  }

  async addGroupMember(groupId, userData) {
    try {
      const { user_id, first_name, last_name, username, joined_at } = userData;
      
      // Get group and add member to members array
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }

      // Check if member already exists in Group.members array
      const existingMember = group.members.find(member => member.user_id === user_id.toString());
      if (existingMember) {
        logger.debug(`Member ${first_name} already exists in group ${groupId}`);
        return group;
      }

      // Add member to group's members array
      await group.addMember({
        user_id: user_id,
        first_name: first_name,
        last_name: last_name || '',
        username: username || null,
        role: 'member'
      });

      // Also add to GroupMember collection for compatibility
      const existingGroupMember = await GroupMember.findOne({
        group_id: groupId,
        user_id: user_id
      });
      
      if (!existingGroupMember) {
        const groupMember = new GroupMember({
          _id: `${groupId}_${user_id}`,
          group_id: groupId,
          user_id: user_id,
          role: 'member',
          joined_at: joined_at || new Date()
        });
        await groupMember.save();
      }

      logger.debug(`Added member ${first_name} to group ${groupId}`);
      return group;
    } catch (error) {
      logger.error('Error adding group member:', error);
      throw error;
    }
  }

  async removeMemberFromGroup(groupId, userId) {
    try {
      const groupMember = await GroupMember.findOne({ group_id: groupId, user_id: userId });
      if (groupMember) {
        await groupMember.deactivate();
        
        // Update user's group count
        const user = await User.findById(userId);
        if (user) {
          await user.removeFromGroup(groupId);
        }
        
        // Update group member count
        await this.updateGroupMemberCount(groupId);
        
        logger.info(`Removed user ${userId} from group ${groupId}`);
      }
    } catch (error) {
      logger.error('Error removing member from group:', error);
      throw error;
    }
  }

  async updateGroupMemberCount(groupId, memberCount = null) {
    try {
      const group = await Group.findById(groupId);
      if (group) {
        // If memberCount is not provided, calculate it from GroupMember collection
        if (memberCount === null) {
          memberCount = await GroupMember.countDocuments({ group_id: groupId, is_active: true });
        }
        
        group.member_count = memberCount;
        await group.save();
        
        // Update statistics
        await Statistics.updateGroupStats(groupId, memberCount, group.statistics.total_messages, 0);
        
        logger.debug(`Updated member count for group ${groupId}: ${memberCount}`);
      }
    } catch (error) {
      logger.error('Error updating group member count:', error);
      throw error;
    }
  }

  async incrementGroupMessageCount(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (group) {
        await group.incrementMessageCount();
        
        // Update statistics
        await Statistics.updateGroupStats(groupId, group.member_count, group.statistics.total_messages, 0);
      }
    } catch (error) {
      logger.error('Error incrementing group message count:', error);
      throw error;
    }
  }

  async incrementMemberMessageCount(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (group) {
        await group.incrementMemberMessageCount(userId);
        logger.debug(`Incremented message count for user ${userId} in group ${groupId}`);
      }
    } catch (error) {
      logger.error('Error incrementing member message count:', error);
      throw error;
    }
  }

  async addMemberCoins(groupId, userId, amount) {
    try {
      const group = await Group.findById(groupId);
      if (group) {
        await group.addMemberCoins(userId, amount);
        logger.debug(`Added ${amount} coins to user ${userId} in group ${groupId}`);
      }
    } catch (error) {
      logger.error('Error adding member coins:', error);
      throw error;
    }
  }

  async addMemberXP(groupId, userId, amount) {
    try {
      const group = await Group.findById(groupId);
      if (group) {
        await group.addMemberXP(userId, amount);
        logger.debug(`Added ${amount} XP to user ${userId} in group ${groupId}`);
      }
    } catch (error) {
      logger.error('Error adding member XP:', error);
      throw error;
    }
  }

  async addMemberWarning(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (group) {
        await group.addMemberWarning(userId);
        logger.debug(`Added warning to user ${userId} in group ${groupId}`);
      }
    } catch (error) {
      logger.error('Error adding member warning:', error);
      throw error;
    }
  }

  async resetDailyCounters() {
    try {
      // Reset in Group members array
      const groups = await Group.find();
      for (const group of groups) {
        await group.resetDailyCounters();
      }
      
      // Also reset in GroupMember collection for compatibility
      await GroupMember.updateMany(
        { is_active: true },
        { $set: { daily_messages: 0 } }
      );
      logger.info('Reset daily counters for all group members');
    } catch (error) {
      logger.error('Error resetting daily counters:', error);
    }
  }

  async resetWeeklyCounters() {
    try {
      // Reset in Group members array
      const groups = await Group.find();
      for (const group of groups) {
        await group.resetWeeklyCounters();
      }
      
      // Also reset in GroupMember collection for compatibility
      await GroupMember.updateMany(
        { is_active: true },
        { $set: { weekly_messages: 0 } }
      );
      logger.info('Reset weekly counters for all group members');
    } catch (error) {
      logger.error('Error resetting weekly counters:', error);
    }
  }

  async resetMonthlyCounters() {
    try {
      // Reset in Group members array
      const groups = await Group.find();
      for (const group of groups) {
        await group.resetMonthlyCounters();
      }
      
      // Also reset in GroupMember collection for compatibility
      await GroupMember.updateMany(
        { is_active: true },
        { $set: { monthly_messages: 0 } }
      );
      logger.info('Reset monthly counters for all group members');
    } catch (error) {
      logger.error('Error resetting monthly counters:', error);
    }
  }

  async getGroupInfo(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return null;
      }

      const admins = await GroupMember.findAdminsByGroup(groupId);
      const memberCount = group.member_count;
      
      // Add getTopMembers method to the returned object
      const groupObj = group.toObject();
      groupObj.getTopMembers = group.getTopMembers.bind(group);
      
      return {
        ...groupObj,
        admins: admins,
        active_member_count: memberCount
      };
    } catch (error) {
      logger.error('Error getting group info:', error);
      throw error;
    }
  }

  async getGroupMembers(groupId, limit = 50, skip = 0) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return [];
      }
      
      // Get members from Group's members array
      const members = group.getTopMembers(limit + skip);
      return members.slice(skip);
    } catch (error) {
      logger.error('Error getting group members:', error);
      throw error;
    }
  }

  async getGroupAdmins(groupId) {
    try {
      return await GroupMember.findAdminsByGroup(groupId);
    } catch (error) {
      logger.error('Error getting group admins:', error);
      throw error;
    }
  }

  async getTopGroups(limit = 10) {
    try {
      return await Group.find()
        .sort({ 'statistics.total_messages': -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting top groups:', error);
      throw error;
    }
  }

  async getAllGroups() {
    try {
      return await Group.find().sort({ last_activity: -1 });
    } catch (error) {
      logger.error('Error getting all groups:', error);
      throw error;
    }
  }

  async getGroupStatistics(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return null;
      }

      const memberCount = group.member_count;
      const topMembers = group.getTopMembers(10);
      
      return {
        group: group,
        member_count: memberCount,
        top_members: topMembers
      };
    } catch (error) {
      logger.error('Error getting group statistics:', error);
      throw error;
    }
  }
}

module.exports = new GroupService();
