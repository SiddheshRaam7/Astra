import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
export function plaidClient() {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET)
    throw new Error('Plaid Sandbox credentials are not configured.');
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
        timeout: 20000,
      },
    }),
  );
}
function encryptionKey() {
  const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? '', 'base64');
  if (key.length !== 32)
    throw new Error('Configure TOKEN_ENCRYPTION_KEY as a base64-encoded random 32-byte key.');
  return key;
}
export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function decryptToken(encoded: string) {
  const data = Buffer.from(encoded, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
}
