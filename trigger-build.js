#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting EAS Build for Android Production...\n');

const easBuild = spawn('npx', ['eas-cli', 'build', '--platform', 'android', '--profile', 'production'], {
  cwd: __dirname,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

// Automatically answer prompts
easBuild.stdin.setDefaultEncoding('utf-8');

let promptCount = 0;

// Send 'y' for any prompts after a delay
setTimeout(() => {
  console.log('Sending auto-confirmation...');
  easBuild.stdin.write('y\n');
}, 5000);

setTimeout(() => {
  easBuild.stdin.write('y\n');
}, 15000);

setTimeout(() => {
  easBuild.stdin.write('y\n');
}, 25000);

setTimeout(() => {
  easBuild.stdin.write('1\n'); // Select option 1 if needed
}, 35000);

easBuild.on('close', (code) => {
  console.log(`\nBuild process exited with code ${code}`);
  process.exit(code);
});

easBuild.on('error', (err) => {
  console.error('Failed to start build:', err);
  process.exit(1);
});
