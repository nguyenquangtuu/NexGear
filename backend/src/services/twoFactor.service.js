const crypto = require('crypto');

/**
 * Basic Base32 encoder/decoder and TOTP implementation
 * to avoid external dependencies like otplib/speakeasy if installation fails.
 */

function base32Decode(str) {
  str = str.toUpperCase().replace(/\s/g, '').replace(/=+$/, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const out = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < str.length; i++) {
    const val = alphabet.indexOf(str[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xFF);
      bits -= 8;
      value &= (1 << bits) - 1;
    }
  }
  return Buffer.from(out);
}

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let output = '';
  let value = 0;
  let bits = 0;
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  while (output.length % 8 !== 0) output += '=';
  return output;
}

function generateSecret(length = 20) {
  return base32Encode(crypto.randomBytes(length));
}

function generateTOTP(secret, timeStep = 30) {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counterVal = Math.floor(epoch / timeStep);
  
  const counter = Buffer.alloc(8);
  // Manual big-endian 8-byte write to ensure compatibility
  let tmp = counterVal;
  for (let i = 7; i >= 0; i--) {
    counter[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, '0');
}

function verifyTOTP(token, secret, window = 2, timeStep = 30) {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(epoch / timeStep);

  for (let i = -window; i <= window; i++) {
    const step = currentStep + i;
    const counter = Buffer.alloc(8);
    let tmp = step;
    for (let j = 7; j >= 0; j--) {
      counter[j] = tmp & 0xff;
      tmp = Math.floor(tmp / 256);
    }

    const hmac = crypto.createHmac('sha1', key).update(counter).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24) |
                   ((hmac[offset + 1] & 0xff) << 16) |
                   ((hmac[offset + 2] & 0xff) << 8) |
                   (hmac[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    if (otp === token) return true;
  }
  return false;
}

module.exports = {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  base32Encode,
  base32Decode,
  getOtpauthUrl: (label, secret, issuer = 'Vextro') => {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret.replace(/=/g, '')}&issuer=${encodeURIComponent(issuer)}`;
  }
};
