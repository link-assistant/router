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
import {preparePrimitiveVectorLiteralReverseSources} from '../../prepare-primitive-vector-literal-reverse-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
// Independent extrema and expected results, not a contract-table oracle.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
async function targets(t,data,result){const directory=mkdtempSync(join(tmpdir(),'router-owned-vector-caller-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const row of data.files.filter(row=>/\.(?:mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];}
function source(domain){const type=domain==='bool'?'boolean':`import('./runtime/primitive-operator-runtime.mjs').Rust${domain[0].toUpperCase()+domain.slice(1)}`;return `import {router_vec_${domain}_literal as literal} from './runtime/primitive-vector-literal-runtime.mjs';
import {router_vec_${domain}_push as push,router_vec_${domain}_len as length,router_vec_${domain}_get as at} from './runtime/primitive-owned-vector-runtime.mjs';
/** @returns {ReturnType<typeof literal>} */
export function empty(){return literal();}
/** @param {Parameters<typeof literal>[0]} value @returns {ReturnType<typeof literal>} */
export function one(value){return literal(value);}
/** @param {${type}} first @param {${type}} second @returns {ReturnType<typeof literal>} */
export function pair(first,second){return literal(first,second);}
/** @param {${type}} first @param {${type}} second @returns {ReturnType<typeof literal>} */
export function nested(first,second){return push(literal(first),second);}
/** @param {${type}} first @param {${type}} second @returns {ReturnType<typeof literal>} */
export function helper(first,second){return pair(first,second);}
/** @param {${type}} first @param {${type}} second @returns {ReturnType<typeof literal>} */
export function rebound(first,second){let values=literal(first);values=push(values,second);return values;}
/** @param {${type}} first @param {${type}} second */
export function count(first,second){const values=literal(first,second);return length(values);}
/** @param {${type}} first @param {${type}} second @param {Parameters<typeof at>[1]} index */
export function read(first,second,index){const values=literal(first,second);return at(values,index);}
/** @param {Parameters<typeof literal>[63]} value @returns {ReturnType<typeof literal>} */
export function sixty_four(value){return literal(${Array(64).fill('value').join(',')});}
`;}
for(const family of ['outcome','cancellation'])for(const [domain,minimum,maximum]of domains)test(family+' '+domain+' literal whole caller both targets interpreters CST and canonical inverse',limits,async t=>{
 const api=family==='outcome'?outcome:cancellation,text=source(domain),data=primitiveVectorLiteralReceivingData(family,text),context=api.createOwnedOutcomeContext(data),result=api.translateOwnedOutcomeJavaScript(text,{context,sourcePath:'caller.mjs'}),token=await api.prepareOwnedOutcomeRuntime(result.program),modules=await targets(t,data,result);
 const calls=[['empty',[]],['one',[minimum]],['pair',[minimum,maximum]],['nested',[minimum,maximum]],['helper',[minimum,maximum]],['rebound',[minimum,maximum]],['count',[minimum,maximum]],['read',[minimum,maximum,0n]],['read',[minimum,maximum,1n]],['read',[minimum,maximum,2n]],['sixty_four',[minimum]]],expected=[[],[minimum],[minimum,maximum],[minimum,maximum],[minimum,maximum],[minimum,maximum],2n,{$:'Some',field0:minimum},{$:'Some',field0:maximum},{$:'None'},Array(64).fill(minimum)];
 for(const module of modules){for(let index=0;index<calls.length;index++)assert.deepEqual(module[calls[index][0]](...calls[index][1]),expected[index]);assert.ok(Object.isFrozen(module.pair(minimum,maximum)));assert.notStrictEqual(module.empty(),module.empty());assert.notStrictEqual(module.one(minimum),module.one(minimum));if(domain==='bool')assert.throws(()=>module.one(1));else assert.throws(()=>module.one(maximum+1n));}
 for(let index=0;index<calls.length;index++)assert.deepEqual(api.evaluateOwnedOutcome(result.program,...calls[index],token),expected[index]);assert.deepEqual(api.evaluateOwnedOutcomeBatch(result.program,calls,token),expected);
 const reissued=api.readOwnedOutcomeMeta(result.meta,{context});assert.equal(api.emitOwnedOutcomeRust(reissued),result.rust);assert.equal(api.translateOwnedOutcomeConcreteSyntaxMeta(result.concreteSyntax.meta,{context,sourcePath:'caller.mjs'}).rust,result.rust);
 const typed=api.translateOwnedOutcomeTypeScript(result.typescript,{context:api.createOwnedOutcomeContext(primitiveVectorLiteralReceivingData(family,result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,result.rust));assert.match(result.rust,/translation_primitive_vectors_core::vec_[a-z0-9]+_from_slice\(&\[/u);
 const inverse=(family==='outcome'?translateOwnedOutcomeRust:translateOwnedCancellationRust)(result.rust,{context:api.createOwnedOutcomeContext({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,result.rust);assert.match(inverse.javascript,/primitive-vector-literal-runtime/u);assert.equal(inverse.wholeRouterSynchronization,false);assert.equal(result.runtimeParity,false);
});
for(const family of ['outcome','cancellation'])test(family+' literal source bounds, real imports, widths, moves and complete paired files remain required',limits,()=>{
 const api=family==='outcome'?outcome:cancellation,base=source('u8'),header=base.slice(0,base.indexOf('/**')),doc="/** @param {import('./runtime/primitive-operator-runtime.mjs').RustU8} value */\n",run=text=>api.translateOwnedOutcomeJavaScript(text,{context:api.createOwnedOutcomeContext(primitiveVectorLiteralReceivingData(family,text)),sourcePath:'caller.mjs'});
 for(const body of ['return literal('+Array(65).fill('value').join(',')+');','return literal(...[value]);','return literal(true);','return literal([value]);','return literal(256n);','const values=literal(value);const moved=push(values,value);return length(values);','return literal.call(null,value);'])assert.throws(()=>run(header+doc+'export function rejected(value){'+body+'}'));
 assert.throws(()=>run(header+doc+'export function rejected(value){const literal=x=>x;return literal(value);}'));
 assert.throws(()=>run(header+"/** @param {import('./runtime/primitive-operator-runtime.mjs').RustI8} value */\nexport function rejected(value){return literal(value);}"));
 for(const name of ['primitive-vector-literal-runtime.mjs','primitive-vector-literal-runtime.d.mts','primitive-owned-vector-runtime.mjs','primitive-owned-vector-runtime.d.mts','primitive-sequence-runtime.mjs','primitive-operator-runtime.d.mts']){const data=primitiveVectorLiteralReceivingData(family,base),row=data.files.find(row=>row.path==='runtime/'+name);row.source+='\n// source changed\n';assert.throws(()=>api.translateOwnedOutcomeJavaScript(base,{context:api.createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
 for(const name of ['primitive-vector-literal-runtime.mjs','primitive-vector-literal-runtime.d.mts']){const data=primitiveVectorLiteralReceivingData(family,base);data.files=data.files.filter(row=>row.path!=='runtime/'+name);assert.throws(()=>api.translateOwnedOutcomeJavaScript(base,{context:api.createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
});
test('literal runtime providers retain all four pairs without changing original providers',limits,()=>{for(const [runtimeRoot,declarationRoot]of [['runtime','runtime'],['app/runtime','typed/runtime'],['runtime','runtime/types']]){const rows=primitiveVectorLiteralRuntimeSources(runtimeRoot,declarationRoot);assert.equal(rows.length,runtimeRoot===declarationRoot?8:16);assert.equal(new Set(rows.map(row=>row.path)).size,rows.length);for(const prefix of new Set([runtimeRoot,declarationRoot]))for(const name of ['primitive-vector-literal-runtime.mjs','primitive-vector-literal-runtime.d.mts','primitive-owned-vector-runtime.mjs','primitive-owned-vector-runtime.d.mts','primitive-sequence-runtime.mjs','primitive-sequence-runtime.d.mts','primitive-operator-runtime.mjs','primitive-operator-runtime.d.mts'])assert.ok(rows.some(row=>row.path===prefix+'/'+name));}});
test('twelve complete reverse source equations preserve physical sources, two phases and exact inverses',limits,()=>{const plan=preparePrimitiveVectorLiteralReverseSources();assert.equal(plan.files.length,12);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
