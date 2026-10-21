// Lossless test-observation transport only. Every complete callback payload is
// retained; compression changes storage, never a test workload or its limits.
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const stringify=JSON.stringify,parse=JSON.parse,hash=value=>createHash('sha256').update(value).digest('hex'),LEAF=1024*1024,STORED=64*1024*1024,LOGICAL=384*1024*1024,SCHEMA='complete-hook-observation-gzip-frames-v1';
function fail(){throw TypeError('Complete hook wire: full bounded payload/frame equation differs');}
function keys(value,names){if(!value||typeof value!=='object'||Array.isArray(value)||stringify(Object.keys(value))!==stringify(names))fail();}
export function encodeCompleteHookWire(value){
 const raw=Buffer.from(stringify(value));if(!raw.length||raw.length>LOGICAL)fail();const frames=[];let stored=0;
 for(let at=0;at<raw.length;at+=LEAF){const chunk=raw.subarray(at,Math.min(raw.length,at+LEAF)),packed=gzipSync(chunk,{level:1,mtime:0});if((stored+=packed.length)>STORED||!gunzipSync(packed,{maxOutputLength:LEAF}).equals(chunk))fail();frames.push({ordinal:frames.length,rawBytes:chunk.length,rawSha256:hash(chunk),storedBytes:packed.length,storedSha256:hash(packed),gzip:packed.toString('base64')});}
 const result=stringify({schema:SCHEMA,rawBytes:raw.length,rawSha256:hash(raw),frames});if(Buffer.byteLength(result)>STORED)fail();return result;
}
export function decodeCompleteHookWire(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>STORED)fail();const value=parse(text);if(stringify(value)!==text)fail();keys(value,['schema','rawBytes','rawSha256','frames']);if(value.schema!==SCHEMA||!Number.isSafeInteger(value.rawBytes)||value.rawBytes<1||value.rawBytes>LOGICAL||!Array.isArray(value.frames)||value.frames.length!==Math.ceil(value.rawBytes/LEAF))fail();let stored=0,logical=0;const chunks=[];
 for(const [at,row]of value.frames.entries()){keys(row,['ordinal','rawBytes','rawSha256','storedBytes','storedSha256','gzip']);if(row.ordinal!==at||row.rawBytes!==Math.min(LEAF,value.rawBytes-logical)||!Number.isSafeInteger(row.storedBytes)||row.storedBytes<1||row.storedBytes>LEAF+65536||typeof row.gzip!=='string'||row.gzip.length>Math.ceil((LEAF+65536)/3)*4)fail();const packed=Buffer.from(row.gzip,'base64');if(packed.toString('base64')!==row.gzip||packed.length!==row.storedBytes||hash(packed)!==row.storedSha256||(stored+=packed.length)>STORED)fail();const raw=gunzipSync(packed,{maxOutputLength:LEAF});if(raw.length!==row.rawBytes||hash(raw)!==row.rawSha256)fail();chunks.push(raw);logical+=raw.length;}
 const raw=Buffer.concat(chunks);if(logical!==value.rawBytes||hash(raw)!==value.rawSha256)fail();const result=parse(raw);if(stringify(result)!==raw.toString('utf8'))fail();return result;
}
