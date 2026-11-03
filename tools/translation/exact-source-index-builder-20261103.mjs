// Reusable index/image authoring DATA. Never installs, imports or qualifies code.
import {createHash} from 'node:crypto';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
const fail=message=>{throw TypeError('Exact source index authoring DATA: '+message);};
const hash=source=>createHash('sha256').update(source).digest('hex');
const safe=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&!/[\x00-\x1f\x7f\\:]/u.test(path)&&!/\p{Surrogate}/u.test(path)&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
const fields=(row,names)=>row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).sort().join(',')===names.slice().sort().join(',');
function language(input){
 if(!fields(input,['previous','families'])||input.previous?.schema!=='fixed-reviewed-source-successor-index-20261103-v1'||!Array.isArray(input.previous.rows)||!Array.isArray(input.families)||input.families.length>64)fail('complete previous index and bounded source families required');
 const families=input.families.map(family=>{
  if(!fields(family,['id','manifest','rows'])||typeof family.id!=='string'||!/^[a-z][a-z0-9-]{0,95}$/u.test(family.id)||!safe(family.manifest)||!family.manifest.startsWith('tools/translation/source-profiles/')||!Array.isArray(family.rows)||!family.rows.length||family.rows.length>128)fail('bounded complete named source family required');
  return {...family,rows:family.rows.map(row=>{
   if(!fields(row,['id','path','language','before','after'])||typeof row.id!=='string'||!row.id||row.id.length>128||!safe(row.path)||!['JavaScript','TypeScript','Rust'].includes(row.language)||typeof row.before!=='string'||typeof row.after!=='string'||Buffer.byteLength(row.before)>4194304||Buffer.byteLength(row.after)>4194304)fail('complete bounded source equation required');
   const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:row.language}])[0];if(history.inverse!==row.before)fail('complete source inverse differs');return row;
  })};
 });
 return {previous:input.previous,families};
}
function repository({previous,families}){
 const rows=previous.rows.slice(),images=new Map(),ids=new Set(),counts=new Map();
 const observe=row=>{
  if(typeof row.id!=='string'||!row.id||row.id.length>256||ids.has(row.id)||!safe(row.path)||!['JavaScript','TypeScript','Rust'].includes(row.language))fail('unique complete source-index row required');
  ids.add(row.id);counts.set(row.path,(counts.get(row.path)??0)+1);if(counts.get(row.path)>64)fail('original complete per-path edge bound');
  for(const side of ['before','after']){const image=row[side];if(!image||!safe(image.path)||!image.path.startsWith('tools/translation/source-profiles/')||!Number.isSafeInteger(image.bytes)||image.bytes<0||image.bytes>4194304||!/^[a-f0-9]{64}$/u.test(image.sha256))fail('complete bounded source image identity required');}
 };
 for(const row of rows)observe(row);
 for(const family of families)for(const row of family.rows){
  if(row.path==='tools/translation/exact-source-successors-20261103.mjs')fail('engine ancestry requires its separate complete source history outside the hashed index');
  const id=family.id+':'+row.id,key=hash(id),sides={};
  for(const side of ['before','after']){
   const path='tools/translation/source-profiles/'+family.id+'/'+key+'.'+side+'.txt',source=row[side],prior=images.get(path);
   if(prior!==undefined&&prior!==source)fail('conflicting complete source image path');images.set(path,source);sides[side]={path,bytes:Buffer.byteLength(source),sha256:hash(source)};
  }
  const next={id,path:row.path,language:row.language,profileManifest:family.manifest,...sides};observe(next);rows.push(next);
 }
 if(rows.length>512)fail('explicit authoring profile index bound');
 const index={...previous,rows,scope:'Reviewed whole-source equations only; incomplete production source/function/writer census',sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'},text=JSON.stringify(index,null,2)+'\n';
 if(Buffer.byteLength(text)>1048576)fail('original complete index byte bound');
 return {index,indexText:text,indexSha256:hash(text),images:[...images].map(([path,source])=>({path,source})),previousPreserved:true,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function extendExactSourceIndexData(input){
 account(input);input=copyMetadata(input);
 const result=createRulePipeline([{phase:'language',rules:[{id:'language:whole-source-CST-and-complete-inverse',apply:language}]},{phase:'repository',rules:[{id:'repository:deterministic-bounded-index-images-preserving-prior-equations',apply:repository}]}]).run(input);
 boundedReconcileWireBytes(result.value);return {...result.value,trace:result.trace};
}
/** Additive compact layout keeps large DATA indexes below the repository line
 * limit. Original pretty-output API, source/CST checks and limits are intact. */
export function extendExactSourceIndexCompactData(input){
 account(input);input=copyMetadata(input);
 const result=createRulePipeline([
  {phase:'language',rules:[{id:'language:whole-source-CST-and-complete-inverse',apply:language}]},
  {phase:'repository',rules:[{id:'repository:bounded-compact-index-preserving-complete-equations',apply:value=>{
   const proposal=repository(value),indexText=JSON.stringify(proposal.index)+'\n';
   if(Buffer.byteLength(indexText)>1048576)fail('original complete index byte bound');
   return {...proposal,indexText,indexSha256:hash(indexText),layout:'compact-complete-data-v1'};
  }}]},
 ]).run(input);
 boundedReconcileWireBytes(result.value);return {...result.value,trace:result.trace};
}
