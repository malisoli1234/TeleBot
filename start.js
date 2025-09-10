const { spawn } = require('child_process');

console.log('Starting Telegram Bot...');

// Start the main server
const server = spawn('node', ['src/server.js'], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  if (code !== 0) {
    process.exit(1);
  }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});
