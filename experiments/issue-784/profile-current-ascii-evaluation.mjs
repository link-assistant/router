// One actual evaluation, sampled in this owned process. Never a whole test pass.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {Session} from 'node:inspector';
import {repositorySourceURL} from '../../tools/translation/test/fixtures/repository-paths.mjs';
import {createOwnedCoreSourceContext,translateOwnedCoreDocumentJavaScript} from '../../tools/translation/js-to-rust/translator.mjs';
import {ownedCoreRuntimeSources,ownedCoreAsciiRuntimeSources} from '../../tools/translation/js-to-rust/owned-core-source.mjs';
import {prepareOwnedCoreRuntime,evaluate} from '../../tools/translation/js-to-rust/interpreter.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../tools/translation/router-core-source-data.mjs';

const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
const base='ci-logs/issue-784-restart-2/'+label;
assert.ok(!existsSync(base+'.json.gz')&&!existsSync(base+'.cpuprofile.gz'));
const root=new URL('../../',import.meta.url);
const oracle=readFileSync(repositorySourceURL('tests/translation_core_ascii_reverse_oracle.rs',root),'utf8');
const matches=[...oracle.matchAll(/const REVERSE_ASCII_JS_WITNESS: &str = r###"([\s\S]*?)"###;/gu)];
assert.equal(matches.length,1);const source=matches[0][1];
const input={runtimeRoot:'runtime',declarationRoot:'runtime',files:[
  ...ownedCoreRuntimeSources(),...ownedCoreAsciiRuntimeSources(),
  {path:'src/lib.rs',source:'pub mod translation_core;\n'},
  {path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},
  {path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},
  ...['Cargo.toml','Cargo.lock'].map(path=>({path,source:readFileSync(repositorySourceURL(path,root),'utf8')})),
  {path:'caller.mjs',source},
]};
const context=createOwnedCoreSourceContext(input);
const result=translateOwnedCoreDocumentJavaScript(source,{context,sourcePath:'caller.mjs',typescriptOutputPath:'reverse.mts'});
assert.equal(result.program.length,4);
const token=await prepareOwnedCoreRuntime(result.program),session=new Session();session.connect();
const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,result)=>error?reject(error):resolve(result)));
let profile;
const observations=[];
try{
  await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
  for(let byte=0;byte<1;byte++){
    const start=performance.now(),value=String.fromCharCode(byte);
    assert.equal(evaluate(result.program,'hexadecimal',[value],token),false);
    observations.push({byte,expected:false,elapsedMilliseconds:performance.now()-start});
  }
  ({profile}=await post('Profiler.stop'));await post('Profiler.disable');
}finally{session.disconnect();}
const receipt={schema:'bounded-current-ascii-evaluation-profile-v1',oracle,input,
  metaSha256:createHash('sha256').update(result.meta).digest('hex'),metaRetained:false,
  engine:process.versions,observations,completeOriginalTest:false,pairedTypedSourceIncluded:false,
  profilerChangesExecutionCost:true,deadlineQualified:false,productionSourcesChanged:false};
for(const [suffix,value]of [['.cpuprofile.gz',profile],['.json.gz',receipt]]){
  const raw=Buffer.from(JSON.stringify(value));
  console.log(JSON.stringify({suffix,decodedBytes:raw.length}));
  assert.ok(raw.length<8*1024*1024);
  writeFileSync(base+suffix,gzipSync(raw),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(base+suffix)),raw);
}
console.log(JSON.stringify({base,observations,samples:profile.samples.length,
  profileSha256:createHash('sha256').update(readFileSync(base+'.cpuprofile.gz')).digest('hex'),
  completeOriginalTest:false,deadlineQualified:false}));
