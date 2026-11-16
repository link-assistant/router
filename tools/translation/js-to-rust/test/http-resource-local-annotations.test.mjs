// Independent original local/erased-type SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceLocalAnnotationSources} from '../../prepare-http-resource-local-annotation-sources.mjs';
const limits={timeout:60000};
const imports="import {router_integer_u64_saturating_add as add,router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';\n";
const source=imports+`type Counter=ReturnType<typeof add>;
type Signed=ReturnType<typeof signed>;
export function local(){const value:Counter=1n;let count:bigint=0n;count=add(count,value);return count;}
export function inferredSigned(){const value:Signed=1n;return value;}
export function nested(){const value:Signed=(<Signed>(1n as bigint));return value;}
export function boolean(){const value:boolean=(true satisfies boolean);return value;}
export function assertion(){return (1n as Signed);}
export function prefixes(){return <Signed>(1n as bigint);}
export function condition(){if((true as boolean)){return 1n;}else{return 2n;}}
export function nonnull(){const value:boolean=true;return value!;}
export function loop(){let count:Counter=0n;for(let index:Counter=0n;index<2n;index++){count=add(count,1n);}return count;}
export function documented(){/** @type {Counter} */ const value:Counter=(1n);return value;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual typed locals assertions and satisfies retain value checks and native domains through JS comments',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));
 assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.javascript,/@type/u);assert.doesNotMatch(result.javascript,/\bas Signed\b|\bsatisfies\b|<Signed>/u);
 await verifyHttpResourceTargets(result,api=>{for(const [name,expected]of Object.entries({local:1n,inferredSigned:1n,nested:1n,boolean:true,assertion:1n,prefixes:1n,condition:1n,nonnull:true,loop:2n,documented:1n}))assert.equal(api[name](),expected,name);});
 const rows=JSON.parse(result.meta).functions;for(const name of ['inferredSigned','nested','assertion','prefixes'])assert.equal(rows.find(row=>row.name===name).returns,'i64');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('native local and type-wrapper source inverses recheck the entire source and reproduce original syntax',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.equal(result.rustExecuted,false);
});
test('written types casts and docs cannot grant a different domain or unchecked nullable escape',limits,()=>{
 for(const body of [
  'export function bad(){const value:boolean=1n;return value;}',
  'export function bad(){return 1n as boolean;}',
  'export function bad(){return <boolean>1n;}',
  'export function bad(){return true satisfies bigint;}',
  'export function bad(){return 1n as any;}',
  'export function bad(){return 1n as unknown;}',
  'export function bad(){return null!;}',
  'export function bad(){const value:ReturnType<typeof signed>=9223372036854775808n;return value;}',
  'export function bad(){/** @type {boolean} */ const value=1n;return value;}',
  'export function bad(){if(/** @type {bigint} */ (true)){return true;}else{return false;}}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const javascript=imports+'export function bad(){return /** @type {boolean} */ (1n);}';assert.throws(()=>translateHttpResourceCallerJavaScript(javascript,input(javascript,'caller.mjs')));
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='assertion').flow.tail.value.type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete local annotation original sources retain both ordered inverse sequences',limits,()=>{
 const plan=prepareHttpResourceLocalAnnotationSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
