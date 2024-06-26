/** @define {boolean} */
const ENCODEINTO_BUILD = false;

(function(global){
	"use strict";
	// In this NodeJS version, Buffers are supported and used as fallback in versions that do not support Typed Arrays
	const log = Math.log;
	const LN2 = Math.LN2;
	const clz32 = Math.clz32 || function(x) { return 31 - log(Math.trunc(x)) / LN2 | 0 };
	const fromCharCode = String.fromCharCode;
	const Object_prototype_toString = ({}).toString;

	const NativeSharedArrayBuffer = global.SharedArrayBuffer;
	const sharedArrayBufferString = NativeSharedArrayBuffer ? Object_prototype_toString.call(NativeSharedArrayBuffer) : "";
	const NativeUint8Array = global.Uint8Array;
	const arrayBufferPrototypeString = NativeUint8Array ? Object_prototype_toString.call(ArrayBuffer.prototype) : "";
	let NativeBuffer = global.Buffer;
	let TextEncoderPrototype, NativeBufferPrototype, globalBufferPrototypeString;
	const encodeRegExp = /[\u0080-\uD7FF\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g;
	const tmpBufferU16 = new Uint16Array(32);
	try {
		if (!NativeBuffer && global.require) { NativeBuffer=global.require("Buffer"); }
		NativeBufferPrototype = NativeBuffer.prototype;
		globalBufferPrototypeString = NativeBuffer ? Object_prototype_toString.call(NativeBufferPrototype) : "";
	} catch{}
	const NativeBuffer_allocUnsafe = NativeBuffer.allocUnsafe;
	const usingTypedArrays = !!NativeUint8Array && !NativeBuffer;

	// NativeBufferHasArrayBuffer is true if there is no global.Buffer or if native global.Buffer instances have a Buffer property for the internal ArrayBuffer
	const NativeBufferHasArrayBuffer = !NativeBuffer || (!!NativeUint8Array && NativeUint8Array.prototype.isPrototypeOf(NativeBufferPrototype));

	const GlobalTextEncoder = global.TextEncoder; const GlobalTextDecoder = global.TextDecoder;
	
	let globalTextEncoderInstance, globalTextEncoderEncodeInto;
	
	if (usingTypedArrays || NativeBuffer) {
		/** @constructor */
		function TextDecoder(){}
		function decode(inputArrayOrBuffer){
			const buffer = (inputArrayOrBuffer && inputArrayOrBuffer.buffer) || inputArrayOrBuffer;
			const asString = Object_prototype_toString.call(buffer);
			if (asString !== arrayBufferPrototypeString && asString !== globalBufferPrototypeString && asString !== sharedArrayBufferString && asString !== "[object ArrayBuffer]" && inputArrayOrBuffer !== undefined)
				{ throw new TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'"); }
			const inputAs8 = NativeBufferHasArrayBuffer ? new NativeUint8Array(buffer) : buffer || [];
		
			let resultingString=""; let tmpStr=""; let index=0; const len=inputAs8.length|0; const lenMinus32=len-32|0; let nextEnd=0; const nextStop=0; let cp0=0; let codePoint=0; let minBits=0; let cp1=0; let pos=0; let tmp=-1;
			// Note that tmp represents the 2nd half of a surrogate pair incase a surrogate gets divided between blocks
			for (; index < len; ) {
				nextEnd = index <= lenMinus32 ? 32 : len - index|0;
				for (; pos < nextEnd; index=index+1|0, pos=pos+1|0) {
					cp0 = inputAs8[index] & 0xff;
					switch(cp0 >> 4) {
						case 15: {
							cp1 = inputAs8[index=index+1|0] & 0xff;
							if ((cp1 >> 6) !== 0b10 || cp0 > 0b1111_0111) {
								index = index - 1|0;
								break;
							}
							codePoint = ((cp0 & 0b111) << 6) | (cp1 & 0b0011_1111);
							minBits = 5; // 20 ensures it never passes -> all invalid replacements
							cp0 = 0x1_00;
						} //  keep track of th bit size
						case 14: {
							cp1 = inputAs8[index=index+1|0] & 0xff;
							codePoint <<= 6;
							codePoint |= ((cp0 & 0b1111) << 6) | (cp1 & 0b0011_1111);
							minBits = (cp1 >> 6) === 0b10 ? minBits + 4|0 : 24; // 24 ensures it never passes -> all invalid replacements
							cp0 = (cp0 + 0x1_00) & 0x3_00;
						} // keep track of th bit size
						case 13:
						case 12: {
							cp1 = inputAs8[index=index+1|0] & 0xff;
							codePoint <<= 6;
							codePoint |= ((cp0 & 0b1_1111) << 6) | cp1 & 0b0011_1111;
							minBits = minBits + 7|0;
							
							// Now, process the code point
							if (index < len && (cp1 >> 6) === 0b10 && (codePoint >> minBits) && codePoint < 0x11_00_00) {
								cp0 = codePoint;
								codePoint = codePoint - 0x1_00_00|0;
								if (codePoint >= 0/* 0xffff < codePoint */) { // BMP code point
									// nextEnd = nextEnd - 1|0;
									
									tmp = (codePoint >> 10) + 0xD8_00|0;   // highSurrogate
									cp0 = (codePoint & 0x3_ff) + 0xDC_00|0; // lowSurrogate (will be inserted later in the switch-statement)
									
									if (pos < 31) { // notice 31 instead of 32
										tmpBufferU16[pos] = tmp;
										pos = pos + 1|0;
										tmp = -1;
									}  else { // else, we are at the end of the inputAs8 and let tmp0 be filled in later on
										// NOTE that cp1 is being used as a temporary variable for the swapping of tmp with cp0
										cp1 = tmp;
										tmp = cp0;
										cp0 = cp1;
									}
								} else { nextEnd = nextEnd + 1|0; } // because we are advancing i without advancing pos
							} else {
								// invalid code point means replacing the whole thing with null replacement characters
								cp0 >>= 8;
								index = index - cp0 - 1|0; // reset index  back to what it was before
								cp0 = 0xff_fd;
							}
							
							
							// Finally, reset the variables for the next go-around
							minBits = 0;
							codePoint = 0;
							nextEnd = index <= lenMinus32 ? 32 : len - index|0;
						}
						default: {
							tmpBufferU16[pos] = cp0; // fill with invalid replacement character
							continue;
						}
						case 11:
						case 10:
						case 9:
						case 8:
					}
					tmpBufferU16[pos] = 0xff_fd; // fill with invalid replacement character
				}
				tmpStr += fromCharCode(
					tmpBufferU16[0], tmpBufferU16[1], tmpBufferU16[2], tmpBufferU16[3], tmpBufferU16[4], tmpBufferU16[5], tmpBufferU16[6], tmpBufferU16[7],
					tmpBufferU16[8], tmpBufferU16[9], tmpBufferU16[10], tmpBufferU16[11], tmpBufferU16[12], tmpBufferU16[13], tmpBufferU16[14], tmpBufferU16[15],
					tmpBufferU16[16], tmpBufferU16[17], tmpBufferU16[18], tmpBufferU16[19], tmpBufferU16[20], tmpBufferU16[21], tmpBufferU16[22], tmpBufferU16[23],
					tmpBufferU16[24], tmpBufferU16[25], tmpBufferU16[26], tmpBufferU16[27], tmpBufferU16[28], tmpBufferU16[29], tmpBufferU16[30], tmpBufferU16[31]
				);
				if (pos < 32) { tmpStr = tmpStr.slice(0, pos-32|0); }// -(32-pos));
				if (index < len) {
					// fromCharCode.apply(0, tmpBufferU16 : NativeUint8Array ?  tmpBufferU16.subarray(0,pos) : tmpBufferU16.slice(0,pos));
					tmpBufferU16[0] = tmp;
					pos = (~tmp) >>> 31;// tmp !== -1 ? 1 : 0;
					tmp = -1;
					
					if (tmpStr.length < resultingString.length) { continue; }
				} else if (tmp !== -1) {
					tmpStr += fromCharCode(tmp);
				}
				
				resultingString += tmpStr;
				tmpStr = "";
			}

			return resultingString;
		}
		TextDecoder.prototype.decode = decode;
		/// ///////////////////////////////////////////////////////////////////////////////////
		function encoderReplacer(nonAsciiChars){
			// make the UTF string into a binary UTF-8 encoded string
			let point = nonAsciiChars.charCodeAt(0)|0;
			if (point >= 0xD8_00) {
				if (point <= 0xDB_FF) {
					const nextcode = nonAsciiChars.charCodeAt(1)|0; // defaults to 0 when NaN, causing null replacement character
				
					if (nextcode >= 0xDC_00 && nextcode <= 0xDF_FF) {
						// point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
						point = (point<<10) + nextcode - 0x3_5f_dc_00|0;
						if (point > 0xff_ff)
							{ return fromCharCode(
								(0x1e/* 0b11110 */<<3) | (point>>18),
								(0x2/* 0b10 */<<6) | ((point>>12)&0x3f/* 0b00111111 */),
								(0x2/* 0b10 */<<6) | ((point>>6)&0x3f/* 0b00111111 */),
								(0x2/* 0b10 */<<6) | (point&0x3f/* 0b00111111 */)
							); }
					} else { point = 65_533/* 0b1111111111111101 */; }// return '\xEF\xBF\xBD';//fromCharCode(0xef, 0xbf, 0xbd);
				} else if (point <= 0xDF_FF) {
					point = 65_533/* 0b1111111111111101 */;// return '\xEF\xBF\xBD';//fromCharCode(0xef, 0xbf, 0xbd);
				}
			}
			/* if (point <= 0x007f) return nonAsciiChars;
			else */if (point <= 0x07_ff) {
				return fromCharCode((0x6<<5)|(point>>6), (0x2<<6)|(point&0x3f));
			} else { return fromCharCode(
				(0xe/* 0b1110 */<<4) | (point>>12),
				(0x2/* 0b10 */<<6) | ((point>>6)&0x3f/* 0b00111111 */),
				(0x2/* 0b10 */<<6) | (point&0x3f/* 0b00111111 */)
			); }
		}
		/** @constructor */
		function TextEncoder(){}
		function encode(inputString){
			// 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
			// 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
			const encodedString = inputString === void 0 ?  "" : ("" + inputString);// .replace(encodeRegExp, encoderReplacer);
			const len=encodedString.length|0; let result = usingTypedArrays ? new NativeUint8Array((len << 1) + 8|0) : (NativeBuffer_allocUnsafe ? NativeBuffer_allocUnsafe((len << 1) + 8|0) : new NativeBuffer((len << 1) + 8|0));

			let tmpResult;
			let i=0; let pos=0; let point=0; let nextcode=0;
			let upgradededArraySize=false; // normal arrays are auto-expanding
			for (i=0; i<len; i=i+1|0, pos=pos+1|0) {
				point = encodedString.charCodeAt(i)|0;
				if (point <= 0x00_7f) {
					result[pos] = point;
				} else if (point <= 0x07_ff) {
					result[pos] = (0x6<<5)|(point>>6);
					result[pos=pos+1|0] = (0x2<<6)|(point&0x3f);
				} else {
					widenCheck: {
						if (point >= 0xD8_00) {
							if (point < 0xDC_00) {
								nextcode = encodedString.charCodeAt(i=i+1|0)|0; // defaults to 0 when NaN, causing null replacement character
								
								if (nextcode >= 0xDC_00 && nextcode <= 0xDF_FF) {
									// point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
									point = (point<<10) + nextcode - 0x3_5f_dc_00|0;
									if (point > 0xff_ff) {
										result[pos] = (0x1e/* 0b11110 */<<3) | (point>>18);
										result[pos=pos+1|0] = (0x2/* 0b10 */<<6) | ((point>>12)&0x3f/* 0b00111111 */);
										result[pos=pos+1|0] = (0x2/* 0b10 */<<6) | ((point>>6)&0x3f/* 0b00111111 */);
										result[pos=pos+1|0] = (0x2/* 0b10 */<<6) | (point&0x3f/* 0b00111111 */);
										continue;
									}
									break widenCheck;
								}
								point = 65_533/* 0b1111111111111101 */;// return '\xEF\xBF\xBD';//fromCharCode(0xef, 0xbf, 0xbd);
							} else if (point <= 0xDF_FF) {
								point = 65_533/* 0b1111111111111101 */;// return '\xEF\xBF\xBD';//fromCharCode(0xef, 0xbf, 0xbd);
							}
						}
						if (!upgradededArraySize && (i << 1) < pos && (i << 1) < (pos - 7|0)) {
							upgradededArraySize = true;
							tmpResult = usingTypedArrays ? new NativeUint8Array(len * 3) : (NativeBuffer_allocUnsafe ? NativeBuffer_allocUnsafe(len * 3) : new NativeBuffer(len * 3));
							tmpResult.set( result );
							result = tmpResult;
						}
					}
					result[pos] = (0xe/* 0b1110 */<<4) | (point>>12);
					result[pos=pos+1|0] =(0x2/* 0b10 */<<6) | ((point>>6)&0x3f/* 0b00111111 */);
					result[pos=pos+1|0] =(0x2/* 0b10 */<<6) | (point&0x3f/* 0b00111111 */);
				}
			}
			return result.subarray(0, pos);
		}
		function polyfill_encodeInto(inputString, u8Arr) {
			const encodedString = inputString === void 0 ?  "" : ("" + inputString).replace(encodeRegExp, encoderReplacer);
			let len=encodedString.length|0; let i=0; let char=0; let read=0; const u8ArrLen = u8Arr.length|0; const inputLength=inputString.length|0;
			if (u8ArrLen < len) { len=u8ArrLen; }
			putChars: {
				for (; i<len; i=i+1|0) {
					char = encodedString.charCodeAt(i) |0;
					switch(char >> 4) {
						case 0:
						case 1:
						case 2:
						case 3:
						case 4:
						case 5:
						case 6:
						case 7: {
							read = read + 1|0;
						}
							// extension points:
						case 8:
						case 9:
						case 10:
						case 11: {
							break;
						}
						case 12:
						case 13: {
							if ((i+1|0) < u8ArrLen) {
								read = read + 1|0;
								break;
							}
						}
						case 14: {
							if ((i+2|0) < u8ArrLen) {
								read = read + 1|0;
								break;
							}
						}
						case 15: {
							if ((i+3|0) < u8ArrLen) {
								read = read + 1|0;
								break;
							}
						}
						default: {
							break putChars;
						}
					}
					// read = read + ((char >> 6) !== 2) |0;
					u8Arr[i] = char;
				}
			}
			return { written: i, read: inputLength < read ? inputLength : read };
			// 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
			// 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
			/* var encodedString = typeof inputString == "string" ? inputString : inputString === void 0 ?  "" : "" + inputString;
			var encodedLen = encodedString.length|0, u8LenLeft=u8Arr.length|0;
			var i=-1, read=-1, code=0, point=0, nextcode=0;
			tryFast: if (2 < encodedLen && encodedLen < (u8LenLeft >> 1)) {
				// Skip the normal checks because we can almost certainly fit the string inside the existing buffer
				while (1) {		// make the UTF string into a binary UTF-8 encoded string
					point = encodedString.charCodeAt(read = read + 1|0)|0;
					
					if (point <= 0x007f) {
						if (point === 0 && encodedLen <= read) {
							read = read - 1|0;
							break; // we have reached the end of the string
						}
						u8Arr[i=i+1|0] = point;
					} else if (point <= 0x07ff) {
						u8Arr[i=i+1|0] = (0x6<<5)|(point>>6);
						u8Arr[i=i+1|0] = (0x2<<6)|(point&0x3f);
					} else {
						if (0xD800 <= point && point <= 0xDBFF) {
							nextcode = encodedString.charCodeAt(read)|0; // defaults to 0 when NaN, causing null replacement character
							
							if (0xDC00 <= nextcode && nextcode <= 0xDFFF) {
								read = read + 1|0;
								//point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
								point = (point<<10) + nextcode - 0x35fdc00|0;
								if (point > 0xffff) {
									u8Arr[i=i+1|0] = (0x1e<<3) | (point>>18);
									u8Arr[i=i+1|0] = (0x2<<6) | ((point>>12)&0x3f);
									u8Arr[i=i+1|0] = (0x2<<6) | ((point>>6)&0x3f);
									u8Arr[i=i+1|0] = (0x2<<6) | (point&0x3f);
									continue;
								}
							} else if (nextcode === 0 && encodedLen <= read) {
								break; // we have reached the end of the string
							} else {
								point = 65533;//0b1111111111111101; // invalid replacement character
							}
						}
						u8Arr[i=i+1|0] = (0xe<<4) | (point>>12);
						u8Arr[i=i+1|0] = (0x2<<6) | ((point>>6)&0x3f);
						u8Arr[i=i+1|0] = (0x2<<6) | (point&0x3f);
						if (u8LenLeft < (i + ((encodedLen - read) << 1)|0)) {
							// These 3x chars are the only way to inflate the size to 3x
							u8LenLeft = u8LenLeft - i|0;
							break tryFast;
						}
					}
				}
				u8LenLeft = 0; // skip the next for-loop 
			}
			
			
			for (; 0 < u8LenLeft; ) {		// make the UTF string into a binary UTF-8 encoded string
				point = encodedString.charCodeAt(read = read + 1|0)|0;
				
				if (point <= 0x007f) {
					if (point === 0 && encodedLen <= read) {
						read = read - 1|0;
						break; // we have reached the end of the string
					}
					u8LenLeft = u8LenLeft - 1|0;
					u8Arr[i=i+1|0] = point;
				} else if (point <= 0x07ff) {
					u8LenLeft = u8LenLeft - 2|0;
					if (0 <= u8LenLeft) {
						u8Arr[i=i+1|0] = (0x6<<5)|(point>>6);
						u8Arr[i=i+1|0] = (0x2<<6)|(point&0x3f);
					}
				} else {
					if (0xD800 <= point && point <= 0xDBFF) {
						if (nextcode <= 0xDFFF) {
							nextcode = encodedString.charCodeAt(read = read + 1|0)|0; // defaults to 0 when NaN, causing null replacement character
							
							if (0xDC00 <= nextcode) {
									read = read + 1|0;
									//point = ((point - 0xD800)<<10) + nextcode - 0xDC00 + 0x10000|0;
									point = (point<<10) + nextcode - 0x35fdc00|0;
									if (point > 0xffff) {
										u8LenLeft = u8LenLeft - 4|0;
										if (0 <= u8LenLeft) {
											u8Arr[i=i+1|0] = (0x1e<<3) | (point>>18);
											u8Arr[i=i+1|0] = (0x2<<6) | ((point>>12)&0x3f);
											u8Arr[i=i+1|0] = (0x2<<6) | ((point>>6)&0x3f);
											u8Arr[i=i+1|0] = (0x2<<6) | (point&0x3f);
										}
										continue;
									}
							} else if (nextcode === 0 && encodedLen <= read) {
								break; // we have reached the end of the string
							} else {
								point = 65533;//0b1111111111111101; // invalid replacement character
							}
						} else if (point <= 0xDFFF) {
							point = 65533/*0b1111111111111101*\/;//return '\xEF\xBF\xBD';//fromCharCode(0xef, 0xbf, 0xbd);
						}
					}
					u8LenLeft = u8LenLeft - 3|0;
					if (0 <= u8LenLeft) {
						u8Arr[i=i+1|0] = (0xe<<<4) | (point>>12);
						u8Arr[i=i+1|0] = (0x2<<6) | ((point>>6)&0x3f);
						u8Arr[i=i+1|0] = (0x2<<6) | (point&0x3f);
					}
				}
			} 
			return {"read": read < 0 ? 0 : u8LenLeft < 0 ? read : read+1|0, "written": i < 0 ? 0 : i+1|0}; */
		}
		TextEncoderPrototype = TextEncoder.prototype;
		TextEncoderPrototype.encode = encode;
		if (ENCODEINTO_BUILD) {
			TextEncoderPrototype.encodeInto = polyfill_encodeInto;
		}
		
		/** bindMethod
		 * A useful way to bind a method on an instance
		 * @param {!Object} inst
		 * @param {!string} name
		 * @param {!Function=} _
		 */
		function bindMethod(inst, name, _) {
			_ = inst[name];
			return function() {
				return _.apply(inst, arguments);
			};
		}
		
		if (ENCODEINTO_BUILD) {
			globalTextEncoderEncodeInto = polyfill_encodeInto;

			if (GlobalTextEncoder) {
				globalTextEncoderInstance = new GlobalTextEncoder();
				globalTextEncoderEncodeInto = (
					globalTextEncoderInstance.encodeInto
					? bindMethod(globalTextEncoderInstance, "encode")
					: GlobalTextEncoder.prototype.encodeInto = function(string, u8arr) {
						// Unfortunately, there's no way I can think of to quickly extract the number of bits written and the number of bytes read and such
						const strLen = string.length|0; const u8Len = u8arr.length|0;
						if (strLen < (u8Len >> 1)) { // in most circumstances, this means its safe. there are still edge-cases which are possible
							// in many circumstances, we can use the faster native TextEncoder
							const res8 = globalTextEncoderInstance.encode(string);
							const res8Len = res8.length|0;
							if (res8Len < u8Len) { // if we dont have to worry about read/written
								u8arr.set( res8 );
								return {
									read: strLen,
									written: res8.length|0
								};
							}
						}
						return polyfill_encodeInto(string, u8arr);
					}
				);
			} // else globalTextEncoderEncodeInto is polyfill_encodeInto
		}
		
		function factory(obj) {
			obj.TextDecoder = GlobalTextDecoder || TextDecoder;
			obj.TextEncoder = GlobalTextEncoder || TextEncoder;
			if (obj !== global) {
				obj.decode = decode;
				obj.encode = GlobalTextEncoder ? bindMethod(ENCODEINTO_BUILD ? globalTextEncoderInstance : new GlobalTextEncoder(), "encode") : encode;
				if (ENCODEINTO_BUILD) { obj.encodeInto = globalTextEncoderEncodeInto; }
			}
			return obj;
		}

		typeof exports === 'object' && typeof module !== 'undefined'
? factory(module.exports)
			: (typeof define === typeof factory && typeof define === "function" && define.amd
? define(function(){
				return factory({});
			})
			: factory(global));
	}
})(typeof global === "" + void 0 ? (typeof self === "" + void 0 ? this || {} : self) : global);