// Additive bounded source-index composition DATA. Never compiler permission.
// The original single-index API and all of its limits remain unchanged.
import {createHash} from 'node:crypto';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {composeExactSourceSuccessorData} from './exact-source-successor-data-20261103.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
const MAX=16777216,hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Exact source segment DATA: '+message);};
const fields=(row,names)=>row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).sort().join(',')===names.slice().sort().join(',');
const path=value=>typeof value==='string'&&value.length>0&&value.length<=4096&&!/[\x00-\x1f\x7f\\:]/u.test(value)&&!/\p{Surrogate}/u.test(value)&&!value.startsWith('/')&&value.split('/').every(part=>part&&part!=='.'&&part!=='..');
const language=value=>['JavaScript','TypeScript','Rust'].includes(value);
function collect(input,initial){
 if(!fields(input,['path','before','current','segments'])||!path(input.path)||typeof input.before!=='string'||Buffer.byteLength(input.before)>4194304||input.current!==null&&(typeof input.current!=='string'||Buffer.byteLength(input.current)>4194304)||!Array.isArray(input.segments)||!input.segments.length||input.segments.length>64)fail('complete bounded selected source and index segments required');
 const segmentIds=new Set(),edgeIds=new Set(),counts=new Map(),languages=new Map(),edges=[];let retained=initial;
 const charge=bytes=>{retained+=bytes;if(retained>MAX)fail('aggregate original16MiB source DATA bound');};
 for(const segment of input.segments){
  if(!fields(segment,['id','indexText','images'])||typeof segment.id!=='string'||!segment.id.length||segment.id.length>96||segmentIds.has(segment.id)||typeof segment.indexText!=='string'||Buffer.byteLength(segment.indexText)>1048576||!Array.isArray(segment.images)||segment.images.length>128)fail('unique bounded whole index segment required');segmentIds.add(segment.id);
  const index=JSON.parse(segment.indexText);charge(account(index).utf8Bytes);if(!fields(index,['schema','scope','rows','sourceAuthority','semanticAuthority','verification'])||index.schema!=='fixed-reviewed-source-successor-index-20261103-v1'||!Array.isArray(index.rows)||index.rows.length>512||typeof index.scope!=='string'||index.sourceAuthority!==false||index.semanticAuthority!==false)fail('original512-row per-index bound');
  const selected=[];for(const row of index.rows){
   if(!fields(row,['id','path','language','profileManifest','before','after'])||typeof row.id!=='string'||!row.id||row.id.length>256||edgeIds.has(row.id)||!path(row.path)||!language(row.language)||!path(row.profileManifest)||!row.profileManifest.startsWith('tools/translation/source-profiles/'))fail('unique complete index row required');edgeIds.add(row.id);
   const count=(counts.get(row.path)??0)+1;counts.set(row.path,count);if(count>64)fail('original64-edge per-path bound across all segments');if(languages.has(row.path)&&languages.get(row.path)!==row.language)fail('one original language per source path');languages.set(row.path,row.language);
   for(const side of ['before','after']){const image=row[side];if(!fields(image,['path','bytes','sha256'])||!path(image.path)||!image.path.startsWith('tools/translation/source-profiles/')||!Number.isSafeInteger(image.bytes)||image.bytes<0||image.bytes>4194304||typeof image.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(image.sha256))fail('complete bounded source image reference required');}
   if(row.path===input.path)selected.push(row);
  }
  const images=new Map();for(const image of segment.images){if(!fields(image,['path','source'])||!path(image.path)||typeof image.source!=='string'||Buffer.byteLength(image.source)>4194304||images.has(image.path))fail('unique complete selected source images required');images.set(image.path,image.source);}
  const used=new Set(),read=image=>{const source=images.get(image.path);if(source===undefined||Buffer.byteLength(source)!==image.bytes||hash(source)!==image.sha256)fail('complete selected image bytes differ');used.add(image.path);return source;};
  for(const row of selected)edges.push({id:row.id,language:row.language,before:read(row.before),after:read(row.after)});
  if(used.size!==images.size)fail('unselected image data cannot masquerade as checked source');
 }
 const selected={path:input.path,before:input.before,current:input.current,edges};charge(account(selected).utf8Bytes);return {selected,retained};
}
/** Each complete index keeps512 rows/1MiB; one selected path still has at most
 *64 edges across the entire union. Aggregate input/parsed/selected DATA stays
 *16MiB. No index, image, graph or result is cached across invocations. */
export function composeExactSourceSegmentData20261104(input){
 const initial=account(input).utf8Bytes;input=copyMetadata(input);
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'language:retain-complete-bounded-source-index-segments',apply:value=>collect(value,initial)}]},
  {phase:'repository',rules:[{id:'repository:compose-original-unique-whole-source-chain-across-segments',apply:({selected,retained})=>{
   const result=composeExactSourceSuccessorData(selected);if(result===null)return null;
   const stages=result.chain.map((edge,at)=>{const substituted=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules:[countedLiteralSubstitutionRule('repository:exact-segment-source-edge-'+at,edge.before,edge.after,1,'whole source segment predecessor differs')]}]).run(edge.before),history=transportConcreteSourceEquations([{before:edge.before,after:edge.after,language:edge.language}])[0];if(substituted.value!==edge.after||history.inverse!==edge.before)fail('complete source edge/inverse differs');return {ids:edge.ids,before:edge.before,after:edge.after,inverse:edge.before,history,trace:substituted.trace};});
   const history=transportConcreteSourceEquations([{before:result.before,after:result.after,language:result.language}])[0];if(history.inverse!==result.before)fail('whole composed source inverse differs');
   const output={...result,stages,history,retainedSourceDataBytes:retained,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};boundedReconcileWireBytes(output);return output;
  }}]},
 ]).run(input);return run.value===null?null:{...run.value,segmentTrace:run.trace};
}
