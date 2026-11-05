// Fixed complete producer import continuations. DATA only, no native permission.
// The caller owns capture/closing; no source or verdict survives this invocation.
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture} from './paired-sync-reconcile-20261101-support.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PACKET='tools/translation/source-profiles/physical-language-output-adoption-20261104/equations.json';
const SHA='52f7de0dbf0f366a795fa98f5e07b315c473012d825e1ac16d951994866f1f02';
const PATHS=['scripts/regenerate-js-first.mjs','tools/translation/js-to-rust/native-typescript.mjs','tools/translation/protected-flat-writer-20261102-history.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw TypeError('Physical producer source continuation: '+message);};
function readRows(capture){
 need(typeof capture==='function','original source capture required');
 const raw=capture(PACKET).source;
 need(typeof raw==='string'&&Buffer.byteLength(raw)<=1048576&&hash(raw)===SHA,'fixed complete source packet differs');
 const data=JSON.parse(raw);
 need(data.schema==='physical-language-producer-source-adoption-20261104-v1'&&data.sourceAuthority===false&&data.semanticAuthority===false&&Array.isArray(data.rows)&&data.rows.length===3,'complete producer/history cohort required');
 for(const [index,row]of data.rows.entries())need(row.path===PATHS[index]&&typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before&&hash(row.before)===row.beforeSha256&&hash(row.after)===row.afterSha256&&Array.isArray(row.sequences)&&row.sequences.length===2&&row.sequences[0].phase==='language'&&row.sequences[1].phase==='repository','complete ordered source equation required');
 return data.rows;
}
function equation(row){
 let source=row.before;const stages=[];
 for(const sequence of row.sequences){
  need(Array.isArray(sequence.rows)&&sequence.rows.length<=8,'bounded original substitutions required');
  const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete producer import occurrence differs'));
  const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(source).value;
  const history=transportConcreteSourceEquations([{before:source,after,language:'JavaScript'}])[0];
  need(history.inverse===source&&transportConcreteSyntaxMeta(history.beforeMeta).source===source&&transportConcreteSyntaxMeta(history.afterMeta).source===after,'whole intermediate source/CST inverse differs');
  stages.push({...history,phase:sequence.phase});source=after;
 }
 need(source===row.after,'complete final producer source differs');
 const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];
 return {id:'physical-language-output-layout-20261104',path:row.path,before:row.before,after:row.after,inverse:row.before,language:stages[0].after,stages,equation:history,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
}
export function capturePhysicalLanguageProducerSourceSuccessor20261104(capture,path,before){
 // Preserve the original helper's null domain for every unrelated coordinate.
 if(!PATHS.slice(0,2).includes(path))return null;
 need(typeof before==='string','complete original producer source required');
 const rows=readRows(capture),row=rows.find(item=>item.path===path);
 need(row.before===before,'original producer afterimage must join exactly');
 const control=rows[2];need(capture(control.path).source===control.after,'actual source-history dispatch differs');
 const result=equation(row);need(capture(path).source===result.after,'actual producer is not its complete source successor');
 return result;
}
export function proposePhysicalLanguageProducerSourceAdoption20261104({root=ROOT}={}){
 const captured=createReconcileSourceCapture(root);
 return withCompleteSourceClosingFence(()=>{
  const rows=readRows(captured.capture).map(row=>{const result=equation(row);need(captured.capture(row.path).source===result.after,'actual adopted producer/history source differs');return result;});
  return {rows,sourceInstalled:true,sourceAuthority:false,semanticAuthority:false,installationAuthority:false,verification:'UNRUN'};
 },[captured.close]);
}
