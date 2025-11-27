#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🚀 Starting EAS Build (Preview Profile)...\n');

const easBuild = spawn('npx', ['eas-cli', 'build', '--platform', 'android', '--profile', 'preview', '--no-wait'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

easBuild.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  if (output.includes('Generate a new Android Keystore')) {
    console.log('\n>>> Sending: y');
    easBuild.stdin.write('y\n');
  } else if (output.toLowerCase().includes('would you like')) {
    console.log('\n>>> Sending: y');
    easBuild.stdin.write('y\n');
  } else if (output.match(/\? .+/)) {
    console.log('\n>>> Detected prompt, sending: y');
    easBuild.stdin.write('y\n');
  }
});

easBuild.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

easBuild.on('close', (code) => {
  console.log(`\n${ code === 0 ? '✅ Success' : '❌ Failed'} (code ${code})`);
  process.exit(code);
});

setTimeout(() => {
  console.log('\n⏱️ Timeout');
  easBuild.kill();
}, 300000);
