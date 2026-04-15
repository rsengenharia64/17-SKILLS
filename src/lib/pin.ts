/**
 * PIN hashing — não é criptografia de produção, é proteção operacional.
 * Usa WebCrypto (SHA-256) com um salt estático local + salt por usuário.
 *
 * IMPORTANTE: a base é local (IndexedDB) no dispositivo do usuário. A proteção
 * por PIN visa impedir acesso casual entre líderes compartilhando o mesmo
 * tablet — não substitui autenticação server-side.
 */

const APP_SALT = 'cbsi-produtividade-v1';

export async function hashPin(pin: string, userSalt: string): Promise<string> {
  const input = `${APP_SALT}::${userSalt}::${pin}`;
  const data = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return bufToHex(hashBuf);
}

export async function verifyPin(
  pin: string,
  userSalt: string,
  storedHash: string,
): Promise<boolean> {
  const computed = await hashPin(pin, userSalt);
  // Comparação em tempo constante, simples
  if (computed.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export function generateTempPin(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return String(n);
}
