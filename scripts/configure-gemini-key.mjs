import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectRoot, '.env.local');

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('Run this command directly in your Mac Terminal.');
  process.exit(1);
}

process.stdout.write('Paste your Gemini API key, then press Return (input hidden): ');
process.stdin.setRawMode(true);
process.stdin.resume();

let input = '';
let finished = false;

function finish(code, message) {
  if (finished) return;
  finished = true;
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdout.write('\n');
  (code ? console.error : console.log)(message);
  process.exitCode = code;
}

process.stdin.on('data', (chunk) => {
  if (finished) return;
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

    const key = input.trim().replace(/^GEMINI_API_KEY=/, '');
    if (!/^[A-Za-z0-9._-]{20,}$/.test(key))
      return finish(1, 'That does not look like a Gemini API key; nothing was saved.');

    const original = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
    const kept = original.split(/\r?\n/).filter((line) => !line.startsWith('GEMINI_API_KEY='));
    const updated = `${kept.join('\n').replace(/\n*$/, '\n')}GEMINI_API_KEY=${key}\n`;
    const tempPath = join(projectRoot, `.env.local.tmp-${randomUUID()}`);
    try {
      writeFileSync(tempPath, updated, { mode: 0o600, flag: 'wx' });
      chmodSync(tempPath, 0o600);
      renameSync(tempPath, envPath);
      return finish(0, 'Gemini key saved privately in .env.local.');
    } catch {
      if (existsSync(tempPath)) unlinkSync(tempPath);
      return finish(1, 'Could not save .env.local; nothing was changed.');
    }
  }
});
