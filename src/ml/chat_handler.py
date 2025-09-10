#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class ChatHandler:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.load_model()
    
    def load_model(self):
        """Load the ML model for chat responses"""
        try:
            # For now, we'll use a simple rule-based system
            # Later you can replace this with actual ML models
            logger.info("Chat handler initialized with rule-based system")
            logger.info("To use ML models, replace this with actual model loading code")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
    
    def get_response(self, message):
        """Generate response based on input message"""
        try:
            # Simple rule-based responses for now
            # This is where you'll integrate your ML model
            response = self._generate_rule_based_response(message)
            return response
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید."
    
    def _generate_rule_based_response(self, message):
        """Generate response using simple rules (placeholder for ML)"""
        message_lower = message.lower()
        
        # Greeting patterns
        if any(word in message_lower for word in ['سلام', 'salam', 'hi', 'hello']):
            return "سلام! چطور می‌تونم کمکت کنم؟"
        
        # Question patterns
        if 'چی' in message_lower or '؟' in message or '?' in message:
            return "سوال جالبی پرسیدی! می‌تونی بیشتر توضیح بدی؟"
        
        # Thank you patterns
        if any(word in message_lower for word in ['ممنون', 'تشکر', 'thanks']):
            return "خواهش می‌کنم! 😊"
        
        # Default response
        responses = [
            "جالب! بیشتر بگو...",
            "میشه بیشتر توضیح بدی؟",
            "من در حال یادگیری هستم!",
            "چیز جالبی گفتی!",
            "میشه این رو بیشتر توضیح بدی؟"
        ]
        
        import random
        return random.choice(responses)

# Initialize chat handler
chat_handler = ChatHandler()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ml-chat-handler',
        'version': '1.0.0'
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        message = data['message']
        logger.info(f"Received message: {message}")
        
        # Generate response
        response = chat_handler.get_response(message)
        
        logger.info(f"Generated response: {response}")
        
        return jsonify({
            'response': response,
            'timestamp': data.get('timestamp', ''),
            'status': 'success'
        })
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@app.route('/model/status', methods=['GET'])
def model_status():
    """Get model status"""
    return jsonify({
        'model_loaded': chat_handler.model is not None,
        'model_type': 'rule-based',  # Change this when you add ML models
        'status': 'ready'
    })

if __name__ == '__main__':
    port = int(os.getenv('ML_SERVICE_PORT', 5000))
    debug = os.getenv('NODE_ENV', 'development') == 'development'
    
    logger.info(f"Starting ML service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
