// Complete readonly source consumer successors, never compiler/type authority.
// Original canonical guards and the legacy runtime API remain in these sources.
import {fileURLToPath} from 'node:url';import {captureReadonlySourceProfile} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const parents=["tools/translation/compact-source-vault-20261102.mjs","tools/translation/compact-sparse-git-io-20261102.mjs","tools/translation/ordered-text-map-callers-20261102-source-storage.mjs"];
const root=fileURLToPath(new URL('../../',import.meta.url)),archive=fileURLToPath(new URL('./source-profiles/ordered-text-map-callers-20261102-source-storage-lease/ordered-text-map-callers-20261102-source-storage-lease-source-history.json.gz',import.meta.url));
const hash=source=>createHash('sha256').update(source).digest('hex');
function sourcePacket(run){
 const custody=createOrderedMapCanonicalSourceCustody(root);let stored;
 return withCompleteSourceClosingFence(()=>{
  stored=captureReadonlySourceProfile(archive,{maximum:1048576});const raw=stored?stored.bytes:custody.readBytes(archive,1048576);if(raw.length>1048576)throw TypeError('Bounded complete source profile proposal required');
  const decoded=gunzipSync(raw,{maxOutputLength:4194304}),text=decoded.toString('utf8');if(!Buffer.from(text).equals(decoded))throw TypeError('Canonical source packet must be strict UTF8');const value=JSON.parse(text);
  if(value.schema!=='readonly-source-profile-lease-successors-20261103-v1'||!Array.isArray(value.rows)||value.rows.length!==3||new Set(value.rows.map(row=>row.path)).size!==3||value.rows.some(row=>!parents.includes(row.path)))throw TypeError('Complete readonly three-parent source cohort required');
  for(const row of value.rows)if(typeof row.before!=='string'||typeof row.after!=='string'||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256)throw TypeError('Complete canonical source ancestry differs');
  return run(value);
 },[()=>{if(stored)stored.requireCurrent();},custody.close]);
}
export function readonlySourceProfileLeaseSourceData(){return sourcePacket(value=>value.rows.map(row=>({path:row.path,before:row.before,after:row.after,inverse:row.before})));}
export function proposeReadonlySourceProfileLeaseSuccessors(){return sourcePacket(value=>{
 const files=value.rows.map(row=>{
  const stages=[],rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete canonical source occurrence differs'));
  if(row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')throw TypeError('Canonical language then repository source stages required');
  const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)throw TypeError('Complete canonical source equation differs');
  let before=row.before;for(const sequence of row.sequences){const current=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after:current,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==current)throw TypeError('Complete canonical CST/inverse differs');stages.push({phase:sequence.phase,before,after:current,history});before=current;}
  return {path:row.path,before:row.before,after:row.after,inverse:row.before,stages,trace:result.trace};
 });
 return {files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,privateCallerBindingQualified:false,receivingExecuted:false,allChecks:'UNRUN'};
});}
