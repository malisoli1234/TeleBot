const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['group', 'supergroup', 'channel'],
    required: true
  },
  member_count: {
    type: Number,
    default: 0
  },
  members: [{
    user_id: {
      type: String,
      ref: 'User',
      required: true
    },
    first_name: {
      type: String,
      required: true
    },
    last_name: {
      type: String,
      default: ''
    },
    username: {
      type: String,
      default: null
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
    coins_earned: {
      type: Number,
      default: 0
    },
    xp_earned: {
      type: Number,
      default: 0
    },
    warnings: {
      type: Number,
      default: 0
    },
    last_warning_date: {
      type: Date,
      default: null
    },
    last_activity: {
      type: Date,
      default: Date.now
    },
    is_active: {
      type: Boolean,
      default: true
    },
    is_muted: {
      type: Boolean,
      default: false
    },
    muted_until: {
      type: Date,
      default: null
    },
    mute_reason: {
      type: String,
      default: null
    },
    is_banned: {
      type: Boolean,
      default: false
    },
    ban_reason: {
      type: String,
      default: null
    },
    banned_at: {
      type: Date,
      default: null
    }
  }],
  admins: [{
    type: String,
    ref: 'User'
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  last_activity: {
    type: Date,
    default: Date.now
  },
  settings: {
    welcome_enabled: {
      type: Boolean,
      default: true
    },
    anti_spam: {
      type: Boolean,
      default: true
    },
    auto_delete: {
      type: Boolean,
      default: false
    },
    mute_duration: {
      type: Number,
      default: 24 // hours
    }
  },
  statistics: {
    total_messages: {
      type: Number,
      default: 0
    },
    daily_messages: {
      type: Number,
      default: 0
    },
    last_message_date: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ last_activity: -1 });
groupSchema.index({ member_count: -1 });
groupSchema.index({ 'statistics.total_messages': -1 });

// Methods
groupSchema.methods.updateActivity = function() {
  this.last_activity = new Date();
  return this.save();
};

groupSchema.methods.incrementMessageCount = function() {
  this.statistics.total_messages += 1;
  this.statistics.daily_messages += 1;
  this.statistics.last_message_date = new Date();
  this.last_activity = new Date();
  return this.save();
};

groupSchema.methods.addAdmin = function(userId) {
  if (!this.admins.includes(userId)) {
    this.admins.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.removeAdmin = function(userId) {
  this.admins = this.admins.filter(adminId => adminId !== userId);
  return this.save();
};

// Member management methods
groupSchema.methods.addMember = function(userData) {
  const { user_id, first_name, last_name, username, role = 'member' } = userData;
  
  // Check if member already exists
  const existingMember = this.members.find(member => member.user_id === user_id);
  if (existingMember) {
    return existingMember;
  }
  
  // Add new member
  const newMember = {
    user_id,
    first_name,
    last_name: last_name || '',
    username: username || null,
    joined_at: new Date(),
    role,
    messages_count: 0,
    daily_messages: 0,
    weekly_messages: 0,
    monthly_messages: 0,
    coins_earned: 0,
    xp_earned: 0,
    warnings: 0,
    last_warning_date: null,
    last_activity: new Date(),
    is_active: true,
    is_muted: false,
    muted_until: null,
    mute_reason: null,
    is_banned: false,
    ban_reason: null,
    banned_at: null
  };
  
  this.members.push(newMember);
  this.member_count = this.members.filter(m => m.is_active).length;
  return this.save();
};

groupSchema.methods.updateMember = function(userId, updateData) {
  const member = this.members.find(m => m.user_id === userId);
  if (member) {
    Object.assign(member, updateData);
    member.last_activity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.incrementMemberMessageCount = function(userId) {
  const member = this.members.find(m => m.user_id === userId && m.is_active);
  if (member) {
    member.messages_count += 1;
    member.daily_messages += 1;
    member.weekly_messages += 1;
    member.monthly_messages += 1;
    member.last_activity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.addMemberCoins = function(userId, amount) {
  const member = this.members.find(m => m.user_id === userId && m.is_active);
  if (member) {
    member.coins_earned += amount;
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.addMemberXP = function(userId, amount) {
  const member = this.members.find(m => m.user_id === userId && m.is_active);
  if (member) {
    member.xp_earned += amount;
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.addMemberWarning = function(userId) {
  const member = this.members.find(m => m.user_id === userId && m.is_active);
  if (member) {
    member.warnings += 1;
    member.last_warning_date = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.removeMember = function(userId) {
  const member = this.members.find(m => m.user_id === userId);
  if (member) {
    member.is_active = false;
    this.member_count = this.members.filter(m => m.is_active).length;
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.resetDailyCounters = function() {
  this.members.forEach(member => {
    member.daily_messages = 0;
  });
  return this.save();
};

groupSchema.methods.resetWeeklyCounters = function() {
  this.members.forEach(member => {
    member.weekly_messages = 0;
  });
  return this.save();
};

groupSchema.methods.resetMonthlyCounters = function() {
  this.members.forEach(member => {
    member.monthly_messages = 0;
  });
  return this.save();
};

groupSchema.methods.getTopMembers = function(limit = 10) {
  return this.members
    .filter(member => member.is_active)
    .sort((a, b) => b.messages_count - a.messages_count)
    .slice(0, limit);
};

module.exports = mongoose.model('Group', groupSchema);
