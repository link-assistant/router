// Install with both original reader successors and the seven-input source fence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {translateOwnedCopyScalarHelperSource20261103,readOwnedCopyScalarHelperMeta20261103} from '../owned-copy-scalar-helper-profile-20261103.mjs';
const doc=(params,ret)=>'/** '+params.map(([name,type])=>'@param {'+type+'} '+name).join(' ')+' @returns {'+ret+'} */\n';
const roles=[{name:'bool',type:'boolean',lo:false,hi:true},...PRIMITIVE_BITWISE_TYPES.map(row=>({...row,type:'import("./runtime/primitive-operator-runtime.mjs").'+row.alias,lo:row.signed?-BigInt(row.minimumAbs):0n,hi:BigInt(row.maximum)}))];
function data(syntax,variant,files){const original=ownedStateReceivingData(files),assets=new Map([...syntax.ownedCoreRuntimeSources(),...syntax.ownedPrimitiveOperatorRuntimeSources()].map(row=>[row.path,row]));return {...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat([...assets.values()]),primitiveOperators:true,...(variant==='vector'?{vectorBindings:[]}: {})};}
for(const variant of ['core','vector'])test(variant+' actual native locals and branch scopes cover every Copy scalar role',{timeout:60000},async()=>{
 const prefix='owned-'+(variant==='core'?'core':'vector-candidate'),syntax=await import('../'+prefix+'-source.mjs'),operations=await import('../'+prefix+'-operations.mjs');
 let helper='',caller='',imports=[];for(const row of roles){
  const params=[['yes','boolean'],['left',row.type],['right',row.type]],decl=doc(params,row.type);
  helper+=decl+'export function choose_'+row.name+'(yes,left,right){const condition=yes;if(condition){const selected=left;return selected;}else{const selected=right;return selected;}}\n';
  caller+=decl+'export function caller_'+row.name+'(yes,left,right){return choose_'+row.name+'(yes,left,right);}\n';imports.push('choose_'+row.name);
 }
 caller='import {'+imports.join(',')+'} from "./helpers.mjs";\n'+caller;
 const input=data(syntax,variant,[{path:'caller.mjs',source:caller},{path:'helpers.mjs',source:helper}]);
 const result=translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input}),program=readOwnedCopyScalarHelperMeta20261103(result.meta,variant),token=await operations.prepareOwnedCoreRuntime(program);
 assert.equal(program.length,roles.length);for(const row of roles)for(const yes of [false,true])for(const left of [row.lo,row.hi])for(const right of [row.lo,row.hi])assert.equal(operations.evaluateOwnedCoreProgram(program,'caller_'+row.name,[yes,left,right],token),yes?left:right);
 for(const fn of program){assert.equal(fn.copyHelperCalls.length,1);assert.equal(fn.hostCalls.length,0);assert.equal(fn.copyHelperCalls[0].declaration.source,helper);}
});
for(const variant of ['core','vector'])test(variant+' helper locals cannot erase captures, unsupported expressions or bad scopes',{timeout:60000},async()=>{
 const syntax=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-source.mjs');
 const caller='import {selected} from "./helper.mjs";\n'+doc([['value','boolean']],'boolean')+'export function caller(value){return selected(value);}';
 for(const body of ['const temporary=missing;return value;','const value=true;return value;','const temporary=later;const later=true;return temporary;','const temporary=value;return temporary;return value;','let temporary=value;temporary=!temporary;return temporary;']){
  const helper=doc([['value','boolean']],'boolean')+'export function selected(value){'+body+'}',input=data(syntax,variant,[{path:'caller.mjs',source:caller},{path:'helper.mjs',source:helper}]);
  assert.throws(()=>translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input}),TypeError);
 }
});
