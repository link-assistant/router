// Install with both reader successors and all five API copies. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {translateOwnedOrderedScalarHelperSource20261104 as translate,readOwnedOrderedScalarHelperMeta20261104 as read} from '../owned-ordered-scalar-helper-profile-20261104.mjs';
import {translateOwnedOrderedScalarHelperRust20261104 as inverse} from '../owned-ordered-scalar-helper-rust-20261104.mjs';
import {translateOwnedCopyScalarHelperSource20261103 as legacy} from '../owned-copy-scalar-helper-profile-20261103.mjs';
const u8='import("./runtime/primitive-operator-runtime.mjs").RustU8';
const doc=(params,ret)=>'/** '+params.map(([name,type])=>'@param {'+type+'} '+name).join(' ')+' @returns {'+ret+'} */\n';
const pair=[['left',u8],['right',u8]],division='integerArithmetic(left,right,8,false,"div")';
async function fixture(variant,caller,helper,paired=false){
 const prefix='owned-'+(variant==='core'?'core':'vector-candidate'),syntax=await import('../'+prefix+'-source.mjs'),operations=await import('../'+prefix+'-operations.mjs');
 const typed=caller.replace('function caller(left,right)','function caller(left:'+u8+',right:'+u8+'):'+u8),original=ownedStateReceivingData([{path:'caller.mjs',source:caller},{path:'helpers.mjs',source:helper},...(paired?[{path:'caller.mts',source:typed}]:[])]),assets=new Map([...syntax.ownedCoreRuntimeSources(),...syntax.ownedPrimitiveOperatorRuntimeSources()].map(row=>[row.path,row]));
 const input={...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat([...assets.values()]),primitiveOperators:true,...(variant==='vector'?{vectorBindings:[]}: {})};
 const result=translate(caller,{variant,sourcePath:'caller.mjs',input}),program=read(result.meta,variant),token=await operations.prepareOwnedCoreRuntime(program);return {syntax,operations,input,result,program,token,typed};
}
for(const variant of ['core','vector'])for(const paired of [false,true])test(variant+' unused helper division remains eager through fresh meta; paired='+paired,{timeout:900000},async()=>{
 const helper='import {integerArithmetic} from "./runtime/primitive-operator-runtime.mjs";\n'+doc(pair,u8)+'export function keep(left,right){const unused='+division+';return 7n;}',caller='import {keep} from "./helpers.mjs";\n'+doc(pair,u8)+'export function caller(left,right){return keep(left,right);}',{operations,input,result,program,token}=await fixture(variant,caller,helper,paired);
 assert.throws(()=>operations.evaluateOwnedCoreProgram(program,'caller',[1n,0n],token),RangeError);assert.equal(operations.evaluateOwnedCoreProgram(program,'caller',[1n,1n],token),7n);assert.equal(program[0].copyHelperCalls[0].declaration.source,helper);assert.equal(program[0].hostCalls[0].source.path,'helpers.mjs');assert.match(result.typescript,/RustU8/);
 const restored=inverse(result.rust,{variant,sourcePath:'caller.rs',javascriptPath:'caller.mjs',input:{...input,files:input.files.concat([{path:'caller.rs',source:result.rust}])}});assert.equal(restored.helperNetworkRestored,true);assert.equal(restored.javascript,caller);assert.equal(restored.runtimeParity,false);assert.equal(restored.rustExecuted,false);
 assert.throws(()=>legacy(caller,{variant,sourcePath:'caller.mjs',input}),TypeError);
});
for(const variant of ['core','vector'])test(variant+' discarded helper arguments preserve the first native failure',{timeout:900000},async()=>{
 const helper=doc(pair,u8)+'export function keep(left,right){return 7n;}',caller='import {keep} from "./helpers.mjs";\nimport {integerArithmetic} from "./runtime/primitive-operator-runtime.mjs";\n'+doc(pair,u8)+'export function caller(left,right){return keep('+division+',integerArithmetic(255n,1n,8,false,"add"));}',{operations,program,token}=await fixture(variant,caller,helper);
 assert.throws(()=>operations.evaluateOwnedCoreProgram(program,'caller',[1n,0n],token),error=>error instanceof RangeError&&/zero/.test(error.message));assert.throws(()=>operations.evaluateOwnedCoreProgram(program,'caller',[1n,1n],token),error=>error instanceof RangeError&&/overflow/.test(error.message));
});
for(const variant of ['core','vector'])test(variant+' lazy caller branch keeps an unselected native helper failure dormant',{timeout:900000},async()=>{
 const helper='import {integerArithmetic} from "./runtime/primitive-operator-runtime.mjs";\n'+doc(pair,'boolean')+'export function checked(left,right){const unused='+division+';return true;}',caller='import {checked} from "./helpers.mjs";\n'+doc([['condition','boolean']],'boolean')+'export function caller(condition){return condition&&checked(1n,0n);}',{operations,program,token}=await fixture(variant,caller,helper);
 assert.equal(operations.evaluateOwnedCoreProgram(program,'caller',[false],token),false);assert.throws(()=>operations.evaluateOwnedCoreProgram(program,'caller',[true],token),RangeError);
});
for(const variant of ['core','vector'])test(variant+' original helper native-bitwise history retains source origin and runtime selection',{timeout:900000},async()=>{
 const helper=doc(pair,u8)+'export function selected(left,right){return left^right;}',caller='import {selected} from "./helpers.mjs";\n'+doc(pair,u8)+'export function caller(left,right){return selected(left,right);}',{operations,program,token}=await fixture(variant,caller,helper);
 assert.equal(operations.evaluateOwnedCoreProgram(program,'caller',[255n,15n],token),240n);const rows=program[0].sourceNativeOperators.filter(row=>row.kind==='native-fixed-bitwise');assert.ok(rows.length);assert.ok(rows.some(row=>row.helperSource.path==='helpers.mjs'));assert.equal(program[0].copyHelperCalls[0].declaration.source,helper);
});
for(const variant of ['core','vector'])test(variant+' private ordered mode cannot be selected by an input flag',{timeout:60000},async()=>{
 const helper=doc(pair,u8)+'export function keep(left,right){return left;}',caller='import {keep} from "./helpers.mjs";\n'+doc(pair,u8)+'export function caller(left,right){return keep(left,right);}',{syntax,input}=await fixture(variant,caller,helper);
 assert.throws(()=>syntax.createOwnedCoreSourceContext({...input,orderedScalarHelperSyntax:true}),TypeError);assert.throws(()=>syntax.createOwnedCoreCopyHelperSourceContext({...input,orderedScalarHelperSyntax:true}),TypeError);assert.throws(()=>syntax.createOwnedCoreOrderedScalarHelperSourceContext({...input,orderedScalarHelperSyntax:true}),TypeError);
});
