const logger = require('./logger');

class IDExtractor {
  /**
   * Extract user ID from @GetChatID_IL_BOT response
   * @param {string} text - The text message from @GetChatID_IL_BOT
   * @returns {string|null} - The extracted user ID or null if not found
   */
  static extractUserID(text) {
    try {
      // Common patterns for @GetChatID_IL_BOT responses
      const patterns = [
        /User ID: (\d+)/i,
        /User ID is: (\d+)/i,
        /ID: (\d+)/i,
        /User: (\d+)/i,
        /(\d{8,})/g, // Any number with 8+ digits (typical Telegram user ID length)
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1];
        }
      }

      // If no pattern matches, try to find any number in the text
      const numbers = text.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        // Return the longest number (most likely to be a user ID)
        return numbers.reduce((a, b) => a.length > b.length ? a : b);
      }

      return null;
    } catch (error) {
      logger.error('Error extracting user ID:', error);
      return null;
    }
  }

  /**
   * Extract chat ID from @GetChatID_IL_BOT response
   * @param {string} text - The text message from @GetChatID_IL_BOT
   * @returns {string|null} - The extracted chat ID or null if not found
   */
  static extractChatID(text) {
    try {
      // Common patterns for chat ID extraction
      const patterns = [
        /Chat ID: (-?\d+)/i,
        /Chat ID is: (-?\d+)/i,
        /Group ID: (-?\d+)/i,
        /Group ID is: (-?\d+)/i,
        /Channel ID: (-?\d+)/i,
        /Channel ID is: (-?\d+)/i,
        /(-?\d{8,})/g, // Any number with 8+ digits (including negative for groups)
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      logger.error('Error extracting chat ID:', error);
      return null;
    }
  }

  /**
   * Check if the message is from @GetChatID_IL_BOT
   * @param {Object} msg - Telegram message object
   * @returns {boolean} - True if message is from @GetChatID_IL_BOT
   */
  static isFromGetChatIDBot(msg) {
    try {
      if (!msg.from || !msg.from.username) {
        return false;
      }

      const botUsernames = [
        'GetChatID_IL_Bot',
        'getchatid_il_bot',
        'getchatidbot',
        'getchatid_bot'
      ];

      return botUsernames.includes(msg.from.username);
    } catch (error) {
      logger.error('Error checking if message is from GetChatID bot:', error);
      return false;
    }
  }

  /**
   * Process message from @GetChatID_IL_BOT and extract IDs
   * @param {Object} msg - Telegram message object
   * @returns {Object|null} - Object with userID and chatID or null
   */
  static processGetChatIDMessage(msg) {
    try {
      if (!this.isFromGetChatIDBot(msg)) {
        return null;
      }

      const text = msg.text || '';
      const userID = this.extractUserID(text);
      const chatID = this.extractChatID(text);

      if (userID || chatID) {
        return {
          userID: userID,
          chatID: chatID,
          originalText: text,
          messageId: msg.message_id,
          date: msg.date
        };
      }

      return null;
    } catch (error) {
      logger.error('Error processing GetChatID message:', error);
      return null;
    }
  }

  /**
   * Validate if a string is a valid Telegram user ID
   * @param {string} id - The ID to validate
   * @returns {boolean} - True if valid user ID
   */
  static isValidUserID(id) {
    try {
      if (!id || typeof id !== 'string') {
        return false;
      }

      // Telegram user IDs are typically 8-10 digits
      const numId = parseInt(id);
      return !isNaN(numId) && numId > 0 && id.length >= 8 && id.length <= 10;
    } catch (error) {
      logger.error('Error validating user ID:', error);
      return false;
    }
  }

  /**
   * Validate if a string is a valid Telegram chat ID
   * @param {string} id - The ID to validate
   * @returns {boolean} - True if valid chat ID
   */
  static isValidChatID(id) {
    try {
      if (!id || typeof id !== 'string') {
        return false;
      }

      // Telegram chat IDs can be positive (private) or negative (groups)
      const numId = parseInt(id);
      return !isNaN(numId) && id.length >= 8 && id.length <= 12;
    } catch (error) {
      logger.error('Error validating chat ID:', error);
      return false;
    }
  }
}

module.exports = IDExtractor;
