// Install together with both complete original reader successors; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {translateOwnedCopyScalarHelperSource20261103,readOwnedCopyScalarHelperMeta20261103} from '../owned-copy-scalar-helper-profile-20261103.mjs';
const doc=(params,ret)=>'/** '+params.map(([name,type])=>'@param {'+type+'} '+name).join(' ')+' @returns {'+ret+'} */\n';
function data(syntax,variant,files){const original=ownedStateReceivingData(files),assets=new Map([...syntax.ownedCoreRuntimeSources(),...syntax.ownedPrimitiveOperatorRuntimeSources()].map(row=>[row.path,row]));return {...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat([...assets.values()]),primitiveOperators:true,...(variant==='vector'?{vectorBindings:[]}: {})};}
for(const variant of ['core','vector'])test(variant+' actual compound scalar arguments retain every native integer domain',{timeout:60000},async()=>{
 const prefix='owned-'+(variant==='core'?'core':'vector-candidate'),syntax=await import('../'+prefix+'-source.mjs'),operations=await import('../'+prefix+'-operations.mjs');
 let helper='',caller='',imports=[];
 for(const row of PRIMITIVE_BITWISE_TYPES){
  const type='import("./runtime/primitive-operator-runtime.mjs").'+row.alias,params=[['condition','boolean'],['left',type],['right',type]],decl=doc(params,type),name='select_'+row.name;
  helper+=decl+'export function '+name+'(condition,left,right){const selected=condition;if(selected){return left;}else{return right;}}\n';
  caller+=decl+'export function caller_'+row.name+'(condition,left,right){return '+name+'(!condition,left<right?left:right,condition?right:left);}\n';imports.push(name);
 }
 caller='import {'+imports.join(',')+'} from "./helpers.mjs";\n'+caller;
 const input=data(syntax,variant,[{path:'caller.mjs',source:caller},{path:'helpers.mjs',source:helper}]),result=translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input}),program=readOwnedCopyScalarHelperMeta20261103(result.meta,variant),token=await operations.prepareOwnedCoreRuntime(program);
 assert.equal(program.length,PRIMITIVE_BITWISE_TYPES.length);
 for(const row of PRIMITIVE_BITWISE_TYPES){const lo=row.signed?-BigInt(row.minimumAbs):0n,hi=BigInt(row.maximum);for(const condition of [false,true])for(const left of [lo,hi])for(const right of [lo,hi])assert.equal(operations.evaluateOwnedCoreProgram(program,'caller_'+row.name,[condition,left,right],token),!condition?(left<right?left:right):(condition?right:left));}
 for(const fn of program){assert.equal(fn.copyHelperCalls.length,1);assert.equal(fn.copyHelperCalls[0].declaration.source,helper);assert.equal(fn.hostCalls.length,0);}
 assert.equal(result.runtimeParity,false);assert.equal(result.rustExecuted,false);
});
for(const variant of ['core','vector'])test(variant+' Boolean expression arguments preserve caller names and nested private helper proofs',{timeout:60000},async()=>{
 const prefix='owned-'+(variant==='core'?'core':'vector-candidate'),syntax=await import('../'+prefix+'-source.mjs'),operations=await import('../'+prefix+'-operations.mjs');
 const helper=doc([['value','boolean']],'boolean')+'export function identity(value){return value;}\n'+doc([['left','boolean'],['right','boolean']],'boolean')+'export function both(left,right){const selected=left;return selected&&right;}';
 const caller='import {identity,both} from "./helpers.mjs";\n'+doc([['left','boolean'],['right','boolean']],'boolean')+'export function caller(left,right){return both(!left,identity(left||right));}';
 const input=data(syntax,variant,[{path:'caller.mjs',source:caller},{path:'helpers.mjs',source:helper}]),result=translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input}),program=readOwnedCopyScalarHelperMeta20261103(result.meta,variant),token=await operations.prepareOwnedCoreRuntime(program);
 for(const left of [false,true])for(const right of [false,true])assert.equal(operations.evaluateOwnedCoreProgram(program,'caller',[left,right],token),!left&&(left||right));
 assert.deepEqual(new Set(program[0].copyHelperCalls.map(row=>row.name)),new Set(['both','identity']));assert.equal(program[0].hostCalls.length,0);
});
for(const variant of ['core','vector'])test(variant+' unused or unselected argument expressions cannot erase unsupported work',{timeout:60000},async()=>{
 const syntax=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-source.mjs'),helper=doc([['ignored','boolean']],'boolean')+'export function ignore(ignored){return true;}';
 for(const operand of ['Math.random()>0','value?true:Math.random()>0','(()=>true)()','missing(value)']){
  const caller='import {ignore} from "./helpers.mjs";\n'+doc([['value','boolean']],'boolean')+'export function caller(value){return ignore('+operand+');}',input=data(syntax,variant,[{path:'caller.mjs',source:caller},{path:'helpers.mjs',source:helper}]);
  assert.throws(()=>translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input}),TypeError);
 }
});
