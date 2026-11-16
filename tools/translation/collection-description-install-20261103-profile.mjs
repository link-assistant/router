// Complete parent-source recipes. This DATA does not issue checked functions.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/collection-description-install-20261103/complete-source.json.gz';
const SHA='d011041ad959d7d19dd78b80850d32d7c5a73ff7376ea006327f2ee48e95ed3c';
const PATHS=["tools/translation/primitive-sequence-call-shape.mjs", "tools/translation/primitive-owned-vector-call-shape.mjs", "tools/translation/owned-text-vector-call-shape.mjs", "tools/translation/primitive-vector-literal-call-shape.mjs", "tools/translation/owned-text-vector-literal-call-shape.mjs", "tools/translation/test/primitive-collection-descriptions-20261103.test.mjs", "tools/translation/test/vector-operation-descriptions-20261103.test.mjs"];
const hash=value=>createHash('sha256').update(value).digest('hex');
export function proposeCollectionDescriptionInstalledSources(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);if(hash(packed)!==SHA)throw TypeError('Complete original reverse source archive changed');
  const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))throw TypeError('Lossless reverse source UTF8 required');const document=JSON.parse(text);
  if(document.schema!=='collection-description-installed-source-20261103-v1'||document.rows.length!==7||new Set(document.rows.map(row=>row.path)).size!==7||document.rows.some(row=>!PATHS.includes(row.path)))throw TypeError('Complete original reverse parent cohort required');
  const files=document.rows.map(row=>{
   if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')throw TypeError('Complete two-phase reverse source ancestry required');
   const rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original reverse source occurrence differs'));
   const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)throw TypeError('Whole reverse source successor differs');
   let before=row.before;const stages=row.sequences.map(sequence=>{const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)throw TypeError('Complete reverse stage CST/inverse differs');const stage={phase:sequence.phase,before,after,history};before=after;return stage;});
   return {path:row.path,before:row.before,after:row.after,inverse:row.inverse,stages,trace:result.trace};
  });const newFiles=document.newFiles.map(row=>{if(typeof row.source!=='string'||hash(row.source)!==row.sha256||row.sequences.join(',')!=='language,repository')throw TypeError('Complete created source ancestry required');const concrete=transportConcreteSyntaxSource(row.source,{language:row.path.endsWith('.rs')?'Rust':'JavaScript'});if(concrete.source!==row.source||transportConcreteSyntaxMeta(concrete.meta).source!==row.source)throw TypeError('Complete created source CST differs');return {...row,concreteMeta:concrete.meta,sourceAuthority:false,semanticAuthority:false};});if(newFiles.length!==0)throw TypeError('Complete receiving case source required');return {files,newFiles,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,sourceInstalled:false,verification:'UNRUN'};
 },[custody.close]);
}
