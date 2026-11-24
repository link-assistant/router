// Operational layout/overwrite cases only. All execution remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {planPhysicalLanguageProducerOutputs20261104 as plan} from '../physical-language-output-layout-20261104.mjs';
import {installExactProducerOutputs} from '../layout-ownership-bulk-20261101.mjs';
const receipt='tools/translation/js-to-rust/generated/js-first-ownership-canonical-20261101.json';
function fixture(t){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-physical-layout-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const put=(path,source)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),source);};return {root,put,options:{root,producer:'js-first',receiptPath:receipt}};}
test('nested and standalone crates reject the other physical Rust output root',{timeout:60000},t=>{
 for(const nested of [false,true]){const {put,options}=fixture(t);put(nested?'rust/Cargo.toml':'Cargo.toml','[package]\nname="fixture"\nversion="0.0.0"\n');const wrong=(nested?'':'rust/')+'src/generated_js_first/policy.rs';assert.throws(()=>plan({...options,artifacts:new Map([[wrong,'pub const VALUE: bool = true;\n']])}),/wrong observed physical crate root/);}
});
test('fresh correct output enrollment retains original installer and exact edited-peer refusal',{timeout:60000},t=>{
 const {root,put,options}=fixture(t);put('rust/Cargo.toml','[package]\nname="fixture"\nversion="0.0.0"\n');put('rust/src/authored.rs','// authored neighbor\n');let artifacts=new Map([['rust/src/generated_js_first/policy.rs','pub const VALUE: bool = true;\n']]);const first=plan({...options,artifacts});installExactProducerOutputs(first,()=>plan({...options,artifacts}));assert.equal(fs.readFileSync(join(root,'rust/src/authored.rs'),'utf8'),'// authored neighbor\n');put('rust/src/generated_js_first/policy.rs','// authored edit\n');artifacts=new Map([['rust/src/generated_js_first/policy.rs','pub const VALUE: bool = false;\n']]);assert.throws(()=>plan({...options,artifacts}),/authored or modified|edited producer/);
});
test('empty receivers retain original fresh output domain while manifest absence stays captured',{timeout:60000},t=>{
 for(const prefix of ['', 'rust/']){const {options}=fixture(t),result=plan({...options,artifacts:new Map([[prefix+'src/generated_js_first/policy.rs','pub const VALUE: bool = true;\n']])});assert.ok(result.inputs.some(row=>row.path==='Cargo.toml'&&row.source===null));assert.ok(result.inputs.some(row=>row.path==='rust/Cargo.toml'&&row.source===null));}
});
test('a new manifest after planning invalidates fresh installation before outputs publish',{timeout:60000},t=>{
 const {root,put,options}=fixture(t),artifacts=new Map([['src/generated_js_first/policy.rs','pub const VALUE: bool = true;\n']]),before=plan({...options,artifacts});put('rust/Cargo.toml','[package]\nname="appeared"\nversion="0.0.0"\n');assert.throws(()=>installExactProducerOutputs(before,()=>plan({...options,artifacts})));assert.equal(fs.existsSync(join(root,'src/generated_js_first/policy.rs')),false);
});
test('original producer inputs cannot contradict the observed physical manifest',{timeout:60000},t=>{
 const {put,options}=fixture(t);put('rust/Cargo.toml','[package]\nname="actual"\nversion="0.0.0"\n');assert.throws(()=>plan({...options,artifacts:new Map(),inputs:[{path:'rust/Cargo.toml',source:'different'}]}),/manifest changed|source changed/);
});
test('layout changes cannot turn prior other-root ownership into a stale deletion',{timeout:60000},t=>{
 const {root,put,options}=fixture(t),artifacts=new Map([['src/generated_js_first/policy.rs','pub const VALUE: bool = true;\n']]);put('Cargo.toml','[package]\nname="standalone"\nversion="0.0.0"\n');const before=plan({...options,artifacts});installExactProducerOutputs(before,()=>plan({...options,artifacts}));put('rust/Cargo.toml','[package]\nname="nested"\nversion="0.0.0"\n');assert.throws(()=>plan({...options,artifacts:new Map()}),/stale ownership selects another/);assert.equal(fs.readFileSync(join(root,'src/generated_js_first/policy.rs'),'utf8'),artifacts.get('src/generated_js_first/policy.rs'));
});
test('explicit authored protection can retire a stale other-root receipt without deleting its file',{timeout:60000},t=>{
 const {root,put,options}=fixture(t),path='src/generated_js_first/policy.rs',artifacts=new Map([[path,'pub const VALUE: bool = true;\n']]);put('Cargo.toml','[package]\nname="standalone"\nversion="0.0.0"\n');const before=plan({...options,artifacts});installExactProducerOutputs(before,()=>plan({...options,artifacts}));put('rust/Cargo.toml','[package]\nname="nested"\nversion="0.0.0"\n');put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:[path],unmanaged:[]}));const next=plan({...options,artifacts:new Map()});assert.equal(next.outputs.some(row=>row.path===path),false);installExactProducerOutputs(next,()=>plan({...options,artifacts:new Map()}));assert.equal(fs.readFileSync(join(root,path),'utf8'),artifacts.get(path));
});
test('routing uses the original artifact iteration rather than a replaceable keys view',{timeout:60000},t=>{
 const {put,options}=fixture(t);put('rust/Cargo.toml','[package]\nname="nested"\nversion="0.0.0"\n');class SourceMap extends Map{keys(){throw Error('extra enumeration must not run');}}const artifacts=new SourceMap([['src/generated_js_first/policy.rs','pub const VALUE: bool = true;\n']]);assert.throws(()=>plan({...options,artifacts}),/wrong observed physical crate root/);
});
