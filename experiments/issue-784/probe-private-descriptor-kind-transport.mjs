// Finite full-module timing diagnostic; no installed source or performance permit.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
const base='ci-logs/issue-784-restart-2/',ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');
const plan=JSON.parse(gunzipSync(readFileSync(base+'private-native-descriptor-kind-draft.json.gz'),{maxOutputLength:1048576}));
assert.equal(readFileSync(plan.path,'utf8'),plan.before);
const root=mkdtempSync(resolve('experiments/issue-784/private-descriptor-transport-'));
const origin=pathToFileURL(resolve(plan.path)),modules={},copies=[];
const hash=value=>createHash('sha256').update(value).digest('hex');
try{
 for(const side of ['before','after']){
  const file=ts.createSourceFile(plan.path,plan[side],ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
  assert.equal(file.parseDiagnostics.length,0);const edits=[];
  for(const node of file.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('.')){
   const spec=node.moduleSpecifier;edits.push({start:spec.getStart(file),end:spec.end,before:spec.getText(file),after:JSON.stringify(new URL(spec.text,origin).href)});
  }
  function visit(node){
   if(ts.isPropertyAccessExpression(node)&&ts.isMetaProperty(node.expression)&&node.getText(file)==='import.meta.url')
    edits.push({start:node.getStart(file),end:node.end,before:node.getText(file),after:JSON.stringify(origin.href)});
   ts.forEachChild(node,visit);
  }
  visit(file);let copied=plan[side];
  for(const row of [...edits].sort((a,b)=>b.start-a.start)){
   assert.equal(copied.slice(row.start,row.end),row.before);copied=copied.slice(0,row.start)+row.after+copied.slice(row.end);
  }
  let inverse=copied,delta=0;
  const reverse=[...edits].sort((a,b)=>a.start-b.start).map(row=>{const start=row.start+delta;delta+=row.after.length-row.before.length;return {...row,start,end:start+row.after.length};});
  for(const row of reverse.reverse()){assert.equal(inverse.slice(row.start,row.end),row.after);inverse=inverse.slice(0,row.start)+row.before+inverse.slice(row.end);}
  assert.equal(inverse,plan[side]);const path=join(root,side+'.mjs');writeFileSync(path,copied,{flag:'wx'});
  assert.equal(readFileSync(path,'utf8'),copied);modules[side]=await import(pathToFileURL(path).href);
  copies.push({side,original:plan[side],copied,edits,inverse});
 }
 const input='// finite λ😀\r\npub fn keep(value:u8)->u8{value}',runs=[];
 for(const side of ['before','after','after','before','before','after']){
  const start=performance.now(),output=modules[side].transportPrivateConcreteSource(input,'Rust');
  runs.push({side,elapsedMs:performance.now()-start,output});
 }
 for(const row of runs)assert.deepEqual(row.output,runs[0].output);
 const result={schema:'private-descriptor-kind-full-transport-diagnostic-v1',node:process.versions.node,
  typescript:ts.version,plan,copies,input,runs,sourceInstalled:false,cstProposalQualified:false,
  originalDeadlinesQualified:false,performanceQualified:false,productionExecutableGain:0};
 const raw=Buffer.from(JSON.stringify(result)),packed=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(packed),raw);
 const path=base+'private-native-descriptor-kind-transport.json.gz';writeFileSync(path,packed,{flag:'wx'});
 console.log(JSON.stringify({path,bytes:packed.length,sha256:hash(packed),runs:runs.map(({side,elapsedMs})=>({side,elapsedMs})),sourceInstalled:false,performanceQualified:false}));
}finally{rmSync(root,{recursive:true,force:true});}
