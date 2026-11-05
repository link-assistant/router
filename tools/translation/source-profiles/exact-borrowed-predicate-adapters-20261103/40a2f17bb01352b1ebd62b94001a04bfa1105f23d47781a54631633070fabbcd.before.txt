// Complete later SOURCE equation, never a native/caller proof.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PATH='tools/translation/borrowed-standard-map-20261103-native-abi.mjs';
const HISTORY='tools/translation/source-profiles/borrowed-standard-map-native-20261103/fixed-native-abi-source-history.json';
export function proposeFixedBorrowedStandardMapNativeAbi({root=ROOT}={}){
 const capture=createReconcileSourceCapture(root);let result,failed=false,primary;
 try{
  const source=capture.capture(HISTORY).source,row=JSON.parse(source);
  need(row.schema==='borrowed-map-fixed-native-abi-identity-source-history-20261103-v1'&&row.path===PATH&&typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before,'complete fixed native ABI source history required');
  need(capture.capture(PATH).source===row.after,'complete actual fixed native ABI differs');
  const applied=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules:[countedLiteralSubstitutionRule('repository:fixed-full-native-compatibility-source-identities',row.before,row.after,1,'whole preceding native ABI source differs')]}]).run(row.before);
  need(applied.value===row.after,'complete fixed native ABI equation differs');const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];need(history.inverse===row.before,'complete fixed ABI source inverse differs');
  result={path:PATH,before:row.before,after:row.after,inverse:row.before,history,trace:applied.trace,semanticAuthority:false,verification:'UNRUN'};
 }catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return result;
}
