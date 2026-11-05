// Complete original/current preparer, history and case source controls. UNRUN.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/width-range-reader-adoption-20261104/controls.json.gz';
const SHA='33a5056d132820893535b6e1cce131cc0885c0f25292296ded58147be17c075c',hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw TypeError('Width range adoption controls: '+message);};
export function proposeWidthRangeAdoptionControlSources20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);need(hash(packed)===SHA,'fixed complete original control source archive differs');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');need(Buffer.from(text).equals(raw),'complete source UTF8 differs');const data=JSON.parse(text);need(data.schema==='width-range-adoption-controls-20261104-v1'&&data.rows.length===20&&new Set(data.rows.map(row=>row.path)).size===20,'all original control sources required');
  const files=data.rows.map(row=>{
   need(typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before&&hash(row.before)===row.beforeSha256&&hash(row.after)===row.afterSha256&&row.sequences.length===2&&row.sequences[0].phase==='language'&&row.sequences[1].phase==='repository','whole original/copy source equation required');
   let before=row.before;const stages=[];for(const sequence of row.sequences){const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original source control occurrence differs')),after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before&&transportConcreteSyntaxMeta(history.beforeMeta).source===before&&transportConcreteSyntaxMeta(history.afterMeta).source===after,'whole intermediate source/CST inverse differs');stages.push({phase:sequence.phase,before,after,history});before=after;}need(before===row.after,'whole final source control differs');return {...row,stages};
  });return {files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
