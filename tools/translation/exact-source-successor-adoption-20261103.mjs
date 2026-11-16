// Complete actual producer/consumer source successors DATA; no installation.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-successor-adoption-20261103/';
const ROWS=[['adapter','tools/translation/prepare-private-parser-data-current-sources.mjs'],['consumer','tools/translation/private-parser-data-current-sources.mjs'],['history','tools/translation/protected-private-cli-lineage-20261103-history.mjs'],['engine','tools/translation/exact-source-successors-20261103.mjs'],['cases','tools/translation/test/exact-source-successors-20261103.test.mjs']];
export function proposeExactSourceSuccessorAdoption(input,{root=ROOT}={}){
 account(input);input=copyMetadata(input);need(Array.isArray(input)&&input.length===ROWS.length,'all five complete actual adoption sources required');
 const capture=createReconcileSourceCapture(root);
 return withCompleteSourceClosingFence(()=>{
  const files=ROWS.map(([name,path],at)=>{
   const before=capture.capture(BASE+name+'.before.txt').source,after=capture.capture(BASE+name+'.after.txt').source;
   need(input[at]?.path===path&&input[at]?.source===before,'exact complete actual source/path required');
   const applied=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules:[countedLiteralSubstitutionRule('repository:actual-exact-source-adoption-'+name,before,after,1,'whole actual predecessor differs')]}]).run(before);
   need(applied.value===after,'whole actual adoption source differs');const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before,'whole actual adoption inverse differs');
   return {path,before,after,inverse:before,history,trace:applied.trace};
  });return {files,sourceInstalled:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[capture.close]);
}
