// Physical source transactions for lexical native edits. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {httpResourceOptionCallbackUnitFixture as fixture} from './http-resource-option-callback-unit-data.mjs';
const limits={timeout:60000};
const javascript='/** @param {boolean} input */\nexport function chosen(input){return input;}\n';
test('original native shadowing synchronizes checked JS and TS while retaining native original source',limits,t=>{
 const api=fixture(t);api.write(api.unit.paths.JavaScript,javascript);api.apply(api.plan());api.commit();
 const initialTypeScript=api.read(api.unit.paths.TypeScript);assert.match(initialTypeScript,/input: boolean/u);api.write(api.unit.paths.TypeScript,'type Flag = boolean;\n'+initialTypeScript.replace('input: boolean','input: Flag'));api.apply(api.plan());api.commit();
 const native='pub fn chosen(input: bool) -> bool { let input: bool = (!input); input }\n';api.write(api.unit.paths.Rust,native);const plan=api.plan();assert.equal(plan.units[0].authority,'Rust');api.apply(plan);assert.equal(api.read(api.unit.paths.Rust),native);assert.match(api.read(api.unit.paths.JavaScript),/router_shadow_/u);assert.match(api.read(api.unit.paths.TypeScript),/router_shadow_/u);api.commit();
 const currentJavaScript=api.read(api.unit.paths.JavaScript);assert.match(currentJavaScript,/!input/u);api.write(api.unit.paths.JavaScript,currentJavaScript.replace('!input','!!input'));const next=api.plan();assert.equal(next.units[0].authority,'JavaScript');api.apply(next);api.commit();const currentTypeScript=api.read(api.unit.paths.TypeScript);assert.match(currentTypeScript,/!!input/u);api.write(api.unit.paths.TypeScript,currentTypeScript.replace('!!input','!!!input'));const typed=api.plan();assert.equal(typed.units[0].authority,'TypeScript');api.apply(typed);assert.equal(next.rustExecuted,false);assert.equal(next.runtimeParity,false);
});
test('fresh binding plans reject forged output and original native changes before installation',limits,t=>{
 const api=fixture(t);api.write(api.unit.paths.JavaScript,javascript);api.apply(api.plan());api.commit();api.write(api.unit.paths.Rust,'pub fn chosen(input: bool) -> bool { let input = (!input); input }\n');const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.path===api.unit.paths.JavaScript).after+='\n// forged\n';assert.throws(()=>api.apply(forged),/fresh source translation/u);api.write(api.unit.paths.Rust,api.read(api.unit.paths.Rust)+'\n// later\n');assert.throws(()=>api.apply(plan));
});
