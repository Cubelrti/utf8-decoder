const defaultCharUnicode = '\uFFFD';

// new parser, inspired by iconv-lite and ChatGPT
// advantage: handle malformed utf-8 better
// and will never throw error
export function Utf8ArrayToString2(buf: Uint8Array) {
  const resParts = [];
  const fromCharCode = String.fromCharCode
  const fromCodePoint = String.fromCodePoint
  let byte1, byte2, byte3, byte4
  for (let i = 0; i < buf.length; i++) {
    byte1 = buf[i];
    if (byte1 < 0x80) { // 1-byte sequence
      resParts.push(fromCharCode(byte1));
    } else if ((byte1 & 0xE0) === 0xC0) { // 2-byte sequence
      byte2 = buf[++i];
      if ((byte2 & 0xC0) !== 0x80) {
        resParts.push(defaultCharUnicode);
        continue;
      }
      resParts.push(fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F)));
    } else if ((byte1 & 0xF0) === 0xE0) { // 3-byte sequence
      byte2 = buf[++i], byte3 = buf[++i];
      if ((byte2 & 0xC0) !== 0x80 || (byte3 & 0xC0) !== 0x80) {
        resParts.push(defaultCharUnicode);
        continue;
      }
      resParts.push(fromCharCode(((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F)));
    } else if ((byte1 & 0xF8) === 0xF0) { // 4-byte sequence
      byte2 = buf[++i], byte3 = buf[++i], byte4 = buf[++i];
      if ((byte2 & 0xC0) !== 0x80 || (byte3 & 0xC0) !== 0x80 || (byte4 & 0xC0) !== 0x80) {
        resParts.push(defaultCharUnicode);
        continue;
      }
      const codepoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
      fromCodePoint ? resParts.push(fromCodePoint(codepoint)) : resParts.push(defaultCharUnicode);
    } else {
      resParts.push(defaultCharUnicode);
    }
  }
  return resParts.join('');
}