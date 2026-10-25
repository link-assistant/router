// Independent linear generic source. All regression cases remain unrun drafts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceGenericLinearSources} from '../../prepare-http-resource-generic-linear-sources.mjs';
const limits={timeout:60000};
const imports="import {json_macro_string as make} from './runtime/json-macro-runtime.mjs';\nimport {router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';\n";
const source=imports+`export function forward<Value>(input:Value):Value{const first:Value=identity<Value>(input),second=first;return identity(second as Value);}
export function identity<T>(value:T):T{return value;}
export function alias<T>(value:T):T{const next=value;return next;}
export function chain<T>(value:T):T{;let middle=forward(value);return identity(identity(middle));;}
export function asserted<T>(value:T):T{return (value as T)!;}
export function boolean(){return forward(true);}
export function owned(){return chain(make('owned'));}
export function borrowed(input:string){return chain(input);}
export function signedValue(){return chain<ReturnType<typeof signed>>(1n);}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('whole generic forwarding closures retain actual linear moves aliases type slots and borrowed origins',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{const original=Object.freeze({original:true});for(const name of ['forward','identity','alias','chain','asserted']){assert.equal(api[name](original),original);assert.equal(api[name](null),null);}assert.equal(api.boolean(),true);assert.equal(api.owned(),'owned');assert.equal(api.borrowed('é😀'),'é😀');assert.equal(api.signedValue(),1n);});
 const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='forward').flow.steps.length,2);assert.deepEqual(rows.find(row=>row.name==='borrowed').flow.returnRoots,['input']);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('canonical generic native dependency closures preserve actual aliases calls and original token inverses',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.equal(result.rustExecuted,false);
});
test('generic values cannot be duplicated dropped mutated manufactured or passed to an unproved callee',limits,()=>{
 for(const declaration of [
  'function bad<T>(value:T):T{const next=value;return value;}',
  'function bad<T>(value:T):T{const first=value,second=value;return second;}',
  'function bad<T>(value:T):T{const next=value;return identity(value);}',
  'function bad<T>(value:T):T{const next=value;return true as T;}',
  'function bad<T>(value:T):T{identity(value);return value;}',
  'function bad<T>(value:T):T{let next=value;next=value;return next;}',
  'function bad<T>(value:T):T{const next:boolean=value;return next;}',
  'function bad<T>(value:T):T{return identity<boolean>(value);}',
  'function bad<T>(value:T):T{return make(value);}',
  'function bad<T>(value:T):T{return missing(value);}',
  'function bad<T>(value:T):T{const identity=value;return identity;}',
  'function bad<T>(value:T):T{return later(value);} function later<T>(value:T):T{return bad(value);}',
 ]){const value=imports+'function identity<T>(value:T):T{return value;}\n'+declaration;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),declaration);}
 for(const native of [
  'fn bad<T>(value: T) -> T { let next = value; value }\n',
  'fn bad<T>(value: T) -> T { missing(value) }\n',
  'fn bad<T>(value: T) -> T { later(value) }\nfn later<T>(value: T) -> T { bad(value) }\n',
 ])assert.throws(()=>translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'}));
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='forward').flow.steps[1].value.name='input';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('all linear generic original sources retain both ordered rule sequences and complete inverses',limits,()=>{
 const plan=prepareHttpResourceGenericLinearSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
