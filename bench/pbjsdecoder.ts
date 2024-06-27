/* eslint-disable */
function decode(buffer, start, end) {
  var str = "";
  for (var i = start; i < end; ) {
    var t = buffer[i++];
    if (t <= 0x7f) {
      str += String.fromCharCode(t);
    } else if (t >= 0xc0 && t < 0xe0) {
      str += String.fromCharCode(((t & 0x1f) << 6) | (buffer[i++] & 0x3f));
    } else if (t >= 0xe0 && t < 0xf0) {
      str += String.fromCharCode(
        ((t & 0xf) << 12) | ((buffer[i++] & 0x3f) << 6) | (buffer[i++] & 0x3f),
      );
    } else if (t >= 0xf0) {
      var t2 =
        (((t & 7) << 18) |
          ((buffer[i++] & 0x3f) << 12) |
          ((buffer[i++] & 0x3f) << 6) |
          (buffer[i++] & 0x3f)) -
        0x10000;
      str += String.fromCharCode(0xd800 + (t2 >> 10));
      str += String.fromCharCode(0xdc00 + (t2 & 0x3ff));
    }
  }
  return str;
}

export class PBJSDecoder {
  decode(buffer: Uint8Array) {
    return decode(buffer, 0, buffer.length);
  }
}
