/* eslint-disable */
const utf8d = new Uint8Array([
  // This first table maps bytes to character to a transition.
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 00-0F
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 10-1F
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 20-2F
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 30-3F
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 40-4F
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 50-5F
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 60-6F
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 70-7F
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 80-8F
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2, // 90-9F
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3, // A0-AF
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3, // B0-BF
  9,
  9,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4, // C0-CF
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4, // D0-DF
  10,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  6,
  5,
  5, // E0-EF
  11,
  7,
  7,
  7,
  8,
  9,
  9,
  9,
  9,
  9,
  9,
  9,
  9,
  9,
  9,
  9, // F0-FF
  // This second table maps a state to a new state when adding a transition
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // REJECT = 0
  12,
  0,
  0,
  0,
  24,
  36,
  48,
  60,
  72,
  0,
  84,
  96, // ACCEPT = 12
  0,
  12,
  12,
  12,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 2-byte = 24
  0,
  24,
  24,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 3-byte = 36
  0,
  24,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 3-byte low/mid = 48
  0,
  36,
  36,
  36,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 4-byte = 60
  0,
  36,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 4-byte low = 72
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 3-byte high = 84
  0,
  0,
  36,
  36,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 4-byte mid/high = 96
]);
const cache = Array.from({ length: 0xff_ff }, (_, i) => String.fromCharCode(i));
function decode(buffer, start, end) {
  if (end - start < 1) {
    return "";
  }

  var res = ""; // final string

  var i = start;
  var state = 12;
  var current = 0;
  var type = 0;
  var prevState = state;
  var bite = 0;
  for (let i = 0; i < end; i += 4) {
    // chunk
    var b0 = buffer[i],
      b1 = buffer[i + 1],
      b2 = buffer[i + 2],
      b3 = buffer[i + 3];
  }
  while (i < end) {
    bite = buffer[i];
    type = utf8d[bite];
    prevState = state;
    // transition and code point calculation, basically bjoern's algorithm
    state = utf8d[256 + state + type];
    current = (current << 6) | (bite & (0x7f >> (type >> 1)));
    // string generation, using string concat for performance
    if (state === 12) {
      if (current <= 0xff_ff) {
        res += cache[current];
      } else {
        res += String.fromCharCode(
          0xd8_00 + (((current - 0x1_00_00) >>> 10) & 0x3_ff),
          0xdc_00 + (current & 0x3_ff),
        );
      }
      current = 0;
    } else {
      state = 12;
      res += cache[0xfffd];
      current = 0;
      if (prevState !== 12) {
        continue;
      }
    }
    i++;
  }
  return res;
}

export class V1Decoder {
  decode(buffer: Uint8Array) {
    return decode(buffer, 0, buffer.length);
  }
}
