// Complete actual CLI owners, explicit migration proposals and fresh refusals.
// No extracted function is substituted for its original owner/namespace.
import {copyMetadata} from './extensions/source-links.mjs';
import {DYNAMIC_OUTPUT_PRODUCTION_OWNERS,DYNAMIC_OUTPUT_ORIGINAL_FACADE_SOURCE,DYNAMIC_OUTPUT_FACADE_SOURCE,DYNAMIC_OUTPUT_LEAF_SOURCE} from './dynamic-primitive-output-20261101-source.mjs';
import {OUTPUT_LITERAL_LEAF_SOURCE} from './output-literal-core-20261101-source.mjs';
import {LITERAL_ARGUMENTS_LEAF_SOURCE} from './literal-arguments-core-20261101-source.mjs';
import {PERSISTENT_OUTPUT_LEAF_SOURCE} from './persistent-output-backend-20261101-source.mjs';
import {compileJsonScalarReadersProject} from './json-scalar-readers-20261101-project.mjs';
import {withJsonScalarReadersInstalledSources} from './json-scalar-readers-20261101-profile.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const changes=Object.freeze([
 {"path": "src/token_report.rs", "before": "println!(\n        \"{:<36}  {:<10}  {:<10}  {:<8}  {:<13}  {:<15}  {:<9}  {:<8}  {:<6}  label\",\n        HEADERS[0],\n        HEADERS[1],\n        HEADERS[2],\n        HEADERS[3],\n        HEADERS[4],\n        HEADERS[5],\n        HEADERS[6],\n        HEADERS[7],\n        HEADERS[8]\n    );", "after": "crate::translation_core::output_text_write(false, crate::translation_core::format!(\n        \"{:<36}  {:<10}  {:<10}  {:<8}  {:<13}  {:<15}  {:<9}  {:<8}  {:<6}  label\\n\",\n        HEADERS[0],\n        HEADERS[1],\n        HEADERS[2],\n        HEADERS[3],\n        HEADERS[4],\n        HEADERS[5],\n        HEADERS[6],\n        HEADERS[7],\n        HEADERS[8]\n    ));"},
 {path:'src/token_report.rs',before:'println!("{}", row(record));',after:'crate::translation_core::output_text_write(false, crate::translation_core::format!("{}\\n", row(record)));'},
 {path:'src/tokens_remote.rs',before:'println!("{token}");',after:'crate::translation_core::output_text_write(false, crate::translation_core::format!("{token}\\n"));'},
 {path:'src/accounts_cli.rs',before:'println!("server: {} ({})", server.base_url, server.source);',after:'crate::translation_core::output_text_write(false, crate::translation_core::format!("server: {} ({})\\n", server.base_url, server.source));'},
]);
const fail=message=>{throw new TypeError('Actual dynamic output adoption: '+message);};
export function prepareJsonScalarReadersProductionAdoption(value){
 accountData(value);const input=copyMetadata(value);if(!input||!Array.isArray(input.files))fail('complete actual owner request required');return withJsonScalarReadersInstalledSources(()=>{
  const files=new Map(input.files.map(row=>[row.path,row.source]));if(files.size!==input.files.length)fail('unique complete owner source paths required');for(const owner of DYNAMIC_OUTPUT_PRODUCTION_OWNERS)if(files.get(owner.path)!==owner.source)fail('complete original native owner missing/altered: '+owner.path);if(files.get('src/translation_core.rs')!==DYNAMIC_OUTPUT_ORIGINAL_FACADE_SOURCE)fail('exact complete physical original core facade required');
  const pipeline=createRulePipeline([{phase:'language',rules:[{id:'language:complete-actual-CLI-owners-and-explicit-eager-Text-adoption-CST',apply:()=>{
   for(const edit of changes){const before=files.get(edit.path);if(before.split(edit.before).length!==2)fail('one exact actual original output statement required: '+edit.path);files.set(edit.path,before.replace(edit.before,edit.after));}files.set('src/translation_core.rs',DYNAMIC_OUTPUT_FACADE_SOURCE);for(const [path,source]of [['src/translation_core/dynamic_primitive_output_20261101.rs',DYNAMIC_OUTPUT_LEAF_SOURCE],['src/translation_core/literal_arguments_core_20261101.rs',LITERAL_ARGUMENTS_LEAF_SOURCE],['src/translation_core/output_literal_core_20261101.rs',OUTPUT_LITERAL_LEAF_SOURCE],['src/translation_core/persistent_output_backend_20261101.rs',PERSISTENT_OUTPUT_LEAF_SOURCE]])files.set(path,source);
   return [...files].map(([path,after])=>{const before=input.files.find(row=>row.path===path)?.source??'',history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];if(history.inverse!==before)fail('whole original owner inverse changed');return {path,before,after,addition:!input.files.some(row=>row.path===path),history};});
  }}]},{phase:'repository',rules:[{id:'repository:independent-whole-owner-attempt-and-all-original-residuals',apply:equations=>{
   const changedRequest={...input,files:[...files].map(([path,source])=>({path,source}))},attempt={status:'not-attempted',reason:'separate fresh whole-project operation required'};return {schema:'actual-CLI-owned-eager-output-adoption-v1',originalOwners:DYNAMIC_OUTPUT_PRODUCTION_OWNERS,equations,changedRequest,attempt,eagerFormattingMigration:true,originalBuiltinEquivalent:false,stdArgumentsAbi:false,standardStringDropRequired:true,wholeOriginalOwnersPreserved:true,entireCargoUniverseSupplied:false,productionCoverageQualified:false,runtimeExecuted:false,remaining:['whole lib module/dependency namespace and bounded full original corpus ingress','actual static-array/Option/JSON-field/owned-helper producers and their complete private source closures; control/multi-output support alone is not admission','genuine source-owned primitive formatter operands beyond direct borrowed/copy expressions','general async/custom Display/trait/output migration equivalence','persistent global tracing, full URL/IDNA/env/platform/provider conformance']};
  }}]}]).run(null);accountData(pipeline);return pipeline;
 });
}

