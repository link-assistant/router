// Independent source only. Execute after the entire bulk draft is complete.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translatePortableModuleProject} from '../module-project.mjs';
import {transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60000};
const project=()=>({entry:'entry.mjs',language:'JavaScript',modules:[
 {path:'entry.mjs',source:'import {twice as doubled} from "./helper.mjs";\n/** @param {number} value @returns {number} */\nexport function run(value){return doubled(value)+1;}'},
 {path:'helper.mjs',source:'/** @param {number} value @returns {number} */\nexport function twice(value){return value*2;}'},
]});
test('actual native import aliases link dependency bodies and retain both complete source inverses',limits,()=>{
 const input=project(),result=translatePortableModuleProject(input);assert.deepEqual(result.moduleSourceHistory.order,['helper.mjs','entry.mjs']);assert.ok(result.javascript.includes('routerModuleValue'));assert.equal(result.javascript.includes('import {twice'),false);assert.equal(result.moduleSourceHistory.sourceAuthority,false);
 for(const row of result.moduleSourceHistory.modules){const original=input.modules.find(value=>value.path===row.path).source;assert.equal(row.before,original);assert.equal(row.equation.inverse,original);assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax.meta).source,original);assert.equal(transportConcreteSyntaxMeta(row.equation.afterMeta).source,row.after);}
 assert.match(result.rust,/fn run/);assert.equal(result.wholeRouterSynchronization,false);
});
test('complete linked JavaScript and independently emitted TypeScript execute shared numeric vectors',limits,async()=>{
 const result=translatePortableModuleProject(project());await verifyTypedTargets(result,(_api,_result,module)=>{for(const [value,wanted]of [[0,1],[1,3],[-2,-3],[0.5,2],[100,201]])assert.equal(module.run(value),wanted);},{childTimeoutMs:20000});
});
test('TypeScript scalar aliases and source imports resolve through genuine native symbols before semantic checking',limits,()=>{
 const result=translatePortableModuleProject({entry:'entry.ts',language:'TypeScript',modules:[
  {path:'entry.ts',source:'import {twice,type Count} from "./helper.js"; export function run(value: Count): Count {return twice(value);}'},
  {path:'helper.ts',source:'export type Count=number; export function twice(value: Count): Count {return value*2;}'},
 ]});assert.match(result.rust,/fn run/);assert.ok(result.typeAnnotationHistory.contracts.every(row=>row.parameters.every(parameter=>parameter.type==='number')));assert.equal(result.moduleSourceHistory.modules.length,2);
});
test('namespace selection preserves source bindings and plain shorthand property names',limits,()=>{
 const result=translatePortableModuleProject({entry:'entry.mjs',language:'JavaScript',modules:[
  {path:'entry.mjs',source:'import * as dependency from "./helper.mjs"; export function run(){return dependency.read();}'},
  {path:'helper.mjs',source:'const value=7; export function read(){const record={value};return record.value;}'},
 ]});assert.ok(result.javascript.includes('return routerModuleValue'));assert.equal(result.javascript.includes('dependency.read'),false);assert.ok(result.moduleSourceHistory.modules[0].after.includes('{value: routerModuleValue'));assert.equal(result.moduleSourceHistory.order[0],'helper.mjs');
});
test('cyclic live bindings unresolved modules dynamic identity and callable reflection remain refused',limits,()=>{
 const cycle={entry:'a.mjs',language:'JavaScript',modules:[{path:'a.mjs',source:'import {b} from "./b.mjs"; export const a=b;'},{path:'b.mjs',source:'import {a} from "./a.mjs"; export const b=a;'}]};assert.throws(()=>translatePortableModuleProject(cycle),/cyclic module initialization/);
 const missing=project();missing.modules.pop();assert.throws(()=>translatePortableModuleProject(missing),/exact module dependency/);
 const dynamic=project();dynamic.modules[0].source='export function run(){return import.meta.url;}';assert.throws(()=>translatePortableModuleProject(dynamic),/dynamic module identity/);
 const reflected=project();reflected.modules[0].source='import {twice} from "./helper.mjs"; export function run(){return twice.name;}';assert.throws(()=>translatePortableModuleProject(reflected),/reflection/);
 const unused=project();unused.modules.push({path:'unused.mjs',source:'export function unused(){return 0;}'});assert.throws(()=>translatePortableModuleProject(unused),/unreachable supplied modules/);
});
test('hashbang and strict directive source trivia retain full inverses without becoming linked runtime code',limits,()=>{
 const input=project();input.modules[0].source='#!/usr/bin/env node\n"use strict";\n'+input.modules[0].source;const result=translatePortableModuleProject(input),entry=result.moduleSourceHistory.modules.find(row=>row.path===input.entry);assert.ok(entry.after.startsWith('///usr/bin/env node'));assert.equal(entry.equation.inverse,input.modules[0].source);assert.equal(result.javascript.includes('#!'),false);assert.equal(result.javascript.includes('"use strict";'),false);
});
