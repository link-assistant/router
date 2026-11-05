// Whole-source proposal only. The full profile must independently bind it.
import {CREDENTIAL_TOKEN_SCANNER_SOURCES as source} from './persistent-credential-token-scan-20261101-sources.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
export function proposeCredentialTokenScannerSource(){
 const run=createRulePipeline([{phase:'language',rules:[{id:'language:complete-original-credential-scanner-cst-and-inverse',apply:()=>{
  const history=transportConcreteSourceEquations([{before:source.before,after:source.after,language:source.language}])[0];
  if(history.inverse!==source.before||transportConcreteSyntaxMeta(history.beforeMeta).source!==source.before||transportConcreteSyntaxMeta(history.afterMeta).source!==source.after)throw new TypeError('Complete credential scanner source/CST inverse differs');
  return history;
 }}]},{phase:'repository',rules:[{id:'router:qualified-persistent-text-import-and-exact-35-predecessor',apply:history=>({schema:source.schema,predecessorCommit:source.predecessorCommit,files:[{path:source.path,language:source.language,before:source.before,after:source.after,inverse:source.before,history}],sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,originalNativeAlgorithmChanged:false,measuredPerformanceQualified:false})}]}]).run(null);
 const result={...run.value,ruleTrace:run.trace};accountData(result);return result;
}
