// Bounded diagnostic of the original four owner proofs. No test qualification.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalPayloadDeriveSelection,originalPayloadDeriveInputs} from '../../tools/translation/test/original-payload-derive-context.mjs';
import {originalCsvContext} from '../../tools/translation/test/original-csv-context.mjs';
import {proveBuiltinDeriveBangFootprint,originalBuiltinDeriveEnclosingOutput} from '../../tools/translation/builtin-derive-bang-footprints.mjs';

const label=process.argv[2];
if(!/^[a-z0-9-]{1,70}$/u.test(label??''))throw Error('A fresh finite label is required');
const prefix='ci-logs/issue-784-restart-2/'+label;
const hash=value=>createHash('sha256').update(value).digest('hex');
const paths=['tools/translation/test/original-payload-derive-context.mjs','tools/translation/builtin-derive-bang-footprints.mjs','tools/translation/derive-footprints.mjs','tools/translation/module-bindings.mjs'];
const sourceInputs=paths.map(path=>({path,source:readFileSync(path,'utf8')}));
const session=new Session();session.connect();
const post=(method,parameters={})=>new Promise((resolve,reject)=>session.post(method,parameters,(error,value)=>error?reject(error):resolve(value)));
const observations=[],start=performance.now();
try{
 await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
 for(const [file,name,count]of [['src/response_affinity.rs','AffinityDestination',7],['src/subscription.rs','InstallDocumentResult',2]])for(const owner of ['Clone','PartialEq']){
  const stages=[];
  function measure(phase,run){const before=performance.now(),value=run();const row={phase,elapsedMs:performance.now()-before};stages.push(row);console.log(JSON.stringify({file,name,owner,...row}));return value;}
  const args=measure('original-complete-context',()=>originalPayloadDeriveSelection({file,name,owner}));
  const proof=measure('whole-owner-proof',()=>proveBuiltinDeriveBangFootprint(args));
  const output=measure('original-enclosing-output',()=>originalBuiltinDeriveEnclosingOutput(proof,args.context,args.certificate,args.invocation));
  const variants=proof.route.typedSource.variants??[{fields:proof.route.typedSource.fields}];
  assert.equal(variants.flatMap(row=>row.fields).length,count);assert.equal(output.sink.kind,'ItemKind::Impl');assert.equal(output.proof.generatedImplBehavior,false);
  observations.push({file,name,owner,stages,proof,output});
 }
 const {profile}=await post('Profiler.stop');
 for(const row of sourceInputs)assert.equal(readFileSync(row.path,'utf8'),row.source);
 const cpu=Buffer.from(JSON.stringify(profile));assert.ok(cpu.length<=64*1024*1024);
 writeFileSync(prefix+'-cpu.json.gz',gzipSync(cpu),{flag:'wx'});
 assert.ok(gunzipSync(readFileSync(prefix+'-cpu.json.gz'),{maxOutputLength:64*1024*1024}).equals(cpu));
 const corpus=originalCsvContext(),record={schema:'original-whole-payload-proof-cpu-diagnostic-v1',sourceInputs,originalInputs:originalPayloadDeriveInputs(),parents:[...new Set(observations.map(row=>row.file))].map(file=>({file,source:corpus.source(file),sha256:hash(corpus.source(file))})),observations,elapsedMs:performance.now()-start,cpuBytes:cpu.length,cpuSha256:hash(cpu),deadlineQualified:false,runtimeParity:false,rustExecuted:false};
 const raw=Buffer.from(JSON.stringify(record));assert.ok(raw.length<=64*1024*1024);
 writeFileSync(prefix+'-result.json.gz',gzipSync(raw),{flag:'wx'});
 assert.ok(gunzipSync(readFileSync(prefix+'-result.json.gz'),{maxOutputLength:64*1024*1024}).equals(raw));
 console.log(JSON.stringify({elapsedMs:record.elapsedMs,cpuBytes:cpu.length,observationCount:observations.length,deadlineQualified:false}));
}finally{session.disconnect();}
