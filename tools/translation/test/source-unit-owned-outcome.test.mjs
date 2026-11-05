// Full source-unit receiving SOURCE; no execution during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
import {planUnitRuntimeMaterialization,applyUnitRuntimeMaterialization} from '../unit-runtime-materialization.mjs';
import {OWNED_OUTCOME_NATIVE_INPUTS,ownedOutcomeUnitRuntimeSources} from '../owned-outcome-unit.mjs';
import {ownedStateReceivingData} from '../js-to-rust/test/owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../owned-outcome-native-source.mjs';
import {prepareOwnedOutcomeUnitSources} from '../prepare-owned-outcome-unit-sources.mjs';
import {prepareOwnedOutcome} from '../prepare-owned-outcome.mjs';
import {prepareOwnedStateUnitSources} from '../prepare-owned-state-unit-sources.mjs';
import {prepareOwnedStateFlow} from '../prepare-owned-state-flow.mjs';
import {prepareOwnedNumericAbi} from '../prepare-owned-numeric-abi.mjs';
import {prepareUnitRuntimeMaterialization} from '../prepare-unit-runtime-materialization.mjs';
import {json_macro_null as nil} from '../json-macro-runtime.mjs';
const limits={timeout:60_000};
function fixture(t,{runtimes=true}={}){
 const root=mkdtempSync(join(tmpdir(),'router-owned-outcome-unit-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);},read=path=>readFileSync(join(root,path),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Source unit baseline']);};git(['init','--quiet']);write('seed.txt','source baseline\n');commit();
 const unit={id:'carrier',profile:'owned-outcome',authority:'auto',paths:{Rust:'rust/src/caller.rs',JavaScript:'js/src/caller.mjs',TypeScript:'ts/src/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/caller.json',nativeSources:OWNED_OUTCOME_NATIVE_INPUTS.map(path=>({path,sourcePath:path==='Cargo.lock'?path:'rust/'+path}))};
 const data=ownedStateReceivingData(),native=new Map(data.files.filter(row=>!row.path.startsWith('runtime/')).map(row=>[row.path,row.source]));native.set('src/lib.rs',native.get('src/lib.rs')+'pub mod translation_carriers_core;\n');native.set('src/translation_carriers_core.rs',OWNED_OUTCOME_NATIVE_SOURCE);for(const row of unit.nativeSources)write(row.sourcePath,native.get(row.path));if(runtimes)for(const row of ownedOutcomeUnitRuntimeSources(unit))write(row.path,row.source);
 write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));const source=`import {router_carrier_json_result_copy as copy,router_carrier_json_err as err} from '../runtime/owned-outcome-runtime.mjs';
import {json_macro_null as nil} from '../runtime/json-macro-runtime.mjs';
/** @param {Parameters<typeof copy>[0]} value */
export function changed(value){if(value.$==='Err'){return err('old');}return copy(value);}
/** @param {string} message @returns {ReturnType<typeof err>} */
export function constructed(message){const observed=nil();return {$:'Err',field0:message};}
`;write(unit.paths.JavaScript,source);const options={root,manifestPath:'units.json'};return {root,unit,source,write,read,commit,options,plan:()=>planUnitSynchronization(options),apply:value=>applyUnitSynchronization(JSON.stringify(value),options)};
}
test('actual carrier units synchronize edits among physical js ts and rust roots',limits,async t=>{
 const api=fixture(t),first=api.plan();assert.equal(first.units[0].authority,'JavaScript');assert.ok(first.outputs.some(row=>row.path==='ts/runtime/owned-outcome-runtime.mjs'));api.apply(first);api.commit();const native=api.read(api.unit.paths.Rust),edited=native.replace('"old"','"Rust"');assert.notEqual(native,edited);api.write(api.unit.paths.Rust,edited);const rust=api.plan();assert.equal(rust.units[0].authority,'Rust');api.apply(rust);api.commit();
 const javascript=api.read(api.unit.paths.JavaScript).replace('"Rust"','"JavaScript"');api.write(api.unit.paths.JavaScript,javascript);const js=api.plan();assert.equal(js.units[0].authority,'JavaScript');api.apply(js);api.commit();const typed=api.read(api.unit.paths.TypeScript).replace('"JavaScript"','"TypeScript"');api.write(api.unit.paths.TypeScript,typed);const ts=api.plan();assert.equal(ts.units[0].authority,'TypeScript');api.apply(ts);
 const module=await import(pathToFileURL(join(api.root,api.unit.paths.JavaScript)).href);assert.deepEqual(module.changed({$:'Err',field0:'input'}),{$:'Err',field0:'TypeScript'});assert.deepEqual(module.changed({$:'Ok',field0:nil()}),{$:'Ok',field0:nil()});assert.equal(ts.rustExecuted,false);assert.equal(ts.crossInvocationCache,false);
});
test('unannotated edited JS uses freshly checked paired carrier inputs and constructor returns as proposals only',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();const changed=api.source.replace(/\/\*\*[\s\S]*?\*\//gu,'').replace("'old'","'new'");api.write(api.unit.paths.JavaScript,changed);const proposal=api.plan(),metadata=JSON.parse(proposal.outputs.find(row=>row.path===api.unit.meta).after),history=metadata.semanticMeta.signatureProposalHistory;assert.equal(history.original,changed);assert.equal(history.equation.inverse,changed);assert.ok(history.edits.some(row=>row.replacement.includes('@returns')));api.apply(proposal);assert.equal(api.read(api.unit.paths.JavaScript),changed);assert.ok(api.read(api.unit.paths.Rust).includes('"new"'));
});
test('runtime initialization derives all carrier assets without translating the application',limits,t=>{
 const api=fixture(t,{runtimes:false}),source='export class UnsupportedApplication {}\n';api.write(api.unit.paths.JavaScript,source);const proposal=planUnitRuntimeMaterialization(api.options);assert.ok(proposal.outputs.some(row=>row.path==='js/runtime/owned-outcome-runtime.mjs'));assert.ok(proposal.outputs.some(row=>row.path==='ts/runtime/owned-outcome-runtime.d.mts'));applyUnitRuntimeMaterialization(JSON.stringify(proposal),api.options);assert.equal(api.read(api.unit.paths.JavaScript),source);assert.equal(existsSync(join(api.root,api.unit.paths.Rust)),false);assert.equal(existsSync(join(api.root,api.unit.paths.TypeScript)),false);
});
test('stale carrier/native inputs concurrent source edits and forged plans cannot be installed',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();const native=api.read(api.unit.paths.Rust);api.write(api.unit.paths.JavaScript,api.source.replace("'old'","'new'"));const proposal=api.plan(),forged=structuredClone(proposal);forged.outputs.find(row=>row.path===api.unit.paths.Rust).after+='\n// forged\n';assert.throws(()=>api.apply(forged),/fresh source translation/u);api.write(api.unit.paths.Rust,native.replace('"old"','"other"'));assert.throws(api.plan,/concurrent source edits/u);api.write(api.unit.paths.Rust,native);
 const before=api.read('ts/runtime/owned-outcome-runtime.mjs');api.write('ts/runtime/owned-outcome-runtime.mjs',before+'\n// changed\n');assert.throws(api.plan);api.write('ts/runtime/owned-outcome-runtime.mjs',before);api.write('rust/src/translation_carriers_core.rs',OWNED_OUTCOME_NATIVE_SOURCE+'\n// changed\n');assert.throws(api.plan);
});
test('all complete predecessor source copies compose carrier unit successors and retain full CST inverses',limits,()=>{
 const unit=prepareOwnedOutcomeUnitSources();assert.equal(unit.files.length,9);for(const plan of [unit,prepareOwnedOutcome(),prepareOwnedStateUnitSources(),prepareOwnedStateFlow(),prepareOwnedNumericAbi(),prepareUnitRuntimeMaterialization()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
