const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Telegram Bot is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Health check passed',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Initialize Telegram Bot
let bot = null;

try {
  if (process.env.BOT_TOKEN) {
    bot = new TelegramBot(process.env.BOT_TOKEN, { 
      polling: true
    });

    // Basic message handler
    bot.on('message', (msg) => {
      console.log('Message received:', msg.text);
      
      if (msg.text === '/start') {
        bot.sendMessage(msg.chat.id, 'سلام! بات در حال کار است.');
      }
    });

    // Error handling
    bot.on('error', (error) => {
      console.error('Bot error:', error);
    });

    bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });

    console.log('Bot initialized successfully');
  } else {
    console.log('BOT_TOKEN not found, running without bot');
  }
} catch (error) {
  console.error('Failed to initialize bot:', error);
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Health check available at /health');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

module.exports = { app, bot };
