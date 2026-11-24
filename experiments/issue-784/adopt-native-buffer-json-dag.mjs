// Explicit native Buffer JSON projection; the original closed API keeps its census.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
import {verifyNativeCopiedSourceBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
const codec='tools/translation/test/fixtures/complete-closed-json-dag-hook-wire.mjs';
const rows=[{path:codec,edits:[
 ['// every fresh object\'s unchanged own-key/prototype/refusal census in visit.',
  '// every fresh object\'s applicable prototype/refusal census in visit.'],
 ['  // key census for stack refusal, exact byte shape and ordered object fields.',
  '  // key census for stack refusal, exact byte shape and ordered object fields,\n  // except the explicit direct-native Buffer JSON projection below.'],
 ['export function encodeCompleteClosedJsonDagHookWire(value){',
  `export function encodeCompleteClosedJsonDagHookWire(value){return encodeClosedJsonDag(value,false);}
// Stock direct Buffers project only native numeric bytes. Own extra fields are
// ignored by native Buffer.toJSON; length/toJSON overrides still refuse, and
// stack remains refused without materializing it. Other byte objects retain
// the original complete key census. This API grants no source/type authority.
export function encodeCompleteNativeBufferJsonDagHookWire(value){return encodeClosedJsonDag(value,true);}
function encodeClosedJsonDag(value,nativeBufferProjection){`],
 ['  const names=keys(item);if(names.includes(\'stack\'))fail();const bytes=isBytes(item),buffer=bytes&&prototype(item)===BUFFER;domain(item,buffer);active.add(item);',
  `  const bytes=isBytes(item),buffer=bytes&&prototype(item)===BUFFER,projectBuffer=nativeBufferProjection&&buffer;
  let names=null;
  if(projectBuffer){if(descriptor(item,'stack')||descriptor(item,'length'))fail();}
  else{names=keys(item);if(names.includes('stack'))fail();}
  domain(item,buffer);active.add(item);`],
 ['||names.length!==length)fail();','||!projectBuffer&&names.length!==length)fail();'],
 ]},
 ...[
  ['tools/translation/test/whole-owner-core-producer-candidate.test.mjs',
   'encodeCompleteClosedJsonDagHookWire as encodeCompleteHookWire'],
  ['tools/translation/test/fixtures/whole-owner-core-hook-child.mjs',
   'encodeCompleteClosedJsonDagHookWire as encodeCompleteHookWire'],
 ].map(([path,old])=>({path,edits:[[old,'encodeCompleteNativeBufferJsonDagHookWire as encodeCompleteHookWire']]})),
];
const child=rows.find(row=>row.path.endsWith('whole-owner-core-hook-child.mjs'));
child.edits.push(
 ["const creator=mode==='legacy'?createEnclosingCoreAdoptionProducerContext:createWholeOwnerCoreAdoptionProducerContext;",
  "const creator=mode==='legacy'?createEnclosingCoreAdoptionProducerContext:createWholeOwnerCoreAdoptionProducerContext;\nconst traceEnabled=process.env.ROUTER_COMPLETE_CORE_HOOK_TRACE==='1',traceStarted=traceEnabled?performance.now():0;\nfunction traceCore(phase,extra={}){if(traceEnabled)process.stderr.write(json({schema:'complete-Core-hook-phase-v1',phase,elapsedMs:performance.now()-traceStarted,rss:process.memoryUsage().rss,...extra})+'\\n');}\nfunction traceWire(value){traceCore('wire-start');const wire=encodeCompleteHookWire(value);traceCore('wire-finish',{bytes:Buffer.byteLength(wire)});return wire;}"],
 ['function setup(){const sources=',"function setup(){traceCore('setup-start');const sources="],
 ['return {options,context:creator(options)};',"traceCore('graph-finish');const context=creator(options);traceCore('creator-finish');return {options,context};"],
 ['function outcome(run){try{return {value:run()};}',"function outcome(run){traceCore('outcome-start');try{const value=run();traceCore('outcome-finish');return {value};}"],
 ['process.stdout.write(encodeCompleteHookWire(', 'process.stdout.write(traceWire('],
);
const hash=value=>createHash('sha256').update(value).digest('hex');
const files=rows.map((row,index)=>{
 const before=readFileSync(row.path,'utf8');
 const sequence=createRulePipeline([
  {phase:'language',rules:row.path===codec?row.edits.map(([old,next],at)=>exactLiteralSubstitutionRule(
   'javascript.closed-native-buffer-json-projection.'+at+'.v1',old,next,'Native Buffer source differs')):[]},
  {phase:'repository',rules:row.path===codec?[]:row.edits.map(([old,next],at)=>exactLiteralSubstitutionRule(
   'router.complete-Core-native-buffer-projection.'+index+'.'+at+'.v1',old,next,'Core observation source differs'))},
 ]);
 // Run the declared real sequence; the intermediate is the complete language
 // afterimage for the codec and the original source for repository imports.
 const {value:after,trace}=sequence.run(before),middle=row.path===codec?after:before;
 let inverse=after;
 for(const [old,next]of [...row.edits].reverse()){
  assert.equal(inverse.split(next).length,2);inverse=inverse.replace(next,()=>old);
 }
 assert.equal(inverse,before);
 for(const source of [before,after])assert.deepEqual(ts.createSourceFile(
  row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics,[]);
 const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(row.path),after);
 const nativeSyntax=[];
 for(const [engine,args]of [[process.execPath,['--input-type=module','--check']],
  ['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]]]){
  const result=spawnSync(engine,args,{input:after,encoding:'utf8',maxBuffer:1048576});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);assert.equal(result.signal,null);
  nativeSyntax.push({engine,args,status:result.status,stdout:result.stdout,stderr:result.stderr});
 }
 return {...row,before,middle,after,inverse,beforeSha256:hash(before),afterSha256:hash(after),
  sequence:sequence.description,trace,nativeBindings,nativeSyntax};
});
const equations=transportConcreteSourcePhases(files.map(row=>({before:row.before,
 middle:row.middle,after:row.after,language:'JavaScript'})));
const record={schema:'complete-native-buffer-json-DAG-adoption-v1',typescript:ts.version,
 files,equations,originalAssertionsChanged:false,originalWorkloadsChanged:false,
 originalDeadlinesChanged:false,oldEncoderRefusalsChanged:false,sourceAuthority:false,
 semanticAuthority:false,productionExecutableGain:0,receivingQualified:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(record)),packed=gzipSync(raw,{level:9});
assert.deepEqual(gunzipSync(packed),raw);
const output='ci-logs/issue-784-restart-2/native-buffer-json-dag-complete-source.json.gz';
writeFileSync(output,packed,{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(output)),raw);
for(const row of files)assert.equal(readFileSync(row.path,'utf8'),row.before);
for(const row of files){writeFileSync(row.path,row.after);assert.equal(readFileSync(row.path,'utf8'),row.after);}
console.log(JSON.stringify({output,rawBytes:raw.length,packedBytes:packed.length,
 sha256:hash(raw),files:files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),
 originalDeadlinesChanged:false,receivingQualified:false}));
