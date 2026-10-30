// Independent slice input and complete receiving cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {primitiveSliceInput} from '../../extensions/primitive-operator-runtime.mjs';
import {ownedPrimitiveSliceDomain as oldDomain} from '../owned-scalar-slice-contracts.mjs';
import {ownedPrimitiveSliceDomain as domain,ownedPrimitiveSliceElement as element,OWNED_PRIMITIVE_SLICE_RUST_TYPES as rustTypes} from '../owned-wide-primitive-slice-contracts.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {prepareWidePrimitiveSliceSources} from '../../prepare-wide-primitive-slice-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
// Explicit independent extrema: these do not use the compiler's domain table.
const cases=[
 ['u8','RustU8',0n,255n],['i8','RustI8',-128n,127n],
 ['u16','RustU16',0n,65535n],['i16','RustI16',-32768n,32767n],
 ['u32','RustU32',0n,4294967295n],['i32','RustI32',-2147483648n,2147483647n],
 ['u64','RustU64',0n,18446744073709551615n],['i64','RustI64',-9223372036854775808n,9223372036854775807n],
 ['u128','RustU128',0n,340282366920938463463374607431768211455n],['i128','RustI128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n],
];
test('the shared immutable boundary preserves every fixed-width extremum and refuses adjacent values',limits,()=>{
 for(const [name,,minimum,maximum]of cases){for(const array of [[],[minimum],[maximum],[0n,minimum,maximum]]){const input=Object.freeze(array);assert.strictEqual(primitiveSliceInput(input,name),input);}for(const value of [minimum-1n,maximum+1n,0,NaN,undefined,true,'1'])assert.throws(()=>primitiveSliceInput(Object.freeze([value]),name),TypeError,name);}
 const long=Object.freeze(Array(5001).fill(0n));assert.strictEqual(primitiveSliceInput(long,'u8'),long);
});
test('mutable sparse inherited accessor proxy and extra-field carriers refuse without reading getters or coercion',limits,()=>{
 let reads=0,coerced=0,traps=0;const getter=[];Object.defineProperty(getter,'0',{enumerable:true,configurable:true,get(){reads++;return 1n;}});Object.freeze(getter);
 const inherited=Object.freeze(Object.assign(Object.create(Array.prototype),{length:1})),extra=Object.freeze(Object.assign([1n],{extra:true})),symbol=Object.freeze(Object.assign([1n],{[Symbol.iterator]:()=>{reads++;return [1n][Symbol.iterator]();}}));
 for(const input of [[1n],Object.freeze(Array(1)),getter,inherited,extra,symbol,Object.freeze(new BigUint64Array(0))])assert.throws(()=>primitiveSliceInput(input,'u8'));
 const proxy=new Proxy(Object.freeze([1n]),{getOwnPropertyDescriptor(){traps++;throw new Error('must not inspect');},getPrototypeOf(){traps++;throw new Error('must not inspect');}});assert.throws(()=>primitiveSliceInput(proxy,'u8'));assert.equal(traps,0);assert.equal(reads,0);
 assert.throws(()=>primitiveSliceInput(Object.freeze([1n]),{toString(){coerced++;return 'u8';}}));assert.equal(coerced,0);for(const value of ['usize','bool','U8','u8-list-ref','u8\n','i256'])assert.throws(()=>primitiveSliceInput(Object.freeze([]),value));
});
test('the additive domain descriptions retain old roles and qualify only explicit new fixed-width Rust names',limits,()=>{
 for(const [name]of cases){assert.equal(domain(name),name+'-list-ref');assert.equal(element(domain(name)),name);if(!['u64','i64'].includes(name)){assert.equal(oldDomain(name),null);assert.equal(rustTypes[domain(name)],"&'a [::core::primitive::"+name+']');}}
 assert.equal(domain('bool'),'bool-list-ref');assert.equal(oldDomain('bool'),'bool-list-ref');assert.equal(domain('usize'),null);assert.equal(domain(null),null);
});
const source=alias=>`import {json_macro_null as nil,json_macro_array as array} from './runtime/json-macro-runtime.mjs';
import {primitiveSliceInput as input} from './runtime/primitive-operator-runtime.mjs';
/** @param {readonly import('./runtime/primitive-operator-runtime.mjs').${alias}[]} values */
export function hasValue(values){values=input(values,${JSON.stringify(alias.replace('Rust','').toLowerCase())});for(const item of values){if(item!==0n){return nil();}}return array([]);}
`;
function data(text,path='caller.mjs'){const result=ownedStateReceivingData([{path,source:text}]);result.primitiveOperators=true;result.files=result.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());return result;}
function translate(alias){const text=source(alias),input=data(text);return {input,text,result:translateOwnedOutcomeJavaScript(text,{context:createOwnedOutcomeContext(input),sourcePath:'caller.mjs'})};}
async function emitted(t,row){const folder=mkdtempSync(join(tmpdir(),'router-wide-slice-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(folder,path)),{recursive:true});writeFileSync(join(folder,path),value);};for(const file of row.input.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(folder,'out'),join(folder,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.input.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);return {run:(await import(pathToFileURL(join(folder,'out/typed.mjs')).href)).hasValue,original:(await import(pathToFileURL(join(folder,'caller.mjs')).href)).hasValue};}
for(const [name,alias,minimum,maximum]of cases.filter(row=>!['u64','i64'].includes(row[0])))test(name+' complete JS/TS, both interpreters and canonical Rust inverse retain exact shared slice input contracts',limits,async t=>{
 const row=translate(alias),{run,original}=await emitted(t,row),token=await prepareOwnedOutcomeRuntime(row.result.program),nil={$:'Null'},empty={$:'Array',field0:[]},inputs=[Object.freeze([]),Object.freeze([0n]),Object.freeze([maximum]),Object.freeze([minimum,maximum]),Object.freeze(Array(5001).fill(0n))];
 const expected=[empty,empty,nil,nil,empty];for(let index=0;index<inputs.length;index++){assert.deepEqual(original(inputs[index]),expected[index]);assert.deepEqual(run(inputs[index]),expected[index]);assert.deepEqual(evaluateOwnedOutcome(row.result.program,'hasValue',[inputs[index]],token),expected[index]);}assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,inputs.map(value=>['hasValue',[value]]),token),expected);
 for(const bad of [[1n],Object.freeze([maximum+1n]),Object.freeze(Array(1))]){assert.throws(()=>run(bad));assert.throws(()=>evaluateOwnedOutcome(row.result.program,'hasValue',[bad],token));assert.throws(()=>evaluateOwnedOutcomeBatch(row.result.program,[['hasValue',[bad]]],token));}
 assert.match(row.result.typescript,/primitiveSliceInput/u);assert.ok(row.result.rust.includes('[::core::primitive::'+name+']'));assert.match(row.result.rust,/\.iter\(\)\.copied\(\)/u);
 const typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(data(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(row.result.rust,typed.rust));
 const inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext({...row.input,files:[...row.input.files,{path:'caller.rs',source:row.result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(row.result.rust,inverse.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('canonical input-prefix replay requires its original parameter domain binding and complete registered runtime',limits,()=>{
 const row=translate('RustU8');for(const text of [row.result.typescript.replace('"u8"','"i8"'),row.result.typescript.replace('__ro_primitiveSliceInput(values,','__ro_primitiveSliceInput([],')])assert.throws(()=>translateOwnedOutcomeTypeScript(text,{context:createOwnedOutcomeContext(data(text,'caller.mts')),sourcePath:'caller.mts'}));
 const input=data(source('RustU8'));input.primitiveOperators=false;assert.throws(()=>translateOwnedOutcomeJavaScript(source('RustU8'),{context:createOwnedOutcomeContext(input),sourcePath:'caller.mjs'}));
 const absent=source('RustU8').replace('values=input(values,"u8");','');assert.throws(()=>translateOwnedOutcomeJavaScript(absent,{context:createOwnedOutcomeContext(data(absent)),sourcePath:'caller.mjs'}),/written immutable slice input contract/u);
});
test('thirteen complete source equations retain originals, current text, inverses and both phases',limits,()=>{
 const plan=prepareWidePrimitiveSliceSources();assert.equal(plan.files.length,13);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
