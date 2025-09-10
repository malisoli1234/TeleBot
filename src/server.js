const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const dbConnection = require('./database/connection');
const commandHandler = require('./handlers/commandHandler');
const messageHandler = require('./handlers/messageHandler');
const replyHandler = require('./handlers/replyHandler');
const adminHandler = require('./handlers/adminHandler');
const mlService = require('./services/mlService');
const permissionService = require('./services/permissionService');
const buttonService = require('./services/buttonService');
const idService = require('./services/idService');
const economyService = require('./services/economyService');
const groupService = require('./database/services/groupService');
const userService = require('./database/services/userService');
const userGroupStatsService = require('./database/services/userGroupStatsService');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Telegram Bot is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Health check passed',
    timestamp: new Date().toISOString()
  });
});

// Initialize database connection
async function initializeDatabase() {
  try {
    await dbConnection.connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Initialize handlers
commandHandler.init(bot);
messageHandler.init(bot);
replyHandler.init(bot);
adminHandler.init(bot);
permissionService.init(bot);
buttonService.init(bot);
idService.init(bot);
economyService.init(bot);

// Cleanup expired ID requests every 5 minutes
setInterval(() => {
  idService.cleanupExpiredRequests();
}, 5 * 60 * 1000);

    // Reset daily counters at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        userService.resetDailyCounters();
        userGroupStatsService.resetDailyCounters();
        groupService.resetDailyCounters();
      }
    }, 60 * 1000); // Check every minute

    // Reset weekly counters on Sunday
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
        userService.resetWeeklyCounters();
        userGroupStatsService.resetWeeklyCounters();
        groupService.resetWeeklyCounters();
      }
    }, 60 * 1000); // Check every minute

    // Reset monthly counters on 1st of month
    setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        userService.resetMonthlyCounters();
        userGroupStatsService.resetMonthlyCounters();
        groupService.resetMonthlyCounters();
      }
    }, 60 * 1000); // Check every minute

// Webhook endpoint (for production)
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mlService: mlService.isEnabled() ? 'Enabled' : 'Disabled'
  });
});

// Bot event handlers
bot.on('new_chat_members', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const newMembers = msg.new_chat_members;
    
    // Update group info
    await groupService.createOrUpdateGroup({
      id: chatId.toString(),
      title: msg.chat.title,
      type: msg.chat.type,
      member_count: msg.chat.member_count || 0
    });

    // Add new members
    for (const member of newMembers) {
      if (!member.is_bot) {
        await userService.createOrUpdateUser({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name || '',
          username: member.username || null
        });

        await groupService.addMemberToGroup(chatId.toString(), {
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name || '',
          username: member.username || null
        });
      }
    }

    logger.info(`New members added to group ${chatId}`);
  } catch (error) {
    logger.error('Error handling new chat members:', error);
  }
});

bot.on('left_chat_member', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const leftMember = msg.left_chat_member;
    
    if (!leftMember.is_bot) {
      await groupService.removeMemberFromGroup(chatId.toString(), leftMember.id.toString());
    }

    logger.info(`Member left group ${chatId}`);
  } catch (error) {
    logger.error('Error handling left chat member:', error);
  }
});

bot.on('message', async (msg) => {
  try {
    // Skip bot messages
    if (msg.from.is_bot) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Ensure group exists and update activity
    await groupService.ensureGroupExists(chatId, msg.chat);
    await groupService.incrementGroupMessageCount(chatId.toString());

    // Check if user is banned or muted
    const isBanned = await permissionService.isUserBanned(userId, chatId);
    const isMuted = await permissionService.isUserMuted(userId, chatId);
    
    if (isBanned || isMuted) {
      await bot.deleteMessage(chatId, msg.message_id);
      return;
    }

  } catch (error) {
    logger.error('Error handling message:', error);
  }
});

// Error handling
bot.on('error', (error) => {
  logger.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  logger.error('Polling error:', error);
});

// Button clicks are now handled in messageHandler

// Start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Set bot owner if specified
    if (process.env.BOT_OWNER_ID) {
      await userService.setUserAsBotOwner(process.env.BOT_OWNER_ID);
      logger.info(`Bot owner set to: ${process.env.BOT_OWNER_ID}`);
    }

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info('Bot is ready to receive messages!');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { bot, app };
