// Independent generic alias synchronization SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {httpResourceOptionCallbackUnitFixture as fixture} from './http-resource-option-callback-unit-data.mjs';
const limits={timeout:60000};
test('actual generic constraints/default query imports survive successive JS and Rust authority edits',limits,t=>{
 const api=fixture(t);api.apply(api.plan());api.commit();const declaration='\nexport type Chosen<Fn extends typeof map = typeof map> = ReturnType<Fn>;\n';api.write(api.unit.paths.TypeScript,api.read(api.unit.paths.TypeScript)+declaration);api.apply(api.plan());api.commit();
 api.write(api.unit.paths.JavaScript,api.read(api.unit.paths.JavaScript).replace(/\bmap\b/gu,'changedMap').replaceAll('0n','1n'));const javascript=api.plan();assert.equal(javascript.units[0].authority,'JavaScript');api.apply(javascript);const first=api.read(api.unit.paths.TypeScript);assert.equal((first.match(/typeof changedMap/gu)??[]).length,2);assert.match(first,/type Chosen<Fn extends/u);api.commit();
 api.write(api.unit.paths.Rust,api.read(api.unit.paths.Rust).replaceAll('1_u64','2_u64'));const native=api.plan();assert.equal(native.units[0].authority,'Rust');api.apply(native);const final=api.read(api.unit.paths.TypeScript);assert.match(final,/type Chosen<Fn extends typeof /u);assert.doesNotMatch(final,/typeof map\b/u);assert.match(final,/2n/u);assert.equal(native.rustExecuted,false);assert.equal(native.runtimeParity,false);
});
