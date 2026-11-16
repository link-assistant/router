// Exact fixed source successor DATA; no private compiler verdict is reused.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createReconcileSourceCapture,requireReconcile as need,boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PATH='tools/translation/unit-runtime-materialization.mjs',BASE='tools/translation/source-profiles/protected-source-errors-20261102/';
export function knownProtectedSourceErrorSuccessor({root=ROOT,path,before}={}){
 if(path!==PATH)return null;const capture=createReconcileSourceCapture(root);let answer,primary,failed=false;
 try{const original=capture.capture(BASE+'unit-before.mjs.txt').source,current=capture.capture(PATH).source,source=capture.capture(BASE+'unit-equation.json').source;need(original!==null&&current!==null&&source!==null,'complete protected-source error successor required');
  if(before!==original)answer=null;else{const recipe=JSON.parse(source);need(recipe.schema==='router-protected-source-errors-equation-v1'&&createHash('sha256').update(original).digest('hex')===recipe.beforeSha256,'fixed complete source-error predecessor required');
   const declarations=recipe.sequences.map(sequence=>({phase:sequence.phase,rules:sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete source-error substitution differs'))})),language=createRulePipeline([declarations[0],{phase:'repository',rules:[]}]).run(original).value,run=createRulePipeline(declarations).run(original);need(run.value===current,'actual complete source-error successor differs');
   const history=transportConcreteSourceEquations([{before:original,after:current,language:'JavaScript'}])[0],stages=transportConcreteSourceEquations([{before:original,after:language,language:'JavaScript'},{before:language,after:current,language:'JavaScript'}]).map((row,index)=>({...row,phase:index?'repository':'language'}));need(history.inverse===original,'complete source-error inverse differs');
   answer={id:'protected-source-errors-known-successor-20261102',path,before:original,after:current,current,currentAfter:current,language,history,stages,inverse:original,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false};boundedReconcileWireBytes(answer);
  }
 }catch(error){failed=true;primary=error;}try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return answer;
}
