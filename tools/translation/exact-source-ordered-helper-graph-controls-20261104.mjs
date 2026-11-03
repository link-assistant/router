// Complete parent-source recipes. This DATA does not issue checked functions.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/exact-source-ordered-helper-graph-families-20261104/controls.json.gz';
const SHA='2c19c0e186d9763b78ebe92014d8b9340499ef86c100996082c2ab150683c702';
const PATHS=["tools/translation/exact-source-successors-20261103.mjs", "tools/translation/exact-source-compiler-epochs-20261103.mjs", "tools/translation/test/exact-source-compiler-epochs-20261103.test.mjs", "tools/translation/test/exact-source-temporary-recovery-families-20261103.test.mjs", "tools/translation/test/borrowed-json-tool-compiler-20261103.test.mjs", "tools/translation/test/borrowed-json-tool-lifetime-source-20261103.test.mjs", "tools/translation/test/borrowed-json-source-context-index-20261103.test.mjs", "tools/translation/test/borrowed-predicate-description-install-20261103.test.mjs", "tools/translation/test/collection-description-install-20261103.test.mjs", "tools/translation/test/boolean-helper-source-adoption-20261103.test.mjs", "tools/translation/test/copy-scalar-helper-adoption-20261103.test.mjs", "tools/translation/test/scalar-helper-locals-adoption-20261103.test.mjs", "tools/translation/test/scalar-helper-arguments-adoption-20261103.test.mjs", "tools/translation/test/scalar-helper-total-primitives-adoption-20261103.test.mjs", "tools/translation/test/ordered-scalar-helper-adoption-20261104.test.mjs"];
const hash=value=>createHash('sha256').update(value).digest('hex');
export function proposeExactOrderedHelperGraphControlSources20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);if(hash(packed)!==SHA)throw TypeError('Complete original reverse source archive changed');
  const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))throw TypeError('Lossless reverse source UTF8 required');const document=JSON.parse(text);
  if(document.schema!=='complete-ordered-helper-graph-controls-20261104-v1'||document.rows.length!==15||new Set(document.rows.map(row=>row.path)).size!==15||document.rows.some(row=>!PATHS.includes(row.path)))throw TypeError('Complete original reverse parent cohort required');
  const files=document.rows.map(row=>{
   if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')throw TypeError('Complete two-phase reverse source ancestry required');
   const rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original reverse source occurrence differs'));
   const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)throw TypeError('Whole reverse source successor differs');
   let before=row.before;const stages=row.sequences.map(sequence=>{const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)throw TypeError('Complete reverse stage CST/inverse differs');const stage={phase:sequence.phase,before,after,history};before=after;return stage;});
   return {path:row.path,before:row.before,after:row.after,inverse:row.inverse,stages,trace:result.trace};
  });return {files,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,sourceInstalled:false,verification:'UNRUN'};
 },[custody.close]);
}
