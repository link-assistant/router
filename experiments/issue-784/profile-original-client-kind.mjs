// The original complete graph and ClientKind case, profiled without test edits.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalCsvContext} from '../../tools/translation/test/original-csv-context.mjs';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintOriginalModule} from '../../tools/translation/derive-footprints.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {registeredStandardHostBindings} from '../../tools/translation/standard-host-bindings.mjs';
import {originalMatchesNamespaceBindings} from '../../tools/translation/matches-macro-context.mjs';
import {lockedTomlValueNamespaceBindings} from '../../tools/translation/toml-value-namespace.mjs';
import {originalSourceModuleItems} from '../../tools/translation/source-module-views.mjs';
import {proveSchemarsWithOutput} from '../../tools/translation/schemars-with-bang-candidate.mjs';
import {createDeriveEnclosingNamespaceContext,deriveEnclosingNamespaceOutputAt,proveDeriveEnclosingNamespaceEffect,deriveEnclosingNamespaceEffectFacts} from '../../tools/translation/schemars-with-context-candidate.mjs';

const label=process.argv[2];if(!/^[a-z0-9-]{1,70}$/u.test(label??''))throw Error('A fresh finite label is required');
const prefix='ci-logs/issue-784-restart-2/'+label,hash=value=>createHash('sha256').update(value).digest('hex');
const paths=['project.mjs','forward-concrete-syntax.mjs','derive-footprints.mjs','builtin-clone-ast-route.mjs','builtin-derive-bang-footprints.mjs','schemars-with-context-candidate.mjs','schemars-with-bang-candidate.mjs'];
const physical=paths.map(path=>({path:'tools/translation/'+path,source:readFileSync('tools/translation/'+path,'utf8')}));
const session=new Session();session.connect();const phases=[];
const post=(method,parameters={})=>new Promise((done,reject)=>session.post(method,parameters,(error,value)=>error?reject(error):done(value)));
const measure=(phase,run)=>{const start=performance.now(),value=run(),row={phase,elapsedMs:performance.now()-start};phases.push(row);console.log(JSON.stringify(row));return value;};
const save=(suffix,value)=>{const path=prefix+suffix;assert.equal(existsSync(path),false);const raw=Buffer.from(JSON.stringify(value));assert.ok(raw.length<=64*1024*1024);writeFileSync(path,gzipSync(raw,{mtime:0}),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}),raw);return {path,bytes:raw.length,sha256:hash(raw)};};
const original=originalCsvContext(),dependencies=loadDeriveDependencyProof({manifest:original.source('Cargo.toml'),lock:original.source('Cargo.lock')});
let graph,context,proof,enclosing,joined,facts,profile;const start=performance.now();
try{
 await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:10000});await post('Profiler.start');
 try{
  graph=measure('complete-original-module-graph',()=>resolveModuleGraph({entry:original.inputs.entry,paths:original.inputs.sources.map(row=>row.source).filter(path=>path.endsWith('.rs')),readSource:original.source,compilationProfile:original.inputs.compilationProfile}));
  const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]);
  context=measure('complete-original-derive-context',()=>createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules,compilationProfile:PRODUCTION_PROFILE}));
  const certificate=context.certificates.find(row=>row.name==='ClientKind'&&row.source==='src/clients.rs');assert.ok(certificate);
  const module=deriveFootprintOriginalModule(context,certificate),item=originalSourceModuleItems(module).find(row=>row.start===certificate.span.start&&row.end===certificate.span.end);
  proof=measure('complete-selected-schemars-output',()=>proveSchemarsWithOutput({context,certificate}));
  enclosing=measure('complete-original-enclosing-context',()=>createDeriveEnclosingNamespaceContext({deriveContext:context}));
  joined=measure('original-enclosing-output',()=>deriveEnclosingNamespaceOutputAt(enclosing,context,module,item));assert.ok(joined);
  assert.equal(joined.actualOwners.length,8);assert.equal(joined.selectedOwners.length,8);assert.deepEqual(joined.residualOwners,[]);assert.equal(joined.generatedImplBehavior,false);
  facts=measure('original-enclosing-effect',()=>deriveEnclosingNamespaceEffectFacts(proveDeriveEnclosingNamespaceEffect(enclosing,context,module,item),enclosing,context,module,item));assert.equal(facts.certificate,joined);assert.equal(facts.runtimeAuthority,false);
 }finally{profile=(await post('Profiler.stop')).profile;}
}finally{session.disconnect();}
const elapsedMs=performance.now()-start,cpu=save('-cpu.json.gz',profile);
for(const row of physical)assert.equal(readFileSync(row.path,'utf8'),row.source);
const originals=[...new Map(graph.modules.map(module=>[module.file,module.source]))].map(([path,source])=>({path,source}));
save('-result.json.gz',{schema:'complete-original-client-kind-diagnostic-v1',elapsedMs,phases,cpu,samplingIntervalMicroseconds:10000,physical,originals,originalInputs:original.inputs,proof,joined,facts,
 diagnosticOnly:true,deadlineQualified:false,selectedPhysicalInputsUnchanged:true,fullGatePassed:false,runtimeParity:false,rustExecuted:false});
console.log(JSON.stringify({elapsedMs,cpuBytes:cpu.bytes,deadlineQualified:false}));
