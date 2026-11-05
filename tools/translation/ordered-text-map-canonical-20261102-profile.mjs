// Complete canonical source successors, not compiler/type/owner permission.
// Original canonical guards and the legacy runtime API remain in these sources.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const parents=['tools/translation/js-to-rust/owned-core-source.mjs','tools/translation/js-to-rust/owned-core-operations.mjs','tools/translation/js-to-rust/owned-core-corpus.mjs'];
const root=fileURLToPath(new URL('../../',import.meta.url)),archive=fileURLToPath(new URL('./source-profiles/ordered-text-map-callers-20261102-canonical/ordered-text-map-callers-20261102-canonical-source-history.json.gz',import.meta.url));
const hash=source=>createHash('sha256').update(source).digest('hex');
function sourcePacket(run){
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{
  // The binary reader uses the same no-follow original file/ancestor scope.
  const raw=custody.readBytes(archive,1048576);if(raw.length>1048576)throw TypeError('Bounded canonical source packet required');
  const decoded=gunzipSync(raw,{maxOutputLength:4194304}),text=decoded.toString('utf8');if(!Buffer.from(text).equals(decoded))throw TypeError('Canonical source packet must be strict UTF8');const value=JSON.parse(text);
  if(value.schema!=='ordered-text-map-canonical-source-history-20261102-v1'||!Array.isArray(value.rows)||value.rows.length!==3||new Set(value.rows.map(row=>row.path)).size!==3||value.rows.some(row=>!parents.includes(row.path)))throw TypeError('Complete canonical three-parent source cohort required');
  for(const row of value.rows)if(typeof row.before!=='string'||typeof row.after!=='string'||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)throw TypeError('Complete canonical source ancestry differs');
  return run(value);
 },[custody.close]);
}
export function orderedTextMapCanonicalParentSourceData(){return sourcePacket(value=>value.rows.map(row=>({path:row.path,before:row.before,after:row.after,inverse:row.before})));}
export function proposeOrderedTextMapCanonicalSourceSuccessors(){return sourcePacket(value=>{
 const files=value.rows.map(row=>{
  const stages=[],rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete canonical source occurrence differs'));
  if(row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')throw TypeError('Canonical language then repository source stages required');
  const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)throw TypeError('Complete canonical source equation differs');
  let before=row.before;for(const sequence of row.sequences){const current=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after:current,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==current)throw TypeError('Complete canonical CST/inverse differs');stages.push({phase:sequence.phase,before,after:current,history});before=current;}
  return {path:row.path,before:row.before,after:row.after,inverse:row.before,stages,trace:result.trace};
 });
 return {files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,privateCallerBindingQualified:false,receivingExecuted:false,allChecks:'UNRUN'};
});}
