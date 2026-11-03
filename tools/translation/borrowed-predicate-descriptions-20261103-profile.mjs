// Whole-parent source adoption proposal. No installer or semantic issuer.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {createConcreteSourceRuleRegistry} from './concrete-source-rule-registry.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {BORROWED_PREDICATE_OPERATION_DESCRIPTIONS,emitBorrowedPredicateDeclaration} from './borrowed-predicate-operation-descriptions-20261103.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PACKET='tools/translation/source-profiles/borrowed-predicate-descriptions-20261103/complete-source.json.gz';
const SHA='79745b1e3228aba61e90afcf8f26084d7cab2f9f63ac9e96b5e773d7679393ca';
const PATHS=Object.freeze([
 'tools/translation/borrowed-json-tool-20261103-forward.mjs',
 'tools/translation/borrowed-json-tool-20261103-reverse.mjs',
 'tools/translation/borrowed-standard-map-20261103-forward.mjs',
 'tools/translation/borrowed-standard-map-20261103-reverse.mjs',
 'tools/translation/borrowed-json-tool-predicate-20261103-runtime.d.mts',
 'tools/translation/borrowed-standard-map-20261102-runtime.d.mts',
]);
const HELPER='tools/translation/borrowed-predicate-operation-descriptions-20261103.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Borrowed predicate shared-description source: '+message);};
function templates(source,rules){
 return rules.flatMap(rule=>{
  if(typeof rule.before!=='string'||!rule.before||typeof rule.after!=='string'||!Number.isSafeInteger(rule.count)||rule.count<1||rule.count>4096)fail('complete exact-count substitution required');
  const edits=[];let at=0;
  for(;;){const start=source.indexOf(rule.before,at);if(start<0)break;const end=start+rule.before.length;edits.push({span:[start,end],expected:rule.before,parts:[rule.after]});at=end;}
  if(edits.length!==rule.count)fail('original whole-parent occurrence count differs');return edits;
 });
}
export function proposeBorrowedPredicateDescriptionSources(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);if(hash(packed)!==SHA)fail('immutable complete-parent archive differs');
  const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('lossless complete source UTF8 required');const document=JSON.parse(text);
  if(document.schema!=='borrowed-predicate-descriptions-source-20261103-v1'||document.rows.length!==PATHS.length||new Set(document.rows.map(row=>row.path)).size!==PATHS.length||document.rows.some(row=>!PATHS.includes(row.path)))fail('complete six-parent source cohort required');
  for(const row of document.rows){
   if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.language!==(row.path.endsWith('.d.mts')?'TypeScript':'JavaScript')||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('full source hashes, languages, two phases and inverses required');
  }
  const declarations=BORROWED_PREDICATE_OPERATION_DESCRIPTIONS.map(operation=>{
   const path='tools/translation/'+operation.declarationModule,row=document.rows.find(row=>row.path===path),source=emitBorrowedPredicateDeclaration(operation.id);
   if(!row||source!==row.after||source!==row.before)fail('original declaration bytes and private ABI pins must remain unchanged');return {path,source,operationId:operation.id,semanticAuthority:false};
  });
  const registry=createConcreteSourceRuleRegistry([
   {id:'language:shared-borrowed-predicate-signatures',phase:'language',plan:sources=>sources.map(source=>({path:source.path,templates:templates(source.source,document.rows.find(row=>row.path===source.path).sequences[0].rows)}))},
   {id:'repository:bind-original-borrowed-predicate-descriptions',phase:'repository',requires:['language:shared-borrowed-predicate-signatures'],plan:sources=>sources.map(source=>({path:source.path,templates:templates(source.source,document.rows.find(row=>row.path===source.path).sequences[1].rows)}))},
  ]);
  const plan=registry.plan(document.rows.map(row=>({path:row.path,language:row.language,source:row.before})),['repository:bind-original-borrowed-predicate-descriptions']);
  for(const row of plan.files)if(row.after!==document.rows.find(original=>original.path===row.path).after)fail('complete composed parent successor differs');
  if(document.newFiles.length!==1||document.newFiles[0].path!==HELPER)fail('complete shared description implementation source required');
  const newFiles=document.newFiles.map(row=>{
   if(typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+row.path)!==row.source)fail('complete current description implementation differs');
   const concrete=transportConcreteSyntaxSource(row.source,{language:'JavaScript'});if(concrete.source!==row.source||transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('complete description CST roundtrip differs');return {...row,concreteMeta:concrete.meta,sourceAuthority:false,semanticAuthority:false};
  });
  return {plan,declarations,newFiles,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,nativeBindingQualified:false,sourceInstalled:false,verification:'UNRUN'};
 },[custody.close]);
}
