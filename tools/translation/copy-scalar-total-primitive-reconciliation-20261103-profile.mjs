import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
// Complete creation images only. No installer or semantic issuer.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createConcreteSourceRuleRegistry} from './concrete-source-rule-registry.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PACKET='tools/translation/source-profiles/copy-scalar-total-primitive-reconciliation-20261103/complete-source.json.gz';
const SHA='a806972794ddf1858ea516c430d62c06642563106110fc5c78cf2a8d66badcb5';
const PATHS=['tools/translation/js-to-rust/copy-scalar-total-primitive-source-reconciliation-20261103.mjs','tools/translation/js-to-rust/test/copy-scalar-total-primitive-source-reconciliation-20261103.test.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Scalar source reconciliation creation: '+message);};
export function proposeCopyScalarTotalPrimitiveReconciliation20261103(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const raw=custody.readBytes(ROOT+PACKET,1048576);if(hash(raw)!==SHA)fail('fixed complete creation archive differs');
  const bytes=gunzipSync(raw,{maxOutputLength:8388608}),text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))fail('complete creation UTF8 differs');const document=JSON.parse(text);
  if(document.schema!=='copy-scalar-total-primitive-reconciliation-creation-20261103-v1'||document.files.length!==2||new Set(document.files.map(row=>row.path)).size!==2)fail('both complete creations required');
  for(const row of document.files)if(!PATHS.includes(row.path)||row.language!=='JavaScript'||typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+row.path)!==row.source||row.sequences.join(',')!=='language,repository')fail('actual complete creation source differs');
  if(!Array.isArray(document.copies)||document.copies.length!==2)fail('complete original copy ancestry required');
  const originals=new Set(['tools/translation/js-to-rust/copy-scalar-rust-source-reconciliation-20261103.mjs','tools/translation/js-to-rust/test/copy-scalar-rust-source-reconciliation-20261103.test.mjs']);
  const copies=document.copies.map(row=>{
   if(!originals.delete(row.originalPath)||!PATHS.includes(row.path)||typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||custody.read(ROOT+row.originalPath)!==row.before||custody.read(ROOT+row.path)!==row.after||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('complete actual parent/copy source differs');
   let source=row.before;const stages=[];for(const sequence of row.sequences){const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'whole copy occurrence differs')),after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(source).value,history=transportConcreteSourceEquations([{before:source,after,language:'JavaScript'}])[0];if(history.inverse!==source)fail('whole intermediate copy CST inverse differs');stages.push({phase:sequence.phase,before:source,after,history});source=after;}
   if(source!==row.after)fail('complete copy substitution differs');return {...row,stages,sourceAuthority:false,semanticAuthority:false};
  });
  const registry=createConcreteSourceRuleRegistry([
   {id:'language:retain-complete-source-reconciliation-implementation-and-cases',phase:'language',plan:files=>files.map(file=>({path:file.path,templates:[{span:[0,0],expected:'',parts:[document.files.find(row=>row.path===file.path).source]}]}))},
   {id:'repository:retain-original-source-creation-paths-and-both-rule-sequences',phase:'repository',requires:['language:retain-complete-source-reconciliation-implementation-and-cases'],plan:files=>files.map(file=>({path:file.path,templates:[]}))},
  ]);
  const plan=registry.plan(document.files.map(row=>({path:row.path,language:'JavaScript',source:''})),['repository:retain-original-source-creation-paths-and-both-rule-sequences']);
  for(const file of plan.files)if(file.before!==''||file.inverse!==''||file.after!==document.files.find(row=>row.path===file.path).source)fail('complete source creation/CST inverse differs');
  return {plan,copies,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
