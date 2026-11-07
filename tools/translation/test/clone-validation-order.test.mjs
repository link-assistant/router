import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {builtinDeriveDataInputs,builtinPayloadDataInputs} from '../builtin-derive-data-inputs.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {liftBuiltinCloneAstRoute,validateBuiltinCloneAstOutput} from '../builtin-clone-ast-route.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareCloneValidationOrder} from '../prepare-clone-validation-order.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url);
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/clone.rs','expand_deriving_clone');
function request(declaration,payload=false){
 const source='#[derive(Clone)]'+declaration,context=createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
 const certificate=context.certificates[0],input=(payload?builtinPayloadDataInputs:builtinDeriveDataInputs)({source,span:certificate.span});
 return {profile,entry,certificate,input,original:{dependencies,module:{source}}};
}

test('oversized complete Clone outputs are refused before evidence serialization',{timeout:60000},()=>{
 const small=request('pub struct Budget{value:String}');liftBuiltinCloneAstRoute(small);
 const inputs=[request('pub struct Budget{'+Array.from({length:128},(_,at)=>'f'+at+':String').join(',')+'}'),
  request('pub enum Budget{Payload('+Array.from({length:128},()=> 'String').join(',')+')}',true)];
 const stringify=JSON.stringify;let evidenceEncodings=0;
 try{
  JSON.stringify=function(...args){if(args[0]?.schema==='original-clone-positive-ast-output-v1')evidenceEncodings++;return Reflect.apply(stringify,JSON,args);};
  for(const input of inputs)assert.throws(()=>liftBuiltinCloneAstRoute(input),{name:'TypeError',message:'Clone positive AST validation budget exceeded'});
  assert.equal(evidenceEncodings,0,'A rejected complete AST must not allocate its evidence string');
  const accepted=liftBuiltinCloneAstRoute(small);
  assert.equal(evidenceEncodings,1);assert.equal(validateBuiltinCloneAstOutput(accepted,structuredClone(accepted.branches)),true);
  assert.throws(()=>validateBuiltinCloneAstOutput(structuredClone(accepted),accepted.branches),/genuine original/);
  const changed=structuredClone(accepted.branches);changed[0].output.items.push({kind:'macro_rules!'});
  assert.throws(()=>validateBuiltinCloneAstOutput(accepted,changed),/positive AST/);
 }finally{JSON.stringify=stringify;}
});

test('complete native Clone source equation preserves both CST phases and original inverse',{timeout:60000},()=>{
 const plan=prepareCloneValidationOrder(),row=plan.file;
 assert.equal(readFileSync(new URL('../builtin-clone-ast-route.mjs',import.meta.url),'utf8'),row.after);
 assert.equal(row.equation.inverse,row.original);assert.equal(row.equation.before,row.original);
 assert.equal(row.equation.after,row.after);assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);
 }
 assert.equal(plan.originalNodeLimit,32000);assert.equal(plan.originalDepthLimit,64);
 assert.equal(plan.privateIssuersUnchanged,true);assert.equal(plan.positiveGrammarUnchanged,true);assert.equal(plan.semanticAuthority,false);
});
