// Independent physical original-control synchronization SOURCE, all unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {httpResourceOptionCallbackUnitFixture as fixture} from './http-resource-option-callback-unit-data.mjs';
const limits={timeout:60000};
test('native original early returns and typed state become checked paired source through the physical unit path',limits,async t=>{
 const api=fixture(t);api.write(api.unit.paths.JavaScript,'/** @param {boolean} input */\nexport function chosen(input){return input;}\n');api.apply(api.plan());api.commit();
 const native='pub fn chosen(input: bool) -> bool { let mut value: bool = false; if input { value = true; } return value; }\n';api.write(api.unit.paths.Rust,native);const plan=api.plan();assert.equal(plan.units[0].authority,'Rust');api.apply(plan);assert.equal(api.read(api.unit.paths.Rust),native);assert.match(api.read(api.unit.paths.JavaScript),/router_shadow_/u);assert.match(api.read(api.unit.paths.TypeScript),/boolean/u);const caller=await import(pathToFileURL(join(api.root,api.unit.paths.JavaScript)));assert.equal(caller.chosen(true),true);assert.equal(caller.chosen(false),false);assert.equal(plan.rustExecuted,false);assert.equal(plan.runtimeParity,false);
});
