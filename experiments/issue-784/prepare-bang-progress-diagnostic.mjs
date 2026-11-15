// A second finite diagnostic, retaining the entire ordinary source graph.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';

const output='ci-logs/issue-784-restart-2/bang-progress-diagnostic.json.gz';
const project=JSON.parse(gunzipSync(readFileSync('ci-logs/issue-784-restart-2/namespace-progress-diagnostic.json.gz'),{maxOutputLength:32*1024*1024}));
if(project.schema!=='complete-namespace-progress-diagnostic-v1'||readFileSync(project.path,'utf8')!==project.before)throw Error('Complete original project diagnostic differs');
const path='tools/translation/derive-bang-context.mjs',before=readFileSync(path,'utf8'),ts=ownershipCompiler();
if(ts.version!=='5.9.3')throw Error('Installed TypeScript 5.9.3 required');
const file=ts.createSourceFile(path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
if(file.parseDiagnostics.length)throw Error('Complete original grammar differs');
const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createUnscopedDeriveBangContext');
if(functions.length!==1)throw Error('One complete original creator required');
const loops=functions[0].body.statements.filter(node=>ts.isForOfStatement(node)&&node.expression.getText(file)==='deriveContext.certificates');
if(loops.length!==1||!ts.isBlock(loops[0].statement)||loops[0].initializer.getText(file)!=='const input')throw Error('Exact original finite invocation loop required');
const body=loops[0].statement;
const reporter=String.raw`
function reportBangDiagnostic(state,input){
 console.error(JSON.stringify({schema:'actual-derive-invocation-diagnostic-v1',diagnosticOnly:true,
  state,source:input.source,name:input.name,span:input.span,milliseconds:performance.now(),memory:process.memoryUsage()}));
}
`;
const edits=[
 {span:[body.getStart(file)+1,body.getStart(file)+1],expected:'',replacement:"reportBangDiagnostic('start',input);"},
 {span:[body.end-1,body.end-1],expected:'',replacement:"reportBangDiagnostic('end',input);"},
 {span:[before.length,before.length],expected:'',replacement:reporter},
];
let after=before;
for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
let shift=0;const inverse=edits.map(edit=>{const position=edit.span[0]+shift;shift+=edit.replacement.length;return {...edit,position};});
let restored=after;
for(const edit of inverse.reverse()){
 if(restored.slice(edit.position,edit.position+edit.replacement.length)!==edit.replacement)throw Error('Complete diagnostic inverse span differs');
 restored=restored.slice(0,edit.position)+restored.slice(edit.position+edit.replacement.length);
}
const fresh=ts.createSourceFile(path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
if(fresh.parseDiagnostics.length||restored!==before)throw Error('Complete diagnostic grammar/inverse differs');
const [equation]=transportConcreteSourcePhases([{before,middle:after,after,language:'JavaScript'}]);
const hash=value=>createHash('sha256').update(value).digest('hex');
const row={path,before,after,beforeSha256:hash(before),afterSha256:hash(after),edits,equation};
const files=[project,row];
for(const original of files)if(readFileSync(original.path,'utf8')!==original.before||hash(original.before)!==original.beforeSha256||hash(original.after)!==original.afterSha256)throw Error('Complete physical diagnostic input changed');
const plan={schema:'complete-bang-progress-diagnostic-v1',files,diagnosticOnly:true,ordinaryPlannerChanged:false,semanticAuthority:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(plan));if(raw.length>32*1024*1024)throw Error('Finite complete diagnostic evidence bound');
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw))throw Error('Complete proposal readback differs');
console.log(JSON.stringify({schema:plan.schema,bytes:raw.length,packedBytes:packed.length,files:files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),diagnosticOnly:true,semanticAuthority:false}));
