// Complete fixed source-frame successors DATA; no installation or compiler permit.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/complete-typescript-receiving-frame-20261103/';
const ROWS=[['sdk','tools/translation/complete-typescript-receiving-20261103.mjs','JavaScript'],['cases','tools/translation/test/complete-typescript-receiving-20261103.test.mjs','JavaScript']];
export function proposeCompleteTypeScriptReceivingSourceFrames({root=ROOT}={}){
 const capture=createReconcileSourceCapture(root);
 return withCompleteSourceClosingFence(()=>{
  const files=ROWS.map(([name,path,language])=>{
   const before=capture.capture(BASE+name+'.before.txt').source,after=capture.capture(BASE+name+'.after.txt').source;
   need(typeof before==='string'&&typeof after==='string'&&capture.capture(path).source===after,'complete actual SDK source-frame successor differs');
   const result=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules:[countedLiteralSubstitutionRule('repository:SDK-source-frame-'+name,before,after,1,'complete preceding SDK source epoch required')]}]).run(before);
   need(result.value===after,'complete SDK source-frame equation differs');const history=transportConcreteSourceEquations([{before,after,language}])[0];need(history.inverse===before,'complete SDK source-frame inverse differs');
   return {path,before,after,inverse:before,history,trace:result.trace};
  });return {files,sourceInstalled:false,semanticAuthority:false,verification:'UNRUN'};
 },[capture.close]);
}
