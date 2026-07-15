const crypto = require('crypto');

const PUBLIC_TICKET_BYTES = 32;

function normalizeRecordKeyPart(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildRecordKey({ name, athleteName, affiliation, competition, event } = {}) {
  const parts = [name || athleteName, affiliation, competition, event].map(normalizeRecordKeyPart);
  if (!parts[0] || !parts[2] || !parts[3]) return '';
  return `rk_${crypto.createHash('sha256').update(parts.join('|'), 'utf8').digest('hex')}`;
}

function createPublicTicket() {
  return `DR_${crypto.randomBytes(PUBLIC_TICKET_BYTES).toString('base64url')}`;
}

function hashPublicTicket(ticket) {
  return crypto.createHash('sha256').update(String(ticket || ''), 'utf8').digest('hex');
}

function hashLegacyTicket(ticket) {
  const pepper = process.env.DATA_RIGHTS_LEGACY_TICKET_PEPPER;
  if (!pepper || pepper.length < 32) {
    const error = new Error('legacy ticket lookup is not configured');
    error.code = 'LEGACY_TICKET_LOOKUP_UNAVAILABLE';
    throw error;
  }
  return crypto.createHmac('sha256', pepper).update(String(ticket || ''), 'utf8').digest('hex');
}

function ticketHint(ticket) {
  const value = String(ticket || '');
  return value.slice(-8);
}

function loadEncryptionKey() {
  const encoded = process.env.DATA_RIGHTS_ENCRYPTION_KEY;
  if (!encoded) return null;

  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) {
    throw new Error('DATA_RIGHTS_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return key;
}

function encryptContact(value) {
  const plaintext = String(value || '');
  if (!plaintext) return null;

  const key = loadEncryptionKey();
  if (!key) {
    const error = new Error('contact encryption is not configured');
    error.code = 'CONTACT_ENCRYPTION_UNAVAILABLE';
    throw error;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext,
    iv,
    tag: cipher.getAuthTag(),
    keyVersion: process.env.DATA_RIGHTS_KEY_VERSION || 'v1',
  };
}

function decryptContact(encrypted) {
  if (!encrypted || !encrypted.ciphertext) return '';
  const key = loadEncryptionKey();
  if (!key) return '';

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, encrypted.iv);
  decipher.setAuthTag(encrypted.tag);
  return Buffer.concat([
    decipher.update(encrypted.ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  buildRecordKey,
  createPublicTicket,
  decryptContact,
  encryptContact,
  hashLegacyTicket,
  hashPublicTicket,
  ticketHint,
};
