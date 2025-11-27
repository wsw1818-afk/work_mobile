#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🚀 Starting EAS Build with auto-response...\n');

const easBuild = spawn('npx', ['eas-cli', 'build', '--platform', 'android', '--profile', 'production'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

const rl = readline.createInterface({
  input: easBuild.stdout,
  terminal: false
});

easBuild.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // Detect prompts and auto-respond
  if (output.includes('Generate a new Android Keystore')) {
    console.log('\n>>> Auto-responding: y (Generate Keystore)');
    easBuild.stdin.write('y\n');
  } else if (output.includes('What would you like to do')) {
    console.log('\n>>> Auto-responding: 1 (Select option 1)');
    easBuild.stdin.write('1\n');
  } else if (output.includes('Would you like')) {
    console.log('\n>>> Auto-responding: y');
    easBuild.stdin.write('y\n');
  } else if (output.includes('? ')) {
    // Generic prompt detection
    console.log('\n>>> Auto-responding: y (Generic prompt)');
    easBuild.stdin.write('y\n');
  }
});

easBuild.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

easBuild.on('close', (code) => {
  console.log(`\n✅ Build process completed with code ${code}`);
  process.exit(code);
});

easBuild.on('error', (err) => {
  console.error('❌ Failed to start build:', err);
  process.exit(1);
});

// Timeout safety
setTimeout(() => {
  console.log('\n⏱️ Timeout reached, ending process');
  easBuild.kill();
  process.exit(1);
}, 600000); // 10 minutes
