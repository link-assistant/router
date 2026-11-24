// Complete actual CLI owners, explicit migration proposals and fresh refusals.
// No extracted function is substituted for its original owner/namespace.
import {copyMetadata} from './extensions/source-links.mjs';
import {DYNAMIC_OUTPUT_PRODUCTION_OWNERS,DYNAMIC_OUTPUT_ORIGINAL_FACADE_SOURCE,DYNAMIC_OUTPUT_FACADE_SOURCE,DYNAMIC_OUTPUT_LEAF_SOURCE} from './dynamic-primitive-output-20261101-source.mjs';
import {OUTPUT_LITERAL_LEAF_SOURCE} from './output-literal-core-20261101-source.mjs';
import {LITERAL_ARGUMENTS_LEAF_SOURCE} from './literal-arguments-core-20261101-source.mjs';
import {PERSISTENT_OUTPUT_LEAF_SOURCE} from './persistent-output-backend-20261101-source.mjs';
import {compileDynamicPrimitiveOutputProject} from './dynamic-primitive-output-20261101-project.mjs';
import {withDynamicOutputInstalledSources} from './dynamic-primitive-output-20261101-profile.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const changes=Object.freeze([
 {path:'src/token_report.rs',before:'println!("{}", row(record));',after:'crate::translation_core::output_text_write(false, crate::translation_core::format!("{}\\n", row(record)));'},
 {path:'src/tokens_remote.rs',before:'println!("{token}");',after:'crate::translation_core::output_text_write(false, crate::translation_core::format!("{token}\\n"));'},
 {path:'src/accounts_cli.rs',before:'println!("server: {} ({})", server.base_url, server.source);',after:'crate::translation_core::output_text_write(false, crate::translation_core::format!("server: {} ({})\\n", server.base_url, server.source));'},
]);
const fail=message=>{throw new TypeError('Actual dynamic output adoption: '+message);};
export function prepareDynamicPrimitiveOutputProductionAdoption(value){
 accountData(value);const input=copyMetadata(value);if(!input||!Array.isArray(input.files))fail('complete actual owner request required');return withDynamicOutputInstalledSources(()=>{
  const files=new Map(input.files.map(row=>[row.path,row.source]));if(files.size!==input.files.length)fail('unique complete owner source paths required');for(const owner of DYNAMIC_OUTPUT_PRODUCTION_OWNERS)if(files.get(owner.path)!==owner.source)fail('complete original native owner missing/altered: '+owner.path);if(files.get('src/translation_core.rs')!==DYNAMIC_OUTPUT_ORIGINAL_FACADE_SOURCE)fail('exact complete physical original core facade required');
  const pipeline=createRulePipeline([{phase:'language',rules:[{id:'language:complete-actual-CLI-owners-and-explicit-eager-Text-adoption-CST',apply:()=>{
   for(const edit of changes){const before=files.get(edit.path);if(before.split(edit.before).length!==2)fail('one exact actual original output statement required: '+edit.path);files.set(edit.path,before.replace(edit.before,edit.after));}files.set('src/translation_core.rs',DYNAMIC_OUTPUT_FACADE_SOURCE);for(const [path,source]of [['src/translation_core/dynamic_primitive_output_20261101.rs',DYNAMIC_OUTPUT_LEAF_SOURCE],['src/translation_core/literal_arguments_core_20261101.rs',LITERAL_ARGUMENTS_LEAF_SOURCE],['src/translation_core/output_literal_core_20261101.rs',OUTPUT_LITERAL_LEAF_SOURCE],['src/translation_core/persistent_output_backend_20261101.rs',PERSISTENT_OUTPUT_LEAF_SOURCE]])files.set(path,source);
   return [...files].map(([path,after])=>{const before=input.files.find(row=>row.path===path)?.source??'',history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];if(history.inverse!==before)fail('whole original owner inverse changed');return {path,before,after,addition:!input.files.some(row=>row.path===path),history};});
  }}]},{phase:'repository',rules:[{id:'repository:independent-whole-owner-attempt-and-all-original-residuals',apply:equations=>{
   const changedRequest={...input,files:[...files].map(([path,source])=>({path,source}))},attempt={status:'not-attempted',reason:'separate fresh whole-project operation required'};return {schema:'actual-CLI-owned-eager-output-adoption-v1',originalOwners:DYNAMIC_OUTPUT_PRODUCTION_OWNERS,equations,changedRequest,attempt,eagerFormattingMigration:true,originalBuiltinEquivalent:false,stdArgumentsAbi:false,standardStringDropRequired:true,wholeOriginalOwnersPreserved:true,entireCargoUniverseSupplied:false,productionCoverageQualified:false,runtimeExecuted:false,remaining:['whole lib module/dependency namespace and bounded full original corpus ingress','multi-output/loop/Option/JSON-field/owned-helper producers in these actual owners','genuine source-owned primitive formatter operands beyond direct borrowed/copy expressions','general async/custom Display/trait/output migration equivalence','persistent global tracing, full URL/IDNA/env/platform/provider conformance']};
  }}]}]).run(null);accountData(pipeline);return pipeline;
 });
}

// Preparation and execution are independent COMPLETE operations. A source-input
// error unwinds the actual compiler's original closing/failure frame before
// its refusal is reported as DATA; any enclosing caller frame stays poisoned.
export function proposeDynamicPrimitiveOutputProductionAdoption(value){
 const prepared=prepareDynamicPrimitiveOutputProductionAdoption(value);let attempt;try{const checked=compileDynamicPrimitiveOutputProject(prepared.value.changedRequest);attempt={checked,refused:checked.meta.refused,unloweredItems:checked.meta.unloweredItems};}catch(error){attempt={refused:true,diagnostic:{name:error?.name??'Thrown',message:String(error?.message??error)}};}const result={...prepared,value:{...prepared.value,attempt}};accountData(result);return result;
}
