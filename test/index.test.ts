import { readFileSync } from "node:fs";
import { expect, it, describe } from "vitest";
import { decode } from "../src";
const testCases = [
  // 1-byte
  "abcdefghABCDEFGH12345678abcdefghABCDEFGH12345678abcdefghABCDEFGH",
  // 2-byte
  "ÁáÀàĂăẮắẰằẴẵẲẳÂâẤấẦầẪẫẨẩǍǎÅåǺǻÄäǞǟÃãȦȧǠǡĄąĀāẢảȀȁȂȃẠạẶặẬậḀḁȺⱥᶏẚɐɑᶐɒᴀÆæǼǽǢǣᴂᴁ",
  // 3-byte
  "今天天气真是不错",
  // 4-byte
  "🇨🇳𠮷😀😃😄😁😆😅",
  // emojis
  "✊🏿✊🏿✊🏿👶👶👶🏿👶🏿🏋️‍♀️🏋️‍♀️🏋️‍♀️",
  // special cases
  "𐐀",
  "",
  "ascii",
  "latin \u00A9 1",
  "two \uCCCC byte",
  "surrogate \uD800\uDC000 pair",
  "isolated \uD800 leading",
  "isolated \uDC00 trailing",
  "\uD800 isolated leading at beginning",
  "\uDC00 isolated trailing at beginning",
  "isolated leading at end \uD800",
  "isolated trailing at end \uDC00",
  "swapped surrogate \uDC00\uD800 pair",
  // invalid
  "trailing high byte \u00A9",
  "interstitial high \u00A9 byte",
  "invalid \u00C0 byte",
  "invalid three-byte \u00ED\u00D0\u0080",
  "surrogate \u00ED\u00A0\u0080\u00ED\u00B0\u0080 pair",
];

const invalidTestCases = [
  [0x54, 0x78, 0x01, 0xb5, 0xcf, 0x03, 0x8c],
  [0xe8, 0x82, 0xda, 0x46, 0x5c, 0xdb, 0xb6],
  [
    0x61, 0xf1, 0x80, 0x80, 0xe1, 0x80, 0xc2, 0x62, 0x80, 0x63, 0x80, 0xbf,
    0x64,
  ],
];

describe("utf8 decoder", () => {
  it("decode basic case", () => {
    const textEncoder = new TextEncoder();
    const testCase = "aabbccdd";
    const encoded = textEncoder.encode(testCase);
    const decoded = decode(encoded);
    expect(decoded).toBe(testCase);
  });
  for (const testCase of testCases) {
    it(`decode ${testCase} successfully`, () => {
      const textEncoder = new TextEncoder();
      const textDecoder = new TextDecoder();
      const encoded = textEncoder.encode(testCase);
      const expected = textDecoder.decode(encoded);
      const decoded = decode(encoded);
      expect(expected).toBe(decoded);
    });
  }
  it("decode invalid utf-8 sequence", () => {
    // we need to construct some invalid utf-8 sequence
    const invalid = new Uint8Array([0xc0, 0x80]);
    const decoded = decode(invalid);
    const textDecoder = new TextDecoder("utf8");
    const expected = textDecoder.decode(invalid);
    // console.log(decoded);
    expect(expected).toBe(decoded);
  });
  it("decode invalid utf-8 like image", () => {
    const image = readFileSync("./test/demo.png");
    const invalid = new Uint8Array(image);
    const decoded = decode(invalid);
    // console.log('our result', decoded)
    const textDecoder = new TextDecoder("utf8");
    const expected = textDecoder.decode(invalid);
    // console.log('their result', expected, expected.split('').map((c) => c.codePointAt(0)))
    expect(expected).toBe(decoded);
  });
  let caseIndex = 0;
  for (const invalidTestCase of invalidTestCases) {
    it(`decode invalid utf-8 sequence ${++caseIndex}`, () => {
      const invalid = new Uint8Array(invalidTestCase);
      const decoded = decode(invalid);
      const textDecoder = new TextDecoder("utf8");
      const expected = textDecoder.decode(invalid);
      // console.log(decoded);
      expect(expected).toBe(decoded);
    });
  }
});
