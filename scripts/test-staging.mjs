import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// The optional file is local and must never be copied into the repository or test artifacts.
const file = process.argv[2];
const contents = file ? readFileSync(file, 'utf8') : '';
const value = (name) => contents.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi'))?.[1].trim();
const email = process.env.STAGING_ADMIN_EMAIL ?? value('E-mail');
const password = process.env.STAGING_ADMIN_PASSWORD ?? value('Senha');
if (!email || !password)
  throw new Error('Configure staging credentials locally before running the real test.');
const result = spawnSync(
  process.execPath,
  [
    'node_modules/@playwright/test/cli.js',
    'test',
    '--config',
    'e2e/staging-functional.config.ts',
    ...process.argv.slice(3),
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, STAGING_ADMIN_EMAIL: email, STAGING_ADMIN_PASSWORD: password },
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
