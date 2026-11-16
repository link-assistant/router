// Source substitution DATA. No native standard-library or executable authority.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,boundedReconcileWireBytes,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BASE='tools/translation/source-profiles/borrowed-standard-map-application-20261103/';
const FILES=[['rust/src/openai.rs','openai'],['rust/src/lib.rs','lib']];
const original=`pub(crate) fn query_stream_requested(query: &BTreeMap<String, String>) -> bool {
    query
        .get("stream")
        .is_some_and(|value| matches!(value.as_str(), "true" | "1"))
}`;
const selected=`pub(crate) fn query_stream_requested(query: &BTreeMap<String, String>) -> bool {
    crate::borrowed_standard_map_20261102::borrowed_text_map_matches_literals(
        query,
        "stream",
        &["true", "1"],
    )
}`;
const registration='\npub mod borrowed_standard_map_20261102;\n\n#[cfg(test)]\nmod borrowed_standard_map_application_20261103_tests;\n';
function sourceEquation(path,before,after){
 const language=path==='rust/src/openai.rs'?[countedLiteralSubstitutionRule('language:borrowed-map-literal-predicate-selection',original,selected,1,'complete original stream predicate required')]:[];
 const repository=path==='rust/src/lib.rs'?[countedLiteralSubstitutionRule('repository:register-borrowed-standard-map-core',before,before+registration,1,'complete original crate root required')]:[];
 const pipeline=createRulePipeline([{phase:'language',rules:language},{phase:'repository',rules:repository}]),result=pipeline.run(before);
 need(result.value===after,'complete borrowed-map application source equation differs');
 const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];
 need(history.inverse===before,'complete borrowed-map application CST inverse differs');
 return {path,before,after,inverse:before,history,trace:result.trace};
}
/** Fixed full-source inputs are proposals, never an admission shortcut. */
export function proposeBorrowedStandardMapApplication(input,{root=ROOT}={}){
 account(input);input=copyMetadata(input);const capture=createReconcileSourceCapture(root);let result,failed=false,primary;
 try{
  need(Array.isArray(input)&&input.length===FILES.length,'both complete original application inputs required');
  const files=FILES.map(([path,name],at)=>{
   const before=capture.capture(BASE+name+'.before.txt').source,after=capture.capture(BASE+name+'.after.txt').source;
   need(input[at]?.path===path&&input[at]?.source===before,'exact original application path/source required');
   need(capture.capture(path).source===after,'actual adopted native application source differs');
   return sourceEquation(path,before,after);
  });
  result={schema:'borrowed-standard-map-application-source-20261103-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeStandardBindingQualified:false,applicationTranslationQualified:false,verification:'UNRUN'};
  boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return result;
}
