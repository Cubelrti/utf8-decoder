// prefer-spread is disabled because it is not supported in IE11
/* eslint-disable prefer-spread */

import { decoderError, type Decoder, type Stream } from "./decoder";

// prettier is disabled because it messes up the table
/* prettier-ignore */

// See http://bjoern.hoehrmann.de/utf-8/decoder/dfa/ for details.
// The remapped transition table is justified at
// https://docs.google.com/spreadsheets/d/1AZcQwuEL93HmNCljJWUwFMGqf7JAQ0puawZaUgP0E14

const utf8d = new Uint8Array([
    // This first table maps bytes to character to a transition.
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
    // This second table maps a state to a new state when adding a transition
    0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 0,  0,   // REJECT = 0
    12, 0,  0,  0,  24, 36, 48, 60, 72, 0, 84, 96,  // ACCEPT = 12
    0,  12, 12, 12, 0,  0,  0,  0,  0,  0, 0,  0,   // 2-byte = 24
    0,  24, 24, 24, 0,  0,  0,  0,  0,  0, 0,  0,   // 3-byte = 36
    0,  24, 24, 0,  0,  0,  0,  0,  0,  0, 0,  0,   // 3-byte low/mid = 48
    0,  36, 36, 36, 0,  0,  0,  0,  0,  0, 0,  0,   // 4-byte = 60
    0,  36, 0,  0,  0,  0,  0,  0,  0,  0, 0,  0,   // 4-byte low = 72
    0,  0,  0,  24, 0,  0,  0,  0,  0,  0, 0,  0,   // 3-byte high = 84
    0,  0,  36, 36, 0,  0,  0,  0,  0,  0, 0,  0,   // 4-byte mid/high = 96
]);
export class UTF8DfaDecoder implements Decoder {
  private state = 12; // ACCEPT
  private current = 0;
  // eslint-disable-next-line no-useless-constructor
  constructor(private options: { fatal: boolean }) {}

  handler(bite: number) {
    if (bite === -1 && this.state !== 12) {
      return decoderError(this.options.fatal);
    }
    if (bite === -1) {
      return -1;
    }
    if (bite < 0x7f && this.state === 12) {
      return bite;
    }
    const type = utf8d[bite];
    this.state = utf8d[256 + this.state + type];
    this.current = (this.current << 6) | (bite & (0x7f >> (type >> 1)));
    if (this.state < 12) {
      this.state = 12;
      this.current = 0;
      return decoderError(this.options.fatal);
    } else if (this.state === 12) {
      const res = this.current
      this.current = 0;
      return res;
    }
    // eslint-disable-next-line unicorn/no-null
    return null;
  }
}
