import { randomBytes, randomUUID } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectRoot, '.env.local');

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('Run this command directly in your Mac Terminal.');
  process.exit(1);
}

process.stdin.setRawMode(true);
process.stdin.resume();

let input = '';
let clientId = '';
let step = 'clientId';
let finished = false;

process.stdout.write('Paste your Plaid client_id, then press Return (input hidden): ');

function finish(code, message) {
  if (finished) return;
  finished = true;
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdout.write('\n');
  (code ? console.error : console.log)(message);
  process.exitCode = code;
}

function pastedValue(value, label) {
  return value
    .replace(/\x1b\[20[01]~/g, '')
    .trim()
    .replace(new RegExp(`^${label}\\s*=\\s*`, 'i'), '')
    .replace(/^['"]|['"]$/g, '');
}

process.stdin.on('data', (chunk) => {
  if (finished || step === 'checking') return;
  for (const char of chunk.toString('utf8')) {
    if (char === '\u0003') return finish(1, 'Cancelled; nothing was saved.');
    if (char === '\u007f' || char === '\b') {
      input = input.slice(0, -1);
      continue;
    }
    if (char !== '\r' && char !== '\n') {
      input += char;
      continue;
    }
    const label = step === 'clientId' ? 'PLAID_CLIENT_ID' : 'PLAID_SECRET';
    const candidate = pastedValue(input, label);
    input = '';
    // Plaid credentials are opaque. Reject whitespace, control characters and URL-like values;
    // the Sandbox request below is the actual credential check.
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(candidate)) {
      return finish(
        1,
        `That does not look like a Plaid ${step === 'clientId' ? 'client_id' : 'Sandbox secret'}; nothing was saved.`,
      );
    }
    if (step === 'clientId') {
      clientId = candidate;
      step = 'secret';
      process.stdout.write('\nPaste your Plaid Sandbox secret, then press Return (input hidden): ');
      continue;
    }
    step = 'checking';
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\nChecking Plaid Sandbox access...');
    void verifyAndSave(clientId, candidate);
    return;
  }
});

async function verifyAndSave(id, secret) {
  try {
    const response = await fetch('https://sandbox.plaid.com/link/token/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: id,
        secret,
        client_name: 'FORK Sandbox',
        language: 'en',
        country_codes: ['US'],
        user: { client_user_id: `fork-setup-${randomUUID()}` },
        products: ['transactions'],
      }),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    if (!response.ok) {
      const reason =
        response.status === 400 || response.status === 401 || response.status === 403
          ? 'Plaid rejected those Sandbox credentials or Transactions access'
          : `Plaid returned HTTP ${response.status}`;
      return finish(1, `${reason}; nothing was saved.`);
    }
    const body = await response.json();
    if (typeof body.link_token !== 'string' || !body.link_token) {
      return finish(1, 'Plaid did not return a Link token; nothing was saved.');
    }
  } catch {
    return finish(1, 'Could not reach Plaid Sandbox; nothing was saved.');
  }

  const original = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const existingKey = [...original.matchAll(/^TOKEN_ENCRYPTION_KEY=(.*)$/gm)].at(-1)?.[1]?.trim();
  if (existingKey && Buffer.from(existingKey, 'base64').length !== 32) {
    return finish(
      1,
      'Existing TOKEN_ENCRYPTION_KEY is invalid. It was not replaced because that could make saved bank tokens unreadable.',
    );
  }
  const encryptionKey = existingKey || randomBytes(32).toString('base64');
  const kept = original
    .split(/\r?\n/)
    .filter((line) => !/^\s*(PLAID_CLIENT_ID|PLAID_SECRET|TOKEN_ENCRYPTION_KEY)=/.test(line));
  const updated = `${kept.join('\n').replace(/\n*$/, '\n')}PLAID_CLIENT_ID=${id}\nPLAID_SECRET=${secret}\nTOKEN_ENCRYPTION_KEY=${encryptionKey}\n`;
  const tempPath = join(projectRoot, `.env.local.tmp-${randomUUID()}`);
  try {
    writeFileSync(tempPath, updated, { mode: 0o600, flag: 'wx' });
    chmodSync(tempPath, 0o600);
    renameSync(tempPath, envPath);
    return finish(
      0,
      'Plaid Sandbox access verified; credentials and a stable encryption key were saved privately in .env.local. Restart FORK.',
    );
  } catch {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    return finish(1, 'Could not save .env.local; nothing was changed.');
  }
}
