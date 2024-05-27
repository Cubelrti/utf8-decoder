/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/prefer-code-point */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable unicorn/text-encoding-identifier-case */

import { UTF8DfaDecoder } from '.';

// reference: https://github.com/EvanBacon/text-decoder/blob/main/src/index.ts

// A fork of text-encoding but with only UTF-8 decoder. `TextEncoder` is in Hermes and we only need utf-8 decoder for RSC.
//
// https://github.com/inexorabletash/text-encoding/blob/3f330964c0e97e1ed344c2a3e963f4598610a7ad/lib/encoding.js#L1

/**
 * Checks if a number is within a specified range.
 * @param {number} a The number to test.
 * @param {number} min The minimum value in the range, inclusive.
 * @param {number} max The maximum value in the range, inclusive.
 * @returns {boolean} True if a is within the range.
 */
function inRange(a: number, min: number, max: number): boolean {
  return min <= a && a <= max;
}

/**
 * Converts an array of code points to a string.
 * @param {number[]} codePoints Array of code points.
 * @returns {string} The string representation.
 */
function codePointsToString(codePoints: number[]): string {
  let s = "";
  for (let cp of codePoints) {
    if (cp <= 0xff_ff) {
      s += String.fromCharCode(cp);
    } else {
      cp -= 0x1_00_00;
      s += String.fromCharCode((cp >> 10) + 0xd8_00, (cp & 0x3_ff) + 0xdc_00);
    }
  }
  return s;
}

function normalizeBytes(input?: ArrayBuffer | DataView): Uint8Array {
  if (typeof input === "object" && input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  } else if (
    typeof input === "object" &&
    "buffer" in input &&
    input.buffer instanceof ArrayBuffer
  ) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(0);
}

/**
 * End-of-stream is a special token that signifies no more tokens
 * are in the stream.
 */
const END_OF_STREAM = -1;

const FINISHED = -1;

/**
 * A stream represents an ordered sequence of tokens.
 *
 * @constructor
 * @param {!(number[]|Uint8Array)} tokens Array of tokens that provide the stream.
 */
export class Stream {
  private tokens: number[];

  constructor(tokens: number[] | Uint8Array) {
    this.tokens = Array.prototype.slice.call(tokens);
    // Reversed as push/pop is more efficient than shift/unshift.
    this.tokens.reverse();
  }

  /**
   * @return {boolean} True if end-of-stream has been hit.
   */
  endOfStream(): boolean {
    return this.tokens.length === 0;
  }

  /**
   * When a token is read from a stream, the first token in the
   * stream must be returned and subsequently removed, and
   * end-of-stream must be returned otherwise.
   *
   * @return {number} Get the next token from the stream, or
   * end_of_stream.
   */
  read(): number {
    if (this.tokens.length === 0) { return END_OF_STREAM; }
    return this.tokens.pop()!;
  }

  /**
   * When one or more tokens are prepended to a stream, those tokens
   * must be inserted, in given order, before the first token in the
   * stream.
   *
   * @param token The token(s) to prepend to the stream.
   */
  prepend(token: number | number[]): void {
    if (Array.isArray(token)) {
      while (token.length > 0) { this.tokens.push(token.pop()!); }
    } else {
      this.tokens.push(token);
    }
  }

  /**
   * When one or more tokens are pushed to a stream, those tokens
   * must be inserted, in given order, after the last token in the
   * stream.
   *
   * @param token The tokens(s) to push to the stream.
   */
  push(token: number | number[]): void {
    if (Array.isArray(token)) {
      while (token.length > 0) { this.tokens.unshift(token.shift()!); }
    } else {
      this.tokens.unshift(token);
    }
  }
}

export function decoderError(fatal: boolean, optCodePoint?: number) {
  if (fatal) { throw new TypeError("Decoder error"); }
  return optCodePoint || 0xff_fd;
}

interface Encoding {
  name: string;
  labels: string[];
}

const LABEL_ENCODING_MAP: { [key: string]: Encoding } = {};

export function getEncoding(label: string): Encoding | null {
  label = label.trim().toLowerCase();
  if (label in LABEL_ENCODING_MAP) {
    return LABEL_ENCODING_MAP[label];
  }
  return null;
}

/** [Encodings table](https://encoding.spec.whatwg.org/encodings.json) (Incomplete as we only need TextDecoder utf8 in Expo RSC. A more complete implementation should be added to Hermes as native code.) */
const ENCODING_MAP: { heading: string; encodings: Encoding[] }[] = [
  {
    encodings: [
      {
        labels: ["unicode-1-1-utf-8", "utf-8", "utf8"],
        name: "UTF-8",
      },
    ],
    heading: "The Encoding",
  },
];

