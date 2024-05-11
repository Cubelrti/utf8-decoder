# utf8-decoder

<!-- automd:badges color=yellow -->

[![npm version](https://img.shields.io/npm/v/utf8-decoder?color=yellow)](https://npmjs.com/package/utf8-decoder)
[![npm downloads](https://img.shields.io/npm/dm/utf8-decoder?color=yellow)](https://npmjs.com/package/utf8-decoder)

<!-- /automd -->

A simple UTF-8 decoder, keeping align with native TextDecoder as much as possible.

Most part of the code is using V8's Utf8DfaDecoder, which is a modified version of [Flexible and Economical UTF-8 Decoder](http://bjoern.hoehrmann.de/utf-8/decoder/dfa/).

- Handle malformed UTF-8 better than most solutions on NPM. 100% aligned with the standard.
- Keeps default char unicode `�` as-is instead of throwing error.
- Process surrogate pairs correctly for Emojis.
- Designed with performance in mind.

You can try over the test case for other UTF-8 decoders to see the difference, especially the malformed cases.


## Usage

Install package:

<!-- automd:pm-install -->

```sh
# ✨ Auto-detect
npx nypm install utf8-decoder

# npm
npm install utf8-decoder

# yarn
yarn add utf8-decoder

# pnpm
pnpm install utf8-decoder

# bun
bun install utf8-decoder
```

<!-- /automd -->

Import:

<!-- automd:jsimport cjs cdn name="utf8-decoder" imports="decode" -->

**ESM** (Node.js, Bun)

```js
import { decode } from "utf8-decoder";
```

**CommonJS** (Legacy Node.js)

```js
const { decode } = require("utf8-decoder");
```

**CDN** (Deno, Bun and Browsers)

```js
import { decode } from "https://esm.sh/utf8-decoder";
```

<!-- /automd -->

## Development

<details>

<summary>local development</summary>

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

</details>

## Reference

Unicode/UTF-8 is a complex topic, here are some references for further reading:
- [UTF-8 Encoding](https://en.wikipedia.org/wiki/UTF-8)
- [The Unicode Standard](https://www.unicode.org/versions/Unicode6.0.0/)

I recommend reading the chapter 3 of the Unicode Standard for a better understanding of the encoding and the invalid sequences and error handling.

## License

<!-- automd:contributors license=MIT -->

Published under the [MIT](https://github.com/Cubelrti/utf8-decoder/blob/main/LICENSE) license.
Made by [community](https://github.com/Cubelrti/utf8-decoder/graphs/contributors) 💛
<br><br>
<a href="https://github.com/Cubelrti/utf8-decoder/graphs/contributors">
<img src="https://contrib.rocks/image?repo=Cubelrti/utf8-decoder" />
</a>

<!-- /automd -->

<!-- automd:with-automd -->

---

_🤖 auto updated with [automd](https://automd.unjs.io)_

<!-- /automd -->
