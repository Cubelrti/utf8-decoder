export const Utf8ArrayToStr = (function () {
  const charCache = Array.from({ length: 128 })  // Preallocate the cache for the common single byte chars
  const charFromCodePt = String.fromCodePoint || String.fromCharCode
  const result: any[] = []

  return function (array: Uint8Array) {
    let codePt, byte1
    const buffLen = array.length

    result.length = 0

    for (let i = 0; i < buffLen;) {
      byte1 = array[i++]

      if (byte1 <= 0x7F) {
        codePt = byte1
      } else if (byte1 <= 0xDF) {
        codePt = ((byte1 & 0x1F) << 6) | (array[i++] & 0x3F)
      } else if (byte1 <= 0xEF) {
        codePt = ((byte1 & 0x0F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F)
        // @ts-ignore
      } else if (String.fromCodePoint) {
        codePt = ((byte1 & 0x07) << 18) | ((array[i++] & 0x3F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F)
      } else {
        codePt = 63    // Cannot convert four byte code points, so use "?" instead
        i += 3
      }

      result.push(charCache[codePt] || (charCache[codePt] = charFromCodePt(codePt)))
    }

    return result.join('')
  }
})()
