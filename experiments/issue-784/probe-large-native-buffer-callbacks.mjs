// Finite closed-projection diagnostic. Run sequentially after receiving.
// Two bounded byte inputs straddle the unchanged 1 MiB interning limit.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as wire from '../../tools/translation/test/fixtures/complete-native-buffer-json-dag-hook-wire.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const names=['valueOf','buffer','byteOffset','byteLength','toString','copy',
 'subarray','base64Slice',Symbol.toPrimitive,Symbol.iterator];
const results=[];
for(const length of [1048576,1048577]){
 const original=Buffer.alloc(length);
 for(let at=0;at<length;at++)original[at]=(at*71+255)%256;
 const nativeJson=JSON.stringify(original);
 const baseline=wire.encodeCompleteNativeBufferJsonDagHookWire(original);
 const cases=[];
 for(const name of names){
  const value=Buffer.from(original),callbacks=[];
  Object.defineProperty(value,name,{configurable:true,enumerable:true,
   get(){callbacks.push(String(name));throw Error('ignored native Buffer field '+String(name));}});
  let encoded=null,error=null;
  try{encoded=wire.encodeCompleteNativeBufferJsonDagHookWire(value);}
  catch(caught){error={name:caught.name,message:caught.message};}
  const observedCallbacks=[...callbacks];callbacks.length=0;
  let nativeValue=null,nativeError=null;
  try{nativeValue=JSON.stringify(value);}
  catch(caught){nativeError={name:caught.name,message:caught.message};}
  const nativeCallbacks=[...callbacks];
  cases.push({name:String(name),error,callbacks:observedCallbacks,nativeError,nativeCallbacks,
   nativeMatchesCompleteBaseline:nativeValue===nativeJson,
   unexpectedCompleteNativeJson:nativeValue!==null&&nativeValue!==nativeJson?nativeValue:null,
   matchesCompleteBaseline:encoded===baseline,
   encodedSha256:encoded===null?null:sha(encoded),
   unexpectedCompleteWire:encoded!==null&&encoded!==baseline?encoded:null});
 }
 results.push({length,completeInputBase64:original.toString('base64'),
  completeNativeJson:nativeJson,completeBaselineWire:baseline,cases});
}
const record={schema:'large-native-Buffer-ignored-field-diagnostic-v2',
 completeCodecSource:readFileSync(new URL('../../tools/translation/test/fixtures/complete-native-buffer-json-dag-hook-wire.mjs',import.meta.url),'utf8'),
 completeProbeSource:readFileSync(new URL(import.meta.url),'utf8'),
 node:process.versions.node,bun:process.versions.bun??null,results,
 sourceInstalled:false,receivingQualified:false,performanceQualified:false,
 originalBoundsChanged:false,productionExecutableGain:0};
const raw=Buffer.from(JSON.stringify(record)),packed=gzipSync(raw,{mtime:0});
assert.deepEqual(gunzipSync(packed),raw);
const engine=process.versions.bun?'bun':'node';
const path='ci-logs/issue-784-restart-2/large-native-buffer-callbacks-v2-'+engine+'.json.gz';
writeFileSync(path,packed,{flag:'wx'});
const failed=results.flatMap(row=>row.cases.filter(item=>item.callbacks.length||
 (item.nativeCallbacks.length||item.nativeError?item.error===null:item.error||!item.matchesCompleteBaseline)).map(item=>({length:row.length,...item})));
console.log(JSON.stringify({path,sha256:sha(packed),cases:20,failures:failed.map(({unexpectedCompleteWire,unexpectedCompleteNativeJson,...item})=>item)}));
process.exitCode=failed.length?1:0;
