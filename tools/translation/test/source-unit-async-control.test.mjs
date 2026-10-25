// Physical cold-resource source-unit regression SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
import {planUnitRuntimeMaterialization,applyUnitRuntimeMaterialization} from '../unit-runtime-materialization.mjs';
import {ASYNC_CONTROL_NATIVE_INPUTS,asyncControlUnitRuntimeSources} from '../async-control-unit.mjs';
import {ownedCancellationReceivingData} from '../js-to-rust/test/owned-cancellation-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../owned-outcome-native-source.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE} from '../async-control-native-source.mjs';
import {prepareAsyncControlUnitSources} from '../prepare-async-control-unit-sources.mjs';
const limits={timeout:60000};
function fixture(t,{runtimes=true}={}){
 const root=mkdtempSync(join(tmpdir(),'router-async-unit-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);},read=path=>readFileSync(join(root,path),'utf8'),git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:20000}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Source baseline']);};git(['init','--quiet']);write('seed.txt','source baseline\n');commit();
 const unit={id:'cold-control',profile:'async-control',authority:'auto',paths:{Rust:'rust/src/caller.rs',JavaScript:'js/src/caller.mjs',TypeScript:'ts/src/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/caller.json',nativeSources:ASYNC_CONTROL_NATIVE_INPUTS.map(path=>({path,sourcePath:path==='Cargo.lock'?path:'rust/'+path}))};
 const data=ownedCancellationReceivingData(),native=new Map(data.files.filter(row=>!row.path.startsWith('runtime/')).map(row=>[row.path,row.source]));native.set('src/lib.rs',native.get('src/lib.rs')+'pub mod translation_carriers_core;\n');native.set('src/translation_carriers_core.rs',OWNED_OUTCOME_NATIVE_SOURCE);for(const row of unit.nativeSources)write(row.sourcePath,native.get(row.path));if(runtimes)for(const row of asyncControlUnitRuntimeSources(unit))write(row.path,row.source);
 const source="import {router_async_sleep as sleep} from '../runtime/async-control-runtime.mjs';\n/** @param {Parameters<typeof sleep>[1]} token */\nexport function slept(token){return sleep(0n,token);}\n";write(unit.paths.JavaScript,source);write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));const options={root,manifestPath:'units.json'};return {root,unit,source,write,read,commit,options,plan:()=>planUnitSynchronization(options),apply:value=>applyUnitSynchronization(JSON.stringify(value),options)};
}
test('physical JS Rust and TypeScript edits synchronize with matching opaque runtime identity',limits,async t=>{
 const api=fixture(t),initial=api.plan();assert.equal(initial.units[0].authority,'JavaScript');api.apply(initial);api.commit();const original=api.read(api.unit.paths.Rust);assert.ok(original.includes('0_u64'));api.write(api.unit.paths.Rust,original.replace('0_u64','1_u64'));const rust=api.plan();assert.equal(rust.units[0].authority,'Rust');api.apply(rust);api.commit();const before=api.read(api.unit.paths.JavaScript);assert.ok(before.includes('1n'));api.write(api.unit.paths.JavaScript,before.replace('1n','2n'));api.apply(api.plan());api.commit();const typed=api.read(api.unit.paths.TypeScript);assert.ok(typed.includes('2n'));api.write(api.unit.paths.TypeScript,typed.replace('2n','3n'));const typescript=api.plan();assert.equal(typescript.units[0].authority,'TypeScript');api.apply(typescript);
 const caller=await import(pathToFileURL(join(api.root,api.unit.paths.JavaScript))),runtime=await import(pathToFileURL(join(api.root,'js/runtime/async-control-runtime.mjs'))),token=runtime.router_cancel_new();assert.deepEqual(await caller.slept(token),{$:'Ok',field0:null});runtime.router_cancel_set(token);assert.deepEqual(await caller.slept(token),{$:'Err',field0:{$:'Cancelled'}});assert.equal(typescript.rustExecuted,false);assert.equal(typescript.runtimeParity,false);
});
test('missing JS borrow annotations are proposed from a freshly checked actual TypeScript pair',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();const edited=api.source.replace(/\/\*\*[\s\S]*?\*\//gu,'').replace('0n','1n');api.write(api.unit.paths.JavaScript,edited);const plan=api.plan(),metadata=JSON.parse(plan.outputs.find(row=>row.path===api.unit.meta).after),history=metadata.semanticMeta.signatureProposalHistory;assert.equal(history.original,edited);assert.equal(history.equation.inverse,edited);assert.ok(history.edits.some(row=>row.replacement.includes('Parameters<typeof paired_control_input_')));api.apply(plan);assert.equal(api.read(api.unit.paths.JavaScript),edited);
});
test('runtime initialization covers resource and cold-flow dependencies without translating unsupported application source',limits,t=>{
 const api=fixture(t,{runtimes:false});api.write(api.unit.paths.JavaScript,'export class UnsupportedApplication {}\n');const plan=planUnitRuntimeMaterialization(api.options);assert.ok(plan.outputs.some(row=>row.path==='js/runtime/async-control-runtime.mjs'));assert.ok(plan.outputs.some(row=>row.path==='ts/runtime/extensions/filesystem-effects-runtime.mjs'));applyUnitRuntimeMaterialization(JSON.stringify(plan),api.options);assert.equal(existsSync(join(api.root,api.unit.paths.Rust)),false);assert.equal(api.read(api.unit.paths.JavaScript),'export class UnsupportedApplication {}\n');
});
test('concurrent source changes stale opaque libraries and forged proposals retain the original transaction refusals',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();api.write(api.unit.paths.JavaScript,api.source.replace('0n','1n'));const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.path===api.unit.paths.Rust).after+='\n// forged\n';assert.throws(()=>api.apply(forged),/fresh source translation/u);const rust=api.read(api.unit.paths.Rust);api.write(api.unit.paths.Rust,rust+'\n// concurrent\n');assert.throws(()=>api.plan(),/concurrent source edits/u);api.write(api.unit.paths.Rust,rust);api.write('rust/src/translation_async_control_core.rs',ASYNC_CONTROL_NATIVE_SOURCE+'\n// changed\n');assert.throws(()=>api.plan());
});
test('complete original adapter profile and transaction substitutions retain all source inverses',limits,()=>{
 const plan=prepareAsyncControlUnitSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);assert.ok(plan.files.some(row=>row.path==='tools/translation/unit-runtime-materialization.mjs'));assert.ok(plan.files.some(row=>row.path==='tools/translation/synchronize-units.mjs'));
});
