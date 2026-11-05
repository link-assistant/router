// Fixed complete source ancestry DATA; no native or source authority is issued.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createReconcileSourceCapture,requireReconcile as need,boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PATH='tools/translation/unit-runtime-materialization.mjs',BASE='tools/translation/source-profiles/protected-source-installation-20261102/';
export function knownProtectedSourceInstallationSuccessor({root=ROOT,path,before}={}){
 if(path!==PATH)return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{
  const packetSource=capture.capture(BASE+'unit-equation.json').source;need(packetSource!==null,'complete protected-source equation required');const recipe=JSON.parse(packetSource),original=capture.capture(BASE+'unit-before.mjs.txt').source,current=capture.capture(PATH).source;
  need(recipe.schema==='router-protected-source-installation-equation-v1'&&original!==null&&current!==null&&createHash('sha256').update(original).digest('hex')===recipe.beforeSha256,'exact original protected-source installer required');
  if(before===original){const declarations=recipe.sequences.map(sequence=>({phase:sequence.phase,rules:sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original protected installer substitution differs'))})),language=createRulePipeline([declarations[0],{phase:'repository',rules:[]}]).run(original).value,run=createRulePipeline(declarations).run(original);
   need(run.value===current,'complete current protected-source installer differs');const history=transportConcreteSourceEquations([{before:original,after:current,language:'JavaScript'}])[0];need(history.inverse===original&&transportConcreteSyntaxMeta(history.beforeMeta).source===original&&transportConcreteSyntaxMeta(history.afterMeta).source===current,'complete protected-source CST inverse differs');
   const stages=transportConcreteSourceEquations([{before:original,after:language,language:'JavaScript'},{before:language,after:current,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));
   result={id:'router-protected-source-installation-known-successor-20261102',path:PATH,before:original,language,after:current,current,currentAfter:current,inverse:original,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false};boundedReconcileWireBytes(result);
  }else result=null;
 }catch(error){failed=true;primary=error;}try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
