// Complete original outcome/project-unit source successors; DATA never grants admission.
// Apply all twelve equations before a fresh import; preserve the active map17 cohort.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const parents=['js-to-rust/owned-outcome-source.mjs','js-to-rust/owned-outcome-operations.mjs','owned-outcome-unit.mjs','owned-project-unit.mjs','synchronize-owned-project-units.mjs','js-to-rust/owned-outcome-rust-projection.mjs','js-to-rust/owned-primitive-vector-literal-rust-syntax.mjs','js-to-rust/owned-outcome-rust.mjs','js-to-rust/owned-outcome-unit-inputs.mjs','js-to-rust/owned-project-signature-inputs.mjs','js-to-rust/owned-outcome-rust-syntax.mjs','js-to-rust/owned-module-scalar-rust-source.mjs'].map(path=>'tools/translation/'+path);
const root=fileURLToPath(new URL('../../',import.meta.url)),archive=fileURLToPath(new URL('./source-profiles/ordered-text-map-callers-20261102-units/ordered-text-map-callers-20261102-unit-source-history.json.gz',import.meta.url));
const hash=source=>createHash('sha256').update(source).digest('hex');
function sourcePacket(run){
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{
  // The binary reader uses the same no-follow original file/ancestor scope.
  const raw=custody.readBytes(archive,1048576);if(raw.length>1048576)throw TypeError('Bounded unit source packet required');
  const decoded=gunzipSync(raw,{maxOutputLength:4194304}),text=decoded.toString('utf8');if(!Buffer.from(text).equals(decoded))throw TypeError('Unit source packet must be strict UTF8');const value=JSON.parse(text);
  if(value.schema!=='ordered-text-map-unit-source-history-20261102-v1'||!Array.isArray(value.rows)||value.rows.length!==12||new Set(value.rows.map(row=>row.path)).size!==12||value.rows.some(row=>!parents.includes(row.path)))throw TypeError('Complete unit twelve-parent source cohort required');
  for(const row of value.rows)if(typeof row.before!=='string'||typeof row.after!=='string'||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)throw TypeError('Complete unit source ancestry differs');
  const additions=['tools/translation/ordered-text-map-callers-20261102-unit-inputs.mjs','tools/translation/ordered-text-map-callers-20261102-unit-profile.mjs','tools/translation/test/ordered-text-map-callers-20261102-unit-cases.mjs','docs/development/ordered-text-map-callers-20261102-units.md'];if(!Array.isArray(value.authoredAdditions)||value.authoredAdditions.length!==4||new Set(value.authoredAdditions.map(row=>row.path)).size!==4||value.authoredAdditions.some(row=>!additions.includes(row.path)))throw TypeError('Complete exact unit authored path census differs');
  if(!Array.isArray(value.authoredAdditions))throw TypeError('Complete unit authored-source ancestry required');for(const row of value.authoredAdditions)if(typeof row.after!=='string'||custody.read(fileURLToPath(new URL('../../'+row.path,import.meta.url)))!==row.after||row.before!==''||row.inverse!=='')throw TypeError('Actual complete unit authored source differs');
  const history=value.completePriorMainArchive;if(!history||history.path!=='tools/translation/ordered-text-map-callers-20261102-source-history.json.gz'||typeof history.bytesBase64!=='string')throw TypeError('Complete prior main source archive required');const prior=Buffer.from(history.bytesBase64,'base64');if(prior.length>1048576||prior.toString('base64')!==history.bytesBase64||hash(prior)!==history.sha256||history.inverse?.completeBytesField!=='bytesBase64'||history.inverse.sha256!==history.sha256)throw TypeError('Complete main binary inverse differs');const priorText=gunzipSync(prior,{maxOutputLength:4194304}).toString('utf8'),before=JSON.parse(priorText),successor=value.authoredSuccessors;if(!Array.isArray(successor)||successor.length!==1||successor[0].path!=='tools/translation/ordered-text-map-callers-20261102-producer.mjs'||successor[0].before!==before.authoredSources.find(row=>row.path===successor[0].path)?.after||successor[0].inverse!==successor[0].before||custody.read(fileURLToPath(new URL('../../'+successor[0].path,import.meta.url)))!==successor[0].after)throw TypeError('Complete actual producer successor differs');
  return run(value);
 },[custody.close]);
}
export function orderedTextMapUnitParentSourceData(){return sourcePacket(value=>value.rows.map(row=>({path:row.path,before:row.before,after:row.after,inverse:row.before})));}
export function proposeOrderedTextMapUnitSourceSuccessors(){return sourcePacket(value=>{
 const files=value.rows.map(row=>{
  const stages=[],rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete unit source occurrence differs'));
  if(row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')throw TypeError('Unit language then repository source stages required');
  const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)throw TypeError('Complete unit source equation differs');
  let before=row.before;for(const sequence of row.sequences){const current=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after:current,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==current)throw TypeError('Complete unit CST/inverse differs');stages.push({phase:sequence.phase,before,after:current,history});before=current;}
  return {path:row.path,before:row.before,after:row.after,inverse:row.before,stages,trace:result.trace};
 });
 return {files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,privateCallerBindingQualified:false,receivingExecuted:false,allChecks:'UNRUN'};
});}
