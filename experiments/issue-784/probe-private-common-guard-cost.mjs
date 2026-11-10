// Finite diagnostic only. This never installs compiler source or qualifies it.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,rmSync,rmdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const sourcePath='tools/translation/original-json-intrinsics.mjs';
const before=readFileSync(sourcePath,'utf8');
const declaration='export function originalPrivateParserNumericCommonIntrinsicsUnchanged(){';
const start=before.indexOf(declaration),end=before.indexOf('\n}\n',start)+3;
assert.ok(start>=0&&end>start);
assert.equal(before.indexOf(declaration,start+1),-1);
const original=before.slice(start,end);
let candidate=original.replace(declaration,
 'export function probePrivateParserKindCommonIntrinsicsUnchanged(){');
const ingress=' if(!originalPrivateParserIngressUnchanged())return false;';
assert.equal(candidate.split(ingress).length,2);
candidate=candidate.replace(ingress,ingress+
 '\n  if(!descriptorBatchingReady())return originalPrivateParserNumericCommonIntrinsicsUnchanged();');
candidate=candidate.replaceAll('expectedNamespaceTraversalIntrinsicsUnchanged()',
 'kindBatchedExpectedNamespaceTraversalIntrinsicsUnchanged()');
candidate=candidate.replaceAll('expectedSamePrototype(',
 'kindBatchedExpectedSamePrototype(');
const append='\n// Uninstalled, unqualified finite cost probe.\n'+candidate;
const after=before+append,inverse=after.slice(0,-append.length);
assert.equal(inverse,before);
assert.ok(after.split('\n').length<1000);
const directory=resolve('ci-logs/issue-784-restart-2/private-common-guard-cost-runtime');
mkdirSync(directory);
const path=resolve(directory,'complete-common.mjs');
writeFileSync(path,after,{flag:'wx'});
assert.equal(readFileSync(path,'utf8'),after);
const subject=await import(pathToFileURL(path).href);
const functions=[
 ['numeric',subject.originalPrivateParserNumericCommonIntrinsicsUnchanged],
 ['descriptors',subject.originalPrivateParserDescriptorCommonIntrinsicsUnchanged],
 ['kind',subject.probePrivateParserKindCommonIntrinsicsUnchanged],
];
const cold=functions.map(([name,fn])=>({name,result:fn()}));
assert.ok(cold.every(row=>row.result===true));
const iterations=256,rounds=6,timings=[];
for(let round=0;round<rounds;round++){
 // Rotate order to make warm-up/order effects visible; no current result caches.
 for(let slot=0;slot<functions.length;slot++){
  const [name,fn]=functions[(slot+round)%functions.length];
  const start=process.hrtime.bigint();let positives=0;
  for(let at=0;at<iterations;at++)if(fn())positives++;
  const elapsedNs=String(process.hrtime.bigint()-start);
  assert.equal(positives,iterations);
  timings.push({round,slot,name,iterations,positives,elapsedNs});
 }
}
const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const owners=[Array.prototype,Map.prototype,Set.prototype,WeakSet.prototype,
 String.prototype,RegExp.prototype];
const observations=[];let callbacks=0;
function observe(label,owner,key,replacement){
 const prior=get(owner,key);let changed;
 try{define(owner,key,replacement);changed=functions.map(([name,fn])=>({name,result:fn()}));}
 finally{if(prior)define(owner,key,prior);else Reflect.deleteProperty(owner,key);}
 const restored=functions.map(([name,fn])=>({name,result:fn()}));
 assert.equal(changed[1].result,changed[0].result);
 assert.equal(changed[2].result,changed[0].result);
 assert.ok(restored.every(row=>row.result===true));
 observations.push({label,key:String(key),changed,restored});
}
for(let at=0;at<owners.length;at++){
 const owner=owners[at],key=Reflect.ownKeys(owner).find(key=>typeof key==='string'
  &&key!=='constructor'&&get(owner,key).configurable
  &&Object.hasOwn(get(owner,key),'value')&&typeof get(owner,key).value==='function');
 assert.notEqual(key,undefined);
 const field=get(owner,key);
 observe('owner-'+at+'-value',owner,key,{...field,value:function(){callbacks++;}});
 observe('owner-'+at+'-accessor',owner,key,{get(){callbacks++;return field.value;},
  set(){callbacks++;},enumerable:field.enumerable,configurable:true});
 observe('owner-'+at+'-writable',owner,key,{...field,writable:!field.writable});
 observe('owner-'+at+'-enumerable',owner,key,{...field,enumerable:!field.enumerable});
 observe('owner-'+at+'-unknown',owner,'unknownGuardCostProbe',
  {get(){callbacks++;throw new Error('must not read');},configurable:true});
}
const json=get(JSON,'stringify');
observe('JSON-hook',JSON,'stringify',{...json,value:function(...args){
 callbacks++;return Reflect.apply(json.value,this,args);
}});
observe('inherited-writable',Object.prototype,'writable',
 {get(){callbacks++;return false;},configurable:true});
assert.equal(callbacks,0);
assert.equal(readFileSync(sourcePath,'utf8'),before);
const hash=value=>createHash('sha256').update(value).digest('hex');
const record={schema:'finite-private-common-guard-cost-diagnostic-v1',
 sourcePath,before,after,append,inverse,beforeSha256:hash(before),afterSha256:hash(after),
 iterations,rounds,cold,timings,observations,callbacks,
 runtimeGrammarChecked:true,nativeGrammarChecked:false,concreteSyntaxChecked:false,
 sourceInstalled:false,receivingQualified:false,performanceQualified:false,
 productionExecutableGain:0,runtimeParity:false,rustExecuted:false};
const raw=Buffer.from(JSON.stringify(record)+'\n'),packed=gzipSync(raw,{level:9});
assert.deepEqual(gunzipSync(packed),raw);
const output=resolve('ci-logs/issue-784-restart-2/private-common-guard-cost-diagnostic.json.gz');
writeFileSync(output,packed,{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output)),raw);
rmSync(path);rmdirSync(directory);
console.log(JSON.stringify({output,rawBytes:raw.length,packedBytes:packed.length,
 rawSha256:hash(raw),timings,observations:observations.length,
 sourceInstalled:false,performanceQualified:false}));
