// Finite complete-reader comparison. Shared warmup is diagnostic, not CI evidence.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareConcreteCommonGuard} from './concrete-common-guard-source.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
const output='ci-logs/issue-784-restart-2/'+label+'.json.gz';assert.ok(!existsSync(output));
const plan=prepareConcreteCommonGuard(),ts=ownershipCompiler();
const file=ts.createSourceFile(plan.path,plan.before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);
const edits=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text.startsWith('.')).map(node=>({
 span:[node.moduleSpecifier.getStart(file),node.moduleSpecifier.end],before:node.moduleSpecifier.getText(file),
 after:JSON.stringify(new URL(node.moduleSpecifier.text,new URL('../../tools/translation/concrete-syntax-meta.mjs',import.meta.url)).href),
}));
let relocated=plan.before;for(const edit of [...edits].reverse())relocated=relocated.slice(0,edit.span[0])+edit.after+relocated.slice(edit.span[1]);
let inverse=relocated;for(const edit of edits)inverse=inverse.slice(0,edit.span[0])+edit.before+inverse.slice(edit.span[0]+edit.after.length);
assert.equal(inverse,plan.before);
const relocatedFile=ts.createSourceFile(plan.path,relocated,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(relocatedFile.parseDiagnostics.length,0);
const original=await import('data:text/javascript;base64,'+Buffer.from(relocated).toString('base64'));
const afterFile=ts.createSourceFile(plan.path,plan.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(afterFile.parseDiagnostics.length,0);
const afterEdits=afterFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text.startsWith('.')).map(node=>({
 start:node.moduleSpecifier.getStart(afterFile),end:node.moduleSpecifier.end,
 before:node.moduleSpecifier.getText(afterFile),after:JSON.stringify(new URL(node.moduleSpecifier.text,new URL('../../tools/translation/concrete-syntax-meta.mjs',import.meta.url)).href),
}));
let relocatedAfter=plan.after;for(const edit of [...afterEdits].reverse())relocatedAfter=relocatedAfter.slice(0,edit.start)+edit.after+relocatedAfter.slice(edit.end);
let inverseAfter=relocatedAfter;for(const edit of afterEdits)inverseAfter=inverseAfter.slice(0,edit.start)+edit.before+inverseAfter.slice(edit.start+edit.after.length);assert.equal(inverseAfter,plan.after);
const current=await import('data:text/javascript;base64,'+Buffer.from(relocatedAfter).toString('base64'));
const inputs=[{path:'rust/src/account_routing_policy.rs',language:'Rust'},{path:plan.path,language:'JavaScript'}].map(row=>({...row,source:readFileSync(row.path,'utf8')}));
for(const row of inputs){
 row.expected=original.transportConcreteSyntaxSource(row.source,{language:row.language});
 assert.deepEqual(current.transportConcreteSyntaxSource(row.source,{language:row.language}),row.expected);
}
const timings=[];
for(const round of [0,1])for(const mode of ['before','after','after','before'])for(const row of inputs){
 const implementation=mode==='before'?original:current;const results=[],started=performance.now();
 for(let index=0;index<4;index++)results.push(implementation.transportConcreteSyntaxSource(row.source,{language:row.language}));
 const elapsedMilliseconds=performance.now()-started;
 for(const result of results)assert.deepEqual(result,row.expected);
 timings.push({round,mode,path:row.path,calls:4,elapsedMilliseconds,completeOutputsEqual:true});
}
assert.equal(readFileSync(plan.path,'utf8'),plan.current);
const record={schema:'complete-concrete-common-guard-diagnostic-v1',engine:process.versions,
 script:readFileSync(new URL(import.meta.url),'utf8'),before:plan.before,after:plan.after,
 relocatedOriginal:relocated,relocationEdits:edits,relocationInverse:inverse,relocatedAfter,afterEdits,inverseAfter,inputs,timings,
 beforeSha256:plan.beforeSha256,afterSha256:plan.afterSha256,
 pairedWarmupCallsPerImplementationPerSource:1,completeOriginalTestsExecuted:false,performanceQualified:false,
 sourceLimitsChanged:false,deadlineLimitsChanged:false,semanticAuthority:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(record));assert.ok(raw.length<16*1024*1024);
writeFileSync(output,gzipSync(raw),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(output)),raw);
console.log(JSON.stringify({output,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),timings,performanceQualified:false}));
