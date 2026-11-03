// Install with both actual Copy readers/documents. SOURCE ONLY, all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {translateOwnedCopyScalarHelperSource20261103,translateOwnedCopyScalarHelperConcreteMeta20261103,readOwnedCopyScalarHelperMeta20261103} from '../owned-copy-scalar-helper-profile-20261103.mjs';
const timeout={timeout:60000},roles=[{name:'bool',type:'boolean',min:true,max:false},...PRIMITIVE_BITWISE_TYPES.map(row=>({...row,type:'import("./runtime/primitive-operator-runtime.mjs").'+row.alias,min:row.signed?-BigInt(row.minimumAbs):0n,max:BigInt(row.maximum)}))];
const documented=(params,returns)=>'/** '+params.map(([name,type])=>'@param {'+type+'} '+name).join(' ')+' @returns {'+returns+'} */\n';
function data(syntax,variant,files){
 const original=ownedStateReceivingData(files),assets=new Map([...syntax.ownedCoreRuntimeSources(),...syntax.ownedPrimitiveOperatorRuntimeSources()].map(row=>[row.path,row]));
 return {...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat([...assets.values()]),primitiveOperators:true,...(variant==='vector'?{vectorBindings:[]}: {})};
}
function sources(){
 let helper='',caller='',imports=[];const calls=[];
 for(const row of roles){
  const {name,type,min,max}=row,literal=typeof min==='boolean'?String(min):String(min)+'n';
  helper+=documented([['value',type]],type)+'export function id_'+name+'(value){return value;}\n';
  helper+=documented([['yes','boolean'],['left',type],['right',type]],type)+'export function pick_'+name+'(yes,left,right){if(yes){return left;}else{return right;}}\n';
  helper+=documented([],type)+'export function constant_'+name+'(){return '+literal+';}\n';
  caller+=documented([['value',type]],type)+'export function identity_'+name+'(value){return id_'+name+'(value);}\n';
  caller+=documented([['yes','boolean'],['left',type],['right',type]],type)+'export function choice_'+name+'(yes,left,right){return pick_'+name+'(yes,left,right);}\n';
  caller+=documented([],type)+'export function literal_'+name+'(){return id_'+name+'('+literal+');}\n';
  caller+=documented([],type)+'export function constant_'+name+'(){return fixed_'+name+'();}\n';
  imports.push('id_'+name,'pick_'+name,'constant_'+name+' as fixed_'+name);
  calls.push(['identity_'+name,[min],min],['identity_'+name,[max],max],['choice_'+name,[true,min,max],min],['choice_'+name,[false,min,max],max],['literal_'+name,[],min],['constant_'+name,[],min]);
  if(name!=='bool'){
   helper+=documented([['left',type],['right',type]],'boolean')+'export function less_'+name+'(left,right){return left < right;}\n';
   caller+=documented([['left',type],['right',type]],'boolean')+'export function order_'+name+'(left,right){return less_'+name+'(left,right);}\n';
   imports.push('less_'+name);calls.push(['order_'+name,[min,max],true],['order_'+name,[max,min],false]);
  }
 }
 return {helper,caller:'import {'+imports.join(',')+'} from "./helpers.mjs";\n'+caller,calls};
}
for(const variant of ['core','vector'])test(variant+' one original Copy helper source rule covers Boolean and all ten widths',timeout,async()=>{
 const prefix='owned-'+(variant==='core'?'core':'vector-candidate'),syntax=await import('../'+prefix+'-source.mjs'),operations=await import('../'+prefix+'-operations.mjs'),row=sources();
 const input=data(syntax,variant,[{path:'caller.mjs',source:row.caller},{path:'helpers.mjs',source:row.helper}]);
 const result=translateOwnedCopyScalarHelperSource20261103(row.caller,{variant,sourcePath:'caller.mjs',input});
 assert.equal(result.program.length,roles.length*4+PRIMITIVE_BITWISE_TYPES.length);
 for(const fn of result.program){assert.equal(fn.hostCalls.length,0);assert.equal(fn.copyHelperCalls.length,1);assert.equal((fn.sourceNativeOperators??[]).length,0);}
 const decoded=readOwnedCopyScalarHelperMeta20261103(result.meta,variant),token=await operations.prepareOwnedCoreRuntime(decoded);
 for(const [name,args,wanted] of row.calls)assert.equal(operations.evaluateOwnedCoreProgram(decoded,name,args,token),wanted,name);
 const replay=translateOwnedCopyScalarHelperConcreteMeta20261103(result.concreteSyntax.meta,{variant,sourcePath:'caller.mjs',input});assert.equal(replay.meta,result.meta);assert.equal(replay.rust,result.rust);assert.equal(replay.typescript,result.typescript);
 const changed=structuredClone(decoded),withArgs=changed.find(fn=>fn.copyHelperCalls[0].parameters.length);withArgs.copyHelperCalls[0].parameters[0]='json';
 assert.throws(()=>operations.checkOwnedCoreProgram(changed,syntax.createOwnedCoreCopyHelperSourceContext(input)),TypeError);
});
for(const variant of ['core','vector'])test(variant+' actual native type-only aliases and TypeScript helper body remain original',timeout,async()=>{
 const syntax=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-source.mjs');
 const helper='import type {RustU8 as Byte} from "./runtime/primitive-operator-runtime.mjs";\nexport function id(value:Byte):Byte{return value;}';
 const caller='import type {RustU8 as Byte} from "./runtime/primitive-operator-runtime.mjs";\nimport {id} from "./helpers.mts";\nexport function caller(value:Byte):Byte{return id(value);}';
 const input=data(syntax,variant,[{path:'caller.mts',source:caller},{path:'helpers.mts',source:helper}]);
 const result=translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mts',input});assert.equal(result.program.length,1);assert.equal(result.program[0].returns,'u8');assert.equal(result.program[0].copyHelperCalls[0].declaration.source,helper);
 for(const replacement of [helper.replace('import type','import'),helper.replace('RustU8 as Byte','JsonValue as Byte'),helper.replace('return value;','return 256n;')]){
  const changed={...input,files:input.files.map(row=>row.path==='helpers.mts'?{...row,source:replacement}:row)};
  assert.throws(()=>translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mts',input:changed}),TypeError);
 }
 const raw=data(syntax,variant,[{path:'caller.mjs',source:'import {id} from "./helpers.mjs";\n'+documented([['value','bigint']],'bigint')+'export function caller(value){return id(value);}'},{path:'helpers.mjs',source:documented([['value','bigint']],'bigint')+'export function id(value){return value;}'}]);
 assert.throws(()=>translateOwnedCopyScalarHelperSource20261103(raw.files.find(row=>row.path==='caller.mjs').source,{variant,sourcePath:'caller.mjs',input:raw}),TypeError);
 assert.throws(()=>syntax.createOwnedCoreSourceContext({...input,copyHelperSyntax:true}),TypeError);
});
for(const variant of ['core','vector'])test(variant+' scalar Rust inverse restores helpers or rechecks an edited comparison',timeout,async()=>{
 const syntax=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-source.mjs');
 const type='import("./runtime/primitive-operator-runtime.mjs").RustU8';
 const helper=documented([['left',type],['right',type]],'boolean')+'export function less(left,right){return left < right;}';
 const caller='import {less} from "./helpers.mjs";\n'+documented([['left',type],['right',type]],'boolean')+'export function caller(left,right){return less(left,right);}';
 const original=data(syntax,variant,[{path:'caller.mjs',source:caller},{path:'helpers.mjs',source:helper}]);
 const forward=translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input:original});
 const {translateOwnedCopyScalarHelperRust20261103:inverse}=await import('../owned-copy-scalar-helper-rust-20261103.mjs');
 const options={variant,sourcePath:'sync/caller.rs',javascriptPath:'caller.mjs',input:{...original,files:original.files.concat([{path:'sync/caller.rs',source:forward.rust}])}};
 const restored=inverse(forward.rust,options);assert.equal(restored.helperNetworkRestored,true);assert.equal(restored.javascript,caller);assert.ok(restored.restoredSources.some(row=>row.path==='helpers.mjs'&&row.source===helper));
 const rust=forward.rust.replace('(left < right)','(left >= right)');assert.notEqual(rust,forward.rust);
 const input={...options.input,files:options.input.files.map(row=>row.path==='sync/caller.rs'?{...row,source:rust}:row)};
 const edited=inverse(rust,{...options,input});assert.equal(edited.helperNetworkRestored,false);assert.equal(edited.sourceConflicts[0].requiresReconciliation,true);
 const operations=await import('../owned-vector-candidate-operations.mjs'),token=await operations.prepareOwnedCoreRuntime(edited.program);
 assert.equal(operations.evaluateOwnedCoreProgram(edited.program,'caller',[0n,255n],token),false);assert.equal(operations.evaluateOwnedCoreProgram(edited.program,'caller',[255n,0n],token),true);
 assert.equal(input.files.find(row=>row.path==='helpers.mjs').source,helper);
});
for(const variant of ['core','vector'])test(variant+' original Boolean argument refusal precedes an invalid helper body',timeout,async()=>{
 const syntax=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-source.mjs');
 const helper='/** @param {boolean} value @returns {boolean} */\nexport function id(value){return missing;}';
 const caller='import {id} from "./helpers.mjs";\n/** @param {boolean} value @returns {boolean} */\nexport function caller(value){return id(!value);}';
 const input=data(syntax,variant,[{path:'caller.mjs',source:caller},{path:'helpers.mjs',source:helper}]);
 const result=syntax.analyzeOriginalOwnedCoreSource(syntax.createOwnedCoreBooleanHelperSourceContext(input),'caller.mjs');
 assert.equal(result.program.length,0);assert.match(result.diagnostics[0].message,/helper operands must be inert Boolean bindings or literals/);
});
