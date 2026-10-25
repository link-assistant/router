// Independent executable generic-identity SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceGenericIdentitySources} from '../../prepare-http-resource-generic-identity-sources.mjs';
import {projectHttpResourceUnitJavaScript} from '../../http-resource-unit-signatures.mjs';
const limits={timeout:60000};
const imports=`import {json_macro_string as make} from './runtime/json-macro-runtime.mjs';
import {router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';
`;
const source=imports+`export function identity<T>(value:T):T{return value;}
export function boolean(){return identity(true);}
export function integer(){return identity(3n);}
export function text(){return identity('é😀');}
export function owned(){return identity(make('owned'));}
export function list(){const value=make('owned');return identity([value]);}
export function borrowed(input:string){return identity(input);}
export function signedValue():ReturnType<typeof signed>{return identity(1n);}
export function signedLocal(){const value:ReturnType<typeof signed>=identity(1n);return value;}
export function nested(){return identity(identity(false));}
`;
function input(value,sourcePath='caller.mts',receiving=httpResourceReceivingData){return {sourcePath,...receiving([{path:sourcePath,source:value}])};}
test('actual unconstrained identity source preserves scalar owned container and borrowed roots at concrete calls',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.rust,/fn identity<T>\(value: T\) -> T \{ value \}/u);
 await verifyHttpResourceTargets(result,api=>{assert.equal(api.identity(true),true);const original=Object.freeze({unchanged:true});assert.equal(api.identity(original),original);assert.equal(api.boolean(),true);assert.equal(api.integer(),3n);assert.equal(api.text(),'é😀');assert.equal(api.owned(),'owned');assert.deepEqual(api.list(),['owned']);assert.equal(api.borrowed('é😀'),'é😀');assert.equal(api.signedValue(),1n);assert.equal(api.signedLocal(),1n);assert.equal(api.nested(),false);});
 const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='identity').kind,'http-resource-generic-identity-function');assert.deepEqual(rows.find(row=>row.name==='borrowed').flow.returnRoots,['input']);assert.equal(rows.find(row=>row.name==='signedValue').returns,'i64');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('canonical generic native signatures and all complete concrete calls reproduce original source syntax',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source));for(const native of [translated.rust,'pub fn identity<Value>(input: Value) -> Value { input }\n']){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));assert.equal(result.rustExecuted,false);}
});
test('actual generic identities specialize genuine equal scalar callback contracts',limits,()=>{
 const value=imports+`import {router_option_u64_some as some} from './runtime/primitive-option-runtime.mjs';
import {router_option_callback_u64_to_u64_map as map} from './runtime/primitive-option-callback-runtime.mjs';
function identity<T>(value:T):T{return value;}
export function mapped(){return map(some(3n),identity);}
`;
 const result=translateHttpResourceCallerTypeScript(value,input(value,'caller.mts',httpResourceOptionCallbackReceivingData)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs',httpResourceOptionCallbackReceivingData));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.rustExecuted,false);
});
test('generic syntax metadata and annotations cannot replace the exact complete unchanged-input theorem',limits,()=>{
 for(const declaration of [
  'function identity<T>(value:T):T{return true;}',
  'function identity<T>(value:T):T{const alias=value;return alias;}',
  'function identity<T>(value:T):T{return identity(value);}',
  'function identity<T,U>(value:T):T{return value;}',
  'function identity<T extends boolean>(value:T):T{return value;}',
  'function identity<T=boolean>(value:T):T{return value;}',
  'function identity<T>(value:T):boolean{return value;}',
  'function identity<T>(value:boolean):T{return value;}',
  'function identity<T>(value:T,other:T):T{return value;}',
 ]){const value=imports+declaration+'\nexport function used(){return identity(true);}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),declaration);}
 for(const body of [
  'export function bad(){const value=make("x");const moved=identity(value);return [value,moved];}',
  'export function bad(){return identity<boolean,bigint>(true);}',
 ]){const value=imports+'function identity<T>(value:T):T{return value;}\n'+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const forged=imports+'/** @template T @param {T} value @returns {T} */ function identity(value){return true;}';assert.throws(()=>translateHttpResourceCallerJavaScript(forged,input(forged,'caller.mjs')));
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='identity').genericIdentity.parameter='other';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('all complete generic source originals retain ordered language/repository inverses',limits,()=>{
 const plan=prepareHttpResourceGenericIdentitySources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

test('physical unit generic signature proposals retain original JS and freshly reject changed bodies',limits,()=>{
 const javascript='export function identity(value){return value;}\n',typescript='export function identity<T>(value:T):T{return value;}\n',unit={paths:{JavaScript:'caller.mjs',TypeScript:'caller.mts'},runtimes:{JavaScript:'runtime',TypeScript:'runtime'}},options=httpResourceReceivingData([{path:'caller.mjs',source:javascript},{path:'caller.mts',source:typescript}]);
 const proposal=projectHttpResourceUnitJavaScript(javascript,{unit,current:{TypeScript:typescript},options});assert.equal(proposal.history.original,javascript);assert.match(proposal.source,/@template T/u);
 const result=translateHttpResourceCallerJavaScript(proposal.source,input(proposal.source,'caller.mjs'));assert.equal(JSON.parse(result.meta).functions[0].kind,'http-resource-generic-identity-function');
 const changed=javascript.replace('return value','return true'),stale=projectHttpResourceUnitJavaScript(changed,{unit,current:{TypeScript:typescript},options});assert.throws(()=>translateHttpResourceCallerJavaScript(stale.source,input(stale.source,'caller.mjs')));
});
