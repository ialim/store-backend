#!/usr/bin/env node
const { spawn } = require('child_process');

const child = spawn('npx', ['prisma', 'migrate', 'reset', '--force', '--skip-generate', '--skip-seed'], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('Database reset complete.');
  } else {
    console.error(`Database reset failed with exit code ${code}.`);
  }
  process.exit(code ?? 0);
});
