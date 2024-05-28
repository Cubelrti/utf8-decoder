import { readFileSync } from "node:fs";
import { expect, it, describe } from "vitest";
import { decode } from "../src/index";
// const textDecoder = new Utf8Decoder();
// const decode = textDecoder.decode.bind(textDecoder);
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

// test cases from UTF-8 specification
const invalidTestCases = [
  [0x54, 0x78, 0x01, 0xb5, 0xcf, 0x03, 0x8c],
  [0xe8, 0x82, 0xda, 0x46, 0x5c, 0xdb, 0xb6],
  [
    0x61, 0xf1, 0x80, 0x80, 0xe1, 0x80, 0xc2, 0x62, 0x80, 0x63, 0x80, 0xbf,
    0x64,
  ],
];

// some test cases from Mozilla's UTF-8 decoder test suite
const tests = [
  {
    inStrings: [
      "%80", // Illegal or incomplete sequences
      "%8f",
      "%90",
      "%9f",
      "%a0",
      "%bf",
      "%c0",
      "%c1",
      "%c2",
      "%df",
      "%e0",
      "%e0%a0",
      "%e0%bf",
      "%ed%80",
      "%ed%9f",
      "%ef",
      "%ef%bf",
      "%f0",
      "%f0%90",
      "%f0%90%80",
      "%f0%90%bf",
      "%f0%bf",
      "%f0%bf%80",
      "%f0%bf%bf",
      "%f4",
      "%f4%80",
      "%f4%80%80",
      "%f4%80%bf",
      "%f4%8f",
      "%f4%8f%80",
      "%f4%8f%bf",
      "%f5",
      "%f7",
      "%f8",
      "%fb",
      "%fc",
      "%fd",
    ],
    expected: "ABC\uFFFDXYZ",
  },

  {
    inStrings: [
      "%c0%af", // Illegal bytes in 2-octet
      "%c1%af",
    ], //  sequences
    expected: "ABC\uFFFD\uFFFDXYZ",
  },

  {
    inStrings: [
      "%e0%80%80", // Illegal bytes in 3-octet
      "%e0%80%af", //  sequences
      "%e0%9f%bf",
      // long surrogates
      "%ed%a0%80", // D800
      "%ed%ad%bf", // DB7F
      "%ed%ae%80", // DB80
      "%ed%af%bf", // DBFF
      "%ed%b0%80", // DC00
      "%ed%be%80", // DF80
      "%ed%bf%bf",
    ], // DFFF
    expected: "ABC\uFFFD\uFFFD\uFFFDXYZ",
  },

  {
    inStrings: [
      "%f0%80%80%80", // Illegal bytes in 4-octet
      "%f0%80%80%af", //  sequences
      "%f0%8f%bf%bf",
      "%f4%90%80%80",
      "%f4%bf%bf%bf",
      "%f5%80%80%80",
      "%f7%bf%bf%bf",
    ],
    expected: "ABC\uFFFD\uFFFD\uFFFD\uFFFDXYZ",
  },

  {
    inStrings: [
      "%f8%80%80%80%80", // Illegal bytes in 5-octet
      "%f8%80%80%80%af", //  sequences
      "%fb%bf%bf%bf%bf",
    ],
    expected: "ABC\uFFFD\uFFFD\uFFFD\uFFFD\uFFFDXYZ",
  },

  // Surrogate pairs
  {
    inStrings: [
      "%ed%a0%80%ed%b0%80", // D800 DC00
      "%ed%a0%80%ed%bf%bf", // D800 DFFF
      "%ed%ad%bf%ed%b0%80", // DB7F DC00
      "%ed%ad%bf%ed%bf%bf", // DB7F DFFF
      "%ed%ae%80%ed%b0%80", // DB80 DC00
      "%ed%ae%80%ed%bf%bf", // DB80 DFFF
      "%ed%af%bf%ed%b0%80", // DBFF DC00
      "%ed%ad%bf%ed%bf%bf", // DBFF DFFF
      "%fc%80%80%80%80%80", // Illegal bytes in 6-octet
      "%fc%80%80%80%80%af", //  sequences
      "%fd%bf%bf%bf%bf%bf",
    ],
    expected: "ABC\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFDXYZ",
  },
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
      // const v1Decoded = V1Decode(invalid);
      const textDecoder = new TextDecoder("utf8");
      const expected = textDecoder.decode(invalid);
      // console.log(decoded);
      expect(expected).toBe(decoded);
    });
  }
  for (const test of tests) {
    const fullString: number[] = [];
    for (const inString of test.inStrings) {
      const encoded = inString
        .split("%")
        .slice(1)
        .map((hex) => Number.parseInt(hex, 16));
      fullString.push(...encoded);
    }
    it(`decode invalid utf-8 sequence ${test.expected}`, () => {
      const invalid = new Uint8Array(fullString);
      const decoded = decode(invalid);
      const textDecoder = new TextDecoder("utf8");
      const expected = textDecoder.decode(invalid);
      // console.log(decoded);
      expect(expected).toBe(decoded);
    });
  }
  it(`decode unicode.txt `, () => {
    const buf = readFileSync("./test/unicode.txt");
    const textEncoder = new TextDecoder();
    const expected = textEncoder.decode(buf);
    const decoded = decode(new Uint8Array(buf));
    expect(expected).toBe(decoded);
  });
});
