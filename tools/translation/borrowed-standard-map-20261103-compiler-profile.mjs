// Exact compiler source history DATA, never native type/body authority.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),packet=root+'tools/translation/source-profiles/borrowed-standard-map-compiler-20261103/complete-source.json.gz';
const parents=Object.freeze(["tools/translation/extensions/source-links.mjs","tools/translation/borrowed-standard-map-20261103-native-types.mjs","tools/translation/checked-types.mjs","tools/translation/extensions/ownership.mjs","tools/translation/extensions/host-contracts.mjs","tools/translation/router-core-json-updates.mjs","tools/translation/semantic-meta.mjs","tools/translation/semantic-meta-flat.mjs","tools/translation/type-layout.mjs","tools/translation/borrowed-standard-map-20261103-packaging.mjs","tools/translation/host-assets.mjs","tools/translation/test/borrowed-standard-map-20261103-caller-fragments.test.mjs"]);
const hash=value=>createHash('sha256').update(value).digest('hex');
export function proposeBorrowedStandardMapCompilerSourceSuccessors(){
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{
  const raw=custody.readBytes(packet,1048576);if(hash(raw)!=='ec287c612919b64ae44cea90a6657e3e32520d4419c1d808dc0fd6d179b78389')throw TypeError('Complete fixed compiler source packet differs');const decoded=gunzipSync(raw,{maxOutputLength:8388608}),text=decoded.toString('utf8');if(!Buffer.from(text).equals(decoded))throw TypeError('Complete strict UTF8 source history required');
  const value=JSON.parse(text);if(value.schema!=='borrowed-standard-map-compiler-source-20261103-v1'||!Array.isArray(value.rows)||value.rows.length!==12||new Set(value.rows.map(row=>row.path)).size!==12||value.rows.some(row=>!parents.includes(row.path)))throw TypeError('Fixed complete twelve-parent compiler/case history required');
  const files=value.rows.map(row=>{
   if(typeof row.before!=='string'||typeof row.after!=='string'||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.inverse!==row.before||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')throw TypeError('Complete two-phase source history differs');
   const rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'original compiler substitution occurrence differs'));
   const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)throw TypeError('Complete original compiler successor differs');
   let before=row.before;const stages=row.sequences.map(sequence=>{const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:row.language}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)throw TypeError('Full compiler CST/inverse differs');const stage={phase:sequence.phase,before,after,history};before=after;return stage;});return {path:row.path,before:row.before,after:row.after,inverse:row.before,stages};
  });
  const copied=value.copyHistory;let copiedText=copied.before;for(const rule of copied.substitutions){if(!rule.before||copiedText.split(rule.before).length-1!==rule.count)throw TypeError('Original whole requalification source copy differs');copiedText=copiedText.split(rule.before).join(rule.after);}if(copiedText!==copied.after||custody.read(root+copied.path)!==copied.after)throw TypeError('Actual whole caller requalification source differs');
  const copy=transportConcreteSourceEquations([{before:copied.before,after:copied.after,language:'JavaScript'}])[0];if(copy.inverse!==copied.before||transportConcreteSyntaxMeta(copy.beforeMeta).source!==copied.before||transportConcreteSyntaxMeta(copy.afterMeta).source!==copied.after)throw TypeError('Complete requalification copy CST differs');
  for(const row of value.additions)if(custody.read(root+row.path)!==row.source)throw TypeError('Complete compiler addition source differs');
  return {files,sourceAuthority:false,semanticAuthority:false,privateCallerQualified:false,receivingExecuted:false,verification:'UNRUN'};
 },[custody.close]);
}
