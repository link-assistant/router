import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareRuntimeLoaderComparison,proposeRuntimeLoaderComparison} from '../prepare-runtime-loader-comparison.mjs';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('loader descriptor source preserves the complete inverse and rejects unknown source',{timeout:60000},()=>{
 const plan=prepareRuntimeLoaderComparison(),ts=ownershipCompiler();
 assert.equal(plan.current,plan.after);
 assert.equal(plan.before,plan.inverse);
 assert.equal(createHash('sha256').update(plan.after).digest('hex'),'5587f9b51453bd4fd13a7a1383d96a96d19d7bf55bf46a66f5ed21b916172d36');
 assert.equal(readFileSync(new URL('../js-to-rust/vendor/module-syntax.mjs',import.meta.url),'utf8'),plan.after);
 assert.deepEqual(plan.equation.stages.map(row=>row.phase),['language','repository']);
 for(const row of plan.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);
  assert.equal(row.inverse,row.before);
 }
 assert.throws(()=>proposeRuntimeLoaderComparison(ts,plan.path,plan.before+' '),/complete original source differs/u);
 assert.throws(()=>proposeRuntimeLoaderComparison(ts,plan.path,plan.after),/complete original source differs/u);
 assert.equal(plan.retainedVerdicts,false);
});

test('actual compiler guard still refuses changed data and accessor descriptors',{timeout:60000},()=>{
 const ts=ownershipCompiler(),baseline=ownershipCompilerRuntimeNativeCurrent(ts),owner=ts.Debug,key='fail';
 assert.equal(baseline,!process.versions.bun);
 const original=Object.getOwnPropertyDescriptor(owner,key);
 assert.equal(original.configurable,true);assert.equal(original.writable,true);assert.equal(typeof original.value,'function');
 const cases=[{...original,value:()=>{}},{...original,writable:false},{...original,enumerable:!original.enumerable},
  {get:()=>original.value,set:undefined,enumerable:original.enumerable,configurable:true},
  {get:undefined,set:()=>{},enumerable:original.enumerable,configurable:true}];
 for(const next of cases)try{
  Object.defineProperty(owner,key,next);assert.equal(ownershipCompilerRuntimeNativeCurrent(ts),false);
 }finally{Object.defineProperty(owner,key,original);}
 assert.equal(ownershipCompilerRuntimeNativeCurrent(ts),baseline);
});
