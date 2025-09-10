const { bot } = require('./src/server');

// Test function to check if bot is working
async function testBot() {
  try {
    console.log('🤖 Testing Telegram Bot...');
    
    // Get bot info
    const botInfo = await bot.getMe();
    console.log('✅ Bot connected successfully!');
    console.log(`Bot name: ${botInfo.first_name}`);
    console.log(`Bot username: @${botInfo.username}`);
    console.log(`Bot ID: ${botInfo.id}`);
    
    // Test database connection
    const dbConnection = require('./src/database/connection');
    if (dbConnection.getConnectionStatus()) {
      console.log('✅ Database connected successfully!');
    } else {
      console.log('❌ Database connection failed!');
    }
    
    console.log('\n🎉 Bot is ready to use!');
    console.log('📋 Available commands:');
    console.log('  - /start');
    console.log('  - /help');
    console.log('  - /info');
    console.log('  - اخراج (reply)');
    console.log('  - بن (reply)');
    console.log('  - میوت (reply)');
    console.log('  - آمار (reply)');
    console.log('  - آمار_کلی');
    console.log('  - گروه');
    console.log('  - اعضا');
    console.log('  - مدیران');
    
  } catch (error) {
    console.error('❌ Error testing bot:', error.message);
    process.exit(1);
  }
}

// Run test
testBot();
