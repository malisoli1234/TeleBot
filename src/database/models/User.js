const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  id: {
    type: Number,
    required: true,
    unique: true
  },
  username: {
    type: String,
    default: null
  },
  first_name: {
    type: String,
    required: true
  },
  last_name: {
    type: String,
    default: ''
  },
  is_bot: {
    type: Boolean,
    default: false
  },
  is_bot_owner: {
    type: Boolean,
    default: false
  },
  
  // سیستم اقتصادی
  coins: {
    type: Number,
    default: 0,
    min: 0
  },
  xp: {
    type: Number,
    default: 0,
    min: 0
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  rank: {
    type: String,
    default: 'مبتدی',
    enum: ['مبتدی', 'متوسط', 'پیشرفته', 'حرفه‌ای', 'افسانه']
  },
  
  // آمار فعالیت
  total_messages: {
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
  
  // آمار زمانی
  first_seen: {
    type: Date,
    default: Date.now
  },
  last_seen: {
    type: Date,
    default: Date.now
  },
  last_daily_bonus: {
    type: Date,
    default: null
  },
  total_online_hours: {
    type: Number,
    default: 0
  },
  
  // آمار گروه‌ها
  groups_joined: [{
    type: String,
    ref: 'Group'
  }],
  groups_count: {
    type: Number,
    default: 0
  },
  admin_groups: [{
    type: String,
    ref: 'Group'
  }],
  owner_groups: [{
    type: String,
    ref: 'Group'
  }],
  
  // دستاوردها
  achievements: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    earned_at: {
      type: Date,
      default: Date.now
    },
    coins_reward: {
      type: Number,
      default: 0
    }
  }],
  
  // چالش‌ها
  active_challenges: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    target: {
      type: Number,
      required: true
    },
    reward: {
      type: Number,
      required: true
    },
    expires_at: {
      type: Date,
      required: true
    }
  }],
  
  // پروفایل شخصی
  profile: {
    bio: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    custom_emoji: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: '#3498db'
    }
  },
  
  // تنظیمات
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    privacy: {
      type: String,
      default: 'public',
      enum: ['public', 'friends', 'private']
    },
    language: {
      type: String,
      default: 'fa'
    },
    theme: {
      type: String,
      default: 'default'
    }
  },
  
  // آمار پیشرفته
  stats: {
    message_ratio: {
      type: Number,
      default: 0
    },
    interaction_rate: {
      type: Number,
      default: 0
    },
    help_count: {
      type: Number,
      default: 0
    },
    gift_sent: {
      type: Number,
      default: 0
    },
    gift_received: {
      type: Number,
      default: 0
    },
    challenges_completed: {
      type: Number,
      default: 0
    },
    achievements_count: {
      type: Number,
      default: 0
    }
  },
  
  // سیستم ضد تقلب
  anti_fraud: {
    trust_score: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    spam_count: {
      type: Number,
      default: 0
    },
    last_spam_warning: {
      type: Date,
      default: null
    },
    ban_count: {
      type: Number,
      default: 0
    },
    last_ban: {
      type: Date,
      default: null
    },
    quality_score: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    }
  },
  
  // تاریخ‌ها
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ id: 1 });
userSchema.index({ username: 1 });
userSchema.index({ coins: -1 });
userSchema.index({ xp: -1 });
userSchema.index({ level: -1 });
userSchema.index({ last_seen: -1 });

// Middleware
userSchema.pre('save', function(next) {
  this.updated_at = new Date();
  
  // Update level based on XP
  if (this.xp >= 0 && this.xp < 100) {
    this.level = 1;
    this.rank = 'مبتدی';
  } else if (this.xp >= 100 && this.xp < 500) {
    this.level = 2;
    this.rank = 'متوسط';
  } else if (this.xp >= 500 && this.xp < 1000) {
    this.level = 3;
    this.rank = 'پیشرفته';
  } else if (this.xp >= 1000 && this.xp < 5000) {
    this.level = 4;
    this.rank = 'حرفه‌ای';
  } else if (this.xp >= 5000) {
    this.level = 5;
    this.rank = 'افسانه';
  }
  
  next();
});

module.exports = mongoose.model('User', userSchema);