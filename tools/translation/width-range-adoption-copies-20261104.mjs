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
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/width-range-reader-adoption-20261104/authoring-copies.json.gz';
const SHA='48717d9c313eb5d2c19e59e63c76c21e4f5b7275006445eb2b07ec4bb290be72',hash=value=>createHash('sha256').update(value).digest('hex');
const PATHS=["tools/translation/width-range-adoption-source-history-20261104.mjs", "tools/translation/width-range-adoption-controls-20261104.mjs", "tools/translation/width-range-adoption-segment-index-20261104.mjs"];
const ORIGINALS=["tools/translation/width-counted-range-source-history-20261104.mjs", "tools/translation/exact-source-mutable-scalar-controls-20261104.mjs", "tools/translation/width-counted-range-segment-index-20261104.mjs"];
const need=(value,message)=>{if(!value)throw TypeError('Width range adoption authoring copies: '+message);};
export function proposeWidthRangeAdoptionAuthoringCopies20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);need(hash(packed)===SHA,'fixed complete source copies differ');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');need(Buffer.from(text).equals(raw),'whole copy UTF8 differs');const data=JSON.parse(text);need(data.schema==='width-range-adoption-authoring-copies-20261104-v1'&&data.copies.length===3,'all complete source copies required');
  const copies=data.copies.map((row,at)=>{
   need(row.path===PATHS[at]&&row.originalPath===ORIGINALS[at]&&typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before&&hash(row.before)===row.beforeSha256&&hash(row.after)===row.afterSha256&&row.sequences.length===2&&row.sequences[0].phase==='language'&&row.sequences[1].phase==='repository','complete original/copy equation required');
   const current=custody.read(ROOT+row.originalPath);if(current!==row.before){const later=knownExactSourceSuccessor({path:row.originalPath,before:row.before});need(later?.currentIsTerminal===true&&later.after===current,'whole actual original epoch must join');}need(custody.read(ROOT+row.path)===row.after,'whole actual additive copy differs');
   let before=row.before;const stages=[];for(const sequence of row.sequences){const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'whole source copy occurrence differs')),after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before&&transportConcreteSyntaxMeta(history.beforeMeta).source===before&&transportConcreteSyntaxMeta(history.afterMeta).source===after,'complete copy CST/inverse differs');stages.push({phase:sequence.phase,before,after,history});before=after;}need(before===row.after,'complete copied result differs');return {...row,stages};
  });return {copies,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
