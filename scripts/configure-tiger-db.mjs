import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectRoot, '.env.local');
const expectedHost = 'y7im2t5jfl.bxypy4ar9y.tsdb.cloud.timescale.com';

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('Run this command directly in your Mac Terminal.');
  process.exit(1);
}

process.stdout.write('Paste your NEW Tiger password, then press Return (input hidden): ');
process.stdin.setRawMode(true);
process.stdin.resume();

let input = '';
let finished = false;
let submitted = false;

function finish(code, message) {
  if (finished) return;
  finished = true;
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdout.write('\n');
  if (message) (code ? console.error : console.log)(message);
  process.exitCode = code;
}

process.stdin.on('data', (chunk) => {
  if (finished || submitted) return;
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

    const copied = input.trim();
    if (!copied) return finish(1, 'No password was pasted; nothing was saved.');

    let databaseUrl;
    if (/^postgres(?:ql)?:\/\//i.test(copied)) {
      try {
        const parsed = new URL(copied);
        if (parsed.hostname !== expectedHost || parsed.username !== 'tsdbadmin' || !parsed.password) {
          return finish(1, 'That connection string is not for the expected Tiger service. Nothing was saved.');
        }
        parsed.searchParams.set('sslmode', 'require');
        databaseUrl = parsed.toString();
      } catch {
        return finish(1, 'That connection string is invalid. Nothing was saved.');
      }
    } else {
      databaseUrl = `postgres://tsdbadmin:${encodeURIComponent(copied)}@${expectedHost}:35504/tsdb?sslmode=require`;
    }

    submitted = true;
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\nChecking Tiger connection...');
    void verifyAndSave(databaseUrl);
    return;
  }
});

async function verifyAndSave(databaseUrl) {
  const url = new URL(databaseUrl);
  const sql = postgres({
    host: url.hostname,
    port: Number(url.port),
    database: url.pathname.slice(1),
    username: url.username,
    password: decodeURIComponent(url.password),
    ssl: 'require',
    max: 1,
    connect_timeout: 10,
  });

  try {
    await sql.unsafe('select 1 as ok');
  } catch (error) {
    const reason = error.code === '28P01' ? 'Tiger rejected that password' : `Tiger connection failed (${error.code || error.name})`;
    return finish(1, `${reason}; .env.local was not changed.`);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }

  const original = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const kept = original.split(/\r?\n/).filter((line) => line && !line.startsWith('DATABASE_URL='));
  const updated = `${kept.join('\n')}\nDATABASE_URL=${databaseUrl}\n`;
  const tempPath = join(projectRoot, `.env.local.tmp-${randomUUID()}`);
  try {
    writeFileSync(tempPath, updated, { mode: 0o600, flag: 'wx' });
    chmodSync(tempPath, 0o600);
    renameSync(tempPath, envPath);
    finish(0, 'Tiger connection verified and DATABASE_URL saved in .env.local.');
  } catch {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    finish(1, 'Could not save .env.local; nothing was changed.');
  }
}
