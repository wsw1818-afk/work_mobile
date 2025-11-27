#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔑 Uploading Keystore to Expo...\n');

// Check if keystore exists
if (!fs.existsSync('gagyebu.keystore')) {
  console.error('❌ gagyebu.keystore not found!');
  process.exit(1);
}

const upload = spawn('npx', [
  'eas-cli',
  'credentials',
  '--platform', 'android'
], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

let step = 0;

upload.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // Auto-respond to prompts
  if (output.includes('Which build profile')) {
    console.log('\n>>> Sending: production');
    upload.stdin.write('production\n');
    step = 1;
  } else if (output.includes('What do you want to do')) {
    console.log('\n>>> Sending: 1 (Set up credentials)');
    upload.stdin.write('1\n');
    step = 2;
  } else if (output.includes('Keystore') || output.includes('keystore')) {
    console.log('\n>>> Sending: gagyebu.keystore');
    upload.stdin.write('gagyebu.keystore\n');
  } else if (output.includes('password') || output.includes('Password')) {
    console.log('\n>>> Sending: android');
    upload.stdin.write('android\n');
  } else if (output.includes('alias') || output.includes('Alias')) {
    console.log('\n>>> Sending: gagyebu');
    upload.stdin.write('gagyebu\n');
  } else if (output.match(/\? .+/)) {
    console.log('\n>>> Auto-response: y');
    upload.stdin.write('y\n');
  }
});

upload.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

upload.on('close', (code) => {
  console.log(`\n${code === 0 ? '✅ Success!' : '❌ Failed'} (code ${code})`);
  process.exit(code);
});

setTimeout(() => {
  console.log('\n⏱️ Timeout');
  upload.kill();
  process.exit(1);
}, 120000);
