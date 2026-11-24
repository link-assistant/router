// Complete source proposal only; two parent edits do not activate private JSON typing.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const archive=fileURLToPath(new URL('./source-profiles/borrowed-json-tool-predicate-20261103/complete-source.json.gz',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const packetHash='7a7d25644c1c3cf2c90a4c0c630ebb37505eb1d2cc725ebdee302aa5487b275c';
export function proposeBorrowedJsonToolPredicateSourceSuccessors(){
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{
  const bytes=custody.readBytes(archive,1048576);if(hash(bytes)!==packetHash)throw TypeError('Fixed complete JSON source proposal differs');
  const raw=gunzipSync(bytes,{maxOutputLength:4194304}),text=raw.toString('utf8');
  if(!Buffer.from(text).equals(raw))throw TypeError('Strict UTF8 source proposal required');
  const packet=JSON.parse(text),paths=['tools/translation/extensions/json-runtime.mjs','tools/translation/host-assets.mjs'];
  if(packet.schema!=='borrowed-json-tool-predicate-20261103-partial-source-v1'||packet.rows.length!==2||new Set(packet.rows.map(row=>row.path)).size!==2)throw TypeError('Fixed two-parent source proposal required');
  const files=packet.rows.map(row=>{
   if(!paths.includes(row.path)||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.inverse!==row.before)throw TypeError('Complete source equation/inverse differs');
   if(custody.read(fileURLToPath(new URL('../../'+row.path,import.meta.url)),8388608)!==row.before)throw TypeError('Original source proposal epoch differs');
   const phases=[{phase:'language',rules:[]},{phase:'repository',rules:[countedLiteralSubstitutionRule('repository:borrowed-json-observed-projection-packaging',row.before,row.after,1,'complete parent source differs')]}];
   const result=createRulePipeline(phases).run(row.before);if(result.value!==row.after)throw TypeError('Complete source successor differs');
   const stages=[];let before=row.before;
   for(const phase of phases){
    const after=phase.phase==='language'?before:row.after;
    const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];
    if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)throw TypeError('Lossless reparsed source CST/inverse differs');
    stages.push({phase:phase.phase,before,after,history});before=after;
   }
   return {...row,stages,trace:result.trace};
  });
  // DATA/CST only: this does not issue native serde ownership, checked bodies or meta.
  return {files,applicationSources:packet.applicationSources,sourceInstalled:false,semanticAuthority:false,privateCallerQualified:false,allChecks:'UNRUN'};
 },[custody.close]);
}
