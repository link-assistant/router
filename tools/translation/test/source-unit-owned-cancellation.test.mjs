// Independent physical three-language resource source-unit SOURCE. All unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
import {planUnitRuntimeMaterialization,applyUnitRuntimeMaterialization} from '../unit-runtime-materialization.mjs';
import {OWNED_CANCELLATION_NATIVE_INPUTS,ownedCancellationUnitRuntimeSources} from '../owned-cancellation-unit.mjs';
import {ownedCancellationReceivingData} from '../js-to-rust/test/owned-cancellation-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../owned-outcome-native-source.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE} from '../async-control-native-source.mjs';
import {prepareOwnedCancellationUnitSources} from '../prepare-owned-cancellation-unit-sources.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const limits={timeout:60000};
function fixture(t,{runtimes=true}={}){
 const root=mkdtempSync(join(tmpdir(),'router-cancellation-unit-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);},read=path=>readFileSync(join(root,path),'utf8'),git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:20000}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Source baseline']);};git(['init','--quiet']);write('seed.txt','source baseline\n');commit();
 const unit={id:'cancellation',profile:'owned-cancellation',authority:'auto',paths:{Rust:'rust/src/caller.rs',JavaScript:'js/src/caller.mjs',TypeScript:'ts/src/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/caller.json',nativeSources:OWNED_CANCELLATION_NATIVE_INPUTS.map(path=>({path,sourcePath:path==='Cargo.lock'?path:'rust/'+path}))};
 const data=ownedCancellationReceivingData(),native=new Map(data.files.filter(row=>!row.path.startsWith('runtime/')).map(row=>[row.path,row.source]));native.set('src/lib.rs',native.get('src/lib.rs')+'pub mod translation_carriers_core;\n');native.set('src/translation_carriers_core.rs',OWNED_OUTCOME_NATIVE_SOURCE);for(const row of unit.nativeSources)write(row.sourcePath,native.get(row.path));if(runtimes)for(const row of ownedCancellationUnitRuntimeSources(unit))write(row.path,row.source);
 const source="import {router_cancel_new as created,router_cancel_is_set as isSet,router_cancel_set as signal} from '../runtime/async-control-runtime.mjs';\nexport function produced(){return created();}\n/** @param {Parameters<typeof isSet>[0]} value */\nexport function observed(value){return isSet(value);}\n";write(unit.paths.JavaScript,source);write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));const options={root,manifestPath:'units.json'};return {root,unit,source,write,read,commit,options,plan:()=>planUnitSynchronization(options),apply:value=>applyUnitSynchronization(JSON.stringify(value),options)};
}
function negated(source,typed=false){const ts=ownershipCompiler(),file=ts.createSourceFile(typed?'caller.ts':'caller.mjs',source,ts.ScriptTarget.Latest,true,typed?ts.ScriptKind.TS:ts.ScriptKind.JS),fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='observed'),tail=fn?.body?.statements.at(-1);assert.ok(tail&&ts.isReturnStatement(tail)&&tail.expression);return source.slice(0,tail.expression.getStart(file))+'!('+tail.expression.getText(file)+')'+source.slice(tail.expression.end);}
test('resource units synchronize Rust JS and TS edits while retaining actual opaque runtime identity',limits,async t=>{
 const api=fixture(t),initial=api.plan();assert.equal(initial.units[0].authority,'JavaScript');api.apply(initial);api.commit();const before=api.read(api.unit.paths.Rust),changed=before.replace('::cancel_is_set(value)','::cancel_set(value)');assert.notEqual(changed,before);api.write(api.unit.paths.Rust,changed);const native=api.plan();assert.equal(native.units[0].authority,'Rust');api.apply(native);api.commit();api.write(api.unit.paths.JavaScript,negated(api.read(api.unit.paths.JavaScript)));const js=api.plan();assert.equal(js.units[0].authority,'JavaScript');api.apply(js);api.commit();api.write(api.unit.paths.TypeScript,negated(api.read(api.unit.paths.TypeScript),true));const typed=api.plan();assert.equal(typed.units[0].authority,'TypeScript');api.apply(typed);
 const module=await import(pathToFileURL(join(api.root,api.unit.paths.JavaScript)));const resource=module.produced();assert.equal(module.observed(resource),true);assert.equal(module.observed(resource),false);assert.throws(()=>module.observed(Object.freeze({})),TypeError);assert.equal(typed.rustExecuted,false);assert.equal(typed.runtimeParity,false);
});
test('unannotated edited JS receives only the freshly checked paired public cancellation borrow domain',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();const source=negated(api.source.replace(/\/\*\*[\s\S]*?\*\//gu,''));api.write(api.unit.paths.JavaScript,source);const plan=api.plan(),meta=JSON.parse(plan.outputs.find(row=>row.path===api.unit.meta).after),history=meta.semanticMeta.signatureProposalHistory;assert.equal(history.original,source);assert.equal(history.equation.inverse,source);assert.ok(history.edits.some(row=>row.replacement.includes('Parameters<typeof paired_input_router_cancel_is_set>[0]')));api.apply(plan);assert.equal(api.read(api.unit.paths.JavaScript),source);
});
test('runtime-only installation includes both actual opaque resource implementations without translating caller source',limits,t=>{
 const api=fixture(t,{runtimes:false}),source='export class UnsupportedApplication {}\n';api.write(api.unit.paths.JavaScript,source);const plan=planUnitRuntimeMaterialization(api.options);assert.ok(plan.outputs.some(row=>row.path==='js/runtime/async-control-runtime.mjs'));assert.ok(plan.outputs.some(row=>row.path==='ts/runtime/async-control-runtime.d.mts'));applyUnitRuntimeMaterialization(JSON.stringify(plan),api.options);assert.equal(api.read(api.unit.paths.JavaScript),source);assert.equal(existsSync(join(api.root,api.unit.paths.Rust)),false);
});
test('concurrent edits stale native/runtime inputs and forged resource proposals never install',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();api.write(api.unit.paths.JavaScript,negated(api.source));const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.path===api.unit.paths.Rust).after+='\n// changed proposal\n';assert.throws(()=>api.apply(forged),/fresh source translation/u);const native=api.read(api.unit.paths.Rust);api.write(api.unit.paths.Rust,native+'\n// concurrent edit\n');assert.throws(()=>api.plan(),/concurrent source edits/u);api.write(api.unit.paths.Rust,native);api.write('rust/src/translation_async_control_core.rs',ASYNC_CONTROL_NATIVE_SOURCE+'\n// changed\n');assert.throws(()=>api.plan());
});
test('complete unit adapter and profile/transaction source histories retain both ordered phases and all inverses',limits,()=>{
 const plan=prepareOwnedCancellationUnitSources();assert.equal(plan.files.length,7);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.ok(plan.files.some(row=>row.path==='tools/translation/unit-runtime-materialization.mjs'));assert.ok(plan.files.some(row=>row.path==='tools/translation/synchronize-units.mjs'));
});
