// Independent default/control-flow source only. Verification remains deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateTypeScript} from '../typed-portable.mjs';
import {translatePortableRust,UnsupportedPortableRustSource} from '../portable-rust.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};
test('actual Rust Option/unwrap_or defaults and Some/None call operands roundtrip through checked meta',limits,async()=>{
 const original=translateTypeScript('export function amount(value:number=3):number{return value*2;} export function omitted():number{return amount();} export function explicit():number{return amount(undefined);} export function supplied():number{return amount(4);}'),result=translatePortableRust(original.rust);
 assert.equal(result.portableRustSourceHistory.equation.inverse,original.rust);assert.ok(result.program.find(row=>row.name==='amount').params[0].default);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.amount(),6);assert.equal(module.amount(undefined),6);assert.equal(module.amount(0),0);assert.ok(Object.is(module.amount(-0),-0));assert.equal(module.omitted(),6);assert.equal(module.explicit(),6);assert.equal(module.supplied(),8);},{childTimeoutMs:20_000});
});
test('scalar string boolean and signed-zero defaults preserve actual initializers in the Rust inverse',limits,async()=>{
 const original=translateTypeScript('export function text(value:string="λ😀"):string{return value;} export function flag(value:boolean=false):boolean{return value;} export function zero(value:number=-0):number{return value;}'),result=translatePortableRust(original.rust);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.text(),'λ😀');assert.equal(module.text(''),'');assert.equal(module.flag(),false);assert.equal(module.flag(true),true);assert.ok(Object.is(module.zero(),-0));assert.ok(Object.is(module.zero(0),0));},{childTimeoutMs:20_000});
});
test('canonical mutable scalar locals while loops and assignments preserve their checked control flow',limits,async()=>{
 const original=translateTypeScript('export function sum(limit:number):number{let index=0;let total=0;while(index<limit){total=total+index;index=index+1;}return total;}'),result=translatePortableRust(original.rust);
 assert.equal(result.portableRustSourceHistory.equation.inverse,original.rust);
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const [value,wanted]of [[0,0],[1,0],[2,1],[4,6],[10,45],[NaN,0]])assert.equal(module.sum(value),wanted);},{childTimeoutMs:20_000});
});
test('unrelated Option bodies effectful defaults and mutation syntax cannot borrow the canonical default contract',limits,()=>{
 const original=translateTypeScript('export function amount(value:number=3):number{return value*2;}').rust;
 for(const source of [original.replace('unwrap_or(3.0)','unwrap_or_else(|| 3.0)'),original.replace('let value = value.unwrap_or(3.0);','let other = value.unwrap_or(3.0);'),original.replace('Option<f64>','Option<bool>')]){assert.notEqual(source,original);assert.throws(()=>translatePortableRust(source),UnsupportedPortableRustSource);}
});
