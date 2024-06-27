import { readFileSync } from 'node:fs'
import { bench, describe } from 'vitest'
import { TextDecoder as UTF8Decoder } from '../src/index'
import { TextDecoder as ExpoDecoder } from "./textdecoder";
import { PBJSDecoder } from "./pbjsdecoder";
import { V1Decoder } from "./v1decoder";

const buf = new TextEncoder().encode(
  "The quick brown fox jumps over the lazy dog 中文🤣 ÁáÀàĂăẮắẰằẴẵẲẳÂâẤấẦầẪẫẨẩǍǎÅåǺǻÄäǞǟÃãȦȧǠǡĄąĀāẢảȀȁȂȃẠạẶặẬậḀḁȺⱥᶏẚɐɑᶐɒᴀÆæǼǽǢǣᴂᴁ".repeat(
    10_000,
  ),
);
describe.only("unicode.txt", () => {
  bench("UTF8Decoder", () => {
    const textEncoder = new UTF8Decoder();
    textEncoder.decode(buf);
  });

  // bench('ExpoDecoder', () => {
  //   const textEncoder = new ExpoDecoder();
  //   textEncoder.decode(buf)
  // })

  // bench('NativeDecoder', () => {
  //   const textEncoder = new TextDecoder();
  //   textEncoder.decode(buf)
  // })

  bench("PBJSDecoder", () => {
    const textEncoder = new PBJSDecoder();
    textEncoder.decode(buf);
  });

  bench("V1Decoder", () => {
    const textEncoder = new V1Decoder();
    textEncoder.decode(buf);
  });
});

describe("demo.png", () => {
  bench("UTF8Decoder", () => {
    const buf = readFileSync("./test/demo.png");
    const textEncoder = new UTF8Decoder();
    textEncoder.decode(buf);
  });

  bench("ExpoDecoder", () => {
    const buf = readFileSync("./test/demo.png");
    const textEncoder = new ExpoDecoder();
    textEncoder.decode(buf);
  });

  bench("NativeDecoder", () => {
    const buf = readFileSync("./test/demo.png");
    const textEncoder = new TextDecoder();
    textEncoder.decode(buf);
  });

  bench("V1Decoder", () => {
    const buf = readFileSync("./test/demo.png");
    const textEncoder = new V1Decoder();
    textEncoder.decode(buf);
  });
});