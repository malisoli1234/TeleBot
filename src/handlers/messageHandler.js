const logger = require('../utils/logger');
const mlService = require('../services/mlService');
const buttonService = require('../services/buttonService');
const idService = require('../services/idService');
const economyService = require('../services/economyService');

class MessageHandler {
  constructor() {
    this.bot = null;
  }

  init(bot) {
    this.bot = bot;
    buttonService.init(bot);
    idService.init(bot);
    economyService.init(bot);
    this.bot.on('message', this.handleMessage.bind(this));
  }

  async handleMessage(msg) {
    // Skip if it's a command (handled by commandHandler)
    if (msg.text && msg.text.startsWith('/')) {
      return;
    }

    // Skip if it's a reply command (handled by replyHandler)
    if (msg.reply_to_message) {
      return;
    }

    // Skip if it's a single word command (handled by adminHandler)
    const singleWordCommands = [
      'اخراج', 'بن', 'میوت', 'آمار', 'اطلاعات', 'اخطار', 'لغو_بن', 'لغو_میوت',
      'آمار_کلی', 'همه_گروهها', 'بن_سراسری', 'ارسال_همه',
      'گروه', 'اعضا', 'مدیران', 'تنظیمات'
    ];
    
    if (msg.text && singleWordCommands.includes(msg.text.trim())) {
      return;
    }

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const messageText = msg.text || '';

    logger.info(`Message received from chat ${chatId}: ${messageText}`);

    // Process user message and create profile silently
    if (msg.from && !msg.from.is_bot) {
      await idService.processUserMessage(msg);
      await economyService.processMessageReward(msg);
    }

    // Check if it's a button click (only in private chats)
    const isPrivateChat = chatId > 0;
    
    if (isPrivateChat) {
      const buttonTexts = [
        // Owner buttons
        '📊 آمار کلی', '🏢 همه گروه‌ها', '👥 آمار کاربران', '📈 گزارش‌های روزانه',
        '🔍 جستجوی پیشرفته', '📋 لاگ‌های سیستم', '🔨 بن سراسری', '📢 ارسال همه',
        '⚙️ تنظیمات سراسری', '🛡️ مدیریت امنیت', '📊 آمار عملکرد', '🔄 راه‌اندازی مجدد',
        // Admin buttons
        'ℹ️ اطلاعات گروه', '👥 لیست اعضا', '👥 اعضا', '👑 مدیران',
        '📊 آمار گروه', '🔍 جستجو کاربر', '⚙️ تنظیمات گروه', '🛡️ مدیریت امنیت',
        '📋 گزارش گروه', '📈 آمار فعالیت', '🔔 اعلان‌ها', '📝 قوانین گروه',
        // Member buttons
        '📊 آمار من', 'ℹ️ اطلاعات گروه', '👥 اعضای گروه', '📋 قوانین',
        '🆘 پشتیبانی', 'ℹ️ درباره بات', '❓ راهنما'
      ];

      if (buttonTexts.includes(messageText)) {
        await buttonService.handleButtonClick(chatId, userId, messageText);
        return;
      }
    }

    // ML service is disabled for now - only commands work
    // No automatic responses to regular messages
  }

  async handleBasicResponse(chatId, messageText) {
    const lowerText = messageText.toLowerCase();

    // Greeting responses
    if (this.containsAny(lowerText, ['سلام', 'salam', 'hi', 'hello', 'hey'])) {
      await this.bot.sendMessage(chatId, 'سلام! چطور می‌تونم کمکت کنم؟');
      return;
    }

    // Thank you responses
    if (this.containsAny(lowerText, ['ممنون', 'تشکر', 'thanks', 'thank you'])) {
      await this.bot.sendMessage(chatId, 'خواهش می‌کنم! 😊');
      return;
    }

    // How are you responses
    if (this.containsAny(lowerText, ['چطوری', 'حالت چطوره', 'how are you'])) {
      await this.bot.sendMessage(chatId, 'من خوبم! ممنون که پرسیدی. تو چطوری؟');
      return;
    }

    // Goodbye responses
    if (this.containsAny(lowerText, ['خداحافظ', 'بای', 'bye', 'goodbye'])) {
      await this.bot.sendMessage(chatId, 'خداحافظ! امیدوارم زود ببینمت! 👋');
      return;
    }

    // Default response
    const defaultResponses = [
      'جالب! بیشتر بگو...',
      'میشه بیشتر توضیح بدی؟',
      'من در حال یادگیری هستم!',
      'چیز جالبی گفتی!',
      'میشه این رو بیشتر توضیح بدی؟'
    ];

    const randomResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    await this.bot.sendMessage(chatId, randomResponse);
  }

  containsAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }
}

module.exports = new MessageHandler();
