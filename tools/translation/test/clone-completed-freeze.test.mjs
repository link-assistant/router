import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {prepareCloneValidationOrder} from '../prepare-clone-validation-order.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {builtinDeriveDataInputs,builtinPayloadDataInputs} from '../builtin-derive-data-inputs.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import * as current from '../builtin-clone-ast-route.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../../../',import.meta.url),origin=new URL('../builtin-clone-ast-route.mjs',import.meta.url);
const directory=mkdtempSync(join(tmpdir(),'router-clone-completed-'));
after(()=>rmSync(directory,{recursive:true,force:true}));
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/clone.rs','expand_deriving_clone');
function request(declaration,payload=false){
 const source='#[derive(Clone)]'+declaration,context=createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
 const certificate=context.certificates[0],input=(payload?builtinPayloadDataInputs:builtinDeriveDataInputs)({source,span:certificate.span});
 return {profile,entry,certificate,input,original:{dependencies,module:{source}}};
}
function fullyFrozen(value,seen=new WeakSet()){
 if(!value||typeof value!=='object'||seen.has(value))return;
 seen.add(value);assert.equal(Object.isFrozen(value),true);
 for(const child of Object.values(value))fullyFrozen(child,seen);
}
let previous;
test('complete earlier Clone source and native DAG output retain data, freezing and private issuers',{timeout:60000},async()=>{
 const plan=prepareCloneValidationOrder(),source=plan.previous.after,ts=ownershipCompiler();
 assert.equal(readFileSync(origin,'utf8'),plan.file.after);
 assert.equal(plan.previous.afterSha256,'020c37eee3213f336b1e122b1c6189b9cd63052e793f1b359b82ab3f7a37c336');
 assert.equal(plan.previous.equation.inverse,plan.file.original);
 const parsed=ts.createSourceFile(origin.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(parsed.parseDiagnostics.length,0);
 const edits=parsed.statements.filter(node=>ts.isImportDeclaration(node)).map(node=>({start:node.moduleSpecifier.getStart(parsed),end:node.moduleSpecifier.end,before:node.moduleSpecifier.getText(parsed),after:JSON.stringify(new URL(node.moduleSpecifier.text,origin).href)}));
 let relocated=source,inverse;
 for(const row of [...edits].reverse())relocated=relocated.slice(0,row.start)+row.after+relocated.slice(row.end);
 inverse=relocated;let shift=0;
 const positioned=edits.map(row=>{const start=row.start+shift;shift+=row.after.length-row.before.length;return {...row,start};});
 for(const row of positioned.reverse())inverse=inverse.slice(0,row.start)+row.before+inverse.slice(row.start+row.after.length);
 assert.equal(inverse,source);
 const path=join(directory,'complete-earlier-clone.mjs');writeFileSync(path,relocated);previous=await import(pathToFileURL(path).href);
 for(const input of [request('pub struct Native{value:String}'),request('pub struct Unit;'),request('pub enum Payload{Tuple(String),Named{value:String},Unit}',true)]){
  const expected=previous.liftBuiltinCloneAstRoute(input),actual=current.liftBuiltinCloneAstRoute(input);
  assert.deepEqual(actual,expected);fullyFrozen(actual);fullyFrozen(expected);
  const oldPlan=JSON.stringify(previous.builtinCloneOriginalSourcePlan(expected)),newPlan=JSON.stringify(current.builtinCloneOriginalSourcePlan(actual));
  assert.equal(newPlan.length,oldPlan.length);assert.equal(hash(newPlan),hash(oldPlan));
  assert.equal(current.validateBuiltinCloneAstOutput(actual,structuredClone(actual.branches)),true);
  assert.throws(()=>current.validateBuiltinCloneAstOutput(expected,actual.branches),/genuine original/);
  assert.throws(()=>previous.validateBuiltinCloneAstOutput(actual,expected.branches),/genuine original/);
  const changed=structuredClone(actual.branches);changed[0].output.items.push({kind:'macro_rules!'});
  assert.throws(()=>current.validateBuiltinCloneAstOutput(actual,changed),/positive AST/);
 }
});

test('Clone retains the complete original observer callback order and thrown error identity',{timeout:60000},()=>{
 assert.ok(previous,'complete earlier receiving module required');
 const input=request('pub struct Observed{value:String}'),values=Object.values,freeze=Object.freeze,keys=Object.keys,sentinel=new Error('original freeze observer');
 function observe(module,throwing){
  const tape=[];let value,error;
  try{
   Object.values=function(value){tape.push(['values',keys(value)]);return Reflect.apply(values,Object,[value]);};
   Object.freeze=function(value){tape.push(['freeze',keys(value)]);if(throwing)throw sentinel;return Reflect.apply(freeze,Object,[value]);};
   try{value=module.liftBuiltinCloneAstRoute(input);}catch(caught){error=caught;}
  }finally{Object.values=values;Object.freeze=freeze;}
  return {value,error,tape};
 }
 for(const throwing of [false,true]){
  const expected=observe(previous,throwing),actual=observe(current,throwing);
  assert.deepEqual(actual.tape,expected.tape);assert.ok(actual.tape.some(row=>row[0]==='freeze'));
  if(throwing){assert.equal(expected.error,sentinel);assert.equal(actual.error,sentinel);}
  else{assert.equal(actual.error,undefined);assert.equal(expected.error,undefined);assert.deepEqual(actual.value,expected.value);fullyFrozen(actual.value);}
 }
 const retried=current.liftBuiltinCloneAstRoute(input);fullyFrozen(retried);
 assert.equal(current.validateBuiltinCloneAstOutput(retried,retried.branches),true);
});
