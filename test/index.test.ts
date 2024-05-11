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
      const encoded = textEncoder.encode(testCase);
      const decoded = decode(encoded);
      expect(decoded).toBe(testCase);
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
    // [84, 120,1,181,207,3,140]
    // const invalid = new Uint8Array([0x54, 0x78, 0x01, 0xb5, 0xcf, 0x03, 0x8c])
    // [232,130,218,70,92,219,182]
    // const invalid = new Uint8Array([0xe8, 0x82, 0xda, 0x46, 0x5c, 0xdb, 0xb6])
    // <61 F1 80 80 E1 80 C2 62 80 63 80 BF 64>
    // const invalid = new Uint8Array([0x61, 0xf1, 0x80, 0x80, 0xe1, 0x80, 0xc2, 0x62, 0x80, 0x63, 0x80, 0xbf, 0x64])
    const invalid = new Uint8Array(image);
    // console.log(invalid)
    // const invalid = new Uint8Array([0xc0, 0x80]);
    // const decoded = decode(invalid);
    const decoded = decode(invalid);
    // console.log('our result', decoded)
    const textDecoder = new TextDecoder("utf8");
    const expected = textDecoder.decode(invalid);
    // console.log('their result', expected, expected.split('').map((c) => c.codePointAt(0)))
    expect(expected).toBe(decoded);
  });
});
