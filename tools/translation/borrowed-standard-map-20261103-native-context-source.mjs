import {knownOriginalSelfCrateAliasSuccessor} from './original-self-crate-alias-20261103-history.mjs';
// A complete source-copy equation; no source spelling grants semantic authority.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/borrowed-standard-map-native-20261103/';
export function proposeBorrowedStandardMapNativeContext({root=ROOT}={}){
 const capture=createReconcileSourceCapture(root);let result,failed=false,primary;
 try{
  const before=capture.capture(BASE+'original-context.before.txt').source,after=capture.capture(BASE+'borrowed-context.after.txt').source;
  const inputPath='tools/translation/ordered-text-map-callers-20261102-native-context.mjs',outputPath='tools/translation/borrowed-standard-map-20261103-native-context.mjs',beforeCurrent=capture.capture(inputPath).source,currentAfter=capture.capture(outputPath).source,inputLater=beforeCurrent===before?null:knownOriginalSelfCrateAliasSuccessor({root,path:inputPath,before}),later=currentAfter===after?null:knownOriginalSelfCrateAliasSuccessor({root,path:outputPath,before:after});
  need(beforeCurrent===before||inputLater&&inputLater.currentAfter===beforeCurrent,'original complete source context/history differs');
  need(currentAfter===after||later&&later.currentAfter===currentAfter,'actual copied source context/history differs');
  const rules=JSON.parse(capture.capture(BASE+'context-substitutions.json').source);
  need(rules.schema==='borrowed-standard-map-context-substitutions-20261103-v1'&&rules.language.length===5&&rules.repository.length===0,'complete source-copy stages required');
  const pipeline=createRulePipeline(['language','repository'].map(phase=>({phase,rules:rules[phase].map(row=>countedLiteralSubstitutionRule(row.id,row.before,row.after,row.count,'original source-context occurrence differs'))}))),applied=pipeline.run(before);
  need(applied.value===after,'complete copied source context differs');const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before,'complete native context inverse differs');
  result={path:'tools/translation/borrowed-standard-map-20261103-native-context.mjs',before,after,beforeCurrent,currentAfter,laterHistories:later?[later]:[],inputLaterHistories:inputLater?[inputLater]:[],inverse:before,history,trace:applied.trace,sourceInstalled:false,semanticAuthority:false,verification:'UNRUN'};
 }catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return result;
}
