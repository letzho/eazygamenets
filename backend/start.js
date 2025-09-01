#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function setupDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Setting up database...');
    
    const setupProcess = spawn('node', ['setup-database.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    setupProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Database setup completed successfully');
        resolve();
      } else {
        console.log(`Database setup failed with code ${code}`);
        // Don't reject, just log the error and continue
        resolve();
      }
    });

    setupProcess.on('error', (error) => {
      console.error('Database setup error:', error);
      // Don't reject, just log the error and continue
      resolve();
    });
  });
}

async function startServer() {
  console.log('Starting server...');
  
  const serverProcess = spawn('node', ['index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });

  serverProcess.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}

async function main() {
  try {
    // Try to setup database, but don't fail if it doesn't work
    await setupDatabase();
    
    // Start the server
    await startServer();
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

main();
