// Explicit actual-owner migration DATA. No automatic unqualified macro permit.
import {captureScopedOutputBindingProductionOwners} from './scoped-output-binding-20261101-production-sources.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {compileOutputLiteralProject} from './output-literal-core-20261101-project.mjs';
import {OUTPUT_LITERAL_FACADE_SOURCE,OUTPUT_LITERAL_LEAF_SOURCE,OUTPUT_LITERAL_ORIGINAL_FACADE_SOURCE} from './output-literal-core-20261101-source.mjs';
import {LITERAL_ARGUMENTS_LEAF_SOURCE} from './literal-arguments-core-20261101-source.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Actual output migration: '+message);};
export function proposeOutputLiteralProductionAdoption(value){
 accountData(value);const request=copyMetadata(value),original=captureScopedOutputBindingProductionOwners();if(!request||!Array.isArray(request.files))fail('complete actual original project request required');
 // The original reader retains the exact full lib/output/auth_remote/auth_import
 // owners. Do not detach read_code or invent a supported replacement owner.
 const owners=original.value.rows;for(const owner of owners){const row=request.files.filter(row=>row.path===owner.logicalPath);if(row.length!==1||row[0].source!==owner.before)fail('whole actual original owner missing or altered: '+owner.logicalPath);}
 const facade=request.files.filter(row=>row.path==='src/translation_core.rs');if(facade.length!==1||facade[0].source!==OUTPUT_LITERAL_ORIGINAL_FACADE_SOURCE)fail('whole actual original native facade required');
 const files=new Map(request.files.map(row=>[row.path,row.source]));if(files.size!==request.files.length)fail('unique complete original sources required');
 const path='src/auth_remote.rs',before=files.get(path),old='println!("Paste authorization code:");',replacement='crate::translation_core::output_literal_write(false, crate::translation_core::literal_arguments!("Paste authorization code:\\n"));';if(typeof before!=='string'||before.split(old).length!==2)fail('one exact original prompt occurrence required');
 return withCompleteSourceClosingFence(()=>{const result=createRulePipeline([
  {phase:'language',rules:[{id:'language:complete-original-actual-owners-and-explicit-qualified-migration-CST',apply:()=>{files.set(path,before.replace(old,replacement));files.set('src/translation_core.rs',OUTPUT_LITERAL_FACADE_SOURCE);files.set('src/translation_core/literal_arguments_core_20261101.rs',LITERAL_ARGUMENTS_LEAF_SOURCE);files.set('src/translation_core/output_literal_core_20261101.rs',OUTPUT_LITERAL_LEAF_SOURCE);const changes=[];for(const [file,after]of files){const prior=request.files.find(row=>row.path===file);changes.push({path:file,addition:!prior,...transportConcreteSourceEquations([{before:prior?.source??'',after,language:'Rust'}])[0]});}return changes;}}]},
  {phase:'repository',rules:[{id:'repository:attempt-the-whole-changed-owner-universe-with-original-refusals',apply:changes=>{const changedRequest={...request,files:[...files].map(([path,source])=>({path,source}))};let attempt;try{const checked=compileOutputLiteralProject(changedRequest);attempt={checked,qualifiedCaller:checked.meta.executable.filter(row=>row.name==='auth_remote.read_code'),refused:checked.meta.refused,unloweredItems:checked.meta.unloweredItems};}catch(error){attempt={refused:true,diagnostic:{name:error?.name??'Thrown',message:String(error?.message??error)}};}return {schema:'actual-owner-explicit-static-output-adoption-proposal-v1',originalOwners:owners,originalOwnerEquations:original.value.equations,changes,changedRequest,attempt,sourcePrioritizationOnly:true,originalMacroOwnerProved:false,originalBuiltinEquivalent:false,persistentNativeHostParity:false,productionCoverageQualified:false,remaining:['async read_code and spawn_blocking/BufRead/stdio','actual native launcher logging, redaction, file locks and rotation target adapter','original builtin/Arguments owner provenance','dynamic formatting and application migration qualification']};}}]},
 ]).run(null);accountData(result);return result;},[()=>{const fresh=captureScopedOutputBindingProductionOwners();for(let at=0;at<owners.length;at++)if(owners[at].before!==fresh.value.rows[at].before)fail('whole original production owner changed during proposal');}]);
}
