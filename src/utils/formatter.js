const moment = require('moment');
const logger = require('./logger');

// Set moment locale to Persian
moment.locale('fa');

class Formatter {
  /**
   * Format a number with Persian digits and thousand separators
   * @param {number} num - The number to format
   * @returns {string} - Formatted number
   */
  static formatNumber(num) {
    try {
      if (typeof num !== 'number' || isNaN(num)) {
        return '0';
      }

      return num.toLocaleString('fa-IR');
    } catch (error) {
      logger.error('Error formatting number:', error);
      return '0';
    }
  }

  /**
   * Format a date to Persian format
   * @param {Date|string} date - The date to format
   * @param {string} format - The format string (default: 'YYYY/MM/DD HH:mm')
   * @returns {string} - Formatted date
   */
  static formatDate(date, format = 'YYYY/MM/DD HH:mm') {
    try {
      if (!date) {
        return 'نامشخص';
      }

      return moment(date).format(format);
    } catch (error) {
      logger.error('Error formatting date:', error);
      return 'نامشخص';
    }
  }

  /**
   * Format relative time (e.g., "2 ساعت پیش")
   * @param {Date|string} date - The date to format
   * @returns {string} - Formatted relative time
   */
  static formatRelativeTime(date) {
    try {
      if (!date) {
        return 'نامشخص';
      }

      return moment(date).fromNow();
    } catch (error) {
      logger.error('Error formatting relative time:', error);
      return 'نامشخص';
    }
  }

  /**
   * Format user display name
   * @param {Object} user - User object with first_name, last_name, username
   * @returns {string} - Formatted display name
   */
  static formatUserName(user) {
    try {
      if (!user) {
        return 'کاربر ناشناس';
      }

      let name = user.first_name || '';
      if (user.last_name) {
        name += ' ' + user.last_name;
      }

      if (user.username) {
        return `${name.trim()} (@${user.username})`;
      }

      return name.trim() || 'کاربر ناشناس';
    } catch (error) {
      logger.error('Error formatting user name:', error);
      return 'کاربر ناشناس';
    }
  }

  /**
   * Format group display name
   * @param {Object} group - Group object with title, type
   * @returns {string} - Formatted group name
   */
  static formatGroupName(group) {
    try {
      if (!group) {
        return 'گروه ناشناس';
      }

      let name = group.title || 'گروه بدون نام';
      if (group.type) {
        const typeMap = {
          'group': 'گروه',
          'supergroup': 'سوپرگروه',
          'channel': 'کانال'
        };
        const typeName = typeMap[group.type] || group.type;
        name += ` (${typeName})`;
      }

      return name;
    } catch (error) {
      logger.error('Error formatting group name:', error);
      return 'گروه ناشناس';
    }
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted file size
   */
  static formatFileSize(bytes) {
    try {
      if (!bytes || bytes === 0) {
        return '0 بایت';
      }

      const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    } catch (error) {
      logger.error('Error formatting file size:', error);
      return 'نامشخص';
    }
  }

  /**
   * Format duration in human readable format
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted duration
   */
  static formatDuration(seconds) {
    try {
      if (!seconds || seconds === 0) {
        return '0 ثانیه';
      }

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      let result = '';
      if (hours > 0) {
        result += hours + ' ساعت ';
      }
      if (minutes > 0) {
        result += minutes + ' دقیقه ';
      }
      if (secs > 0 || result === '') {
        result += secs + ' ثانیه';
      }

      return result.trim();
    } catch (error) {
      logger.error('Error formatting duration:', error);
      return 'نامشخص';
    }
  }

  /**
   * Format percentage
   * @param {number} value - The value
   * @param {number} total - The total
   * @param {number} decimals - Number of decimal places (default: 1)
   * @returns {string} - Formatted percentage
   */
  static formatPercentage(value, total, decimals = 1) {
    try {
      if (!total || total === 0) {
        return '0%';
      }

      const percentage = (value / total) * 100;
      return percentage.toFixed(decimals) + '%';
    } catch (error) {
      logger.error('Error formatting percentage:', error);
      return '0%';
    }
  }

  /**
   * Format statistics message
   * @param {Object} stats - Statistics object
   * @returns {string} - Formatted statistics message
   */
  static formatStatsMessage(stats) {
    try {
      if (!stats) {
        return '❌ آمار یافت نشد.';
      }

      let message = '📊 <b>آمار</b>\n\n';
      
      if (stats.total_groups) {
        message += `🏢 گروه‌ها: ${this.formatNumber(stats.total_groups)}\n`;
      }
      
      if (stats.total_users) {
        message += `👥 کاربران: ${this.formatNumber(stats.total_users)}\n`;
      }
      
      if (stats.total_messages) {
        message += `💬 پیام‌ها: ${this.formatNumber(stats.total_messages)}\n`;
      }
      
      if (stats.active_groups) {
        message += `🟢 گروه‌های فعال: ${this.formatNumber(stats.active_groups)}\n`;
      }

      return message;
    } catch (error) {
      logger.error('Error formatting stats message:', error);
      return '❌ خطا در فرمت کردن آمار.';
    }
  }

  /**
   * Truncate text to specified length
   * @param {string} text - The text to truncate
   * @param {number} maxLength - Maximum length (default: 100)
   * @param {string} suffix - Suffix to add (default: '...')
   * @returns {string} - Truncated text
   */
  static truncateText(text, maxLength = 100, suffix = '...') {
    try {
      if (!text || typeof text !== 'string') {
        return '';
      }

      if (text.length <= maxLength) {
        return text;
      }

      return text.substring(0, maxLength - suffix.length) + suffix;
    } catch (error) {
      logger.error('Error truncating text:', error);
      return text || '';
    }
  }

  /**
   * Format list items with numbering
   * @param {Array} items - Array of items
   * @param {Function} formatter - Function to format each item
   * @param {number} maxItems - Maximum number of items to show
   * @returns {string} - Formatted list
   */
  static formatList(items, formatter = null, maxItems = 10) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        return 'لیست خالی است.';
      }

      const displayItems = items.slice(0, maxItems);
      let result = '';

      displayItems.forEach((item, index) => {
        const formattedItem = formatter ? formatter(item, index) : String(item);
        result += `${index + 1}. ${formattedItem}\n`;
      });

      if (items.length > maxItems) {
        result += `\n... و ${this.formatNumber(items.length - maxItems)} مورد دیگر`;
      }

      return result.trim();
    } catch (error) {
      logger.error('Error formatting list:', error);
      return 'خطا در فرمت کردن لیست.';
    }
  }
}

module.exports = Formatter;
