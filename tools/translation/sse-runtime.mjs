// Exact native block framing: pending tails remain bytes, never decoded chunks.
import {json_macro_array,json_macro_object,json_macro_string} from './json-macro-runtime.mjs';
const MAX_BUFFER=1048576,MAX_ENCODED=1398104,MAX_BLOCKS=1024;
const ok=field0=>Object.freeze({$:'Ok',field0}),err=field0=>Object.freeze({$:'Err',field0});
function input(value){if(typeof value!=='string'||/\p{Surrogate}/u.test(value))throw new TypeError('Actual Rust Unicode scalar string required');return value;}
function decode(value){if(value.length%4!==0)return null;const bytes=Buffer.from(value,'base64');return bytes.toString('base64')===value?bytes:null;}
export function router_sse_push_base64(pending,chunk){
 input(pending);input(chunk);if(Buffer.byteLength(pending,'utf8')>MAX_ENCODED||Buffer.byteLength(chunk,'utf8')>MAX_ENCODED)return err('SSE buffer exceeds limit');const before=decode(pending);if(before===null)return err('invalid SSE pending base64');const next=decode(chunk);if(next===null)return err('invalid SSE chunk base64');if(before.length+next.length>MAX_BUFFER)return err('SSE buffer exceeds limit');
 const buffer=Buffer.concat([before,next]),blocks=[];let start=0;
 // One linear pass chooses the earliest native CRLFCRLF or LFLF delimiter.
 for(let at=0;at<buffer.length;at++){
  const crlf=buffer[at]===13&&buffer[at+1]===10&&buffer[at+2]===13&&buffer[at+3]===10,lf=buffer[at]===10&&buffer[at+1]===10;if(!crlf&&!lf)continue;
  blocks.push(json_macro_string(new TextDecoder('utf-8',{ignoreBOM:true}).decode(buffer.subarray(start,at))));if(blocks.length>MAX_BLOCKS)return err('SSE block count exceeds limit');at+=crlf?3:1;start=at+1;
 }
 return ok(json_macro_object([['pending',json_macro_string(buffer.subarray(start).toString('base64'))],['blocks',json_macro_array(blocks)]]));
}
