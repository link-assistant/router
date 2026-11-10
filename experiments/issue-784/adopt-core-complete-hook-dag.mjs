// Complete observation DATA transport, preserving every original case/assertion.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
import {verifyNativeCopiedSourceBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
const rows=[
 {path:'tools/translation/test/whole-owner-core-producer-candidate.test.mjs',
  old:"import {decodeCompleteHookWire,encodeCompleteHookWire,compareCompleteHookWires} from './fixtures/complete-hook-wire.mjs';",
  next:"import {decodeCompleteClosedJsonDagHookWire as decodeCompleteHookWire,encodeCompleteClosedJsonDagHookWire as encodeCompleteHookWire,compareCompleteClosedJsonDagHookWires as compareCompleteHookWires} from './fixtures/complete-closed-json-dag-hook-wire.mjs';"},
 {path:'tools/translation/test/fixtures/whole-owner-core-hook-child.mjs',
  old:"import {encodeCompleteHookWire} from './complete-hook-wire.mjs';",
  next:"import {encodeCompleteClosedJsonDagHookWire as encodeCompleteHookWire} from './complete-closed-json-dag-hook-wire.mjs';"},
];
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=value=>createHash('sha256').update(value).digest('hex');
const files=rows.map((row,at)=>{
 const before=readFileSync(row.path,'utf8');
 assert.equal(execFileSync('git',['show',revision+':'+row.path],{encoding:'utf8'}),before);
 const sequence=createRulePipeline([
  {phase:'language',rules:[]},
  {phase:'repository',rules:[exactLiteralSubstitutionRule(
   'router.core-complete-hook-dag.import.'+at+'.v1',row.old,row.next,
   'Complete Core observation import differs')]},
 ]);
 const {value:after,trace}=sequence.run(before);
 assert.equal(after.split(row.next).length,2);
 const inverse=after.replace(row.next,()=>row.old);assert.equal(inverse,before);
 for(const source of [before,after])assert.deepEqual(ts.createSourceFile(
  row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics,[]);
 const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(row.path),after);
 const nativeSyntax=[];
 for(const [engine,args] of [[process.execPath,['--input-type=module','--check']],
  ['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]]]){
  const result=spawnSync(engine,args,{input:after,encoding:'utf8',maxBuffer:1048576});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);
  assert.equal(result.signal,null);
  nativeSyntax.push({engine,args,status:result.status,stdout:result.stdout,stderr:result.stderr});
 }
 return {...row,before,middle:before,after,inverse,beforeSha256:hash(before),
  afterSha256:hash(after),sequence:sequence.description,trace,nativeBindings,nativeSyntax};
});
const equations=transportConcreteSourcePhases(files.map(row=>({before:row.before,
 middle:row.middle,after:row.after,language:'JavaScript'})));
const record={schema:'complete-core-observation-dag-adoption-v1',revision,
 typescript:ts.version,files,equations,originalAssertionsChanged:false,
 originalWorkloadsChanged:false,originalDeadlinesChanged:false,
 sourceAuthority:false,semanticAuthority:false,productionExecutableGain:0,
 receivingQualified:false,performanceQualified:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(record)),packed=gzipSync(raw,{level:9});
assert.deepEqual(gunzipSync(packed),raw);
const output='ci-logs/issue-784-restart-2/core-hook-dag-complete-source.json.gz';
writeFileSync(output,packed,{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output)),raw);
for(const row of files)assert.equal(readFileSync(row.path,'utf8'),row.before);
for(const row of files){writeFileSync(row.path,row.after);assert.equal(readFileSync(row.path,'utf8'),row.after);}
console.log(JSON.stringify({output,rawBytes:raw.length,packedBytes:packed.length,
 sha256:hash(raw),files:files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),
 originalAssertionsChanged:false,originalDeadlinesChanged:false,receivingQualified:false}));
