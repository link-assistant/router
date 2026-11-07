// Diagnostic source composition only; keep the installed entry points exact.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
const prior=JSON.parse(gunzipSync(readFileSync('ci-logs/issue-784-restart-2/allocation-sample-diagnostic.json.gz'),{maxOutputLength:32*1024*1024}));
if(prior.schema!=='complete-allocation-sample-diagnostic-v1'||prior.files.length!==3)throw Error('Complete original diagnostic equations required');
const ts=ownershipCompiler(),hash=value=>createHash('sha256').update(value).digest('hex');
if(ts.version!=='5.9.3')throw Error('Actual lockfile TypeScript 5.9.3 required');
const files=prior.files.map(row=>{
 if(readFileSync(row.path,'utf8')!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)throw Error('Complete current source join differs');
 if(row.path.endsWith('/module-bindings.mjs'))return row;
 const file=ts.createSourceFile(row.path,row.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)throw Error('Complete original native grammar differs');
 const name=row.path.endsWith('/project.mjs')?'translateProject':'createDeriveBangContext';
 const selected=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 if(selected.length!==1)throw Error('Unique actual entry body required');
 const body=selected[0].body,expected=body.getText(file);
 const replacement=name==='translateProject'?
  '{return withSharedProjectProofCostScope(()=>'+expected+');}':
  '{return withSharedProjectProofCostScope(()=>createUnscopedDeriveBangContext({deriveContext}));}';
 const edits=[{span:[body.getStart(file),body.end],expected,replacement},
  {span:[row.after.length,row.after.length],expected:'',replacement:"\nimport {withCurrentRetainedPrivateNativeProofCostScope as withSharedProjectProofCostScope} from './private-native-proof-json.mjs';\n"}];
 let after=row.after;
 for(const edit of [...edits].reverse()){
  if(after.slice(...edit.span)!==edit.expected)throw Error('Exact original native span differs');
  after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
 }
 let shift=0;const inverses=edits.map(edit=>{const at=edit.span[0]+shift;shift+=edit.replacement.length-edit.expected.length;return {...edit,at};});
 let restored=after;
 for(const edit of inverses.reverse()){
  if(restored.slice(edit.at,edit.at+edit.replacement.length)!==edit.replacement)throw Error('Complete inverse span differs');
  restored=restored.slice(0,edit.at)+edit.expected+restored.slice(edit.at+edit.replacement.length);
 }
 if(restored!==row.after)throw Error('Complete original source inverse differs');
 if(ts.createSourceFile(row.path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Complete candidate native grammar differs');
 const [equation]=transportConcreteSourcePhases([{before:row.before,middle:row.after,after,language:'JavaScript'}]);
 return {...row,middle:row.after,after,afterSha256:hash(after),edits,equation};
});
const plan={schema:'complete-shared-proof-arithmetic-diagnostic-v1',files,diagnosticOnly:true,
 installed:false,semanticAuthority:false,productionExecutableGain:0,arithmeticAdmissionsBound:4096};
const raw=Buffer.from(JSON.stringify(plan));if(raw.length>32*1024*1024)throw Error('Finite complete diagnostic source bound');
const output='ci-logs/issue-784-restart-2/shared-proof-arithmetic-diagnostic.json.gz';
writeFileSync(output,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw))throw Error('Complete candidate source readback differs');
console.log(JSON.stringify({output,bytes:raw.length,sha256:hash(raw),diagnosticOnly:true,installed:false,
 files:files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256}))}));
