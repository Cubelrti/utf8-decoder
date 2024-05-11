// prefer-spread is disabled because it is not supported in IE11
/* eslint-disable prefer-spread */

// prettier is disabled because it messes up the table
/* prettier-ignore */

// See http://bjoern.hoehrmann.de/utf-8/decoder/dfa/ for details.
// The remapped transition table is justified at
// https://docs.google.com/spreadsheets/d/1AZcQwuEL93HmNCljJWUwFMGqf7JAQ0puawZaUgP0E14

// This first table maps bytes to character to a transition.
const transitions = [
    0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 00-0F
    0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 10-1F
    0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 20-2F
    0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 30-3F
    0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 40-4F
    0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 50-5F
    0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 60-6F
    0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // 70-7F
    1,  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // 80-8F
    2,  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,  // 90-9F
    3,  3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,  // A0-AF
    3,  3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,  // B0-BF
    9,  9, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,  // C0-CF
    4,  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,  // D0-DF
    10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 5, 5,  // E0-EF
    11, 7, 7, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,  // F0-FF
];
// This second table maps a state to a new state when adding a transition.
//  00-7F
//  |   80-8F
//  |   |   90-9F
//  |   |   |   A0-BF
//  |   |   |   |   C2-DF
//  |   |   |   |   |   E1-EC, EE, EF
//  |   |   |   |   |   |   ED
//  |   |   |   |   |   |   |   F1-F3
//  |   |   |   |   |   |   |   |   F4
//  |   |   |   |   |   |   |   |   |   C0, C1, F5-FF
//  |   |   |   |   |   |   |   |   |   |  E0
//  |   |   |   |   |   |   |   |   |   |  |   F0
const states = [
    0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 0,  0,   // REJECT = 0
    12, 0,  0,  0,  24, 36, 48, 60, 72, 0, 84, 96,  // ACCEPT = 12
    0,  12, 12, 12, 0,  0,  0,  0,  0,  0, 0,  0,   // 2-byte = 24
    0,  24, 24, 24, 0,  0,  0,  0,  0,  0, 0,  0,   // 3-byte = 36
    0,  24, 24, 0,  0,  0,  0,  0,  0,  0, 0,  0,   // 3-byte low/mid = 48
    0,  36, 36, 36, 0,  0,  0,  0,  0,  0, 0,  0,   // 4-byte = 60
    0,  36, 0,  0,  0,  0,  0,  0,  0,  0, 0,  0,   // 4-byte low = 72
    0,  0,  0,  24, 0,  0,  0,  0,  0,  0, 0,  0,   // 3-byte high = 84
    0,  0,  36, 36, 0,  0,  0,  0,  0,  0, 0,  0,   // 4-byte mid/high = 96
];

function utf8Slice(buf: Uint8Array, start: number, end: number) {
  end = Math.min(buf.length, end);
  const res = [];

  let i = start;
  let state = 12;
  let current = 0;
  function __decode(byte: number) {
    const type = transitions[byte];
    state = states[state + type];
    current = (current << 6) | (byte & (0x7f >> (type >> 1)));
  }
  while (i < end) {
    if (buf[i] < 0x7f && state === 12) {
      res.push(buf[i]);
      i++;
      continue;
    }
    const previousState = state;
    __decode(buf[i]);
    if (state < 12) {
      state = 12;
      res.push(0xff_fd);
      current = 0;
      if (previousState !== 12) {
        continue;
      }
    } else if (state === 12) {
      if (current <= 0xff_ff) {
        res.push(current);
      } else {
        // Encode code points above U+FFFF as surrogate pair.
        res.push(0xd8_00 + (((current - 0x1_00_00) >>> 10) & 0x3_ff));
        res.push(0xdc_00 + (current & 0x3_ff));
      }
      current = 0;
    }
    i++;
  }

  return decodeCodePointsArray(res);
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x10_00;

function decodeCodePointsArray(codePoints: any[]) {
  const len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  let res = "";
  let i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, (i += MAX_ARGUMENTS_LENGTH)),
    );
  }
  return res;
}

export function decode(buf: Uint8Array) {
  return utf8Slice(buf, 0, buf.length);
}
