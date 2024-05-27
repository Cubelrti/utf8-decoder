// prefer-spread is disabled because it is not supported in IE11
/* eslint-disable prefer-spread */
/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/prefer-code-point */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable unicorn/text-encoding-identifier-case */

// reference: https://github.com/EvanBacon/text-decoder/blob/main/src/index.ts

// A fork of text-encoding but with only UTF-8 decoder. `TextEncoder` is in Hermes and we only need utf-8 decoder for RSC.
//
// https://github.com/inexorabletash/text-encoding/blob/3f330964c0e97e1ed344c2a3e963f4598610a7ad/lib/encoding.js#L1

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
  private tokens: Uint8Array;
  private cursor: number;

  constructor(tokens: number[] | Uint8Array) {
    this.tokens = Uint8Array.from(tokens);
    this.cursor = 0;
  }
  /**
   * @return {boolean} True if end-of-stream has been hit.
   */

  endOfStream(): boolean {
    return this.cursor >= this.tokens.length;
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
    // if (this.tokens.length === 0) { return END_OF_STREAM; }
    // return this.tokens.pop()!;
    if (this.cursor >= this.tokens.length) { return END_OF_STREAM; }
    return this.tokens[this.cursor++];
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

// static `decode` function for convenience and API consistency
export function decode(input: ArrayBuffer | DataView, encoding = "utf-8"): string {
  const decoder = new TextDecoder(encoding);
  return decoder.decode(input);
}