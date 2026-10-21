// Lossless test-observation transport only. Every complete callback payload is
// retained; compression changes storage, never a test workload or its limits.
import {createHash} from 'node:crypto';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
const stringify=JSON.stringify,parse=JSON.parse,hash=value=>createHash('sha256').update(value).digest('hex');
const LEAF=1024*1024,STORED=64*1024*1024,LOGICAL=384*1024*1024,SCHEMA='complete-hook-observation-brotli-frames-v2';
function fail(){throw TypeError('Complete hook wire: full bounded payload/frame equation differs');}
function keys(value,names){if(!value||typeof value!=='object'||Array.isArray(value)||stringify(Object.keys(value))!==stringify(names))fail();}
export function encodeCompleteHookWire(value){
 const raw=Buffer.from(stringify(value));if(!raw.length||raw.length>LOGICAL)fail();const frames=[];let stored=0;
 for(let at=0;at<raw.length;at+=LEAF){
  const chunk=raw.subarray(at,Math.min(raw.length,at+LEAF)),packed=brotliCompressSync(chunk,{params:{[constants.BROTLI_PARAM_QUALITY]:4}});
  if((stored+=packed.length)>STORED||!brotliDecompressSync(packed,{maxOutputLength:LEAF}).equals(chunk))fail();
  frames.push({ordinal:frames.length,rawBytes:chunk.length,rawSha256:hash(chunk),storedBytes:packed.length,storedSha256:hash(packed),brotli:packed.toString('base64')});
 }
 const result=stringify({schema:SCHEMA,rawBytes:raw.length,rawSha256:hash(raw),frames});if(Buffer.byteLength(result)>STORED)fail();return result;
}
function envelope(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>STORED)fail();const value=parse(text);if(stringify(value)!==text)fail();keys(value,['schema','rawBytes','rawSha256','frames']);
 if(value.schema!==SCHEMA||!Number.isSafeInteger(value.rawBytes)||value.rawBytes<1||value.rawBytes>LOGICAL||!Array.isArray(value.frames)||value.frames.length!==Math.ceil(value.rawBytes/LEAF))fail();return value;
}
function* leaves(value){
 let stored=0,logical=0;const complete=createHash('sha256');
 for(const [at,row]of value.frames.entries()){
  keys(row,['ordinal','rawBytes','rawSha256','storedBytes','storedSha256','brotli']);
  if(row.ordinal!==at||row.rawBytes!==Math.min(LEAF,value.rawBytes-logical)||!Number.isSafeInteger(row.storedBytes)||row.storedBytes<1||row.storedBytes>LEAF+65536||typeof row.brotli!=='string'||row.brotli.length>Math.ceil((LEAF+65536)/3)*4)fail();
  const packed=Buffer.from(row.brotli,'base64');if(packed.toString('base64')!==row.brotli||packed.length!==row.storedBytes||hash(packed)!==row.storedSha256||(stored+=packed.length)>STORED)fail();
  const raw=brotliDecompressSync(packed,{maxOutputLength:LEAF});if(raw.length!==row.rawBytes||hash(raw)!==row.rawSha256)fail();complete.update(raw);logical+=raw.length;yield raw;
 }
 if(logical!==value.rawBytes||complete.digest('hex')!==value.rawSha256)fail();
}
export function decodeCompleteHookWire(text){
 const value=envelope(text),raw=Buffer.allocUnsafe(value.rawBytes);let at=0;
 for(const chunk of leaves(value)){chunk.copy(raw,at);at+=chunk.length;}
 const source=raw.toString('utf8'),result=parse(source);if(stringify(result)!==source)fail();return result;
}
// Compare every decoded byte, not only digests. Finish both streams even after
// a difference, so every original frame still gets an independent readback.
// Only the caller's baseline needs to become a large parsed callback record.
export function compareCompleteHookWires(leftText,rightText){
 const left=envelope(leftText),right=envelope(rightText),a=leaves(left),b=leaves(right);let equal=true;
 for(;;){const x=a.next(),y=b.next();if(x.done&&y.done)break;if(x.done||y.done||!x.value.equals(y.value))equal=false;}
 if(!equal)throw TypeError('Complete hook wire: complete decoded bytes differ');
 return {left:{storedBytes:Buffer.byteLength(leftText),logicalBytes:left.rawBytes,frames:left.frames.length},right:{storedBytes:Buffer.byteLength(rightText),logicalBytes:right.rawBytes,frames:right.frames.length}};
}
