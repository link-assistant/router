// Finite comparison of the existing DATA adapter around fresh original calls.
// Diagnostic only: no source rewrite, deadline qualification or stored verdict.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Session} from 'node:inspector';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {captureSourceModuleViews} from '../../tools/translation/source-module-views.mjs';
import {createDeriveFootprintContext} from '../../tools/translation/derive-footprints.mjs';
import {createDeriveBangContext} from '../../tools/translation/derive-bang-context.mjs';
import {proveBuiltinDeriveBangFootprint} from '../../tools/translation/builtin-derive-bang-footprints.mjs';
import {withDefaultProofByteConsumers} from '../../tools/translation/default-proof-byte-operation.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const label=process.argv[2];
assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
assert.ok(process.argv.length===3||process.argv.length===4&&process.argv[3]==='--profile');
const session=process.argv[3]==='--profile'?new Session():null;
if(session)session.connect();
const post=(method,parameters={})=>new Promise((resolve,reject)=>
 session.post(method,parameters,(error,value)=>error?reject(error):resolve(value)));
const paths=['derive-bang-context.mjs','builtin-derive-bang-footprints.mjs',
 'default-proof-byte-operation.mjs','operation-proof-byte-bridge.mjs',
 'operation-proof-byte-consumer-scope.mjs','private-native-proof-json.mjs',
 'private-frozen-json.mjs'].map(path=>'tools/translation/'+path);
const inputs=paths.map(path=>({path,source:readFileSync(path,'utf8')}));
const cargo=Object.fromEntries(['Cargo.toml','Cargo.lock'].map(name=>
 [name==='Cargo.toml'?'manifest':'lock',readFileSync(rustPackageSourcePath(process.cwd(),name),'utf8')]));
const dependencies=loadDeriveDependencyProof(cargo);
const source='#[derive(Hash,Clone,Debug,Eq,PartialEq,Ord)]pub struct Input{a:String}';
const unsupportedSource='#[derive(Hash,Ord)]pub enum Input{A(u8),B}';
function setup(source){
 const capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE});
 const modules=capture.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,
  source,sourceView,configurationCondition:sourceView.configurationCondition,compilationProfile:PRODUCTION_PROFILE}));
 const context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
 return {modules,context,certificate:context.certificates.find(row=>row.name==='Input')};
}
function run(){
 const positive=setup(source),attribute=positive.certificate.attributes.find(row=>row.derives);
 const proof=proveBuiltinDeriveBangFootprint({context:positive.context,certificate:positive.certificate,
  invocation:{path:['Hash'],attributeSpan:attribute.span}});
 const bang=createDeriveBangContext({deriveContext:positive.context});
 assert.deepEqual(bang.certificates[0].residualOwners,[]);
 assert.equal(bang.certificates[0].dimensions.bangMacroComplete,true);
 const negative=setup(unsupportedSource),unsupportedBang=createDeriveBangContext({deriveContext:negative.context});
 assert.ok(unsupportedBang.certificates[0].residualOwners.some(row=>row.path.join('::')==='Ord'));
 assert.equal(unsupportedBang.certificates[0].dimensions.bangMacroComplete,false);
 return {positive,proof,bang,negative,unsupportedBang};
}
const rows=[];
if(session){await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:5000});await post('Profiler.start');}
for(const mode of ['original','adapter','adapter','original']){
 const started=performance.now(),result=mode==='original'?run():withDefaultProofByteConsumers(run);
 const milliseconds=performance.now()-started,wire=JSON.stringify(result);
 if(rows.length)assert.equal(wire,rows[0].wire);
 rows.push({mode,milliseconds,wire,sha256:createHash('sha256').update(wire).digest('hex')});
 console.log(JSON.stringify({mode,milliseconds,bytes:Buffer.byteLength(wire)}));
 if(session&&rows.length===1){
  const {profile}=await post('Profiler.stop');session.disconnect();
  const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/'+label+'-cpu.json',
   Buffer.from(JSON.stringify(profile)));
  console.log(JSON.stringify({coldOriginalCpuProfile:output,samplingIntervalMicroseconds:5000}));
 }
}
for(const row of inputs)assert.equal(readFileSync(row.path,'utf8'),row.source);
const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/'+label+'.json',
 Buffer.from(JSON.stringify({schema:'fresh-default-derive-byte-frame-diagnostic-v1',source,
  unsupportedSource,cargo,inputs,rows,node:process.versions.node,bun:process.versions.bun??null,
  sharedWarmup:true,originalCaseDeadlineQualified:false,productionChanged:false,
  fullGatePassed:false,runtimeAuthority:false})));
console.log(JSON.stringify({output,wholeOriginalTestFileRun:false,deadlineQualified:false}));
