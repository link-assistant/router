// Complete independent regression SOURCE only; no execution while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {planCheckedJsonIterationAdoption,applyCheckedJsonIterationAdoption} from '../checked-json-iteration-adoption.mjs';
import {prepareCheckedIterationAdoption} from '../prepare-checked-iteration-adoption.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as bool} from '../json-macro-runtime.mjs';
const limits={timeout:60_000};
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-checked-json-adoption-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);};
 const source='pub mod translation_core;\npub mod translation_collections_core;\npub fn selected(values:&[crate::translation_core::Json])->bool{values.iter().any(|value|value.is_null())}\npub fn unrelated(value:u64)->u64{value}\n';
 for(const [path,body]of [['rust/src/lib.rs',source],['rust/src/translation_core.rs',ROUTER_FORMATTING_FACADE_SOURCE],['rust/src/translation_core/primitives.rs',ROUTER_CORE_PRIMITIVES_SOURCE],['rust/src/translation_core/ranges.rs',ROUTER_CORE_RANGES_SOURCE],['rust/src/translation_core/json_collections.rs',ROUTER_CORE_JSON_COLLECTIONS_SOURCE],['rust/src/translation_collections_core.rs',JSON_ITERATION_NATIVE_SOURCE]])write(path,body);
 write('Cargo.toml',readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'));write('rust/Cargo.toml',readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'));write('Cargo.lock',readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'));
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'});git(['init','--quiet']);git(['add','.']);git(['commit','--quiet','-m','Complete native source baseline']);
 const options={root,functions:[{path:'rust/src/lib.rs',name:'selected'}]};return {root,source,write,options,plan:()=>planCheckedJsonIterationAdoption(options),apply:plan=>applyCheckedJsonIterationAdoption(JSON.stringify(plan),options)};
}
test('selected complete functions freshly check and emit JS TS before a source installation proposal',limits,async t=>{
 const api=fixture(t),proposal=api.plan();assert.equal(proposal.functions.length,1);assert.ok(proposal.inputs.some(row=>row.path==='Cargo.toml'));assert.ok(proposal.inputs.some(row=>row.path==='rust/Cargo.toml'));assert.ok(proposal.inputs.some(row=>row.path==='Cargo.lock'));assert.equal(readFileSync(join(api.root,'rust/src/lib.rs'),'utf8'),api.source);
 const metadata=JSON.parse(proposal.outputs.find(row=>row.kind==='translation-meta').after),history=metadata.sourceHistories[0];assert.equal(history.before,api.source);assert.equal(history.inverse,api.source);assert.equal(transportConcreteSyntaxMeta(history.beforeMeta).source,api.source);assert.equal(transportConcreteSyntaxMeta(history.afterMeta).source,history.after);assert.ok(history.after.includes('crate::translation_collections_core::json_any'));assert.ok(history.after.includes('pub fn unrelated(value:u64)->u64{value}'));assert.equal(metadata.originalTraitDispatchProved,false);assert.equal(metadata.runtimeParity,false);
 await verifyTypedTargets({javascript:metadata.javascript,typescript:metadata.typescript,meta:metadata.semanticMeta},api=>{assert.equal(api.selected(Object.freeze([nil(),bool(false)])),true);assert.equal(api.selected(Object.freeze([bool(false)])),false);},{childTimeoutMs:20_000});
 const receipt=api.apply(proposal);assert.ok(receipt.changed.includes('rust/src/lib.rs'));assert.equal(readFileSync(join(api.root,'rust/src/lib.rs'),'utf8'),history.after);assert.equal(receipt.rustExecuted,false);
});
test('unresolved selected bodies produce no source writes and no saved approval',limits,t=>{
 const api=fixture(t);api.write('rust/src/lib.rs',api.source.replace('value.is_null()','unknown(value)'));assert.throws(api.plan,/Every selected complete function|closed source adoption/);assert.equal(existsSync(join(api.root,'tools/translation/adoption/json-iterations.json')),false);assert.ok(readFileSync(join(api.root,'rust/src/lib.rs'),'utf8').includes('unknown(value)'));
});
test('forged target bytes changed source Cargo and Git baselines require a fresh complete proposal',limits,t=>{
 const api=fixture(t),proposal=api.plan(),forged=structuredClone(proposal);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>api.apply(forged),/fresh source translation/);assert.equal(readFileSync(join(api.root,'rust/src/lib.rs'),'utf8'),api.source);
 api.write('Cargo.toml',readFileSync(join(api.root,'Cargo.toml'),'utf8')+'\n# changed workspace\n');assert.throws(()=>api.apply(proposal),/fresh source translation|Cargo/);assert.equal(readFileSync(join(api.root,'rust/src/lib.rs'),'utf8'),api.source);
});
test('metadata cannot overwrite any captured native or workspace Cargo source',limits,t=>{
 const api=fixture(t);for(const metaPath of ['rust/src/lib.rs','rust/Cargo.toml','Cargo.toml','Cargo.lock'])assert.throws(()=>planCheckedJsonIterationAdoption({...api.options,metaPath}),/overwrite native source\/Cargo input/);
});
test('the original source transaction and runtime producer retain exact successor histories',limits,()=>{
 const proposal=prepareCheckedIterationAdoption();assert.equal(proposal.files.length,2);for(const row of proposal.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.semanticAuthority,false);
});
