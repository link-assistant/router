// Independent whole-caller JS/TS/meta/move/loan cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {translateOwnedCancellationRust} from '../owned-cancellation-rust.mjs';
import * as outcome from '../owned-outcome.mjs';
import * as cancellation from '../owned-cancellation.mjs';
import {primitiveVectorLiteralReceivingData} from './primitive-vector-literal-receiving-data.mjs';
import {primitiveVectorLiteralRuntimeSources} from '../../primitive-vector-literal-runtime-sources.mjs';
import {preparePrimitiveVectorLocalBorrowSources} from '../../prepare-primitive-vector-local-borrows-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
// Independent extrema and expected results, not a contract-table oracle.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
async function targets(t,data,result){const directory=mkdtempSync(join(tmpdir(),'router-owned-vector-caller-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const row of data.files.filter(row=>/\.(?:mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];}
function source(domain){const scalar=domain==='bool'?'boolean':"import('./runtime/primitive-operator-runtime.mjs').Rust"+domain[0].toUpperCase()+domain.slice(1);return `import {router_vec_${domain}_literal as literal} from './runtime/primitive-vector-literal-runtime.mjs';
import {router_vec_${domain}_len as length,router_vec_${domain}_get as at,router_vec_${domain}_push as push,router_vec_${domain}_truncate as truncate} from './runtime/primitive-owned-vector-runtime.mjs';
/** @param {Parameters<typeof length>[0]} input */
export function helperCount(input){const checked=length(input);return length(input);}
/** @param {Parameters<typeof length>[0]} input */
export function helperFirst(input){const checked=length(input);return at(input,0n);}
/** @param {Parameters<typeof length>[0]} left @param {Parameters<typeof length>[0]} right */
export function pairCount(left,right){const firstChecked=length(left);const secondChecked=length(right);return length(left)+length(right);}
/** @param {${scalar}} value @returns {ReturnType<typeof literal>} */
export function afterBorrow(value){const values=literal(value);const first=helperCount(values);const second=pairCount(values,values);const element=helperFirst(values);return push(values,value);}
/** @param {${scalar}} value */
export function copyFromBorrow(value){const values=literal(value);return helperFirst(values);}
/** @param {${scalar}} value */
export function temporary(value){return helperCount(literal(value));}
/** @param {Parameters<typeof length>[0]} input */
export function delegated(input){const checked=length(input);return pairCount(input,input);}
/** @param {ReturnType<typeof literal>} input */
export function consume(input){const values=truncate(input,18446744073709551615n);return length(values);}
/** @param {Parameters<typeof length>[0]} input @param {Parameters<typeof at>[1]} index */
export function readWithIndex(input,index){const checked=length(input);return at(input,index);}
`;}
for(const family of ['outcome','cancellation'])for(const [domain,minimum,maximum]of domains)test(family+' '+domain+' owned-to-shared ordinary helpers keep call-duration loans through both target and inverse lanes',limits,async t=>{
 const api=family==='outcome'?outcome:cancellation,text=source(domain),data=primitiveVectorLiteralReceivingData(family,text),context=api.createOwnedOutcomeContext(data),result=api.translateOwnedOutcomeJavaScript(text,{context,sourcePath:'caller.mjs'}),token=await api.prepareOwnedOutcomeRuntime(result.program),modules=await targets(t,data,result);
 for(const value of [minimum,maximum]){const input=Object.freeze([minimum,maximum]),calls=[['afterBorrow',[value]],['copyFromBorrow',[value]],['temporary',[value]],['delegated',[input]],['pairCount',[input,input]]],expected=[[value,value],{$:'Some',field0:value},1n,4n,4n];for(const module of modules)for(let index=0;index<calls.length;index++)assert.deepEqual(module[calls[index][0]](...calls[index][1]),expected[index]);for(let index=0;index<calls.length;index++)assert.deepEqual(api.evaluateOwnedOutcome(result.program,...calls[index],token),expected[index]);assert.deepEqual(api.evaluateOwnedOutcomeBatch(result.program,calls,token),expected);}
 assert.match(result.rust,/helper_count\(&\(/u);assert.match(result.rust,/pair_count\(&\([^)]*\), &\(/u);assert.equal(result.runtimeParity,false);assert.equal(api.translateOwnedOutcomeConcreteSyntaxMeta(result.concreteSyntax.meta,{context,sourcePath:'caller.mjs'}).rust,result.rust);assert.equal(api.emitOwnedOutcomeRust(api.readOwnedOutcomeMeta(result.meta,{context})),result.rust);
 const typed=api.translateOwnedOutcomeTypeScript(result.typescript,{context:api.createOwnedOutcomeContext(primitiveVectorLiteralReceivingData(family,result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,result.rust));const inverse=(family==='outcome'?translateOwnedOutcomeRust:translateOwnedCancellationRust)(result.rust,{context:api.createOwnedOutcomeContext({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,result.rust);assert.equal(inverse.wholeRouterSynchronization,false);
});
for(const family of ['outcome','cancellation'])test(family+' shared helper calls cannot hide a moved or later-consumed borrowed root',limits,()=>{
 const api=family==='outcome'?outcome:cancellation,base=source('u8'),doc="/** @param {import('./runtime/primitive-operator-runtime.mjs').RustU8} value */\n",run=body=>{const text=base+doc+'export function bad(value){'+body+'}';return api.translateOwnedOutcomeJavaScript(text,{context:api.createOwnedOutcomeContext(primitiveVectorLiteralReceivingData(family,text)),sourcePath:'caller.mjs'});};
 for(const body of [
  'const values=literal(value);return readWithIndex(values,consume(values));',
  'const values=literal(value);return readWithIndex(values,length(push(values,value)));',
  'const values=literal(value);const moved=push(values,value);return helperCount(values);',
  'const values=literal(value);const moved=values;return pairCount(values,moved);',
 ])assert.throws(()=>run(body));
 const wrong=base.replace('export function helperCount(input){const checked=length(input);return length(input);}', 'export function helperCount(input){return length(input);}');assert.throws(()=>api.translateOwnedOutcomeJavaScript(wrong,{context:api.createOwnedOutcomeContext(primitiveVectorLiteralReceivingData(family,wrong)),sourcePath:'caller.mjs'}));
});
test('six complete helper borrow source equations retain original APIs full sources and both phase inverses',limits,()=>{const plan=preparePrimitiveVectorLocalBorrowSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
