// Physical mixed receiving membership source drafts. ALL UNRUN.
// Physical nonempty receiving source unit extension drafts. ALL UNRUN.
// Rust-authoritative physical source refresh cases. SOURCE ONLY; ALL UNRUN.
// Generated source-unit manifests and repeated physical synchronization. ALL UNRUN.
// Automatic initial physical source adoption. SOURCE ONLY; ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync,symlinkSync} from 'node:fs';import {join,dirname} from 'node:path';import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';
import {planOwnedNativeBulkUnitSynchronization,applyOwnedNativeBulkUnitSynchronization} from '../owned-native-bulk-unit-synchronization.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../router-core-source-data.mjs';
import {sourceUnitArguments} from '../../../scripts/sync-router-native-bulk.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function initialFixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-native-bulk-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);},read=path=>readFileSync(join(root,path),'utf8'),git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Bulk adoption baseline']);};
 const unit={schema:'router-owned-native-bulk-unit-v1',id:'initial-native-modules',runtimeRoot:'js/runtime',declarationRoot:'ts/runtime',javascriptRoot:'js/src/translated',typescriptRoot:'ts/src/translated',meta:'translation/native-bulk.json'},native='pub mod translation_core;\npub mod alpha { pub fn pick(flag:bool,value:i64)->i64 { if flag { value } else { 0_i64 } } }\npub mod bravo { pub fn pick(value:u64)->u64 { value } }';
 write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('rust/Cargo.toml',dependencies.manifest);write('Cargo.lock',dependencies.lock);write('rust/src/lib.rs',native);for(const [path,source]of [['rust/src/translation_core.rs',facade],['rust/src/translation_core/primitives.rs',primitives],['rust/src/translation_core/ranges.rs',ranges],['rust/src/translation_core/base64.rs',base64],['rust/src/translation_core/json_collections.rs',collections]])write(path,source);write('native-bulk.json',JSON.stringify(unit));git(['init','--quiet']);commit();const options={root,manifestPath:'native-bulk.json'};return {root,unit,native,write,read,commit,plan:()=>planOwnedNativeBulkUnitSynchronization(options),apply:proposal=>applyOwnedNativeBulkUnitSynchronization(JSON.stringify(proposal),options)};
}

import {planOwnedVectorBulkUnitSynchronization,applyOwnedVectorBulkUnitSynchronization} from '../owned-vector-bulk-unit-synchronization.mjs';
import {prepareVectorBulkUnitSources} from '../prepare-vector-bulk-unit-sources.mjs';
function fixture(t,authority='JavaScript'){
 const api=initialFixture(t),initial=api.plan();api.apply(initial);const bulk=initial.outputs.find(row=>row.kind==='generated-bulk-unit-manifest');assert.ok(bulk);const index=JSON.parse(api.read(bulk.path));index.authority=authority;api.write(bulk.path,JSON.stringify(index));api.commit();
 const descriptors=index.units.map(path=>({path,unit:JSON.parse(api.read(path))}));for(const {unit}of descriptors){if(!unit.bindings.some(binding=>['alpha.pick','bravo.pick'].includes(binding.rustName)))continue;const selected=authority==='JavaScript'?unit.javascript:unit.typescript,source=api.read(selected),after=source.replace('= 0n;','= 9n;').replace('return value;','return 7n;');assert.notEqual(after,source);api.write(selected,after);}
 const options={root:api.root,manifestPath:bulk.path};return {...api,index,descriptors,plan:()=>planOwnedVectorBulkUnitSynchronization(options),apply:proposal=>applyOwnedVectorBulkUnitSynchronization(JSON.stringify(proposal),options)};
}




function reconciliationFixture(t,authority){
 const api=initialFixture(t),initial=api.plan();api.apply(initial);const bulk=initial.outputs.find(row=>row.kind==='generated-bulk-unit-manifest'),index=JSON.parse(api.read(bulk.path));index.authority=authority;api.write(bulk.path,JSON.stringify(index));api.commit();const descriptors=index.units.map(path=>({path,unit:JSON.parse(api.read(path))}));
 for(const {unit}of descriptors)api.write(authority==='JavaScript'?unit.javascript:unit.typescript,authority==='JavaScript'?'/** @param {boolean} value */\nexport function replacement(value){return leaf(value);}\n/** @param {boolean} value */\nexport function leaf(value){return value;}':'export function replacement(value:boolean):boolean{return leaf(value);}\nexport function leaf(value:boolean):boolean{return value;}');
 const options={root:api.root,manifestPath:bulk.path};return {...api,index,bulk:bulk.path,descriptors,plan:()=>planOwnedVectorBulkUnitSynchronization(options),apply:proposal=>applyOwnedVectorBulkUnitSynchronization(JSON.stringify(proposal),options)};
}
for(const authority of ['JavaScript','TypeScript'])test('physical '+authority+' mixed membership replaces complete unit bindings in the same source transaction',limits,t=>{
 const api=reconciliationFixture(t,authority),plan=api.plan(),descriptors=plan.outputs.filter(row=>row.kind==='refreshed-source-unit-manifest');assert.equal(descriptors.length,api.index.units.length);for(const output of descriptors){const unit=JSON.parse(output.after);assert.deepEqual(unit.bindings.map(row=>row.javascriptName).sort(),['leaf','replacement']);assert.ok(unit.bindings.every(row=>!row.rustName.endsWith('.pick')));}
 assert.equal(plan.outputs.filter(row=>row.kind==='composed-native-source'&&row.path==='rust/src/lib.rs').length,1);api.apply(plan);for(const {path}of api.descriptors){const unit=JSON.parse(api.read(path));assert.deepEqual(unit.bindings.map(row=>row.javascriptName).sort(),['leaf','replacement']);assert.ok(api.read(unit.javascript).includes('function replacement'));assert.ok(!api.read(unit.javascript).includes('function pick'));}api.commit();assert.equal(api.plan().outputs.some(row=>row.kind==='composed-native-source'),false);assert.equal(plan.rustExecuted,false);
});
test('physical mixed membership refuses changed native source and stale manifest inputs before installation',limits,t=>{
 const api=reconciliationFixture(t,'JavaScript'),plan=api.plan();api.write('rust/src/lib.rs',api.read('rust/src/lib.rs')+'\n// concurrent native source');assert.throws(()=>api.apply(plan));const next=reconciliationFixture(t,'TypeScript'),proposal=next.plan(),path=next.index.units[0];next.write(path,next.read(path)+'\n');assert.throws(()=>next.apply(proposal));
});
