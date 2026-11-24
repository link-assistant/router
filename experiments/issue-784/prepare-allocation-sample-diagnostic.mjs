// Full native/CST diagnostic equations; no installed source or semantic change.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
const previous=JSON.parse(gunzipSync(readFileSync('ci-logs/issue-784-restart-2/resolver-progress-diagnostic.json.gz'),{maxOutputLength:32*1024*1024}));
if(previous.schema!=='complete-resolver-progress-diagnostic-v1'||previous.files.length!==3)throw Error('Complete previous diagnostic required');
const ts=ownershipCompiler(),hash=value=>createHash('sha256').update(value).digest('hex');
if(ts.version!=='5.9.3')throw Error('Lockfile compiler 5.9.3 required');
function one(rows){if(rows.length!==1)throw Error('Unique complete native reporter required');return rows[0];}
function parse(path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw Error('Complete native diagnostic grammar differs');return file;}
const files=previous.files.map(row=>{
 if(readFileSync(row.path,'utf8')!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)throw Error('Complete original diagnostic inputs changed');
 if(row.path.endsWith('/project.mjs'))return row;
 const file=parse(row.path,row.after),names=row.path.endsWith('/module-bindings.mjs')?['reportResolverDiagnostic']:['reportBangDiagnostic','reportResolverDiagnostic'];
 const edits=names.map(name=>{
  const node=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name));
  return {span:[node.getStart(file),node.end],expected:node.getText(file),replacement:name==='reportBangDiagnostic'?
   "function reportBangDiagnostic(state,input){allocationCheckpoint('derive-'+state,input.source,input.name);}":
   "function reportResolverDiagnostic(stage,module,item=null){allocationCheckpoint(stage,module?.file??null,item?.name??null);}"};
 });
 edits.push({span:[row.after.length,row.after.length],expected:'',replacement:"\nimport {allocationCheckpoint} from '../../experiments/issue-784/allocation-sample-control.mjs';\n"});
 let after=row.after;
 for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(after.slice(...edit.span)!==edit.expected)throw Error('Complete diagnostic native span differs');
  after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
 }
 let shift=0;const inverse=edits.map(edit=>{const position=edit.span[0]+shift;shift+=edit.replacement.length-edit.expected.length;return {...edit,position};});
 let restored=after;
 for(const edit of inverse.reverse()){
  if(restored.slice(edit.position,edit.position+edit.replacement.length)!==edit.replacement)throw Error('Complete diagnostic inverse span differs');
  restored=restored.slice(0,edit.position)+edit.expected+restored.slice(edit.position+edit.replacement.length);
 }
 if(restored!==row.after)throw Error('Complete diagnostic inverse differs');parse(row.path,after);
 const [equation]=transportConcreteSourcePhases([{before:row.before,middle:row.after,after,language:'JavaScript'}]);
 return {path:row.path,before:row.before,middle:row.after,after,beforeSha256:row.beforeSha256,afterSha256:hash(after),edits,equation};
});
const plan={schema:'complete-allocation-sample-diagnostic-v1',files,diagnosticOnly:true,installed:false,semanticAuthority:false};
const raw=Buffer.from(JSON.stringify(plan));if(raw.length>32*1024*1024)throw Error('Finite complete diagnostic evidence bound');
const output='ci-logs/issue-784-restart-2/allocation-sample-diagnostic.json.gz';
writeFileSync(output,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw))throw Error('Complete diagnostic proposal readback differs');
console.log(JSON.stringify({output,bytes:raw.length,sha256:hash(raw),files:files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),installed:false}));
