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
import {rustTokens} from './rust-structure.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {emitForwardLensRustString} from './js-to-rust/forward-string-lens-targets.mjs';
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

// Boolean keyword variations retain the exact token skeleton. Keep them out of
// migrated-output literal pairing: the new backend itself introduces false.
const booleanLiteral=token=>token.text==='true'||token.text==='false';
const editableLiteral=token=>token.type==='number'||token.type==='string'&&/^(?:"|r#{0,255}")/u.test(token.text);
function stringValue(source){const tokens=tokenizeRust(source),values=tokens.filter(row=>row.kind==='string');if(values.length!==1||values[0].start!==0||values[0].end!==source.length)fail('one actual complete Rust string literal required');return values[0].value;}

// Opt-in source migration for native literal edits. This is not authority for
// the old println owner; the full changed native program checks independently.
export function proposeLiteralEditedWholeOwners(value){
 accountData(value);const rows=copyMetadata(value);if(!Array.isArray(rows)||rows.length!==3)fail('three complete current application owners required');const equations=[],seen=new Set();
 for(const row of rows){
  const owner=DYNAMIC_OUTPUT_PRODUCTION_OWNERS.find(item=>item.path!=='src/lib.rs'&&row.path.endsWith('/'+item.path.slice(4)));if(!owner||seen.has(row.path)||typeof row.source!=='string')fail('actual distinct complete output owner paths required');seen.add(row.path);
  const baseline=rustTokens(owner.source),current=rustTokens(row.source);if(baseline.length>200000||current.length!==baseline.length)fail('literal-only current owner skeleton required');
  for(let at=0;at<baseline.length;at++){const before=baseline[at],after=current[at];if(before.type!==after.type||(!editableLiteral(before)||!editableLiteral(after))&&!(booleanLiteral(before)&&booleanLiteral(after))&&before.text!==after.text)fail('nonliteral current owner change requires a separate source adoption rule');}
  const edits=[];
  for(const change of changes.filter(item=>item.path===owner.path)){
   const start=owner.source.indexOf(change.before);if(start<0||owner.source.indexOf(change.before,start+1)!==-1)fail('one exact original output statement required');const stop=start+change.before.length,indices=baseline.map((token,index)=>token.start>=start&&token.end<=stop?index:-1).filter(index=>index>=0);if(!indices.length||baseline[indices[0]].start!==start||baseline[indices.at(-1)].end!==stop)fail('complete original output token interval required');
   const selected=indices.filter(index=>editableLiteral(baseline[index])),replacementTokens=rustTokens(change.after).filter(editableLiteral);if(selected.length!==replacementTokens.length)fail('complete original/adopted literal relation differs');const substitutions=[];
   for(let at=0;at<selected.length;at++){
    const original=baseline[selected[at]],actual=current[selected[at]],target=replacementTokens[at];if(original.type!==target.type)fail('actual source literal kinds differ');if(original.text===actual.text)continue;let replacement;
    if(original.text===target.text)replacement=actual.text;
    else if(original.type==='string'&&stringValue(target.text)===stringValue(original.text)+'\n')replacement=emitForwardLensRustString(stringValue(actual.text)+'\n');
    else fail('changed original literal has no complete adopted source equation');substitutions.push({start:target.start,end:target.end,replacement});
   }
   let replacement=change.after;for(const edit of substitutions.reverse())replacement=replacement.slice(0,edit.start)+edit.replacement+replacement.slice(edit.end);
   const span=[current[indices[0]].start,current[indices.at(-1)].end];edits.push({span,expected:row.source.slice(...span),replacement});
  }
  let after=row.source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
  if(owner.path==='src/accounts_cli.rs'){const name='__owned_json_output_header_probe_20261101';if(after.includes(name))fail('fresh whole-owner probe namespace required');after+='\n// Explicit owned output receiving probe; actual header owner retained.\npub fn '+name+'(){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}\\n",header()));}\n';}
  const history=transportConcreteSourceEquations([{before:row.source,after,language:'Rust'}])[0];if(history.inverse!==row.source)fail('complete current owner inverse differs');equations.push({path:row.path,before:row.source,after,history,literalOnlySourceVariation:true,originalMacroOwnerProved:false});
 }
 const result={schema:'literal-edited-whole-owner-output-source-proposal-v1',equations,sourceAuthority:false,semanticAuthority:false,originalBuiltinEquivalent:false,eagerFormattingMigration:true,productionCoverageQualified:false};accountData(result);return result;
}
