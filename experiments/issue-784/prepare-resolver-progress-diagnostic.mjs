// Complete source equations for diagnostic reporting; no installed source edits.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
const output='ci-logs/issue-784-restart-2/resolver-progress-diagnostic.json.gz';
const previous=JSON.parse(gunzipSync(readFileSync('ci-logs/issue-784-restart-2/bang-progress-diagnostic.json.gz'),{maxOutputLength:32*1024*1024}));
if(previous.schema!=='complete-bang-progress-diagnostic-v1'||previous.files.length!==2)throw Error('Complete preceding diagnostic required');
const hash=value=>createHash('sha256').update(value).digest('hex'),ts=ownershipCompiler();
if(ts.version!=='5.9.3')throw Error('Installed TypeScript 5.9.3 required');
function one(rows){if(rows.length!==1)throw Error('One complete native diagnostic selection required');return rows[0];}
function parse(path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw Error('Complete native diagnostic grammar differs');return file;}
const reporter=String.raw`
function reportResolverDiagnostic(stage,module,item=null){
 console.error(JSON.stringify({schema:'actual-resolver-consumption-diagnostic-v1',diagnosticOnly:true,
  stage,source:module?.file??null,module:module?.path??null,item:item?{name:item.name??null,term:item.term,start:item.start,end:item.end}:null,
  milliseconds:performance.now(),memory:process.memoryUsage()}));
}
`;
function proposal(path,before,middle,edits){
 let after=middle,last=middle.length;
 for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(edit.span[1]>last||middle.slice(...edit.span)!==edit.expected)throw Error('Complete native diagnostic span differs');
  after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);last=edit.span[0];
 }
 let shift=0;const inverse=edits.map(edit=>{const position=edit.span[0]+shift;shift+=edit.replacement.length-edit.expected.length;return {...edit,position};});
 let restored=after;
 for(const edit of inverse.reverse()){
  if(restored.slice(edit.position,edit.position+edit.replacement.length)!==edit.replacement)throw Error('Complete native diagnostic inverse span differs');
  restored=restored.slice(0,edit.position)+edit.expected+restored.slice(edit.position+edit.replacement.length);
 }
 if(restored!==middle)throw Error('Complete native diagnostic inverse differs');parse(path,after);
 const [equation]=transportConcreteSourcePhases([{before,middle,after,language:'JavaScript'}]);
 return {path,before,middle,after,beforeSha256:hash(before),afterSha256:hash(after),edits,equation};
}
const oldBang=previous.files[1],bangFile=parse(oldBang.path,oldBang.after);
const carrier=one(bangFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='deriveBangModules'));
const carrierLoop=one(carrier.body.statements.filter(node=>ts.isForOfStatement(node)&&node.expression.getText(bangFile)==='modules'));
const bangEdits=[
 {span:[carrier.body.getStart(bangFile)+1,carrier.body.getStart(bangFile)+1],expected:'',replacement:"reportResolverDiagnostic('carrier-start',null);"},
 {span:[carrierLoop.statement.getStart(bangFile)+1,carrierLoop.statement.getStart(bangFile)+1],expected:'',replacement:"reportResolverDiagnostic('carrier-module-start',module);"},
 {span:[carrierLoop.statement.end-1,carrierLoop.statement.end-1],expected:'',replacement:"reportResolverDiagnostic('carrier-module-end',module);"},
 {span:[oldBang.after.length,oldBang.after.length],expected:'',replacement:reporter},
];
const bindingPath='tools/translation/module-bindings.mjs',bindingBefore=readFileSync(bindingPath,'utf8'),bindingFile=parse(bindingPath,bindingBefore);
const resolver=one(bindingFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='resolveUnscopedModuleBindings'));
const moduleLoops=resolver.body.statements.filter(node=>ts.isForOfStatement(node)&&node.expression.getText(bindingFile)==='modules');
if(moduleLoops.length!==2)throw Error('Two complete original module loops required');
const moduleBody=moduleLoops[1].statement;
const itemLoop=one(moduleBody.statements.filter(node=>ts.isForOfStatement(node)&&node.expression.getText(bindingFile)==='items.filter(item=>!item.comment)'));
const bindingEdits=[
 {span:[resolver.body.getStart(bindingFile)+1,resolver.body.getStart(bindingFile)+1],expected:'',replacement:"reportResolverDiagnostic(deriveBangContext?'resolver-bang-start':'resolver-input-start',null);"},
 {span:[moduleBody.getStart(bindingFile)+1,moduleBody.getStart(bindingFile)+1],expected:'',replacement:"reportResolverDiagnostic('resolver-module-start',module);"},
 {span:[itemLoop.statement.getStart(bindingFile)+1,itemLoop.statement.getStart(bindingFile)+1],expected:'',replacement:"reportResolverDiagnostic('resolver-item-start',module,item);"},
 {span:[moduleBody.end-1,moduleBody.end-1],expected:'',replacement:"reportResolverDiagnostic('resolver-module-end',module);"},
 {span:[bindingBefore.length,bindingBefore.length],expected:'',replacement:reporter},
];
const files=[previous.files[0],proposal(oldBang.path,oldBang.before,oldBang.after,bangEdits),proposal(bindingPath,bindingBefore,bindingBefore,bindingEdits)];
for(const row of files)if(readFileSync(row.path,'utf8')!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)throw Error('Complete physical diagnostic input changed');
const plan={schema:'complete-resolver-progress-diagnostic-v1',files,diagnosticOnly:true,ordinaryPlannerChanged:false,semanticAuthority:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(plan));if(raw.length>32*1024*1024)throw Error('Finite complete diagnostic evidence bound');
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw))throw Error('Complete proposal readback differs');
console.log(JSON.stringify({schema:plan.schema,bytes:raw.length,packedBytes:packed.length,files:files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),diagnosticOnly:true,semanticAuthority:false}));
