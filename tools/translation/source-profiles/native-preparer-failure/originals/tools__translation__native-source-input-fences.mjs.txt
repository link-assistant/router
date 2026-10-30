// Invocation-local source-input end guards. No source/owner/verdict is cached.
import {readFileSync} from 'node:fs';
import {resolve,isAbsolute} from 'node:path';
import {types} from 'node:util';
const read=readFileSync,MAX_FILES=4096,MAX_BYTES=134217728,MAX_FILE_BYTES=8388608;
let active=null;
const fail=message=>{throw new TypeError('Native source input fence: '+message);};
function actual(path,expected){try{return read(path,typeof expected==='string'?'utf8':undefined);}catch(error){if(expected===null&&error.code==='ENOENT')return null;throw error;}}
function equal(left,right){if(left===null||right===null)return left===right;if(typeof left==='string'&&typeof right==='string')return left===right;const a=typeof left==='string'?Buffer.from(left):left,b=typeof right==='string'?Buffer.from(right):right;return Buffer.isBuffer(a)&&Buffer.isBuffer(b)&&a.equals(b);}
export function retainNativeSourceInputFence(path,expected){
 if(!active)return false;if(active.finalizing)fail('capture is closed during final source checks');
 if(typeof path!=='string'||!isAbsolute(path)||path.includes('\0'))fail('absolute physical source path required');path=resolve(path);
 if(expected!==null&&typeof expected!=='string'&&(!Buffer.isBuffer(expected)||types.isProxy(expected)))fail('complete source string bytes or known absence required');
 const bytes=expected===null?0:typeof expected==='string'?Buffer.byteLength(expected):expected.length;if(bytes>MAX_FILE_BYTES)fail('original per-file input bound');
 const previous=active.files.get(path);if(previous){if(!equal(previous.expected,expected))fail('one input changed within the same source operation: '+path);return true;}
 if(active.files.size>=MAX_FILES||active.bytes+bytes>MAX_BYTES)fail('complete operation input bound');
 active.files.set(path,{expected:Buffer.isBuffer(expected)?Buffer.from(expected):expected});active.bytes+=bytes;return true;
}
export function withNativeSourceInputFences(operation){
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('synchronous original source operation required');
 const invoke=()=>{const result=operation();if(types.isPromise(result)||result&&typeof result==='object'&&types.isProxy(result))fail('source operation must finish synchronously');if(result&&typeof result==='object'){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;};
 if(active){if(active.finalizing)fail('capture is closed during final source checks');return invoke();}
 const frame={files:new Map(),bytes:0,finalizing:false};active=frame;let failed=false;
 try{return invoke();}catch(error){failed=true;throw error;}
 finally{
  frame.finalizing=true;let fenceFailed=false,firstError;
  try{for(const [path,row] of frame.files){try{if(!equal(row.expected,actual(path,row.expected)))fail('complete original input changed before operation completion: '+path);}catch(error){if(!fenceFailed){fenceFailed=true;firstError=error;}}}}
  finally{frame.files.clear();frame.bytes=0;active=null;}
  // Check every input and preserve the primary error, even null/undefined.
  if(!failed&&fenceFailed)throw firstError;
 }
}
