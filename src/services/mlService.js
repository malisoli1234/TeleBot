const axios = require('axios');
const logger = require('../utils/logger');

class MLService {
  constructor() {
    this.enabled = process.env.ML_SERVICE_ENABLED === 'true';
    this.serviceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    this.timeout = 10000; // 10 seconds timeout
  }

  isEnabled() {
    return this.enabled;
  }

  async getResponse(message) {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await axios.post(`${this.serviceUrl}/chat`, {
        message: message,
        timestamp: new Date().toISOString()
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.response) {
        logger.info('ML service response received');
        return response.data.response;
      }

      return null;
    } catch (error) {
      logger.error('ML service request failed:', error.message);
      throw error;
    }
  }

  async checkHealth() {
    if (!this.enabled) {
      return { status: 'disabled' };
    }

    try {
      const response = await axios.get(`${this.serviceUrl}/health`, {
        timeout: 5000
      });
      
      return {
        status: 'healthy',
        data: response.data
      };
    } catch (error) {
      logger.error('ML service health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  enable() {
    this.enabled = true;
    logger.info('ML service enabled');
  }

  disable() {
    this.enabled = false;
    logger.info('ML service disabled');
  }
}

module.exports = new MLService();
