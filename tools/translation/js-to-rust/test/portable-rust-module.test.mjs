// Independent source-only cases. Rust compiler and all test execution deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translatePortableModuleProject} from '../module-project.mjs';
import {translatePortableRust} from '../portable-rust.mjs';
import {portableRustModuleEnvelope} from '../portable-rust-module.mjs';
import {preparePortableRustModuleInverse} from '../../prepare-portable-rust-module-inverse.mjs';
import {prepareRustSyntaxCells} from '../../prepare-rust-syntax-cells.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};
function input(){return {entry:'index.mjs',language:'JavaScript',modules:[{path:'index.mjs',source:'export {twice as run,twice as again} from "./helper.mjs";'},{path:'helper.mjs',source:'/** @param {number} value @returns {number} */ export function twice(value){return value*2;} /** @returns {number} */ export function privateValue(){return 13;}'}]};}
test('complete Rust module returns through checked meta to the same public JS and strict TS aliases',limits,async()=>{
 const forward=translatePortableModuleProject(input()),result=translatePortableRust(forward.rust);
 assert.equal(result.rust,forward.rust);assert.equal(result.portableRustModuleHistory.equations[0].inverse,forward.rust);assert.equal(result.portableRustModuleHistory.envelope.types.length,0);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.deepEqual(Object.keys(module).sort(),['again','run']);assert.equal(module.run,module.again);for(const value of [0,1,-2,0.5])assert.equal(module.run(value),value*2);},{childTimeoutMs:20_000});
});
test('an actual Rust body edit reaches both alias bindings without original JavaScript behavior authority',limits,async()=>{
 const forward=translatePortableModuleProject(input()),changed=forward.rust.replace('* 2.0','* 3.0');assert.notEqual(changed,forward.rust);
 const result=translatePortableRust(changed);await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.run,module.again);assert.equal(module.run(4),12);assert.equal(module.again(-2),-6);},{childTimeoutMs:20_000});
});
test('unused closed public absence aliases retain complete original helper declarations on reverse emission',limits,async()=>{
 const forward=translatePortableModuleProject({entry:'index.ts',language:'TypeScript',modules:[{path:'index.ts',source:'export type MaybeCount=number|undefined; export type Label=string; export function count():number{return 3;}'}]}),result=translatePortableRust(forward.rust);
 assert.match(result.rust,/pub type MaybeCount = JsOptional<f64>;/);assert.match(result.typescript,/type MaybeCount = number\|undefined;/);assert.equal(result.portableRustModuleHistory.envelope.types.length,2);assert.equal(result.rust,forward.rust);
 await verifyTypedTargets(result,(_api,_result,module)=>assert.equal(module.count(),3),{childTimeoutMs:20_000});
});
test('outer module additions altered helpers missing owners and unrelated type APIs remain refused',limits,()=>{
 const rust=translatePortableModuleProject(input()).rust;
 for(const source of [rust+'pub fn unrelated()->f64{1.0}\n',rust.replace(/::router_module_value[0-9]+ as run/u,'::missing as run'),rust.replace('mod __router_portable_project','pub mod __router_portable_project'),rust+'pub type Unknown=Vec<u8>;\n']){assert.notEqual(source,rust);assert.throws(()=>translatePortableRust(source));}
 assert.equal(portableRustModuleEnvelope('#[rustfmt::skip]\npub fn answer() -> f64 { return 3.0; }'),null);
});
test('complete source-copy layers compose without rewinding later module source',limits,()=>{
 const plan=preparePortableRustModuleInverse(),row=plan.files[0];assert.equal(plan.files.length,1);assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 const parent=prepareRustSyntaxCells().files.find(value=>value.path===row.path);assert.equal(parent.currentAfter,row.after);assert.equal(parent.laterHistories[0].before,parent.after);
});
