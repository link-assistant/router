// Complete opted-in project/projection/source cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {translateProjectOwnedDefinitions,translateProjectOwnedCoreReaderDefinitions} from '../project.mjs';
import {translateCrossModuleOwnedProjectionProject,translateCrossModuleOwnedCoreReaderProjectionProject} from '../cross-module-owned-projection-20261101.mjs';
import {captureCrossModuleOwnedProjectionProductionOwners} from '../cross-module-owned-projection-20261101-production-sources.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from '../primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {currentOriginalRustPaths} from './original-rust-census.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {verifyCrossModuleHelperTargets} from './cross-module-helper-bulk-20261101-fixture.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),hash=source=>createHash('sha256').update(source).digest('hex');
const dependencies={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const P='crate::translation_primitive_vectors_core::vec_u8_',V='::std::vec::Vec<::core::primitive::u8>',T='::core::primitive::u8';
const modes=[['owned',translateProjectOwnedDefinitions,translateCrossModuleOwnedProjectionProject],['core-reader',translateProjectOwnedCoreReaderDefinitions,translateCrossModuleOwnedCoreReaderProjectionProject]];
function options(input,readSource=path=>input[path]){return {entry:'src/lib.rs',paths:Object.keys(input),readSource,jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE};}
function files(){return {
 'src/lib.rs':'pub mod translation_core;pub mod translation_primitive_sequences_core;pub mod translation_primitive_vectors_core;pub mod helper;use crate::helper::seed as selected;\n'+
 'pub fn built(value:'+T+')->'+V+'{let mut values=selected(value);values='+P+'push(values,value);values}\n'+
 'pub fn counted(value:'+T+')->::core::primitive::u64{let values=helper::seed(value);helper::count(&values)}\n'+
 'pub fn literal()->crate::translation_core::Json{crate::translation_core::json!({"ok":true})}\n'+
 'pub fn construct(mode:&crate::translation_core::Str,enabled:bool)->crate::translation_core::Json{crate::translation_core::json!({"mode":mode,"enabled":enabled})}\n',
 'src/helper.rs':'pub fn seed(value:'+T+')->'+V+'{'+P+'push('+P+'new(),value)}pub fn count(input:&'+V+')->::core::primitive::u64{let checked='+P+'len(input);'+P+'len(input)}',
 'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,
 'src/translation_primitive_vectors_core.rs':readFileSync(repositorySourceURL('src/translation_primitive_vectors_core.rs',root),'utf8'),
 'src/translation_primitive_sequences_core.rs':readFileSync(repositorySourceURL('src/translation_primitive_sequences_core.rs',root),'utf8'),
};}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
for(const [name,plain,opted]of modes)test(name+' complete original API keeps opt-in receipts active through projection and preserves unsupported definitions',limits,async()=>{
 const input=files(),before=plain(options(input));for(const functionName of ['built','counted'])assert.equal(admitted(before,functionName),false);
 const result=opted(options(input));for(const functionName of ['built','counted']){assert.equal(admitted(result,functionName),true);assert.equal(result.ownedDefinitions.definitions.some(row=>row.name===functionName),false);assert.ok(result.ownedDefinitions.unsupported.some(row=>row.name===functionName));}
 assert.equal(result.meta.runtimeParity,false);const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 // The original core-reader constructor issuer receives its actual nativeChecked
 // program. The wrapper supplies no copied origin/token/metadata alternatives.
 const constructor=result.ownedDefinitions.definitions.find(row=>row.name==='construct');
 if(name==='core-reader'){assert.ok(constructor);assert.equal(constructor.targetFormat,'checked-normal-json-constructor-v1');assert.equal(constructor.semanticAuthority,false);assert.equal(constructor.newSourceRequiresIndependentReverseAdmission,true);}else assert.equal(constructor,undefined);
 const records=[];await verifyCrossModuleHelperTargets(result,api=>{assert.deepEqual(api.built(255n),[255n,255n]);assert.equal(api.counted(0n),1n);},{childTimeoutMs:20000,record:row=>records.push(row)});assert.ok(records.every(row=>row.version==='5.9.3'));
 const after=plain(options(input));for(const functionName of ['built','counted'])assert.equal(admitted(after,functionName),false);
});
test('original production owners stay whole including crate self-alias and exact async caller spelling',limits,()=>{
 const captured=captureCrossModuleOwnedProjectionProductionOwners();assert.equal(captured.value.rows.length,3);assert.equal(captured.value.productionPairAdmitted,false);
 for(const [index,row]of captured.value.rows.entries()){assert.equal(row.before,row.after);assert.equal(captured.value.equations[index].inverse,row.before);assert.equal(hash(row.before),row.sha256);}
 assert.ok(captured.value.rows.find(row=>row.logicalPath==='src/lib.rs').before.includes('extern crate self as link_assistant_router;'));
 const caller=captured.value.rows.find(row=>row.logicalPath==='src/auth_import.rs').before;
 assert.ok(caller.includes('async fn refuse_a_remote_import('));assert.ok(caller.includes('link_assistant_router::auth_remote::remote_import_refusal('));assert.ok(caller.includes('.join("\\n")'));
});
// One real production pair, two exact receiving modes. Original full crate graph
// and package inputs stay intact; no helper body is made into a standalone owner.
// Preserve the existing whole-original-project long case budget; never run while
// drafting. Exceptions and original unsupported/refused arrays are retained.
test('whole actual production crate attempt retains unproved namespace async and Vec projection prerequisites',{timeout:900000},t=>{
 const captured=captureCrossModuleOwnedProjectionProductionOwners(),paths=currentOriginalRustPaths(root),rows=new Map(captured.value.rows.map(row=>[row.logicalPath,row])),repositoryRoot=fileURLToPath(root);
 assert.ok(paths.includes('src/auth_remote.rs'));assert.ok(paths.includes('src/auth_import.rs'));
 for(const [name,,opted]of modes){
  const seen=new Set(),readSource=path=>{assert.ok(paths.includes(path));const actual=readFileSync(repositorySourceURL(path,root),'utf8');seen.add(path);if(rows.has(path))assert.equal(actual,rows.get(path).after);return actual;};
  const input={entry:'src/lib.rs',paths,readSource,jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE};
  let value,error,failed=false;try{value=opted(input);}catch(thrown){failed=true;error=thrown;}
  if(failed){assert.ok(String(error?.message??error).length);t.diagnostic(JSON.stringify({mode:name,status:'original-exception',reason:String(error?.message??error),entry:input.entry,sourceReads:seen.size,wholeOwnerFiles:captured.value.rows.map(row=>row.logicalPath)}));continue;}
  assert.equal(value.meta.entry,'src/lib.rs');assert.equal(value.meta.runtimeParity,false);
  for(const row of captured.value.rows){assert.ok(seen.has(row.logicalPath));const source=value.meta.sources.find(source=>source.source===row.logicalPath);assert.ok(source);assert.equal(source.sha256,row.sha256);}
  const helper='auth_remote.remote_import_refusal';assert.equal(value.ownedDefinitions.definitions.some(row=>row.name===helper),false);
  if(admitted(value,helper))assert.ok(value.ownedDefinitions.unsupported.some(row=>row.name===helper));
  assert.ok(value.ownedDefinitions.unsupported.length||value.meta.refused.length||value.meta.unloweredItems.length||value.meta.moduleDiagnostics.length);
  const evidence={mode:name,status:'original-partial-project',entry:input.entry,refused:value.meta.refused,unlowered:value.meta.unloweredItems,moduleDiagnostics:value.meta.moduleDiagnostics,unsupportedOwnedDefinitions:value.ownedDefinitions.unsupported,productionPairQualified:false,repositoryRoot};accountData(evidence);t.diagnostic(JSON.stringify(evidence));
 }
});

test('manifest and each complete original/physical owner refuse oversized files before source conversion',limits,t=>{
 const fixture=()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-owned-owner-input-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const profile='tools/translation/source-profiles/cross-module-owned-projection-20261101';cpSync(join(fileURLToPath(root),profile),join(directory,profile),{recursive:true});
  const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};
  write('rust/Cargo.toml',dependencies.manifest);
  const manifest=JSON.parse(readFileSync(join(directory,profile,'complete-original-owner-inputs.json'),'utf8'));
  for(const row of manifest.files)write(row.repositoryPath,readFileSync(join(directory,row.originalPath),'utf8'));
  return {directory,profile,manifest,write};
 };
 const manifest=fixture();manifest.write(manifest.profile+'/complete-original-owner-inputs.json',' '.repeat(65537));assert.throws(()=>captureCrossModuleOwnedProjectionProductionOwners({root:manifest.directory}),/byte bound/u);
 for(const field of ['originalPath','repositoryPath']){const api=fixture();api.write(api.manifest.files[1][field],' '.repeat(2097153));assert.throws(()=>captureCrossModuleOwnedProjectionProductionOwners({root:api.directory}),/byte bound/u);}
});
