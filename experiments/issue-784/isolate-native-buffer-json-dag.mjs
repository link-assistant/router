// Keep the existing closed-codec producer's complete source contract exact.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
import {verifyNativeCopiedSourceBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');
const packetRaw=gunzipSync(readFileSync('ci-logs/issue-784-restart-2/native-buffer-json-dag-complete-source.json.gz'));
assert.equal(hash(packetRaw),'f9bb4316f2b2d657c74e0442c8fc99c899a44dcb5faec3b886cb4e764d424d09');
const packet=JSON.parse(packetRaw),codec=packet.files[0];
for(const row of packet.files)assert.equal(readFileSync(row.path,'utf8'),row.after);
assert.equal(execFileSync('git',['show','HEAD:'+codec.path],{encoding:'utf8'}),codec.before);
const target='tools/translation/test/fixtures/complete-native-buffer-json-dag-hook-wire.mjs';
assert.equal(existsSync(target),false);
const rows=[
 {path:codec.path,before:codec.after,after:codec.before,edits:[['router.restore-entire-original-closed-codec.v1',codec.after,codec.before]]},
 {path:target,before:codec.before,after:codec.after,edits:codec.edits.map(([before,after],at)=>['javascript.native-buffer-complete-source-copy.'+at+'.v1',before,after]),copiedFrom:codec.path,newFile:true},
 ...[packet.files[1].path,packet.files[2].path,'tools/translation/test/native-buffer-json-dag.test.mjs'].map(path=>{
  const before=readFileSync(path,'utf8'),old='complete-closed-json-dag-hook-wire.mjs',next='complete-native-buffer-json-dag-hook-wire.mjs';
  assert.equal(before.split(old).length,2);
  return {path,before,after:before.replace(old,next),edits:[['router.Core-native-buffer-codec-import.'+path+'.v1',old,next]]};
 }),
];
for(const row of rows){
 const rules=row.edits.map(([id,old,next])=>exactLiteralSubstitutionRule(id,old,next,'Complete codec isolation source differs'));
 const sequence=createRulePipeline([{phase:'language',rules:row.newFile?rules:[]},{phase:'repository',rules:row.newFile?[]:rules}]);
 const result=sequence.run(row.before);assert.equal(result.value,row.after);
 row.middle=row.newFile?row.after:row.before;row.sequence=sequence.description;row.trace=result.trace;
 let inverse=row.after;for(const [,old,next]of [...row.edits].reverse()){
  assert.equal(inverse.split(next).length,2);inverse=inverse.replace(next,()=>old);
 }assert.equal(inverse,row.before);row.inverse=inverse;
 assert.deepEqual(ts.createSourceFile(row.path,row.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics,[]);
 row.nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(row.path),row.after);
 row.nativeSyntax=[];
 for(const [engine,args]of [[process.execPath,['--input-type=module','--check']],['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]]]){
  const out=spawnSync(engine,args,{input:row.after,encoding:'utf8',maxBuffer:1048576});
  assert.equal(out.error,undefined);assert.equal(out.status,0,out.stderr);assert.equal(out.signal,null);
  row.nativeSyntax.push({engine,args,status:out.status,stdout:out.stdout,stderr:out.stderr});
 }
 row.beforeSha256=hash(row.before);row.afterSha256=hash(row.after);
}
const equations=transportConcreteSourcePhases(rows.map(row=>({before:row.before,middle:row.middle,after:row.after,language:'JavaScript'})));
const record={schema:'complete-native-buffer-codec-isolation-v1',files:rows,equations,
 typescript:ts.version,originalClosedCodecRestored:true,originalDeadlinesChanged:false,
 originalWorkloadsChanged:false,sourceAuthority:false,productionExecutableGain:0,
 receivingQualified:false,performanceQualified:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(record)),packed=gzipSync(raw,{level:9});
const output='ci-logs/issue-784-restart-2/native-buffer-json-dag-isolated-source.json.gz';
writeFileSync(output,packed,{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(output)),raw);
for(const row of rows)if(row.newFile)assert.equal(existsSync(row.path),false);else assert.equal(readFileSync(row.path,'utf8'),row.before);
for(const row of rows){writeFileSync(row.path,row.after,row.newFile?{flag:'wx'}:undefined);assert.equal(readFileSync(row.path,'utf8'),row.after);}
console.log(JSON.stringify({output,rawBytes:raw.length,packedBytes:packed.length,sha256:hash(raw),
 files:rows.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),receivingQualified:false}));
