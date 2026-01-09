#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
};

// Format timestamp as yy-mm-dd hh:mm:ss
const getTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const prefixOutput = (prefix, color, data) => {
  const timestamp = getTimestamp();
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.log(`${color}[${prefix}]${colors.reset} ${timestamp} ${line}`);
    }
  });
};

// Spawn processes directly instead of through npm for better signal handling
const backend = spawn('npx', ['tsx', 'watch', 'src/index.ts'], {
  cwd: `${__dirname}/backend`,
  shell: true,
});

const frontend = spawn('node', ['dev-server.js'], {
  cwd: `${__dirname}/frontend`,
  shell: true,
});

// Pipe output with prefixes
backend.stdout.on('data', (data) => prefixOutput('backend', colors.blue, data));
backend.stderr.on('data', (data) => prefixOutput('backend', colors.blue, data));
frontend.stdout.on('data', (data) => prefixOutput('frontend', colors.green, data));
frontend.stderr.on('data', (data) => prefixOutput('frontend', colors.green, data));

let isShuttingDown = false;

let backendExited = false;
let frontendExited = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  const timestamp = getTimestamp();
  console.log(`\n${timestamp} ${signal} received. Shutting down processes...`);
  
  // Send signal to both processes
  backend.kill(signal);
  frontend.kill(signal);
  
  // Wait for graceful shutdown to complete
  // Backend needs time to close Socket.IO and HTTP server (25ms timeouts + process chain)
  // Give enough time for npm -> tsx -> node chain to complete shutdown
  const shutdownDelay = setTimeout(() => {
    const checkExit = () => {
      if (backendExited && frontendExited) {
        // Give a final moment for any output to flush
        setTimeout(() => {
          const timestamp = getTimestamp();
          console.log(`${timestamp} ✅ All processes shut down gracefully`);
          process.exit(0);
        }, 100);
      } else {
        // If not both exited, wait a bit more
        setTimeout(() => {
          if (backendExited && frontendExited) {
            const timestamp = getTimestamp();
            console.log(`${timestamp} ✅ All processes shut down gracefully`);
            process.exit(0);
          } else {
            const timestamp = getTimestamp();
            console.log(`${timestamp} ⚠️ Some processes did not exit cleanly`);
            if (!backendExited) backend.kill('SIGKILL');
            if (!frontendExited) frontend.kill('SIGKILL');
            setTimeout(() => process.exit(0), 100);
          }
        }, 200);
      }
    };
    checkExit();
  }, 500); // Give 500ms for graceful shutdown to complete through process chain
  
  // Force exit after 5 seconds if processes don't exit
  setTimeout(() => {
    clearTimeout(shutdownDelay);
    if (!backendExited || !frontendExited) {
      const timestamp = getTimestamp();
      console.log(`${timestamp} ⚠️ Forcing shutdown after timeout`);
      if (!backendExited) backend.kill('SIGKILL');
      if (!frontendExited) frontend.kill('SIGKILL');
      process.exit(0);
    }
  }, 5000);
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle process exits
backend.on('exit', (code) => {
  backendExited = true;
  if (!isShuttingDown && code !== 0) {
    const timestamp = getTimestamp();
    console.error(`${timestamp} Backend process exited with error`);
    gracefulShutdown('backend-error');
  } else if (isShuttingDown) {
    // Wait for frontend and allow output to flush
    setTimeout(() => {
      if (frontendExited) {
        setTimeout(() => {
          const timestamp = getTimestamp();
          console.log(`${timestamp} ✅ All processes shut down gracefully`);
          process.exit(0);
        }, 100);
      }
    }, 100);
  }
});

frontend.on('exit', (code) => {
  frontendExited = true;
  if (!isShuttingDown && code !== 0) {
    const timestamp = getTimestamp();
    console.error(`${timestamp} Frontend process exited with error`);
    gracefulShutdown('frontend-error');
  } else if (isShuttingDown) {
    // Wait for backend and allow output to flush
    setTimeout(() => {
      if (backendExited) {
        setTimeout(() => {
          const timestamp = getTimestamp();
          console.log(`${timestamp} ✅ All processes shut down gracefully`);
          process.exit(0);
        }, 100);
      }
    }, 100);
  }
});