for (const category of ENCODING_MAP) {
  for (const encoding of category.encodings) {
    for (const label of encoding.labels) {
      LABEL_ENCODING_MAP[label] = encoding;
    }
  }
}

// Registry of of encoder/decoder factories, by encoding name.
const DECODERS: {
  [key: string]: (options: { fatal: boolean }) => Decoder;
} = {
  "UTF-8": (options) => new UTF8DfaDecoder(options),
};

// 9.1.1 utf-8 decoder

export interface Decoder {
  handler: (bite: number) => number | number[] | null | -1;
}

// 8.1 Interface TextDecoder

export class TextDecoder {
  private _encoding: Encoding | null;
  private _ignoreBOM: boolean;
  private _errorMode: string;
  private _BOMseen = false;
  private _doNotFlush = false;
  private _decoder: Decoder | null = null;

  constructor(
    label = "utf-8",
    options: {
      fatal?: boolean;
      ignoreBOM?: boolean;
    } = {}
  ) {
    // eslint-disable-next-line eqeqeq
    if (options != undefined && typeof options !== "object") {
      throw new TypeError(
        "Second argument of TextDecoder must be undefined or an object, e.g. { fatal: true }"
      );
    }

    const normalizedLabel = String(label).trim().toLowerCase();
    const encoding = getEncoding(normalizedLabel);
    if (encoding === null || encoding.name === "replacement") {
      throw new RangeError(
        `Unknown encoding: ${label} (normalized: ${normalizedLabel})`
      );
    }

    if (!DECODERS[encoding.name]) {
      throw new Error(`Decoder not present: ${encoding.name}`);
    }

    this._encoding = encoding;
    this._ignoreBOM = !!options.ignoreBOM;
    this._errorMode = options.fatal ? "fatal" : "replacement";
  }

  // Getter methods for encoding, fatal, and ignoreBOM
  get encoding(): string {
    return this._encoding?.name.toLowerCase() ?? "";
  }

  get fatal(): boolean {
    return this._errorMode === "fatal";
  }

  get ignoreBOM(): boolean {
    return this._ignoreBOM;
  }

  decode(
    input?: ArrayBuffer | DataView,
    options: { stream?: boolean } = {}
  ): string {
    const bytes = normalizeBytes(input);

    // 1. If the do not flush flag is unset, set decoder to a new
    // encoding's decoder, set stream to a new stream, and unset the
    // BOM seen flag.
    if (!this._doNotFlush) {
      this._decoder = DECODERS[this._encoding!.name]({
        fatal: this.fatal,
      });
      this._BOMseen = false;
    }

    // 2. If options's stream is true, set the do not flush flag, and
    // unset the do not flush flag otherwise.
    this._doNotFlush = Boolean(options.stream);

    // 3. If input is given, push a copy of input to stream.
    // TODO: Align with spec algorithm - maintain stream on instance.
    const inputStream = new Stream(bytes);

    // 4. Let output be a new stream.
    const output: number[] = [];

    while (true) {
      const token = inputStream.read();

      if (token === END_OF_STREAM) { break; }

      const result = this._decoder!.handler(token);

      if (result === FINISHED) { break; }

      if (result !== null) {
        output.push(result as number);
      }
    }

    if (!this._doNotFlush) {
      do {
        const result = this._decoder!.handler(
          inputStream.read()
        );
        if (result === FINISHED) { break; }
        if (result === null) { continue; }
        // eslint-disable-next-line prefer-spread
        if (Array.isArray(result)) { output.push.apply(output, result); }
        else { output.push(result); }
      } while (!inputStream.endOfStream());
      this._decoder = null;
    }

    return this.serializeStream(output);
  }

  // serializeStream method for converting code points to a string
  private serializeStream(stream: number[]): string {
    if (this._encoding!.name === "UTF-8") {
      if (!this._ignoreBOM && !this._BOMseen && stream[0] === 0xfe_ff) {
        // If BOM is detected at the start of the stream and we're not ignoring it
        this._BOMseen = true;
        stream.shift(); // Remove the BOM
      } else if (stream.length > 0) {
        this._BOMseen = true;
      }
    }

    // Convert the stream of code points to a string
    return codePointsToString(stream);
  }
}
