const mongoose = require('mongoose');

const userGroupStatsSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  user_id: {
    type: Number,
    required: true,
    ref: 'User'
  },
  group_id: {
    type: String,
    required: true,
    ref: 'Group'
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
  first_message: {
    type: Date,
    default: Date.now
  },
  last_message: {
    type: Date,
    default: Date.now
  },
  coins_earned: {
    type: Number,
    default: 0
  },
  xp_earned: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
userGroupStatsSchema.index({ user_id: 1, group_id: 1 }, { unique: true });
userGroupStatsSchema.index({ user_id: 1 });
userGroupStatsSchema.index({ group_id: 1 });
userGroupStatsSchema.index({ messages_count: -1 });

module.exports = mongoose.model('UserGroupStats', userGroupStatsSchema);
