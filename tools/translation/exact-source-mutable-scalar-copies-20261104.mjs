// Complete original collector/control/case source copies. DATA only, UNRUN.
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {knownExactSourceSuccessor} from './exact-source-successors-20261103.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/exact-source-mutable-scalar-families-20261104/authoring-copies.json.gz';
const SHA='3fc37381f55b8b38d0e304c78e8d97beb448559eb11b8b207c27f4a671f7c8d5',hash=value=>createHash('sha256').update(value).digest('hex');
const PATHS=['tools/translation/exact-source-mutable-scalar-families-20261104.mjs','tools/translation/exact-source-mutable-scalar-controls-20261104.mjs','tools/translation/test/mutable-scalar-adoption-20261104.test.mjs'];
const ORIGINALS=['tools/translation/exact-source-scalar-early-return-families-20261104.mjs','tools/translation/exact-source-scalar-early-return-controls-20261104.mjs','tools/translation/test/scalar-early-return-adoption-20261104.test.mjs'];
const need=(value,message)=>{if(!value)throw TypeError('Mutable scalar authoring copies: '+message);};
export function proposeExactMutableScalarAuthoringCopies20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);need(hash(packed)===SHA,'fixed complete source copies differ');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');need(Buffer.from(text).equals(raw),'whole copy UTF8 differs');const data=JSON.parse(text);need(data.schema==='mutable-scalar-source-authoring-copies-20261104-v1'&&data.copies.length===3,'all complete source copies required');
  const copies=data.copies.map((row,at)=>{
   need(row.path===PATHS[at]&&row.originalPath===ORIGINALS[at]&&typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before&&hash(row.before)===row.beforeSha256&&hash(row.after)===row.afterSha256&&row.sequences.length===2&&row.sequences[0].phase==='language'&&row.sequences[1].phase==='repository','complete original/copy equation required');
   const current=custody.read(ROOT+row.originalPath);if(current!==row.before){const later=knownExactSourceSuccessor({path:row.originalPath,before:row.before});need(later?.currentIsTerminal===true&&later.after===current,'whole actual original epoch must join');}need(custody.read(ROOT+row.path)===row.after,'whole actual additive copy differs');
   let before=row.before;const stages=[];for(const sequence of row.sequences){const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'whole source copy occurrence differs')),after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before&&transportConcreteSyntaxMeta(history.beforeMeta).source===before&&transportConcreteSyntaxMeta(history.afterMeta).source===after,'complete copy CST/inverse differs');stages.push({phase:sequence.phase,before,after,history});before=after;}need(before===row.after,'complete copied result differs');return {...row,stages};
  });return {copies,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
