// Complete source diagnostics only; no compiler admission or source writes.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareOriginalClassBirthPlan} from '../../tools/translation/prepare-original-class-birth.mjs';
import {invocationLocalFreezerSourcePairs} from '../../tools/translation/prepare-invocation-local-freezer.mjs';
import {deriveGuardedProofLexingConsumerSource} from '../../tools/translation/prepare-guarded-proof-lexing.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const ts=ownershipCompiler();
const plan=prepareOriginalClassBirthPlan();
const before=JSON.parse(plan.leaf.storage.beforeProgramJson),after=JSON.parse(plan.leaf.storage.programJson),differences=[];
const describe=value=>typeof value==='string'&&value.length>250?{bytes:Buffer.byteLength(value),sha256:hash(value)}:value;
function compare(a,b,path='$'){
 if(JSON.stringify(a)===JSON.stringify(b))return;
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
  for(const key of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[key],b[key],path+'.'+key);
 }else differences.push({path,before:describe(a),after:describe(b)});
}
compare(before,after);
const freezer=invocationLocalFreezerSourcePairs().map(row=>{
 const current=readFileSync(row.path,'utf8');
 let guarded=null,error=null;
 try{if(current!==row.after)guarded=deriveGuardedProofLexingConsumerSource(current,row.path);}catch(cause){error=cause.message;}
 return {...row,current,guarded,error,exact:current===row.after,guardedOriginalExact:guarded?.source===row.after};
});
const source=readFileSync('tools/translation/prepare-real-source-fixtures.mjs','utf8');
const syntax=ts.createSourceFile('prepare-real-source-fixtures.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
if(syntax.parseDiagnostics.length)throw Error('Complete producer grammar differs');
const imports=syntax.statements.filter(ts.isImportDeclaration).map(node=>({span:[node.getStart(syntax),node.end],source:node.getText(syntax),module:node.moduleSpecifier.text}));
const data={schema:'source-producer-mismatch-diagnostic-v1',plan,differences,freezer,staticProducer:{source,imports},sourceAuthority:false,runtimeAuthority:false};
const raw=Buffer.from(JSON.stringify(data)+'\n'),packed=gzipSync(raw,{level:9,mtime:0});
const target='ci-logs/issue-784-restart-2/source-producer-mismatches.json.gz';
writeFileSync(target,packed,{flag:'wx'});
if(!gzipSync)throw Error('Missing encoder');
console.log(JSON.stringify({target,bytes:raw.length,packedBytes:packed.length,sha256:hash(packed),classFiles:plan.files.length,classChanges:plan.files.filter(row=>readFileSync('tools/translation/'+row.path,'utf8')!==row.afterSource).map(row=>row.path),programDifferences:differences,freezer:freezer.map(({path,exact,error,guardedOriginalExact})=>({path,exact,error,guardedOriginalExact})),staticImports:imports},null,2));
