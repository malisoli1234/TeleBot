# Telegram Bot - Modular Architecture

A powerful and modular Telegram bot built with Node.js for core functionality and Python for future Machine Learning integration.

## 🚀 Features

### Core Functionality
- **Modular Architecture**: Each feature in separate files connected to central Node.js server
- **MongoDB Integration**: Stores group data, user profiles, and statistics
- **Role-Based Access Control**: Different permissions for Owner, Admin, and Member roles
- **Silent ID Extraction**: Automatically extracts user IDs without user interaction
- **Economy System**: Bot currency (coins), experience points (XP), levels, and ranks

### Management Features
- **Reply-Based Commands**: Administrative commands without `/` prefix
- **User Management**: Mute, unmute, ban, unban, kick, warn users
- **Group Statistics**: Comprehensive group and user statistics
- **Profile System**: Detailed user profiles with group-specific stats

### Commands

#### Basic Commands (with `/`)
- `/start` - Start the bot
- `/help` - Complete help guide
- `/info` - Bot information
- `/time` - Current time
- `/weather` - Weather status
- `/profile` - Your profile
- `/profile` (reply) - User's profile
- `/stats` - Group statistics (admin only)
- `/members` - Group members list
- `/menu` - Show menu
- `/buttons` - Show buttons
- `/remove_buttons` - Remove buttons

#### Reply Commands (without `/`)
- `آمار` (reply) - Group statistics
- `اطلاعات` (reply) - Group information
- `آمار گروه` - Group statistics
- `اخراج` (reply) - Kick user
- `بن` (reply) - Ban user
- `آنبن` (reply) - Unban user
- `میوت` (reply) - Mute user
- `آنمیوت` (reply) - Unmute user
- `اخطار` (reply) - Warn user

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Python 3.8+ (for ML features)

### Setup
1. Clone the repository:
```bash
git clone https://github.com/malisoli1234/TeleBot.git
cd TeleBot
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.example .env
```

4. Configure your `.env` file:
```env
BOT_TOKEN=your_telegram_bot_token
MONGODB_URI=mongodb://localhost:27017/telegram_bot
PORT=3000
BOT_OWNER_ID=your_telegram_user_id
```

5. Start the bot:
```bash
npm start
```

## 📁 Project Structure

```
src/
├── handlers/          # Message and command handlers
│   ├── commandHandler.js
│   ├── replyHandler.js
│   └── messageHandler.js
├── database/          # Database models and services
│   ├── models/
│   │   ├── User.js
│   │   └── Group.js
│   └── services/
│       ├── userService.js
│       └── groupService.js
├── services/          # Core services
│   ├── idService.js
│   ├── buttonService.js
│   └── permissionService.js
├── utils/             # Utilities
│   └── logger.js
└── server.js          # Main server file
```

## 🔧 Configuration

### Environment Variables
- `BOT_TOKEN`: Your Telegram bot token
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Server port (default: 3000)
- `BOT_OWNER_ID`: Your Telegram user ID

### Database Models

#### User Model
- User profile information
- Message counts (total, daily, weekly, monthly)
- Economy data (coins, XP, level, rank)
- Group memberships
- Trust score and achievements

#### Group Model
- Group information and settings
- Member statistics array
- Group-specific user data
- Administrative settings

## 🎯 Usage

### In Groups
- All `/` commands available to everyone
- Reply commands require admin/owner permissions
- `/stats` command shows comprehensive group statistics

### In Private Chats
- All commands available
- Role-based buttons displayed
- Full profile access

## 🤖 Future ML Integration

The bot is designed to support Python-based Machine Learning features:
- Chat analysis and response generation
- User behavior prediction
- Content moderation
- Advanced analytics

## 📊 Statistics Features

- **User Profiles**: Complete user statistics and achievements
- **Group Analytics**: Member activity and engagement metrics
- **Economy System**: Coins, XP, levels, and rewards
- **Anti-Cheat**: Spam detection and quality scoring
- **Missions**: Daily, weekly, and monthly challenges

## 🔒 Security Features

- Role-based access control
- Anti-spam protection
- Trust score system
- User verification
- Group management tools

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support and questions, please open an issue on GitHub.

---

**Note**: This bot is designed for educational and personal use. Please ensure compliance with Telegram's Terms of Service and your local regulations.