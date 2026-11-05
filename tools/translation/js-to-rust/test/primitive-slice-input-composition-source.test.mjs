// Independent complete mixed-input and resource-order source cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
import {ROUTER_CORE_BASE64_SOURCE} from '../../router-core-source-data.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {createOwnedCancellationContext,ownedCancellationRuntimeSources,translateOwnedCancellationJavaScript,translateOwnedCancellationTypeScript,prepareOwnedCancellationRuntime,evaluateOwnedCancellation,evaluateOwnedCancellationBatch} from '../owned-cancellation.mjs';
import {translateOwnedCancellationRust} from '../owned-cancellation-rust.mjs';
import {proposeOwnedWideSliceInputBoundaries} from '../owned-wide-slice-input-proposals.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const families={
 outcome:{data:ownedStateReceivingData,create:createOwnedOutcomeContext,assets:ownedOutcomeRuntimeSources,javascript:translateOwnedOutcomeJavaScript,typescript:translateOwnedOutcomeTypeScript,rust:translateOwnedOutcomeRust,prepare:prepareOwnedOutcomeRuntime,evaluate:evaluateOwnedOutcome,batch:evaluateOwnedOutcomeBatch},
 cancellation:{data:ownedCancellationReceivingData,create:createOwnedCancellationContext,assets:ownedCancellationRuntimeSources,javascript:translateOwnedCancellationJavaScript,typescript:translateOwnedCancellationTypeScript,rust:translateOwnedCancellationRust,prepare:prepareOwnedCancellationRuntime,evaluate:evaluateOwnedCancellation,batch:evaluateOwnedCancellationBatch},
};
const header=`import {base64ResultInput as encodedInput} from './runtime/base64-runtime.mjs';
import {primitiveSliceInput as sliceInput} from './runtime/primitive-operator-runtime.mjs';
`;
const source=header+`/** @param {readonly import('./runtime/primitive-operator-runtime.mjs').RustI8[]} values
 * @param {import('./runtime/base64-runtime.mjs').Base64Result} encoded */
export function hasAny(values,encoded){encoded=encodedInput(encoded);values=sliceInput(values,"i8");for(const item of values){if(item!==0n){return true;}}return false;}
`;
const encoded=Object.freeze({$:'Ok',field0:Object.freeze([0n,255n])});
function input(family,text=source,path='caller.mjs'){const selected=families[family],data=selected.data([{path,source:text}]);data.primitiveOperators=true;data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(selected.assets());if(!data.files.some(row=>row.path==='src/translation_core/base64.rs'))data.files.push({path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE});data.files=withCompletePrimitiveRuntimeSources(data.files);return data;}
async function targets(t,data,result){const directory=mkdtempSync(join(tmpdir(),'router-slice-composition-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const file of data.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of data.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];}
for(const family of ['outcome','cancellation'])test(family+' complete mixed Base64/slice inputs retain canonical order through JS TS interpreters and Rust inverse',limits,async t=>{
 const selected=families[family],data=input(family),result=selected.javascript(source,{context:selected.create(data),sourcePath:'caller.mjs'}),apis=await targets(t,data,result),token=await selected.prepare(result.program),values=[Object.freeze([]),Object.freeze([0n]),Object.freeze([-128n,127n]),Object.freeze(Array(5001).fill(0n))],expected=[false,false,true,false];
 for(const api of apis)for(let index=0;index<values.length;index++)assert.equal(api.hasAny(values[index],encoded),expected[index]);for(let index=0;index<values.length;index++)assert.equal(selected.evaluate(result.program,'hasAny',[values[index],encoded],token),expected[index]);assert.deepEqual(selected.batch(result.program,values.map(value=>['hasAny',[value,encoded]]),token),expected);
 for(const api of apis){assert.throws(()=>api.hasAny([1n],encoded),/slice|Frozen/u);assert.throws(()=>api.hasAny(Object.freeze([128n]),encoded),/domain/u);assert.throws(()=>api.hasAny([1n],null),/Base64|base64/u);}assert.throws(()=>selected.evaluate(result.program,'hasAny',[[1n],null],token),/Base64|base64/u);
 const base64At=result.typescript.indexOf('encoded = __ro_base64ResultInput(encoded);'),sliceAt=result.typescript.indexOf('values = __ro_primitiveSliceInput(values, "i8");');assert.ok(base64At>=0&&sliceAt>base64At);
 const typed=selected.typescript(result.typescript,{context:selected.create(input(family,result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const inverse=selected.rust(result.rust,{context:selected.create({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,result.rust);
 const missing=source.replace('values=sliceInput(values,"i8");',''),proposal=proposeOwnedWideSliceInputBoundaries(input(family,missing),{family,sourcePath:'caller.mjs'});assert.equal(proposal.addedGuards,1);assert.ok(proposal.files[0].after.indexOf('encoded=encodedInput(encoded);')<proposal.files[0].after.indexOf('values = __ro_primitiveSliceInput(values, "i8");'));assert.equal(proposal.inputEnvelopeChanged,true);assert.equal(proposal.sourceInstalled,false);
});
const cancelledSource=header+`import {router_cancel_new as created,router_cancel_set as signal,router_cancel_is_set as observed} from './runtime/async-control-runtime.mjs';
export function make(){return created();}
/** @param {Parameters<typeof observed>[0]} resource */
export function isSet(resource){return observed(resource);}
/** @param {readonly import('./runtime/primitive-operator-runtime.mjs').RustU8[]} values
 * @param {Parameters<typeof signal>[0]} resource */
export function signalAny(values,resource){values=sliceInput(values,"u8");for(const item of values){if(item!==0n){return signal(resource);}}return false;}
`;
test('invalid shared slice inputs cannot signal a live resource before boundary validation in either target or interpreter',limits,async t=>{
 const selected=families.cancellation,data=input('cancellation',cancelledSource),result=selected.javascript(cancelledSource,{context:selected.create(data),sourcePath:'caller.mjs'}),apis=await targets(t,data,result),token=await selected.prepare(result.program);
 for(const api of apis){const resource=api.make();for(const bad of [[1n],Object.freeze([256n]),Object.freeze(Array(1))]){assert.throws(()=>api.signalAny(bad,resource));assert.equal(api.isSet(resource),false);}assert.equal(api.signalAny(Object.freeze([0n]),resource),false);assert.equal(api.isSet(resource),false);assert.equal(api.signalAny(Object.freeze([0n,1n]),resource),true);assert.equal(api.isSet(resource),true);assert.equal(api.signalAny(Object.freeze([1n]),resource),false);}
 const resource=selected.evaluate(result.program,'make',[],token);for(const bad of [[1n],Object.freeze([256n]),Object.freeze(Array(1))]){assert.throws(()=>selected.evaluate(result.program,'signalAny',[bad,resource],token));assert.equal(selected.evaluate(result.program,'isSet',[resource],token),false);}assert.equal(selected.evaluate(result.program,'signalAny',[Object.freeze([1n]),resource],token),true);assert.equal(selected.evaluate(result.program,'isSet',[resource],token),true);
 const inverse=selected.rust(result.rust,{context:selected.create({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));
});

import {withCompletePrimitiveRuntimeSources} from './complete-primitive-runtime-fixture.mjs';
