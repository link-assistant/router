// Finite complete source chronology DATA. Never a path/hash permission bypass.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {proposeProtectedSourceInstallationCopies} from './protected-source-installation-20261102-source.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-preparer-writers-20261102/';
const PATHS=Object.freeze(['tools/translation/prepare-native-substitution-copy.mjs','tools/translation/prepare-mixed-native-substitution-copy.mjs','scripts/sync-rust-assets.mjs']);
function originalProtectedInstallerStep(capture){
 const base='tools/translation/source-profiles/protected-source-installation-20261102/',inputs=[
  ['tools/translation/unit-runtime-materialization.mjs','unit-before.mjs.txt'],
  ['tools/translation/layout-ownership-bulk-20261101-successor.mjs','successor-before.mjs.txt'],
  ['tools/translation/prepare-native-substitution-copy.mjs','preparer-before.mjs.txt']].map(([path,name])=>({path,source:capture.capture(base+name).source}));
 need(inputs.every(row=>row.source!==null),'complete original protected-source producer inputs required');
 const original=proposeProtectedSourceInstallationCopies(inputs),row=original.rows[2],after=capture.capture(base+'preparer-after.mjs.txt').source;
 need(row.path===PATHS[0]&&row.after===after,'complete original protected-source preparer epoch differs');return row;
}
export function knownProtectedPreparerWriterSuccessor({root=ROOT,path,before}={}){
 if(!PATHS.includes(path))return null;const capture=createReconcileSourceCapture(root);let result,primary,failed=false;
 try{
  const name=path.replaceAll('/','__'),original=capture.capture(BASE+name+'.before.txt').source,after=capture.capture(BASE+name+'.after.txt').source,current=capture.capture(path).source;
  need(original!==null&&after!==null&&current===after,'complete fixed protected preparer current source differs');
  let predecessor=null;if(before!==original&&path===PATHS[0]){const old=originalProtectedInstallerStep(capture);if(before===old.before){need(old.after===original,'original preparer-after must precede its new protection successor');predecessor=old;}}
  if(before!==original&&!predecessor)result=null;else{
   const concrete=transportConcreteSyntaxSource(original,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===original,'whole original preparer CST differs');
   const run=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-all-original-native-source-checks-and-byte-writers',edits:[]}],repositoryRules:[{id:'router:attach-fixed-source-policy-to-actual-preparer-and-asset-sinks',edits:[{span:[0,original.length],expected:original,replacement:after}]}]});need(run.value.source===after,'complete fixed preparer policy source equation differs');
   const history=transportConcreteSourceEquations([{before:original,after,language:'JavaScript'}])[0];need(history.inverse===original&&transportConcreteSyntaxMeta(history.afterMeta).source===after,'complete preparer source inverse differs');
   const stages=transportConcreteSourceEquations([{before:original,after:original,language:'JavaScript'},{before:original,after,language:'JavaScript'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));
   const next={id:'protected-preparer-writers-20261102:'+name,path,before:original,language:original,after,current,currentAfter:current,inverse:original,history,stages,trace:run.trace,laterHistories:[],sourceAuthority:false,semanticAuthority:false};
   result=predecessor?{id:'protected-preparer-writers-20261102:original-protected-installer-epoch',path,before:predecessor.before,language:predecessor.before,after:original,current,currentAfter:current,inverse:predecessor.before,history:predecessor.history,stages:[{phase:'language',...transportConcreteSourceEquations([{before:predecessor.before,after:predecessor.before,language:'JavaScript'}])[0]},{phase:'repository',...predecessor.history}],trace:predecessor.ruleTrace,laterHistories:[next],sourceAuthority:false,semanticAuthority:false}:next;
   boundedReconcileWireBytes(result);
  }
 }catch(error){failed=true;primary=error;}try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;
}
