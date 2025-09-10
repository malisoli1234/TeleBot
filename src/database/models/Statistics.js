const mongoose = require('mongoose');

const statisticsSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  total_groups: {
    type: Number,
    default: 0
  },
  total_users: {
    type: Number,
    default: 0
  },
  new_users_today: {
    type: Number,
    default: 0
  },
  messages_today: {
    type: Number,
    default: 0
  },
  most_active_group: {
    group_id: {
      type: String,
      ref: 'Group'
    },
    messages_count: {
      type: Number,
      default: 0
    }
  },
  top_users: [{
    user_id: {
      type: String,
      ref: 'User'
    },
    messages_count: {
      type: Number,
      default: 0
    }
  }],
  group_stats: [{
    group_id: {
      type: String,
      ref: 'Group'
    },
    member_count: {
      type: Number,
      default: 0
    },
    messages_count: {
      type: Number,
      default: 0
    },
    new_members: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Indexes
statisticsSchema.index({ date: -1, type: 1 });
statisticsSchema.index({ type: 1, date: -1 });

// Static methods
statisticsSchema.statics.getDailyStats = function(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.findOne({
    date: { $gte: startOfDay, $lte: endOfDay },
    type: 'daily'
  });
};

statisticsSchema.statics.createOrUpdateDailyStats = async function(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const stats = await this.findOne({
    date: { $gte: startOfDay, $lte: endOfDay },
    type: 'daily'
  });

  if (stats) {
    return stats;
  }

  // Create new daily stats
  const newStats = new this({
    _id: `daily_${startOfDay.toISOString().split('T')[0]}`,
    date: startOfDay,
    type: 'daily'
  });

  return newStats.save();
};

statisticsSchema.statics.updateGroupStats = async function(groupId, memberCount, messagesCount, newMembers = 0) {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  let stats = await this.findOne({
    date: { $gte: startOfDay, $lte: today },
    type: 'daily'
  });

  if (!stats) {
    stats = await this.createOrUpdateDailyStats(today);
  }

  // Update or add group stats
  const groupStatIndex = stats.group_stats.findIndex(gs => gs.group_id === groupId);
  if (groupStatIndex >= 0) {
    stats.group_stats[groupStatIndex].member_count = memberCount;
    stats.group_stats[groupStatIndex].messages_count = messagesCount;
    stats.group_stats[groupStatIndex].new_members = newMembers;
  } else {
    stats.group_stats.push({
      group_id: groupId,
      member_count: memberCount,
      messages_count: messagesCount,
      new_members: newMembers
    });
  }

  return stats.save();
};

statisticsSchema.statics.updateUserStats = async function(userId, messagesCount) {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  let stats = await this.findOne({
    date: { $gte: startOfDay, $lte: today },
    type: 'daily'
  });

  if (!stats) {
    stats = await this.createOrUpdateDailyStats(today);
  }

  // Update or add user stats
  const userStatIndex = stats.top_users.findIndex(us => us.user_id === userId);
  if (userStatIndex >= 0) {
    stats.top_users[userStatIndex].messages_count = messagesCount;
  } else {
    stats.top_users.push({
      user_id: userId,
      messages_count: messagesCount
    });
  }

  // Sort by message count and keep top 10
  stats.top_users.sort((a, b) => b.messages_count - a.messages_count);
  stats.top_users = stats.top_users.slice(0, 10);

  return stats.save();
};

module.exports = mongoose.model('Statistics', statisticsSchema);
