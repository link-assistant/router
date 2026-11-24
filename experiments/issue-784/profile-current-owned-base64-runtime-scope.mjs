// Finite source-path diagnostic. Original whole test files remain unchanged.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';
import {createOwnedCoreSourceContext,translateOwnedCoreDocumentJavaScript} from '../../tools/translation/js-to-rust/translator.mjs';
import {ownedCoreRuntimeSources,withOwnedRuntimeImportEdges,ownedRuntimeImportEdgeFacts} from '../../tools/translation/js-to-rust/owned-core-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../../tools/translation/router-core-source-data.mjs';

const label=process.argv[2];
if(!/^[a-z0-9-]{1,65}$/u.test(label??''))throw Error('One fresh finite evidence label required');
const prefix='ci-logs/issue-784-restart-2/'+label;
const original=path=>readFileSync(rustPackageSourcePath(process.cwd(),path),'utf8');
const oracle=original('tests/translation_core_base64_reverse_oracle.rs');
const caller=/const REVERSE_BASE64_JS_WITNESS: &str = r###"([\s\S]*?)"###;/u.exec(oracle)?.[1];
assert.equal(typeof caller,'string');
const files=[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},
 {path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},
 {path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},
 {path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE},
 {path:'Cargo.toml',source:original('Cargo.toml')},
 {path:'Cargo.lock',source:original('Cargo.lock')},{path:'caller.mjs',source:caller}];
assert.ok(files.length<=4096&&files.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0)<=16*1024*1024);
const sourcePaths=['experiments/issue-784/profile-current-owned-base64-runtime-scope.mjs',
 'tools/translation/js-to-rust/test/owned-core-base64.test.mjs',
 'tools/translation/js-to-rust/owned-core-source.mjs',
 'tools/translation/js-to-rust/owned-core-operations.mjs'];
const sources=sourcePaths.map(path=>({path,source:readFileSync(path,'utf8')}));
const stages=[],started=performance.now(),session=new Session();session.connect();
const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,value)=>error?reject(error):resolve(value)));
function measure(phase,run){const start=performance.now(),value=run();const row={phase,elapsedMs:performance.now()-start};stages.push(row);console.log(JSON.stringify(row));return value;}
try{
 await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:10000});await post('Profiler.start');
 const context=measure('complete-current-source-context',()=>createOwnedCoreSourceContext({runtimeRoot:'runtime',declarationRoot:'runtime',files}));
 let runtimeScope;
 const result=measure('complete-fourteen-function-translation',()=>withOwnedRuntimeImportEdges(()=>{
  const translated=translateOwnedCoreDocumentJavaScript(caller,{context,sourcePath:'caller.mjs',typescriptOutputPath:'reverse.mts'});
  runtimeScope=ownedRuntimeImportEdgeFacts();return translated;
 }));
 assert.deepEqual(ownedRuntimeImportEdgeFacts(),{active:false,disabled:false,hits:0,misses:0,stores:0,rows:0,sourceUnits:0,edges:0,reason:null});
 assert.equal(result.program.length,14);
 const {profile}=await post('Profiler.stop');
 for(const row of sources)assert.equal(readFileSync(row.path,'utf8'),row.source);
 for(const [suffix,value]of [['-cpu.json.gz',profile],['-result.json.gz',{schema:'current-owned-base64-runtime-scope-profile-v1',sources,oracle,files,stages,runtimeScope,result,elapsedMs:performance.now()-started,deadlineQualified:false,runtimeParity:false,rustExecuted:false}]]){
  const bytes=Buffer.from(JSON.stringify(value));assert.ok(bytes.length<=32*1024*1024);
  writeFileSync(prefix+suffix,gzipSync(bytes),{flag:'wx'});
  assert.ok(gunzipSync(readFileSync(prefix+suffix),{maxOutputLength:32*1024*1024}).equals(bytes));
  console.log(JSON.stringify({path:prefix+suffix,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
 }
}finally{session.disconnect();}
