function TextEncoderLite() {}
function TextDecoderLite() {}

(function () {
'use strict';

// Taken from https://github.com/feross/buffer/blob/master/index.js
// Thanks Feross et al! :-)

function utf8ToBytes (string, units) {
  units = units || Number.POSITIVE_INFINITY
  let codePoint
  const length = string.length
  let leadSurrogate = null
  const bytes = []
  let i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7_FF && codePoint < 0xE0_00) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC_00) {
          if ((units -= 3) > -1) { bytes.push(0xEF, 0xBF, 0xBD) }
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD8_00 << 10 | codePoint - 0xDC_00 | 0x1_00_00
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDB_FF) {
          // unexpected trail
          if ((units -= 3) > -1) { bytes.push(0xEF, 0xBF, 0xBD) }
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) { bytes.push(0xEF, 0xBF, 0xBD) }
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) { bytes.push(0xEF, 0xBF, 0xBD) }
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) { break }
      bytes.push(codePoint)
    } else if (codePoint < 0x8_00) {
      if ((units -= 2) < 0) { break }
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x1_00_00) {
      if ((units -= 3) < 0) { break }
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x20_00_00) {
      if ((units -= 4) < 0) { break }
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function utf8Slice (buf, start, end) {
  let res = ''
  let tmp = ''
  end = Math.min(buf.length, end || Number.POSITIVE_INFINITY)
  start = start || 0;

  for (let i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch {
    return String.fromCharCode(0xFF_FD) // UTF 8 invalid char
  }
}

TextEncoderLite.prototype.encode = function (str) {
  let result;

  result = typeof Uint8Array === 'undefined' ? utf8ToBytes(str) : new Uint8Array(utf8ToBytes(str));

  return result;
};

TextDecoderLite.prototype.decode = function (bytes) {
  return utf8Slice(bytes, 0, bytes.length);
}
}());
module.exports = TextDecoderLite;