// Preparation and execution are independent COMPLETE operations. A source-input
// error unwinds the actual compiler's original closing/failure frame before
// its refusal is reported as DATA; any enclosing caller frame stays poisoned.
export function proposeJsonScalarReadersProductionAdoption(value){
 const prepared=prepareJsonScalarReadersProductionAdoption(value);let attempt;try{const checked=compileJsonScalarReadersProject(prepared.value.changedRequest);attempt={checked,refused:checked.meta.refused,unloweredItems:checked.meta.unloweredItems};}catch(error){attempt={refused:true,diagnostic:{name:error?.name??'Thrown',message:String(error?.message??error)}};}const result={...prepared,value:{...prepared.value,attempt}};accountData(result);return result;
}

// Original opaque corpus lane: mutate only complete CURRENT application owners.
// Its qualified core library is already installed by the parent source recipe.
export function proposeJsonScalarReadersWholeOwners(rows){
 accountData(rows);if(!Array.isArray(rows)||rows.length!==3)fail('three whole actual application owners required');const equations=[];for(const row of rows){const owner=DYNAMIC_OUTPUT_PRODUCTION_OWNERS.find(owner=>owner.path!=='src/lib.rs'&&row.path.endsWith('/'+owner.path.slice(4)));if(!owner||row.source!==owner.source)fail('exact complete actual application owner required');let after=row.source;for(const edit of changes.filter(edit=>edit.path===owner.path)){if(after.split(edit.before).length!==2)fail('one exact whole-owner original output statement required');after=after.replace(edit.before,edit.after);}if(owner.path==='src/accounts_cli.rs'){const name='__owned_json_output_header_probe_20261101';if(after.includes(name))fail('fresh whole-owner probe namespace required');after+='\n// Explicit owned output receiving probe; actual header owner retained.\npub fn '+name+'(){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}\\n",header()));}\n';}const history=transportConcreteSourceEquations([{before:row.source,after,language:'Rust'}])[0];if(history.inverse!==row.source)fail('complete original owner inverse changed');equations.push({path:row.path,before:row.source,after,history});}if(new Set(equations.map(row=>row.path)).size!==3)fail('unique complete owner census required');const result={schema:'actual-whole-owner-Json-output-source-proposal-v1',equations,sourceAuthority:false,semanticAuthority:false,originalBuiltinEquivalent:false,eagerFormattingMigration:true,productionCoverageQualified:false};accountData(result);return result;
}
