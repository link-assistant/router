import {matchesExactSourceEpoch} from './exact-source-compiler-epochs-20261103.mjs';
// Uninstalled two-reader Boolean-helper source recipes. This DATA does not issue checked functions.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/boolean-helper-20261103/complete-source.json.gz';
const SHA='79413e298030430692e247715f511c70d6a496fd0014a753f3713951e7753da8';
const PATHS=["tools/translation/js-to-rust/owned-core-source.mjs","tools/translation/js-to-rust/owned-vector-candidate-source.mjs"];
const hash=value=>createHash('sha256').update(value).digest('hex');
export function proposeBooleanHelperSources20261103(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);if(hash(packed)!==SHA)throw TypeError('Complete original reverse source archive changed');
  const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))throw TypeError('Lossless reverse source UTF8 required');const document=JSON.parse(text);
  if(document.schema!=='boolean-helper-source-20261103-v1'||document.rows.length!==2||new Set(document.rows.map(row=>row.path)).size!==2||document.rows.some(row=>!PATHS.includes(row.path)))throw TypeError('Complete original reverse parent cohort required');
  const files=document.rows.map(row=>{
   const current=custody.read(ROOT+row.path);if(current!==row.before&&!matchesExactSourceEpoch(row,current,{retainedBytes:Buffer.byteLength(row.before)+Buffer.byteLength(row.after)}))throw TypeError('Original whole reverse reader changed before proposal');
   if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')throw TypeError('Complete two-phase reverse source ancestry required');
   const rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original reverse source occurrence differs'));
   const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)throw TypeError('Whole reverse source successor differs');
   let before=row.before;const stages=row.sequences.map(sequence=>{const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)throw TypeError('Complete reverse stage CST/inverse differs');const stage={phase:sequence.phase,before,after,history};before=after;return stage;});
   return {path:row.path,before:row.before,after:row.after,inverse:row.inverse,stages,trace:result.trace};
  });const newFiles=document.newFiles.map(row=>{const actualPath=row.path==='tools/translation/boolean-helper-substitution-20261103.mjs'?row.path:row.path==='tools/translation/js-to-rust/test/owned-boolean-helpers.test.mjs'?'tools/translation/source-profiles/boolean-helper-20261103/receiving-source.mjs.txt':null;if(actualPath===null||custody.read(ROOT+actualPath)!==row.source)throw TypeError('Actual complete Boolean substitution/case source differs');if(typeof row.source!=='string'||hash(row.source)!==row.sha256||row.sequences.join(',')!=='language,repository')throw TypeError('Complete created source ancestry required');const concrete=transportConcreteSyntaxSource(row.source,{language:row.path.endsWith('.rs')?'Rust':'JavaScript'});if(concrete.source!==row.source||transportConcreteSyntaxMeta(concrete.meta).source!==row.source)throw TypeError('Complete created source CST differs');return {...row,concreteMeta:concrete.meta,sourceAuthority:false,semanticAuthority:false};});if(newFiles.length!==2||new Set(newFiles.map(row=>row.path)).size!==2)throw TypeError('Complete receiving case source required');return {files,newFiles,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,sourceInstalled:false,verification:'UNRUN'};
 },[custody.close]);
}
