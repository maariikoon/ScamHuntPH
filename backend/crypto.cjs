const crypto = require('crypto');
const key = Buffer.from(process.env.AES256_KEY_BASE64 || '', 'base64');
if (key.length && key.length !== 32) throw new Error('AES256_KEY_BASE64 must be 32 bytes in base64');

function encryptField(plain) {
  if (!key.length) return { v: 0, ct: String(plain) }; // crypto disabled
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { v: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), ct: enc.toString('base64') };
}

module.exports = { encryptField };
