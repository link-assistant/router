// Complete parent-source recipes. This DATA does not issue checked functions.
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/protected-source-diagnostics-native-fd-20261103/complete-source.json.gz';
const SHA='ab9664de6ddbbcef807b8bf621c058dfe90218a8b8d93563688ac4b300c8013d';
const PATHS=['tools/translation/protected-source-diagnostics-20261103.mjs','tools/translation/protected-source-diagnostics-20261103-history.mjs','tools/translation/test/protected-source-diagnostics-20261103-history.test.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex');
export function proposeProtectedDiagnosticNativeFdSources(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);if(hash(packed)!==SHA)throw TypeError('Complete original reverse source archive changed');
  const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))throw TypeError('Lossless reverse source UTF8 required');const document=JSON.parse(text);
  if(document.schema!=='protected-source-diagnostics-native-fd-source-20261103-v1'||document.rows.length!==3||new Set(document.rows.map(row=>row.path)).size!==3||document.rows.some(row=>!PATHS.includes(row.path)))throw TypeError('Complete original reverse parent cohort required');
  const files=document.rows.map(row=>{
   if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')throw TypeError('Complete two-phase reverse source ancestry required');
   const rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original reverse source occurrence differs'));
   const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)throw TypeError('Whole reverse source successor differs');
   let before=row.before;const stages=row.sequences.map(sequence=>{const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)throw TypeError('Complete reverse stage CST/inverse differs');const stage={phase:sequence.phase,before,after,history};before=after;return stage;});
   return {path:row.path,before:row.before,after:row.after,inverse:row.inverse,stages,trace:result.trace};
  });return {files,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,sourceInstalled:false,verification:'UNRUN'};
 },[custody.close]);
}

import {exactSourceHistoryEpoch} from './exact-source-history-epoch-20261103.mjs';
export function knownProtectedDiagnosticNativeFdSuccessor({root=ROOT,path,before}={}){
 if(path!=='tools/translation/protected-source-diagnostics-20261103.mjs'||typeof before!=='string')return null;
 const row=proposeProtectedDiagnosticNativeFdSources().files.find(value=>value.path===path);if(!row||row.before!==before)return null;const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{const current=custody.read(join(root,path));if(current!==row.after)throw TypeError('Actual complete native FD diagnostic source differs');const history=exactSourceHistoryEpoch({path,before,after:row.after,current,language:'JavaScript'});return {...history,currentAfter:current,installationEquation:row,laterHistories:[],sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};},[custody.close]);
}
