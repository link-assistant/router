// Independent regression source; all execution is deferred during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {portableModuleOrder} from '../module-order.mjs';
import {translatePortableModuleProject} from '../module-project.mjs';
import {prepareHoistedModuleCycles} from '../../prepare-hoisted-module-cycles.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};
const node=(path,targets,hasRuntimeInitializers=false)=>({path,targets,hasRuntimeInitializers});
function mutual(){return {entry:'entry.mjs',language:'JavaScript',modules:[
 {path:'entry.mjs',source:'import {stepB} from "./helper.mjs"; /** @param {number} value @returns {number} */ export function run(value){return stepB(value);}'},
 {path:'helper.mjs',source:'import {run} from "./entry.mjs"; /** @param {number} value @returns {number} */ export function stepB(value){if(value<=0){return 0;}return run(value-1)+1;}'},
]};}

test('acyclic graph keeps original dependency order including repeated edges',limits,()=>{
 const result=portableModuleOrder({entry:'a',nodes:[node('a',['b','b','c']),node('b',['c']),node('c',[],true)]});
 assert.deepEqual(result.order,['c','b','a']);assert.ok(result.components.every(component=>!component.cyclic));
 assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);
});
test('strongly connected function modules follow dependency components without initialization claims',limits,()=>{
 const result=portableModuleOrder({entry:'entry',nodes:[node('entry',['a']),node('a',['b','base']),node('b',['a']),node('base',[],true)]});
 assert.deepEqual(result.order,['base','a','b','entry']);
 assert.deepEqual(result.components[1],{paths:['a','b'],cyclic:true,mode:'source-hoisted-functions-and-types-only'});
 const self=portableModuleOrder({entry:'self',nodes:[node('self',['self'])]});assert.equal(self.components[0].cyclic,true);
});
test('every initializer inside an actual cyclic component remains refused',limits,()=>{
 for(const nodes of [[node('a',['a'],true)],[node('a',['b'],true),node('b',['a'])],[node('a',['b']),node('b',['a'],true)]])assert.throws(()=>portableModuleOrder({entry:'a',nodes}),/cyclic module initialization/);
 assert.throws(()=>portableModuleOrder({entry:'a',nodes:[node('a',['missing'])]}),/missing dependency/);
 assert.throws(()=>portableModuleOrder({entry:'a',nodes:[node('a',[]),node('unused',[])]}),/unreachable supplied/);
});
test('graph data getters and proxies do not become source classification',limits,()=>{
 let calls=0;const value=node('a',[]);Object.defineProperty(value,'hasRuntimeInitializers',{get(){calls++;return false;}});
 assert.throws(()=>portableModuleOrder({entry:'a',nodes:[value]}));assert.equal(calls,0);
 const proxy=new Proxy(node('a',[]),{get(){calls++;return false;}});assert.throws(()=>portableModuleOrder({entry:'a',nodes:[proxy]}));assert.equal(calls,0);
});
test('complete cyclic JavaScript source retains both module CST inverses and checked numeric behavior',limits,async()=>{
 const input=mutual(),result=translatePortableModuleProject(input);
 assert.equal(result.moduleSourceHistory.initialization.components.length,1);assert.equal(result.moduleSourceHistory.initialization.components[0].cyclic,true);
 for(const module of result.moduleSourceHistory.modules)assert.equal(module.equation.inverse,input.modules.find(row=>row.path===module.path).source);
 assert.equal(result.wholeRouterSynchronization,false);
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const value of [0,1,2,5,10])assert.equal(module.run(value),value);},{childTimeoutMs:20_000});
});
test('TypeScript source types remain checked across a function-only cycle',limits,()=>{
 const result=translatePortableModuleProject({entry:'entry.ts',language:'TypeScript',modules:[
  {path:'entry.ts',source:'import {stepB} from "./helper.js"; export function run(value:number):number{return stepB(value);}'},
  {path:'helper.ts',source:'import {run} from "./entry.js"; export function stepB(value:number):number{if(value<=0){return 0;}return run(value-1)+1;}'},
 ]});assert.equal(result.moduleSourceHistory.initialization.components[0].cyclic,true);assert.ok(result.typeAnnotationHistory.contracts.every(row=>row.parameters.every(parameter=>parameter.type==='number')));
 const changed=mutual();changed.modules[1].source='import {run} from "./entry.mjs"; const value=run(1); export function stepB(){return value;}';assert.throws(()=>translatePortableModuleProject(changed),/cyclic module initialization/);
});
test('source-copy producer retains original program and refusal case with both ordered sequences',limits,()=>{
 const plan=prepareHoistedModuleCycles();assert.equal(plan.files.length,2);
 for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
});
