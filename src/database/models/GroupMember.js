const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  group_id: {
    type: String,
    ref: 'Group',
    required: true
  },
  user_id: {
    type: String,
    ref: 'User',
    required: true
  },
  joined_at: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['member', 'admin', 'creator'],
    default: 'member'
  },
  messages_count: {
    type: Number,
    default: 0
  },
  last_activity: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true
  },
  warnings: {
    type: Number,
    default: 0
  },
  last_warning_date: {
    type: Date,
    default: null
  },
  coins_earned: {
    type: Number,
    default: 0
  },
  xp_earned: {
    type: Number,
    default: 0
  },
  daily_messages: {
    type: Number,
    default: 0
  },
  weekly_messages: {
    type: Number,
    default: 0
  },
  monthly_messages: {
    type: Number,
    default: 0
  },
  last_daily_bonus: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for unique group-user combination
groupMemberSchema.index({ group_id: 1, user_id: 1 }, { unique: true });

// Indexes for queries
groupMemberSchema.index({ group_id: 1, 'messages_count': -1 });
groupMemberSchema.index({ user_id: 1, 'last_activity': -1 });
groupMemberSchema.index({ group_id: 1, 'role': 1 });

// Methods
groupMemberSchema.methods.incrementMessageCount = function() {
  this.messages_count += 1;
  this.daily_messages += 1;
  this.weekly_messages += 1;
  this.monthly_messages += 1;
  this.last_activity = new Date();
  return this.save();
};

groupMemberSchema.methods.updateActivity = function() {
  this.last_activity = new Date();
  return this.save();
};

groupMemberSchema.methods.addWarning = function() {
  this.warnings += 1;
  this.last_warning_date = new Date();
  return this.save();
};

groupMemberSchema.methods.setRole = function(role) {
  this.role = role;
  return this.save();
};

groupMemberSchema.methods.deactivate = function() {
  this.is_active = false;
  return this.save();
};

groupMemberSchema.methods.activate = function() {
  this.is_active = true;
  return this.save();
};

groupMemberSchema.methods.addCoins = function(amount) {
  this.coins_earned += amount;
  return this.save();
};

groupMemberSchema.methods.addXP = function(amount) {
  this.xp_earned += amount;
  return this.save();
};

groupMemberSchema.methods.resetDailyCounters = function() {
  this.daily_messages = 0;
  return this.save();
};

groupMemberSchema.methods.resetWeeklyCounters = function() {
  this.weekly_messages = 0;
  return this.save();
};

groupMemberSchema.methods.resetMonthlyCounters = function() {
  this.monthly_messages = 0;
  return this.save();
};

// Static methods
groupMemberSchema.statics.findByGroup = function(groupId, limit = 50, skip = 0) {
  return this.find({ group_id: groupId, is_active: true })
    .populate('user_id', 'first_name last_name username')
    .sort({ messages_count: -1 })
    .limit(limit)
    .skip(skip);
};

groupMemberSchema.statics.findByUser = function(userId) {
  return this.find({ user_id: userId, is_active: true })
    .populate('group_id', 'title type member_count');
};

groupMemberSchema.statics.findAdminsByGroup = function(groupId) {
  return this.find({ 
    group_id: groupId, 
    role: { $in: ['admin', 'creator'] },
    is_active: true 
  }).populate('user_id', 'first_name last_name username');
};

groupMemberSchema.statics.getTopMembers = function(groupId, limit = 10) {
  return this.find({ group_id: groupId, is_active: true })
    .populate('user_id', 'first_name last_name username')
    .sort({ messages_count: -1 })
    .limit(limit);
};

module.exports = mongoose.model('GroupMember', groupMemberSchema);
