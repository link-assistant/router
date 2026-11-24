// Primitive-string projection into the shared bounded Unicode scalar model.
import {
 acceptSourceTextScalarUnits,readSourceTextByteLength as numericLength,
 readSourceTextByte as numericByte,acceptSourceTextByteSlice,readSourceTextCodeUnitOffset,acceptSourceTextUnitCount,
} from './source-text-byte-rules.js';

/** Return the actual UTF-16 units of primitive Unicode scalar text. */
export function readSourceTextUnits(text){
 if(typeof text!=='string')throw new TypeError('source text must be a primitive string');
 if(!acceptSourceTextUnitCount(text.length))throw new TypeError('source text exceeds the bounded Unicode code unit model');
 const units=[];for(let index=0;index<text.length;index++)units.push(text.charCodeAt(index));
 if(!acceptSourceTextScalarUnits(units))throw new TypeError('source text contains an unpaired Unicode surrogate');
 return units;
}
/** UTF-8 length without replacement, normalization or grapheme segmentation. */
export function readSourceTextByteLength(text){return numericLength(readSourceTextUnits(text));}
/** An exact UTF-8 byte, or null for an invalid numeric byte position. */
export function readSourceTextByte(text,offset){
 const units=readSourceTextUnits(text);if(typeof offset!=='number')return null;
 const byte=numericByte(units,offset);return byte<0?null:byte;
}
/** An unchanged substring at ordered UTF-8 byte boundaries, or null. */
export function sliceSourceTextBytes(text,start,end){
 const units=readSourceTextUnits(text);
 if(typeof start!=='number'||typeof end!=='number'||!acceptSourceTextByteSlice(units,start,end))return null;
 return text.slice(readSourceTextCodeUnitOffset(units,start),readSourceTextCodeUnitOffset(units,end));
}
