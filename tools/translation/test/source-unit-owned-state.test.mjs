// Full integration regression SOURCE. No execution during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
import {OWNED_STATE_NATIVE_INPUTS,ownedStateUnitRuntimeSources} from '../owned-state-unit.mjs';
import {prepareOwnedStateUnitSources} from '../prepare-owned-state-unit-sources.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_array as array} from '../json-macro-runtime.mjs';
const repository=fileURLToPath(new URL('../../../',import.meta.url)),limits={timeout:60_000};
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-owned-state-sync-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);},read=path=>readFileSync(join(root,path),'utf8');
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Source unit baseline']);};
 git(['init','--quiet']);write('seed.txt','source baseline\n');commit();
 const unit={id:'owned',profile:'owned-state',authority:'auto',paths:{Rust:'rust/src/caller.rs',JavaScript:'js/src/caller.mjs',TypeScript:'ts/src/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/caller.json',nativeSources:OWNED_STATE_NATIVE_INPUTS.map(path=>({path,sourcePath:path==='Cargo.lock'?path:'rust/'+path}))};
 const native=new Map([['src/lib.rs','pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n'],['src/translation_core.rs',ROUTER_FORMATTING_FACADE_SOURCE],['src/translation_core/primitives.rs',ROUTER_CORE_PRIMITIVES_SOURCE],['src/translation_core/json_collections.rs',ROUTER_CORE_JSON_COLLECTIONS_SOURCE],['src/translation_collections_core.rs',JSON_ITERATION_NATIVE_SOURCE],['src/translation_state_core.rs',JSON_STATE_NATIVE_SOURCE],['Cargo.toml',readFileSync(join(repository,'rust/Cargo.toml'),'utf8')],['Cargo.lock',readFileSync(join(repository,'Cargo.lock'),'utf8')]]);
 for(const row of unit.nativeSources)write(row.sourcePath,native.get(row.path));for(const row of ownedStateUnitRuntimeSources(unit))write(row.path,row.source);
 write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));
 const source='import {router_state_json_with_index as replace} from "../runtime/json-state-runtime.mjs";\nimport {json_macro_string as string} from "../runtime/json-macro-runtime.mjs";\n/** @param {import("../runtime/json-macro-runtime.mjs").JsonValue} base */\nexport function replaceFirst(base){return replace(base,0n,string("old"));}\n';
 write(unit.paths.JavaScript,source);const options={root,manifestPath:'units.json'},plan=()=>planUnitSynchronization(options),apply=value=>applyUnitSynchronization(JSON.stringify(value),options);return {root,unit,source,write,read,commit,options,plan,apply};
}
test('actual JS Rust JS and TypeScript edits synchronize through the owned state profile',limits,async t=>{
 const api=fixture(t),first=api.plan();assert.equal(first.units[0].authority,'JavaScript');api.apply(first);api.commit();
 const native=api.read(api.unit.paths.Rust),rust=native.replace('"old"','"Rust"');assert.notEqual(rust,native);api.write(api.unit.paths.Rust,rust);
 const fromRust=api.plan();assert.equal(fromRust.units[0].authority,'Rust');const metadata=JSON.parse(fromRust.outputs.find(row=>row.path===api.unit.meta).after);assert.equal(metadata.semanticMeta.ownedRustSourceHistory.equation.inverse,rust);api.apply(fromRust);api.commit();
 const javascript=api.read(api.unit.paths.JavaScript).replace('"Rust"','"JavaScript"');api.write(api.unit.paths.JavaScript,javascript);const fromJs=api.plan();assert.equal(fromJs.units[0].authority,'JavaScript');api.apply(fromJs);api.commit();
 const typed=api.read(api.unit.paths.TypeScript).replace('"JavaScript"','"TypeScript"');api.write(api.unit.paths.TypeScript,typed);const fromTs=api.plan();assert.equal(fromTs.units[0].authority,'TypeScript');api.apply(fromTs);
 const module=await import(pathToFileURL(join(api.root,api.unit.paths.JavaScript)).href);assert.deepEqual(module.replaceFirst(array([nil()])),array([text('TypeScript')]));assert.ok(api.read(api.unit.paths.Rust).includes('"TypeScript"'));assert.equal(fromTs.rustExecuted,false);assert.equal(fromTs.crossInvocationCache,false);
});
test('an edited unannotated JS body can freshly recheck actual old TS signature proposals',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();const changed=api.source.replace('/** @param {import("../runtime/json-macro-runtime.mjs").JsonValue} base */\n','').replace('"old"','"new"');api.write(api.unit.paths.JavaScript,changed);
 const proposal=api.plan(),metadata=JSON.parse(proposal.outputs.find(row=>row.path===api.unit.meta).after),history=metadata.semanticMeta.signatureProposalHistory;assert.equal(history.original,changed);assert.equal(history.equation.inverse,changed);assert.equal(history.semanticAuthority,false);api.apply(proposal);assert.equal(api.read(api.unit.paths.JavaScript),changed);assert.ok(api.read(api.unit.paths.Rust).includes('"new"'));
});
test('native runtime conflicts concurrent edits and forged plans remain fatal',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();const rust=api.read(api.unit.paths.Rust);api.write(api.unit.paths.JavaScript,api.source.replace('"old"','"new"'));api.write(api.unit.paths.Rust,rust.replace('"old"','"other"'));assert.throws(api.plan,/concurrent source edits/);api.write(api.unit.paths.Rust,rust);
 const proposal=api.plan(),forged=structuredClone(proposal);forged.outputs.find(row=>row.path===api.unit.paths.Rust).after+='\n// forged\n';assert.throws(()=>api.apply(forged),/fresh source translation/);
 const runtime='ts/runtime/json-state-runtime.mjs',before=api.read(runtime);api.write(runtime,before+'\n// changed\n');assert.throws(api.plan,/runtime differs/);api.write(runtime,before);
 api.write('rust/src/translation_state_core.rs',JSON_STATE_NATIVE_SOURCE+'\n// changed\n');assert.throws(api.plan,/native|state source/i);
});
test('complete source substitutions preserve every prior original and CST inverse',limits,()=>{
 const proposal=prepareOwnedStateUnitSources();assert.equal(proposal.files.length,3);for(const row of proposal.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.semanticAuthority,false);
});
