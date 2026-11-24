// Complete test reports, kept as bounded lossless reference/string envelopes.
// No compiler proof, source owner or positive admission is issued here.
import assert from 'node:assert/strict';
import {types,isDeepStrictEqual} from 'node:util';
import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync,openSync,closeSync,readSync,fstatSync,constants} from 'node:fs';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {withIndexedReferenceProof} from './report-reference-file-cursor.mjs';
const WIRE_BYTES=8*1024*1024,ENVELOPE_BYTES=64*1024*1024,WINDOW_BYTES=64*1024;
export function packReport(root){
 const strings=[],stringIds=new Map(),nodes=[],objects=[],ids=new Map();
 const string=value=>{let id=stringIds.get(value);if(id===undefined){if(strings.length>=500000)throw Error('report string bound');id=strings.length;strings.push(value);stringIds.set(value,id);}return id;};
 function value(item){
  if(item===null)return [0];if(item===undefined)return [1];
  if(typeof item==='boolean')return [2,item];
  if(typeof item==='number')return [3,Number.isNaN(item)?'NaN':item===Infinity?'+Infinity':item===-Infinity?'-Infinity':Object.is(item,-0)?'-0':item];
  if(typeof item==='string')return [4,string(item)];if(typeof item==='bigint')return [6,string(item.toString())];
  if(typeof item!=='object'||types.isProxy(item))throw Error('unsupported report scalar/proxy');
  let id=ids.get(item);if(id===undefined){if(objects.length>=1000000)throw Error('report node bound');id=objects.length;objects.push(item);ids.set(item,id);}return [5,id];
 }
 const selected=value(root);let cells=0;
 for(let at=0;at<objects.length;at++){
  const item=objects[at],prototype=Object.getPrototypeOf(item),array=Array.isArray(item);if(array&&prototype!==Array.prototype)throw Error('unsupported report array prototype');const kind=array?2:prototype===null?0:prototype===Object.prototype?1:-1;if(kind<0)throw Error('unsupported report prototype');
  const fields=[];for(const key of Reflect.ownKeys(item)){
   if(typeof key!=='string'||++cells>4000000)throw Error('report key/cell bound');const field=Object.getOwnPropertyDescriptor(item,key);if(!field||!Object.hasOwn(field,'value'))throw Error('unsupported report accessor');
   fields.push([string(key),(field.enumerable?1:0)|(field.configurable?2:0)|(field.writable?4:0),value(field.value)]);
  }
  nodes.push([kind,Object.isExtensible(item),fields]);
 }
 return {schema:'complete-report-reference-v1',strings,nodes,root:selected};
}
export function validateReportEnvelope(envelope){
 const own=(object,key)=>{if(!object||typeof object!=='object'||types.isProxy(object))throw Error('report own-data required');const field=Object.getOwnPropertyDescriptor(object,key);if(!field||!Object.hasOwn(field,'value'))throw Error('report accessor/missing field');return field.value;};
 const array=(value,maximum,exact=null)=>{if(!value||typeof value!=='object'||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw Error('report dense array required');const length=own(value,'length');if(!Number.isSafeInteger(length)||length<0||length>maximum||exact!==null&&length!==exact||Reflect.ownKeys(value).length!==length+1)throw Error('report array shape');for(let at=0;at<length;at++)own(value,String(at));return value;};
 if(!envelope||typeof envelope!=='object'||types.isProxy(envelope)||Object.getPrototypeOf(envelope)!==Object.prototype||Reflect.ownKeys(envelope).length!==4||own(envelope,'schema')!=='complete-report-reference-v1')throw Error('report envelope shape');
 const strings=array(own(envelope,'strings'),500000),nodes=array(own(envelope,'nodes'),1000000),root=own(envelope,'root');let cells=0;
 for(const text of strings)if(typeof text!=='string')throw Error('report string required');
 const index=(id,length)=>{if(!Number.isSafeInteger(id)||id<0||id>=length)throw Error('report reference bound');return id;};
 function validate(item){array(item,2);const tag=own(item,'0');if(!Number.isSafeInteger(tag)||tag<0||tag>6||item.length!==(tag<2?1:2))throw Error('report scalar tag');if(tag<2)return;const payload=own(item,'1');if(tag===2&&typeof payload!=='boolean'||tag===3&&!(typeof payload==='number'&&Number.isFinite(payload)||['NaN','+Infinity','-Infinity','-0'].includes(payload)))throw Error('report scalar payload');if(tag===4||tag===6)index(payload,strings.length);if(tag===5)index(payload,nodes.length);if(tag===6&&!/^-?(?:0|[1-9][0-9]*)$/u.test(strings[payload]))throw Error('report bigint payload');}
 validate(root);const keys=new Set();
 for(const node of nodes){array(node,3,3);const kind=own(node,'0'),extensible=own(node,'1'),fields=array(own(node,'2'),4000000);if(![0,1,2].includes(kind)||typeof extensible!=='boolean')throw Error('report node shape');keys.clear();let length=null;
  for(const field of fields){array(field,3,3);const key=strings[index(own(field,'0'),strings.length)],flags=own(field,'1'),value=own(field,'2');if(keys.has(key)||!Number.isSafeInteger(flags)||flags<0||flags>7)throw Error('report descriptor shape');keys.add(key);validate(value);if(++cells>4000000)throw Error('report cell bound');if(kind===2&&key==='length'){if(flags!==0&&flags!==4||value[0]!==3||!Number.isSafeInteger(value[1])||value[1]<0||value[1]>4294967295)throw Error('report array length');length=value[1];}}
  if(kind===2){if(length===null)throw Error('report missing array length');for(const key of keys)if(/^(?:0|[1-9][0-9]*)$/u.test(key)&&Number(key)<4294967295&&Number(key)>=length)throw Error('report array index exceeds length');}
 }
 return {strings,nodes,root};
}
export function unpackReport(envelope){
 const {strings,nodes,root}=validateReportEnvelope(envelope),allocated=nodes.map(node=>node[0]===2?[]:Object.create(node[0]===0?null:Object.prototype));
 const read=item=>{switch(item[0]){case 0:return null;case 1:return undefined;case 2:return item[1];case 3:return item[1]==='NaN'?NaN:item[1]==='+Infinity'?Infinity:item[1]==='-Infinity'?-Infinity:item[1]==='-0'?-0:item[1];case 4:return strings[item[1]];case 5:return allocated[item[1]];case 6:return BigInt(strings[item[1]]);}};
 for(let at=0;at<nodes.length;at++){const [,extensible,fields]=nodes[at],object=allocated[at];for(const [key,flags,value] of fields)Object.defineProperty(object,strings[key],{value:read(value),enumerable:!!(flags&1),configurable:!!(flags&2),writable:!!(flags&4)});if(!extensible)Object.preventExtensions(object);}
 return read(root);
}

// Called inside the existing proof child, after its crypto observer is restored.
// Success retains the second complete envelope by an exact byte-equal reference.
// Failure includes the actual alternative instead of replacing it with a digest.
export function referenceProofReport(report,{canonicalJson=false}={}){
 const envelope=packReport(report);let alternative=null,checks,roundtrip=null;
 try{
  const restored=unpackReport(envelope);roundtrip=packReport(restored);
  const originalEncoded=JSON.stringify(envelope),roundtripEncoded=JSON.stringify(roundtrip);
  const envelopeByteEqual=originalEncoded===roundtripEncoded,dataEqual=isDeepStrictEqual(restored,report);
  checks={envelopeByteEqual,dataEqual,envelopeBytes:Buffer.byteLength(originalEncoded),roundtrip:{representation:'exact-byte-reference',target:'report'}};
  if(canonicalJson){
   const originalJson=JSON.stringify(report),restoredJson=JSON.stringify(restored);
   checks.canonicalJsonByteEqual=originalJson===restoredJson;
   checks.canonicalJsonBytes=Buffer.byteLength(originalJson);
  }
  if(!envelopeByteEqual||!dataEqual||canonicalJson&&!checks.canonicalJsonByteEqual)alternative=roundtrip;
 }catch(error){checks={error:{name:error.name,message:error.message,stack:error.stack??null},partialRoundtrip:roundtrip===null};alternative=roundtrip;}
 return {schema:'validated-reference-proof-report-v1',report:envelope,checks,alternative};
}
export function writeReferenceProofReport(report,options){process.stdout.write(gzipSync(JSON.stringify(referenceProofReport(report,options))));}


function exclusive(path,bytes){writeFileSync(path,bytes,{flag:'wx'});return path;}
const identity=stat=>({dev:stat.dev,ino:stat.ino,size:stat.size,mtimeMs:stat.mtimeMs,ctimeMs:stat.ctimeMs});
const sameIdentity=(before,after)=>before.dev===after.dev&&before.ino===after.ino&&before.size===after.size&&before.mtimeMs===after.mtimeMs&&before.ctimeMs===after.ctimeMs;
export function runReferenceProof({name,code,execPath,directory,provenance=null}){
 mkdirSync(directory,{recursive:true});
 const codePath=exclusive(join(directory,name+'.code.mjs'),code),wirePath=join(directory,name+'.wire.gz'),envelopePath=join(directory,name+'.envelope.json');
 let wire;
 try{wire=execFileSync(execPath,['--input-type=module','-'],{input:code,timeout:10000,maxBuffer:WIRE_BYTES});}
 catch(error){
  const stdoutPath=exclusive(join(directory,name+'.partial-stdout.bin'),Buffer.from(error.stdout??[])),stderrPath=exclusive(join(directory,name+'.partial-stderr.bin'),Buffer.from(error.stderr??[]));
  exclusive(join(directory,name+'.failed.json'),JSON.stringify({codePath,execPath,stdoutPath,stderrPath,error:{name:error.name,message:error.message,status:error.status,signal:error.signal},partial:true}));throw error;
 }
 exclusive(wirePath,wire);
 // Keep the complete wire even if bounded decompression or parsing fails.
 const decoded=gunzipSync(wire,{maxOutputLength:ENVELOPE_BYTES});exclusive(envelopePath,decoded);let envelopeIdentity;const fd=openSync(envelopePath,constants.O_RDONLY|(constants.O_NOFOLLOW??0));try{envelopeIdentity=identity(fstatSync(fd));}finally{closeSync(fd);}
 const record={codePath,wirePath,envelopePath,envelopeIdentity,execPath,provenance,codeBytes:Buffer.byteLength(code),codeSha256:createHash('sha256').update(code).digest('hex'),wireBytes:wire.length,wireSha256:createHash('sha256').update(wire).digest('hex'),envelopeBytes:decoded.length,representation:'validated-reference-proof-report-v1',limits:{childMs:10000,wireBytes:WIRE_BYTES,envelopeBytes:ENVELOPE_BYTES}};
 exclusive(join(directory,name+'.artifact.json'),JSON.stringify(record));return record;
}

// Compare every byte, including all bytes after the first mismatch, using two
// fixed windows. Neither old expectation nor reconstructed proof stays in RAM.
export function compareReferenceProofFiles(expected,actual){
 const flags=constants.O_RDONLY|(constants.O_NOFOLLOW??0),left=openSync(expected.envelopePath,flags);let right;
 try{
  right=openSync(actual.envelopePath,flags);
  const beforeLeft=fstatSync(left),beforeRight=fstatSync(right);
  if(!beforeLeft.isFile()||!beforeRight.isFile()||beforeLeft.size>ENVELOPE_BYTES||beforeRight.size>ENVELOPE_BYTES||beforeLeft.size!==expected.envelopeBytes||beforeRight.size!==actual.envelopeBytes||expected.envelopeIdentity&&!sameIdentity(expected.envelopeIdentity,beforeLeft)||actual.envelopeIdentity&&!sameIdentity(actual.envelopeIdentity,beforeRight))throw Error('reference report file bound/type');
  const a=Buffer.allocUnsafe(WINDOW_BYTES),b=Buffer.allocUnsafe(WINDOW_BYTES);let offset=0,firstMismatch=null,comparedBytes=0;
  while(offset<Math.max(beforeLeft.size,beforeRight.size)){
   const na=readSync(left,a,0,Math.min(WINDOW_BYTES,Math.max(0,beforeLeft.size-offset)),offset),nb=readSync(right,b,0,Math.min(WINDOW_BYTES,Math.max(0,beforeRight.size-offset)),offset),length=Math.max(na,nb);
   if(na!==Math.min(WINDOW_BYTES,Math.max(0,beforeLeft.size-offset))||nb!==Math.min(WINDOW_BYTES,Math.max(0,beforeRight.size-offset))||length===0)throw Error('reference report truncated/short read during byte comparison');
   for(let at=0;at<length;at++)if(at>=na||at>=nb||a[at]!==b[at]){if(firstMismatch===null)firstMismatch=offset+at;}
   offset+=length;comparedBytes+=length;
  }
  const afterLeft=fstatSync(left),afterRight=fstatSync(right);
  if(!sameIdentity(beforeLeft,afterLeft)||!sameIdentity(beforeRight,afterRight))throw Error('reference report changed during byte comparison');
  const result={expected,actual,expectedBytes:beforeLeft.size,actualBytes:beforeRight.size,comparedBytes,firstMismatch,equal:firstMismatch===null&&beforeLeft.size===beforeRight.size,windowBytes:WINDOW_BYTES,expectedIdentity:identity(beforeLeft),actualIdentity:identity(beforeRight)};
  exclusive(actual.envelopePath+'.comparison.json',JSON.stringify(result));return result;
 }finally{closeSync(left);if(right!==undefined)closeSync(right);}
}

// Every byte and codec cell is validated through the bounded file index. All
// child-side reconstruction and full byte-wise old/current comparison remain.
export function withReferenceProof(record,callback,options){
 return withIndexedReferenceProof(record,callback,options);
}
