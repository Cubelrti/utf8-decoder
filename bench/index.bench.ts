import { readFileSync } from 'node:fs'
import { bench, describe } from 'vitest'
import { TextDecoder as UTF8Decoder } from '../src/index'
import { TextDecoder as ExpoDecoder } from './textdecoder'

describe('unicode.txt', () => {
  bench('UTF8Decoder', () => {    
    const buf = readFileSync("./test/unicode.txt");
    const textEncoder = new UTF8Decoder();
    textEncoder.decode(buf)
  })

  bench('ExpoDecoder', () => {
    const buf = readFileSync("./test/unicode.txt");
    const textEncoder = new ExpoDecoder();
    textEncoder.decode(buf)
  })

  bench('NativeDecoder', () => {
    const buf = readFileSync("./test/unicode.txt");
    const textEncoder = new TextDecoder();
    textEncoder.decode(buf)
  })
})

describe('demo.png', () => {
  bench('UTF8Decoder', () => {    
    const buf = readFileSync("./test/demo.png");
    const textEncoder = new UTF8Decoder();
    textEncoder.decode(buf)
  })

  bench('ExpoDecoder', () => {
    const buf = readFileSync("./test/demo.png");
    const textEncoder = new ExpoDecoder();
    textEncoder.decode(buf)
  })

  bench('NativeDecoder', () => {
    const buf = readFileSync("./test/demo.png");
    const textEncoder = new TextDecoder();
    textEncoder.decode(buf)
  })
})