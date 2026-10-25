import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectRoot, '.env.local');

function parseAgentId(value) {
  const copied = value.trim().replace(/^ELEVENLABS_AGENT_ID=/, '');
  let agentId = copied;
  if (/^https?:\/\//i.test(copied)) {
    try {
      const url = new URL(copied);
      agentId = url.searchParams.get('agent_id') || url.pathname.split('/').filter(Boolean).at(-1);
    } catch {
      agentId = '';
    }
  }
  return agentId && /^[A-Za-z0-9_-]{15,100}$/.test(agentId) ? agentId : null;
}

const suppliedAgentId = process.argv[2] ? parseAgentId(process.argv[2]) : null;
if (process.argv[2] && !suppliedAgentId) {
  console.error('That does not look like an agent ID.');
  process.exit(1);
}

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('Run this command directly in your Mac Terminal.');
  process.exit(1);
}

process.stdin.setRawMode(true);
process.stdin.resume();

let input = '';
let step = 'key';
let apiKey = '';
let finished = false;

process.stdout.write('Paste your ElevenLabs API key, then press Return (input hidden): ');

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

    if (step === 'key') {
      const candidate = input
        .replace(/\x1b\[20[01]~/g, '') // macOS Terminal may wrap pasted text in bracketed-paste markers.
        .trim()
        .replace(/^ELEVENLABS_API_KEY\s*=\s*/, '')
        .replace(/^['"]|['"]$/g, '');
      if (!/^sk_[A-Za-z0-9_-]{20,300}$/.test(candidate))
        return finish(1, 'That is not the ElevenLabs secret API key (it should begin sk_). Copy the secret shown when creating a key, not its Key ID; nothing was saved.');
      apiKey = candidate;
      process.stdout.write(`\nKey ending ${candidate.slice(-4)} received (only the last four characters shown).`);
      input = '';
      if (suppliedAgentId) {
        beginVerification(suppliedAgentId);
        return;
      }
      step = 'agent';
      process.stdout.write('\nPaste your ElevenLabs agent ID, then press Return (input hidden): ');
      continue;
    }

    const agentId = parseAgentId(input);
    if (!agentId)
      return finish(1, 'That does not look like an agent ID; nothing was saved.');

    beginVerification(agentId);
    return;
  }
});

function beginVerification(agentId) {
  step = 'checking';
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdout.write('\nChecking ElevenLabs access...');
  void verifyAndSave(apiKey, agentId);
}

async function verifyAndSave(key, agentId) {
  try {
    const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/get-signed-url');
    url.searchParams.set('agent_id', agentId);
    const response = await fetch(url, {
      headers: { 'xi-api-key': key },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        const error = body?.detail ?? body;
        const message = typeof error === 'string' ? error : error?.message;
        if (typeof message === 'string') {
          detail = message
            .replaceAll(key, '[redacted]')
            .replace(/sk_[A-Za-z0-9_-]+/g, '[redacted]')
            .replace(/[\r\n\t]/g, ' ')
            .slice(0, 240);
        }
      } catch { /* Some ElevenLabs errors have no JSON body. */ }
      const reason =
        response.status === 401
          ? 'ElevenLabs returned 401 (the key is invalid or not authorized for signed voice sessions)'
          : response.status === 403
            ? 'ElevenLabs returned 403 (check the key permissions and IP restrictions)'
          : response.status === 404 || response.status === 422
            ? 'ElevenLabs could not use that agent ID'
            : `ElevenLabs returned HTTP ${response.status}`;
      return finish(1, `${reason}${detail ? `: ${detail}` : ''}; nothing was saved.`);
    }
    const body = await response.json();
    if (typeof body.signed_url !== 'string' || !body.signed_url.startsWith('wss://'))
      return finish(1, 'ElevenLabs did not provide a valid signed URL; nothing was saved.');
  } catch {
    return finish(1, 'Could not reach ElevenLabs; nothing was saved.');
  }

  const original = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const kept = original
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('ELEVENLABS_API_KEY=') && !line.startsWith('ELEVENLABS_AGENT_ID='));
  const updated = `${kept.join('\n').replace(/\n*$/, '\n')}ELEVENLABS_API_KEY=${key}\nELEVENLABS_AGENT_ID=${agentId}\n`;
  const tempPath = join(projectRoot, `.env.local.tmp-${randomUUID()}`);
  try {
    writeFileSync(tempPath, updated, { mode: 0o600, flag: 'wx' });
    chmodSync(tempPath, 0o600);
    renameSync(tempPath, envPath);
    return finish(0, 'ElevenLabs access verified and saved privately in .env.local.');
  } catch {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    return finish(1, 'Could not save .env.local; nothing was changed.');
  }
}
