// Complete original/successor source equations. This proposes installation; it
// never imports/evaluates proposed Host modules or treats CST as semantic proof.
import {readFileSync,lstatSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
export const ORDERED_TEXT_MAP_CALLER_PARENT_PATHS=Object.freeze(['tools/translation/checked-types.mjs','tools/translation/extensions/source-links.mjs','tools/translation/extensions/ownership.mjs','tools/translation/extensions/host-contracts.mjs','tools/translation/router-core-json-updates.mjs','tools/translation/semantic-meta.mjs','tools/translation/semantic-meta-flat.mjs','tools/translation/type-layout.mjs','tools/translation/host-assets.mjs','tools/translation/js-to-rust/owned-vector-candidate-source.mjs','tools/translation/js-to-rust/owned-vector-candidate-operations.mjs','tools/translation/namespace-standard.mjs','tools/translation/private-cargo-toml.mjs','tools/translation/cargo-invocation-plan.mjs']);
const archive=new URL('./ordered-text-map-callers-20261102-source-history.json.gz',import.meta.url);
const hash=source=>createHash('sha256').update(source).digest('hex');
function packet(){const stat=lstatSync(archive);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)throw TypeError('Bounded complete ordered-map source archive required');const raw=readFileSync(archive),decoded=gunzipSync(raw,{maxOutputLength:4194304}),value=JSON.parse(decoded.toString('utf8'));if(value.schema!=='ordered-text-map-callers-source-history-20261102-v1'||!Array.isArray(value.rows)||value.rows.length!==ORDERED_TEXT_MAP_CALLER_PARENT_PATHS.length||new Set(value.rows.map(row=>row.path)).size!==value.rows.length||value.rows.some(row=>!ORDERED_TEXT_MAP_CALLER_PARENT_PATHS.includes(row.path)))throw TypeError('Complete original map source-history schema required');return {raw,value};}
export function proposeOrderedTextMapCallerSourceSuccessors(){
 const captured=packet();
 return withCompleteSourceClosingFence(()=>{
  const files=captured.value.rows.map(row=>{
   if(hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)throw TypeError('Complete source ancestry bytes differ');
   const stages=[],pipeline=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete map caller source occurrence count differs'))})));
   const result=pipeline.run(row.before);if(result.value!==row.after)throw TypeError('Complete source successor equation differs');
   let before=row.before;
   for(const sequence of row.sequences){const run=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'map caller language occurrence differs')):[]},{phase:'repository',rules:sequence.phase==='repository'?sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'map caller repository occurrence differs')):[]}]).run(before);const history=transportConcreteSourceEquations([{before,after:run.value,language:row.language}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==run.value)throw TypeError('Complete caller CST/inverse differs');stages.push({phase:sequence.phase,before,after:run.value,history});before=run.value;}
   return {path:row.path,before:row.before,after:row.after,inverse:row.before,stages,trace:result.trace};
  });
  return {files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,privateCallerBindingQualified:false,receivingExecuted:false,allChecks:'UNRUN'};
 },[()=>{if(!packet().raw.equals(captured.raw))throw TypeError('Complete map source archive changed during proposal');}]);
}
/** Complete authored additions as source DATA for the fixed package producer. */
export function orderedTextMapCallerAuthoredSources(){
 const {value}=packet();if(!Array.isArray(value.authoredSources)||value.authoredSources.length>64)throw TypeError('Bounded complete authored map source additions required');return value.authoredSources;
}
// Detached source DATA for installed/predecessor selection only. No CST,
// source, type, native-owner or checked-body authority is issued by these rows.
export function orderedTextMapCallerParentSourceData(){
 const {value}=packet();return value.rows.map(row=>{if(typeof row.before!=='string'||typeof row.after!=='string'||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)throw TypeError('Complete map source DATA ancestry differs');return {path:row.path,before:row.before,after:row.after,inverse:row.before};});
}
