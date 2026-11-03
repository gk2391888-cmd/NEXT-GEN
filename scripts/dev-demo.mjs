// Starts the dev server in demo mode (dummy logged-in data, no Supabase calls)
// on port 3001, so it doesn't mix browser storage with the normal dev server.
// Usage: npm run dev:demo, then open http://localhost:3001/?demo=trial
// Personas: guest · new · free · trial · pro · admin (see lib/supabase/demo.ts).
import { spawn } from 'node:child_process';

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, NEXT_PUBLIC_DEMO_MODE: '1' },
    });
    child.on('exit', (code) => (code ? reject(new Error(`${cmd} exited with ${code}`)) : resolve()));
  });

await run('node', ['scripts/build-tokens.mjs']);
await run('npx', ['next', 'dev', '-p', '3001']);
