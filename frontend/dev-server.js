#!/usr/bin/env node

import { spawn } from 'child_process';

const vite = spawn('vite', process.argv.slice(2), {
  stdio: 'inherit',
  shell: true,
});

let isShuttingDown = false;
let exitTimeout = null;

// Handle shutdown signals gracefully
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n${signal} received. Shutting down Vite...`);
  
  // Remove the normal exit handler to prevent it from running
  vite.removeAllListeners('exit');
  
  // Set up graceful exit handler
  vite.once('exit', () => {
    if (exitTimeout) clearTimeout(exitTimeout);
    console.log('Vite shutdown complete');
    process.exit(0);
  });
  
  vite.kill(signal);
  
  // Force exit after 5 seconds if Vite doesn't exit
  exitTimeout = setTimeout(() => {
    console.log('Vite shutdown timeout, forcing exit...');
    process.exit(0);
  }, 5000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle normal Vite exit (not from signal)
vite.on('exit', (code) => {
  if (!isShuttingDown) {
    process.exit(code || 0);
  }
});

