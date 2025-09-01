// Root index.js - redirects to backend
const path = require('path');
const { spawn } = require('child_process');

console.log('Starting backend server...');

// Start the backend server
const backendProcess = spawn('node', ['index.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

backendProcess.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  process.exit(code);
});

backendProcess.on('error', (error) => {
  console.error('Backend error:', error);
  process.exit(1);
});
