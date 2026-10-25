// Independent physical transaction regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {httpResourceOptionCallbackUnitFixture as fixture} from './http-resource-option-callback-unit-data.mjs';
const limits={timeout:60000};
test('actual optional native library mappings synchronize physical Rust JS TS edits through checked meta',limits,async t=>{
 const api=fixture(t),first=api.plan();assert.equal(first.units[0].authority,'JavaScript');assert.ok(first.inputs.some(row=>row.path==='rust/src/translation_primitive_option_callbacks_core.rs'));api.apply(first);api.commit();const native=api.read(api.unit.paths.Rust);assert.ok(native.includes('0_u64'));api.write(api.unit.paths.Rust,native.replace('0_u64','1_u64'));const inverse=api.plan();assert.equal(inverse.units[0].authority,'Rust');api.apply(inverse);api.commit();const javascript=api.read(api.unit.paths.JavaScript);assert.ok(javascript.includes('1n'));api.write(api.unit.paths.JavaScript,javascript.replace('1n','2n'));api.apply(api.plan());api.commit();const typed=api.read(api.unit.paths.TypeScript);assert.ok(typed.includes('2n'));api.write(api.unit.paths.TypeScript,typed.replace('2n','3n'));const last=api.plan();assert.equal(last.units[0].authority,'TypeScript');api.apply(last);const caller=await import(pathToFileURL(join(api.root,api.unit.paths.JavaScript)));assert.deepEqual(caller.chosen(),{$:'Some',field0:3n});assert.equal(last.rustExecuted,false);assert.equal(last.runtimeParity,false);
});
test('changed optional native bytes and forged synchronized proposals retain original transaction refusals',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();api.write(api.unit.paths.JavaScript,api.source.replace('0n','1n'));const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.path===api.unit.paths.Rust).after+='\n// forged\n';assert.throws(()=>api.apply(forged),/fresh source translation/u);const path='rust/src/translation_primitive_option_callbacks_core.rs';api.write(path,api.read(path)+'\n// changed\n');assert.throws(()=>api.plan());
});
